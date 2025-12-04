import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = req.body.prompt;

    const result = await model.generateContent(prompt);

    res.status(200).json({ output: result.response.text() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
