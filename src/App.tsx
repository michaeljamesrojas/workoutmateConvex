import { useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Login, ProtectedRoute, OAuthCallback } from "./components/auth";
import { Calendar } from "./components/calendar";
import { Session } from "./components/session";
import { useAuth } from "./contexts/AuthContext";
import { useUser } from "@clerk/clerk-react";

export default function App() {
  const { userId, username, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoaded: clerkLoaded, isSignedIn, user } = useUser();

  // When auth state changes, redirect appropriately
  useEffect(() => {
    // Skip redirects if Clerk is still loading or we're on the OAuth callback page
    if (!clerkLoaded || location.pathname === "/oauth-callback") {
      return;
    }

    if (!isAuthenticated) {
      // Only redirect if we're not already on a auth page
      if (
        location.pathname !== "/login" &&
        location.pathname !== "/register" &&
        location.pathname !== "/oauth-callback"
      ) {
        console.log("Not authenticated, redirecting to login");
        navigate("/login");
      }
    } else if (
      location.pathname === "/login" ||
      location.pathname === "/register"
    ) {
      // If logged in but on auth page, redirect to home
      console.log("Already authenticated, redirecting to home");
      navigate("/");
    }
  }, [isAuthenticated, navigate, location.pathname, clerkLoaded]);

  // Main route structure
  return (
    <Routes>
      <Route path="/login" element={<Login isRegistering={false} />} />
      <Route path="/register" element={<Login isRegistering={true} />} />
      <Route path="/oauth-callback" element={<OAuthCallback />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Calendar userId={userId} username={username} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/session/:sessionId"
        element={
          <ProtectedRoute>
            <Session userId={userId} username={username} />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
