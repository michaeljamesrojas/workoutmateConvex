import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function OAuthCallback() {
  const navigate = useNavigate();
  const { isSignedIn, user, isLoaded: userIsLoaded } = useUser();
  const { login, isAuthenticated } = useAuth();
  const getUserFromClerk = useMutation(api.auth.getUserFromClerk);
  const clerk = useClerk();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Initializing authentication...");

  useEffect(() => {
    // Debug logging to track the flow
    console.log("OAuth callback - Auth state:", { 
      isSignedIn, 
      userLoaded: userIsLoaded,
      hasUser: !!user,
      userId: user?.id,
      isAuthenticatedInContext: isAuthenticated
    });

    async function handleOAuthCallback() {
      if (!userIsLoaded) {
        setStatusMessage("Loading user data...");
        return; // Wait for user data to load
      }

      // If already authenticated in our context, we can navigate directly
      if (isAuthenticated) {
        console.log("Already authenticated in context, navigating to home");
        setStatusMessage("Already authenticated, redirecting...");
        setTimeout(() => navigate("/"), 500);
        return;
      }

      try {
        setIsProcessing(true);
        
        if (isSignedIn && user) {
          setStatusMessage("User authenticated with Clerk, creating Convex user...");
          
          // Get email or fall back to username
          const userIdentifier = user.emailAddresses.length > 0 
            ? user.emailAddresses[0].emailAddress 
            : (user.username || `user-${user.id}`);
          
          console.log("Creating/getting Convex user with identifier:", userIdentifier);
            
          // Create or get user in Convex
          const convexUser = await getUserFromClerk({
            clerkId: user.id,
            username: userIdentifier,
          });

          console.log("Convex user created/retrieved:", convexUser);

          // Login with AuthContext
          login(convexUser.userId, convexUser.username);
          setStatusMessage("Authentication successful, redirecting...");
          
          // Redirect to the home page with a slight delay to ensure state updates
          setTimeout(() => navigate("/"), 1000);
        } else if (userIsLoaded && !isSignedIn) {
          // User loaded but not signed in
          console.log("User data loaded but not signed in");
          throw new Error("OAuth authentication failed - Not signed in after loading user data");
        }
      } catch (error) {
        console.error("Error in OAuth callback:", error);
        setError("Authentication failed. Please try again.");
        setStatusMessage("Authentication error, redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      } finally {
        setIsProcessing(false);
      }
    }

    handleOAuthCallback();
  }, [isSignedIn, user, userIsLoaded, login, getUserFromClerk, navigate, clerk, isAuthenticated]);

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        flexDirection: 'column' 
      }}>
        <h2>Authentication Error</h2>
        <p>{error}</p>
        <p>Redirecting you back to login...</p>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      flexDirection: 'column' 
    }}>
      <h2>Completing login...</h2>
      <p>{statusMessage}</p>
    </div>
  );
} 