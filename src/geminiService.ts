import * as vscode from 'vscode';
import axios from 'axios';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface GeminiResponse {
    candidates: Array<{
        content: {
            parts: Array<{ text: string }>;
        };
    }>;
}

export class GeminiService {
    private apiKey: string = '';
    private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    constructor() {
        this.updateApiKey();
    }

    public updateApiKey(): void {
        const config = vscode.workspace.getConfiguration('geminiAssistant');
        this.apiKey = config.get<string>('apiKey') || '';
        
        if (!this.apiKey) {
            vscode.window.showWarningMessage(
                'Please set your Gemini API key in settings to use the AI assistant.',
                'Open Settings'
            ).then(selection => {
                if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'geminiAssistant.apiKey');
                }
            });
        }
    }

    public async generateResponse(
        messages: ChatMessage[],
        customContext: string[] = []
    ): Promise<string> {
        if (!this.apiKey) {
            throw new Error('Gemini API key not configured');
        }

        try {
            const config = vscode.workspace.getConfiguration('geminiAssistant');
            const model = config.get<string>('model') || 'gemini-2.0-flash';

            // Prepare the conversation context
            let conversationText = '';
            
            // Add custom context if provided
            if (customContext.length > 0) {
                conversationText += `Custom Context:\n${customContext.join('\n')}\n\n`;
            }

            // Add conversation history
            conversationText += messages.map(msg => 
                `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
            ).join('\n\n');

            const requestBody = {
                contents: [{
                    parts: [{
                        text: conversationText
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                }
            };

            const response = await axios.post<GeminiResponse>(
                `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data.candidates && response.data.candidates.length > 0) {
                const candidate = response.data.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                    return candidate.content.parts[0].text;
                }
            }

            throw new Error('No valid response from Gemini API');

        } catch (error: any) {
            console.error('Gemini API Error:', error);
            
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.error?.message || 'Unknown API error';
                
                if (status === 401) {
                    throw new Error('Invalid API key. Please check your Gemini API key in settings.');
                } else if (status === 429) {
                    throw new Error('API rate limit exceeded. Please try again later.');
                } else {
                    throw new Error(`API Error (${status}): ${message}`);
                }
            }
            
            throw new Error(`Failed to generate response: ${error.message}`);
        }
    }

    public isConfigured(): boolean {
        return !!this.apiKey;
    }
}