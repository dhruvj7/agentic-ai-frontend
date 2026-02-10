import { Component } from '@angular/core';
import { MOCK_TESTIMONIALS } from '../../data/mock-testimonials';

@Component({
  selector: 'app-testimonials',
  imports: [],
  templateUrl: './testimonials.html',
  styleUrl: './testimonials.scss',
})
export class Testimonials {
  readonly testimonials = MOCK_TESTIMONIALS;
}
