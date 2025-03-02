import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./Login.module.css";
import workoutImage from "../../assets/images/workoutmate.webp";
import { useSignIn } from "@clerk/clerk-react";

interface LoginProps {
  isRegistering: boolean;
}

export function Login({ isRegistering }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const { signIn, isLoaded: clerkLoaded } = useSignIn();
  
  const loginMutation = useMutation(api.auth.login);
  const register = useMutation(api.auth.register);
  const getUserFromClerk = useMutation(api.auth.getUserFromClerk);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    
    setError("");
    
    try {
      let user;
      if (isRegistering) {
        user = await register({ username: username.trim(), password: password.trim() });
      } else {
        user = await loginMutation({ username: username.trim(), password: password.trim() });
      }
      authLogin(user.userId, user.username);
    } catch (error) {
      console.error("Authentication failed:", error);
      let errorMessage = "Authentication failed";
      if (error instanceof Error) {
        const errorText = error.message;
        const userMessageMatch = errorText.match(/Error:\s*(.*?)(?:\s+at\s+|$)/);
        if (userMessageMatch && userMessageMatch[1]) {
          errorMessage = userMessageMatch[1];
        }
      }
      setError(errorMessage);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      if (!clerkLoaded || !signIn) return;
      
      // Start Google OAuth flow
      const result = await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/oauth-callback",
        redirectUrlComplete: "/",
      });
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setError("Google sign-in failed. Please try again.");
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginWrapper}>
        <div className={styles.loginCard}>
          <h1>Workoutmate</h1>
          <h2>{isRegistering ? "Create Account" : "Sign In"}</h2>
          {error && <div className={styles.errorMessage}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className={styles.inputGroup}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={!username.trim() || !password.trim()}
              className={styles.loginButton}
            >
              {isRegistering ? "Register" : "Sign In"}
            </button>
          </form>
          
          {/* Google Sign-In Button */}
          <div className={styles.divider}>
            <span>OR</span>
          </div>
          
          <button 
            onClick={handleGoogleSignIn}
            className={`${styles.loginButton} ${styles.googleButton}`}
            disabled={!clerkLoaded}
          >
            Continue with Google
          </button>
          
          <div className={styles.toggleForm}>
            <button 
              onClick={() => navigate(isRegistering ? "/login" : "/register")} 
              className={styles.linkButton}
            >
              {isRegistering 
                ? "Already have an account? Sign In" 
                : "Don't have an account? Register"}
            </button>
          </div>
        </div>
        <div className={styles.imageContainer}>
          <img src={workoutImage} alt="Workout illustration" className={styles.workoutImage} />
        </div>
      </div>
    </div>
  );
} 