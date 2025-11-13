"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatWebviewProvider = void 0;
const vscode = require("vscode");
class ChatWebviewProvider {
    constructor(_extensionUri, geminiService, contextProvider) {
        this._extensionUri = _extensionUri;
        this.geminiService = geminiService;
        this.contextProvider = contextProvider;
        this.messages = [];
        this.suggestions = new Map();
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'sendMessage':
                    this.handleUserMessage(data.message);
                    break;
                case 'acceptSuggestion':
                    this.acceptSuggestion(data.suggestionId);
                    break;
                case 'declineSuggestion':
                    this.declineSuggestion(data.suggestionId);
                    break;
                case 'applySuggestion':
                    this.applySuggestionToEditor(data.suggestionId);
                    break;
            }
        });
    }
    async handleUserMessage(message) {
        if (!message.trim())
            return;
        // Add user message to chat
        const userMessage = {
            role: 'user',
            content: message,
            timestamp: Date.now()
        };
        this.messages.push(userMessage);
        this.updateWebview();
        try {
            // Show loading state
            this.postMessage({
                type: 'setLoading',
                loading: true
            });
            // Get custom context
            const customContext = this.contextProvider.getContextItems();
            // Generate AI response
            const response = await this.geminiService.generateResponse(this.messages, customContext);
            // Add AI response to chat
            const aiMessage = {
                role: 'assistant',
                content: response,
                timestamp: Date.now()
            };
            this.messages.push(aiMessage);
            // Check if response contains code and create suggestions
            this.extractSuggestions(response);
        }
        catch (error) {
            vscode.window.showErrorMessage(`AI Assistant Error: ${error.message}`);
            // Add error message to chat
            const errorMessage = {
                role: 'assistant',
                content: `Sorry, I encountered an error: ${error.message}`,
                timestamp: Date.now()
            };
            this.messages.push(errorMessage);
        }
        finally {
            this.postMessage({
                type: 'setLoading',
                loading: false
            });
            this.updateWebview();
        }
    }
    extractSuggestions(response) {
        // Extract code blocks from the response
        const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
        let match;
        while ((match = codeBlockRegex.exec(response)) !== null) {
            const suggestionId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
            const suggestion = {
                id: suggestionId,
                content: match[2].trim(),
                type: 'code'
            };
            this.suggestions.set(suggestionId, suggestion);
        }
    }
    acceptSuggestion(suggestionId) {
        const suggestion = this.suggestions.get(suggestionId);
        if (suggestion) {
            suggestion.accepted = true;
            this.updateWebview();
            vscode.window.showInformationMessage('Suggestion accepted');
        }
    }
    declineSuggestion(suggestionId) {
        const suggestion = this.suggestions.get(suggestionId);
        if (suggestion) {
            suggestion.declined = true;
            this.updateWebview();
            vscode.window.showInformationMessage('Suggestion declined');
        }
    }
    async applySuggestionToEditor(suggestionId) {
        const suggestion = this.suggestions.get(suggestionId);
        if (!suggestion)
            return;
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor to apply suggestion');
            return;
        }
        const selection = editor.selection;
        await editor.edit(editBuilder => {
            if (selection.isEmpty) {
                // Insert at cursor position
                editBuilder.insert(selection.start, suggestion.content);
            }
            else {
                // Replace selected text
                editBuilder.replace(selection, suggestion.content);
            }
        });
        this.acceptSuggestion(suggestionId);
        vscode.window.showInformationMessage('Suggestion applied to editor');
    }
    updateWebview() {
        if (this._view) {
            this.postMessage({
                type: 'updateChat',
                messages: this.messages,
                suggestions: Array.from(this.suggestions.values()),
                contextCount: this.contextProvider.getContextCount()
            });
        }
    }
    postMessage(message) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }
    _getHtmlForWebview(webview) {
        return `
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gemini Assistant</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            margin: 0;
            padding: 10px;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .chat-container {
            flex: 1;
            overflow-y: auto;
            margin-bottom: 10px;
            padding: 5px;
        }
        
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 5px;
        }
        
        .message.user {
            background-color: var(--vscode-inputValidation-infoBorder);
            margin-left: 20px;
        }
        
        .message.assistant {
            background-color: var(--vscode-editor-selectionBackground);
            margin-right: 20px;
        }
        
        .message-header {
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 0.9em;
            opacity: 0.8;
        }
        
        .suggestion {
            background-color: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-textBlockQuote-border);
            border-radius: 5px;
            margin: 10px 0;
            padding: 10px;
        }
        
        .suggestion-content {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            white-space: pre-wrap;
            margin: 10px 0;
        }
        
        .suggestion-actions {
            display: flex;
            gap: 10px;
        }
        
        .suggestion-actions button {
            padding: 5px 10px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .accept-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        .decline-btn {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .apply-btn {
            background-color: var(--vscode-debugIcon-startForeground);
            color: white;
        }
        
        .accepted {
            opacity: 0.6;
            border-left: 3px solid var(--vscode-debugIcon-startForeground);
        }
        
        .declined {
            opacity: 0.6;
            border-left: 3px solid var(--vscode-errorForeground);
        }
        
        .input-container {
            display: flex;
            gap: 10px;
            margin-top: auto;
        }
        
        #messageInput {
            flex: 1;
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 3px;
        }
        
        #sendButton {
            padding: 10px 15px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
        }
        
        #sendButton:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        #sendButton:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .context-info {
            font-size: 0.8em;
            opacity: 0.7;
            margin-bottom: 10px;
            padding: 5px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 3px;
        }
        
        .loading {
            text-align: center;
            padding: 20px;
            opacity: 0.7;
        }
        
        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 3px;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
        }
        
        code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 2px;
            font-family: var(--vscode-editor-font-family);
        }
    </style>
</head>
<body>
    <div class="chat-container" id="chatContainer">
        <div class="context-info" id="contextInfo">
            Custom context: 0 items
        </div>
        <div class="message assistant">
            <div class="message-header">Gemini Assistant</div>
            Hello! I'm your AI assistant powered by Google Gemini. I can help you with code, answer questions, and provide suggestions. You can add custom context to personalize my responses.
        </div>
    </div>
    
    <div class="input-container">
        <input type="text" id="messageInput" placeholder="Ask me anything..." />
        <button id="sendButton">Send</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let isLoading = false;

        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const contextInfo = document.getElementById('contextInfo');

        function sendMessage() {
            const message = messageInput.value.trim();
            if (message && !isLoading) {
                vscode.postMessage({
                    type: 'sendMessage',
                    message: message
                });
                messageInput.value = '';
            }
        }

        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        function updateChat(messages, suggestions, contextCount) {
            let html = \`<div class="context-info">Custom context: \${contextCount} items</div>\`;
            
            messages.forEach((message, index) => {
                const time = new Date(message.timestamp).toLocaleTimeString();
                html += \`
                    <div class="message \${message.role}">
                        <div class="message-header">\${message.role === 'user' ? 'You' : 'Gemini Assistant'} - \${time}</div>
                        <div>\${formatMessage(message.content)}</div>
                    </div>
                \`;
                
                // Add suggestions after AI messages
                if (message.role === 'assistant') {
                    suggestions.forEach(suggestion => {
                        html += createSuggestionHTML(suggestion);
                    });
                }
            });
            
            chatContainer.innerHTML = html;
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function createSuggestionHTML(suggestion) {
            const statusClass = suggestion.accepted ? 'accepted' : suggestion.declined ? 'declined' : '';
            const statusText = suggestion.accepted ? ' (Accepted)' : suggestion.declined ? ' (Declined)' : '';
            
            let actions = '';
            if (!suggestion.accepted && !suggestion.declined) {
                actions = \`
                    <div class="suggestion-actions">
                        <button class="accept-btn" onclick="acceptSuggestion('\${suggestion.id}')">Accept</button>
                        <button class="apply-btn" onclick="applySuggestion('\${suggestion.id}')">Apply to Editor</button>
                        <button class="decline-btn" onclick="declineSuggestion('\${suggestion.id}')">Decline</button>
                    </div>
                \`;
            }
            
            return \`
                <div class="suggestion \${statusClass}">
                    <strong>Code Suggestion\${statusText}</strong>
                    <div class="suggestion-content">\${suggestion.content}</div>
                    \${actions}
                </div>
            \`;
        }

        function formatMessage(content) {
            // Simple markdown-like formatting for code blocks
            return content
                
                .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
                .replace(/\\n/g, '<br>');
        }

        function acceptSuggestion(suggestionId) {
            vscode.postMessage({
                type: 'acceptSuggestion',
                suggestionId: suggestionId
            });
        }

        function declineSuggestion(suggestionId) {
            vscode.postMessage({
                type: 'declineSuggestion',
                suggestionId: suggestionId
            });
        }

        function applySuggestion(suggestionId) {
            vscode.postMessage({
                type: 'applySuggestion',
                suggestionId: suggestionId
            });
        }

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'updateChat':
                    updateChat(message.messages, message.suggestions, message.contextCount);
                    break;
                case 'setLoading':
                    isLoading = message.loading;
                    sendButton.disabled = isLoading;
                    sendButton.textContent = isLoading ? 'Sending...' : 'Send';
                    
                    if (isLoading) {
                        const loadingDiv = document.createElement('div');
                        loadingDiv.className = 'loading';
                        loadingDiv.id = 'loadingIndicator';
                        loadingDiv.textContent = '🤖 Thinking...';
                        chatContainer.appendChild(loadingDiv);
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    } else {
                        const loadingIndicator = document.getElementById('loadingIndicator');
                        if (loadingIndicator) {
                            loadingIndicator.remove();
                        }
                    }
                    break;
            }
        });

        // Initial focus on input
        messageInput.focus();
    </script>
</body>
</html>

`;
    }
}
exports.ChatWebviewProvider = ChatWebviewProvider;
//# sourceMappingURL=chatWebviewProvider.js.map