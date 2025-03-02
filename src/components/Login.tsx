import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface LoginProps {
  onLogin: (userId: string, username: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  
  const login = useMutation(api.auth.login);
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
        user = await login({ username: username.trim(), password: password.trim() });
      }
      onLogin(user.userId, user.username);
    } catch (error) {
      console.error("Authentication failed:", error);
      setError(error instanceof Error ? error.message : "Authentication failed");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>{isRegistering ? "Create Account" : "Sign In"}</h1>
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
          <button onClick={() => setIsRegistering(!isRegistering)} className="link-button">
            {isRegistering 
              ? "Already have an account? Sign In" 
              : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
} 