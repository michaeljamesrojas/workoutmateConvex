import React, { useState } from "react";
import { useMutation, api } from "../../convex";
import { useNavigate } from "react-router-dom";

export default function ConvexSignup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const register = useMutation(api.auth.register);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await register({ username, password });
      // Store user info in localStorage or context as needed
      localStorage.setItem("convexUserId", user.userId);
      localStorage.setItem("convexUsername", user.username);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
      <h2>Convex Signup</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </div>
        {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
          {loading ? "Signing up..." : "Sign Up"}
        </button>
      </form>
      <div style={{ marginTop: 16, textAlign: "center" }}>
        <span>Already have an account? </span>
        <a href="/login2">Login</a>
      </div>
    </div>
  );
}
