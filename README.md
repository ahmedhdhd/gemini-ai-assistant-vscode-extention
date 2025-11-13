# Gemini AI Assistant

A Visual Studio Code extension that integrates Google's Gemini AI to provide an interactive AI assistant directly within your editor.

## Features

- 🤖 **AI Chat Interface** - Interactive chat with Gemini AI in a sidebar view
- 💡 **Code Suggestions** - Receive code suggestions that can be accepted, declined, or applied directly to your editor
- 📝 **Custom Context Management** - Add custom context to guide AI responses (e.g., "Use TypeScript", "Follow React best practices")
- ✅ **Approval System** - Review and approve code changes before applying them to your editor
- 🔧 **Configurable Models** - Choose between different Gemini models (gemini-pro, gemini-pro-vision)

## Installation

1. Install the extension from the VS Code Marketplace
2. Reload VS Code when prompted

## Setup

1. Obtain a Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)
2. Open VS Code settings (Ctrl+, or Cmd+,)
3. Search for "Gemini Assistant"
4. Set your API key in the `geminiAssistant.apiKey` setting
5. Optionally configure the model in `geminiAssistant.model` (default: gemini-pro)

## Usage

### Opening the Assistant

- Click the Gemini icon in the activity bar
- Or use the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) and run "Open Gemini Assistant"

### Chatting with AI

1. Type your message in the input box at the bottom of the Gemini Assistant panel
2. Press Enter or click Send to submit your message
3. View the AI response in the chat window

### Managing Custom Context

Custom context helps the AI better understand your preferences and requirements:

- Click the "+" icon in the "Custom Context" view to add context
- Right-click on context items to remove them
- Use the "Clear Context" button to remove all context items

Examples of useful context:
- "Write clean, well-documented TypeScript code"
- "Follow React best practices"
- "Use functional components with hooks"
- "Include error handling in all functions"

### Working with Code Suggestions

When the AI provides code in its response:

1. Code blocks are automatically detected and presented as suggestions
2. You can accept or decline each suggestion
3. Accepted suggestions can be applied directly to your active editor with the "Apply" button

## Extension Settings

This extension contributes the following settings:

- `geminiAssistant.apiKey`: Your Google Gemini API key
- `geminiAssistant.model`: The Gemini model to use (gemini-pro or gemini-pro-vision)

## Commands

- `geminiAssistant.openChat`: Open the Gemini Assistant chat interface
- `geminiAssistant.addContext`: Add custom context
- `geminiAssistant.clearContext`: Clear all custom context
- `geminiAssistant.acceptSuggestion`: Accept a code suggestion
- `geminiAssistant.declineSuggestion`: Decline a code suggestion

## Requirements

- Visual Studio Code 1.74.0 or higher
- Internet connection for API access
- Google Gemini API key

## Development

### Prerequisites

- Node.js (version specified in package.json)
- npm

### Building

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to compile TypeScript files
4. Press `F5` to launch the extension in a new Extension Development Host window

### Watch Mode

Run `npm run watch` to continuously compile TypeScript files as you make changes.

## Architecture

The extension consists of several key components:

- `extension.ts`: Entry point that registers commands and providers
- `geminiService.ts`: Handles communication with the Gemini API
- `contextProvider.ts`: Manages custom context using VS Code's Tree View API
- `chatWebviewProvider.ts`: Implements the chat interface using VS Code's Webview API

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Powered by Google's Gemini AI
- Uses Axios for HTTP requests
- Built with TypeScript and VS Code Extension API