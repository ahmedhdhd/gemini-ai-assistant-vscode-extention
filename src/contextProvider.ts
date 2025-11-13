import * as vscode from 'vscode';

export class ContextItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
    ) {
        super(label, collapsibleState);
        this.tooltip = this.label;
        this.contextValue = 'contextItem';
        
        // Add delete command
        this.command = {
            command: 'geminiAssistant.removeContext',
            title: 'Remove Context',
            arguments: [this.id]
        };
    }
}

export class ContextProvider implements vscode.TreeDataProvider<ContextItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ContextItem | undefined | null | void> = new vscode.EventEmitter<ContextItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ContextItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private contextItems: Map<string, string> = new Map();
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadContext();
        
        // Register remove context command
        context.subscriptions.push(
            vscode.commands.registerCommand('geminiAssistant.removeContext', (id: string) => {
                this.removeContext(id);
            })
        );
    }

    getTreeItem(element: ContextItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ContextItem): Thenable<ContextItem[]> {
        if (!element) {
            // Return root items
            const items: ContextItem[] = [];
            
            this.contextItems.forEach((content, id) => {
                const item = new ContextItem(content, id);
                item.iconPath = new vscode.ThemeIcon('note');
                items.push(item);
            });
            
            return Promise.resolve(items);
        }
        
        return Promise.resolve([]);
    }

    public addContext(content: string): void {
        const id = Date.now().toString();
        this.contextItems.set(id, content);
        this.saveContext();
        this.refresh();
    }

    public removeContext(id: string): void {
        this.contextItems.delete(id);
        this.saveContext();
        this.refresh();
        vscode.window.showInformationMessage('Context item removed');
    }

    public clearContext(): void {
        this.contextItems.clear();
        this.saveContext();
        this.refresh();
    }

    public getContextItems(): string[] {
        return Array.from(this.contextItems.values());
    }

    public getContextCount(): number {
        return this.contextItems.size;
    }

    private refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    private saveContext(): void {
        const contextArray = Array.from(this.contextItems.entries());
        this.context.globalState.update('geminiAssistant.context', contextArray);
    }

    private loadContext(): void {
        const savedContext = this.context.globalState.get<[string, string][]>('geminiAssistant.context');
        if (savedContext) {
            this.contextItems = new Map(savedContext);
        }
    }
}