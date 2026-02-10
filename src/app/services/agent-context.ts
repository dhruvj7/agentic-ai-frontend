import { Injectable, signal, computed } from '@angular/core';
import { Agent, AGENTS } from '../models/agent.model';

@Injectable({
  providedIn: 'root',
})
export class AgentContext {
  private selectedAgentId = signal<string | null>(null);
  readonly selectedAgent = computed<Agent | null>(() => {
    const id = this.selectedAgentId();
    return id ? AGENTS.find(a => a.id === id) ?? null : null;
  });
  readonly agents = AGENTS;

  setSelectedAgent(agent: Agent | null): void {
    this.selectedAgentId.set(agent?.id ?? null);
  }

  selectAgentById(id: string): void {
    const agent = AGENTS.find(a => a.id === id) ?? null;
    this.setSelectedAgent(agent);
  }
}
