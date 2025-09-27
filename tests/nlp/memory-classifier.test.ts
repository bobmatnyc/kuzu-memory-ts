import { MemoryClassifier } from '../../src/nlp/MemoryClassifier';
import { createMemoryClient } from '../../src/core/client';

describe('MemoryClassifier', () => {
  let classifier: MemoryClassifier;

  beforeEach(async () => {
    classifier = new MemoryClassifier({
      autoClassify: true,
      autoImportance: true,
      confidenceThreshold: 0.5
    });
    await classifier.init();
  });

  describe('Memory Type Classification', () => {
    it('should classify episodic memories correctly', async () => {
      const episodicTexts = [
        "Yesterday I went to the park with my family",
        "I remember when we first met at the coffee shop",
        "Last week I attended a conference in San Francisco"
      ];

      for (const text of episodicTexts) {
        const result = await classifier.classify(text);
        expect(result.type).toBe('episodic');
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    });

    it('should classify semantic memories correctly', async () => {
      const semanticTexts = [
        "The Earth orbits around the Sun",
        "Water boils at 100 degrees Celsius",
        "JavaScript is a programming language"
      ];

      for (const text of semanticTexts) {
        const result = await classifier.classify(text);
        expect(result.type).toBe('semantic');
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    });

    it('should classify procedural memories correctly', async () => {
      const proceduralTexts = [
        "To make coffee, first boil water, then add grounds",
        "How to tie a tie: start with the wide end on the right",
        "Step 1: Open the application. Step 2: Click on File"
      ];

      for (const text of proceduralTexts) {
        const result = await classifier.classify(text);
        expect(result.type).toBe('procedural');
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    });

    it('should classify working memories correctly', async () => {
      const workingTexts = [
        "Need to finish the report by tomorrow",
        "Don't forget to call mom tonight",
        "Remind me to buy milk on the way home"
      ];

      for (const text of workingTexts) {
        const result = await classifier.classify(text);
        expect(result.type).toBe('working');
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    });

    it('should classify sensory memories correctly', async () => {
      const sensoryTexts = [
        "The coffee smells like fresh roasted beans",
        "It feels smooth and silky to the touch",
        "The music sounds like gentle rain falling"
      ];

      for (const text of sensoryTexts) {
        const result = await classifier.classify(text);
        expect(result.type).toBe('sensory');
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    });

    it('should classify preference memories correctly', async () => {
      const preferenceTexts = [
        "I prefer dark mode over light mode",
        "I like my coffee with two sugars",
        "My favorite color is blue",
        "I don't enjoy crowded places",
        "I always use tabs instead of spaces",
        "I love Italian cuisine",
        "I prefer working from home"
      ];

      for (const text of preferenceTexts) {
        const result = await classifier.classify(text);
        expect(result.type).toBe('preference');
        expect(result.confidence).toBeGreaterThan(0.5);
      }
    });
  });

  describe('Importance Scoring', () => {
    it('should assign high importance to urgent content', async () => {
      const urgentTexts = [
        "URGENT: Critical system failure needs immediate attention",
        "Emergency meeting scheduled for today",
        "Must complete this task ASAP"
      ];

      for (const text of urgentTexts) {
        const result = await classifier.classify(text);
        expect(result.importance).toBeGreaterThan(0.7);
      }
    });

    it('should assign medium importance to normal content', async () => {
      const normalTexts = [
        "Should review the document when possible",
        "Need to check on the project status",
        "Required to submit the form"
      ];

      for (const text of normalTexts) {
        const result = await classifier.classify(text);
        expect(result.importance).toBeGreaterThan(0.4);
        expect(result.importance).toBeLessThan(0.8);
      }
    });

    it('should assign low importance to optional content', async () => {
      const optionalTexts = [
        "Maybe we could meet sometime next week",
        "Perhaps consider this option",
        "Might be worth looking into eventually"
      ];

      for (const text of optionalTexts) {
        const result = await classifier.classify(text);
        expect(result.importance).toBeLessThan(0.5);
      }
    });
  });

  describe('Keyword Extraction', () => {
    it('should extract relevant keywords from content', async () => {
      const text = "The JavaScript programming language is used for web development and creating interactive websites";
      const result = await classifier.classify(text);

      expect(result.keywords).toBeDefined();
      expect(result.keywords!.length).toBeGreaterThan(0);
      expect(result.keywords!.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Sentiment Analysis', () => {
    it('should detect positive sentiment', async () => {
      const positiveText = "I had an amazing experience at the conference, it was wonderful!";
      const result = await classifier.classify(positiveText);

      expect(result.sentiment).toBeDefined();
      expect(result.sentiment!).toBeGreaterThan(0);
    });

    it('should detect negative sentiment', async () => {
      const negativeText = "The service was terrible and disappointing";
      const result = await classifier.classify(negativeText);

      expect(result.sentiment).toBeDefined();
      expect(result.sentiment!).toBeLessThan(0);
    });

    it('should detect neutral sentiment', async () => {
      const neutralText = "The meeting is scheduled for 3 PM";
      const result = await classifier.classify(neutralText);

      expect(result.sentiment).toBeDefined();
      expect(Math.abs(result.sentiment!)).toBeLessThan(0.3);
    });
  });
});

describe('KuzuMemory with NLP Integration', () => {
  it('should automatically classify memory types when NLP is enabled', async () => {
    const memory = await createMemoryClient({
      storage: 'memory',
      nlp: {
        autoClassify: true,
        autoImportance: true,
        confidenceThreshold: 0.6
      }
    });

    // Test episodic memory
    const episodicMemory = await memory.create("Yesterday I went to the park with my family");
    expect(episodicMemory.type).toBe('episodic');

    // Test procedural memory
    const proceduralMemory = await memory.create("To make coffee, first boil water, then add grounds");
    expect(proceduralMemory.type).toBe('procedural');

    // Test semantic memory
    const semanticMemory = await memory.create("The Earth orbits around the Sun");
    expect(semanticMemory.type).toBe('semantic');

    // Verify NLP metadata is included
    expect(episodicMemory.metadata?.nlpClassification).toBeDefined();
    expect(episodicMemory.metadata?.nlpClassification?.confidence).toBeGreaterThan(0.6);
  });

  it('should respect manual type override even with NLP enabled', async () => {
    const memory = await createMemoryClient({
      storage: 'memory',
      nlp: {
        autoClassify: true,
        autoImportance: true
      }
    });

    // Manually set type should override NLP classification
    const manualMemory = await memory.create(
      "Yesterday I went to the park", // Would normally be episodic
      { type: 'semantic' } // Manual override
    );

    expect(manualMemory.type).toBe('semantic');
    // But NLP classification should still be in metadata
    expect(manualMemory.metadata?.nlpClassification?.suggestedType).toBe('episodic');
  });

  it('should auto-set importance based on sentiment and content', async () => {
    const memory = await createMemoryClient({
      storage: 'memory',
      nlp: {
        autoClassify: true,
        autoImportance: true
      }
    });

    // Urgent content should have high importance
    const urgentMemory = await memory.create("URGENT: Must finish this critical task immediately!");
    expect(urgentMemory.importance).toBeGreaterThan(0.7);

    // Normal content should have medium importance
    const normalMemory = await memory.create("The meeting is scheduled for tomorrow");
    expect(normalMemory.importance).toBeGreaterThan(0.3);
    expect(normalMemory.importance).toBeLessThan(0.7);
  });

  it('should add keywords as tags', async () => {
    const memory = await createMemoryClient({
      storage: 'memory',
      nlp: {
        autoClassify: true,
        autoImportance: true
      }
    });

    const mem = await memory.create("JavaScript programming involves writing code for web development");

    // Should have extracted keywords as tags
    expect(mem.tags).toBeDefined();
    expect(mem.tags.length).toBeGreaterThan(0);
  });

  it('should work without NLP when disabled', async () => {
    const memory = await createMemoryClient({
      storage: 'memory',
      nlp: undefined // NLP disabled
    });

    const mem = await memory.create("Yesterday I went to the park");

    // Should use default type
    expect(mem.type).toBe('semantic');
    // Should use default importance
    expect(mem.importance).toBe(0.5);
    // Should not have NLP metadata
    expect(mem.metadata?.nlpClassification).toBeUndefined();
  });
});