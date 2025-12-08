

// // balendra3316/community-backend/community-backend-0873ebfa55c9ccb3ef429dc3514f9519cb915f4c/src/prepare-knowledge.ts

// import fs from 'fs';
// import path from 'path';
// // FIX: Use the correct client and type names for the @google/genai SDK
// import { GoogleGenAI } from "@google/genai"; 
// import mongoose, { Schema, model, Document } from 'mongoose';

// // --- 0. Helper Function to Normalize Vector ---
// // CRITICAL FIX: L2-Normalizes the vector, matching the technique used by LlamaIndex/OpenAI.
// function normalizeVector(vector: number[]): number[] {
//     const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
//     return norm === 0 ? vector : vector.map(val => val / norm);
// }

// // --- 1. Define the structure of our knowledge documents (Unchanged) ---
// interface IKnowledge extends Document {
//   text: string;
//   embedding: number[];
// }

// const KnowledgeSchema: Schema = new Schema({
//   text: { type: String, required: true },
//   embedding: { type: [Number], required: true },
// });

// const Knowledge = mongoose.models.ChatbotKnowledge || model<IKnowledge>('ChatbotKnowledge', KnowledgeSchema);


// // --- 2. The main function to be exported (FIXED) ---
// export const processAndStoreKnowledge = async (): Promise<void> => {
//   console.log("🚀 Starting knowledge processing script...");

//   try {
//     // CRITICAL: We need to clear the collection to ensure all data is indexed with the new Gemini model settings.
//     await Knowledge.deleteMany({}); 
//     console.log("🧹 Cleared existing knowledge base data for re-indexing.");

//     // Check if the collection already has data (should be 0 after wipe)
//     const existingDocs = await Knowledge.countDocuments();
//     if (existingDocs > 0) {
//       console.log("❌ Failed to clear knowledge base. Aborting.");
//       return;
//     }
    
//     console.log("📚 Starting data ingestion with Gemini embeddings...");

//     // Get key from environment
//     const GEMINI_API_KEY = process.env.GEMINI_API_KEY_SECOND
// ;
//     if (!GEMINI_API_KEY) {
//         console.error("❌ GEMINI_AI_KEY is not set. Cannot run RAG initialization.");
//         return;
//     }
    
//     // Initialize Gemini client
//     const ai = new GoogleGenAI(GEMINI_API_KEY);
//     const EMBEDDING_MODEL = 'gemini-embedding-001'; 
//     const OUTPUT_DIMENSION = 1536; // MUST match the MongoDB index size

//     // Read your text file
//     const dataPath = path.join(__dirname, './data/business-data.txt'); 
//     const text = fs.readFileSync(dataPath, 'utf8');
//     console.log("📄 Read the text file.");

//     // Split the text into smaller, manageable chunks
//     const chunks = chunkText(text);
//     console.log(`🧩 Split text into ${chunks.length} chunks.`);

//     // Process each chunk
//     for (let i = 0; i < chunks.length; i++) {
//       const chunk = chunks[i];
      
//       const embeddingResponse = await ai.models.embedContent({
//         model: EMBEDDING_MODEL,
//         contents: chunk,
//         config: {
//             outputDimensionality: OUTPUT_DIMENSION, // Force 1536 dimensions
//         }
//       });
      
//       const rawEmbedding = embeddingResponse.embeddings[0].values; 
      
//       // CRITICAL FIX: Normalize the vector before saving to DB
//       const normalizedEmbedding = normalizeVector(rawEmbedding); 

//       // Save the chunk and its vector using the Mongoose model
//       await new Knowledge({
//         text: chunk,
//         embedding: normalizedEmbedding,
//       }).save();
      
//       process.stdout.write(`...Processed and saved chunk ${i + 1} of ${chunks.length}\r`);
//     }

//    console.log("\n✅ Successfully stored all text chunks in the database!");

//   } catch (error) {
//     console.error("❌ An error occurred during knowledge processing:", error);
//     // We don't exit the process, to allow the main server to continue running
//   }
// };


// // --- 3. Helper function (Unchanged) ---
// function chunkText(text: string): string[] {
//   const CHUNK_SIZE = 500;
//   const CHUNK_OVERLAP = 100;
//   const chunks: string[] = [];
//   for (let i = 0; i < text.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
//     chunks.push(text.substring(i, i + CHUNK_OVERLAP));
//   }
//   return chunks;
// }