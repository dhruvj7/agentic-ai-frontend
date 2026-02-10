import { Component } from '@angular/core';
import { ChatAssistant } from '../chat-assistant/chat-assistant';

@Component({
  selector: 'app-chat-section',
  imports: [ChatAssistant],
  templateUrl: './chat-section.html',
  styleUrl: './chat-section.scss',
})
export class ChatSection {}
