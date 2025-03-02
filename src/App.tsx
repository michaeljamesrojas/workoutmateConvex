import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { api } from "../convex/_generated/api";
import { Login } from "./components/Login";
import { Chat } from "./components/Chat";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [userId, setUserId] = useState<string | null>(localStorage.getItem("userId"));
  const [username, setUsername] = useState<string | null>(localStorage.getItem("username"));

  // When auth state changes, redirect appropriately
  useEffect(() => {
    if (!userId || !username) {
      // Only redirect if we're not already on a auth page
      if (location.pathname !== "/login" && location.pathname !== "/register") {
        navigate("/login");
      }
    } else if (location.pathname === "/login" || location.pathname === "/register") {
      // If logged in but on auth page, redirect to chat
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

  // Main route structure
  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={handleLogin} isRegistering={false} />} />
      <Route path="/register" element={<Login onLogin={handleLogin} isRegistering={true} />} />
      <Route path="/" element={<Chat userId={userId} username={username} handleLogout={handleLogout} />} />
    </Routes>
  );
}
