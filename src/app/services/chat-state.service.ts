import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { ChatMessage } from '../models/chat-message.model';

@Injectable({
  providedIn: 'root',
})
export class ChatStateService {
  private router = inject(Router);
  private storedMessages: ChatMessage[] = [];
  private storedSessionId: string | null = null;
  private subscription: ReturnType<typeof this.router.events.subscribe> | null = null;

  constructor() {
    this.subscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd && event.urlAfterRedirects === '/') {
        this.clear();
      }
    });
  }

  getMessages(): ChatMessage[] {
    return [...this.storedMessages];
  }

  getSessionId(): string | null {
    return this.storedSessionId;
  }

  save(messages: ChatMessage[], sessionId: string): void {
    this.storedMessages = messages;
    this.storedSessionId = sessionId;
  }

  clear(): void {
    this.storedMessages = [];
    this.storedSessionId = null;
  }

  hasStoredState(): boolean {
    return this.storedMessages.length > 0 || this.storedSessionId !== null;
  }
}
