import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { AGENTS } from '../../models/agent.model';

const AUTO_PLAY_MS = 4500;

@Component({
  selector: 'app-products-carousel',
  imports: [],
  templateUrl: './products-carousel.html',
  styleUrl: './products-carousel.scss',
})
export class ProductsCarousel implements OnInit, OnDestroy {
  readonly agents = AGENTS;
  readonly currentIndex = signal(0);
  readonly offset = computed(() => {
    const n = this.agents.length;
    return (-100 / n) * this.currentIndex();
  });
  private autoPlayTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.autoPlayTimer = setInterval(() => {
      this.currentIndex.update(i => (i === this.agents.length - 1 ? 0 : i + 1));
    }, AUTO_PLAY_MS);
  }

  ngOnDestroy(): void {
    if (this.autoPlayTimer) clearInterval(this.autoPlayTimer);
  }

  prev(): void {
    this.currentIndex.update(i => (i === 0 ? this.agents.length - 1 : i - 1));
  }

  next(): void {
    this.currentIndex.update(i => (i === this.agents.length - 1 ? 0 : i + 1));
  }

  goTo(index: number): void {
    this.currentIndex.set(index);
  }
}
