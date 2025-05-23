'use server';

import { NextRequest, NextResponse } from 'next/server';
import { newAsk } from '@/lib/ask'; // Adjust path as necessary
import Debug from 'hasyx/lib/debug';

const debug = Debug('api:voice:route');

// Initialize ask instance once
let askInstance: ReturnType<typeof newAsk> | null = null;

function getAskInstance() {
  if (!askInstance) {
    try {
      askInstance = newAsk();
      console.log("askInstance initialized successfully in /api/voice/route.ts");
    } catch (error) {
      console.error("Failed to initialize askInstance in /api/voice/route.ts:", error);
      // Depending on the error, you might want to throw it or handle it differently
      // For now, we'll let it be null, and requests will fail.
    }
  }
  return askInstance;
}


export async function POST(request: NextRequest) {
  debug('POST /api/voice request received');

  try {
    const body = await request.json();
    const message = body.message;

    if (typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required and must be a string.' }, { status: 400 });
    }

    debug(`Received message: ${message}`);

    const currentAsk = getAskInstance();
    if (!currentAsk) {
      console.error("askInstance is not available in /api/voice/route.ts POST handler.");
      return NextResponse.json({ error: 'AI service initialization failed.' }, { status: 500 });
    }
    
    // Call the ask function from the ask gateway
    const aiResponse = await currentAsk.ask(message);
    debug(`AI Response: ${aiResponse}`);

    return NextResponse.json({ reply: aiResponse });

  } catch (error: any) {
    debug(`Error processing POST /api/voice: ${error.message}`, error);
    console.error("Error in /api/voice POST handler:", error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

// Optional: GET handler for testing or other purposes
export async function GET(request: NextRequest): Promise<NextResponse> {
  debug('GET /api/voice request received');
  return NextResponse.json({ message: "Voice API is running. Use POST to send messages." });
} 