import { createContext, useContext, useState, useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex';

// Create a simple auth context to replace Clerk
interface SimpleAuthUser {
  id: string;
  username: string;
  isSignedIn: boolean;
  firstName?: string;
  lastName?: string;
  emailAddresses: { emailAddress: string }[];
}

interface SimpleAuthContext {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: SimpleAuthUser | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

// Create default context
const defaultContext: SimpleAuthContext = {
  isLoaded: false,
  isSignedIn: false,
  user: null,
  signIn: async () => {},
  signOut: () => {},
};

// Create the context
const SimpleAuthContext = createContext<SimpleAuthContext>(defaultContext);

// Provider component
export function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<{
    isLoaded: boolean;
    isSignedIn: boolean;
    user: SimpleAuthUser | null;
  }>({
    isLoaded: false,
    isSignedIn: false,
    user: null,
  });

  // Check local storage for saved user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('workoutmate_user');
    
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setAuthState({
          isLoaded: true,
          isSignedIn: true,
          user,
        });
      } catch (e) {
        console.error('Failed to parse saved user', e);
        setAuthState({
          isLoaded: true,
          isSignedIn: false,
          user: null,
        });
      }
    } else {
      setAuthState({
        isLoaded: true,
        isSignedIn: false,
        user: null,
      });
    }
  }, []);

  // Create auto-sign in function
  const signIn = async (username: string, password: string) => {
    // Create a simple user object
    const user: SimpleAuthUser = {
      id: 'local-user-' + Date.now(),
      username: username || 'user',
      isSignedIn: true,
      firstName: username || 'Local',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'localuser@example.com' }],
    };

    // Save to local storage
    localStorage.setItem('workoutmate_user', JSON.stringify(user));

    // Update state
    setAuthState({
      isLoaded: true,
      isSignedIn: true,
      user,
    });
  };

  // Sign out function
  const signOut = () => {
    localStorage.removeItem('workoutmate_user');
    setAuthState({
      isLoaded: true,
      isSignedIn: false,
      user: null,
    });
  };

  return (
    <SimpleAuthContext.Provider
      value={{
        ...authState,
        signIn,
        signOut,
      }}
    >
      {children}
    </SimpleAuthContext.Provider>
  );
}

// Hook to use the auth context
export function useSimpleAuth() {
  return useContext(SimpleAuthContext);
}

// Auto-login component for development
export function AutoLogin() {
  const { isSignedIn, signIn } = useSimpleAuth();
  
  useEffect(() => {
    if (!isSignedIn) {
      // Auto sign in with a default user
      signIn('WorkoutMate User', 'password');
    }
  }, [isSignedIn, signIn]);
  
  return null;
}
