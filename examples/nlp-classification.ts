/**
 * Example: Using NLP-based Memory Classification
 *
 * This example demonstrates how to use the built-in NLP features
 * to automatically classify memory types and set importance scores.
 */

import { createMemoryClient } from '../src';

async function main() {
  console.log('🧠 Kuzu Memory - NLP Classification Example\n');

  // Create a memory client with NLP features enabled
  const memory = await createMemoryClient({
    storage: 'memory', // Use in-memory storage for this example
    nlp: {
      autoClassify: true,      // Automatically classify memory types
      autoImportance: true,     // Automatically set importance based on content
      confidenceThreshold: 0.6  // Minimum confidence for auto-classification
    }
  });

  console.log('✅ Memory client initialized with NLP features\n');

  // Example 1: Episodic Memory (personal experiences)
  console.log('📖 Creating Episodic Memory...');
  const episodic = await memory.create(
    "Yesterday I went to the park with my family and we had a wonderful picnic"
  );
  console.log(`Type: ${episodic.type}`);
  console.log(`Importance: ${episodic.importance.toFixed(2)}`);
  console.log(`Tags: ${episodic.tags.join(', ') || 'none'}`);
  if (episodic.metadata?.nlpClassification) {
    console.log(`Confidence: ${episodic.metadata.nlpClassification.confidence.toFixed(3)}`);
    console.log(`Sentiment: ${episodic.metadata.nlpClassification.sentiment?.toFixed(2) || 'N/A'}`);
  }
  console.log();

  // Example 2: Procedural Memory (how-to instructions)
  console.log('🔧 Creating Procedural Memory...');
  const procedural = await memory.create(
    "To make coffee, first boil water to 95°C, then add 15g of ground coffee per 250ml of water"
  );
  console.log(`Type: ${procedural.type}`);
  console.log(`Importance: ${procedural.importance.toFixed(2)}`);
  console.log(`Tags: ${procedural.tags.join(', ') || 'none'}`);
  console.log();

  // Example 3: Semantic Memory (facts and knowledge)
  console.log('📚 Creating Semantic Memory...');
  const semantic = await memory.create(
    "TypeScript is a superset of JavaScript that adds static typing and compiles to plain JavaScript"
  );
  console.log(`Type: ${semantic.type}`);
  console.log(`Importance: ${semantic.importance.toFixed(2)}`);
  console.log(`Tags: ${semantic.tags.join(', ') || 'none'}`);
  console.log();

  // Example 4: Working Memory (current tasks)
  console.log('📝 Creating Working Memory...');
  const working = await memory.create(
    "URGENT: Need to finish the quarterly report by tomorrow morning and send it to the team"
  );
  console.log(`Type: ${working.type}`);
  console.log(`Importance: ${working.importance.toFixed(2)} (should be high due to URGENT)`);
  console.log(`Tags: ${working.tags.join(', ') || 'none'}`);
  console.log();

  // Example 5: Sensory Memory (sensory descriptions)
  console.log('👃 Creating Sensory Memory...');
  const sensory = await memory.create(
    "The coffee smells like dark chocolate with hints of caramel and tastes smooth with low acidity"
  );
  console.log(`Type: ${sensory.type}`);
  console.log(`Importance: ${sensory.importance.toFixed(2)}`);
  console.log(`Tags: ${sensory.tags.join(', ') || 'none'}`);
  console.log();

  // Example 6: Manual Override
  console.log('🎯 Creating Memory with Manual Type Override...');
  const manual = await memory.create(
    "I remember visiting the museum last week", // Would normally be episodic
    { type: 'semantic' } // Manual override to semantic
  );
  console.log(`Type: ${manual.type} (manually set)`);
  if (manual.metadata?.nlpClassification) {
    console.log(`Suggested Type: ${manual.metadata.nlpClassification.suggestedType} (by NLP)`);
  }
  console.log();

  // Example 7: Get detailed classification
  console.log('🔍 Getting Detailed Classification...');
  const text = "Remember to call mom tonight and wish her happy birthday";
  const classification = await memory.classifyMemory(text);
  if (classification) {
    console.log(`Text: "${text}"`);
    console.log(`Classified as: ${classification.type}`);
    console.log(`Confidence: ${classification.confidence.toFixed(3)}`);
    console.log(`Importance: ${classification.importance?.toFixed(2) || 'N/A'}`);
    console.log(`Keywords: ${classification.keywords?.join(', ') || 'none'}`);
  }
  console.log();

  // Example 8: Query memories by type
  console.log('🔎 Querying Memories by Type...');
  const workingMemories = await memory.query({ type: 'working' });
  console.log(`Found ${workingMemories.length} working memory items`);

  const semanticMemories = await memory.query({ type: 'semantic' });
  console.log(`Found ${semanticMemories.length} semantic memory items`);
  console.log();

  // Display statistics
  const stats = await memory.getStats();
  console.log('📊 Memory Statistics:');
  console.log(`Total memories: ${stats.totalItems}`);
  console.log('By type:');
  Object.entries(stats.byType).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`  - ${type}: ${count}`);
    }
  });

  // Cleanup
  memory.destroy();
  console.log('\n✨ Example completed!');
}

// Run the example
main().catch(console.error);

/**
 * Expected Output:
 *
 * The NLP classifier will attempt to classify each memory based on its content.
 * However, Natural.js's Bayes classifier requires sufficient training data and
 * may not always produce high confidence scores with the default training set.
 *
 * For production use, you should:
 * 1. Provide more training data specific to your domain
 * 2. Fine-tune the confidence threshold
 * 3. Consider using more advanced NLP models or services
 *
 * The classifier works best with:
 * - Clear temporal references for episodic memories ("yesterday", "last week")
 * - Instructional language for procedural memories ("how to", "step 1")
 * - Factual statements for semantic memories ("is", "are", "consists of")
 * - Task-oriented language for working memories ("need to", "must", "deadline")
 * - Sensory descriptions for sensory memories ("smells like", "tastes", "feels")
 */