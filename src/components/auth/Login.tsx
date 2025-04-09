import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import workoutImage from "../../assets/images/workoutmate.webp";
import { useSignIn, useClerk, useUser, SignIn, SignUp } from "@clerk/clerk-react"; 

interface LoginProps {
  isRegistering: boolean;
}

export function Login({ isRegistering }: LoginProps) {
  const [isProcessingGoogle, setIsProcessingGoogle] = useState(false);
  const navigate = useNavigate();
  const { signIn, isLoaded: clerkLoaded } = useSignIn();
  const clerk = useClerk();
  const { isSignedIn } = useUser();

  const handleGoogleSignIn = async () => {
    try {
      if (!clerkLoaded || !signIn) {
        console.error("Clerk not ready for Google Sign-In");
        return;
      }
      
      setIsProcessingGoogle(true);
      console.log("Starting Google sign-in process");
      
      if (clerk.session) {
        console.log("Clearing existing session");
        await clerk.signOut();
      }
      
      console.log("Redirecting to Google OAuth");
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: window.location.origin + "/oauth-callback",
        redirectUrlComplete: window.location.origin + "/", // Redirect to home after completion
      });
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setIsProcessingGoogle(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginWrapper}>
        <div className={styles.loginCard}>
          <h1>Workoutmate</h1>
          
          {isRegistering ? (
            <SignUp 
              path="/register" 
              routing="path" 
              signInUrl="/login" // URL to navigate to for sign-in
              forceRedirectUrl="/" // Redirect after successful sign-up
            />
          ) : (
            <SignIn 
              path="/login" 
              routing="path" 
              signUpUrl="/register" // URL to navigate to for sign-up
              forceRedirectUrl="/" // Redirect after successful sign-in
            />
          )}

          {/* <div className={styles.divider}> 
            <span>OR</span>
          </div>
          
          <button 
            onClick={handleGoogleSignIn}
            className={`${styles.loginButton} ${styles.googleButton}`}
            disabled={!clerkLoaded || isProcessingGoogle}
          >
            {isProcessingGoogle ? "Processing..." : "Continue with Google"}
          </button> */}
        </div>
        <div className={styles.imageContainer}>
          <img src={workoutImage} alt="Workout illustration" className={styles.workoutImage} />
        </div>
      </div>
    </div>
  );
}