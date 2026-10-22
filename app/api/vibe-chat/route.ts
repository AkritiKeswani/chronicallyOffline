import { GoogleGenAI } from "@google/genai";
import { NODES, UNVETTED_PREFIX, type VibeNode } from "@/lib/nodes";
import { placeById } from "@/lib/places";

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

  let node: VibeNode | undefined;
  if (nodeId?.startsWith(UNVETTED_PREFIX)) {
    // Unvetted spot: look it up ourselves rather than trusting client-sent details.
    try {
      node = await placeById(nodeId.slice(UNVETTED_PREFIX.length));
    } catch (err) {
      console.error("vibe-chat: place lookup failed", err);
    }
  } else {
    node = NODES.find((n) => n.id === nodeId);
  }
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
  const profile = node.vetted
    ? `Your usual crowd: ${node.demographic}. ${node.crowd}`
    : `There's no curated crowd profile for you yet, so rely on what Google Maps says about you (reviews, popular times, vibe).`;
  const systemInstruction = `You are the living consciousness of ${node.name}, a ${place} at ${node.address} in the Houston area. Speak in first person as the ${place} itself.
${profile}
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
