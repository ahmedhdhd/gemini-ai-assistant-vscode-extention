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
exports.ContextProvider = exports.ContextItem = void 0;
const vscode = __importStar(require("vscode"));
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