"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextProvider = exports.ContextItem = void 0;
const vscode = require("vscode");
class ContextItem extends vscode.TreeItem {
    constructor(label, id, collapsibleState = vscode.TreeItemCollapsibleState.None) {
        super(label, collapsibleState);
        this.label = label;
        this.id = id;
        this.collapsibleState = collapsibleState;
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
exports.ContextItem = ContextItem;
class ContextProvider {
    constructor(context) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.contextItems = new Map();
        this.context = context;
        this.loadContext();
        // Register remove context command
        context.subscriptions.push(vscode.commands.registerCommand('geminiAssistant.removeContext', (id) => {
            this.removeContext(id);
        }));
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Return root items
            const items = [];
            this.contextItems.forEach((content, id) => {
                const item = new ContextItem(content, id);
                item.iconPath = new vscode.ThemeIcon('note');
                items.push(item);
            });
            return Promise.resolve(items);
        }
        return Promise.resolve([]);
    }
    addContext(content) {
        const id = Date.now().toString();
        this.contextItems.set(id, content);
        this.saveContext();
        this.refresh();
    }
    removeContext(id) {
        this.contextItems.delete(id);
        this.saveContext();
        this.refresh();
        vscode.window.showInformationMessage('Context item removed');
    }
    clearContext() {
        this.contextItems.clear();
        this.saveContext();
        this.refresh();
    }
    getContextItems() {
        return Array.from(this.contextItems.values());
    }
    getContextCount() {
        return this.contextItems.size;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    saveContext() {
        const contextArray = Array.from(this.contextItems.entries());
        this.context.globalState.update('geminiAssistant.context', contextArray);
    }
    loadContext() {
        const savedContext = this.context.globalState.get('geminiAssistant.context');
        if (savedContext) {
            this.contextItems = new Map(savedContext);
        }
    }
}
exports.ContextProvider = ContextProvider;
//# sourceMappingURL=contextProvider.js.map