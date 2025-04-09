import { useEffect, useRef, useState, useCallback } from "react";
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
  sessionId: string;
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

export const VideoCall = ({ sessionId, userId, username, participantIds }: VideoCallProps) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peerConnections, setPeerConnections] = useState<Record<string, PeerConnection>>({});
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({}); // Ref to store pending candidates

  // Convex Auth state
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();

  // Convex mutations and queries
  const sendSignal = useMutation(api.video.sendSignal);
  const deleteSignal = useMutation(api.video.deleteSignal);
  const signals = useQuery(api.video.getSignals, isAuthenticated ? { sessionId } : "skip");

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
      Object.values(peerConnections).forEach(pc => pc.connection.close());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

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

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      console.log(`Track received from ${targetUserId}`, event.streams[0]);
      setPeerConnections((prev) => ({
        ...prev,
        [targetUserId]: { ...prev[targetUserId], remoteStream: event.streams[0] },
      }));
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
             setPeerConnections((prev) => {
                const newState = { ...prev };
                delete newState[targetUserId];
                return newState;
            });
        }
    };

    setPeerConnections((prev) => ({
      ...prev,
      [targetUserId]: { connection: pc },
    }));

    return pc;
  }, [localStream, sendSignal, sessionId]); // Dependencies

  // --- Initiate Connections to New Peers ---
  useEffect(() => {
    if (!localStream || isAuthLoading || !isAuthenticated) {
      console.log("Skipping peer connection initiation: Local stream or auth not ready.");
      return; // Don't proceed if local stream or auth isn't ready
    }

    console.log("Checking for new peers to connect to...", otherParticipantIds);

    otherParticipantIds.forEach(async (peerId) => {
      // Check if a connection already exists or is being established
      if (!peerConnections[peerId]) {
        console.log(`Initiating connection to new peer: ${peerId}`);

        // 1. Create Peer Connection
        const pc = createPeerConnection(peerId);
        if (!pc) {
          console.error(`Failed to create peer connection for ${peerId}`);
          return; // Skip if creation failed
        }

        try {
          // 2. Create Offer
          console.log(`Creating offer for ${peerId}`);
          const offer = await pc.createOffer();

          // 3. Set Local Description
          console.log(`Setting local description (offer) for ${peerId}`);
          await pc.setLocalDescription(offer);

          console.log(`Sending offer to ${peerId}`);
          sendSignal({
            sessionId,
            targetUserId: peerId,
            type: "offer",
            // Send only the type and sdp properties, stringified
            signal: JSON.stringify({ type: offer.type, sdp: offer.sdp }),
          });

          // Process any queued candidates for this peer immediately after setting local desc
          // (Though typically candidates are added after remote desc is set)
          // Consider if this is needed or if processing only after setRemoteDescription is sufficient.
          if (pendingCandidatesRef.current[peerId]) {
            console.log(`Processing ${pendingCandidatesRef.current[peerId].length} queued candidates for ${peerId}`);
            pendingCandidatesRef.current[peerId].forEach(async (candidateInit) => {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
                console.log(`Added queued ICE candidate from ${peerId}`);
              } catch (addError) {
                console.error(`Error adding queued ICE candidate for ${peerId}:`, addError);
              }
            });
            delete pendingCandidatesRef.current[peerId]; // Clear queue
          }

        } catch (error) {
           console.error(`Error creating/sending offer to ${peerId}:`, error);
           // Clean up the failed connection attempt?
           setPeerConnections((prev) => {
             const newState = { ...prev };
             delete newState[peerId];
             return newState;
           });
           pc.close();
        }
      } else {
         console.log(`Connection status for existing peer ${peerId}: ${peerConnections[peerId]?.connection?.connectionState}`);
         // Optional: Add logic here to re-initiate if connection failed previously
      }
    });

    // Optional: Clean up connections for peers who left
    // Get current peer IDs from state
    const currentPeerIds = Object.keys(peerConnections);
    currentPeerIds.forEach(peerId => {
      if (!otherParticipantIds.includes(peerId)) {
        console.log(`Cleaning up connection for left peer: ${peerId}`);
        peerConnections[peerId]?.connection?.close();
        setPeerConnections(prev => {
          const newState = { ...prev };
          delete newState[peerId];
          return newState;
        });
      }
    });

  // Dependencies: Run when participant list, local stream, or auth state changes
  // Added peerConnections to re-evaluate state, but be cautious of loops
  }, [otherParticipantIds, localStream, isAuthLoading, isAuthenticated, createPeerConnection, sendSignal, sessionId, peerConnections]);

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
      const peerData = peerConnections[senderId];
      let pc: RTCPeerConnection | null = peerData ? peerData.connection : null;

      // If connection doesn't exist for an incoming signal (e.g., offer), create it.
      if (!pc && type === 'offer') {
        console.log(`Signal received from new peer ${senderId}. Creating connection.`);
        const createdPc = createPeerConnection(senderId); // Returns RTCPeerConnection | null
        if (createdPc) { // Check ensures createdPc is not null here
            // Update state *inside* the check where createdPc is known to be non-null
            setPeerConnections((prev) => ({
                 ...prev,
                 [senderId]: { connection: createdPc, remoteStream: undefined } // Explicitly assign non-null connection
             }));
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
            // Recreate RTCSessionDescription from parsed data
            const offerDescription = new RTCSessionDescription(parsedData);

            // Basic glare handling: Check signaling state
            // If we are also in the process of sending an offer ('have-local-offer'),
            // we might need to decide which offer wins (e.g., based on user IDs).
            if (pc.signalingState !== 'stable') {
              console.warn(`Received offer from ${senderId} while signaling state is ${pc.signalingState}. Potential glare.`);
              // More sophisticated glare handling might be needed here.
              // For simplicity, we'll try to proceed, but this might lead to errors.
              // A common strategy is comparing user IDs and having the one with the lower ID rollback.
               // Basic glare handling: higher ID initiates rollback (can be more sophisticated)
              // This assumes Clerk user IDs can be compared lexicographically
              const localUserId = userId || ""; // Ensure userId is available
              if (localUserId < senderId) {
                  console.log("Glare detected: Local ID lower, ignoring received offer, local offer should proceed.");
                  return; // Let the local offer initiation proceed
              } else {
                  console.log("Glare detected: Local ID higher, rolling back local offer process (if any) and proceeding with received offer.");
                  // Implement rollback if necessary (e.g., close existing connection attempt and restart)
                  // For now, we proceed assuming the local setLocalDescription might fail gracefully or be overwritten
              }
            }

            await pc.setRemoteDescription(offerDescription);
            console.log(`Remote description (offer) set for ${senderId}`);

            // Process any queued candidates for this peer
            if (pendingCandidatesRef.current[senderId]) {
              console.log(`Processing ${pendingCandidatesRef.current[senderId].length} queued candidates for ${senderId}`);
              pendingCandidatesRef.current[senderId].forEach(async (candidateInit) => {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
                  console.log(`Added queued ICE candidate from ${senderId}`);
                } catch (addError) {
                  console.error(`Error adding queued ICE candidate for ${senderId}:`, addError);
                }
              });
              delete pendingCandidatesRef.current[senderId]; // Clear queue
            }

            deleteSignal({ signalId: signal._id });

            console.log(`Creating answer for ${senderId}`);
            const answer = await pc.createAnswer();
            console.log(`Setting local description (answer) for ${senderId}`);
            await pc.setLocalDescription(answer);

            console.log(`Sending answer to ${senderId}`);
            sendSignal({
              sessionId,
              targetUserId: senderId,
              type: "answer",
              // Send only the type and sdp properties, stringified
              signal: JSON.stringify({ type: answer.type, sdp: answer.sdp }),
            });
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
                if (pendingCandidatesRef.current[senderId]) {
                  console.log(`Processing ${pendingCandidatesRef.current[senderId].length} queued candidates for ${senderId}`);
                  pendingCandidatesRef.current[senderId].forEach(async (candidateInit) => {
                    try {
                      await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
                      console.log(`Added queued ICE candidate from ${senderId}`);
                    } catch (addError) {
                      console.error(`Error adding queued ICE candidate for ${senderId}:`, addError);
                    }
                  });
                  delete pendingCandidatesRef.current[senderId]; // Clear queue
                }
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
              if (!pendingCandidatesRef.current[senderId]) {
                pendingCandidatesRef.current[senderId] = [];
              }
              pendingCandidatesRef.current[senderId].push(parsedData); // Store the raw parsed data
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

  }, [signals, isAuthLoading, isAuthenticated, peerConnections, createPeerConnection, sendSignal, sessionId, userId]); // Added userId dependency

  // --- Assign Remote Streams to Video Elements ---
  useEffect(() => {
    Object.entries(peerConnections).forEach(([peerId, pcData]) => {
      if (pcData.remoteStream && remoteVideoRefs.current[peerId]) {
        console.log(`Assigning remote stream from ${peerId} to video element`);
        remoteVideoRefs.current[peerId]!.srcObject = pcData.remoteStream;
      }
    });
  }, [peerConnections]); // Re-run when peerConnections change


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
          />
          <span>You ({username.substring(0,6)})</span>
        </div>

        {/* Remote Videos */}
        {otherParticipantIds.map((peerId) => (
            // Only render if connection exists, even if stream not yet arrived
           peerConnections[peerId] && (
             <div key={peerId} className={styles.videoWrapper}>
                <video
                    ref={(el) => (remoteVideoRefs.current[peerId] = el)}
                    className={styles.videoElement}
                    autoPlay
                    playsInline
                />
                <span>Peer: {peerId.substring(0, 4)} {peerConnections[peerId].connection.connectionState}</span>
                 {/* TODO: Get actual username for peerId */}
            </div>
           )
        ))} 
      </div>
      <div className={styles.controls}>
        {/* TODO: Add call controls (mute audio, disable video, hang up) */}
        <button onClick={() => console.log("Peer Connections:", peerConnections)}>Log Peers</button>
         <button onClick={() => console.log("Signals:", signals)}>Log Signals</button>
      </div>
    </div>
  );
};
