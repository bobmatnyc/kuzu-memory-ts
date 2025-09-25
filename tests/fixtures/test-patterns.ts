import { Pattern } from '../../src/types';

export const testPatterns: Pattern[] = [
  {
    id: 'identity_name',
    name: 'Identity - Name',
    description: 'Extracts name from identity statements',
    regex: '(?:my name is|i am|i\'m)\\s+(?:Dr\\.?|Mr\\.?|Mrs\\.?|Ms\\.?|Prof\\.?)?\\s*([a-zA-Z][a-zA-Z\\s]+?)(?:,|\\.|and|$)',
    priority: 10,
  },
  {
    id: 'identity_role',
    name: 'Identity - Role',
    description: 'Extracts role/profession from identity statements',
    regex: '(?:i work as|i am a|i\'m a) ([a-zA-Z ]+)',
    priority: 9,
  },
  {
    id: 'preference_like',
    name: 'Preference - Like',
    description: 'Extracts preferences from like statements',
    regex: '(?:i like|i prefer|i enjoy) ([^.]+?)(?:\\s+and\\s+|\\.|$)',
    priority: 8,
  },
  {
    id: 'preference_dislike',
    name: 'Preference - Dislike',
    description: 'Extracts dislikes from negative preference statements',
    regex: '(?:i dislike|i hate|i don\'t like) ([^.]+)',
    priority: 8,
  },
  {
    id: 'decision_made',
    name: 'Decision - Made',
    description: 'Extracts decisions from decision statements',
    regex: '(?:we decided|i decided|the decision was) ([^.]+)',
    priority: 9,
  },
  {
    id: 'email_address',
    name: 'Email Address',
    description: 'Extracts email addresses',
    regex: '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
    priority: 7,
  },
  {
    id: 'url_http',
    name: 'URL - HTTP',
    description: 'Extracts HTTP/HTTPS URLs',
    regex: '(https?://[\\w\\-._~:/?#\\[\\]@!$&\'()*+,;=]+)',
    priority: 7,
  },
  {
    id: 'code_function',
    name: 'Code - Function',
    description: 'Extracts function definitions',
    regex: '(?:function\\s+|const\\s+|let\\s+|var\\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)\\s*[=\\(]',
    priority: 6,
  },
  {
    id: 'date_mention',
    name: 'Date Mention',
    description: 'Extracts date mentions',
    regex: '(?:on|by|until|before|after)\\s+([A-Z][a-z]+\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,\\s+\\d{4})?)',
    priority: 6,
  },
  {
    id: 'skill_mention',
    name: 'Skill Mention',
    description: 'Extracts technology/skill mentions',
    regex: '\\b(JavaScript|TypeScript|React|Node\\.js|Python|Java|C\\+\\+|HTML|CSS|SQL|Git|Docker|AWS|Azure|GCP)\\b',
    priority: 5,
  }
];

export const testExtractionResults = {
  identity: [
    { pattern: 'identity_name', value: 'John Doe', confidence: 0.95 },
    { pattern: 'identity_role', value: 'software developer', confidence: 0.9 },
  ],
  preferences: [
    { pattern: 'preference_like', value: 'dark mode over light mode', confidence: 0.85 },
    { pattern: 'preference_like', value: 'using VS Code', confidence: 0.8 },
  ],
  decisions: [
    { pattern: 'decision_made', value: 'to use Jest for testing instead of Vitest', confidence: 0.9 },
  ],
  contacts: [
    { pattern: 'email_address', value: 'support@example.com', confidence: 1.0 },
    { pattern: 'url_http', value: 'https://docs.example.com', confidence: 1.0 },
  ],
  code: [
    { pattern: 'code_function', value: 'calculateMemoryScore', confidence: 0.95 },
  ],
  skills: [
    { pattern: 'skill_mention', value: 'TypeScript', confidence: 0.9 },
    { pattern: 'skill_mention', value: 'React', confidence: 0.9 },
  ],
};