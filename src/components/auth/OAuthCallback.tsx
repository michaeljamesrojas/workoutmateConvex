import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function OAuthCallback() {
  const navigate = useNavigate();
  const { isSignedIn, user } = useUser();
  const { login } = useAuth();
  const getUserFromClerk = useMutation(api.auth.getUserFromClerk);
  const { setActive } = useClerk();

  useEffect(() => {
    async function handleOAuthCallback() {
      try {
        if (isSignedIn && user) {
          // Create or get user in Convex
          const convexUser = await getUserFromClerk({
            clerkId: user.id,
            username: user.username || user.emailAddresses[0]?.emailAddress || `user-${user.id}`,
          });

          // Login with AuthContext
          login(convexUser.userId, convexUser.username);
          
          // Set the user as active in Clerk
          await setActive({ session: window.location.href });
          
          // Redirect to the home page
          navigate("/");
        }
      } catch (error) {
        console.error("Error in OAuth callback:", error);
        navigate("/login");
      }
    }

    handleOAuthCallback();
  }, [isSignedIn, user, login, getUserFromClerk, navigate, setActive]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      flexDirection: 'column' 
    }}>
      <h2>Completing login...</h2>
      <p>Please wait while we complete your sign-in process.</p>
    </div>
  );
} 