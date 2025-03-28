import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { AuthProvider } from "./contexts/AuthContext";
import { ClerkProvider } from "@clerk/clerk-react";
import { Toaster } from "react-hot-toast";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider 
      publishableKey={clerkPubKey}
      afterSignInUrl="/oauth-callback"
      afterSignUpUrl="/oauth-callback"
      signInUrl="/login"
      signUpUrl="/register"
    >
      <ConvexProvider client={convex}>
        <BrowserRouter>
          <AuthProvider>
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#333',
                  color: '#fff',
                },
                success: {
                  style: {
                    background: '#10b981',
                  },
                },
                error: {
                  style: {
                    background: '#ef4444',
                  },
                },
              }}
            />
            <Routes>
              <Route path="/*" element={<App />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ConvexProvider>
    </ClerkProvider>
  </StrictMode>,
);
