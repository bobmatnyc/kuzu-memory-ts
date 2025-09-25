import { RecencyStrategy } from './RecencyStrategy';
import { ImportanceStrategy } from './ImportanceStrategy';
import { FrequencyStrategy } from './FrequencyStrategy';
import { SimilarityStrategy } from './SimilarityStrategy';
import { CompositeStrategy } from './CompositeStrategy';
import type { RecallStrategy } from '../types';

export type RecallStrategyType = 'recency' | 'importance' | 'frequency' | 'similarity' | 'composite';

export interface RecallStrategyOptions {
  type: RecallStrategyType;
  embeddingFunction?: (text: string) => Promise<number[]>;
  strategies?: Array<{
    type: RecallStrategyType;
    weight: number;
  }>;
}

export function createRecallStrategy(options: RecallStrategyOptions): RecallStrategy {
  switch (options.type) {
    case 'recency':
      return new RecencyStrategy();

    case 'importance':
      return new ImportanceStrategy();

    case 'frequency':
      return new FrequencyStrategy();

    case 'similarity':
      return new SimilarityStrategy(options.embeddingFunction);

    case 'composite':
      if (!options.strategies || options.strategies.length === 0) {
        // Default composite strategy with balanced weights
        return new CompositeStrategy([
          { strategy: new RecencyStrategy(), weight: 0.25 },
          { strategy: new ImportanceStrategy(), weight: 0.25 },
          { strategy: new FrequencyStrategy(), weight: 0.25 },
          { strategy: new SimilarityStrategy(options.embeddingFunction), weight: 0.25 },
        ]);
      }

      const strategies = options.strategies.map(s => ({
        strategy: createRecallStrategy({
          type: s.type,
          embeddingFunction: options.embeddingFunction,
        }),
        weight: s.weight,
      }));

      return new CompositeStrategy(strategies);

    default:
      throw new Error(`Unknown recall strategy type: ${options.type}`);
  }
}