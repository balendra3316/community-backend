

// import OpenAI from 'openai';
// import { Request, Response } from 'express';
// import mongoose, { Schema, model, Document } from 'mongoose';

// // --- 1. Initialize OpenAI Client ---
// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY as string
// });


// // --- 2. Define the Mongoose Model for your Knowledge Base ---
// interface IKnowledge extends Document {
//   text: string;
//   embedding: number[];
// }

// const KnowledgeSchema: Schema = new Schema({
//   text: { type: String, required: true },
//   embedding: { type: [Number], required: true },
// });

// const Knowledge = mongoose.models.ChatbotKnowledge || model<IKnowledge>('ChatbotKnowledge', KnowledgeSchema);


// // --- 3. Interface Definitions ---
// interface ChatRequest extends Request {
//     body: {
//         message: string;
//     };
// }

// interface ApiResponse {
//     success: boolean;
//     response?: string;
//     error?: string;
//     details?: string;
//     timestamp?: string;
// }

// interface HealthCheckResponse { // Kept for the healthCheck function
//     success: boolean;
//     status?: string;
//     config?: {
//         apiKeyConfigured: boolean;
//         businessDataLoaded: boolean;
//         businessDataLength: number;
//     };
//     error?: string;
//     details?: string;
//     timestamp?: string;
// }

// // --- 4. The Corrected sendMessage Controller with RAG Logic ---
// export const sendMessage = async (req: ChatRequest, res: Response<ApiResponse>): Promise<void> => {
//     try {
//         const { message } = req.body;
// console.log("Received message:", message);
//         if (!message || message.trim() === '') {
//             // FIX: Send response, then return.
//             res.status(400).json({ success: false, error: 'Message is required' });
//             return;
//         }
//         if (!process.env.OPENAI_API_KEY) {
//             // FIX: Send response, then return.
//             res.status(500).json({ success: false, error: 'OpenAI API key not configured' });
//             return;
//         }

//         // STEP 1: Create an embedding for the user's question
//         const questionEmbeddingResponse = await openai.embeddings.create({
//             model: 'text-embedding-3-small',
//             input: message,
//         });
//         const questionEmbedding = questionEmbeddingResponse.data[0].embedding;

//         // STEP 2: Use Mongoose to perform a Vector Search on your database
//         const searchPipeline = [
//             {
//                 $vectorSearch: {
//                     index: "vector_index_for_chatbot",
//                     path: "embedding",
//                     queryVector: questionEmbedding,
//                     numCandidates: 150,
//                     limit: 5
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     text: 1,
//                     score: { $meta: "vectorSearchScore" }
//                 }
//             }
//         ];

//         const relevantChunks = await Knowledge.aggregate(searchPipeline);

//         if (relevantChunks.length === 0) {
//             // FIX: Send response, then return.
//              res.json({
//                 success: true,
//                 response: "I'm sorry, I couldn't find any information related to your question in my knowledge base.",
//                 timestamp: new Date().toISOString()
//             });
//             return;
//         }

//         const context = relevantChunks.map(chunk => chunk.text).join("\n\n---\n\n");

//         // STEP 3: Build the new, context-aware prompt
//         const systemPrompt = `You are a helpful customer support assistant. Your instructions are:
//         1. Answer the user's question based ONLY on the "CONTEXT" provided below.
//         2. Be helpful, friendly, and professional.
//         3. If the context doesn't contain the answer, politely say you don't have enough information. Do not make up information.
//         4. Keep responses concise but informative.
//         5. If the user asks about something not covered, you can suggest they contact support at support@soulskool.in.
//         6. If the question is about dance but the answer isn't in the context, you can encourage them to join the 5-day online dance workshop.
//         7. Give elaborative information by using the data from the context.

//         CONTEXT:
//         ${context}`;

//         const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
//             { role: 'system', content: systemPrompt },
//             { role: 'user', content: message }
//         ];

