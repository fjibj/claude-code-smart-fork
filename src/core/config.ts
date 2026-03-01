/**
 * Configuration Manager
 * Handles all configuration settings for the Smart Forking system
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import type { Config } from '../types';

const DEFAULT_CONFIG: Config = {
  vectorStore: {
    provider: 'local',
    dimension: 1536,
    collectionName: 'smart-fork-sessions'
  },
  embedding: {
    provider: 'local',
    model: 'all-MiniLM-L6-v2',
    dimension: 384  // all-MiniLM-L6-v2 produces 384-dimensional embeddings
  },
  storage: {
    sessionsDir: path.join(os.homedir(), '.smart-fork', 'sessions'),
    indexPath: path.join(os.homedir(), '.smart-fork', 'index.json')
  }
};

export class ConfigManager {
  private config: Config;
  private configPath: string;

  constructor() {
    this.configPath = path.join(os.homedir(), '.smart-fork', 'config.json');
    this.config = DEFAULT_CONFIG;
  }

  async load(): Promise<Config> {
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      const userConfig = JSON.parse(content);
      this.config = this.mergeConfig(DEFAULT_CONFIG, userConfig);
    } catch {
      // Config doesn't exist, use defaults
      await this.save();
    }
    return this.config;
  }

  async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.configPath), { recursive: true });
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
  }

  get(): Config {
    return this.config;
  }

  update(partial: Partial<Config>): void {
    this.config = this.mergeConfig(this.config, partial);
  }

  private mergeConfig(base: Config, override: Partial<Config>): Config {
    return {
      vectorStore: { ...base.vectorStore, ...override.vectorStore },
      embedding: { ...base.embedding, ...override.embedding },
      storage: { ...base.storage, ...override.storage }
    };
  }

  getSessionsDir(): string {
    return this.config.storage.sessionsDir;
  }

  getIndexPath(): string {
    return this.config.storage.indexPath;
  }
}

export const configManager = new ConfigManager();
