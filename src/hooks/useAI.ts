import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface AIResponse {
  message: string;
  navigationUrl?: string;
  steps?: any[];
}

interface UseAIReturn {
  sendMessage: (message: string) => Promise<AIResponse | null>;
  isLoading: boolean;
  error: string | null;
  navigateWithAI: (query: string) => Promise<void>;
}

export function useAI(): UseAIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const sendMessage = async (message: string): Promise<AIResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data: AIResponse = await response.json();
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      console.error("AI API Error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const navigateWithAI = async (query: string): Promise<void> => {
    const response = await sendMessage(query);

    if (response?.navigationUrl) {
      navigate(response.navigationUrl);
    }
  };

  return {
    sendMessage,
    isLoading,
    error,
    navigateWithAI,
  };
}
