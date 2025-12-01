import { SimplePool, Filter, Event } from 'nostr-tools';
import { Quiz, Question } from '../types';
import { DEFAULT_RELAYS } from '../utils/constants';

// Formstr V1FormSpec interfaces based on the source code analysis
interface V1FormSpec {
  title: string;
  description?: string;
  fields: V1FormField[];
  settings?: {
    [key: string]: any;
  };
}

interface V1FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'number' | 'email' | 'url' | 'date' | 'time';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  settings?: {
    [key: string]: any;
  };
}

export class FormstrService {
  private pool: SimplePool;
  private relays: string[];

  constructor(relays: string[] = DEFAULT_RELAYS) {
    this.pool = new SimplePool();
    this.relays = relays;
  }

  // Fetch all forms for a given pubkey
  async fetchFormsForPubkey(pubkey: string): Promise<Event[]> {
    return new Promise((resolve) => {
      const forms: Event[] = [];
      
      // Formstr uses kind 30168 for forms based on the source code
      const filters: Filter[] = [{
        kinds: [30168],
        authors: [pubkey],
        limit: 50
      }];

      const subId = this.pool.subscribeMany(
        this.relays,
        filters,
        {
          onevent: (event) => {
            forms.push(event);
          },
          oneose: () => {
            resolve(forms);
          }
        }
      );

      // Timeout after 10 seconds
      setTimeout(() => {
        subId.close();
        resolve(forms);
      }, 10000);
    });
  }

  // Convert Formstr form to Quiz
  convertFormToQuiz(formEvent: Event): Quiz | null {
    try {
      const content = JSON.parse(formEvent.content);
      const formSpec: V1FormSpec = content;

      // Extract quiz metadata
      const title = formSpec.title || 'Untitled Quiz';
      const description = formSpec.description || '';
      
      // Find language from settings or default to 'en'
      const language = formSpec.settings?.language || 'en';

      // Convert fields to questions
      const questions: Question[] = [];
      let questionIndex = 0;

      for (const field of formSpec.fields) {
        // Only process fields that can be quiz questions
        if (field.type === 'radio' || field.type === 'select') {
          if (!field.options || field.options.length < 2) {
            continue; // Skip fields without enough options
          }

          // Determine question type
          let questionType: 'multiple_choice' | 'true_false' = 'multiple_choice';
          let options = field.options;
          
          // Check if it's a true/false question
          if (field.options.length === 2) {
            const lowerOptions = field.options.map(opt => opt.toLowerCase());
            if ((lowerOptions.includes('true') && lowerOptions.includes('false')) ||
                (lowerOptions.includes('yes') && lowerOptions.includes('no'))) {
              questionType = 'true_false';
              // Normalize to True/False
              options = ['True', 'False'];
            }
          }

          // Extract correct answer from field settings
          let correctIndex = 0;
          if (field.settings?.correct_answer !== undefined) {
            if (typeof field.settings.correct_answer === 'number') {
              correctIndex = field.settings.correct_answer;
            } else if (typeof field.settings.correct_answer === 'string') {
              const correctOption = field.settings.correct_answer;
              const foundIndex = field.options.findIndex(opt => 
                opt.toLowerCase() === correctOption.toLowerCase()
              );
              if (foundIndex !== -1) {
                correctIndex = foundIndex;
              }
            }
          }

          // Extract time limit and points from settings
          const timeLimit = field.settings?.time_limit_seconds || 20;
          const points = field.settings?.points || 1000;

          const question: Question = {
            text: field.label,
            type: questionType,
            options: options,
            correct_index: correctIndex,
            time_limit_seconds: timeLimit,
            points: points
          };

          questions.push(question);
          questionIndex++;
        }
      }

      if (questions.length === 0) {
        console.warn('No valid quiz questions found in form:', title);
        return null;
      }

      const quiz: Quiz = {
        id: this.generateQuizId(formEvent.id),
        title,
        description,
        language,
        questions,
        formstr_event_id: formEvent.id,
        created_at: formEvent.created_at,
        settings: {
          defaultTimeLimit: 20,
          defaultPoints: 1000,
          allowAnonymous: true
        }
      };

      return quiz;
    } catch (error) {
      console.error('Error converting form to quiz:', error);
      return null;
    }
  }

  // Generate a deterministic quiz ID from form event ID
  private generateQuizId(formEventId: string): string {
    return `quiz_${formEventId.substring(0, 16)}`;
  }

