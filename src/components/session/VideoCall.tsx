import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
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

  // Convex mutations and queries
  const sendSignal = useMutation(api.video.sendSignal);
  const deleteSignal = useMutation(api.video.deleteSignal);
  const signals = useQuery(api.video.getSignals, { sessionId });

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

  // --- Initiate Calls to Other Participants ---
  useEffect(() => {
    if (!localStream || participantIds.length <= 1) return; // Need local stream and others

    console.log("Attempting to initiate calls to:", otherParticipantIds);

    otherParticipantIds.forEach(async (targetUserId) => {
      // Only initiate if not already connected or connecting
      if (!peerConnections[targetUserId]) {
        const pc = createPeerConnection(targetUserId);
        if (pc) {
            try {
                console.log(`Creating offer for ${targetUserId}`);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                console.log(`Sending offer to ${targetUserId}`);
                sendSignal({
                sessionId,
                targetUserId,
                type: "offer",
                signal: JSON.stringify(offer),
                });
            } catch (error) {
                console.error(`Error creating/sending offer to ${targetUserId}:`, error);
            }
        }
      }
    });
  // Intentionally run only when participants change significantly or local stream ready
  // Adjust dependencies carefully based on how participantIds is managed upstream
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStream, JSON.stringify(otherParticipantIds), createPeerConnection]);


  // --- Process Incoming Signals ---
  useEffect(() => {
    if (!signals || signals.length === 0) return;

    console.log("Received signals:", signals);

    signals.forEach(async (signal: Doc<"videoSignals">) => {
      const { userId: senderUserId, type, signal: signalDataStr, _id: signalId } = signal;
      let signalData: any;
      try {
        signalData = JSON.parse(signalDataStr);
      } catch (error) {
        console.error("Failed to parse signal data:", signalDataStr, error);
        // Check if deleteSignal is available before calling
        if (deleteSignal) {
             await deleteSignal({ signalId }); // Delete invalid signal
        } else {
            console.warn("deleteSignal mutation not ready.");
        }
        return;
      }

      let pc = peerConnections[senderUserId]?.connection;

      try {
        if (type === "offer") {
          console.log(`Processing offer from ${senderUserId}`);
          // Ensure connection exists or create it
          if (!pc) {
            pc = createPeerConnection(senderUserId);
          }
          if (!pc) {
              console.error("Failed to create peer connection for offer");
              // Check if deleteSignal is available before calling
              if (deleteSignal) {
                  await deleteSignal({ signalId });
              } else {
                  console.warn("deleteSignal mutation not ready.");
              }
              return;
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
          console.log(`Creating answer for ${senderUserId}`);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          console.log(`Sending answer to ${senderUserId}`);
          sendSignal({
            sessionId,
            targetUserId: senderUserId,
            type: "answer",
            signal: JSON.stringify(answer),
          });

        } else if (type === "answer") {
          console.log(`Processing answer from ${senderUserId}`);
          if (!pc) {
            console.error(`No peer connection found for answer from ${senderUserId}`);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData));
            console.log(`Remote description set for ${senderUserId}`);
          }

        } else if (type === "candidate") {
          console.log(`Processing ICE candidate from ${senderUserId}`);
           if (!pc) {
            console.error(`No peer connection found for candidate from ${senderUserId}`);
          } else {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(signalData));
                console.log(`Added ICE candidate from ${senderUserId}`);
            } catch (e) {
                console.error("Error adding received ICE candidate", e);
            }
          }
        }
        // Delete signal after processing
        // Check if deleteSignal is available before calling
        if (deleteSignal) {
             await deleteSignal({ signalId });
        } else {
            console.warn("deleteSignal mutation not ready.");
        }

      } catch (error) {
        console.error(`Error processing signal type ${type} from ${senderUserId}:`, error);
        // Consider deleting the signal even if processing failed to avoid loops
         // Check if deleteSignal is available before calling
        if (deleteSignal) {
            try {
                 await deleteSignal({ signalId });
            } catch (deleteError) {
                 console.error(`Failed to delete signal ${signalId} after processing error:`, deleteError);
            }
        } else {
             console.warn("deleteSignal mutation not ready during error handling.");
        }
      }
    });
  }, [signals, peerConnections, createPeerConnection, sendSignal, deleteSignal, sessionId]);


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
