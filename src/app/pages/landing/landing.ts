import { Component, inject, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Hero } from '../../components/hero/hero';
import { ProductsCarousel } from '../../components/products-carousel/products-carousel';
import { GuidanceSection } from '../../components/guidance-section/guidance-section';
import { ContactSection } from '../../components/contact-section/contact-section';
import { Testimonials } from '../../components/testimonials/testimonials';

@Component({
  selector: 'app-landing',
  imports: [Hero, ProductsCarousel, GuidanceSection, ContactSection, Testimonials],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements AfterViewInit {
  private router = inject(Router);

  ngAfterViewInit(): void {
    const fragment = this.router.parseUrl(this.router.url).fragment;
    if (fragment) {
      setTimeout(() => {
        document.getElementById(fragment)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }
}
