export type TopicCategory = 'Ideas' | 'Chores' | 'Events' | 'Uncategorized';

export interface TopicCard {
  id: string;
  title: string;
  description: string;
  category: TopicCategory;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  category: TopicCategory;
  startTime: Date;
  endTime: Date;
  cardId?: string; // Link to the original card
}
