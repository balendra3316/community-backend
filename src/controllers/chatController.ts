// import { GoogleGenerativeAI } from '@google/generative-ai';
// import fs from 'fs';
// import path from 'path';
// import { Request, Response } from 'express';


// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);


// const currentDir = __dirname;


// interface ChatRequest extends Request {
//   body: {
//     message: string;
//   };
// }


// interface ApiResponse {
//   success: boolean;
//   response?: string;
//   error?: string;
//   details?: string;
//   timestamp?: string;
// }

// interface HealthCheckResponse {
//   success: boolean;
//   status?: string;
//   config?: {
//     apiKeyConfigured: boolean;
//     businessDataLoaded: boolean;
//     businessDataLength: number;
//   };
//   error?: string;
//   details?: string;
//   timestamp?: string;
// }

// // Load business data
// let businessData: string = '';
// try {
//   const dataPath = path.join(currentDir, '../data/business-data.txt');
//   businessData = fs.readFileSync(dataPath, 'utf8');
// } catch (error) {
//   businessData = 'Business data file not found.';
// }

// // Create system prompt function
// const createSystemPrompt = (businessData: string): string => {
//   return `You are a helpful customer support assistant for a website. You should only answer questions related to the business and website based on the following information:

// ${businessData}

// Instructions:
// 1. Only answer questions related to the business, services, products, or website mentioned in the data above
// 2. Be helpful, friendly, and professional
// 3. If someone asks about something not covered in the business data, politely redirect them to contact support directly
// 4. Keep responses concise but informative
// 5. If you're unsure about something, suggest they contact support for more specific help, support@soulskool.in or contact via whatsapp number
// 6. Don't make up information that's not in the business data
// 7. this is company support email- support@soulskool.in this support number-9642087790
// 8. if the answer of dabce releted question is not in file then encourage to join 5 day online dance workshop and become star member for more benefits
// 9. give elaborative information by taking data from the document and give them clear and informative answers


// Please respond naturally and conversationally while staying within the scope of the provided business information.`;
// };

// // Send message controller
// export const sendMessage = async (req: ChatRequest, res: Response<ApiResponse>): Promise<void> => {
//   try {
//     const { message } = req.body;

//     // Validate message
//     if (!message || message.trim() === '') {
//       res.status(400).json({
//         success: false,
//         error: 'Message is required'
//       });
//       return;
//     }

//     // Validate API key
//     if (!process.env.GEMINI_API_KEY) {
//       res.status(500).json({
//         success: false,
//         error: 'Gemini API key not configured'
//       });
//       return;
//     }

//     // Initialize model
//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//     // Create prompt
//     const systemPrompt = createSystemPrompt(businessData);
//     const fullPrompt = `${systemPrompt}\n\nUser Question: ${message}\n\nAssistant Response:`;

//     // Generate response
//     const result = await model.generateContent(fullPrompt);
//     const response = await result.response;
//     const aiResponse = response.text();

//     // Send success response
//     res.json({
//       success: true,
//       response: aiResponse,
//       timestamp: new Date().toISOString()
//     });

//   } catch (error) {
//     // Error handling with proper typing
//     let errorMessage = 'Failed to process your message';
//     let statusCode = 500;

//     const errorStr = error instanceof Error ? error.message : String(error);

//     if (errorStr.includes('API key')) {
//       errorMessage = 'Invalid API key configuration';
//       statusCode = 401;
//     } else if (errorStr.includes('quota')) {
//       errorMessage = 'API quota exceeded';
//       statusCode = 429;
//     } else if (errorStr.includes('model')) {
//       errorMessage = 'Model configuration error';
//       statusCode = 400;
//     }

//     res.status(statusCode).json({
//       success: false,
//       error: errorMessage,
//       details: process.env.NODE_ENV === 'development' ? errorStr : undefined
//     });
//   }
// };

// // Health check controller
// export const healthCheck = async (req: Request, res: Response<HealthCheckResponse>): Promise<void> => {
//   try {
//     const hasApiKey: boolean = Boolean(process.env.GEMINI_API_KEY);
//     const hasBusinessData: boolean = businessData.trim() !== '' && businessData !== 'Business data file not found.';

