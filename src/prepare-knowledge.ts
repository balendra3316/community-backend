import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import mongoose, { Schema, model, Document } from 'mongoose';

// --- 1. Define the structure of our knowledge documents ---
interface IKnowledge extends Document {
  text: string;
  embedding: number[];
}

const KnowledgeSchema: Schema = new Schema({
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
});

// Create a Mongoose model. If it already exists, use it.
// Mongoose will create the collection 'chatbot_knowledges' (pluralized)
const Knowledge = mongoose.models.ChatbotKnowledge || model<IKnowledge>('ChatbotKnowledge', KnowledgeSchema);


// --- 2. The main function to be exported ---
export const processAndStoreKnowledge = async (): Promise<void> => {
  console.log("🚀 Starting knowledge processing script...");

  try {
    // Check if the collection already has data
    const existingDocs = await Knowledge.countDocuments();
    if (existingDocs > 0) {
      console.log("✅ Knowledge base already exists. No action needed.");
      return;
    }
    
    console.log("📚 Knowledge base is empty. Starting data ingestion...");

    // Initialize OpenAI client
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Read your text file
    const dataPath = path.join(__dirname, './data/business-data.txt'); // Adjust path if needed
    const text = fs.readFileSync(dataPath, 'utf8');
    console.log("📄 Read the text file.");

    // Split the text into smaller, manageable chunks
    const chunks = chunkText(text);
    console.log(`🧩 Split text into ${chunks.length} chunks.`);

    // Process each chunk
    console.log("⏳ Creating embeddings and storing in database... This may take a while.");
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk,
      });
      const embedding = embeddingResponse.data[0].embedding;

      // Save the chunk and its vector using the Mongoose model
      await new Knowledge({
        text: chunk,
        embedding: embedding,
      }).save();
      
      process.stdout.write(`...Processed and saved chunk ${i + 1} of ${chunks.length}\r`);
    }

    console.log("\n✅ Successfully stored all text chunks in the database!");

  } catch (error) {
    console.error("❌ An error occurred during knowledge processing:", error);
    // We don't exit the process, to allow the main server to continue running
  }
};


// --- 3. Helper function (remains the same) ---
function chunkText(text: string): string[] {
  const CHUNK_SIZE = 500;
  const CHUNK_OVERLAP = 100;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    chunks.push(text.substring(i, i + CHUNK_SIZE));
  }
  return chunks;
}