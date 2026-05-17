import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Card, ListItem } from '../models/planner.models';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class CardService {
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);
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
      .pipe(
        catchError(err => {
          this.notifications.error('Failed to load cards. Please try again.');
          return throwError(() => err);
        })
      )
      .subscribe(cards => this.cardsSignal.set(cards));
  }

  createCard(card: Omit<Card, 'id'>): Observable<Card> {
    return this.http
      .post<Card>(`${environment.apiBaseUrl}/api/cards`, card)
      .pipe(
        tap(created => {
          this.cardsSignal.update(cards => [...cards, created]);
          this.notifications.success('Card created successfully!');
        }),
        catchError(err => {
          this.notifications.error('Could not create card. ' + (err.error?.detail || ''));
          return throwError(() => err);
        })
      );
  }

  updateCard(id: number, updates: Partial<Card>): Observable<Card> {
    const current = this.cardsSignal().find(c => c.id === id);
    if (!current) throw new Error('Card not found');
    return this.http
      .put<Card>(`${environment.apiBaseUrl}/api/cards/${id}`, { ...current, ...updates })
      .pipe(
        tap(updated => this.cardsSignal.update(cards =>
          cards.map(c => c.id === id ? updated : c)
        )),
        catchError(err => {
          this.notifications.error('Update failed. ' + (err.error?.detail || ''));
          return throwError(() => err);
        })
      );
  }

  deleteCard(id: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiBaseUrl}/api/cards/${id}`)
      .pipe(
        tap(() => {
          this.cardsSignal.update(cards => cards.filter(c => c.id !== id));
          this.notifications.success('Card deleted.');
        }),
        catchError(err => {
          this.notifications.error('Could not delete card.');
          return throwError(() => err);
        })
      );
  }

  // --- List Item methods ---

  addListItem(cardId: number, text: string): Observable<ListItem> {
    return this.http
      .post<ListItem>(`${environment.apiBaseUrl}/api/cards/${cardId}/items`, { text, isCompleted: false, cardId })
      .pipe(
        tap(item => this.updateCardItems(cardId, items => [...items, item])),
        catchError(err => {
          this.notifications.error('Could not add item.');
          return throwError(() => err);
        })
      );
  }

  updateListItem(cardId: number, item: ListItem): Observable<ListItem> {
    return this.http
      .put<ListItem>(`${environment.apiBaseUrl}/api/cards/${cardId}/items/${item.id}`, item)
      .pipe(
        tap(updated => this.updateCardItems(cardId, items =>
          items.map(i => i.id === updated.id ? updated : i)
        )),
        catchError(err => {
          this.notifications.error('Could not update item.');
          return throwError(() => err);
        })
      );
  }

  deleteListItem(cardId: number, itemId: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiBaseUrl}/api/cards/${cardId}/items/${itemId}`)
      .pipe(
        tap(() => this.updateCardItems(cardId, items => items.filter(i => i.id !== itemId))),
        catchError(err => {
          this.notifications.error('Could not delete item.');
          return throwError(() => err);
        })
      );
  }

  private updateCardItems(cardId: number, updater: (items: ListItem[]) => ListItem[]): void {
    this.cardsSignal.update(cards =>
      cards.map(c => c.id === cardId ? { ...c, listItems: updater(c.listItems) } : c)
    );
  }
}
