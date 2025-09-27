# NLP Features in Kuzu Memory

Kuzu Memory includes built-in Natural Language Processing (NLP) capabilities for automatic memory classification and importance scoring using Natural.js.

## Features

### 1. Automatic Memory Type Classification
The library can automatically classify memories into six types based on their content:
- **Episodic**: Personal experiences and events with temporal references
- **Semantic**: Facts, knowledge, and definitions
- **Procedural**: Instructions, how-to information, and step-by-step guides
- **Working**: Current tasks, todos, and temporary information
- **Sensory**: Descriptions of sensory experiences (sight, sound, smell, taste, touch)
- **Preference**: User preferences, settings, and personal choices

### 2. Automatic Importance Scoring
Based on sentiment analysis and content indicators, the system can automatically assign importance scores (0-1) to memories.

### 3. Keyword Extraction
Extracts relevant keywords from memory content and adds them as tags for better searchability.

### 4. Sentiment Analysis
Analyzes the emotional tone of memories to help with importance scoring.

## Setup

```typescript
import { createMemoryClient } from 'kuzu-memory';

const memory = await createMemoryClient({
  storage: 'indexeddb',
  nlp: {
    autoClassify: true,        // Enable automatic classification
    autoImportance: true,      // Enable automatic importance scoring
    confidenceThreshold: 0.6,  // Minimum confidence for auto-classification
    customTrainingData: [      // Optional: Add custom training examples
      { text: "Our team meeting is at 3pm", type: "working" },
      { text: "The project uses React", type: "semantic" }
    ]
  }
});
```

## Usage Examples

### Basic Auto-Classification

```typescript
// Automatically classified as 'episodic'
const memory1 = await memory.create("Yesterday I went to the park with my family");
console.log(memory1.type); // 'episodic'

// Automatically classified as 'procedural'
const memory2 = await memory.create("To make coffee, first boil water, then add grounds");
console.log(memory2.type); // 'procedural'

// Automatically classified as 'semantic'
const memory3 = await memory.create("The Earth orbits around the Sun");
console.log(memory3.type); // 'semantic'

// Automatically classified as 'preference'
const memory4 = await memory.create("I prefer dark mode over light mode");
console.log(memory4.type); // 'preference'
```

### Manual Override

```typescript
// Override automatic classification
const memory = await memory.create(
  "I went to the store yesterday", // Would be 'episodic'
  { type: 'working' }               // Manual override
);
console.log(memory.type); // 'working'
console.log(memory.metadata.nlpClassification.suggestedType); // 'episodic'
```

### Importance Scoring

```typescript
// High importance (urgent content)
const urgent = await memory.create("URGENT: Critical bug needs immediate fix!");
console.log(urgent.importance); // ~0.8-0.9

// Medium importance
const normal = await memory.create("Should review the documentation");
console.log(normal.importance); // ~0.5-0.6

// Low importance
const low = await memory.create("Maybe look into this someday");
console.log(low.importance); // ~0.2-0.3
```

### Direct Classification

```typescript
// Classify without creating a memory
const classification = await memory.classifyMemory(
  "Remember to buy milk on the way home"
);

console.log(classification);
// {
//   type: 'working',
//   confidence: 0.75,
//   importance: 0.6,
//   keywords: ['remember', 'buy', 'milk'],
//   sentiment: 0.1
// }
```

### Detailed Classification

```typescript
const details = await memory.getDetailedClassification(
  "The JavaScript framework React is used for building user interfaces"
);

console.log(details);
// {
//   classifications: [
//     { type: 'semantic', confidence: 0.85 },
//     { type: 'procedural', confidence: 0.10 },
//     { type: 'episodic', confidence: 0.03 },
//     { type: 'working', confidence: 0.01 },
//     { type: 'sensory', confidence: 0.01 }
//   ],
//   keywords: ['javascript', 'framework', 'react', 'building', 'interfaces'],
//   sentiment: 0.2,
//   importance: 0.5
// }
```

## Custom Training

You can improve classification accuracy by providing domain-specific training data:

```typescript
import { MemoryClassifier, TrainingExample } from 'kuzu-memory';

const customTraining: TrainingExample[] = [
  // Add domain-specific examples
  { text: "Deploy the application to production", type: "procedural" },
  { text: "The API endpoint returns JSON data", type: "semantic" },
  { text: "Fix the login bug by end of day", type: "working" },
  // ... more examples
];

const memory = await createMemoryClient({
  nlp: {
    autoClassify: true,
    customTrainingData: customTraining
  }
});
```

## Classification Indicators

The classifier looks for specific keywords and patterns:

### Episodic Indicators
- Temporal references: "yesterday", "last week", "ago"
- Personal pronouns: "I went", "we did", "I saw"
- Memory phrases: "remember when", "that time"

### Semantic Indicators
- Definitional phrases: "is a", "refers to", "consists of"
- Factual statements: "equals", "contains", "represents"

### Procedural Indicators
- Instructions: "how to", "step 1", "first", "then", "next"
- Process words: "method", "procedure", "process"

### Working Indicators
- Task language: "need to", "must", "have to"
- Reminders: "don't forget", "remind me"
- Deadlines: "by tomorrow", "deadline", "due"

### Sensory Indicators
- Sensory verbs: "smells like", "tastes", "sounds", "feels", "looks"
- Descriptive adjectives: "smooth", "rough", "bright", "loud"

### Preference Indicators
- Preference expressions: "I prefer", "I like", "I don't like", "favorite"
- Choice language: "love", "hate", "choose", "rather than"
- Comparative language: "better than", "ideal", "best for me"

## Performance Considerations

1. **Initial Training**: The classifier needs to be initialized on first use, which may take a moment.

2. **Confidence Scores**: Natural.js Bayes classifier may produce low confidence scores with limited training data. Consider:
   - Adding more training examples
   - Adjusting the confidence threshold
   - Using the classification as a suggestion rather than absolute

3. **Language Support**: Currently optimized for English. Other languages would require custom training data.

4. **Resource Usage**: NLP processing adds computational overhead. For high-volume applications, consider:
   - Batch processing
   - Caching classification results
   - Using web workers for processing

## Limitations

1. **Training Data**: The default training set is limited. Production applications should provide domain-specific training data.

2. **Context Understanding**: The classifier uses bag-of-words and doesn't understand complex context or relationships.

3. **Accuracy**: Classification accuracy depends on:
   - Quality and quantity of training data
   - Clarity of the input text
   - Domain-specific language patterns

## Best Practices

1. **Provide Training Data**: Add examples specific to your domain for better accuracy.

2. **Set Appropriate Thresholds**: Adjust `confidenceThreshold` based on your needs.

3. **Manual Review**: For critical applications, allow users to review and correct classifications.

4. **Combine with Other Features**: Use NLP classification alongside other Kuzu Memory features like pattern extraction and recall strategies.

5. **Monitor Performance**: Track classification accuracy and adjust training data as needed.

## Python Equivalent

The Natural.js library used here is similar to Python's NLTK. If you're familiar with NLTK, the concepts translate as follows:

- `natural.BayesClassifier` ≈ `nltk.NaiveBayesClassifier`
- `natural.PorterStemmer` ≈ `nltk.stem.PorterStemmer`
- `natural.SentimentAnalyzer` ≈ `nltk.sentiment.SentimentIntensityAnalyzer`
- `natural.TfIdf` ≈ `sklearn.feature_extraction.text.TfidfVectorizer`

## Example Application

See `examples/nlp-classification.ts` for a complete working example demonstrating all NLP features.