//         // STEP 4: Call the Chat AI
//         const completion = await openai.chat.completions.create({
//             model: "gpt-4-turbo",
//             messages: messages,
//         });

//         const aiResponse = completion.choices[0]?.message?.content;

//         // STEP 5: Send the final answer back to the frontend
//         res.json({
//             success: true,
//             response: aiResponse || "I'm sorry, I was unable to generate a response.",
//             timestamp: new Date().toISOString()
//         });

//     } catch (error) {
//        // console.error("Error in sendMessage RAG:", error);
//         const errorStr = error instanceof Error ? error.message : String(error);
//         res.status(500).json({
//             success: false,
//             error: "An unexpected error occurred while processing your message.",
//             details: process.env.NODE_ENV === 'development' ? errorStr : undefined
//         });
//     }
// };


// // --- 5. Health Check Controller (Unchanged) ---
// export const healthCheck = async (req: Request, res: Response<HealthCheckResponse>): Promise<void> => {
//     try {
//         const hasApiKey: boolean = Boolean(process.env.OPENAI_API_KEY);

//         res.json({
//             success: true,
//             status: 'Chat service is running with RAG system',
//             config: {
//                 apiKeyConfigured: hasApiKey,
//                 businessDataLoaded: true,
//                 businessDataLength: -1
//             },
//             timestamp: new Date().toISOString()
//         });
//     } catch (error) {
//         const errorStr = error instanceof Error ? error.message : String(error);
//         res.status(500).json({
//             success: false,
//             error: 'Health check failed',
//             details: errorStr
//         });
//     }
// };






// balendra3316/community-backend/community-backend-0873ebfa55c9ccb3ef429dc3514f9519cb915f4c/src/controllers/chatController.ts

// FIX: Use the correct client and type names for the @google/genai SDK
import { GoogleGenAI, Content } from "@google/genai"; 
import { Request, Response } from 'express';
import mongoose, { Schema, model, Document } from 'mongoose';
import OpenAI from 'openai'; 

// --- 0. Helper Function to Normalize Vector ---
// CRITICAL FIX: Ensures the query vector is a unit vector, matching the data created by OpenAI/Gemini.
function normalizeVector(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    // Check if the vector is already normalized (norm close to 1) or zero
    return (norm === 0 || Math.abs(norm - 1.0) < 1e-6) ? vector : vector.map(val => val / norm);
}


const GEMINI_API_KEY = process.env.GEMINI_API_KEY_SECOND as string;
// FIX 1: Initialize Gemini Client (Using the new name and key, assuming successful installation)
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY }); 
const CHAT_MODEL = "gemini-2.5-flash"; 
const EMBEDDING_MODEL = 'gemini-embedding-001'; 


// --- 2. Define the Mongoose Model for your Knowledge Base (Unchanged) ---
interface IKnowledge extends Document {
  text: string;
  embedding: number[];
}

const KnowledgeSchema: Schema = new Schema({
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
});

const Knowledge = mongoose.models.ChatbotKnowledge || model<IKnowledge>('ChatbotKnowledge', KnowledgeSchema);


// --- 3. Interface Definitions (Unchanged) ---
interface ChatRequest extends Request {
    body: {
        message: string;
    };
}

interface ApiResponse {
    success: boolean;
    response?: string;
    error?: string;
    details?: string;
    timestamp?: string;
}

interface HealthCheckResponse { // Kept for the healthCheck function
    success: boolean;
    status?: string;
    config?: {
        apiKeyConfigured: boolean;
        businessDataLoaded: boolean;
        businessDataLength: number;
    };
    error?: string;
    details?: string;
    timestamp?: string;
}

