import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChatAssistant } from '../../components/chat-assistant/chat-assistant';

@Component({
  selector: 'app-chat',
  imports: [RouterLink, ChatAssistant],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
})
export class Chat {}
