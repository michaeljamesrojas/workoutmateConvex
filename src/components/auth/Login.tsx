import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface LoginProps {
  isRegistering: boolean;
}

export function Login({ isRegistering }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  
  const loginMutation = useMutation(api.auth.login);
  const register = useMutation(api.auth.register);

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

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Workoutmate</h1>
        <h2>{isRegistering ? "Create Account" : "Sign In"}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
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
          <div className="input-group">
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
            className="login-button"
          >
            {isRegistering ? "Register" : "Sign In"}
          </button>
        </form>
        <div className="toggle-form">
          <button 
            onClick={() => navigate(isRegistering ? "/login" : "/register")} 
            className="link-button"
          >
            {isRegistering 
              ? "Already have an account? Sign In" 
              : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
} 