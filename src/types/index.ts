/**
 * Smart Forking System - Type Definitions
 */

export interface Session {
  id: string;
  projectPath: string;
  projectName: string;
  createdAt: number;
  updatedAt: number;
  messages: SessionMessage[];
  summary?: string;
  tags: string[];
  embedding?: number[];
  /**
   * Complete conversation history including both user questions and assistant responses
   */
  conversationHistory?: ConversationTurn[];
}

/**
 * Represents a single turn in the conversation (user + assistant)
 */
export interface ConversationTurn {
  id: string;
  timestamp: number;
  userMessage: {
    content: string;
    metadata?: {
      files?: string[];
      images?: string[];
    };
  };
  assistantMessage?: {
    content: string;
    toolCalls?: ToolCall[];
    metadata?: {
      model?: string;
      tokensUsed?: number;
    };
  };
}

export interface ToolCall {
  id: string;
  type: 'read_file' | 'edit_file' | 'bash' | 'search' | string;
  parameters: Record<string, any>;
  result?: any;
}

export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    codeBlocks?: string[];
    filePaths?: string[];
    commands?: string[];
  };
}

export interface SessionIndex {
  id: string;
  projectPath: string;
  projectName: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  summary: string;
  tags: string[];
  keyTopics: string[];
  embedding: number[];
}

export interface SearchQuery {
  text: string;
  projectPath?: string;
  limit?: number;
  threshold?: number;
}

export interface SearchResult {
  session: SessionIndex;
  score: number;
  matchedMessage?: string;
}

export interface ForkContext {
  sourceSessionId: string;
  targetSessionId: string;
  preservedContext: {
    files: string[];
    environment: Record<string, string>;
    gitBranch?: string;
  };
}

export interface Config {
  vectorStore: {
    provider: 'chroma' | 'pinecone' | 'local';
    dimension: number;
    collectionName: string;
  };
  embedding: {
    provider: 'openai' | 'local' | 'ollama';
    model: string;
    dimension: number;
  };
  storage: {
    sessionsDir: string;
    indexPath: string;
  };
}
