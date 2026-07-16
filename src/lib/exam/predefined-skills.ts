// Predefined skill catalog for the LLM examiner.
//
// A "skill" tells the tutor model what kind of exercise to run and how to
// grade it (e.g. "use this word in a sentence" for a language skill, or
// "walk through the derivation" for a math skill). The examiner infers the
// best-fit skill from this list (plus any user-defined skills — see
// src/lib/services/skill-service.ts) based on the card's front/back content
// and the deck's subject.
export interface PredefinedSkill {
  id:          string;
  name:        string;
  topic:       string;
  subjectHint: string; // free-text hint matched loosely against deck.subject
  rubric:      string; // instructions given to the tutor model
}

export const PREDEFINED_SKILLS: PredefinedSkill[] = [
  {
    id:          'english-usage',
    name:        'English usage',
    topic:       'English vocabulary and grammar',
    subjectHint: 'english',
    rubric:
      'Ask the student to use the target word/phrase correctly in an original sentence, ' +
      'or to translate/paraphrase it. Judge grammar, natural phrasing, and whether the ' +
      'meaning matches the card back exactly.',
  },
  {
    id:          'programming-application',
    name:        'Programming application',
    topic:       'Software engineering and programming concepts',
    subjectHint: 'programming',
    rubric:
      'Ask the student to explain when/why they would use the concept, or to write a short ' +
      'code snippet or trace through what a snippet does. Judge technical correctness, not style.',
  },
  {
    id:          'math-derivation',
    name:        'Math problem solving',
    topic:       'Mathematics',
    subjectHint: 'math',
    rubric:
      'Give the student a small numeric or symbolic problem that requires applying the ' +
      'concept on the card. Judge whether the final answer and reasoning steps are correct.',
  },
  {
    id:          'medicine-clinical-case',
    name:        'Clinical reasoning',
    topic:       'Medicine and health sciences',
    subjectHint: 'medicine',
    rubric:
      'Pose a brief clinical vignette that requires recalling the fact on the card to answer. ' +
      'Judge clinical accuracy; do not accept vague or hedged answers as correct.',
  },
  {
    id:          'science-explanation',
    name:        'Scientific explanation',
    topic:       'Natural sciences',
    subjectHint: 'science',
    rubric:
      'Ask the student to explain the underlying mechanism or predict an outcome using the ' +
      'concept on the card. Judge conceptual accuracy over wording.',
  },
  {
    id:          'history-context',
    name:        'Historical context',
    topic:       'History',
    subjectHint: 'history',
    rubric:
      'Ask the student to place the fact on the card in context — cause/effect, chronology, or ' +
      'significance. Judge factual accuracy and whether the connection made is sound.',
  },
  {
    id:          'general-recall',
    name:        'General free recall',
    topic:       'General knowledge',
    subjectHint: 'custom',
    rubric:
      'Ask the student to restate or apply the fact on the card in their own words without ' +
      'seeing the answer. Judge whether the core meaning is preserved.',
  },
];

export const DEFAULT_SKILL = PREDEFINED_SKILLS[PREDEFINED_SKILLS.length - 1];
