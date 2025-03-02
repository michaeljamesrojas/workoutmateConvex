import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Login } from "./components/Login";
import { Id } from "../convex/_generated/dataModel";

export default function App() {
  const messages = useQuery(api.chat.getMessages);
  const sendMessage = useMutation(api.chat.sendMessage);

  const [newMessageText, setNewMessageText] = useState("");
  const [userId, setUserId] = useState<string | null>(localStorage.getItem("userId"));
  const [username, setUsername] = useState<string | null>(localStorage.getItem("username"));

  useEffect(() => {
    // Make sure scrollTo works on button click in Chrome
    if (messages) {
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }, 0);
    }
  }, [messages]);

  const handleLogin = (newUserId: string, newUsername: string) => {
    localStorage.setItem("userId", newUserId);
    localStorage.setItem("username", newUsername);
    setUserId(newUserId);
    setUsername(newUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    setUserId(null);
    setUsername(null);
  };

  if (!userId || !username) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <main className="chat">
      <header>
        <h1>Convex Chat</h1>
        <p>
          Connected as <strong>{username}</strong>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </p>
      </header>
      {messages?.map((message) => (
        <article
          key={message._id}
          className={message.user === username ? "message-mine" : ""}
        >
          <div>{message.user}</div>

          <p>{message.body}</p>
        </article>
      ))}
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
    </main>
  );
}
