import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import styles from "./VideoCall.module.css";

// Define the structure for peer connections
interface PeerConnection {
  connection: RTCPeerConnection;
  remoteStream?: MediaStream;
}

interface VideoCallProps {
  sessionId: Id<"events">;
  userId: string; // Current user's ID
  username: string;
  participantIds: string[]; // IDs of ALL participants including self
}

// Basic STUN server configuration (Google's public servers)
const stunServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const VideoCall = forwardRef(({ sessionId, userId, username, participantIds }: VideoCallProps, ref) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({}); // State to hold remote streams
  const [isAudioEnabled, setIsAudioEnabled] = useState(true); // State for local audio
  const [isVideoEnabled, setIsVideoEnabled] = useState(true); // State for local video

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({}); // Refs for remote video elements
  const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({}); // Ref to store pending candidates
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({}); // Use useRef for peer connections
  const makingOffer = useRef<Record<string, boolean>>({}); // Track makingOffer state
  const ignoreOffer = useRef<Record<string, boolean>>({}); // Track ignoreOffer state
  const queuedIceCandidatesRef = useRef<Record<string, RTCIceCandidate[]>>({}); // Queue for early candidates

  // Convex Auth state
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();

  // Convex mutations and queries
  const sendSignal = useMutation(api.video.sendSignal);
  const deleteSignal = useMutation(api.video.deleteSignal);
  const signals = useQuery(api.video.getSignals, isAuthenticated ? { sessionId } : "skip");
  const leaveSession = useMutation(api.video.leaveSession);

  const otherParticipantIds = participantIds.filter(id => id !== userId);

  // --- Initialize Local Media ---
  useEffect(() => {
    const startMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
        // Handle error appropriately (e.g., show message to user)
      }
    };
    startMedia();

    // Cleanup
    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // --- Toggle Local Audio ---
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log(`Local audio ${audioTrack.enabled ? 'enabled' : 'disabled'}`);
      }
    }
  }, [localStream]);

  // --- Toggle Local Video ---
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        console.log(`Local video ${videoTrack.enabled ? 'enabled' : 'disabled'}`);
      }
    }
  }, [localStream]);

  // --- Create Peer Connection Function ---
  const createPeerConnection = useCallback((targetUserId: string): RTCPeerConnection | null => {
    if (!localStream) {
        console.error("Local stream not available to create peer connection.");
        return null;
    }
    console.log(`Creating peer connection to ${targetUserId}`);
    const pc = new RTCPeerConnection(stunServers);

    // Add local tracks
    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
    });

    // Triggered when the connection needs to negotiate (e.g., adding tracks)
    pc.onnegotiationneeded = async () => {
        // Avoid negotiation for self or if connection is closing
        if (!userId || userId === targetUserId || pc.signalingState === 'closed') {
            console.log(`Skipping negotiation for ${targetUserId} (self, closed, or no user)`);
            return;
        }

        console.log(`Negotiation needed with ${targetUserId}, state: ${pc.signalingState}`);

        // Perfect Negotiation: Check flags before creating offer
        if (makingOffer.current[targetUserId] || ignoreOffer.current[targetUserId]) {
            console.log(`Negotiation needed for ${targetUserId}, but making/ignore flag set. Skipping offer creation.`);
            return;
        }

        // Only proceed if the state is stable (or potentially closed if we want to restart)
        if (pc.signalingState !== 'stable') {
            console.log(`Negotiation needed for ${targetUserId}, but state is ${pc.signalingState}. Skipping offer creation.`);
            return;
        }

        try {
            // Set flag before starting async operation
            makingOffer.current[targetUserId] = true;
            console.log(`Setting local description (offer) for ${targetUserId} via negotiationneeded.`);
            const offer = await pc.createOffer();

            // Double-check state *after* offer creation, *before* setting local desc
            if (pc.signalingState !== 'stable') {
                console.warn(`State changed during offer creation for ${targetUserId} (now ${pc.signalingState}). Aborting offer.`);
                makingOffer.current[targetUserId] = false; // Reset flag
                return;
            }

            await pc.setLocalDescription(offer);
            console.log(`Local description (offer) set for ${targetUserId}`);

            console.log(`Sending offer to ${targetUserId} via negotiationneeded`);
            sendSignal({
                sessionId,
                targetUserId: targetUserId,
                type: "offer",
                signal: JSON.stringify({ type: pc.localDescription?.type, sdp: pc.localDescription?.sdp }),
            });
        } catch (error) {
            console.error(`Error during negotiationneeded offer for ${targetUserId}:`, error);
        } finally {
            // Reset flag after operation completes or fails
            // Check if an incoming offer caused us to ignore ours before resetting
            if (!ignoreOffer.current[targetUserId]) {
                makingOffer.current[targetUserId] = false;
            }
        }
    };

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      console.log(`Track received from ${targetUserId}`, event.streams[0]);
      const remoteStream = event.streams[0];
      if (remoteStream) {
        setRemoteStreams(prev => {
          const existingStream = prev[targetUserId];
          if (existingStream) {
            console.log(`Updating existing stream for ${targetUserId}`);
            event.track.onended = () => {
              console.log(`Remote track ended for ${targetUserId}`);
              // Optionally handle track ending, e.g., remove stream or track
            };
            return { ...prev, [targetUserId]: remoteStream }; 
          } else {
            console.log(`Creating new stream entry for ${targetUserId}`);
            event.track.onended = () => {
              console.log(`Remote track ended for ${targetUserId}`);
              // Optionally handle track ending
            };
            return { ...prev, [targetUserId]: remoteStream };
          }
        });
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to ${targetUserId}`);
        sendSignal({
          sessionId,
          targetUserId,
          type: "candidate",
          signal: JSON.stringify(event.candidate),
        });
      }
    };

    // Handle connection state changes (optional but useful)
    pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${targetUserId}: ${pc.connectionState}`);
        // Can update UI or handle disconnections here
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            // Clean up connection for this peer
             delete peerConnections.current[targetUserId]; // Use delete instead of assigning undefined
        }
    };

    peerConnections.current[targetUserId] = pc;

    return pc;
  }, [localStream, sendSignal, sessionId]); // Dependencies

  // Helper function to process queued ICE candidates for a specific peer
  const processQueuedIceCandidates = useCallback(async (peerId: string) => {
    const pc = peerConnections.current[peerId];
    const queue = queuedIceCandidatesRef.current[peerId];

    // Ensure PC exists, remote description is set, and there's a queue with candidates
    if (pc && pc.remoteDescription && queue && queue.length > 0) {
      console.log(`Processing ${queue.length} queued ICE candidates for ${peerId}. Remote desc type: ${pc.remoteDescription.type}, Signaling state: ${pc.signalingState}`);
      while (queue.length > 0) {
        const candidate = queue.shift(); // Get the oldest candidate
        if (candidate) {
          try {
            await pc.addIceCandidate(candidate);
            console.log(`Successfully added queued ICE candidate for ${peerId}:`, candidate.candidate.substring(0, 30) + "..."); // Log partial candidate
          } catch (error) {
            // Common error: Trying to add candidate before remote description is fully stable or in wrong state.
            // We might retry or log, depending on the specific error.
            console.error(`Error adding queued ICE candidate for ${peerId} (State: ${pc.signalingState}):`, error);
            // Optional: Put candidate back in front of queue if it's a state issue? Be careful with loops.
            // queue.unshift(candidate);
          }
        }
      }
    } else if (queue && queue.length > 0) {
      // Log why we are *not* processing if the queue isn't empty
      console.log(`Not processing queued ICE candidates for ${peerId}. Conditions not met: PC exists=${!!pc}, Remote desc set=${!!pc?.remoteDescription}, Queue size=${queue?.length}. State: ${pc?.signalingState}`);
    }
    // Clear the queue if it exists, regardless of processing, to prevent reprocessing old candidates if conditions change later
    // delete queuedIceCandidatesRef.current[peerId]; // Reconsider if clearing is always right here.
  }, []); // No dependencies needed as it uses refs

  // --- Initiate Connections to New Peers ---
  useEffect(() => {
    if (!localStream || isAuthLoading || !isAuthenticated) {
      console.log("Skipping peer connection initiation: Local stream or auth not ready.");
      return; // Don't proceed if local stream or auth isn't ready
    }

    console.log("Checking for new peers to connect to...", otherParticipantIds);

    otherParticipantIds.forEach(peerId => {
      // Check if a connection already exists or is being established
      if (!peerConnections.current[peerId]) {
        console.log(`Initiating connection to new peer: ${peerId}`);

        // 1. Create Peer Connection
        const pc = createPeerConnection(peerId);
        if (!pc) {
          console.error(`Failed to create peer connection for ${peerId}`);
          return; // Skip if creation failed
        }

        // Note: Offer creation is now primarily handled by onnegotiationneeded
        // triggered by adding tracks in createPeerConnection. We might not need
        // to explicitly create/send an offer here anymore, unless onnegotiationneeded
        // doesn't fire reliably in all browsers/scenarios.
        // Let's keep the explicit offer sending for now as a fallback, but guard it.
        if (pc.signalingState === 'stable' && !makingOffer.current[peerId] && !ignoreOffer.current[peerId]){
            console.log(`Attempting initial offer to new peer: ${peerId} (fallback)`);
             makingOffer.current[peerId] = true; // Set flag
            pc.createOffer()
                .then(offer => {
                    // Check state again before setting local description
                     if (pc.signalingState !== 'stable') {
                        console.warn(`State changed before setting initial offer for ${peerId}. Aborting.`);
                        throw new Error(`Signaling state not stable: ${pc.signalingState}`);
                     }
                    return pc.setLocalDescription(offer);
                })
                .then(() => {
                console.log(`Initial local description (offer) set for ${peerId}`);

                console.log(`Sending offer to ${peerId} via negotiationneeded`);
                sendSignal({
                    sessionId,
                    targetUserId: peerId,
                    type: "offer",
                    signal: JSON.stringify({ type: pc.localDescription?.type, sdp: pc.localDescription?.sdp }),
                });
                })
                .catch(error => {
                    console.error(`Error creating/sending initial offer to ${peerId}:`, error);
                     // Clean up potentially inconsistent state
                     delete peerConnections.current[peerId];
                     pc.close();
                })
                 .finally(() => {
                    // Reset flag if not ignored
                    if (!ignoreOffer.current[peerId]) {
                         makingOffer.current[peerId] = false;
                    }
                 });
        } else {
             console.log(`Skipping initial offer for ${peerId}: state=${pc.signalingState}, making=${makingOffer.current[peerId]}, ignore=${ignoreOffer.current[peerId]}`);
        }
      } else {
         console.log(`Connection status for existing peer ${peerId}: ${peerConnections.current[peerId]?.connectionState}`);
         // Optional: Add logic here to re-initiate if connection failed previously
      }
    });

    // Optional: Clean up connections for peers who left
    // Get current peer IDs from state
    const currentPeerIds = Object.keys(peerConnections.current);
    currentPeerIds.forEach(peerId => {
      if (!otherParticipantIds.includes(peerId)) {
        console.log(`Cleaning up connection for left peer: ${peerId}`);
        peerConnections.current[peerId]?.close();
        delete peerConnections.current[peerId]; // Use delete instead of assigning undefined
      }
    });

  // Dependencies: Run when participant list, local stream, or auth state changes
  // Added peerConnections to re-evaluate state, but be cautious of loops
  }, [otherParticipantIds, localStream, isAuthLoading, isAuthenticated, createPeerConnection, sendSignal, sessionId]);

  // --- Process Incoming Signals ---
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !signals) {
      return; // Don't process signals if auth is loading or not authenticated
    }

    console.log("Received signals:", signals);

    signals?.forEach(async (signal) => {
      // Correct destructuring: Use userId and alias it as senderId
      const { userId: senderId, type, signal: signalData } = signal;

      // Don't process signals from self
      if (senderId === userId) return; // Compare aliased senderId with component's userId

      // Ensure peer connection exists
      const peerData = peerConnections.current[senderId];
      let pc: RTCPeerConnection | null = peerData ? peerData : null;

      // If connection doesn't exist for an incoming signal (e.g., offer), create it.
      if (!pc && type === 'offer') {
        console.log(`Signal received from new peer ${senderId}. Creating connection.`);
        const createdPc = createPeerConnection(senderId); // Returns RTCPeerConnection | null
        if (createdPc) { // Check ensures createdPc is not null here
            // Update state *inside* the check where createdPc is known to be non-null
            peerConnections.current[senderId] = createdPc; // Explicitly assign non-null connection
            pc = createdPc; // Assign the non-null connection to the loop variable 'pc'
        } else {
             console.error(`Failed to create peer connection for signal from ${senderId}`);
             // pc remains null, subsequent check will handle this
        }
      }

      // Check if pc is still null after potential creation attempt
      if (!pc) {
        console.warn(`No peer connection found for signal from ${senderId}. Signal type: ${type}. Ignoring.`);
        return; // Exit if no valid connection
      }

      try {
        const parsedData = JSON.parse(signalData);

        switch (type) {
          case "offer":
            console.log(`Received offer from: ${senderId}`);
            const offerDescription = new RTCSessionDescription(parsedData);

            // Perfect negotiation: Check makingOffer/ignoreOffer flags and signaling state
            const isMakingOffer = makingOffer.current[senderId];
            const polite = userId! > senderId; // Determine politeness based on user ID comparison
            const ignore = ignoreOffer.current[senderId];

            console.log(`Offer from ${senderId}: polite=${polite}, makingOffer=${isMakingOffer}, ignoreOffer=${ignore}, state=${pc.signalingState}`);

            // Condition 1: If we are making an offer and we are the impolite peer, ignore the incoming offer.
            if (isMakingOffer && !polite) {
                console.log(`Ignoring offer from ${senderId} (impolite peer, currently making offer)`);
                return; // Let our offer proceed
            }

             // Condition 2: Set ignore flag if we receive an offer while not stable and we are the polite peer
            // This prevents us from processing our own offer if it was created concurrently
            ignoreOffer.current[senderId] = !polite && pc.signalingState !== 'stable';

            // Condition 3: Check signaling state before setting remote description
            if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
                console.warn(`Received offer from ${senderId}, but signaling state is ${pc.signalingState}. Cannot process.`);
                 // If state is have-remote-offer, it's likely a duplicate, can safely ignore.
                return;
            }

            // Handle offer collision (glare) based on politeness
            console.log(`[Glare] Handling offer collision. My ID: ${userId}, Sender ID: ${senderId}, Polite: ${polite}`);
            if (polite) {
                // Polite peer rollback: Set remote description, create answer.
                console.log(`[Glare] Polite peer yielding to offer from ${senderId}. Setting remote, then answering.`);
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: parsedData.sdp }));
                    console.log(`Remote description (offer) set for ${senderId}`);

                    // State should now be 'have-remote-offer'
                    console.log(`Creating answer for ${senderId}`);
                    const answer = await pc.createAnswer();

                    // @ts-expect-error - TS doesn't correctly track signalingState after setRemoteDescription
                    if (pc.signalingState === 'have-remote-offer') {
                        await pc.setLocalDescription(answer);
                        ignoreOffer.current[senderId] = false; // Reset flag only on success
                        console.log(`Sending answer to ${senderId}`);
                        sendSignal({
                            sessionId,
                            targetUserId: senderId,
                            type: "answer",
                            signal: JSON.stringify({ type: answer.type, sdp: answer.sdp }),
                        });
                    } else {
                        console.warn(`[Glare] Signaling state changed to ${pc.signalingState} before setting local answer for ${senderId}. Aborting answer.`);
                        // Potentially rollback or reset state here if necessary
                        // For now, just log and don't send the answer
                    }
                } catch (error) {
                    console.error(`Error processing offer from ${senderId}:`, error);
                    // Consider resetting ignoreOffer or other cleanup
                    // ignoreOffer.current[senderId] = false; // Example reset
                }
            } else {
                // Impolite peer rollback: Ignore the incoming offer since we have one pending.
                console.log(`[Glare] Impolite peer ignoring offer from ${senderId} due to pending local offer.`);
                // We might want to signal back an error or simply drop it.
                // Currently, it's just ignored based on the ignoreOffer flag logic earlier.
            }
            break;

          case "answer":
            console.log(`Received answer from: ${senderId}`);
            // Recreate RTCSessionDescription from parsed data
            const answerDescription = new RTCSessionDescription(parsedData);
            // Set answer only if we are expecting one
            if (pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(answerDescription);
                console.log(`Remote description (answer) set for ${senderId}`);

                // Process any queued candidates for this peer
                await processQueuedIceCandidates(senderId);
            } else {
                console.warn(`Received answer from ${senderId}, but signaling state is ${pc.signalingState}. Ignoring.`);
            }

            deleteSignal({ signalId: signal._id });
            break;

          case "candidate":
            console.log(`Received ICE candidate from: ${senderId}`);
            // Recreate RTCIceCandidate from parsed data
            const iceCandidate = new RTCIceCandidate(parsedData);
            // Add candidate only if remote description is set
            if (pc.remoteDescription) {
              try {
                await pc.addIceCandidate(iceCandidate);
                console.log(`Added ICE candidate from ${senderId}`);
              } catch (addError) {
                console.error(`Error adding ICE candidate for ${senderId}:`, addError);
              }
            } else {
              console.warn(`Received ICE candidate from ${senderId}, but remote description not set yet. Queueing.`);
              // Queue the candidate if remote description isn't set
              if (!queuedIceCandidatesRef.current[senderId]) {
                queuedIceCandidatesRef.current[senderId] = [];
              }
              queuedIceCandidatesRef.current[senderId].push(iceCandidate); // Store the candidate directly
            }

            deleteSignal({ signalId: signal._id });
            break;

          default:
            console.warn(`Received unknown signal type: ${type}`);
        }
      } catch (error) {
        console.error(`Error processing signal from ${senderId}:`, signal, error);
      }
    });

    // Note: Consider adding logic to clear processed signals from the Convex query if they persist.

  }, [signals, isAuthLoading, isAuthenticated, createPeerConnection, sendSignal, sessionId, userId, deleteSignal, processQueuedIceCandidates]); // Added userId dependency

  // --- Assign Remote Streams to Video Elements ---
  useEffect(() => {
    Object.keys(remoteStreams).forEach((peerId) => {
      const stream = remoteStreams[peerId];
      const videoElement = remoteVideoRefs.current[peerId];
      if (videoElement && stream && videoElement.srcObject !== stream) {
        console.log(`Assigning remote stream from ${peerId} to video element`);
        videoElement.srcObject = stream;
      } else if (videoElement && !stream) {
        console.log(`Clearing stream for ${peerId}`);
        videoElement.srcObject = null;
      }
    });
  }, [remoteStreams]); // Re-run when remoteStreams changes


  // --- Leave Call Handler ---
  const leaveCall = useCallback(async () => {
    // Call backend to remove user from session and clean up signals
    try {
      await leaveSession({ sessionId: sessionId as Id<"events">, userId });
      console.log("Successfully notified backend of leave.");
    } catch (err) {
      console.error("Failed to notify backend of leave:", err);
    }
    // Stop local media tracks
    localStream?.getTracks().forEach((track) => track.stop());
    // Close all peer connections
    Object.values(peerConnections.current).forEach(pc => pc.close());
    // Optionally, clear remote streams and refs
    setRemoteStreams({});
    remoteVideoRefs.current = {};
    // Optionally, notify backend/peers here
    console.log("[VideoCall] leaveCall triggered: cleaned up media and peers.");
  }, [localStream, leaveSession, sessionId, userId]);

  useImperativeHandle(ref, () => ({ leaveCall }), [leaveCall]);

  // --- Render Component ---
  return (
    <div className={styles.videoCallContainer}>
      <h2>Video Call - {username} ({userId.substring(0, 4)})</h2>
      <div className={styles.videoArea}>
        {/* Local Video */}
        <div className={styles.videoWrapper}>
          <video
            ref={localVideoRef}
            className={styles.videoElement}
            autoPlay
            playsInline
            muted // Mute local video playback to avoid echo
            style={{ visibility: isVideoEnabled ? 'visible' : 'hidden' }} // Hide video element if disabled
          />
          {/* Show placeholder if video is disabled */}
          {!isVideoEnabled && (
            <div className={styles.videoPlaceholder}>Camera Off</div>
          )}
          <span>You ({username.substring(0,6)})</span>
        </div>

        {/* Remote Videos */}
        {Object.keys(remoteStreams).map((peerId) => (
            // Only render if connection exists, even if stream not yet arrived
           peerConnections.current[peerId] && (
             <div key={peerId} className={styles.videoWrapper}>
                <video
                    ref={(el) => (remoteVideoRefs.current[peerId] = el)} // Assign ref
                    className={styles.videoElement}
                    autoPlay
                    playsInline
                />
                <span>Peer: {peerId.substring(0, 4)} {peerConnections.current[peerId].connectionState}</span>
                 {/* TODO: Get actual username for peerId */}
            </div>
           )
        ))} 
      </div>
      <div className={styles.controls}>
        <button 
          onClick={toggleAudio} 
          className={`${styles.controlButton} ${!isAudioEnabled ? styles.inactive : ''}`}
        >
          {isAudioEnabled ? 'Mute Mic' : 'Unmute Mic'}
        </button>
        <button 
          onClick={toggleVideo} 
          className={`${styles.controlButton} ${!isVideoEnabled ? styles.inactive : ''}`}
        >
          {isVideoEnabled ? 'Stop Video' : 'Start Video'}
        </button>
        {/* Add Hang Up button later */}
        {/* <button className={`${styles.controlButton} ${styles.hangup}`}>Hang Up</button> */}

      </div>
    </div>
  );
});
