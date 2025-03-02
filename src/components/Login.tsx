import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface LoginProps {
  onLogin: (userId: string, username: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const login = useMutation(api.auth.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    try {
      const user = await login({ username: username.trim() });
      onLogin(user.userId, user.username);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Welcome to Chat App</h1>
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
          <button 
            type="submit" 
            disabled={!username.trim()}
            className="login-button"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
} 