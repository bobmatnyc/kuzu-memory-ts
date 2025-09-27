import natural from 'natural';
import { MemoryType } from '../types';
import {
  allTrainingData,
  TrainingExample,
  memoryTypeIndicators,
  importanceIndicators,
} from './TrainingData';

/**
 * Configuration options for the memory classifier
 */
export interface ClassifierConfig {
  autoClassify?: boolean;
  autoImportance?: boolean;
  customTrainingData?: TrainingExample[];
  confidenceThreshold?: number; // Minimum confidence to auto-classify (0-1)
}

/**
 * Result from classification
 */
export interface ClassificationResult {
  type: MemoryType;
  confidence: number;
  importance?: number;
  keywords?: string[];
  sentiment?: number;
}

/**
 * NLP-based memory classifier using Natural.js
 */
export class MemoryClassifier {
  private classifier: natural.BayesClassifier;
  private tokenizer: natural.WordTokenizer;
  private tfidf: natural.TfIdf;
  private sentimentAnalyzer: any;
  private stemmer: typeof natural.PorterStemmerIt;
  private config: ClassifierConfig;
  private isInitialized: boolean = false;

  constructor(config: ClassifierConfig = {}) {
    this.config = {
      autoClassify: true,
      autoImportance: true,
      confidenceThreshold: 0.6,
      ...config,
    };

    this.classifier = new natural.BayesClassifier();
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
    this.stemmer = natural.PorterStemmerIt;

    // Natural's sentiment analyzer
    const Analyzer = (natural as any).SentimentAnalyzer;
    this.sentimentAnalyzer = new Analyzer('English', this.stemmer, 'afinn');
  }

  /**
   * Initialize and train the classifier
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    // Train with default data
    const trainingData = this.config.customTrainingData
      ? [...allTrainingData, ...this.config.customTrainingData]
      : allTrainingData;

    trainingData.forEach(example => {
      this.classifier.addDocument(example.text.toLowerCase(), example.type);
    });

    // Train the classifier
    this.classifier.train();

    // Build TF-IDF model from training data
    trainingData.forEach(example => {
      this.tfidf.addDocument(example.text.toLowerCase());
    });

    this.isInitialized = true;
  }

  /**
   * Classify a memory based on its content
   */
  async classify(content: string): Promise<ClassificationResult> {
    if (!this.isInitialized) {
      await this.init();
    }

    const normalizedContent = content.toLowerCase();

    // Get classification with probabilities
    const classifications = this.classifier.getClassifications(normalizedContent);

    // Handle edge case where no classifications are returned
    if (!classifications || classifications.length === 0) {
      return {
        type: 'semantic', // Default to semantic
        confidence: 0.5,
        importance: this.config.autoImportance ? 0.5 : undefined,
        keywords: this.extractKeywords(content),
        sentiment: this.config.autoImportance ? this.analyzeSentiment(content) : undefined,
      };
    }

    const topClassification = classifications[0]!; // We've already checked classifications.length > 0

    // Check for strong indicators
    const typeFromIndicators = this.checkTypeIndicators(normalizedContent);

    // If we have a strong indicator and it matches top classification, boost confidence
    let finalType = topClassification.label as MemoryType;
    let confidence = topClassification.value;

    if (typeFromIndicators && typeFromIndicators === topClassification.label) {
      confidence = Math.min(confidence * 1.2, 1.0); // Boost confidence
    } else if (typeFromIndicators && confidence < 0.7) {
      // If indicator suggests different type and confidence is low, use indicator
      finalType = typeFromIndicators;
      confidence = 0.75;
    }

    const result: ClassificationResult = {
      type: finalType,
      confidence,
    };

    // Calculate importance if enabled
    if (this.config.autoImportance) {
      result.importance = this.calculateImportance(content);
      result.sentiment = this.analyzeSentiment(content);
    }

    // Extract keywords
    result.keywords = this.extractKeywords(content);

    return result;
  }

  /**
   * Check for strong type indicators in the content
   */
  private checkTypeIndicators(content: string): MemoryType | null {
    const contentLower = content.toLowerCase();

    for (const [type, indicators] of Object.entries(memoryTypeIndicators)) {
      const matchCount = indicators.filter(indicator =>
        contentLower.includes(indicator),
      ).length;

      // If we have multiple strong indicators, return this type
      if (matchCount >= 2) {
        return type as MemoryType;
      }
    }

    return null;
  }

