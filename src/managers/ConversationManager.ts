/**
 * Conversation Manager for multi-turn conversations
 */

import crypto from 'crypto';
import { Session, Message } from '../types/index.js';
import { Logger } from '../utils/Logger.js';

export class ConversationManager {
  private sessions: Map<string, Session> = new Map();
  private sessionTimeout: number;
  private maxHistory: number;
  private logger: Logger;

  constructor(sessionTimeout: number, maxHistory: number, logger: Logger) {
    this.sessionTimeout = sessionTimeout;
    this.maxHistory = maxHistory;
    this.logger = logger;

    // Clean up expired sessions periodically
    setInterval(() => this.cleanupExpiredSessions(), 60000); // Every minute
  }

  /**
   * Create a new session
   */
  createSession(): string {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const session: Session = {
      id: sessionId,
      messages: [],
      lastActivity: Date.now(),
    };
    this.sessions.set(sessionId, session);
    this.logger.info(`Created new session: ${sessionId}`);
    return sessionId;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
    return session;
  }

  /**
   * Add message to session
   */
  addMessage(sessionId: string, message: Message): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.messages.push(message);
      
      // Keep only the most recent messages
      if (session.messages.length > this.maxHistory) {
        session.messages = session.messages.slice(-this.maxHistory);
      }
      
      session.lastActivity = Date.now();
      this.logger.info(`Added message to session ${sessionId}`, { role: message.role });
    }
  }

  /**
   * Get conversation history for a session
   */
  getHistory(sessionId: string): Message[] {
    const session = this.getSession(sessionId);
    return session ? [...session.messages] : [];
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.sessionTimeout * 1000) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
      this.logger.info(`Cleaned up expired session: ${sessionId}`);
    }

    if (expiredSessions.length > 0) {
      this.logger.info(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }
}
