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

export interface Card {
  id: number;
  title: string;
  description?: string;
  scheduledDate?: string; // ISO 8601 string; null/undefined means unscheduled
  categoryId: number;
  userId: number;
  category?: Category;   // Populated when the backend includes the navigation property
}
