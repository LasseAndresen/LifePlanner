import { Injectable, inject } from '@angular/core';
import { CardService } from './card.service';

/**
 * CalendarService is a thin view-layer helper that surfaces the scheduled
 * subset of cards. All state lives in CardService; this service just provides
 * a stable API for calendar-aware components.
 */
@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private readonly cardService = inject(CardService);

  /** Cards that have a scheduledDate — shown on the calendar grid */
  readonly scheduledCards = this.cardService.scheduledCards;
}
