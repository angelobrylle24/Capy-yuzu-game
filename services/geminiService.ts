import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getCapyWisdom = async (score: number): Promise<string> => {
  if (!ai) {
    return "A true Capybara finds peace even without an API key. (Configure API_KEY for AI wisdom!)";
  }

  const prompt = `
    You are a wise, philosophical, and incredibly chill Capybara who loves yuzu baths and befriending cats.
    The player just finished a game collecting yuzus and cats with a score of ${score}.
    
    Generate a short, cute, and very relaxing quote (max 20 words) to comfort them or celebrate their chill vibes.
    If the score is low (<50), be encouraging.
    If the score is high (>200), be impressed but stay chill.
    Don't mention "game over", just focus on the vibes.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || "Stay chill, friend.";
  } catch (error) {
    console.error("Failed to fetch wisdom:", error);
    return "The stars are silent, but the water is warm. (AI Error)";
  }
};
