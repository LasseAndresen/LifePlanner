import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardSidebarComponent } from './components/card-sidebar/card-sidebar.component';
import { CalendarGridComponent } from './components/calendar-grid/calendar-grid.component';
import { CreateCardFormComponent, CardFormData } from './components/create-card-form/create-card-form.component';
import { CardService } from '../../core/services/card.service';
import { CalendarService } from '../../core/services/calendar.service';
import { CategoryService } from '../../core/services/category.service';
import { UserService } from '../../core/services/user.service';
import { Card, ListItem, ScheduledInstance } from '../../core/models/planner.models';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [CommonModule, CardSidebarComponent, CalendarGridComponent, CreateCardFormComponent, DragDropModule],
  template: `
    <div class="planner-layout" cdkDropListGroup>
      <app-card-sidebar
          [cards]="cardService.unscheduledCards()"
          (addCardClicked)="startCreateCard()"
          (editCardClicked)="onEditCard($event)"
          (itemDropped)="onItemDropped($event)"
          (cardsReordered)="onCardsReordered($event)">
      </app-card-sidebar>

      <app-calendar-grid
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

  readonly isFormOpen = signal(false);
  readonly editingCard = signal<Card | null>(null);

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
    if (event.previousContainer !== event.container) {
      const data = event.item.data as { instance?: ScheduledInstance; item: ListItem; card: Card };
      if (!data?.item || !data?.card) return;

      if (event.container.id.startsWith('calendar-day-')) {
        const targetDateIso = event.container.id.replace('calendar-day-', '');
        if (data.instance) {
          this.cardService.updateItemInstance(data.card.id, data.item.id, data.instance.id, { date: targetDateIso }).subscribe();
        } else {
          this.cardService.scheduleItemInstance(data.card.id, data.item.id, targetDateIso).subscribe();
        }
      } else if (event.container.id.startsWith('card-items-')) {
        if (data.instance) {
          this.cardService.deleteItemInstance(data.card.id, data.item.id, data.instance.id).subscribe();
        } else {
          const targetCardId = parseInt(event.container.id.replace('card-items-', ''), 10);
          if (targetCardId !== data.card.id) {
            this.cardService.updateListItem(data.card.id, {
              ...data.item,
              cardId: targetCardId
            }).subscribe();
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
}
