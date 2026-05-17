import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardService } from './card.service';
import { GoogleCalendarEvent } from '../models/planner.models';
import { environment } from '../../../environments/environment';

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
  private readonly http = inject(HttpClient);

  /** Cards that have a scheduledDate — shown on the calendar grid */
  readonly scheduledCards = this.cardService.scheduledCards;

  /** Google Calendar Events */
  readonly googleEvents = signal<GoogleCalendarEvent[]>([]);

  loadGoogleEvents(userId: number, start: Date, end: Date) {
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    this.http.get<GoogleCalendarEvent[]>(`${environment.apiBaseUrl}/api/calendar/events/${userId}?start=${startIso}&end=${endIso}`)
      .subscribe({
        next: (events) => this.googleEvents.set(events || []),
        error: (err) => console.error('Failed to load Google Calendar events', err)
      });
  }
}
