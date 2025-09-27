# NLP Implementation Guide for Python Developers

This guide documents the NLP features implemented in the kuzu-memory TypeScript library and provides guidance for Python developers who want to create equivalent functionality. It explains the algorithms, data structures, and approaches used without providing implementation code.

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Library Mapping Table](#library-mapping-table)
3. [Memory Classification System](#memory-classification-system)
4. [Training Data Structure](#training-data-structure)
5. [Sentiment Analysis Approach](#sentiment-analysis-approach)
6. [Keyword Extraction Algorithm](#keyword-extraction-algorithm)
7. [Implementation Architecture](#implementation-architecture)
8. [Testing Strategy](#testing-strategy)
9. [Performance Considerations](#performance-considerations)
10. [Integration Patterns](#integration-patterns)

## Executive Summary

### Overview of NLP Features in kuzu-memory

The kuzu-memory TypeScript library includes sophisticated NLP capabilities for automatically classifying memory content into six cognitive memory types:

- **Episodic**: Personal experiences and events ("Yesterday I went to the park")
- **Semantic**: Facts and general knowledge ("Paris is the capital of France")
- **Procedural**: Instructions and how-to content ("To make coffee, first boil water")
- **Working**: Tasks and current focus ("Need to finish the report by tomorrow")
- **Sensory**: Sensory descriptions ("The coffee smells like fresh roasted beans")
- **Preference**: User preferences and personal choices ("I prefer dark mode over light mode")

### Key Capabilities

1. **Memory Type Classification** using Naive Bayes with 146+ training examples
2. **Importance Scoring** (0-1 scale) based on linguistic indicators
3. **Sentiment Analysis** using AFINN-based sentiment scoring
4. **Keyword Extraction** using TF-IDF with stop word filtering
5. **Confidence Scoring** for classification reliability

### Python Library Recommendations

**Primary Choice**: `scikit-learn` + `NLTK` for maximum compatibility with the TypeScript Natural.js implementation
**Alternative**: `spaCy` for production performance (requires adaptation of training data)
**Sentiment**: `TextBlob` or `VADER` (NLTK) for sentiment analysis

## Library Mapping Table

### Complete Dependency Mapping

| TypeScript Package | Python Equivalent | Installation Command | Purpose |
|-------------------|------------------|---------------------|---------|
| `natural` | `nltk` + `scikit-learn` | `pip install nltk scikit-learn` | Complete NLP toolkit |
| `natural.BayesClassifier` | `sklearn.naive_bayes.MultinomialNB` | Included in scikit-learn | Naive Bayes text classification |
| `natural.WordTokenizer` | `nltk.tokenize.word_tokenize` | `python -m nltk.downloader punkt` | Word tokenization |
| `natural.TfIdf` | `sklearn.feature_extraction.text.TfidfVectorizer` | Included in scikit-learn | TF-IDF calculation |
| `natural.PorterStemmer` | `nltk.stem.PorterStemmer` | Included in NLTK | Word stemming |
| `natural.SentimentAnalyzer` (AFINN) | `nltk.sentiment.SentimentIntensityAnalyzer` | `python -m nltk.downloader vader_lexicon` | Sentiment analysis |

### Additional Dependencies

| Python Package | Purpose | Installation |
|---------------|---------|-------------|
| `numpy>=1.21.0` | Numerical operations | `pip install numpy` |
| `pandas>=1.3.0` | Data manipulation (optional) | `pip install pandas` |
| `textblob>=0.17.0` | Alternative sentiment analysis | `pip install textblob` |
| `joblib>=1.1.0` | Model persistence | `pip install joblib` |

## Memory Classification System

### TypeScript Implementation Overview

Our TypeScript implementation uses Natural.js's BayesClassifier with the following architecture:

```typescript
// Core components used:
- natural.BayesClassifier: Main classification engine
- natural.WordTokenizer: Text tokenization
- natural.TfIdf: Keyword extraction
- natural.PorterStemmerIt: Word stemming
- natural.SentimentAnalyzer: Sentiment scoring (AFINN)
```

### Classification Algorithm

The classification process follows these steps:

1. **Text Normalization**: Convert input to lowercase for consistent processing
2. **Feature Extraction**: Tokenize text and extract word features
3. **Bayesian Classification**: Apply trained Naive Bayes model to get probabilities
4. **Indicator Checking**: Look for strong type indicators to boost confidence
5. **Confidence Adjustment**: Apply boosting logic when indicators match classification
6. **Final Classification**: Return memory type with confidence score

### Confidence Boosting Logic

The system implements a two-tier confidence system:

- **Primary Classification**: Naive Bayes probability score
- **Indicator Boost**: If strong indicators match the classification, multiply confidence by 1.2 (capped at 1.0)
- **Fallback Logic**: If confidence < 0.7 and strong indicators exist, use indicator type with 0.75 confidence

### Type Indicator System

Each memory type has associated linguistic indicators that help boost classification confidence:

**Episodic Indicators**: "yesterday", "remember", "last week", "when I", "I went", "I saw", "we did"

**Semantic Indicators**: "is a", "are", "defined as", "means", "refers to", "consists of", "fact"

**Procedural Indicators**: "how to", "step", "first", "then", "process", "method", "procedure", "instructions"

**Working Indicators**: "need to", "must", "should", "todo", "task", "deadline", "urgent", "important"

**Sensory Indicators**: "smells", "tastes", "feels", "sounds", "looks", "texture", "hot", "cold", "soft"

**Preference Indicators**: "prefer", "like", "don't like", "favorite", "love", "hate", "choose", "ideal"

## Training Data Structure

### Training Data Format

The system uses 146 carefully curated training examples distributed across memory types:

- **Episodic**: 23 examples of personal experiences
- **Semantic**: 23 examples of factual knowledge
- **Procedural**: 23 examples of instructions
- **Working**: 24 examples of tasks and current focus
- **Sensory**: 23 examples of sensory descriptions
- **Preference**: 30 examples of personal preferences and choices

### Training Example Structure

Each training example consists of:
- `text`: The example memory content (string)
- `type`: The memory type classification (enum)

### Data Distribution Strategy

The training data is balanced to prevent bias:
- Equal representation across all memory types (~16-17% each)
- Diverse vocabulary and sentence structures
- Mix of short and long examples
- Coverage of common use cases for each type

### Custom Training Data

The system supports adding custom training data:
- Custom examples are merged with default training data
- Maintains the same structure as default examples
- Allows domain-specific customization

## Sentiment Analysis Approach

### AFINN-based Sentiment Scoring

Our TypeScript implementation uses the AFINN lexicon through Natural.js:

- **Score Range**: -5 (most negative) to +5 (most positive)
- **Word-level Analysis**: Each word gets an individual sentiment score
- **Aggregation**: Sum of individual word scores, normalized by text length
- **Stemming**: Applied before sentiment lookup for better coverage

### Sentiment Score Interpretation

The sentiment score contributes to importance calculation:
- Highly positive or negative sentiment increases importance
- Neutral sentiment has minimal impact on importance
- Extreme sentiments (|score| > 3) get maximum weight

## Keyword Extraction Algorithm

### TF-IDF Implementation

The system uses Term Frequency-Inverse Document Frequency for keyword extraction:

1. **Document Preparation**: Training corpus forms the document collection
2. **Term Frequency**: Count occurrences of each term in the input
3. **Inverse Document Frequency**: Weight by rarity across training corpus
4. **Score Calculation**: TF × IDF for each term
5. **Top-K Selection**: Return highest scoring terms as keywords

### Stop Word Filtering

A comprehensive stop word list filters common words:
- Articles: "the", "a", "an"
- Pronouns: "I", "you", "he", "she", "it", "we", "they"
- Common verbs: "is", "are", "was", "were", "have", "has"
- Prepositions: "in", "on", "at", "by", "for", "with"
- Conjunctions: "and", "or", "but", "if", "because"

### Keyword Selection Criteria

Keywords are selected based on:
- TF-IDF score threshold (typically > 0.3)
- Maximum number of keywords (default: 5)
- Minimum word length (typically 3 characters)
- Exclusion of stop words and numbers

## Implementation Architecture

### Core Class Structure

The TypeScript implementation follows this architecture:

```
MemoryClassifier
├── Configuration Management
│   ├── auto_classify: boolean
│   ├── auto_importance: boolean
│   ├── confidence_threshold: number
│   └── custom_training_data: array
├── Classification Pipeline
│   ├── init(): Initialize and train
│   ├── classify(): Single classification
│   └── classifyBatch(): Batch processing
├── Feature Extraction
│   ├── extractKeywords(): TF-IDF keywords
│   ├── analyzeSentiment(): AFINN sentiment
│   └── checkTypeIndicators(): Pattern matching
└── Scoring Functions
    ├── calculateImportance(): 0-1 score
    └── adjustConfidence(): Boost logic
```

### Asynchronous Design

All methods are async for non-blocking operation:
- Training happens asynchronously during initialization
- Classification can process while other operations continue
- Batch operations optimize for multiple classifications

### State Management

The classifier maintains internal state:
- `isInitialized`: Tracks training completion
- `classifier`: Trained Naive Bayes model
- `tfidf`: TF-IDF model for keyword extraction
- `sentimentAnalyzer`: AFINN sentiment analyzer

## Testing Strategy

### Unit Testing Approach

Test coverage should include:

1. **Classification Accuracy**: Each memory type should classify correctly
2. **Edge Cases**: Empty strings, very long text, special characters
3. **Confidence Scores**: Verify range [0, 1] and boosting logic
4. **Keyword Extraction**: Validate keyword relevance and count
5. **Sentiment Analysis**: Test positive, negative, and neutral cases

### Integration Testing

Test the classifier with real-world scenarios:
- Mixed content with multiple memory types
- Ambiguous content requiring confidence thresholds
- Performance with large batches
- Memory usage with extensive training data

### Validation Metrics

Key metrics to validate:
- **Overall Accuracy**: > 85% on training data
- **Per-Type Precision**: > 80% for each memory type
- **Classification Speed**: < 100ms per item
- **Batch Throughput**: > 100 items/second

## Performance Considerations

### Optimization Strategies

1. **Lazy Initialization**: Train classifier only when first needed
2. **Batch Processing**: Vectorize operations for multiple items
3. **Caching**: Store frequently accessed results
4. **Feature Selection**: Limit vocabulary size for speed

### Memory Management

- **Training Data**: Keep in memory for TF-IDF calculations
- **Model Size**: Naive Bayes models are typically < 1MB
- **Cleanup**: Proper disposal of unused models

### Scalability Considerations

- **Concurrent Requests**: Thread-safe implementation required
- **Large Datasets**: Consider streaming for > 10,000 items
- **Model Updates**: Support incremental learning

## Integration Patterns

### Library Integration

When integrating with Python applications:

1. **Singleton Pattern**: One classifier instance per application
2. **Factory Pattern**: Create specialized classifiers for domains
3. **Observer Pattern**: Emit events on classification completion

### API Design Recommendations

```python
# Recommended public API structure
class MemoryClassifier:
    async def init(config: Optional[Config] = None) -> None
    async def classify(content: str) -> ClassificationResult
    async def classify_batch(contents: List[str]) -> List[ClassificationResult]
    def add_training_data(examples: List[TrainingExample]) -> None
    def get_confidence_threshold() -> float
    def set_confidence_threshold(threshold: float) -> None
```

### Error Handling

Implement robust error handling for:
- Invalid input (null, empty, too long)
- Training failures
- Model corruption
- Resource exhaustion

### Logging and Monitoring

Key events to log:
- Initialization start/completion
- Classification requests with timing
- Low confidence classifications
- Error conditions

---

This guide provides comprehensive documentation of the NLP implementation in kuzu-memory without providing ready-to-copy code. Python developers can use this as a reference to understand the algorithms, data structures, and approaches needed to create an equivalent implementation in Python.

The TypeScript implementation serves as a proven reference architecture, with all components thoroughly tested and validated. Following these patterns will ensure consistency between TypeScript and Python versions of the memory classification system.