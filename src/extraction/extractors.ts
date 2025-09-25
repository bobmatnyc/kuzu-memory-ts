import type { Pattern } from '../types';

// Custom extractor functions for complex patterns

export function createSentenceExtractor(): Pattern {
  return {
    id: 'sentences',
    name: 'Sentence Extractor',
    description: 'Extracts individual sentences from text',
    priority: 3,
    extractor: (text: string) => {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
      return sentences.map(s => s.trim()).filter(s => s.length > 0);
    },
  };
}

export function createKeywordExtractor(keywords: string[]): Pattern {
  return {
    id: 'keywords',
    name: 'Keyword Extractor',
    description: 'Extracts specified keywords from text',
    priority: 5,
    extractor: (text: string) => {
      const found: string[] = [];
      const lowerText = text.toLowerCase();

      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          found.push(keyword);
        }
      }

      return found.length > 0 ? found : null;
    },
  };
}

export function createEntityExtractor(entityTypes: string[] = ['PERSON', 'LOCATION', 'ORGANIZATION']): Pattern {
  return {
    id: 'entities',
    name: 'Entity Extractor',
    description: 'Extracts named entities from text',
    priority: 6,
    extractor: (text: string) => {
      // Simple heuristic-based entity extraction
      // In production, you'd want to use NLP libraries
      const entities: Record<string, string[]> = {};

      // Look for capitalized words (simple person/org detection)
      const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];

      if (entityTypes.includes('PERSON') || entityTypes.includes('ORGANIZATION')) {
        entities.names = capitalizedWords;
      }

      // Look for location patterns
      if (entityTypes.includes('LOCATION')) {
        const locationPatterns = text.match(/\b(?:in|at|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g) || [];
        entities.locations = locationPatterns.map(loc => loc.replace(/^(in|at|from|to)\s+/, ''));
      }

      return Object.keys(entities).length > 0 ? entities : null;
    },
  };
}

export function createQuestionExtractor(): Pattern {
  return {
    id: 'questions',
    name: 'Question Extractor',
    description: 'Extracts questions from text',
    priority: 4,
    extractor: (text: string) => {
      const questions = text.match(/[^.!?]*\?/g) || [];
      return questions.map(q => q.trim()).filter(q => q.length > 0);
    },
  };
}

export function createCodeSnippetExtractor(languages: string[] = []): Pattern {
  return {
    id: 'code_snippets',
    name: 'Code Snippet Extractor',
    description: 'Extracts code snippets with language detection',
    priority: 5,
    extractor: (text: string) => {
      const codeBlocks: Array<{ language: string; code: string }> = [];

      // Extract fenced code blocks with language
      const fencedRegex = /```(\w+)?\n([\s\S]*?)```/g;
      let match;

      while ((match = fencedRegex.exec(text)) !== null) {
        const language = match[1] || 'unknown';
        const code = match[2]?.trim();

        if (code && (languages.length === 0 || languages.includes(language))) {
          codeBlocks.push({ language, code });
        }
      }

      // Extract inline code
      const inlineCode = text.match(/`([^`]+)`/g) || [];
      for (const code of inlineCode) {
        codeBlocks.push({
          language: 'inline',
          code: code.slice(1, -1),
        });
      }

      return codeBlocks.length > 0 ? codeBlocks : null;
    },
  };
}

export function createTaskExtractor(): Pattern {
  return {
    id: 'tasks',
    name: 'Task Extractor',
    description: 'Extracts TODO items and tasks',
    priority: 6,
    extractor: (text: string) => {
      const tasks: Array<{ task: string; completed: boolean }> = [];

      // Markdown task lists
      const mdTasks = text.matchAll(/^[\s]*[-*]\s+\[([ x])\]\s+(.+)$/gm);
      for (const match of mdTasks) {
        tasks.push({
          task: match[2]!.trim(),
          completed: match[1] === 'x',
        });
      }

      // TODO comments
      const todoComments = text.matchAll(/(?:TODO|FIXME|NOTE):\s*(.+)/gi);
      for (const match of todoComments) {
        tasks.push({
          task: match[1]!.trim(),
          completed: false,
        });
      }

      return tasks.length > 0 ? tasks : null;
    },
  };
}

export function createMetadataExtractor(): Pattern {
  return {
    id: 'metadata',
    name: 'Metadata Extractor',
    description: 'Extracts metadata from structured text (YAML frontmatter, JSON, etc.)',
    priority: 7,
    extractor: (text: string) => {
      const metadata: Record<string, any> = {};

      // YAML frontmatter
      const yamlMatch = text.match(/^---\n([\s\S]*?)\n---/);
      if (yamlMatch) {
        // Simple key-value parsing (not full YAML)
        const lines = yamlMatch[1]!.split('\n');
        for (const line of lines) {
          const kvMatch = line.match(/^(\w+):\s*(.+)$/);
          if (kvMatch) {
            metadata[kvMatch[1]!] = kvMatch[2]!.trim();
          }
        }
      }

      // JSON blocks
      const jsonMatch = text.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          Object.assign(metadata, parsed);
        } catch {
          // Invalid JSON, skip
        }
      }

      return Object.keys(metadata).length > 0 ? metadata : null;
    },
  };
}