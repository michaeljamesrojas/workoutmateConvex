import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";

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
  const clerk = useClerk();
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();
  
  // Consider both local auth and Clerk auth for determining authenticated state
  const isAuthenticated = (!!userId && !!username) || (clerkLoaded && isSignedIn);

  // Listen for Clerk authentication changes
  useEffect(() => {
    const checkClerkAuth = async () => {
      // Only proceed if Clerk is loaded
      if (!clerkLoaded) return;
      
      console.log("Clerk auth state:", { isSignedIn, clerkLoaded });
      
      // If signed in with Clerk but not in local state, check for user in localStorage
      if (isSignedIn && (!userId || !username)) {
        const storedUserId = localStorage.getItem("userId");
        const storedUsername = localStorage.getItem("username");
        
        if (storedUserId && storedUsername) {
          console.log("Restoring local auth state from storage");
          setUserId(storedUserId);
          setUsername(storedUsername);
        }
      }
    };
    
    checkClerkAuth();
  }, [isSignedIn, clerkLoaded, userId, username]);

  const login = (newUserId: string, newUsername: string) => {
    console.log("Login called with", { newUserId, newUsername });
    localStorage.setItem("userId", newUserId);
    localStorage.setItem("username", newUsername);
    setUserId(newUserId);
    setUsername(newUsername);
    navigate("/");
  };

  const logout = async () => {
    // Clear local auth state
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    setUserId(null);
    setUsername(null);
    
    // Also sign out from Clerk if there's an active session
    try {
      if (clerk.session) {
        await clerk.signOut();
      }
    } catch (error) {
      console.error("Error signing out from Clerk:", error);
    }
    
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