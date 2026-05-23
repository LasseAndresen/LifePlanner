import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardSidebarComponent } from './components/card-sidebar/card-sidebar.component';
import { CalendarGridComponent } from './components/calendar-grid/calendar-grid.component';
import { CreateCardFormComponent, CardFormData } from './components/create-card-form/create-card-form.component';
import { IntegrationsDialogComponent } from './components/integrations-dialog/integrations-dialog.component';
import { CardService } from '../../core/services/card.service';
import { CalendarService } from '../../core/services/calendar.service';
import { CategoryService } from '../../core/services/category.service';
import { UserService } from '../../core/services/user.service';
import { Card, ListItem, ScheduledInstance } from '../../core/models/planner.models';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [CommonModule, CardSidebarComponent, CalendarGridComponent, CreateCardFormComponent, IntegrationsDialogComponent, DragDropModule],
  template: `
    <div class="planner-layout">
      <app-card-sidebar
          [cards]="cardService.unscheduledCards()"
          [connectedTo]="allDropLists()"
          (addCardClicked)="startCreateCard()"
          (editCardClicked)="onEditCard($event)"
          (integrationsClicked)="openIntegrations()"
          (itemDropped)="onItemDropped($event)"
          (cardsReordered)="onCardsReordered($event)">
      </app-card-sidebar>

      <app-calendar-grid
        [connectedTo]="allDropLists()"
        (itemDropped)="onItemDropped($event)"
        (instanceToggled)="onInstanceToggled($event)"
        (instanceUnscheduled)="onInstanceUnscheduled($event)">
      </app-calendar-grid>
    </div>

    @if (isFormOpen()) {
      <app-create-card-form
        [cardToEdit]="editingCard()"
        (submitted)="onCardFormSubmit($event)"
        (cancelled)="onCardFormCancel()">
      </app-create-card-form>
    }

    @if (isIntegrationsOpen()) {
      <app-integrations-dialog
        (closed)="isIntegrationsOpen.set(false)"
        (synced)="onIntegrationsSynced()">
      </app-integrations-dialog>
    }
  `,
  styles: [`
    .planner-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      height: 100vh;
      width: 100vw;
      background-image:
        radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 40%),
        radial-gradient(circle at bottom left, rgba(236, 72, 153, 0.15), transparent 40%);
      overflow: hidden;
    }
    .planner-layout > * {
      min-height: 0;
      min-width: 0;
      height: 100%;
      overflow: hidden;
    }
  `]
})
export class PlannerComponent {
  public readonly cardService = inject(CardService);
  public readonly calendarService = inject(CalendarService);
  public readonly categoryService = inject(CategoryService);
  private readonly userService = inject(UserService);
  private readonly notifications = inject(NotificationService);

  readonly calendarDayIds = computed(() => 
    this.calendarService.daysGrid().map(day => 'calendar-day-' + day.dateIso)
  );

  readonly cardItemIds = computed(() => 
    this.cardService.unscheduledCards().map(card => 'card-items-' + card.id)
  );

  readonly allDropLists = computed(() => [
    ...this.calendarDayIds(),
    ...this.cardItemIds()
  ]);

  readonly isFormOpen = signal(false);
  readonly editingCard = signal<Card | null>(null);
  readonly isIntegrationsOpen = signal(false);

  constructor() {
    effect(() => {
      const user = this.userService.currentUser();
      if (user) {
        this.cardService.loadCards(user.id);
        this.categoryService.loadCategories(user.id);
      }
    });
  }

  startCreateCard(): void {
    this.editingCard.set(null);
    this.isFormOpen.set(true);
  }

  onEditCard(card: Card): void {
    this.editingCard.set(card);
    this.isFormOpen.set(true);
  }

  onCardFormCancel(): void {
    this.editingCard.set(null);
    this.isFormOpen.set(false);
  }

  onCardFormSubmit(data: CardFormData): void {
    const currentEdit = this.editingCard();
    if (currentEdit) {
      this.cardService.updateCard(currentEdit.id, data).subscribe();
      this.editingCard.set(null);
    } else {
      const userId = this.userService.currentUser()?.id;
      if (!userId) return;
      this.cardService.createCard({
        ...data,
        userId,
        listItems: []
      }).subscribe();
    }
    this.isFormOpen.set(false);
  }

  onItemDropped(event: CdkDragDrop<any>): void {
    const prevId = event.previousContainer.id;
    const currId = event.container.id;
    const data = event.item.data as { instance?: ScheduledInstance; item: ListItem; card: Card };

    if (prevId !== currId) {
      if (!data?.item || !data?.card) {
        console.warn('onItemDropped returned early: item or card data is missing', data);
        return;
      }

      if (currId.startsWith('calendar-day-')) {
        const targetDateIso = currId.replace('calendar-day-', '');
        const targetDate = new Date(targetDateIso);
        const dateStr = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (data.instance) {
          this.cardService.updateItemInstance(data.card.id, data.item.id, data.instance.id, { date: targetDateIso }).subscribe({
            next: () => this.notifications.success(`Rescheduled "${data.item.text}" to ${dateStr}`)
          });
        } else {
          this.cardService.scheduleItemInstance(data.card.id, data.item.id, targetDateIso).subscribe({
            next: () => this.notifications.success(`Scheduled "${data.item.text}" on ${dateStr}`)
          });
        }
      } else if (currId.startsWith('card-items-')) {
        if (data.instance) {
          this.cardService.deleteItemInstance(data.card.id, data.item.id, data.instance.id).subscribe({
            next: () => this.notifications.success(`Unscheduled "${data.item.text}"`)
          });
        } else {
          const targetCardId = parseInt(currId.replace('card-items-', ''), 10);
          if (targetCardId !== data.card.id) {
            this.cardService.updateListItem(data.card.id, {
              ...data.item,
              cardId: targetCardId
            }).subscribe({
              next: () => {
                const targetCard = this.cardService.unscheduledCards().find(c => c.id === targetCardId);
                const cardTitle = targetCard ? targetCard.title : 'another card';
                this.notifications.success(`Moved "${data.item.text}" to "${cardTitle}"`);
              }
            });
          }
        }
      }
    }
  }

  // Handle reordered cards from sidebar
  onCardsReordered(cards: Card[]): void {
    this.cardService.reorderCards(cards);
  }

  onInstanceToggled({ cardId, itemId, instance }: { cardId: number; itemId: number; instance: ScheduledInstance }): void {
    this.cardService.updateItemInstance(cardId, itemId, instance.id, { isCompleted: !instance.isCompleted }).subscribe();
  }

  onInstanceUnscheduled({ cardId, itemId, instanceId }: { cardId: number; itemId: number; instanceId: number }): void {
    this.cardService.deleteItemInstance(cardId, itemId, instanceId).subscribe();
  }

  openIntegrations(): void {
    this.isIntegrationsOpen.set(true);
  }

  onIntegrationsSynced(): void {
    const user = this.userService.currentUser();
    if (user) {
      this.cardService.loadCards(user.id);
    }
  }
}
