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
  userId: number;
  listItemId?: number;
  categoryId?: number;
  category?: Category;
  title?: string;
  description?: string;
  type?: string;
  startTime?: string;
  endTime?: string;
  parentCardTitle?: string;
  integrationSource?: string;
}

export interface ListItem {
  id: number;
  text: string;
  isCompleted: boolean;
  cardId: number;
  integrationExternalId?: string;
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
  integrationSource?: string;
  integrationExternalId?: string;
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
  items: { instance: ScheduledInstance; item?: ListItem; card?: Card }[];
  googleEvents: GoogleCalendarEvent[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

