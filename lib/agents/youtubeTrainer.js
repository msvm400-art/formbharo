/**
 * lib/agents/youtubeTrainer.js
 * 
 * 🎓 YOUTUBE FORM FILLING TRAINER AGENT
 * This script extracts the transcript from a YouTube tutorial video,
 * uses Gemini to identify the exam name and step-by-step form filling
 * pitfalls/rules, and saves them to the knowledge base.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { YoutubeTranscript } from "youtube-transcript";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), "lib", "agents", "formKnowledgeBase.json");

const TRAINING_PROMPT = `
You are an expert at analyzing step-by-step tutorial videos on how to fill Indian Government Job forms.
I am providing you with the exact transcript from a YouTube video detailing how to fill a specific exam form.

Your task is to extract:
1. The exact name or abbreviation of the Exam/Organization (e.g., "SSC CHSL", "UPSC Civil Services", "RRB ALP").
2. A list of specific "gotchas", rules, warnings, or field mapping instructions mentioned by the creator.
   (e.g., "Under mother's name, do not use Mrs.", "Photo must have a white background and date printed", "Category certificate must be uploaded in PDF format under 100KB", "For 10th board, select 'UP Board' exact spelling").

Return ONLY a JSON object:
{
  "exam_identifier": "Main Exam/Form identifier (short abbreviation)",
  "exam_keywords": ["aliases", "full names", "other spellings"],
  "filling_rules": [
    "Rule 1 extracted from video",
    "Rule 2 extracted from video"
  ],
  "photo_signature_rules": "Summary of photo/signature requirements",
  "document_rules": "Summary of document upload requirements"
}`;

/**
 * Train the agent using a YouTube video URL
 * @param {string} youtubeUrl
 * @returns {Promise<object>} Status and saved rules
 */
export async function trainFromYoutube(youtubeUrl) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is missing.");

  // 1. Fetch Transcript
  console.log(`fetching transcript for: ${youtubeUrl}...`);
  let transcriptItems = [];
  try {
    transcriptItems = await YoutubeTranscript.fetchTranscript(youtubeUrl);
  } catch (err) {
    throw new Error(`Failed to fetch YouTube transcript. Ensure the video has captions enabled. (${err.message})`);
  }

  const fullTranscript = transcriptItems.map((t) => t.text).join(" ");
  console.log(`Fetched transcript (${fullTranscript.split(' ').length} words).`);

  // 2. Query Gemini to distill the rules
  console.log("Analyzing transcript with Gemini AI...");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const finalPrompt = TRAINING_PROMPT + "\n\nVIDEO TRANSCRIPT:\n" + fullTranscript;

  const result = await model.generateContent(finalPrompt);
  const text = result.response.text();

  // Extract JSON from output
  const startIdx = text.indexOf("{");
  const endIdx = text.lastIndexOf("}");
  if (startIdx === -1 || endIdx === -1) {
    throw new Error("AI did not return valid JSON rules.");
  }
  
  const extractedRules = JSON.parse(text.substring(startIdx, endIdx + 1));

  if (!extractedRules.exam_identifier) {
    throw new Error("AI failed to identify an exam name from this video.");
  }

  // 3. Save to Knowledge Base
  console.log(`Saving training data for ${extractedRules.exam_identifier}...`);
  let kb = {};
  try {
    const fileContent = await fs.readFile(KNOWLEDGE_BASE_PATH, "utf-8");
    kb = JSON.parse(fileContent);
  } catch (e) {
    // fine if doesn't exist or is empty
  }

  // Group under exam identifier
  const id = extractedRules.exam_identifier.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  
  // Merge if exists
  if (kb[id]) {
    kb[id].exam_keywords = [...new Set([...(kb[id].exam_keywords || []), ...extractedRules.exam_keywords])];
    kb[id].filling_rules = [...new Set([...(kb[id].filling_rules || []), ...extractedRules.filling_rules])];
    kb[id].photo_signature_rules = extractedRules.photo_signature_rules || kb[id].photo_signature_rules;
    kb[id].document_rules = extractedRules.document_rules || kb[id].document_rules;
  } else {
    kb[id] = extractedRules;
  }

  await fs.writeFile(KNOWLEDGE_BASE_PATH, JSON.stringify(kb, null, 2), "utf-8");
  console.log("Knowledge base updated successfully!");

  return {
    success: true,
    exam: id,
    rulesAdded: extractedRules.filling_rules.length
  };
}

// Allow running from CLI directly: node lib/agents/youtubeTrainer.js "https://youtube.com/watch?v=..."
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && (
  process.argv[1] === __filename || 
  path.resolve(process.argv[1]) === path.resolve(__filename)
);

if (isMain) {
  const url = process.argv[2];
  if (url) {
    trainFromYoutube(url)
      .then(res => console.log(res))
      .catch(console.error);
  }
}
