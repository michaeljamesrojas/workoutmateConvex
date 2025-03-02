import { useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Login } from "./components/Login";
import { Chat } from "./components/Chat";
import { useAuth } from "./contexts/AuthContext";

export default function App() {
  const { userId, username, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // When auth state changes, redirect appropriately
  useEffect(() => {
    if (!isAuthenticated) {
      // Only redirect if we're not already on a auth page
      if (location.pathname !== "/login" && location.pathname !== "/register") {
        navigate("/login");
      }
    } else if (location.pathname === "/login" || location.pathname === "/register") {
      // If logged in but on auth page, redirect to chat
      navigate("/");
    }
  }, [isAuthenticated, navigate, location.pathname]);

  // Main route structure
  return (
    <Routes>
      <Route path="/login" element={<Login isRegistering={false} />} />
      <Route path="/register" element={<Login isRegistering={true} />} />
      <Route path="/" element={<Chat userId={userId} username={username} />} />
    </Routes>
  );
}
