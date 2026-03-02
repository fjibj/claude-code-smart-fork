import { EmbeddingService } from '../embedding';

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    service = new EmbeddingService();
  });

  describe('initialize', () => {
    it('should initialize with local provider', async () => {
      await service.initialize({
        provider: 'local',
        model: 'all-MiniLM-L6-v2',
        dimension: 384,
      });
      // Should not throw
    });
  });

  describe('embed', () => {
    beforeEach(async () => {
      await service.initialize({
        provider: 'local',
        model: 'all-MiniLM-L6-v2',
        dimension: 384,
      });
    });

    it('should generate embedding for text', async () => {
      const text = 'This is a test sentence';
      const embedding = await service.embed(text);

      expect(embedding).toBeDefined();
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384);
    });

    it('should generate different embeddings for different texts', async () => {
      const text1 = 'Machine learning';
      const text2 = 'Cooking recipes';

      const embedding1 = await service.embed(text1);
      const embedding2 = await service.embed(text2);

      // Embeddings should be different
      const similarity = cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBeLessThan(0.9);
    });

    it('should generate similar embeddings for similar texts', async () => {
      // Using texts with significant keyword overlap for local embedding
      const text1 = 'implement authentication login user';
      const text2 = 'authentication login user implement';

      const embedding1 = await service.embed(text1);
      const embedding2 = await service.embed(text2);

      const similarity = cosineSimilarity(embedding1, embedding2);
      // Local keyword-based embedding should have high similarity for same words
      expect(similarity).toBeGreaterThan(0.5);
    });

    it('should truncate long text', async () => {
      const longText = 'a '.repeat(10000);
      const embedding = await service.embed(longText);

      expect(embedding).toBeDefined();
      expect(embedding.length).toBe(384);
    });
  });

  describe('embedBatch', () => {
    beforeEach(async () => {
      await service.initialize({
        provider: 'local',
        model: 'all-MiniLM-L6-v2',
        dimension: 384,
      });
    });

    it('should generate embeddings for multiple texts', async () => {
      const texts = ['First text', 'Second text', 'Third text'];
      const embeddings = await service.embedBatch(texts);

      expect(embeddings).toHaveLength(3);
      embeddings.forEach(embedding => {
        expect(embedding.length).toBe(384);
      });
    });
  });
});

// Helper function
function cosineSimilarity(a: number[], b: number[]): number {
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
