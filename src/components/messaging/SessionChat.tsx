import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex";
import { MessageInput } from "./MessageInput";
import styles from "./Chat.module.css";

interface SessionChatProps {
  userId: string | null;
  username: string | null;
}

export const SessionChat = ({ userId, username }: SessionChatProps) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Get session details
  const session = useQuery(api.events.getEventById, { id: sessionId || "" });
  // Use session-specific messages instead of all messages
  const messages = useQuery(api.chat.getSessionMessages, {
    sessionId: sessionId || "",
  });

  useEffect(() => {
    // Scroll to bottom when messages change
    if (messages && chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Since ProtectedRoute ensures we always have a username, we can safely assert it's non-null
  const userDisplayName = username as string;

  if (!session) {
    return <div>Loading session information...</div>;
  }

  return (
    <div className={styles.chatContainer}>
      <main className={styles.chat} ref={chatContainerRef}>
        {messages?.length === 0 ? (
          <div className={styles.emptyState}>
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages?.map((message) => (
            <article
              key={message._id}
              className={`${styles.messageArticle} ${message.user === userDisplayName ? styles.messageMine : ""}`}
            >
              <div>{message.user}</div>
              <p>{message.body}</p>
            </article>
          ))
        )}
      </main>
      <div className={styles.inputContainer}>
        <MessageInput username={userDisplayName} sessionId={sessionId} />
      </div>
    </div>
  );
};
