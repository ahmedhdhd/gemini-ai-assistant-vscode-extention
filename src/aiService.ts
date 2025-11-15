import * as vscode from 'vscode';
import axios from 'axios';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface AIProvider {
    name: string;
    generateResponse(messages: ChatMessage[], customContext: string[]): Promise<string>;
    isConfigured(): boolean;
}

// Gemini API Provider
class GeminiProvider implements AIProvider {
    name = 'Gemini';
    private apiKey: string = '';
    private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

    constructor() {
        this.updateApiKey();
    }

    updateApiKey(): void {
        const config = vscode.workspace.getConfiguration('geminiAssistant');
        this.apiKey = config.get<string>('geminiApiKey') || '';
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    async generateResponse(messages: ChatMessage[], customContext: string[] = []): Promise<string> {
        if (!this.apiKey) {
            throw new Error('Gemini API key not configured');
        }

        try {
            const config = vscode.workspace.getConfiguration('geminiAssistant');
            const model = config.get<string>('geminiModel') || 'gemini-2.0-flash-exp';

            // Prepare conversation context
            let conversationText = '';
            
            if (customContext.length > 0) {
                conversationText += `Custom Context:\n${customContext.join('\n')}\n\n`;
            }

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

            const response = await axios.post(
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
                    throw new Error('Invalid Gemini API key. Please check your settings.');
                } else if (status === 429) {
                    throw new Error('Gemini API rate limit exceeded. Please try again later.');
                } else {
                    throw new Error(`Gemini API Error (${status}): ${message}`);
                }
            }
            
            throw new Error(`Failed to generate response: ${error.message}`);
        }
    }
}

// Groq API Provider
class GroqProvider implements AIProvider {
    name = 'Groq';
    private apiKey: string = '';
    private baseUrl = 'https://api.groq.com/openai/v1';

    constructor() {
        this.updateApiKey();
    }

    updateApiKey(): void {
        const config = vscode.workspace.getConfiguration('geminiAssistant');
        this.apiKey = config.get<string>('groqApiKey') || '';
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    async generateResponse(messages: ChatMessage[], customContext: string[] = []): Promise<string> {
        if (!this.apiKey) {
            throw new Error('Groq API key not configured');
        }

        try {
            const config = vscode.workspace.getConfiguration('geminiAssistant');
            const model = config.get<string>('groqModel') || 'llama-3.3-70b-versatile';

            // Build messages array for Groq (OpenAI format)
            const apiMessages: any[] = [];

            // Add system message with custom context if available
            if (customContext.length > 0) {
                apiMessages.push({
                    role: 'system',
                    content: `Custom Context:\n${customContext.join('\n')}`
                });
            }

            // Add conversation messages
            messages.forEach(msg => {
                apiMessages.push({
                    role: msg.role,
                    content: msg.content
                });
            });

            const requestBody = {
                model: model,
                messages: apiMessages,
                temperature: 0.7,
                max_tokens: 2048,
                top_p: 0.95,
                stream: false
            };

            const response = await axios.post(
                `${this.baseUrl}/chat/completions`,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );

            if (response.data.choices && response.data.choices.length > 0) {
                return response.data.choices[0].message.content;
            }

            throw new Error('No valid response from Groq API');

        } catch (error: any) {
            console.error('Groq API Error:', error);
            
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.error?.message || 'Unknown API error';
                
                if (status === 401) {
                    throw new Error('Invalid Groq API key. Please check your settings.');
                } else if (status === 429) {
                    throw new Error('Groq API rate limit exceeded. Please try again later.');
                } else {
                    throw new Error(`Groq API Error (${status}): ${message}`);
                }
            }
            
            throw new Error(`Failed to generate response: ${error.message}`);
        }
    }
}

// Main AI Service
export class AIService {
    private providers: Map<string, AIProvider> = new Map();
    private currentProvider: AIProvider;
    private agentSystemPrompt: string = '';
    private agentTemperature: number = 0.7;

    constructor() {
        // Register providers
        this.providers.set('gemini', new GeminiProvider());
        this.providers.set('groq', new GroqProvider());

        // Set default provider
        this.currentProvider = this.getSelectedProvider();
    }

    public setAgentConfig(systemPrompt: string, temperature: number): void {
        this.agentSystemPrompt = systemPrompt;
        this.agentTemperature = temperature;
    }

    private getSelectedProvider(): AIProvider {
        const config = vscode.workspace.getConfiguration('geminiAssistant');
        const providerName = config.get<string>('aiProvider') || 'gemini';
        
        const provider = this.providers.get(providerName);
        if (!provider) {
            console.warn(`Provider ${providerName} not found, using Gemini`);
            return this.providers.get('gemini')!;
        }
        
        return provider;
    }

    public updateConfiguration(): void {
        console.log('Updating AI service configuration');
        
        // Update all providers
        (this.providers.get('gemini') as GeminiProvider)?.updateApiKey();
        (this.providers.get('groq') as GroqProvider)?.updateApiKey();
        
        // Update current provider
        this.currentProvider = this.getSelectedProvider();
        
        // Check if current provider is configured
        if (!this.currentProvider.isConfigured()) {
            const providerName = this.currentProvider.name;
            vscode.window.showWarningMessage(
                `Please set your ${providerName} API key in settings to use the AI assistant.`,
                'Open Settings'
            ).then(selection => {
                if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'geminiAssistant');
                }
            });
        }
    }

    public async generateResponse(messages: ChatMessage[], customContext: string[] = []): Promise<string> {
        console.log(`Generating response using ${this.currentProvider.name}`);
        
        if (!this.currentProvider.isConfigured()) {
            throw new Error(`${this.currentProvider.name} API key not configured`);
        }

        return await this.currentProvider.generateResponse(messages, customContext);
    }

    public isConfigured(): boolean {
        return this.currentProvider.isConfigured();
    }

    public getCurrentProviderName(): string {
        return this.currentProvider.name;
    }
}