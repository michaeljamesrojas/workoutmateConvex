import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { Login } from "./components/Login";

export default function App() {
  const messages = useQuery(api.chat.getMessages);
  const sendMessage = useMutation(api.chat.sendMessage);
  const navigate = useNavigate();
  const location = useLocation();

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

  // When auth state changes, redirect appropriately
  useEffect(() => {
    if (!userId || !username) {
      // Only redirect if we're not already on the login page
      if (location.pathname !== "/login") {
        navigate("/login");
      }
    } else if (location.pathname === "/login") {
      // If logged in but on login page, redirect to chat
      navigate("/");
    }
  }, [userId, username, navigate, location.pathname]);

  const handleLogin = (newUserId: string, newUsername: string) => {
    localStorage.setItem("userId", newUserId);
    localStorage.setItem("username", newUsername);
    setUserId(newUserId);
    setUsername(newUsername);
    navigate("/");
  };

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    setUserId(null);
    setUsername(null);
    navigate("/login");
  };

  // Define the chat component (previously the main return of App)
  const ChatComponent = () => {
    // Require authentication
    if (!userId || !username) {
      return <Navigate to="/login" replace />;
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
  };

  // Main route structure
  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route path="/" element={<ChatComponent />} />
    </Routes>
  );
}
