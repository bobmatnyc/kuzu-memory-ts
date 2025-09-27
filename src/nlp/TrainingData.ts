/**
 * Training data for memory type classification
 * Each array contains sample texts that represent typical examples of that memory type
 */

export interface TrainingExample {
  text: string;
  type: 'episodic' | 'semantic' | 'procedural' | 'working' | 'sensory' | 'preference';
}

export const episodicTrainingData = [
  'Yesterday I went to the park with my family',
  'I remember when we first met at the coffee shop',
  'Last week I attended a conference in San Francisco',
  'On my birthday, we had dinner at that Italian restaurant',
  'I visited my grandmother during the holidays',
  'That time we got caught in the rain was hilarious',
  'I recall the day I graduated from college',
  'When I was young, we used to play in the backyard',
  'I met John at the party last night',
  'Remember that vacation we took to Hawaii?',
  'The meeting this morning was very productive',
  'I had lunch with Sarah yesterday at noon',
  'Last summer we went camping in the mountains',
  'I saw that movie last weekend with friends',
  'The concert I attended was amazing',
  'I remember my first day at work',
  'That Christmas was the best one ever',
  'I went shopping downtown this afternoon',
  'We celebrated our anniversary at the beach',
  'I visited the museum during my trip to Paris',
  'The wedding ceremony was beautiful',
  'I had a great conversation with my mentor today',
  'Remember when we used to hang out after school?',
];

export const semanticTrainingData = [
  'The Earth orbits around the Sun',
  'Water boils at 100 degrees Celsius',
  'Paris is the capital of France',
  'Photosynthesis is the process by which plants make food',
  'JavaScript is a programming language',
  'The human body has 206 bones',
  'Democracy is a form of government',
  'Gravity is a fundamental force of nature',
  'DNA carries genetic information',
  'The Pacific Ocean is the largest ocean',
  'Shakespeare wrote Romeo and Juliet',
  'Python is an interpreted language',
  'Mammals are warm-blooded animals',
  'The speed of light is 299,792,458 meters per second',
  'Tokyo is the most populous city in the world',
  'Mitochondria are the powerhouses of the cell',
  'The Great Wall of China is visible from space',
  'Economics is the study of resource allocation',
  'HTTP stands for HyperText Transfer Protocol',
  'The Mona Lisa was painted by Leonardo da Vinci',
  'Artificial Intelligence involves machine learning',
  'The square root of 16 is 4',
  'React is a JavaScript library for building UIs',
];

export const proceduralTrainingData = [
  'To make coffee, first boil water, then add grounds',
  'How to tie a tie: start with the wide end on the right',
  'Step 1: Open the application. Step 2: Click on File',
  'First, preheat the oven to 350 degrees',
  'To reset your password, click on forgot password link',
  'Begin by washing your hands thoroughly',
  'The process involves three main steps',
  'To install, run npm install in the terminal',
  'Start by creating a new document',
  'How to change a tire: first, find a safe location',
  'To solve this equation, isolate the variable',
  'The recipe requires you to mix the dry ingredients first',
  'To login, enter your username and password',
  'First turn off the power, then remove the battery',
  'The procedure is to check, verify, then approve',
  'To create a function, use the function keyword',
  'Begin with outlining your main points',
  'The method involves heating, cooling, then repeating',
  'To save a file, press Ctrl+S or Cmd+S',
  'How to swim: start by learning to float',
  'Follow these instructions carefully',
  'The algorithm works by sorting, then searching',
  'To build the project, run make build',
];

export const workingTrainingData = [
  'Need to finish the report by tomorrow',
  "Don't forget to call mom tonight",
  'Remind me to buy milk on the way home',
  'I have to submit the proposal by Friday',
  'Must review the code before the meeting',
  'Remember to pick up dry cleaning',
  'Task: complete the budget spreadsheet',
  'TODO: update the documentation',
  'Meeting with client at 3 PM today',
  'Deadline for project is next Monday',
  "Need to reply to John's email",
  "Don't forget the appointment at 2 PM",
  'Must prepare presentation for tomorrow',
  'Remember to charge phone before trip',
  'Task list for today includes three items',
  'Working on fixing the bug in the system',
  'Currently debugging the authentication issue',
  'Focusing on the UI improvements now',
  'Need to order supplies before they run out',
  'Remind me about the team standup at 10 AM',
  'Have to review pull requests this afternoon',
  "Don't forget to backup the database",
  'Currently investigating the performance issue',
];

