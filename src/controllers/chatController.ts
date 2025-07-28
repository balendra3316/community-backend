import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);


const currentDir = __dirname;


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

interface HealthCheckResponse {
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

// Load business data
let businessData: string = '';
try {
  const dataPath = path.join(currentDir, '../data/business-data.txt');
  businessData = fs.readFileSync(dataPath, 'utf8');
} catch (error) {
  businessData = 'Business data file not found.';
}

// Create system prompt function
const createSystemPrompt = (businessData: string): string => {
  return `You are a helpful customer support assistant for a website. You should only answer questions related to the business and website based on the following information:

${businessData}

Instructions:
1. Only answer questions related to the business, services, products, or website mentioned in the data above
2. Be helpful, friendly, and professional
3. If someone asks about something not covered in the business data, politely redirect them to contact support directly
4. Keep responses concise but informative
5. If you're unsure about something, suggest they contact support for more specific help, support@soulskool.in or contact via whatsapp number
6. Don't make up information that's not in the business data
7. this is company support email- support@soulskool.in this support number-9642087790
8. if the answer of dabce releted question is not in file then encourage to join 5 day online dance workshop and become star member for more benefits
9. give elaborative information by taking data from the document and give them clear and informative answers


Please respond naturally and conversationally while staying within the scope of the provided business information.`;
};

// Send message controller
export const sendMessage = async (req: ChatRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { message } = req.body;

    // Validate message
    if (!message || message.trim() === '') {
      res.status(400).json({
        success: false,
        error: 'Message is required'
      });
      return;
    }

    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({
        success: false,
        error: 'Gemini API key not configured'
      });
      return;
    }

    // Initialize model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Create prompt
    const systemPrompt = createSystemPrompt(businessData);
    const fullPrompt = `${systemPrompt}\n\nUser Question: ${message}\n\nAssistant Response:`;

    // Generate response
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const aiResponse = response.text();

    // Send success response
    res.json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Error handling with proper typing
    let errorMessage = 'Failed to process your message';
    let statusCode = 500;

    const errorStr = error instanceof Error ? error.message : String(error);

    if (errorStr.includes('API key')) {
      errorMessage = 'Invalid API key configuration';
      statusCode = 401;
    } else if (errorStr.includes('quota')) {
      errorMessage = 'API quota exceeded';
      statusCode = 429;
    } else if (errorStr.includes('model')) {
      errorMessage = 'Model configuration error';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorStr : undefined
    });
  }
};

// Health check controller
export const healthCheck = async (req: Request, res: Response<HealthCheckResponse>): Promise<void> => {
  try {
    const hasApiKey: boolean = Boolean(process.env.GEMINI_API_KEY);
    const hasBusinessData: boolean = businessData.trim() !== '' && businessData !== 'Business data file not found.';

    res.json({
      success: true,
      status: 'Chat service is running',
      config: {
        apiKeyConfigured: hasApiKey,
        businessDataLoaded: hasBusinessData,
        businessDataLength: businessData.length
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









