import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Card, ListItem, ScheduledInstance } from '../models/planner.models';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class CardService {
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);
  private readonly userService = inject(UserService);
  private readonly cardsSignal = signal<Card[]>([]);
  private readonly scheduledInstancesSignal = signal<ScheduledInstance[]>([]);

  readonly cards = this.cardsSignal.asReadonly();
  readonly scheduledInstances = this.scheduledInstancesSignal.asReadonly();

  /** All topic cards displayed in the sidebar */
  readonly unscheduledCards = computed(() => this.cardsSignal());

  /** Scheduled instances shown on the calendar grid */
  readonly scheduledItems = computed(() => {
    const result: { instance: ScheduledInstance; item?: ListItem; card?: Card }[] = [];
    const cards = this.cardsSignal();
    
    // Create a map of item ID -> (item, card) for fast lookup
    const itemMap = new Map<number, { item: ListItem; card: Card }>();
    for (const card of cards) {
      for (const item of card.listItems) {
        itemMap.set(item.id, { item, card });
      }
    }

    for (const instance of this.scheduledInstancesSignal()) {
      if (instance.listItemId) {
        const match = itemMap.get(instance.listItemId);
        if (match) {
          result.push({ instance, item: match.item, card: match.card });
        } else {
          result.push({ instance });
        }
      } else {
        result.push({ instance });
      }
    }
    return result;
  });

  loadScheduledInstances(userId: number): void {
    this.http
      .get<ScheduledInstance[]>(`${environment.apiBaseUrl}/api/users/${userId}/scheduled-instances`)
      .pipe(
        catchError(err => {
          this.notifications.error('Failed to load calendar events.');
          return throwError(() => err);
        })
      )
      .subscribe(instances => this.scheduledInstancesSignal.set(instances));
  }

  loadCards(userId: number): void {
    this.loadScheduledInstances(userId);
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

    const updatedLocal = { ...current, ...updates };
    // Synchronously update local signal for instant UI layout alignment
    this.cardsSignal.update(cards =>
      cards.map(c => c.id === id ? updatedLocal : c)
    );

    return this.http
      .put<Card>(`${environment.apiBaseUrl}/api/cards/${id}`, updatedLocal)
      .pipe(
        catchError(err => {
          // Rollback to previous state if HTTP update fails
          this.cardsSignal.update(cards =>
            cards.map(c => c.id === id ? current : c)
          );
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
        tap(item => this.updateCardItems(cardId, items => [{ ...item, isNew: true }, ...items])),
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

          // Sync renamed text and completion status to active scheduled instances in-memory signal
          this.scheduledInstancesSignal.update(insts =>
            insts.map(s => s.listItemId === updated.id ? { ...s, title: updated.text, isCompleted: updated.isCompleted } : s)
          );
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

  createScheduledInstance(instance: Omit<ScheduledInstance, 'id'>): Observable<ScheduledInstance> {
    return this.http
      .post<ScheduledInstance>(`${environment.apiBaseUrl}/api/scheduled-instances`, instance)
      .pipe(
        tap(created => {
          this.scheduledInstancesSignal.update(insts => [...insts, created]);
          this.notifications.success('Event scheduled successfully!');
        }),
        catchError(err => {
          this.notifications.error('Could not schedule event.');
          return throwError(() => err);
        })
      );
  }

  updateScheduledInstance(id: number, updates: Partial<ScheduledInstance>): Observable<ScheduledInstance> {
    const current = this.scheduledInstancesSignal().find(s => s.id === id);
    if (!current) throw new Error('Scheduled instance not found');
    const payload = { ...current, ...updates };
    return this.http
      .put<ScheduledInstance>(`${environment.apiBaseUrl}/api/scheduled-instances/${id}`, payload)
      .pipe(
        tap(updated => {
          this.scheduledInstancesSignal.update(insts =>
            insts.map(s => s.id === id ? updated : s)
          );

          if (updated.listItemId) {
            this.cardsSignal.update(cards =>
              cards.map(c => ({
                ...c,
                listItems: c.listItems.map(item =>
                  item.id === updated.listItemId ? { ...item, isCompleted: updated.isCompleted } : item
                )
              }))
            );
          }
        }),
        catchError(err => {
          this.notifications.error('Could not update calendar event.');
          return throwError(() => err);
        })
      );
  }

  deleteScheduledInstance(id: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiBaseUrl}/api/scheduled-instances/${id}`)
      .pipe(
        tap(() => {
          this.scheduledInstancesSignal.update(insts => insts.filter(s => s.id !== id));
          this.notifications.success('Event unscheduled.');
        }),
        catchError(err => {
          this.notifications.error('Could not unschedule event.');
          return throwError(() => err);
        })
      );
  }

  scheduleItemInstance(cardId: number, itemId: number, dateIso: string): Observable<ScheduledInstance> {
    const userId = this.userService.currentUser()?.id;
    if (!userId) throw new Error('User not logged in');
    return this.createScheduledInstance({
      userId,
      listItemId: itemId,
      date: dateIso,
      isCompleted: false,
      isConfirmed: false
    });
  }

  updateItemInstance(cardId: number, itemId: number, instanceId: number, updates: Partial<ScheduledInstance>): Observable<ScheduledInstance> {
    return this.updateScheduledInstance(instanceId, updates);
  }

  deleteItemInstance(cardId: number, itemId: number, instanceId: number): Observable<void> {
    return this.deleteScheduledInstance(instanceId);
  }

  reorderChecklistItems(cardId: number, movedItemId: number, itemIds: number[]): Observable<Card> {
    return this.http
      .put<Card>(`${environment.apiBaseUrl}/api/cards/${cardId}/items/reorder`, { movedItemId, itemIds })
      .pipe(
        tap(updatedCard => {
          this.cardsSignal.update(cards =>
            cards.map(c => c.id === cardId ? updatedCard : c)
          );
        }),
        catchError(err => {
          this.notifications.error('Could not save item order.');
          return throwError(() => err);
        })
      );
  }

  updateCardItems(cardId: number, updater: (items: ListItem[]) => ListItem[]): void {
    this.cardsSignal.update(cards =>
      cards.map(c => c.id === cardId ? { ...c, listItems: updater(c.listItems) } : c)
    );
  }
  /**
   * Update the order of cards after drag-and-drop.
   */
  reorderCards(sortedCards: Card[]): void {
    // Map cards to their new index order
    const updatedCards = sortedCards.map((c, index) => ({
      ...c,
      order: index
    }));

    // Update signal locally for immediate UI feedback
    this.cardsSignal.set(updatedCards);

    // Persist the new order to the server
    const reorderDto = updatedCards.map(c => ({ id: c.id, order: c.order }));
    this.http.post(`${environment.apiBaseUrl}/api/cards/reorder`, reorderDto)
      .pipe(
        tap(() => this.notifications.success('Card order saved.')),
        catchError(err => {
          this.notifications.error('Failed to save card order.');
          return throwError(() => err);
        })
      )
      .subscribe();
  }
}