export const preferenceTrainingData = [
  'I prefer dark mode over light mode',
  'I like my coffee with two sugars',
  'I don\'t like spicy food',
  'My favorite color is blue',
  'I always use tabs instead of spaces',
  'I prefer morning workouts',
  'I like to work with music on',
  'My preferred language is TypeScript',
  'I don\'t enjoy crowded places',
  'I prefer email over phone calls',
  'I love Italian cuisine',
  'I hate being late to meetings',
  'My favorite season is autumn',
  'I prefer working from home',
  'I like to start my day early',
  'I don\'t like loud noises',
  'I prefer reading physical books over e-books',
  'My favorite music genre is jazz',
  'I always choose window seats on planes',
  'I prefer tea over coffee in the evening',
  'I like minimalist design',
  'I don\'t enjoy small talk',
  'I prefer keyboard shortcuts over using the mouse',
  'My ideal vacation involves mountains',
  'I like to keep my workspace organized',
  'I prefer async communication',
  'I love rainy weather',
  'I don\'t like notifications during focus time',
  'I prefer detailed documentation',
  'My favorite IDE theme is Dracula',
];

export const sensoryTrainingData = [
  'The coffee smells like fresh roasted beans',
  'It feels smooth and silky to the touch',
  'The music sounds like gentle rain falling',
  'It tastes sweet with a hint of cinnamon',
  'The room smells musty and old',
  'The texture feels rough and grainy',
  'It sounds like thunder in the distance',
  'The food tastes spicy and aromatic',
  'Feels cold and wet against my skin',
  'The perfume smells like fresh flowers',
  'It looks bright and colorful',
  'The fabric feels soft and warm',
  'Sounds like birds chirping in the morning',
  'Tastes bitter like dark chocolate',
  'The air smells fresh after the rain',
  'Feels heavy and solid in my hands',
  'The voice sounds deep and resonant',
  'It has a metallic taste',
  'The surface feels smooth as glass',
  'Smells like freshly baked bread',
  'The light appears dim and yellow',
  'Feels sharp and pointed at the edges',
  'The aroma is sweet and fruity',
];

/**
 * Combined training data for easy iteration
 */
export const allTrainingData: TrainingExample[] = [
  ...episodicTrainingData.map(text => ({ text, type: 'episodic' as const })),
  ...semanticTrainingData.map(text => ({ text, type: 'semantic' as const })),
  ...proceduralTrainingData.map(text => ({ text, type: 'procedural' as const })),
  ...workingTrainingData.map(text => ({ text, type: 'working' as const })),
  ...sensoryTrainingData.map(text => ({ text, type: 'sensory' as const })),
  ...preferenceTrainingData.map(text => ({ text, type: 'preference' as const })),
];

/**
 * Keywords and patterns that strongly indicate specific memory types
 */
export const memoryTypeIndicators = {
  episodic: [
    'yesterday', 'last week', 'remember when', 'I went', 'I did', 'I saw',
    'that time', 'when I', 'we used to', 'I recall', 'I visited', 'I met',
    'ago', 'last year', 'this morning', 'that day',
  ],
  semantic: [
    'is a', 'are', 'defined as', 'means', 'refers to', 'consists of',
    'is the', 'stands for', 'represents', 'equals', 'contains', 'involves',
  ],
  procedural: [
    'how to', 'step', 'first', 'then', 'next', 'finally', 'begin',
    'start by', 'process', 'method', 'procedure', 'instructions',
    'to do', 'follow these', 'the way to',
  ],
  working: [
    'need to', 'must', 'have to', 'don\'t forget', 'remind me', 'todo',
    'deadline', 'by tomorrow', 'task', 'currently', 'working on',
    'remember to', 'focusing on', 'appointment',
  ],
  sensory: [
    'smells like', 'tastes like', 'sounds like', 'feels like', 'looks like',
    'smells', 'tastes', 'sounds', 'feels', 'texture', 'aroma', 'flavor',
    'smooth', 'rough', 'soft', 'hard', 'bright', 'dim', 'loud', 'quiet',
  ],
  preference: [
    'I prefer', 'I like', 'I don\'t like', 'I love', 'I hate', 'favorite',
    'my choice', 'I choose', 'rather than', 'I enjoy', 'I don\'t enjoy',
    'I always', 'I never', 'I usually', 'I typically', 'ideal', 'best for me',
    'suits me', 'works for me', 'my style', 'my taste', 'I favor',
  ],
};

/**
 * Words that indicate importance/urgency
 */
export const importanceIndicators = {
  high: [
    'urgent', 'critical', 'important', 'essential', 'must', 'vital',
    'crucial', 'emergency', 'asap', 'immediately', 'priority', 'deadline',
  ],
  medium: [
    'should', 'need', 'required', 'necessary', 'significant', 'notable',
    'relevant', 'meaningful', 'valuable',
  ],
  low: [
    'maybe', 'perhaps', 'might', 'could', 'sometime', 'eventually',
    'possibly', 'optional', 'minor', 'trivial',
  ],
};
