export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { system, messages } = req.body;

    // Convert messages to Gemini format
    const geminiMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: geminiMessages,
          generationConfig: { maxOutputTokens: 4000, temperature: 0.7 },
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Gemini error" });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.status(200).json({ content: [{ text }] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
