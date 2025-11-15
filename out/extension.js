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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const chatWebviewProvider_1 = require("./chatWebviewProvider");
const contextProvider_1 = require("./contextProvider");
const aiService_1 = require("./aiService");
const AgentService_1 = require("./AgentService");
const AgentTreeProvider_1 = require("./AgentTreeProvider");
let chatProvider;
let contextProvider;
let aiService;
let agentService;
let agentTreeProvider;
function activate(context) {
    console.log('=== Gemini AI Assistant is activating ===');
    // Initialize services
    aiService = new aiService_1.AIService();
    agentService = new AgentService_1.AgentService(context);
    contextProvider = new contextProvider_1.ContextProvider(context);
    // Update AI service with current agent configuration
    updateAIServiceWithAgent();
    chatProvider = new chatWebviewProvider_1.ChatWebviewProvider(context.extensionUri, aiService, contextProvider, agentService);
    agentTreeProvider = new AgentTreeProvider_1.AgentTreeProvider(agentService, context);
    console.log('Services initialized');
    // Register webview provider for chat
    const webviewProvider = vscode.window.registerWebviewViewProvider('geminiChat', chatProvider, {
        webviewOptions: {
            retainContextWhenHidden: true
        }
    });
    context.subscriptions.push(webviewProvider);
    console.log('Chat webview provider registered');
    // Register tree data provider for context
    const treeProvider = vscode.window.registerTreeDataProvider('geminiContext', contextProvider);
    context.subscriptions.push(treeProvider);
    console.log('Context tree provider registered');
    // Register tree data provider for agents
    const agentTree = vscode.window.registerTreeDataProvider('geminiAgents', agentTreeProvider);
    context.subscriptions.push(agentTree);
    console.log('Agent tree provider registered');
    // Helper function to update AI service with agent config
    function updateAIServiceWithAgent() {
        const currentAgent = agentService.getCurrentAgent();
        aiService.setAgentConfig(currentAgent.systemPrompt, currentAgent.temperature || 0.7);
        console.log('AI service updated with agent:', currentAgent.name);
    }
    // Register command: Open Chat
    const openChatCmd = vscode.commands.registerCommand('geminiAssistant.openChat', () => {
        console.log('openChat command executed');
        vscode.commands.executeCommand('workbench.view.extension.geminiAssistant');
    });
    context.subscriptions.push(openChatCmd);
    console.log('openChat command registered');
    // Register command: Add Context
    const addContextCmd = vscode.commands.registerCommand('geminiAssistant.addContext', async () => {
        console.log('addContext command executed');
        try {
            const input = await vscode.window.showInputBox({
                prompt: 'Enter custom context',
                placeHolder: 'e.g., "Use TypeScript interfaces", "Follow React best practices"',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Context cannot be empty';
                    }
                    return null;
                }
            });
            if (input && input.trim()) {
                contextProvider.addContext(input.trim());
                vscode.window.showInformationMessage('Context added successfully!');
                console.log('Context added:', input);
            }
            else {
                console.log('Context input cancelled or empty');
            }
        }
        catch (error) {
            console.error('Error in addContext command:', error);
            vscode.window.showErrorMessage('Failed to add context: ' + error);
        }
    });
    context.subscriptions.push(addContextCmd);
    console.log('addContext command registered');
    // Register command: Clear Context
    const clearContextCmd = vscode.commands.registerCommand('geminiAssistant.clearContext', () => {
        console.log('clearContext command executed');
        try {
            contextProvider.clearContext();
            vscode.window.showInformationMessage('Context cleared!');
        }
        catch (error) {
            console.error('Error in clearContext command:', error);
            vscode.window.showErrorMessage('Failed to clear context: ' + error);
        }
    });
    context.subscriptions.push(clearContextCmd);
    console.log('clearContext command registered');
    // Register command: Remove Context (called from tree items)
    const removeContextCmd = vscode.commands.registerCommand('geminiAssistant.removeContext', (id) => {
        console.log('removeContext command executed for id:', id);
        try {
            contextProvider.removeContext(id);
        }
        catch (error) {
            console.error('Error in removeContext command:', error);
            vscode.window.showErrorMessage('Failed to remove context: ' + error);
        }
    });
    context.subscriptions.push(removeContextCmd);
    console.log('removeContext command registered');
    // Register command: Accept Suggestion
    const acceptSuggestionCmd = vscode.commands.registerCommand('geminiAssistant.acceptSuggestion', (suggestionId) => {
        console.log('acceptSuggestion command executed for id:', suggestionId);
        try {
            chatProvider.acceptSuggestion(suggestionId);
        }
        catch (error) {
            console.error('Error in acceptSuggestion command:', error);
            vscode.window.showErrorMessage('Failed to accept suggestion: ' + error);
        }
    });
    context.subscriptions.push(acceptSuggestionCmd);
    console.log('acceptSuggestion command registered');
    // Register command: Decline Suggestion
    const declineSuggestionCmd = vscode.commands.registerCommand('geminiAssistant.declineSuggestion', (suggestionId) => {
        console.log('declineSuggestion command executed for id:', suggestionId);
        try {
            chatProvider.declineSuggestion(suggestionId);
        }
        catch (error) {
            console.error('Error in declineSuggestion command:', error);
            vscode.window.showErrorMessage('Failed to decline suggestion: ' + error);
        }
    });
    context.subscriptions.push(declineSuggestionCmd);
    console.log('declineSuggestion command registered');
    // Listen for configuration changes
    const configChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('geminiAssistant.geminiApiKey') ||
            e.affectsConfiguration('geminiAssistant.groqApiKey') ||
            e.affectsConfiguration('geminiAssistant.aiProvider') ||
            e.affectsConfiguration('geminiAssistant.geminiModel') ||
            e.affectsConfiguration('geminiAssistant.groqModel')) {
            console.log('AI configuration changed');
            aiService.updateConfiguration();
            updateAIServiceWithAgent();
        }
    });
    context.subscriptions.push(configChangeListener);
    console.log('Configuration change listener registered');
    // Listen for agent selection changes
    context.subscriptions.push(vscode.commands.registerCommand('geminiAssistant.onAgentChanged', () => {
        updateAIServiceWithAgent();
        chatProvider.updateWebviewWithAgentInfo();
        agentTreeProvider.refresh();
    }));
    console.log('=== Gemini AI Assistant activated successfully ===');
    console.log('Registered commands:', [
        'geminiAssistant.openChat',
        'geminiAssistant.addContext',
        'geminiAssistant.clearContext',
        'geminiAssistant.removeContext',
        'geminiAssistant.acceptSuggestion',
        'geminiAssistant.declineSuggestion'
    ]);
}
exports.activate = activate;
function deactivate() {
    console.log('Gemini AI Assistant deactivated');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map