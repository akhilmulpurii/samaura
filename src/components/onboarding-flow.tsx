import React, { useState, useEffect } from "react";
import { isAuthenticated, getServerUrl } from "../actions";
import { ServerSetup } from "../components/server-setup";
import { LoginForm } from "../components/login-form";
import { useNavigate } from "react-router-dom";

type OnboardingStep = "server" | "login";

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("server");
  const navigate = useNavigate();

  console.log("OnboardingFlow rendered, currentStep:", currentStep);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const authenticated = await isAuthenticated();
      const serverUrl = await getServerUrl();

      console.log("Auth status:", { authenticated, serverUrl });

      // Check if user is already authenticated
      if (authenticated && serverUrl) {
        navigate("/");
        return;
      } else if (serverUrl && !authenticated) {
        setCurrentStep("login");
      } else {
        setCurrentStep("server");
      }
    };

    checkAuthStatus();
  }, [navigate]);

  const handleServerSetup = () => {
    setCurrentStep("login");
  };

  const handleLoginSuccess = () => {
    navigate("/", { replace: true });
  };

  const handleBackToServer = () => {
    setCurrentStep("server");
  };

  if (currentStep === "server") {
    return <ServerSetup onNext={handleServerSetup} />;
  }

  if (currentStep === "login") {
    return (
      <LoginForm onSuccess={handleLoginSuccess} onBack={handleBackToServer} />
    );
  }

  return <ServerSetup onNext={handleServerSetup} />;
}
