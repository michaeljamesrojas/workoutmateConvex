import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex";
import { Header } from "../layout";
import { SessionChat } from "../messaging";
import { VideoCall } from "./VideoCall";
import styles from "./Session.module.css";
import { useEffect, useState } from "react";
import { showToast } from "../../utils/toast";

interface SessionProps {
  userId: string | null;
  username: string | null;
}

// Constants
const EARLY_JOIN_MINUTES = 10;

interface SessionStatus {
  canJoin: boolean;
  message: string;
  status: 'upcoming' | 'active' | 'ended' | 'loading' | 'early';
  timeRemaining?: string;
}

export const Session = ({ userId, username }: SessionProps) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    canJoin: false,
    message: "Loading session information...",
    status: 'loading'
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasShownJoinToast, setHasShownJoinToast] = useState(false);

  // Get session details
  const session = useQuery(api.events.getEventById, { id: sessionId || "" });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Validate session timing
  useEffect(() => {
    if (!session) return;

    const startTime = new Date(session.start);
    const endTime = new Date(session.end);
    const now = currentTime;

    // Calculate time values
    const timeUntilStart = startTime.getTime() - now.getTime();
    const earlyJoinThreshold = EARLY_JOIN_MINUTES * 60 * 1000; // 10 minutes in milliseconds
    
    if (timeUntilStart > earlyJoinThreshold) {
      // Session starts in more than 10 minutes - cannot join yet
      // Format time remaining
      const hours = Math.floor(timeUntilStart / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilStart % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeUntilStart % (1000 * 60)) / 1000);
      
      let timeRemainingStr;
      if (hours > 0) {
        timeRemainingStr = `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        timeRemainingStr = `${minutes}m ${seconds}s`;
      } else {
        timeRemainingStr = `${seconds}s`;
      }

      setSessionStatus({
        canJoin: false,
        message: `This session hasn't started yet. Please come back at the scheduled time.`,
        status: 'upcoming',
        timeRemaining: timeRemainingStr
      });
    } else if (timeUntilStart > 0 && timeUntilStart <= earlyJoinThreshold) {
      // Within 10 minutes of start time - early join is allowed
      const minutesUntilStart = Math.ceil(timeUntilStart / (1000 * 60));
      
      setSessionStatus({
        canJoin: true,
        message: `Session starts in ${minutesUntilStart} minute${minutesUntilStart !== 1 ? 's' : ''}. You can join early to prepare.`,
        status: 'early',
        timeRemaining: `${minutesUntilStart}m`
      });

      // Show early join toast once
      if (!hasShownJoinToast) {
        showToast.session.earlyJoin(minutesUntilStart);
        setHasShownJoinToast(true);
      }
    } else if (now > endTime) {
      // Session has ended
      setSessionStatus({
        canJoin: false,
        message: "This session has ended.",
        status: 'ended'
      });
    } else {
      // Session is active
      setSessionStatus({
        canJoin: true,
        message: "Session is active",
        status: 'active'
      });

      // Show joined toast once
      if (!hasShownJoinToast) {
        showToast.session.joined();
        setHasShownJoinToast(true);
      }
    }
  }, [session, currentTime, hasShownJoinToast]);

  if (!userId || !username) {
    return (
      <div className={styles.sessionContainer}>
        <Header username={null} />
        <div className={styles.errorContainer}>
          <div className={styles.errorMessage}>
            Please log in to join this session
          </div>
          <button 
            className={styles.actionButton}
            onClick={() => navigate('/')}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={styles.sessionContainer}>
        <Header username={username} />
        <div className={styles.errorContainer}>
          <div className={styles.errorMessage}>Loading session information...</div>
        </div>
      </div>
    );
  }

  // If session timing is invalid, show error
  if (!sessionStatus.canJoin) {
    return (
      <div className={styles.sessionContainer}>
        <Header username={username} />
        <div className={styles.sessionHeader}>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1>{session?.title || "Session"}</h1>
        </div>
        <div className={styles.errorContainer}>
          <div className={styles.errorMessage}>
            {sessionStatus.message}
            {sessionStatus.status === 'upcoming' && (
              <div className={styles.timeRemaining}>
                Starting in: <span className={styles.countdown}>{sessionStatus.timeRemaining}</span>
              </div>
            )}
          </div>
          <button 
            className={styles.actionButton}
            onClick={() => navigate('/calendar')}
          >
            Return to Calendar
          </button>
        </div>
      </div>
    );
  }

  // Early join or active session - show a banner for early join
  const isEarlyJoin = sessionStatus.status === 'early';

  return (
    <div className={styles.sessionContainer}>
      <Header username={username} />
      <div className={styles.sessionHeader}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>{session?.title || "Session"}</h1>
      </div>
      
      {isEarlyJoin && (
        <div className={styles.earlyJoinBanner}>
          <div className={styles.earlyJoinMessage}>
            {sessionStatus.message}
          </div>
        </div>
      )}

      <div className={styles.sessionContent}>
        <div className={styles.mainArea}>
          <VideoCall
            sessionId={sessionId || ""}
            userId={userId}
            username={username}
          />
        </div>
        <div className={styles.sidebarArea}>
          <SessionChat userId={userId} username={username} />
        </div>
      </div>
    </div>
  );
};
