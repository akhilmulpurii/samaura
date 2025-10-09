"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getServerUrl } from "@/app/actions";
import { ServerSetup } from "@/components/server-setup";
import { LoginForm } from "@/components/login-form";

type OnboardingStep = "server" | "login";

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("server");
  const router = useRouter();

  console.log("OnboardingFlow rendered, currentStep:", currentStep);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const authenticated = await isAuthenticated();
      const serverUrl = await getServerUrl();

      console.log("Auth status:", { authenticated, serverUrl });

      // Check if user is already authenticated
      if (authenticated && serverUrl) {
        router.replace("/");
        return;
      } else if (serverUrl && !authenticated) {
        setCurrentStep("login");
      } else {
        setCurrentStep("server");
      }
    };

    checkAuthStatus();
  }, [router]);

  const handleServerSetup = () => {
    setCurrentStep("login");
  };

  const handleLoginSuccess = () => {
    router.replace("/");
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