//     res.json({
//       success: true,
//       status: 'Chat service is running',
//       config: {
//         apiKeyConfigured: hasApiKey,
//         businessDataLoaded: hasBusinessData,
//         businessDataLength: businessData.length
//       },
//       timestamp: new Date().toISOString()
//     });
//   } catch (error) {
//     const errorStr = error instanceof Error ? error.message : String(error);
    
//     res.status(500).json({
//       success: false,
//       error: 'Health check failed',
//       details: errorStr
//     });
//   }
// };













// // CHANGED: Import OpenAI instead of GoogleGenerativeAI
// import OpenAI from 'openai';
// import fs from 'fs';
// import path from 'path';
// import { Request, Response } from 'express';

// // CHANGED: Initialize the OpenAI client with your new environment variable
// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY as string
// });

// const currentDir = __dirname;

// // --- Interface Definitions (Unchanged) ---
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

// interface HealthCheckResponse {
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

// // --- Load Business Data (Unchanged) ---
// let businessData: string = '';
// try {
//     const dataPath = path.join(currentDir, '../data/business-data.txt');
//     businessData = fs.readFileSync(dataPath, 'utf8');
// } catch (error) {
//     businessData = 'Business data file not found.';
// }

// // --- Create System Prompt Function (Unchanged) ---
// const createSystemPrompt = (businessData: string): string => {
//     return `You are a helpful customer support assistant for a website. You should only answer questions related to the business and website based on the following information:

// ${businessData}

// Instructions:
// 1. Only answer questions related to the business, services, products, or website mentioned in the data above
// 2. Be helpful, friendly, and professional
// 3. If someone asks about something not covered in the business data, politely redirect them to contact support directly
// 4. Keep responses concise but informative
// 5. If you're unsure about something, suggest they contact support for more specific help, support@soulskool.in or contact via whatsapp number
// 6. Don't make up information that's not in the business data
// 7. this is company support email- support@soulskool.in this support number-9642087790
// 8. if the answer of dabce releted question is not in file then encourage to join 5 day online dance workshop and become star member for more benefits
// 9. give elaborative information by taking data from the document and give them clear and informative answers


// Please respond naturally and conversationally while staying within the scope of the provided business information.`;
// };

// // --- Helper function to create a delay (Unchanged) ---
// const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// // --- Send Message Controller (MODIFIED for OpenAI) ---
// export const sendMessage = async (req: ChatRequest, res: Response<ApiResponse>): Promise<void> => {
//     try {
//         const { message } = req.body;

//         if (!message || message.trim() === '') {
//             res.status(400).json({ success: false, error: 'Message is required' });
//             return;
//         }

//         // CHANGED: Check for OPENAI_API_KEY
//         if (!process.env.OPENAI_API_KEY) {
//             res.status(500).json({ success: false, error: 'OpenAI API key not configured' });
//             return;
//         }

//         const MAX_RETRIES = 3;
//         let lastError: any = null;

//         for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
//             try {
//                 // --- CHANGED: OpenAI API Call Logic ---
//                 const systemPrompt = createSystemPrompt(businessData);

//                 // OpenAI requires a structured message array
//                 const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
//                     { role: 'system', content: systemPrompt },
//                     { role: 'user', content: message }
//                 ];

//                 const completion = await openai.chat.completions.create({
//                     model: "gpt-4-turbo", 
//                     messages: messages,
//                 });

//                 const aiResponse = completion.choices[0]?.message?.content;
                


//                 if (aiResponse) {
//                     res.json({
//                         success: true,
//                         response: aiResponse,
//                         timestamp: new Date().toISOString()
//                     });
//                     return;
//                 } else {
//                     // Handle case where response content is empty
//                     throw new Error("Received an empty response from OpenAI.");
//                 }

//             } catch (error) {
//                 lastError = error;
//                 const errorStr = String(error);

//                 // This retry logic should still work for OpenAI's temporary errors
//                 if (errorStr.includes('503') || errorStr.includes('overloaded') || errorStr.includes('Service Unavailable')) {
//                     if (attempt < MAX_RETRIES) {
//                         const delayTime = Math.pow(2, attempt) * 500;
//                         await delay(delayTime);
//                         continue;
//                     }
//                 } else {
//                     break;
//                 }
//             }
//         }

