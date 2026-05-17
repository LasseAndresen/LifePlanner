import { Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardSidebarComponent } from './components/card-sidebar/card-sidebar.component';
import { CalendarGridComponent } from './components/calendar-grid/calendar-grid.component';
import { CreateCardFormComponent, CardFormData } from './components/create-card-form/create-card-form.component';
import { CardService } from '../../core/services/card.service';
import { CalendarService } from '../../core/services/calendar.service';
import { CategoryService } from '../../core/services/category.service';
import { UserService } from '../../core/services/user.service';
import { Card } from '../../core/models/planner.models';
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
        (cardDropped)="onCardDropped($event)">
      </app-card-sidebar>

      <app-calendar-grid
        [scheduledCards]="calendarService.scheduledCards()"
        [googleEvents]="calendarService.googleEvents()"
        (cardDropped)="onCardDropped($event)"
        (cardEdited)="onEditCard($event)"
        (cardDeleted)="onCardDeleted($event)">
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
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        const start = new Date(today);
        start.setDate(today.getDate() - diffToMonday); // Start of this week (Monday)
        
        const end = new Date(start);
        end.setDate(end.getDate() + 7); // 7 days from Monday
        
        this.calendarService.loadGoogleEvents(user.id, start, end);
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

  onCardDropped(event: CdkDragDrop<any>): void {
    if (event.previousContainer !== event.container) {
      const droppedCard = event.item.data as Card;
      
      if (event.container.id.startsWith('calendar-day-')) {
        // Moving from sidebar to calendar -> Schedule it
        const dateIso = event.container.id.replace('calendar-day-', '');
        this.cardService.updateCard(droppedCard.id, {
          scheduledDate: dateIso
        }).subscribe();
      } else if (event.container.id === 'sidebarList') {
        // Moving from calendar to sidebar -> Unschedule it
        this.cardService.updateCard(droppedCard.id, {
          scheduledDate: undefined // Backend will handle null/missing as unscheduled
        }).subscribe();
      }
    }
  }

  onCardDeleted(card: Card): void {
    this.cardService.deleteCard(card.id).subscribe();
  }
}