// --- 4. The Corrected sendMessage Controller with RAG Logic (Fixed Type Safety) ---
export const sendMessage = async (req: ChatRequest, res: Response<ApiResponse>): Promise<void> => {
    try {
        const { message } = req.body;
console.log("Received message:", message);
        if (!message || message.trim() === '') {
            res.status(400).json({ success: false, error: 'Message is required' });
            return;
        }
        if (!GEMINI_API_KEY) {
            res.status(500).json({ success: false, error: 'GEMINI_AI_KEY not configured' });
            return;
        }

        // STEP 1: Create an embedding for the user's question
        const embeddingResponse = await ai.models.embedContent({ 
            model: EMBEDDING_MODEL,
            contents: message,
            config: {
                outputDimensionality: 1536,
            }
        });
        
        // FIX 2 & 3: Safely extract the raw embedding, handling potential 'undefined'
        const rawEmbedding = embeddingResponse.embeddings?.[0]?.values;

        // Ensure rawEmbedding is not undefined before passing it to normalization
        if (!rawEmbedding) {
            res.status(500).json({ success: false, error: 'Failed to generate embedding for the message.' });
            return;
        }
        
        // Normalize the vector before search
        const questionEmbedding = normalizeVector(rawEmbedding);

        // STEP 2: Use Mongoose to perform a Vector Search on your database (Unchanged)
        const searchPipeline = [
            {
                $vectorSearch: {
                    index: "vector_index_for_chatbot",
                    path: "embedding",
                    queryVector: questionEmbedding,
                    numCandidates: 150,
                    limit: 5
                }
            },
            {
                $project: {
                    _id: 0,
                    text: 1,
                    score: { $meta: "vectorSearchScore" }
                }
            }
        ];

        const relevantChunks = await Knowledge.aggregate(searchPipeline);

        if (relevantChunks.length === 0) {
             res.json({
                success: true,
                response: "I'm sorry, I couldn't find any information related to your question in my knowledge base.",
                timestamp: new Date().toISOString()
            });
            return;
        }

        const context = relevantChunks.map(chunk => chunk.text).join("\n\n---\n\n");

        // STEP 3: Build the new, context-aware prompt (Unchanged)
        const systemPrompt = `You are a helpful customer support assistant. Your instructions are:
        1. Answer the user's question based ONLY on the "CONTEXT" provided below.
        2. Be helpful, friendly, and professional.
        3. If the context doesn't contain the answer, politely say you don't have enough information. Do not make up information.
        4. Keep responses concise but informative.
        5. If the user asks about something not covered, you can suggest they contact support at support@soulskool.in.
        6. If the question is about dance but the answer isn't in the context, you can encourage them to join the 5-day online dance workshop.
        7. Give elaborative information by using the data from the context.

        CONTEXT:
        ${context}`;

        // STEP 4: Call the Chat AI (MODIFIED for Gemini SDK)
        const contents: Content[] = [{ role: "user", parts: [{ text: message }] }];
        
        const completion = await ai.models.generateContent({ 
            model: CHAT_MODEL,
            contents: contents, 
            config: {
                systemInstruction: systemPrompt, 
            },
        });

        const aiResponse = completion.text;

        // STEP 5: Send the final answer back to the frontend
        res.json({
            success: true,
            response: aiResponse || "I'm sorry, I was unable to generate a response.",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
       // console.error("Error in sendMessage RAG:", error);
        const errorStr = error instanceof Error ? error.message : String(error);
        res.status(500).json({
            success: false,
            error: "An unexpected error occurred while processing your message.",
            details: process.env.NODE_ENV === 'development' ? errorStr : undefined
        });
    }
};


// --- 5. Health Check Controller (Unchanged) ---
export const healthCheck = async (req: Request, res: Response<HealthCheckResponse>): Promise<void> => {
    const GEMINI_API_KEY = process.env.GEMINI_AI_KEY;

    try {
        const hasApiKey: boolean = Boolean(GEMINI_API_KEY);

        res.json({
            success: true,
            status: 'Chat service is running with RAG system (Gemini AI)',
            config: {
                apiKeyConfigured: hasApiKey,
                businessDataLoaded: true,
                businessDataLength: -1
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        const errorStr = error instanceof Error ? error.message : String(error);
        res.status(500).json({
            success: false,
            error: 'Health check failed',
            details: errorStr
        });
    }
};