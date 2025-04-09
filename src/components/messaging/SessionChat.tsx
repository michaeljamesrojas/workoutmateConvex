import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../../convex";
import { MessageInput } from "./MessageInput";
import styles from "./Chat.module.css";

interface SessionChatProps {}

export function SessionChat({}: SessionChatProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Get auth state and user details from Clerk
  const { isLoaded, isSignedIn, user } = useUser();

  // Derive userId and username
  const currentUsername = isLoaded && isSignedIn && user ? 
                          user.username || 
                          (user.firstName && user.lastName ? 
                            `${user.firstName} ${user.lastName}` : 
                            user.emailAddresses?.[0]?.emailAddress || 'user') 
                          : "";

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
              className={`${styles.messageArticle} ${message.user === currentUsername ? styles.messageMine : ""}`}
            >
              <div>{message.user}</div>
              <p>{message.body}</p>
            </article>
          ))
        )}
      </main>
      <div className={styles.inputContainer}>
        <MessageInput 
          username={currentUsername} 
          sessionId={sessionId} 
          disabled={!isLoaded || !isSignedIn} 
        />
      </div>
    </div>
  );
};
