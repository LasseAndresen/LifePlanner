export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  userId: number;
}

export interface ScheduledInstance {
  id: number;
  date: string;
  isCompleted: boolean;
  listItemId: number;
}

export interface ListItem {
  id: number;
  text: string;
  isCompleted: boolean;
  cardId: number;
  scheduledInstances: ScheduledInstance[];
}

export interface Card {
  order?: number;
  id: number;
  title: string;
  description?: string;
  scheduledDate?: string; // ISO 8601 string; null/undefined means unscheduled
  isChecklist: boolean;
  listItems: ListItem[];
  categoryId: number;
  userId: number;
  category?: Category;   // Populated when the backend includes the navigation property
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

export interface DayColumn {
  date: Date;
  dateIso: string;
  label: string;
  items: { instance: ScheduledInstance; item: ListItem; card: Card }[];
  googleEvents: GoogleCalendarEvent[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

