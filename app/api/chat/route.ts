import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { openrouter, createOpenRouter } from "@openrouter/ai-sdk-provider";
import { groq, createGroq } from "@ai-sdk/groq";
import { createOllama, ollama } from "ai-sdk-ollama";
import { convertToModelMessages, streamText, stepCountIs } from "ai";
import { createAllTools, createSystemPrompt } from "@/app/tools";
import { cookies } from "next/headers";

async function getAuthData() {
  const cookieStore = await cookies();
  const authData = cookieStore.get("jellyfin-auth");

  if (!authData?.value) {
    throw new Error("Not authenticated");
  }

  const parsed = JSON.parse(authData.value);
  return { serverUrl: parsed.serverUrl, user: parsed.user };
}

export async function POST(req: Request) {
  try {
    await getAuthData();

    const {
      messages,
      currentMedia,
      currentTimestamp,
      aiProvider = "gemini",
      ollamaBaseUrl = "http://localhost:11434",
      ollamaModel = "phi3",
      groqModel = "llama3-8b-8192",
      openrouterModel = "qwen/qwen3-coder:free",
      googleApiKey,
      groqApiKey,
      openrouterApiKey,
    } = await req.json();

    console.log({
      aiProvider,
      ollamaBaseUrl,
      ollamaModel,
      groqModel,
      openrouterModel,
      googleApiKey,
      groqApiKey,
      openrouterApiKey,
    });

    let model;
    switch (aiProvider) {
      case "gemini":
        if (googleApiKey) {
          const googleProvider = createGoogleGenerativeAI({
            apiKey: googleApiKey,
          });
          model = googleProvider("gemini-2.0-flash");
        } else if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
          // Fallback to environment variable
          model = google("gemini-2.0-flash");
        } else {
          throw new Error(
            "Google API key is required for Gemini provider. Please set your API key in settings."
          );
        }
        break;
      case "ollama":
        const ollamaProvider = createOllama({
          baseURL: ollamaBaseUrl,
        });
        model = ollamaProvider(ollamaModel);
        break;
      case "groq":
        if (groqApiKey) {
          const groqProvider = createGroq({
            apiKey: groqApiKey,
          });
          console.log(groqApiKey)
          model = groqProvider(groqModel);
        } else if (process.env.GROQ_API_KEY) {
          model = groq(groqModel);
        } else {
          throw new Error(
            "Groq API key is required for Groq provider. Please set your API key in settings."
          );
        }
        break;
      case "openrouter":
        if (openrouterApiKey) {
          const openrouterProvider = createOpenRouter({
            apiKey: openrouterApiKey,
          });
          model = openrouterProvider(openrouterModel);
        } else if (process.env.OPENROUTER_API_KEY) {
          model = openrouter.chat(openrouterModel);
        } else {
          throw new Error(
            "OpenRouter API key is required for OpenRouter provider. Please set your API key in settings."
          );
        }
        break;
      default:
        if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
          model = google("gemini-2.0-flash");
        } else {
          throw new Error("No API key configured for the selected provider.");
        }
    }

    const result = streamText({
      model,
      messages: convertToModelMessages(messages),
      stopWhen: stepCountIs(10),
      tools: createAllTools(currentMedia, currentTimestamp),
      system: createSystemPrompt(currentMedia, currentTimestamp),
      // onChunk: async (chunk: any) => {
      //   console.log("🪣 [streamText] New chunk received:", chunk);
      // },
      // onFinish: async ({ usage, finishReason, text, toolResults }) => {},
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API Error:", error);

    if (error instanceof Error && error.message === "Not authenticated") {
      return new Response("Unauthorized", { status: 401 });
    }

    return new Response("Internal Server Error", { status: 500 });
  }
}
