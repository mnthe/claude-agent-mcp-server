/**
 * Conversation management types
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Session {
  id: string;
  messages: Message[];
  lastActivity: number;
}