  // Fetch and convert all quizzes for a pubkey
  async fetchQuizzesForPubkey(pubkey: string): Promise<Quiz[]> {
    try {
      const forms = await this.fetchFormsForPubkey(pubkey);
      const quizzes: Quiz[] = [];

      for (const form of forms) {
        const quiz = this.convertFormToQuiz(form);
        if (quiz) {
          quizzes.push(quiz);
        }
      }

      return quizzes;
    } catch (error) {
      console.error('Error fetching quizzes for pubkey:', error);
      return [];
    }
  }

  // Create demo quizzes for testing
  createDemoQuizzes(): Quiz[] {
    return [
      {
        id: 'demo_general_knowledge',
        title: 'General Knowledge Quiz',
        description: 'Test your general knowledge with these fun questions!',
        language: 'en',
        questions: [
          {
            id: 'q1',
            text: 'What is the capital of France?',
            type: 'multiple_choice',
            options: ['London', 'Berlin', 'Paris', 'Madrid'],
            correct_index: 2,
            time_limit_seconds: 20,
            points: 1000
          },
          {
            id: 'q2',
            text: 'The Earth is flat.',
            type: 'true_false',
            options: ['True', 'False'],
            correct_index: 1,
            time_limit_seconds: 15,
            points: 500
          }
        ],
        settings: {
          defaultTimeLimit: 20,
          defaultPoints: 1000,
          allowAnonymous: true
        },
        created_at: Math.floor(Date.now() / 1000)
      },
      {
        id: 'demo_science',
        title: 'Science Quiz',
        description: 'Challenge yourself with these science questions!',
        language: 'en',
        questions: [
          {
            id: 'q1',
            text: 'What is the chemical symbol for gold?',
            type: 'multiple_choice',
            options: ['Go', 'Gd', 'Au', 'Ag'],
            correct_index: 2,
            time_limit_seconds: 25,
            points: 1200
          }
        ],
        settings: {
          defaultTimeLimit: 25,
          defaultPoints: 1200,
          allowAnonymous: true
        },
        created_at: Math.floor(Date.now() / 1000)
      },
      {
        id: 'demo_history',
        title: 'History Quiz',
        description: 'Journey through time with these historical questions!',
        language: 'en',
        questions: [
          {
            id: 'q1',
            text: 'In which year did World War II end?',
            type: 'multiple_choice',
            options: ['1944', '1945', '1946', '1947'],
            correct_index: 1,
            time_limit_seconds: 30,
            points: 1500
          },
          {
            id: 'q2',
            text: 'The Great Wall of China was built in a single dynasty.',
            type: 'true_false',
            options: ['True', 'False'],
            correct_index: 1,
            time_limit_seconds: 20,
            points: 800
          }
        ],
        settings: {
          defaultTimeLimit: 25,
          defaultPoints: 1150,
          allowAnonymous: true
        },
        created_at: Math.floor(Date.now() / 1000)
      }
    ];
  }

  // Validate quiz structure
  validateQuiz(quiz: Quiz): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!quiz.title || quiz.title.trim().length === 0) {
      errors.push('Quiz title is required');
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      errors.push('Quiz must have at least one question');
    }

    quiz.questions.forEach((question, index) => {
      if (!question.text || question.text.trim().length === 0) {
        errors.push(`Question ${index + 1}: Question text is required`);
      }

      if (!question.options || question.options.length < 2) {
        errors.push(`Question ${index + 1}: Must have at least 2 answer options`);
      }

      if (question.type === 'multiple_choice' && question.options.length > 4) {
        errors.push(`Question ${index + 1}: Multiple choice questions can have at most 4 options`);
      }

      if (question.type === 'true_false' && question.options.length !== 2) {
        errors.push(`Question ${index + 1}: True/false questions must have exactly 2 options`);
      }

      if (question.correct_index < 0 || question.correct_index >= question.options.length) {
        errors.push(`Question ${index + 1}: Correct answer index is out of range`);
      }

      if (question.time_limit_seconds <= 0) {
        errors.push(`Question ${index + 1}: Time limit must be positive`);
      }

      if (question.points <= 0) {
        errors.push(`Question ${index + 1}: Points must be positive`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Close connections
  close(): void {
    this.pool.close(this.relays);
  }
}

// Singleton instance
export const formstrService = new FormstrService();