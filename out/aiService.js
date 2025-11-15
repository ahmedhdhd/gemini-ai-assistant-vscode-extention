"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
// Gemini API Provider
class GeminiProvider {
    constructor() {
        this.name = 'Gemini';
        this.apiKey = '';
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        this.updateApiKey();
    }
    updateApiKey() {
        const config = vscode.workspace.getConfiguration('geminiAssistant');
        this.apiKey = config.get('geminiApiKey') || '';
    }
    isConfigured() {
        return !!this.apiKey;
    }
    async generateResponse(messages, customContext = []) {
        if (!this.apiKey) {
            throw new Error('Gemini API key not configured');
        }
        try {
            const config = vscode.workspace.getConfiguration('geminiAssistant');
            const model = config.get('geminiModel') || 'gemini-2.0-flash-exp';
            // Prepare conversation context
            let conversationText = '';
            if (customContext.length > 0) {
                conversationText += `Custom Context:\n${customContext.join('\n')}\n\n`;
            }
            conversationText += messages.map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`).join('\n\n');
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
            const response = await axios_1.default.post(`${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`, requestBody, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.data.candidates && response.data.candidates.length > 0) {
                const candidate = response.data.candidates[0];
                if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                    return candidate.content.parts[0].text;
                }
            }
            throw new Error('No valid response from Gemini API');
        }
        catch (error) {
            console.error('Gemini API Error:', error);
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.error?.message || 'Unknown API error';
                if (status === 401) {
                    throw new Error('Invalid Gemini API key. Please check your settings.');
                }
                else if (status === 429) {
                    throw new Error('Gemini API rate limit exceeded. Please try again later.');
                }
                else {
                    throw new Error(`Gemini API Error (${status}): ${message}`);
                }
            }
            throw new Error(`Failed to generate response: ${error.message}`);
        }
    }
}
// Groq API Provider
class GroqProvider {
    constructor() {
        this.name = 'Groq';
        this.apiKey = '';
        this.baseUrl = 'https://api.groq.com/openai/v1';
        this.updateApiKey();
    }
    updateApiKey() {
        const config = vscode.workspace.getConfiguration('geminiAssistant');
        this.apiKey = config.get('groqApiKey') || '';
    }
    isConfigured() {
        return !!this.apiKey;
    }
    async generateResponse(messages, customContext = []) {
        if (!this.apiKey) {
            throw new Error('Groq API key not configured');
        }
        try {
            const config = vscode.workspace.getConfiguration('geminiAssistant');
            const model = config.get('groqModel') || 'llama-3.3-70b-versatile';
            // Build messages array for Groq (OpenAI format)
            const apiMessages = [];
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
            const response = await axios_1.default.post(`${this.baseUrl}/chat/completions`, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            if (response.data.choices && response.data.choices.length > 0) {
                return response.data.choices[0].message.content;
            }
            throw new Error('No valid response from Groq API');
        }
        catch (error) {
            console.error('Groq API Error:', error);
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.error?.message || 'Unknown API error';
                if (status === 401) {
                    throw new Error('Invalid Groq API key. Please check your settings.');
                }
                else if (status === 429) {
                    throw new Error('Groq API rate limit exceeded. Please try again later.');
                }
                else {
                    throw new Error(`Groq API Error (${status}): ${message}`);
                }
            }
            throw new Error(`Failed to generate response: ${error.message}`);
        }
    }
}
// Main AI Service
class AIService {
    constructor() {
        this.providers = new Map();
        this.agentSystemPrompt = '';
        this.agentTemperature = 0.7;
        // Register providers
        this.providers.set('gemini', new GeminiProvider());
        this.providers.set('groq', new GroqProvider());
        // Set default provider
        this.currentProvider = this.getSelectedProvider();
    }
    setAgentConfig(systemPrompt, temperature) {
        this.agentSystemPrompt = systemPrompt;
        this.agentTemperature = temperature;
    }
    getSelectedProvider() {
        const config = vscode.workspace.getConfiguration('geminiAssistant');
        const providerName = config.get('aiProvider') || 'gemini';
        const provider = this.providers.get(providerName);
        if (!provider) {
            console.warn(`Provider ${providerName} not found, using Gemini`);
            return this.providers.get('gemini');
        }
        return provider;
    }
    updateConfiguration() {
        console.log('Updating AI service configuration');
        // Update all providers
        this.providers.get('gemini')?.updateApiKey();
        this.providers.get('groq')?.updateApiKey();
        // Update current provider
        this.currentProvider = this.getSelectedProvider();
        // Check if current provider is configured
        if (!this.currentProvider.isConfigured()) {
            const providerName = this.currentProvider.name;
            vscode.window.showWarningMessage(`Please set your ${providerName} API key in settings to use the AI assistant.`, 'Open Settings').then(selection => {
                if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'geminiAssistant');
                }
            });
        }
    }
    async generateResponse(messages, customContext = []) {
        console.log(`Generating response using ${this.currentProvider.name}`);
        if (!this.currentProvider.isConfigured()) {
            throw new Error(`${this.currentProvider.name} API key not configured`);
        }
        return await this.currentProvider.generateResponse(messages, customContext);
    }
    isConfigured() {
        return this.currentProvider.isConfigured();
    }
    getCurrentProviderName() {
        return this.currentProvider.name;
    }
}
exports.AIService = AIService;
//# sourceMappingURL=aiService.js.map