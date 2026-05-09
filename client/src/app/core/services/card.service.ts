import { Injectable, signal } from '@angular/core';
import { TopicCard } from '../models/planner.models';

@Injectable({
  providedIn: 'root'
})
export class CardService {
  // Using Angular signals for state management
  private cardsSignal = signal<TopicCard[]>([
    { id: '1', title: 'Plan Paris Trip', description: 'Look up flights and hotels', category: 'Ideas' },
    { id: '2', title: 'Weekly Groceries', description: 'Milk, Eggs, Bread', category: 'Chores' },
    { id: '3', title: 'Call Mom', description: 'Catch up on Sunday', category: 'Uncategorized' },
    { id: '4', title: 'Date Night', description: 'Try the new Italian place', category: 'Events' }
  ]);

  readonly cards = this.cardsSignal.asReadonly();

  constructor() { }

  addCard(card: Omit<TopicCard, 'id'>) {
    const newCard = { ...card, id: crypto.randomUUID() };
    this.cardsSignal.update(cards => [...cards, newCard]);
  }

  removeCard(id: string) {
    this.cardsSignal.update(cards => cards.filter(c => c.id !== id));
  }
}
