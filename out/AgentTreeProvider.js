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
exports.AgentTreeProvider = exports.AgentTreeItem = void 0;
const vscode = __importStar(require("vscode"));
class AgentTreeItem extends vscode.TreeItem {
    constructor(agent, isActive) {
        super(agent.name, vscode.TreeItemCollapsibleState.None);
        this.agent = agent;
        this.isActive = isActive;
        this.description = isActive ? '(Active)' : agent.description;
        this.tooltip = `${agent.name}\n\n${agent.description}\n\nClick to activate`;
        this.contextValue = isActive ? 'activeAgent' : 'agent';
        // Set icon
        this.iconPath = new vscode.ThemeIcon(isActive ? 'check' : 'circle-outline', isActive ? new vscode.ThemeColor('charts.green') : undefined);
        // Command to activate agent
        this.command = {
            command: 'geminiAssistant.selectAgent',
            title: 'Select Agent',
            arguments: [agent.id]
        };
    }
}
exports.AgentTreeItem = AgentTreeItem;
class AgentTreeProvider {
    constructor(agentService, context) {
        this.agentService = agentService;
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        // Register commands
        context.subscriptions.push(vscode.commands.registerCommand('geminiAssistant.selectAgent', (agentId) => {
            this.selectAgent(agentId);
        }));
        context.subscriptions.push(vscode.commands.registerCommand('geminiAssistant.createCustomAgent', () => {
            this.createCustomAgent();
        }));
        context.subscriptions.push(vscode.commands.registerCommand('geminiAssistant.editAgent', (item) => {
            this.editAgent(item.agent.id);
        }));
        context.subscriptions.push(vscode.commands.registerCommand('geminiAssistant.deleteAgent', (item) => {
            this.deleteAgent(item.agent.id);
        }));
        context.subscriptions.push(vscode.commands.registerCommand('geminiAssistant.refreshAgents', () => {
            this.refresh();
        }));
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Return root items
            const agents = this.agentService.getAllAgents();
            const currentAgent = this.agentService.getCurrentAgent();
            const items = agents.map(agent => new AgentTreeItem(agent, agent.id === currentAgent.id));
            return Promise.resolve(items);
        }
        return Promise.resolve([]);
    }
    selectAgent(agentId) {
        console.log('Selecting agent:', agentId);
        const success = this.agentService.setCurrentAgent(agentId);
        if (success) {
            const agent = this.agentService.getAgent(agentId);
            vscode.window.showInformationMessage(`Switched to ${agent?.name} ${agent?.icon}`);
            this.refresh();
        }
        else {
            vscode.window.showErrorMessage('Failed to switch agent');
        }
    }
    async createCustomAgent() {
        console.log('Creating custom agent');
        // Get agent name
        const name = await vscode.window.showInputBox({
            prompt: 'Enter agent name',
            placeHolder: 'e.g., Python Expert, React Specialist',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Name cannot be empty';
                }
                return null;
            }
        });
        if (!name)
            return;
        // Get agent description
        const description = await vscode.window.showInputBox({
            prompt: 'Enter agent description',
            placeHolder: 'Brief description of what this agent does'
        });
        if (!description)
            return;
        // Get system prompt
        const systemPrompt = await vscode.window.showInputBox({
            prompt: 'Enter system prompt (defines agent behavior)',
            placeHolder: 'You are an expert in...',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'System prompt cannot be empty';
                }
                return null;
            }
        });
        if (!systemPrompt)
            return;
        // Get icon
        const icon = await vscode.window.showInputBox({
            prompt: 'Enter an emoji icon',
            placeHolder: '🤖',
            value: '🤖'
        });
        // Create agent ID from name
        const id = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        try {
            const agent = {
                id,
                name: name.trim(),
                description: description?.trim() || '',
                systemPrompt: systemPrompt.trim(),
                icon: icon?.trim() || '🤖',
                temperature: 0.7,
                enabled: true
            };
            this.agentService.addCustomAgent(agent);
            vscode.window.showInformationMessage(`Created agent: ${agent.name} ${agent.icon}`);
            this.refresh();
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to create agent: ${error.message}`);
        }
    }
    async editAgent(agentId) {
        const agent = this.agentService.getAgent(agentId);
        if (!agent)
            return;
        const action = await vscode.window.showQuickPick([
            { label: 'Edit Name', value: 'name' },
            { label: 'Edit Description', value: 'description' },
            { label: 'Edit System Prompt', value: 'systemPrompt' },
            { label: 'Edit Icon', value: 'icon' },
            { label: 'Edit Temperature', value: 'temperature' }
        ], {
            placeHolder: `Edit ${agent.name}`
        });
        if (!action)
            return;
        try {
            switch (action.value) {
                case 'name': {
                    const name = await vscode.window.showInputBox({
                        prompt: 'Enter new name',
                        value: agent.name
                    });
                    if (name) {
                        this.agentService.updateAgent(agentId, { name: name.trim() });
                    }
                    break;
                }
                case 'description': {
                    const description = await vscode.window.showInputBox({
                        prompt: 'Enter new description',
                        value: agent.description
                    });
                    if (description !== undefined) {
                        this.agentService.updateAgent(agentId, { description: description.trim() });
                    }
                    break;
                }
                case 'systemPrompt': {
                    const systemPrompt = await vscode.window.showInputBox({
                        prompt: 'Enter new system prompt',
                        value: agent.systemPrompt
                    });
                    if (systemPrompt) {
                        this.agentService.updateAgent(agentId, { systemPrompt: systemPrompt.trim() });
                    }
                    break;
                }
                case 'icon': {
                    const icon = await vscode.window.showInputBox({
                        prompt: 'Enter new emoji icon',
                        value: agent.icon
                    });
                    if (icon) {
                        this.agentService.updateAgent(agentId, { icon: icon.trim() });
                    }
                    break;
                }
                case 'temperature': {
                    const temp = await vscode.window.showInputBox({
                        prompt: 'Enter temperature (0.0 - 1.0)',
                        value: agent.temperature?.toString() || '0.7',
                        validateInput: (value) => {
                            const num = parseFloat(value);
                            if (isNaN(num) || num < 0 || num > 1) {
                                return 'Temperature must be between 0.0 and 1.0';
                            }
                            return null;
                        }
                    });
                    if (temp) {
                        this.agentService.updateAgent(agentId, { temperature: parseFloat(temp) });
                    }
                    break;
                }
            }
            vscode.window.showInformationMessage('Agent updated successfully');
            this.refresh();
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to update agent: ${error.message}`);
        }
    }
    async deleteAgent(agentId) {
        const agent = this.agentService.getAgent(agentId);
        if (!agent)
            return;
        const confirm = await vscode.window.showWarningMessage(`Delete agent "${agent.name}"?`, { modal: true }, 'Delete');
        if (confirm === 'Delete') {
            try {
                this.agentService.deleteAgent(agentId);
                vscode.window.showInformationMessage(`Deleted agent: ${agent.name}`);
                this.refresh();
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to delete agent: ${error.message}`);
            }
        }
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
}
exports.AgentTreeProvider = AgentTreeProvider;
//# sourceMappingURL=AgentTreeProvider.js.map