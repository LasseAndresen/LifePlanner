export interface User {
  id: number;
  name: string;
  email: string;
  isAdmin?: boolean;
}

export interface WorkspaceMember {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface Workspace {
  id: number;
  name: string;
  role: string;
  members: WorkspaceMember[];
}

export interface Feedback {
  id: number;
  userId?: number;
  type: 'BugReport' | 'FeatureRequest' | 'Integration' | 'General';
  title: string;
  description: string;
  createdAt: string;
  status: string;
  adminNotes?: string;
  user?: User;
}

export interface AdminStats {
  totalUsers: number;
  totalCards: number;
  totalListItems: number;
  totalScheduledInstances: number;
  categoryStats: { name: string; color: string; cardCount: number }[];
  feedbackStats: { type: string; count: number }[];
  microsoftTodoConnectedCount: number;
  googleTasksConnectedCount: number;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  userId: number;
  workspaceId?: number;
}

export interface ScheduledInstance {
  id: number;
  date: string;
  isCompleted: boolean;
  userId: number;
  workspaceId?: number;
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
  isConfirmed?: boolean;
  googleEventId?: string;
}

export interface ListItem {
  id: number;
  text: string;
  isCompleted: boolean;
  cardId: number;
  integrationExternalId?: string;
  scheduledInstances: ScheduledInstance[];
  isNew?: boolean;
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
  workspaceId?: number;
  integrationSource?: string;
  integrationExternalId?: string;
  category?: Category;   // Populated when the backend includes the navigation property
  whiteboardX?: number;
  whiteboardY?: number;
  isStickyNote?: boolean;
  color?: string;
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

