/**
 * Vector Store - Handles storage and retrieval of session embeddings
 * Supports multiple backends: local JSON, Chroma, Pinecone
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { SessionIndex, Config } from '../types';
import { configManager } from './config';

interface SearchParams {
  vector: number[];
  limit: number;
  filter?: Record<string, any>;
}

interface SearchResult {
  session: SessionIndex;
  score: number;
}

export class VectorStore {
  private config!: Config['vectorStore'];
  private localData: Map<string, SessionIndex> = new Map();
  private initialized = false;

  async initialize(config: Config['vectorStore']): Promise<void> {
    this.config = config;

    if (config.provider === 'local') {
      await this.loadLocalData();
    }

    this.initialized = true;
  }

  /**
   * Add or update a session in the vector store
   */
  async upsert(session: SessionIndex): Promise<void> {
    if (!this.initialized) await this.initialize(this.config);

    switch (this.config.provider) {
      case 'local':
        await this.upsertLocal(session);
        break;
      case 'chroma':
        await this.upsertChroma(session);
        break;
      case 'pinecone':
        await this.upsertPinecone(session);
        break;
    }
  }

  /**
   * Search for similar sessions
   */
  async search(params: SearchParams): Promise<SearchResult[]> {
    if (!this.initialized) await this.initialize(this.config);

    switch (this.config.provider) {
      case 'local':
        return this.searchLocal(params);
      case 'chroma':
        return this.searchChroma(params);
      case 'pinecone':
        return this.searchPinecone(params);
      default:
        return this.searchLocal(params);
    }
  }

  /**
   * Delete a session from the store
   */
  async delete(sessionId: string): Promise<void> {
    if (!this.initialized) await this.initialize(this.config);

    switch (this.config.provider) {
      case 'local':
        this.localData.delete(sessionId);
        await this.saveLocalData();
        break;
      case 'chroma':
        // TODO: Implement Chroma delete
        break;
      case 'pinecone':
        // TODO: Implement Pinecone delete
        break;
    }
  }

  /**
   * Get all sessions
   */
  async getAll(): Promise<SessionIndex[]> {
    if (!this.initialized) await this.initialize(this.config);

    switch (this.config.provider) {
      case 'local':
        return Array.from(this.localData.values());
      default:
        return [];
    }
  }

  // Local JSON implementation
  private async loadLocalData(): Promise<void> {
    try {
      const indexPath = configManager.getIndexPath();
      const content = await fs.readFile(indexPath, 'utf-8');
      const data = JSON.parse(content);

      this.localData = new Map(
        Object.entries(data.sessions || {}).map(([id, session]) => [
          id,
          session as SessionIndex
        ])
      );
    } catch {
      // Index doesn't exist yet, start fresh
      this.localData = new Map();
    }
  }

  private async saveLocalData(): Promise<void> {
    const indexPath = configManager.getIndexPath();
    await fs.mkdir(path.dirname(indexPath), { recursive: true });

    const data = {
      version: '1.0.0',
      updatedAt: Date.now(),
      sessions: Object.fromEntries(this.localData)
    };

    await fs.writeFile(indexPath, JSON.stringify(data, null, 2));
  }

  private async upsertLocal(session: SessionIndex): Promise<void> {
    this.localData.set(session.id, session);
    await this.saveLocalData();
  }

  private searchLocal(params: SearchParams): SearchResult[] {
    const results: SearchResult[] = [];

    for (const session of this.localData.values()) {
      // Apply filter if specified
      if (params.filter) {
        const matches = Object.entries(params.filter).every(
          ([key, value]) => (session as any)[key] === value
        );
        if (!matches) continue;
      }

      // Calculate cosine similarity
      if (session.embedding) {
        const score = this.cosineSimilarity(params.vector, session.embedding);
        results.push({ session, score });
      }
    }

    // Sort by score descending and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, params.limit);
  }

  // Chroma implementation (placeholder)
  private async upsertChroma(session: SessionIndex): Promise<void> {
    // TODO: Implement ChromaDB integration
    // Requires: npm install chromadb
    throw new Error('Chroma provider not yet implemented');
  }

  private async searchChroma(params: SearchParams): Promise<SearchResult[]> {
    throw new Error('Chroma provider not yet implemented');
  }

  // Pinecone implementation (placeholder)
  private async upsertPinecone(session: SessionIndex): Promise<void> {
    // TODO: Implement Pinecone integration
    // Requires: npm install @pinecone-database/pinecone
    throw new Error('Pinecone provider not yet implemented');
  }

  private async searchPinecone(params: SearchParams): Promise<SearchResult[]> {
    throw new Error('Pinecone provider not yet implemented');
  }

  // Utility: Cosine similarity
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
