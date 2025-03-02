import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { Navigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../contexts/AuthContext";
import { Header } from "./Header";

interface ChatProps {
  userId: string | null;
  username: string | null;
}

export const Chat = ({ userId, username }: ChatProps) => {
  const messages = useQuery(api.chat.getMessages);
  const sendMessage = useMutation(api.chat.sendMessage);
  const [newMessageText, setNewMessageText] = useState("");

  useEffect(() => {
    // Make sure scrollTo works on button click in Chrome
    if (messages) {
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }, 0);
    }
  }, [messages]);

  // Require authentication
  if (!userId || !username) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <div className="chat-container">
      <Header username={username} />
      <main className="chat">
        {messages?.map((message) => (
          <article
            key={message._id}
            className={message.user === username ? "message-mine" : ""}
          >
            <div>{message.user}</div>

            <p>{message.body}</p>
          </article>
        ))}
      </main>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await sendMessage({ user: username, body: newMessageText });
          setNewMessageText("");
        }}
      >
        <input
          value={newMessageText}
          onChange={async (e) => {
            const text = e.target.value;
            setNewMessageText(text);
          }}
          placeholder="Write a message…"
          autoFocus
        />
        <button type="submit" disabled={!newMessageText}>
          Send
        </button>
      </form>
    </div>
  );
}; 