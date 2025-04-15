import { useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Login, ProtectedRoute, OAuthCallback, ConvexLogin, ConvexSignup } from "./components/auth";
import { Calendar } from "./components/calendar";
import { Session } from "./components/session";
import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "./convex";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoaded: clerkLoaded, isSignedIn, user } = useUser();
  const pollSessionNotifications = useMutation(api.sessionNotifications.pollSessionNotifications);

  // When auth state changes, redirect appropriately
  useEffect(() => {
    // Skip redirects if Clerk is still loading or we're on the OAuth callback page
    if (!clerkLoaded || location.pathname === "/oauth-callback") {
      return;
    }

    if (!isSignedIn) { 
      // Only redirect if we're not already on a auth page
      if (
        location.pathname !== "/login" &&
        location.pathname !== "/register" &&
        location.pathname !== "/oauth-callback" &&
        location.pathname !== "/login2" &&
        location.pathname !== "/signup2"
      ) {
        console.log("Not authenticated, redirecting to login");
        navigate("/login");
      }
    } else if (
      location.pathname === "/login" ||
      location.pathname === "/register" ||
      location.pathname === "/login2" ||
      location.pathname === "/signup2"
    ) {
      // If logged in but on auth page, redirect to home
      console.log("Already authenticated, redirecting to home");
      navigate("/");
    }
  }, [isSignedIn, navigate, location.pathname, clerkLoaded]);

  // Poll for session notifications every minute when the user is signed in
  useEffect(() => {
    // Only set up polling if the user is signed in
    if (!clerkLoaded || !isSignedIn) return;

    // Check immediately on login
    pollSessionNotifications({});
    
    // Set up interval to check every minute
    const interval = setInterval(() => {
      pollSessionNotifications({});
    }, 60000); // Check every minute
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [clerkLoaded, isSignedIn, pollSessionNotifications]);

  // Main route structure
  return (
    <Routes>
      <Route path="/login" element={<Login isRegistering={false} />} />
      <Route path="/register" element={<Login isRegistering={true} />} />
      <Route path="/oauth-callback" element={<OAuthCallback />} />
      <Route path="/login2" element={<ConvexLogin />} />
      <Route path="/signup2" element={<ConvexSignup />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Calendar />
          </ProtectedRoute>
        }
      />
      <Route
        path="/session/:sessionId"
        element={
          <ProtectedRoute>
            <Session />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
