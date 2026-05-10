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
        (addCardClicked)="isFormOpen.set(true)"
        (cardDropped)="onCardDropped($event)">
      </app-card-sidebar>

      <app-calendar-grid
        [scheduledCards]="calendarService.scheduledCards()"
        (cardDropped)="onCardDropped($event)">
      </app-calendar-grid>
    </div>

    @if (isFormOpen()) {
      <app-create-card-form
        (submitted)="onCardFormSubmit($event)"
        (cancelled)="isFormOpen.set(false)">
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
  `]
})
export class PlannerComponent {
  public readonly cardService = inject(CardService);
  public readonly calendarService = inject(CalendarService);
  public readonly categoryService = inject(CategoryService);
  private readonly userService = inject(UserService);

  readonly isFormOpen = signal(false);

  constructor() {
    effect(() => {
      const user = this.userService.currentUser();
      if (user) {
        this.cardService.loadCards(user.id);
        this.categoryService.loadCategories(user.id);
      }
    });
  }

  onCardFormSubmit(data: CardFormData): void {
    const userId = this.userService.currentUser()?.id;
    if (!userId) return;
    this.cardService.createCard({ ...data, userId }).subscribe();
    this.isFormOpen.set(false);
  }

  onCardDropped(event: CdkDragDrop<any>): void {
    if (event.previousContainer !== event.container) {
      const droppedCard = event.item.data as Card;
      
      if (event.container.id === 'calendarGridList') {
        // Moving from sidebar to calendar -> Schedule it
        this.cardService.updateCard(droppedCard.id, {
          scheduledDate: new Date().toISOString()
        }).subscribe();
      } else if (event.container.id === 'sidebarList') {
        // Moving from calendar to sidebar -> Unschedule it
        this.cardService.updateCard(droppedCard.id, {
          scheduledDate: undefined // Backend will handle null/missing as unscheduled
        }).subscribe();
      }
    }
  }
}
