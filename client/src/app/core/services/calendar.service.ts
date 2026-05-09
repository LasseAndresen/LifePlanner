import { Injectable, signal } from '@angular/core';
import { CalendarEvent } from '../models/planner.models';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private eventsSignal = signal<CalendarEvent[]>([]);
  readonly events = this.eventsSignal.asReadonly();

  constructor() { }

  addEvent(event: Omit<CalendarEvent, 'id'>) {
    const newEvent = { ...event, id: crypto.randomUUID() };
    this.eventsSignal.update(events => [...events, newEvent]);
  }

  removeEvent(id: string) {
    this.eventsSignal.update(events => events.filter(e => e.id !== id));
  }
}
