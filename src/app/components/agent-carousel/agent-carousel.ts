import { Component, inject } from '@angular/core';
import { AgentContext } from '../../services/agent-context';
import { Agent } from '../../models/agent.model';

@Component({
  selector: 'app-agent-carousel',
  imports: [],
  templateUrl: './agent-carousel.html',
  styleUrl: './agent-carousel.scss',
})
export class AgentCarousel {
  private agentContext = inject(AgentContext);
  readonly agents = this.agentContext.agents;
  readonly selectedAgent = this.agentContext.selectedAgent;

  selectAgent(agent: Agent): void {
    this.agentContext.setSelectedAgent(agent);
  }
}
