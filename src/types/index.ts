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
