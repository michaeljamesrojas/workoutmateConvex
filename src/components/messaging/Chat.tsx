import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "../../contexts/AuthContext";
import { Header } from "../layout";
import { MessageInput } from "./MessageInput";

interface ChatProps {
  userId: string | null;
  username: string | null;
}

export const Chat = ({ userId, username }: ChatProps) => {
  const messages = useQuery(api.chat.getMessages);

  useEffect(() => {
    // Make sure scrollTo works on button click in Chrome
    if (messages) {
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }, 0);
    }
  }, [messages]);

  // Since ProtectedRoute ensures we always have a username, we can safely assert it's non-null
  const userDisplayName = username as string;

  return (
    <div className="chat-container">
      <Header username={userDisplayName} />
      <main className="chat">
        {messages?.map((message) => (
          <article
            key={message._id}
            className={message.user === userDisplayName ? "message-mine" : ""}
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