//         // --- Error Handling (Mostly Unchanged) ---
//         const errorStr = lastError instanceof Error ? lastError.message : String(lastError);
//         let errorMessage = 'Failed to process your message';
//         let statusCode = 500;

//         if (errorStr.includes('API key')) {
//             errorMessage = 'Invalid API key configuration';
//             statusCode = 401;
//         } else if (errorStr.includes('quota')) {
//             errorMessage = 'API quota exceeded';
//             statusCode = 429;
//         } else if (errorStr.includes('503') || errorStr.includes('overloaded')) {
//             errorMessage = 'The AI service is currently busy. Please try again shortly.';
//             statusCode = 503;
//         }

//         res.status(statusCode).json({
//             success: false,
//             error: errorMessage,
//             details: process.env.NODE_ENV === 'development' ? errorStr : undefined
//         });

//     } catch (error) {
//         const errorStr = error instanceof Error ? error.message : String(error);
//         res.status(500).json({
//             success: false,
//             error: 'An unexpected server error occurred.',
//             details: process.env.NODE_ENV === 'development' ? errorStr : undefined
//         });
//     }
// };

// // --- Health Check Controller (MODIFIED for OpenAI) ---
// export const healthCheck = async (req: Request, res: Response<HealthCheckResponse>): Promise<void> => {
//     try {
//         // CHANGED: Check for OPENAI_API_KEY
//         const hasApiKey: boolean = Boolean(process.env.OPENAI_API_KEY);
//         const hasBusinessData: boolean = businessData.trim() !== '' && businessData !== 'Business data file not found.';

//         res.json({
//             success: true,
//             status: 'Chat service is running',
//             config: {
//                 apiKeyConfigured: hasApiKey,
//                 businessDataLoaded: hasBusinessData,
//                 businessDataLength: businessData.length
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





import OpenAI from 'openai';
import { Request, Response } from 'express';
import mongoose, { Schema, model, Document } from 'mongoose';

// --- 1. Initialize OpenAI Client ---
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY as string
});


// --- 2. Define the Mongoose Model for your Knowledge Base ---
interface IKnowledge extends Document {
  text: string;
  embedding: number[];
}

const KnowledgeSchema: Schema = new Schema({
  text: { type: String, required: true },
  embedding: { type: [Number], required: true },
});

const Knowledge = mongoose.models.ChatbotKnowledge || model<IKnowledge>('ChatbotKnowledge', KnowledgeSchema);


// --- 3. Interface Definitions ---
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

// --- 4. The Corrected sendMessage Controller with RAG Logic ---
export const sendMessage = async (req: ChatRequest, res: Response<ApiResponse>): Promise<void> => {
    try {
        const { message } = req.body;

        if (!message || message.trim() === '') {
            // FIX: Send response, then return.
            res.status(400).json({ success: false, error: 'Message is required' });
            return;
        }
        if (!process.env.OPENAI_API_KEY) {
            // FIX: Send response, then return.
            res.status(500).json({ success: false, error: 'OpenAI API key not configured' });
            return;
        }

        // STEP 1: Create an embedding for the user's question
        const questionEmbeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: message,
        });
        const questionEmbedding = questionEmbeddingResponse.data[0].embedding;

        // STEP 2: Use Mongoose to perform a Vector Search on your database
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
            // FIX: Send response, then return.
             res.json({
                success: true,
                response: "I'm sorry, I couldn't find any information related to your question in my knowledge base.",
                timestamp: new Date().toISOString()
            });
            return;
        }

        const context = relevantChunks.map(chunk => chunk.text).join("\n\n---\n\n");

        // STEP 3: Build the new, context-aware prompt
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

        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
        ];

        // STEP 4: Call the Chat AI
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: messages,
        });

        const aiResponse = completion.choices[0]?.message?.content;

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
    try {
        const hasApiKey: boolean = Boolean(process.env.OPENAI_API_KEY);

        res.json({
            success: true,
            status: 'Chat service is running with RAG system',
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