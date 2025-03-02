import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  userId: string | null;
  username: string | null;
  login: (userId: string, username: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(localStorage.getItem("userId"));
  const [username, setUsername] = useState<string | null>(localStorage.getItem("username"));
  
  const isAuthenticated = !!userId && !!username;

  const login = (newUserId: string, newUsername: string) => {
    localStorage.setItem("userId", newUserId);
    localStorage.setItem("username", newUsername);
    setUserId(newUserId);
    setUsername(newUsername);
    navigate("/");
  };

  const logout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    setUserId(null);
    setUsername(null);
    navigate("/login");
  };

  // Value to be provided to consumers
  const value = {
    userId,
    username,
    login,
    logout,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for components to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
} 