  /**
   * Calculate importance score based on content analysis
   */
  private calculateImportance(content: string): number {
    const contentLower = content.toLowerCase();
    let baseImportance = 0.5; // Start with medium importance

    // Check for importance indicators
    const highIndicatorCount = importanceIndicators.high.filter(word =>
      contentLower.includes(word),
    ).length;

    const mediumIndicatorCount = importanceIndicators.medium.filter(word =>
      contentLower.includes(word),
    ).length;

    const lowIndicatorCount = importanceIndicators.low.filter(word =>
      contentLower.includes(word),
    ).length;

    // Adjust based on indicators
    if (highIndicatorCount > 0) {
      baseImportance = Math.min(0.8 + (highIndicatorCount * 0.1), 1.0);
    } else if (mediumIndicatorCount > 0) {
      baseImportance = 0.5 + (mediumIndicatorCount * 0.05);
    } else if (lowIndicatorCount > 0) {
      baseImportance = Math.max(0.3 - (lowIndicatorCount * 0.05), 0.1);
    }

    // Factor in sentiment
    const sentiment = this.analyzeSentiment(content);

    // Strong emotions (positive or negative) increase importance
    const emotionalIntensity = Math.abs(sentiment);
    if (emotionalIntensity > 0.5) {
      baseImportance = Math.min(baseImportance + (emotionalIntensity * 0.2), 1.0);
    }

    // Consider content length (longer content might be more detailed/important)
    const wordCount = this.tokenizer.tokenize(content)?.length || 0;
    if (wordCount > 50) {
      baseImportance = Math.min(baseImportance + 0.1, 1.0);
    }

    // Consider exclamation marks and question marks
    const exclamationCount = (content.match(/!/g) || []).length;
    const questionCount = (content.match(/\?/g) || []).length;

    if (exclamationCount > 0) {
      baseImportance = Math.min(baseImportance + (exclamationCount * 0.05), 1.0);
    }
    if (questionCount > 0) {
      baseImportance = Math.min(baseImportance + (questionCount * 0.03), 1.0);
    }

    return Math.max(0.1, Math.min(1.0, baseImportance));
  }

  /**
   * Analyze sentiment of the content
   * Returns a value between -1 (very negative) and 1 (very positive)
   */
  private analyzeSentiment(content: string): number {
    const tokens = this.tokenizer.tokenize(content);
    if (!tokens || tokens.length === 0) return 0;

    const sentiment = this.sentimentAnalyzer.getSentiment(tokens);

    // Normalize to -1 to 1 range
    return Math.max(-1, Math.min(1, sentiment));
  }

  /**
   * Extract keywords from content using TF-IDF
   */
  private extractKeywords(content: string, maxKeywords: number = 5): string[] {
    const tokens = this.tokenizer.tokenize(content.toLowerCase());
    if (!tokens) return [];

    // Filter out common stop words and short words
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was',
      'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
      'to', 'of', 'in', 'for', 'with', 'by', 'from', 'about', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down',
      'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
      'that', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
      'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
      'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
      'and', 'or', 'but', 'if', 'because', 'as', 'until', 'while',
    ]);

    const meaningfulTokens = tokens.filter(token =>
      token.length > 2 && !stopWords.has(token),
    );

    // Calculate word frequencies
    const wordFreq = new Map<string, number>();
    meaningfulTokens.forEach(token => {
      const stem = this.stemmer.stem(token);
      wordFreq.set(stem, (wordFreq.get(stem) || 0) + 1);
    });

    // Sort by frequency and return top keywords
    const sortedWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);

    return sortedWords;
  }

  /**
   * Batch classify multiple memories
   */
  async classifyBatch(contents: string[]): Promise<ClassificationResult[]> {
    if (!this.isInitialized) {
      await this.init();
    }

    return Promise.all(contents.map(content => this.classify(content)));
  }

  /**
   * Add custom training data and retrain
   */
  async addTrainingData(examples: TrainingExample[]): Promise<void> {
    examples.forEach(example => {
      this.classifier.addDocument(example.text.toLowerCase(), example.type);
      this.tfidf.addDocument(example.text.toLowerCase());
    });

    this.classifier.train();
  }

  /**
   * Get confidence scores for all memory types for a given content
   */
  async getDetailedClassification(content: string): Promise<{
    classifications: Array<{ type: MemoryType; confidence: number }>;
    keywords: string[];
    sentiment: number;
    importance: number;
  }> {
    if (!this.isInitialized) {
      await this.init();
    }

    const classifications = this.classifier.getClassifications(content.toLowerCase())
      .map(c => ({
        type: c.label as MemoryType,
        confidence: c.value,
      }));

    return {
      classifications,
      keywords: this.extractKeywords(content),
      sentiment: this.analyzeSentiment(content),
      importance: this.calculateImportance(content),
    };
  }

  /**
   * Check if classifier should auto-classify based on confidence
   */
  shouldAutoClassify(confidence: number): boolean {
    return (this.config.autoClassify ?? true) &&
           confidence >= (this.config.confidenceThreshold || 0.6);
  }
}
