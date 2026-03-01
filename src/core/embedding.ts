/**
 * Embedding Service - Generates vector embeddings for text
 * Supports multiple providers: OpenAI, Ollama, and simple keyword-based fallback
 */

import type { Config } from '../types';

export class EmbeddingService {
  private config!: Config['embedding'];
  private initialized = false;

  async initialize(config: Config['embedding']): Promise<void> {
    this.config = config;
    this.initialized = true;
  }

  /**
   * Generate embedding for text
   */
  async embed(text: string): Promise<number[]> {
    if (!this.initialized) await this.initialize(this.config);

    // Truncate long text
    const truncated = text.slice(0, 8000);

    switch (this.config.provider) {
      case 'openai':
        return this.embedOpenAI(truncated);
      case 'ollama':
        return this.embedOllama(truncated);
      case 'local':
      default:
        return this.embedLocal(truncated);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch processing)
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embed(t)));
  }

  private async embedOpenAI(text: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model || 'text-embedding-3-small',
        input: text
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    return data.data[0].embedding;
  }

  private async embedOllama(text: string): Promise<number[]> {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

    const response = await fetch(`${ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model || 'nomic-embed-text',
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json() as { embedding: number[] };
    return data.embedding;
  }

  private async embedLocal(text: string): Promise<number[]> {
    // Simple keyword-based embedding (no external dependencies)
    return this.keywordEmbedding(text);
  }

  /**
   * Simple keyword-based embedding
   * Used when no embedding service is available
   * Creates a bag-of-words style vector
   */
  private keywordEmbedding(text: string): number[] {
    const dimension = this.config.dimension || 384;
    const embedding = new Array(dimension).fill(0);

    // Common stop words to filter out
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
      'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
      'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between',
      'and', 'but', 'or', 'yet', 'so', 'if', 'because', 'although', 'though',
      'unless', 'while', 'where', 'when', 'that', 'which', 'who', 'whom', 'whose',
      'what', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'my', 'your', 'his', 'her', 'its', 'our', 'their']);

    // Extract words and build frequency vector
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w));

    // Use multiple hash functions for better distribution
    words.forEach((word) => {
      // Hash 1: Simple rolling hash
      let hash1 = 0;
      for (let i = 0; i < word.length; i++) {
        hash1 = ((hash1 << 5) - hash1) + word.charCodeAt(i);
        hash1 = hash1 & hash1;
      }

      // Hash 2: FNV-like hash
      let hash2 = 0x811c9dc5;
      for (let i = 0; i < word.length; i++) {
        hash2 ^= word.charCodeAt(i);
        hash2 += (hash2 << 1) + (hash2 << 4) + (hash2 << 7) + (hash2 << 8) + (hash2 << 24);
      }

      // Distribute across vector
      const pos1 = Math.abs(hash1) % dimension;
      const pos2 = Math.abs(hash2) % dimension;

      embedding[pos1] += 1;
      embedding[pos2] += 0.5;
    });

    // Normalize to unit length
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < dimension; i++) {
        embedding[i] /= norm;
      }
    }

    return embedding;
  }
}
