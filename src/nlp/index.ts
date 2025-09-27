/**
 * NLP module for memory classification and analysis
 */

export { MemoryClassifier } from './MemoryClassifier';
export type { ClassifierConfig, ClassificationResult } from './MemoryClassifier';

export {
  allTrainingData,
  episodicTrainingData,
  semanticTrainingData,
  proceduralTrainingData,
  workingTrainingData,
  sensoryTrainingData,
  memoryTypeIndicators,
  importanceIndicators,
  type TrainingExample,
} from './TrainingData';

// Utility function to create a pre-configured classifier
export function createMemoryClassifier(config?: import('./MemoryClassifier').ClassifierConfig) {
  return new (require('./MemoryClassifier').MemoryClassifier)(config);
}
