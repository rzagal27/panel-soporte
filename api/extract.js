export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // Read raw body as buffer
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    
    // Parse multipart manually to get the file
    const boundary = req.headers["content-type"].split("boundary=")[1];
    const bodyStr = buffer.toString("latin1");
    const parts = bodyStr.split("--" + boundary);
    
    let fileBuffer = null;
    let mimeType = "application/pdf";
    
    for (const part of parts) {
      if (part.includes("Content-Disposition") && part.includes("filename")) {
        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd === -1) continue;
        
        const headers = part.substring(0, headerEnd);
        if (headers.includes("application/pdf")) mimeType = "application/pdf";
        else if (headers.includes("wordprocessingml")) mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        
        const fileContent = part.substring(headerEnd + 4, part.lastIndexOf("\r\n"));
        fileBuffer = Buffer.from(fileContent, "latin1");
        break;
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: "No file found" });

    const base64File = fileBuffer.toString("base64");

    // Upload to Gemini Files API
    const uploadResponse = await fetch(
      "https://generativelanguage.googleapis.com/upload/v1beta/files?key=" + process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": mimeType,
          "X-Goog-Upload-Command": "upload, finalize",
          "X-Goog-Upload-Header-Content-Length": fileBuffer.length,
          "X-Goog-Upload-Header-Content-Type": mimeType,
        },
        body: fileBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const err = await uploadResponse.text();
      throw new Error("Upload failed: " + err);
    }

    const uploadData = await uploadResponse.json();
    const fileUri = uploadData.file?.uri;
    if (!fileUri) throw new Error("No file URI returned");

    // Extract text using Gemini
    const extractResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { file_data: { mime_type: mimeType, file_uri: fileUri } },
              { text: "Extrae todo el texto de este documento de especificaciones técnicas manteniendo la estructura. Devuelve solo el texto sin comentarios adicionales." }
            ]
          }],
          generationConfig: { maxOutputTokens: 8000 }
        }),
      }
    );

    const extractData = await extractResponse.json();
    const text = extractData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    return res.status(200).json({ text });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
