import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Card, ListItem, ScheduledInstance } from '../models/planner.models';
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

  /** All topic cards displayed in the sidebar */
  readonly unscheduledCards = computed(() => this.cardsSignal());

  /** Scheduled instances shown on the calendar grid */
  readonly scheduledItems = computed(() => {
    const result: { instance: ScheduledInstance; item: ListItem; card: Card }[] = [];
    for (const card of this.cardsSignal()) {
      for (const item of card.listItems) {
        if (item.scheduledInstances) {
          for (const instance of item.scheduledInstances) {
            result.push({ instance, item, card });
          }
        }
      }
    }
    return result;
  });

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
      .post<ListItem>(`${environment.apiBaseUrl}/api/cards/${cardId}/items`, { text, isCompleted: false, cardId, scheduledInstances: [] })
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
        tap(updated => {
          this.cardsSignal.update(cards => {
            if (cardId !== updated.cardId) {
              return cards.map(c => {
                if (c.id === cardId) {
                  return { ...c, listItems: c.listItems.filter(i => i.id !== updated.id) };
                }
                if (c.id === updated.cardId) {
                  return { ...c, listItems: [...c.listItems, updated] };
                }
                return c;
              });
            } else {
              return cards.map(c =>
                c.id === cardId ? { ...c, listItems: c.listItems.map(i => i.id === updated.id ? updated : i) } : c
              );
            }
          });
        }),
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

  // --- Scheduled Instance methods ---

  scheduleItemInstance(cardId: number, itemId: number, dateIso: string): Observable<ScheduledInstance> {
    return this.http
      .post<ScheduledInstance>(`${environment.apiBaseUrl}/api/cards/${cardId}/items/${itemId}/instances`, {
        date: dateIso,
        isCompleted: false,
        listItemId: itemId
      })
      .pipe(
        tap(created => {
          this.cardsSignal.update(cards => cards.map(c => c.id === cardId ? {
            ...c,
            listItems: c.listItems.map(i => i.id === itemId ? {
              ...i,
              scheduledInstances: [...(i.scheduledInstances || []), created]
            } : i)
          } : c));
        }),
        catchError(err => {
          this.notifications.error('Could not schedule item.');
          return throwError(() => err);
        })
      );
  }

  updateItemInstance(cardId: number, itemId: number, instanceId: number, updates: Partial<ScheduledInstance>): Observable<ScheduledInstance> {
    let currentInst: ScheduledInstance | undefined;
    const card = this.cardsSignal().find(c => c.id === cardId);
    if (card) {
      const item = card.listItems.find(i => i.id === itemId);
      if (item && item.scheduledInstances) {
        currentInst = item.scheduledInstances.find(s => s.id === instanceId);
      }
    }
    if (!currentInst) throw new Error('Scheduled instance not found');

    const payload = { ...currentInst, ...updates };
    return this.http
      .put<ScheduledInstance>(`${environment.apiBaseUrl}/api/cards/${cardId}/items/${itemId}/instances/${instanceId}`, payload)
      .pipe(
        tap(updated => {
          this.cardsSignal.update(cards => cards.map(c => c.id === cardId ? {
            ...c,
            listItems: c.listItems.map(i => i.id === itemId ? {
              ...i,
              scheduledInstances: (i.scheduledInstances || []).map(s => s.id === instanceId ? updated : s)
            } : i)
          } : c));
        }),
        catchError(err => {
          this.notifications.error('Could not update scheduled item.');
          return throwError(() => err);
        })
      );
  }

  deleteItemInstance(cardId: number, itemId: number, instanceId: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiBaseUrl}/api/cards/${cardId}/items/${itemId}/instances/${instanceId}`)
      .pipe(
        tap(() => {
          this.cardsSignal.update(cards => cards.map(c => c.id === cardId ? {
            ...c,
            listItems: c.listItems.map(i => i.id === itemId ? {
              ...i,
              scheduledInstances: (i.scheduledInstances || []).filter(s => s.id !== instanceId)
            } : i)
          } : c));
        }),
        catchError(err => {
          this.notifications.error('Could not unschedule item.');
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
