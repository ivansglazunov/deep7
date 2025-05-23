"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from 'hasyx/components/ui/button';

export default function VoiceClient() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [status, setStatus] = useState('Idle');
  const [error, setError] = useState('');

  // Placeholder for SpeechRecognition instance
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Check for SpeechRecognition API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('Error: Speech recognition not supported by this browser.');
      console.error('Speech recognition not supported by this browser.');
      return;
    }

    const recogInstance = new SpeechRecognition();
    recogInstance.continuous = true; // Keep listening even after a pause
    recogInstance.interimResults = true; // Get interim results
    recogInstance.lang = 'ru-RU'; // Set language - adjust as needed

    recogInstance.onstart = () => {
      setStatus('Listening...');
    };

    recogInstance.onresult = (event: any) => {
      let finalTranscript = '';
      let currentInterimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          currentInterimTranscript += event.results[i][0].transcript;
        }
      }
      setInterimTranscript(currentInterimTranscript);
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript + ' '); // Append final transcript
        // "Logically send" - send when a complete phrase is likely formed.
        // This simple version sends after each final transcript.
        // More sophisticated logic (e.g., silence detection) could be added here.
        sendToApi(finalTranscript.trim());
      }
    };

    recogInstance.onerror = (event: any) => {
      setStatus('Error: Speech recognition error.');
      setError(`Speech recognition error: ${event.error}`);
      console.error('Speech recognition error', event);
      if (event.error === 'no-speech') {
        // Optionally restart if desired, or inform user.
      } else if (event.error === 'audio-capture') {
        setStatus('Error: Microphone not available or permission denied.');
      } else if (event.error === 'not-allowed') {
        setStatus('Error: Microphone access denied.');
      }
    };

    recogInstance.onend = () => {
      if (isListening) { // If it ended but we still want to listen, restart it.
        try {
          recognition?.start();
        } catch(e) {
          console.warn("Recognition ended and couldn't restart immediately:", e);
          //setStatus('Idle'); // Or some other appropriate status
        }
      } else {
        setStatus('Idle');
      }
    };
    
    setRecognition(recogInstance);

    return () => {
      recogInstance?.stop();
    };
  }, [isListening]); // Re-run effect if isListening changes by external means, though direct calls to start/stop are typical. Re-added isListening dependency for the onend restart logic

  const speak = (text: string) => {
    if (!window.speechSynthesis) {
      setStatus('Error: Speech synthesis not supported by this browser.');
      console.error('Speech synthesis not supported by this browser.');
      return;
    }
    setStatus('Speaking...');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU'; // Set language for speech - adjust as needed
    utterance.onend = () => {
      setStatus('Idle');
    };
    utterance.onerror = (event) => {
      setStatus('Error: Speech synthesis error.');
      setError(`Speech synthesis error: ${event.error}`);
      console.error('Speech synthesis error', event);
    };
    window.speechSynthesis.speak(utterance);
  };

  const sendToApi = async (text: string) => {
    if (!text.trim()) return;
    setStatus('Processing...');
    setInterimTranscript(''); // Clear interim when sending final
    try {
      const response = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      const data = await response.json();
      setAiResponse(data.reply);
      speak(data.reply);
    } catch (apiError: any) {
      setStatus('Error: API communication failed.');
      setError(apiError.message);
      console.error("API Error:", apiError);
    }
  };

  const toggleListen = () => {
    if (!recognition) {
      setStatus('Error: Speech recognition not initialized.');
      return;
    }
    if (isListening) {
      recognition.stop();
      setIsListening(false);
      // Status will be set by onend
    } else {
      setTranscript(''); // Clear previous complete transcript
      setInterimTranscript('');
      setAiResponse('');
      setError('');
      try {
        recognition.start();
        setIsListening(true);
        // Status will be set by onstart
      } catch (e) {
        setStatus('Error: Could not start listening.');
        console.error("Error starting recognition:", e);
         if (e instanceof DOMException && e.name === 'InvalidStateError') {
          // This can happen if start() is called too soon after a stop() or an error.
          // Allow onend to handle restart if isListening is true.
          console.warn("Attempted to start recognition in an invalid state. Will rely on onend to potentially restart.");
        }
      }
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Voice Assistant</h1>
      <Button onClick={toggleListen} variant={isListening ? "destructive" : "default"}>
        {isListening ? 'Stop Listening' : 'Start Listening'}
      </Button>
      
      <div className="space-y-2">
        <p className="text-sm text-gray-500">Status: {status}</p>
        {error && <p className="text-sm text-red-500">Error: {error}</p>}
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">You said:</h2>
        <p className="border p-2 min-h-[50px] rounded bg-gray-50">
          {transcript} <span className="text-gray-400">{interimTranscript}</span>
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">AI Replied:</h2>
        <p className="border p-2 min-h-[50px] rounded bg-blue-50">
          {aiResponse}
        </p>
      </div>
    </div>
  );
} 