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
  const { isSignedIn, isLoaded: clerkLoaded, user } = useUser();

  // Consider both local auth and Clerk auth for determining authenticated state
  const isAuthenticated = (!!userId && !!username) || (clerkLoaded && isSignedIn);

  // Listen for Clerk authentication changes
  useEffect(() => {
    const checkClerkAuth = async () => {
      // Only proceed if Clerk is loaded
      if (!clerkLoaded) return;
      
      console.log("Clerk auth state:", { isSignedIn, clerkLoaded });
      
      // If signed in with Clerk
      if (isSignedIn && user) {
        // First check if we already have local auth data
        const storedUserId = localStorage.getItem("userId");
        const storedUsername = localStorage.getItem("username");

        // Derive potential new values from Clerk
        const clerkUserId = user.id;
        const clerkUsername = user.username || 
                              (user.firstName && user.lastName ? 
                                `${user.firstName} ${user.lastName}` : 
                                user.emailAddresses?.[0]?.emailAddress || 'user');
        
        // Check if local storage exists AND matches current state. If not, update state from local storage.
        if (storedUserId && storedUsername && (storedUserId !== userId || storedUsername !== username)) {
          console.log("Restoring/updating local auth state from storage");
          setUserId(storedUserId);
          setUsername(storedUsername);
        }
        // If no local storage OR Clerk data is different from current state, update from Clerk.
        else if (!storedUserId || !storedUsername || clerkUserId !== userId || clerkUsername !== username) {
          console.log("Using Clerk user information to update state");
          localStorage.setItem("userId", clerkUserId);
          localStorage.setItem("username", clerkUsername);
          // Only update state if it's actually different
          if (clerkUserId !== userId) setUserId(clerkUserId);
          if (clerkUsername !== username) setUsername(clerkUsername);
        }
        // If Clerk is signed in but state already matches, do nothing
        
      } else if (!isSignedIn && (userId || username)) {
          // Handle case where Clerk signs out but local state still exists (optional)
          // The logout function already handles clearing state, so maybe just log here.
          console.log("Clerk signed out, local state might still exist.");
      }
    };
    
    checkClerkAuth();
  }, [isSignedIn, clerkLoaded, user]);

  const login = (newUserId: string, newUsername: string) => {
    console.log("Login called with", { newUserId, newUsername });
    localStorage.setItem("userId", newUserId);
    localStorage.setItem("username", newUsername);
    setUserId(newUserId);
    setUsername(newUsername);
    navigate("/");
  };

  const logout = async () => {
    // sign out from Clerk if there's an active session
    try {
      if (clerk.session) {
        await clerk.signOut();
      }
    } catch (error) {
      console.error("Error signing out from Clerk:", error);
    }
    
    // Clear local auth state
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