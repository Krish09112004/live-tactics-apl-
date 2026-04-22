import { GoogleGenAI, Type } from "@google/genai";
import { GameState } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function getInvisibleInsight(state: GameState) {
  const lastOver = state.history.filter(b => b.over === state.score.overs - 1);
  
  const prompt = `
    You are a Live Tactical Graph Engine for IPL.
    Context:
    - Match: ${state.teams.batting} vs ${state.teams.bowling}
    - Score: ${state.score.runs}/${state.score.wickets} in ${state.score.overs} overs
    - Pitch/Conditions: Slow pitch, heavy dew expected.
    - Last Over History: ${JSON.stringify(lastOver)}
    - Matchups: ${state.currentBowler} bowling to ${state.currentPartnership.batsman1}.

    Task: Identify the SINGLE most "invisible" tactical shift from this last over.
    Something a basic commentator would miss. 
    Examples:
    - "Bumrah subtly changed his release point by 10cm to exploit the scuffed patch."
    - "The batsman is intentionally playing late to neutralize the extra bounce on the 4th stump."
    - "Field placement shift: Square leg moved 5 paces deeper after the 3rd ball, anticipating the slog sweep."

    Respond in JSON format:
    {
      "insight": "the insight text",
      "impactScore": 0.85,
      "graphUpdate": "description of how the relationship between player and condition changed"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insight: { type: Type.STRING },
            impactScore: { type: Type.NUMBER },
            graphUpdate: { type: Type.STRING }
          },
          required: ["insight", "impactScore", "graphUpdate"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return { insight: "Complexity threshold exceeded. Tactical shift remains hidden.", impactScore: 0, graphUpdate: "" };
  }
}
