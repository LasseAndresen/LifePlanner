import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { Card } from '../models/planner.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CardService {
  private readonly http = inject(HttpClient);
  private readonly cardsSignal = signal<Card[]>([]);

  readonly cards = this.cardsSignal.asReadonly();

  /** Cards that have not yet been placed on the calendar */
  readonly unscheduledCards = computed(() =>
    this.cardsSignal().filter(c => !c.scheduledDate)
  );

  /** Cards that have been scheduled (dropped onto the calendar) */
  readonly scheduledCards = computed(() =>
    this.cardsSignal().filter(c => !!c.scheduledDate)
  );

  loadCards(userId: number): void {
    this.http
      .get<Card[]>(`${environment.apiBaseUrl}/api/users/${userId}/cards`)
      .subscribe(cards => this.cardsSignal.set(cards));
  }

  createCard(card: Omit<Card, 'id'>): Observable<Card> {
    return this.http
      .post<Card>(`${environment.apiBaseUrl}/api/cards`, card)
      .pipe(tap(created => this.cardsSignal.update(cards => [...cards, created])));
  }

  updateCard(id: number, updates: Partial<Card>): Observable<void> {
    const current = this.cardsSignal().find(c => c.id === id);
    if (!current) return of(undefined);
    return this.http
      .put<void>(`${environment.apiBaseUrl}/api/cards/${id}`, { ...current, ...updates })
      .pipe(tap(() => this.cardsSignal.update(cards =>
        cards.map(c => c.id === id ? { ...c, ...updates } : c)
      )));
  }

  deleteCard(id: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiBaseUrl}/api/cards/${id}`)
      .pipe(tap(() => this.cardsSignal.update(cards => cards.filter(c => c.id !== id))));
  }
}
