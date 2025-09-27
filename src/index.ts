// Main entry point for kuzu-memory library
export * from './types';
export * from './storage';
export * from './extraction';
export * from './recall';
export * from './utils';

// NLP module
export {
  MemoryClassifier,
  type ClassifierConfig,
  type ClassificationResult,
} from './nlp/MemoryClassifier';
export {
  allTrainingData,
  episodicTrainingData,
  semanticTrainingData,
  proceduralTrainingData,
  workingTrainingData,
  sensoryTrainingData,
  preferenceTrainingData,
  type TrainingExample,
} from './nlp/TrainingData';

// Core API
export { KuzuMemory } from './core/KuzuMemory';
export { createMemoryClient } from './core/client';

// Version
export const VERSION = '0.1.0';
