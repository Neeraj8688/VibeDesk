import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MoodType, AiAnalysisResult } from '../types';

// Helper to safely get env vars
const getEnv = (key: string) => {
  try {
    // @ts-ignore
    return (typeof process !== 'undefined' && process.env) ? process.env[key] : undefined;
  } catch (e) {
    return undefined;
  }
};

const getStoredKey = () => {
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vibe_gemini_key');
    }
  } catch (e) {}
  return null;
};

// Priority: Env Var -> LocalStorage (Setup Wizard) -> Placeholder
const API_KEY = getEnv('API_KEY') || getStoredKey() || "PASTE_YOUR_GEMINI_API_KEY_HERE";

export const isGeminiConfigured = () => {
  return !API_KEY.includes("PASTE_");
};

const ai = new GoogleGenAI({ apiKey: API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    mood: {
      type: Type.STRING,
      enum: Object.values(MoodType),
      description: "The detected mood from the input."
    },
    focusScore: {
      type: Type.INTEGER,
      description: "Calculated focus score (0-100). If user mentions deadlines/exams, score should be higher to encourage work.",
    },
    reasoning: {
      type: Type.STRING,
      description: "A short observation of what was seen or heard. E.g., 'I see a cluttered desk', 'Your voice sounds rushed', 'You are smiling'."
    },
    suggestedTasks: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "2 specific, student-focused actions. Examples: 'Review Chapter 4 notes', 'Clear desk for study', '10 mins flashcards'."
    },
    shortSummary: {
      type: Type.STRING,
      description: "A 1-sentence supportive observation."
    }
  },
  required: ["mood", "focusScore", "reasoning", "suggestedTasks", "shortSummary"]
};

export const analyzeInput = async (
  input: string | { mimeType: string; data: string },
  inputType: 'text' | 'image' | 'audio'
): Promise<AiAnalysisResult> => {
  try {
    if (API_KEY.includes("PASTE_")) {
      return {
        mood: MoodType.NEUTRAL,
        focusScore: 50,
        reasoning: "API Key missing.",
        suggestedTasks: ["Configure API Key"],
        shortSummary: "Please complete setup."
      };
    }

    let contents;
    let promptText = "";
    
    // Student/Productivity Focused System Instruction
    const systemInstruction = `
      You are VibeDesk, an AI Study Companion for students and professionals.
      
      MOOD DETECTION GUIDE (Choose ONE):
      - **Happy**: Positive, energetic, excited, optimistic, successful
      - **Sad**: Disappointed, down, melancholic, lonely, unmotivated
      - **Stressed**: Overwhelmed, anxious, rushed, tight deadlines, panic
      - **Angry**: Frustrated, irritated, annoyed, confrontational, upset
      - **Tired**: Exhausted, low energy, sleepy, burned out, drained
      - **Neutral**: Calm, balanced, focused, steady, no strong emotion
      
      RULES:
      1. **Context**: The user is likely a student or worker trying to get things done.
      2. **Mood Detection**: Analyze their input (text, voice tone, face/room in image) and pick the BEST matching mood from the list above.
         - Multiple moods possible? Pick the PRIMARY one.
         - Example: Stressed about exams → STRESSED (not TIRED, not ANXIOUS)
         - Example: Exhausted from studying → TIRED (not SAD)
         - Example: Frustrated with coding → ANGRY (not STRESSED)
      3. **Actionable Tasks**: Suggestions must be ACADEMIC or PRODUCTIVITY micro-habits.
         - Bad: "Relax", "Be happy".
         - Good: "Outline essay intro", "Do 3 math problems", "Organize citation list", "Refill water bottle".
      4. **Tone**: Encouraging, disciplined, but empathetic.
    `;

    if (inputType === 'text') {
      promptText = `${systemInstruction} \n\nStudent Check-in: "${input}"`;
      contents = promptText;
    } else if (inputType === 'image') {
      const media = input as { mimeType: string; data: string };
      // Explicitly ask for visual description for the hackathon demo factor
      promptText = `${systemInstruction} \n\nAnalyze this image. If it's a face, read the expression. If it's a room, look for clutter or organization. In the 'reasoning' field, explicitly state what you see (e.g. 'I see a messy desk').`;
      contents = {
        parts: [
          { inlineData: media },
          { text: promptText }
        ]
      };
    } else if (inputType === 'audio') {
      const media = input as { mimeType: string; data: string };
      // Explicitly ask for audio description
      promptText = `${systemInstruction} \n\nAnalyze the voice tone, speed, and background noise. In the 'reasoning' field, explicitly describe the voice (e.g. 'You sound out of breath', 'Calm voice detected').`;
      contents = {
        parts: [
          { inlineData: media },
          { text: promptText }
        ]
      };
    }

    // Use gemini-2.5-flash for all modalities
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents as any,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      }
    });

    let jsonString = response.text || "{}";
    
    // Cleanup: Remove markdown code blocks if present (e.g. ```json ... ```)
    jsonString = jsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");

    let result: any;
    try {
        result = JSON.parse(jsonString);
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError, "Raw Text:", jsonString);
        throw new Error("Failed to parse AI response.");
    }

    return result as AiAnalysisResult;
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    
    // Check for rate limit (429) or quota exceeded errors
    const isRateLimited = error?.status === 'RESOURCE_EXHAUSTED' || 
                         error?.message?.includes('quota') || 
                         error?.message?.includes('429');
    
    const retryAfter = error?.details?.[0]?.retryDelay?.match(/(\d+)/)?.[1] || "60";
    
    if (isRateLimited) {
      return {
        mood: MoodType.NEUTRAL,
        focusScore: 50,
        reasoning: "API quota reached for today.",
        suggestedTasks: [`Wait ${retryAfter}s`, "Upgrade plan"],
        shortSummary: `📊 Daily limit reached. Please retry in ${retryAfter} seconds or upgrade to a paid Gemini API plan.`
      };
    }
    
    return {
      mood: MoodType.NEUTRAL,
      focusScore: 60,
      reasoning: "Analysis failed due to a technical error.",
      suggestedTasks: ["Check connection", "Retry"],
      shortSummary: `⚠️ Error: ${error?.message?.substring(0, 50) || 'Try again shortly.'}`
    };
  }
};

const adviceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    insight: { type: Type.STRING, description: "One short, punchy sentence about the user's current vibe." },
    tips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 very short bullet points (max 5 words each)." }
  },
  required: ["insight", "tips"]
};

export const getCoachAdvice = async (
  mood: string,
  tasks: string[],
  question?: string
): Promise<{ insight: string; tips: string[] }> => {
  try {
    const prompt = `
      User Mood: ${mood}
      Pending Tasks: ${tasks.join(", ")}
      User Question: ${question || "None"}
      
      Act as "VibeCoach". 
      1. If the user asked a question, answer it directly in the 'insight'.
      2. If no question, give a mood-based productivity insight.
      3. Provide 3 micro-tips to get moving.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: adviceSchema,
      }
    });

    return JSON.parse(response.text || '{"insight": "Stay focused.", "tips": []}');
  } catch (e) {
    console.error("Advice Error", e);
    // Fallback logic
    return {
      insight: mood === 'Happy' ? "Great energy, use it now!" : "Take it slow, step by step.",
      tips: ["Drink water", "Deep breath", "Pick 1 task"]
    };
  }
};