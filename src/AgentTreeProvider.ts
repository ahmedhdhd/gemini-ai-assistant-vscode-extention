import * as vscode from 'vscode';
import { Agent, AgentService } from './AgentService';

export class AgentTreeItem extends vscode.TreeItem {
    constructor(
        public readonly agent: Agent,
        public readonly isActive: boolean
    ) {
        super(agent.name, vscode.TreeItemCollapsibleState.None);
        
        this.description = isActive ? '(Active)' : agent.description;
        this.tooltip = `${agent.name}\n\n${agent.description}\n\nClick to activate`;
        this.contextValue = isActive ? 'activeAgent' : 'agent';
        
        // Set icon
        this.iconPath = new vscode.ThemeIcon(
            isActive ? 'check' : 'circle-outline',
            isActive ? new vscode.ThemeColor('charts.green') : undefined
        );
        
        // Command to activate agent
        this.command = {
            command: 'geminiAssistant.selectAgent',
            title: 'Select Agent',
            arguments: [agent.id]
        };
    }
}

export class AgentTreeProvider implements vscode.TreeDataProvider<AgentTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AgentTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<AgentTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AgentTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    constructor(
        private agentService: AgentService,
        private context: vscode.ExtensionContext
    ) {
        // Register commands
        context.subscriptions.push(
            vscode.commands.registerCommand('geminiAssistant.selectAgent', (agentId: string) => {
                this.selectAgent(agentId);
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('geminiAssistant.createCustomAgent', () => {
                this.createCustomAgent();
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('geminiAssistant.editAgent', (item: AgentTreeItem) => {
                this.editAgent(item.agent.id);
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('geminiAssistant.deleteAgent', (item: AgentTreeItem) => {
                this.deleteAgent(item.agent.id);
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('geminiAssistant.refreshAgents', () => {
                this.refresh();
            })
        );
    }

    getTreeItem(element: AgentTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AgentTreeItem): Thenable<AgentTreeItem[]> {
        if (!element) {
            // Return root items
            const agents = this.agentService.getAllAgents();
            const currentAgent = this.agentService.getCurrentAgent();
            
            const items = agents.map(agent => 
                new AgentTreeItem(agent, agent.id === currentAgent.id)
            );
            
            return Promise.resolve(items);
        }
        
        return Promise.resolve([]);
    }

    private selectAgent(agentId: string): void {
        console.log('Selecting agent:', agentId);
        const success = this.agentService.setCurrentAgent(agentId);
        
        if (success) {
            const agent = this.agentService.getAgent(agentId);
            vscode.window.showInformationMessage(`Switched to ${agent?.name} ${agent?.icon}`);
            this.refresh();
        } else {
            vscode.window.showErrorMessage('Failed to switch agent');
        }
    }

    private async createCustomAgent(): Promise<void> {
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

        if (!name) return;

        // Get agent description
        const description = await vscode.window.showInputBox({
            prompt: 'Enter agent description',
            placeHolder: 'Brief description of what this agent does'
        });

        if (!description) return;

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

        if (!systemPrompt) return;

        // Get icon
        const icon = await vscode.window.showInputBox({
            prompt: 'Enter an emoji icon',
            placeHolder: '🤖',
            value: '🤖'
        });

        // Create agent ID from name
        const id = 'custom-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');

        try {
            const agent: Agent = {
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
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to create agent: ${error.message}`);
        }
    }

    private async editAgent(agentId: string): Promise<void> {
        const agent = this.agentService.getAgent(agentId);
        if (!agent) return;

        const action = await vscode.window.showQuickPick([
            { label: 'Edit Name', value: 'name' },
            { label: 'Edit Description', value: 'description' },
            { label: 'Edit System Prompt', value: 'systemPrompt' },
            { label: 'Edit Icon', value: 'icon' },
            { label: 'Edit Temperature', value: 'temperature' }
        ], {
            placeHolder: `Edit ${agent.name}`
        });

        if (!action) return;

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
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to update agent: ${error.message}`);
        }
    }

    private async deleteAgent(agentId: string): Promise<void> {
        const agent = this.agentService.getAgent(agentId);
        if (!agent) return;

        const confirm = await vscode.window.showWarningMessage(
            `Delete agent "${agent.name}"?`,
            { modal: true },
            'Delete'
        );

        if (confirm === 'Delete') {
            try {
                this.agentService.deleteAgent(agentId);
                vscode.window.showInformationMessage(`Deleted agent: ${agent.name}`);
                this.refresh();
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to delete agent: ${error.message}`);
            }
        }
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}