"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const chatWebviewProvider_1 = require("./chatWebviewProvider");
const contextProvider_1 = require("./contextProvider");
const geminiService_1 = require("./geminiService");
let chatProvider;
let contextProvider;
let geminiService;
function activate(context) {
    console.log('Gemini AI Assistant is now active!');
    geminiService = new geminiService_1.GeminiService();
    contextProvider = new contextProvider_1.ContextProvider(context);
    chatProvider = new chatWebviewProvider_1.ChatWebviewProvider(context.extensionUri, geminiService, contextProvider);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('geminiChat', chatProvider, {
        webviewOptions: {
            retainContextWhenHidden: true
        }
    }));
    // Register tree data provider
    vscode.window.registerTreeDataProvider('geminiContext', contextProvider);
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('geminiAssistant.openChat', () => {
        vscode.commands.executeCommand('workbench.view.extension.geminiAssistant');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('geminiAssistant.addContext', async () => {
        const input = await vscode.window.showInputBox({
            prompt: 'Enter custom context',
            placeHolder: 'e.g., "Use TypeScript interfaces", "Follow React best practices"'
        });
        if (input) {
            contextProvider.addContext(input);
            vscode.window.showInformationMessage('Context added successfully!');
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('geminiAssistant.clearContext', () => {
        contextProvider.clearContext();
        vscode.window.showInformationMessage('Context cleared!');
    }));
    context.subscriptions.push(vscode.commands.registerCommand('geminiAssistant.acceptSuggestion', (suggestionId) => {
        chatProvider.acceptSuggestion(suggestionId);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('geminiAssistant.declineSuggestion', (suggestionId) => {
        chatProvider.declineSuggestion(suggestionId);
    }));
    // Listen for configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('geminiAssistant.apiKey')) {
            geminiService.updateApiKey();
        }
    }));
}
exports.activate = activate;
function deactivate() {
    console.log('Gemini AI Assistant deactivated');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map