import * as vscode from 'vscode';

export interface Agent {
    id: string;
    name: string;
    description: string;
    systemPrompt: string;
    icon: string;
    temperature?: number;
    enabled: boolean;
}

export class AgentService {
    private agents: Map<string, Agent> = new Map();
    private currentAgentId: string = 'default';
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.initializeDefaultAgents();
        this.loadCustomAgents();
        this.loadCurrentAgent();
    }

    private initializeDefaultAgents(): void {
        const defaultAgents: Agent[] = [
            {
                id: 'default',
                name: 'General Assistant',
                description: 'A helpful AI assistant for general programming tasks',
                systemPrompt: 'You are a helpful AI programming assistant. Provide clear, concise, and accurate answers. When writing code, include comments and follow best practices.',
                icon: '🤖',
                temperature: 0.7,
                enabled: true
            },
            {
                id: 'code-reviewer',
                name: 'Code Reviewer',
                description: 'Expert at reviewing code and suggesting improvements',
                systemPrompt: `You are an expert code reviewer. Your role is to:
- Identify bugs, security issues, and performance problems
- Suggest improvements for code quality and maintainability
- Point out violations of best practices
- Recommend better design patterns when applicable
- Be constructive and explain your reasoning
- Prioritize critical issues over minor style preferences`,
                icon: '🔍',
                temperature: 0.5,
                enabled: true
            },
            {
                id: 'debugger',
                name: 'Debug Helper',
                description: 'Specialized in debugging and troubleshooting',
                systemPrompt: `You are a debugging expert. Your role is to:
- Analyze error messages and stack traces
- Identify root causes of bugs
- Suggest debugging strategies
- Provide step-by-step troubleshooting guides
- Explain why bugs occur and how to prevent them
- Be systematic and methodical in your approach`,
                icon: '🐛',
                temperature: 0.4,
                enabled: true
            },
            {
                id: 'architect',
                name: 'Software Architect',
                description: 'Expert in system design and architecture',
                systemPrompt: `You are a software architect. Your role is to:
- Design scalable and maintainable systems
- Suggest appropriate design patterns and architectural styles
- Consider trade-offs between different approaches
- Think about long-term maintainability
- Address cross-cutting concerns (security, performance, scalability)
- Provide high-level guidance on system structure`,
                icon: '🏗️',
                temperature: 0.6,
                enabled: true
            },
            {
                id: 'frontend-expert',
                name: 'Frontend Expert',
                description: 'Specialized in React, Vue, Angular, and modern frontend',
                systemPrompt: `You are a frontend development expert. Your role is to:
- Write modern, performant frontend code (React, Vue, Angular, etc.)
- Follow accessibility best practices (WCAG guidelines)
- Implement responsive designs
- Optimize for performance (lazy loading, code splitting, etc.)
- Use modern CSS techniques (Flexbox, Grid, CSS-in-JS)
- Ensure cross-browser compatibility
- Focus on user experience and usability`,
                icon: '🎨',
                temperature: 0.7,
                enabled: true
            },
            {
                id: 'backend-expert',
                name: 'Backend Expert',
                description: 'Specialized in APIs, databases, and server-side development',
                systemPrompt: `You are a backend development expert. Your role is to:
- Design RESTful and GraphQL APIs
- Implement secure authentication and authorization
- Optimize database queries and schema design
- Handle error handling and logging properly
- Write scalable and maintainable server code
- Consider security best practices (OWASP Top 10)
- Implement proper data validation and sanitization`,
                icon: '⚙️',
                temperature: 0.6,
                enabled: true
            },
            {
                id: 'devops',
                name: 'DevOps Engineer',
                description: 'Expert in CI/CD, Docker, Kubernetes, and cloud infrastructure',
                systemPrompt: `You are a DevOps engineer. Your role is to:
- Set up CI/CD pipelines
- Write Dockerfiles and docker-compose configurations
- Configure Kubernetes deployments
- Implement infrastructure as code (Terraform, CloudFormation)
- Set up monitoring and logging solutions
- Optimize cloud costs and performance
- Ensure security and compliance`,
                icon: '🚀',
                temperature: 0.5,
                enabled: true
            },
            {
                id: 'tester',
                name: 'Test Engineer',
                description: 'Specialized in testing strategies and test automation',
                systemPrompt: `You are a test engineer. Your role is to:
- Write unit tests, integration tests, and e2e tests
- Design test strategies and test plans
- Identify edge cases and corner cases
- Write clear and maintainable test code
- Use appropriate testing frameworks and libraries
- Implement test automation best practices
- Focus on test coverage and quality`,
                icon: '🧪',
                temperature: 0.5,
                enabled: true
            },
            {
                id: 'documentation',
                name: 'Documentation Writer',
                description: 'Expert at writing clear technical documentation',
                systemPrompt: `You are a technical documentation expert. Your role is to:
- Write clear, concise, and comprehensive documentation
- Create well-structured README files
- Write API documentation with examples
- Explain complex concepts in simple terms
- Use proper markdown formatting
- Include code examples and usage instructions
- Consider the target audience (beginners vs experts)`,
                icon: '📝',
                temperature: 0.6,
                enabled: true
            },
            {
                id: 'security',
                name: 'Security Expert',
                description: 'Specialized in security, vulnerabilities, and secure coding',
                systemPrompt: `You are a security expert. Your role is to:
- Identify security vulnerabilities (OWASP Top 10)
- Suggest secure coding practices
- Review authentication and authorization implementations
- Identify potential injection attacks (SQL, XSS, etc.)
- Recommend encryption and data protection strategies
- Consider privacy and compliance requirements (GDPR, etc.)
- Be thorough and prioritize security over convenience`,
                icon: '🔒',
                temperature: 0.4,
                enabled: true
            },
            {
                id: 'creative',
                name: 'Creative Coder',
                description: 'Fun and creative approach to coding challenges',
                systemPrompt: `You are a creative coding assistant. Your role is to:
- Think outside the box and suggest innovative solutions
- Make coding fun and engaging
- Use creative variable names and comments
- Suggest interesting algorithms and approaches
- Be enthusiastic and encouraging
- Explore multiple creative solutions to problems
- Don't be afraid to be unconventional when appropriate`,
                icon: '✨',
                temperature: 0.9,
                enabled: true
            }
        ];

        defaultAgents.forEach(agent => {
            this.agents.set(agent.id, agent);
        });
    }

    private loadCustomAgents(): void {
        const customAgents = this.context.globalState.get<Agent[]>('customAgents', []);
        customAgents.forEach(agent => {
            this.agents.set(agent.id, agent);
        });
    }

    private saveCustomAgents(): void {
        const customAgents = Array.from(this.agents.values()).filter(
            agent => !this.isDefaultAgent(agent.id)
        );
        this.context.globalState.update('customAgents', customAgents);
    }

    private loadCurrentAgent(): void {
        this.currentAgentId = this.context.globalState.get<string>('currentAgentId', 'default');
        // Verify the agent exists
        if (!this.agents.has(this.currentAgentId)) {
            this.currentAgentId = 'default';
        }
    }

    private saveCurrentAgent(): void {
        this.context.globalState.update('currentAgentId', this.currentAgentId);
    }

    private isDefaultAgent(agentId: string): boolean {
        const defaultIds = [
            'default', 'code-reviewer', 'debugger', 'architect',
            'frontend-expert', 'backend-expert', 'devops', 'tester',
            'documentation', 'security', 'creative'
        ];
        return defaultIds.includes(agentId);
    }

    public getAllAgents(): Agent[] {
        return Array.from(this.agents.values()).filter(agent => agent.enabled);
    }

    public getAgent(id: string): Agent | undefined {
        return this.agents.get(id);
    }

    public getCurrentAgent(): Agent {
        return this.agents.get(this.currentAgentId) || this.agents.get('default')!;
    }

    public setCurrentAgent(agentId: string): boolean {
        if (this.agents.has(agentId)) {
            this.currentAgentId = agentId;
            this.saveCurrentAgent();
            return true;
        }
        return false;
    }

    public addCustomAgent(agent: Agent): void {
        // Ensure unique ID
        if (this.agents.has(agent.id)) {
            throw new Error(`Agent with ID '${agent.id}' already exists`);
        }

        this.agents.set(agent.id, agent);
        this.saveCustomAgents();
    }

    public updateAgent(agentId: string, updates: Partial<Agent>): boolean {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return false;
        }

        // Don't allow updating default agents
        if (this.isDefaultAgent(agentId)) {
            throw new Error('Cannot modify default agents');
        }

        Object.assign(agent, updates);
        this.saveCustomAgents();
        return true;
    }

    public deleteAgent(agentId: string): boolean {
        // Don't allow deleting default agents
        if (this.isDefaultAgent(agentId)) {
            throw new Error('Cannot delete default agents');
        }

        const deleted = this.agents.delete(agentId);
        if (deleted) {
            this.saveCustomAgents();
            
            // If deleted agent was current, switch to default
            if (this.currentAgentId === agentId) {
                this.currentAgentId = 'default';
                this.saveCurrentAgent();
            }
        }
        return deleted;
    }

    public toggleAgentEnabled(agentId: string): boolean {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return false;
        }

        agent.enabled = !agent.enabled;
        
        if (!this.isDefaultAgent(agentId)) {
            this.saveCustomAgents();
        }

        return true;
    }

    public getSystemPromptForCurrentAgent(): string {
        return this.getCurrentAgent().systemPrompt;
    }

    public getTemperatureForCurrentAgent(): number {
        return this.getCurrentAgent().temperature || 0.7;
    }
}