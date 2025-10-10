import { useEffect } from "react";
import { clearAuthData } from "../actions/media";
import { useNavigate } from "react-router-dom";

interface AuthErrorHandlerProps {
  error?: any;
  children: React.ReactNode;
}

export function AuthErrorHandler({ error, children }: AuthErrorHandlerProps) {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleAuthError() {
      if (error && (error as any).isAuthError) {
        console.log("Handling authentication error, clearing auth data...");
        try {
          await clearAuthData();
        } catch (clearError) {
          console.error("Failed to clear auth data:", clearError);
        }
        // Redirect to login page
        navigate("/auth/login");
      }
    }

    handleAuthError();
  }, [error, navigate]);

  // If it's an auth error, don't render children and show loading state
  if (error && (error as any).isAuthError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Session expired. Redirecting to login...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
