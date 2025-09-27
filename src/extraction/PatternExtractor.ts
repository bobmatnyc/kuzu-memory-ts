import type { Pattern, ExtractionResult } from '../types';

export class PatternExtractor {
  private patterns: Map<string, Pattern> = new Map();

  constructor(patterns: Pattern[] = []) {
    for (const pattern of patterns) {
      this.addPattern(pattern);
    }
  }

  addPattern(pattern: Pattern): void {
    this.patterns.set(pattern.id, pattern);
  }

  registerPattern(pattern: Pattern): void {
    this.addPattern(pattern);
  }

  removePattern(patternId: string): void {
    this.patterns.delete(patternId);
  }

  getPattern(patternId: string): Pattern | undefined {
    return this.patterns.get(patternId);
  }

  getAllPatterns(): Pattern[] {
    return Array.from(this.patterns.values()).sort((a, b) =>
      (b.priority || 0) - (a.priority || 0),
    );
  }

  async extract(text: string): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];
    const sortedPatterns = this.getAllPatterns();

    for (const pattern of sortedPatterns) {
      try {
        if (pattern.regex) {
          const regex = new RegExp(pattern.regex, 'gmi');
          const matches = text.matchAll(regex);

          for (const match of matches) {
            // Use first capture group if available, otherwise use full match
            const value = match[1] !== undefined ? match[1].trim() : match[0].trim();
            results.push({
              pattern: pattern.id,
              value: value,
              confidence: 1.0,
              metadata: {
                index: match.index,
                groups: match.groups,
                patternName: pattern.name,
              },
            });
          }
        }

        if (pattern.extractor) {
          try {
            const extracted = pattern.extractor(text);
            if (extracted) {
              results.push({
                pattern: pattern.id,
                value: extracted,
                confidence: 0.9, // Custom extractors have slightly lower confidence
                metadata: {
                  patternName: pattern.name,
                  extractorType: 'custom',
                },
              });
            }
          } catch (error) {
            console.error(`Error in custom extractor for pattern ${pattern.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error extracting pattern ${pattern.id}:`, error);
      }
    }

    return results;
  }

  async extractFirst(text: string, patternId?: string): Promise<ExtractionResult | null> {
    if (patternId) {
      const pattern = this.patterns.get(patternId);
      if (!pattern) return null;

      const results = await this.extractWithPattern(text, pattern);
      return results[0] || null;
    }

    const results = await this.extract(text);
    return results[0] || null;
  }

  private async extractWithPattern(text: string, pattern: Pattern): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];

    try {
      if (pattern.regex) {
        const regex = new RegExp(pattern.regex, 'gmi');
        const matches = text.matchAll(regex);

        for (const match of matches) {
          // Use first capture group if available, otherwise use full match
          const value = match[1] !== undefined ? match[1].trim() : match[0].trim();
          results.push({
            pattern: pattern.id,
            value: value,
            confidence: 1.0,
            metadata: {
              index: match.index,
              groups: match.groups,
              patternName: pattern.name,
            },
          });
        }
      }

      if (pattern.extractor) {
        const extracted = pattern.extractor(text);
        if (extracted) {
          results.push({
            pattern: pattern.id,
            value: extracted,
            confidence: 0.9,
            metadata: {
              patternName: pattern.name,
              extractorType: 'custom',
            },
          });
        }
      }
    } catch (error) {
      console.error(`Error extracting pattern ${pattern.id}:`, error);
    }

    return results;
  }

  // Batch extraction for performance
  async extractBatch(texts: string[]): Promise<Map<string, ExtractionResult[]>> {
    const batchResults = new Map<string, ExtractionResult[]>();

    for (let i = 0; i < texts.length; i++) {
      const results = await this.extract(texts[i]!);
      if (results.length > 0) {
        batchResults.set(i.toString(), results);
      }
    }

    return batchResults;
  }
}
