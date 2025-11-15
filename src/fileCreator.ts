import * as vscode from 'vscode';
import * as path from 'path';

export interface FileToCreate {
    filename: string;
    content: string;
    language: string;
}

export class FileCreator {
    
    /**
     * Extract file creation requests from AI response
     * Looks for patterns like "create file.html:" or "save as file.js:"
     */
    public extractFileCreationRequests(response: string): FileToCreate[] {
        const files: FileToCreate[] = [];
        
        // Pattern 1: "create filename.ext:" followed by code block
        const createPattern = /(?:create|save as|make a file)\s+[`'"]*([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+)[`'"]*:?\s*```([a-zA-Z]*)\n([\s\S]*?)```/gi;
        
        let match;
        while ((match = createPattern.exec(response)) !== null) {
            const filename = match[1].trim();
            const language = match[2] || this.detectLanguageFromFilename(filename);
            const content = match[3].trim();
            
            files.push({
                filename,
                content,
                language
            });
        }
        
        // Pattern 2: "filename.ext" followed by code block (more lenient)
        if (files.length === 0) {
            const filenamePattern = /[`'"]*([a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+)[`'"]*:?\s*```([a-zA-Z]*)\n([\s\S]*?)```/gi;
            
            while ((match = filenamePattern.exec(response)) !== null) {
                const filename = match[1].trim();
                const language = match[2] || this.detectLanguageFromFilename(filename);
                const content = match[3].trim();
                
                // Only add if it looks like a reasonable filename
                if (this.isValidFilename(filename)) {
                    files.push({
                        filename,
                        content,
                        language
                    });
                }
            }
        }
        
        return files;
    }
    
    /**
     * Create a file in the workspace
     */
    public async createFile(file: FileToCreate): Promise<boolean> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage('No workspace folder open. Please open a folder first.');
                return false;
            }
            
            // Get workspace root
            const workspaceRoot = workspaceFolders[0].uri;
            
            // Handle relative paths (e.g., "src/index.html")
            const fileUri = vscode.Uri.joinPath(workspaceRoot, file.filename);
            
            // Check if file exists
            try {
                await vscode.workspace.fs.stat(fileUri);
                
                // File exists, ask for confirmation
                const overwrite = await vscode.window.showWarningMessage(
                    `File "${file.filename}" already exists. Overwrite?`,
                    { modal: true },
                    'Overwrite',
                    'Cancel'
                );
                
                if (overwrite !== 'Overwrite') {
                    return false;
                }
            } catch {
                // File doesn't exist, continue
            }
            
            // Create parent directories if needed
            const dirPath = path.dirname(fileUri.fsPath);
            const dirUri = vscode.Uri.file(dirPath);
            
            try {
                await vscode.workspace.fs.createDirectory(dirUri);
            } catch {
                // Directory might already exist
            }
            
            // Write file
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(fileUri, encoder.encode(file.content));
            
            // Open the file
            const document = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(document);
            
            vscode.window.showInformationMessage(`Created file: ${file.filename}`);
            return true;
            
        } catch (error: any) {
            console.error('Error creating file:', error);
            vscode.window.showErrorMessage(`Failed to create file: ${error.message}`);
            return false;
        }
    }
    
    /**
     * Prompt user to create detected files
     */
    public async promptFileCreation(files: FileToCreate[]): Promise<void> {
        if (files.length === 0) return;
        
        if (files.length === 1) {
            // Single file - ask directly
            const file = files[0];
            const create = await vscode.window.showInformationMessage(
                `Create file "${file.filename}"?`,
                'Create',
                'Cancel'
            );
            
            if (create === 'Create') {
                await this.createFile(file);
            }
        } else {
            // Multiple files - show quick pick
            const items = files.map(f => ({
                label: f.filename,
                description: `${f.language} file`,
                file: f
            }));
            
            items.push({
                label: '$(file-add) Create All Files',
                description: `Create all ${files.length} files`,
                file: null as any
            });
            
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: `${files.length} files detected. Select file(s) to create:`
            });
            
            if (!selected) return;
            
            if (selected.label.includes('Create All')) {
                // Create all files
                for (const file of files) {
                    await this.createFile(file);
                }
            } else {
                // Create single file
                await this.createFile(selected.file);
            }
        }
    }
    
    private detectLanguageFromFilename(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        
        const languageMap: { [key: string]: string } = {
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'javascriptreact',
            'tsx': 'typescriptreact',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'json': 'json',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'sql': 'sql',
            'md': 'markdown',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml'
        };
        
        return languageMap[ext] || ext;
    }
    
    private isValidFilename(filename: string): boolean {
        // Check if it looks like a valid filename
        const validPattern = /^[a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+$/;
        return validPattern.test(filename);
    }
}