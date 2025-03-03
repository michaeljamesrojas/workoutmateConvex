import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex";
import { Header } from "../layout";
import { SessionChat } from "../messaging";
import { VideoCall } from "./VideoCall";
import styles from "./Session.module.css";

interface SessionProps {
  userId: string | null;
  username: string | null;
}

export const Session = ({ userId, username }: SessionProps) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // Get session details
  const session = useQuery(api.events.getEventById, { id: sessionId || "" });

  if (!userId || !username) {
    return <div>User information is missing</div>;
  }

  if (!session) {
    return <div>Loading session information...</div>;
  }

  return (
    <div className={styles.sessionContainer}>
      <Header username={username} />
      <div className={styles.sessionHeader}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>{session?.title || "Session"}</h1>
      </div>

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
