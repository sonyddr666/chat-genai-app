import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
import { Message } from "../types";

const PROVIDED_KEY = 'AIzaSyDQvxhuUJLhdrFaXJyIP12_hApLUF-_kzG8';

// Helper function to safely get environment variables
const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

// Check for GEMINI_API_KEY, VITE_API_KEY, or API_KEY
const apiKey = getEnv('GEMINI_API_KEY') || getEnv('VITE_API_KEY') || getEnv('API_KEY') || PROVIDED_KEY; 

let ai: GoogleGenAI | null = null;

try {
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
  } else {
    console.warn("Gemini API Key is missing.");
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI", error);
}

const MODEL_NAME = 'gemini-3-flash-preview';

export const generateAiResponseStream = async (
  history: Message[],
  prompt: string,
  imageBase64: string | null,
  onChunk: (text: string) => void
): Promise<string> => {
  if (!ai) {
    onChunk("Error: Gemini API Key is missing. Please check your environment variables.");
    return "";
  }

  try {
    // Transform local message history into Gemini Content format
    const contents: Content[] = history.map((msg) => ({
      role: msg.isAiGenerated ? 'model' : 'user',
      parts: [
        { text: msg.content },
        // Note: For simplicity in history, we aren't re-sending old images, 
        // but in a production app, you might want to reference them if supported/stored.
      ]
    }));

    // Prepare current message parts
    const currentParts: any[] = [{ text: prompt }];
    if (imageBase64) {
      currentParts.unshift({
        inlineData: {
          mimeType: 'image/jpeg', // Assuming jpeg for simplicity in this demo
          data: imageBase64
        }
      });
    }

    // Add current message to contents
    contents.push({
      role: 'user',
      parts: currentParts
    });

    const responseStream = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: contents,
      config: {
        systemInstruction: `You are Gemini 3 Flash, an advanced AI integrated into a messaging app. 
        Your capabilities:
        1. Analyze images and text instantly.
        2. Remember context from previous messages in this conversation.
        3. Use MARKDOWN extensively to format your responses. 
           - Use **Bold** for emphasis.
           - Use Lists (bullet points) for readability.
           - Use \`Code Blocks\` for code or JSON data.
           - Use | Tables | for structured data comparison.
        4. If the user asks for data structures, output valid JSON inside a code block.
        5. Be concise but helpful. Treat this conversation as a continuous history with the user.`,
      }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(text);
      }
    }
    return fullText;

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const errorMessage = `Error communicating with Gemini: ${error.message || 'Unknown error'}`;
    onChunk(errorMessage);
    return errorMessage;
  }
};