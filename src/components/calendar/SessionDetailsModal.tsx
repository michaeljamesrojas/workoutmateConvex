import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./SessionDetailsModal.module.css";
import { showToast } from "../../utils/toast";

// Constants
const EARLY_JOIN_MINUTES = 10;

interface SessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    title: string;
    start: string;
    end: string;
    creatorName: string;
    id: string;
  } | null;
  isOwnEvent?: boolean;
  onEdit?: () => void;
}

export const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  isOpen,
  onClose,
  event,
  isOwnEvent = false,
  onEdit,
}) => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [canEnterSession, setCanEnterSession] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'upcoming' | 'active' | 'ended' | 'early'>('upcoming');
  const [timeRemaining, setTimeRemaining] = useState('');

  // Update current time every second
  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isOpen]);

  // Check if user can enter the session
  useEffect(() => {
    if (!event) return;
    
    const startTime = new Date(event.start);
    const endTime = new Date(event.end);
    const now = currentTime;
    
    // Calculate time until session starts
    const timeUntilStart = startTime.getTime() - now.getTime();
    const earlyJoinThreshold = EARLY_JOIN_MINUTES * 60 * 1000; // 10 minutes in milliseconds
    
    if (timeUntilStart > earlyJoinThreshold) {
      // Session starts in more than 10 minutes - cannot join yet
      setSessionStatus('upcoming');
      setCanEnterSession(false);
      
      // Format time remaining
      const hours = Math.floor(timeUntilStart / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeUntilStart % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    } else if (timeUntilStart > 0 && timeUntilStart <= earlyJoinThreshold) {
      // Within early join window (10 minutes before start)
      setSessionStatus('early');
      setCanEnterSession(true);
      
      const minutesUntilStart = Math.ceil(timeUntilStart / (1000 * 60));
      setTimeRemaining(`${minutesUntilStart}m`);
    } else if (now > endTime) {
      // Session has ended
      setSessionStatus('ended');
      setCanEnterSession(false);
      setTimeRemaining('');
    } else {
      // Session is active
      setSessionStatus('active');
      setCanEnterSession(true);
      setTimeRemaining('');
    }
  }, [event, currentTime]);

  if (!isOpen || !event) return null;

  // Format dates for display
  const startDate = new Date(event.start).toLocaleString();
  const endDate = new Date(event.end).toLocaleString();

  const handleEnterSession = () => {
    if (!canEnterSession) {
      console.log("Cannot enter session yet - not time");
      showToast.error("Cannot enter session yet. Please wait until the scheduled time.");
      return;
    }

    // Show appropriate toast based on session status
    if (sessionStatus === 'early') {
      const minutesEarly = Math.ceil(Number(timeRemaining.replace('m', '')));
      showToast.session.earlyJoin(minutesEarly);
    } else if (sessionStatus === 'active') {
      showToast.session.joined();
    }

    navigate(`/session/${event.id}`);
    onClose();
  };

  const getButtonLabel = () => {
    if (sessionStatus === 'early') {
      return `Enter Session Early (Starts in ${timeRemaining})`;
    } else if (sessionStatus === 'active') {
      return "Enter Session";
    } else if (sessionStatus === 'ended') {
      return "Session Has Ended";
    } else {
      return "Session Not Started Yet";
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Session Details</h2>
          <button onClick={onClose} className={styles.closeButton}>
            &times;
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.detailRow}>
            <strong>Title:</strong>
            <span>{event.title}</span>
          </div>
          <div className={styles.detailRow}>
            <strong>Created by:</strong>
            <span>{event.creatorName}</span>
          </div>
          <div className={styles.detailRow}>
            <strong>Start Time:</strong>
            <span>{startDate}</span>
          </div>
          <div className={styles.detailRow}>
            <strong>End Time:</strong>
            <span>{endDate}</span>
          </div>
          <div className={styles.detailRow}>
            <strong>Status:</strong>
            <span className={styles[sessionStatus]}>
              {sessionStatus === 'upcoming' && (
                <>
                  Upcoming (Starts in {timeRemaining})
                </>
              )}
              {sessionStatus === 'early' && (
                <>
                  Starting Soon (Join {timeRemaining} early)
                </>
              )}
              {sessionStatus === 'active' && 'Active Now'}
              {sessionStatus === 'ended' && 'Session Ended'}
            </span>
          </div>
        </div>
        <div className={styles.modalFooter}>
          {sessionStatus === 'upcoming' ? (
            <button disabled className={styles.disabledButton}>
              Session not started yet
            </button>
          ) : sessionStatus === 'ended' ? (
            <button disabled className={styles.disabledButton}>
              Session has ended
            </button>
          ) : (
            <button 
              onClick={handleEnterSession} 
              className={sessionStatus === 'early' ? styles.earlyButton : styles.enterButton}
            >
              {getButtonLabel()}
            </button>
          )}
          {isOwnEvent && onEdit && (
            <button onClick={onEdit} className={styles.editButton}>
              Edit Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
