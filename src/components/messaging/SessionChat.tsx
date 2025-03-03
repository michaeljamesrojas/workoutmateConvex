import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex";
import { useAuth } from "../../contexts/AuthContext";
import { Header } from "../layout";
import { MessageInput } from "./MessageInput";
import styles from "./Chat.module.css";

interface SessionChatProps {
  userId: string | null;
  username: string | null;
}

export const SessionChat = ({ userId, username }: SessionChatProps) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // Get session details
  const session = useQuery(api.events.getEventById, { id: sessionId || "" });
  const messages = useQuery(api.chat.getMessages);

  useEffect(() => {
    // Make sure scrollTo works on button click in Chrome
    if (messages) {
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      }, 0);
    }
  }, [messages]);

  // Since ProtectedRoute ensures we always have a username, we can safely assert it's non-null
  const userDisplayName = username as string;

  if (!session) {
    return <div>Loading session information...</div>;
  }

  return (
    <div className={styles.chatContainer}>
      <Header username={userDisplayName} />
      <div className={styles.sessionHeader}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>{session?.title || "Session Chat"}</h1>
      </div>
      <main className={styles.chat}>
        {messages?.map((message) => (
          <article
            key={message._id}
            className={`${styles.messageArticle} ${message.user === userDisplayName ? styles.messageMine : ""}`}
          >
            <div>{message.user}</div>
            <p>{message.body}</p>
          </article>
        ))}
      </main>
      <MessageInput username={userDisplayName} />
    </div>
  );
};
