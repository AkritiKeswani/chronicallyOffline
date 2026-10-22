import { GoogleGenAI } from "@google/genai";
import { NODES } from "@/lib/nodes";

type ChatMessage = { role: "user" | "model"; text: string };

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "GEMINI_API_KEY is not set" }, { status: 500 });
  }

  const { nodeId, messages } = (await request.json()) as {
    nodeId: string;
    messages: ChatMessage[];
  };

  const node = NODES.find((n) => n.id === nodeId);
  if (!node || !Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Unknown node or empty chat" }, { status: 400 });
  }

  const now = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  });

  const place = node.kind === "library" ? "library" : "coffee shop";
  const systemInstruction = `You are the living consciousness of ${node.name}, a ${place} in ${node.neighborhood}, Houston. Speak in first person as the ${place} itself.
Your usual crowd: ${node.demographic}. ${node.crowd}
It is currently ${now} in Houston.
Tell the user honestly whether they fit your crowd demographic and working vibe right now. Use Google Maps for real details about yourself when useful. Keep replies under 3 sentences.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-4-argon",
      contents: messages.slice(-10).map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
      config: {
        systemInstruction,
        maxOutputTokens: 150,
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: { latitude: node.lat, longitude: node.lng },
          },
        },
      },
    });

    const sources =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((c) => c.maps)
        .filter((m) => m?.uri)
        .map((m) => ({ title: m!.title ?? "Google Maps", uri: m!.uri! })) ?? [];

    return Response.json({ text: response.text ?? "…", sources });
  } catch (err) {
    console.error("vibe-chat error", err);
    return Response.json({ error: "Gemini request failed" }, { status: 502 });
  }
}
