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

export interface ListItem {
  id: number;
  text: string;
  isCompleted: boolean;
  cardId: number;
}

export interface Card {
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
