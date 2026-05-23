import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CardService } from './card.service';
import { UserService } from './user.service';
import { GoogleCalendarEvent, DayColumn } from '../models/planner.models';
import { environment } from '../../../environments/environment';

/**
 * CalendarService manages the current calendar navigation and view state (week/month),
 * computes the grid of days to display along with their scheduled events/items,
 * and reactively loads Google Calendar events for the active date range.
 */
@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private readonly cardService = inject(CardService);
  private readonly userService = inject(UserService);
  private readonly http = inject(HttpClient);

  /** List items that have a scheduledDate — shown on the calendar grid */
  readonly scheduledItems = this.cardService.scheduledItems;

  /** Google Calendar Events */
  readonly googleEvents = signal<GoogleCalendarEvent[]>([]);

  /** Active view mode ('week' or 'month') */
  readonly viewMode = signal<'week' | 'month'>(
    (localStorage.getItem('lifeplanner_calendar_view_mode') as 'week' | 'month') || 'week'
  );

  /** Anchor date of the current view */
  readonly currentDate = signal<Date>(new Date());

  /** Calculates start and end Date for the visible range of the active view */
  readonly dateRange = computed(() => {
    const date = this.currentDate();
    const mode = this.viewMode();
    
    let start: Date;
    let end: Date;
    
    if (mode === 'week') {
      const dayOfWeek = date.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      start = new Date(date);
      start.setDate(date.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      
      end = new Date(start);
      end.setDate(start.getDate() + 7);
      end.setMilliseconds(-1); // End of Sunday
    } else {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
      
      // Monday of the week containing the first of the month
      const startDayOfWeek = firstOfMonth.getDay();
      const startDiff = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
      start = new Date(firstOfMonth);
      start.setDate(firstOfMonth.getDate() - startDiff);
      start.setHours(0, 0, 0, 0);
      
      const lastOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
      // Sunday of the week containing the last of the month
      const endDayOfWeek = lastOfMonth.getDay();
      const endDiff = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek;
      end = new Date(lastOfMonth);
      end.setDate(lastOfMonth.getDate() + endDiff);
      end.setHours(23, 59, 59, 999);
    }
    
    return { start, end };
  });

  /** Header title representing the active date range/month */
  readonly headerTitle = computed(() => {
    const date = this.currentDate();
    const mode = this.viewMode();
    
    if (mode === 'month') {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      const range = this.dateRange();
      const start = range.start;
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      
      const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      
      if (startYear !== endYear) {
        return `${startMonth} ${start.getDate()}, ${startYear} – ${endMonth} ${end.getDate()}, ${endYear}`;
      } else if (startMonth !== endMonth) {
        return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${startYear}`;
      } else {
        return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${startYear}`;
      }
    }
  });

  /** Computes the array of days to render in the grid and distributes events/items */
  readonly daysGrid = computed<DayColumn[]>(() => {
    const range = this.dateRange();
    const mode = this.viewMode();
    const anchorDate = this.currentDate();
    const items = this.scheduledItems();
    const gEvents = this.googleEvents();
    
    const days: DayColumn[] = [];
    const current = new Date(range.start);
    
    while (current <= range.end) {
      const date = new Date(current);
      days.push({
        date,
        dateIso: date.toISOString(),
        label: date.toDateString(),
        items: [],
        googleEvents: [],
        isCurrentMonth: mode === 'week' ? true : date.getMonth() === anchorDate.getMonth(),
        isToday: this.isSameDay(date, new Date())
      });
      current.setDate(current.getDate() + 1);
    }
    
    // Helper to find a DayColumn matching a date string
    const findDayColumn = (dateString: string | undefined): DayColumn | undefined => {
      if (!dateString) return undefined;
      const date = new Date(dateString);
      date.setHours(0, 0, 0, 0);
      const time = date.getTime();
      return days.find(d => {
        const dCopy = new Date(d.date);
        dCopy.setHours(0, 0, 0, 0);
        return dCopy.getTime() === time;
      });
    };

    items.forEach(entry => {
      const col = findDayColumn(entry.instance.date);
      if (col) col.items.push(entry);
    });

    gEvents.forEach(event => {
      const startStr = event.start?.dateTime || event.start?.date;
      const col = findDayColumn(startStr);
      if (col) col.googleEvents.push(event);
    });
    
    return days;
  });

  constructor() {
    // Automatically load Google Calendar events when current user or dateRange changes
    effect(() => {
      const user = this.userService.currentUser();
      if (!user) {
        this.googleEvents.set([]);
        return;
      }
      const range = this.dateRange();
      this.loadGoogleEvents(user.id, range.start, range.end);
    });
  }

  loadGoogleEvents(userId: number, start: Date, end: Date) {
    const startIso = start.toISOString();
    const endIso = end.toISOString();
    this.http.get<GoogleCalendarEvent[]>(`${environment.apiBaseUrl}/api/calendar/events/${userId}?start=${startIso}&end=${endIso}`)
      .subscribe({
        next: (events) => this.googleEvents.set(events || []),
        error: (err) => console.error('Failed to load Google Calendar events', err)
      });
  }

  next(): void {
    const current = this.currentDate();
    const mode = this.viewMode();
    if (mode === 'week') {
      const nextWeek = new Date(current);
      nextWeek.setDate(current.getDate() + 7);
      this.currentDate.set(nextWeek);
    } else {
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      const maxDay = new Date(current.getFullYear(), current.getMonth() + 2, 0).getDate();
      const targetDay = Math.min(current.getDate(), maxDay);
      nextMonth.setDate(targetDay);
      this.currentDate.set(nextMonth);
    }
  }

  prev(): void {
    const current = this.currentDate();
    const mode = this.viewMode();
    if (mode === 'week') {
      const prevWeek = new Date(current);
      prevWeek.setDate(current.getDate() - 7);
      this.currentDate.set(prevWeek);
    } else {
      const prevMonth = new Date(current.getFullYear(), current.getMonth() - 1, 1);
      const maxDay = new Date(current.getFullYear(), current.getMonth(), 0).getDate();
      const targetDay = Math.min(current.getDate(), maxDay);
      prevMonth.setDate(targetDay);
      this.currentDate.set(prevMonth);
    }
  }

  today(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    this.currentDate.set(today);
  }

  setViewMode(mode: 'week' | 'month'): void {
    this.viewMode.set(mode);
    localStorage.setItem('lifeplanner_calendar_view_mode', mode);
  }

  private isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }
}
