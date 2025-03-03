import { useEffect, useRef, useState } from "react";
import styles from "./VideoCall.module.css";

interface VideoCallProps {
  sessionId: string;
  userId: string;
  username: string;
}

export const VideoCall = ({ sessionId, userId, username }: VideoCallProps) => {
  const [isVideoActive, setIsVideoActive] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const toggleVideo = async () => {
    try {
      if (isVideoActive) {
        // Stop video
        const stream = localVideoRef.current?.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
          }
        }
        setIsVideoActive(false);
      } else {
        // Start video
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsVideoActive(true);
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (localVideoRef.current?.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className={styles.videoCallContainer}>
      <h2>Video Call</h2>
      <div className={styles.videoArea}>
        <video
          ref={localVideoRef}
          className={styles.videoElement}
          autoPlay
          playsInline
          muted
        />
        {!isVideoActive && (
          <div className={styles.placeholderOverlay}>
            <span>{username}</span>
          </div>
        )}
      </div>
      <div className={styles.controls}>
        <button
          className={`${styles.controlButton} ${isVideoActive ? styles.active : ""}`}
          onClick={toggleVideo}
        >
          {isVideoActive ? "Turn off video" : "Turn on video"}
        </button>
      </div>
    </div>
  );
};
