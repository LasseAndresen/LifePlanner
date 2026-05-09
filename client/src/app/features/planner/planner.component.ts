import { Component, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardSidebarComponent } from './components/card-sidebar/card-sidebar.component';
import { CalendarGridComponent } from './components/calendar-grid/calendar-grid.component';
import { CardService } from '../../core/services/card.service';
import { CalendarService } from '../../core/services/calendar.service';
import { CategoryService } from '../../core/services/category.service';
import { UserService } from '../../core/services/user.service';
import { Card } from '../../core/models/planner.models';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [CommonModule, CardSidebarComponent, CalendarGridComponent],
  template: `
    <div class="planner-layout">
      <app-card-sidebar [cards]="cardService.unscheduledCards()"></app-card-sidebar>
      <app-calendar-grid 
        [scheduledCards]="calendarService.scheduledCards()"
        (cardDropped)="onCardDropped($event)">
      </app-calendar-grid>
    </div>
  `,
  styles: [`
    .planner-layout {
      display: flex;
      height: 100vh;
      width: 100vw;
      background-image: radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 40%),
                        radial-gradient(circle at bottom left, rgba(236, 72, 153, 0.15), transparent 40%);
    }
  `]
})
export class PlannerComponent {
  public readonly cardService = inject(CardService);
  public readonly calendarService = inject(CalendarService);
  public readonly categoryService = inject(CategoryService);
  private readonly userService = inject(UserService);

  constructor() {
    // When the user is bootstrapped, load their data
    effect(() => {
      const user = this.userService.currentUser();
      if (user) {
        this.cardService.loadCards(user.id);
        this.categoryService.loadCategories(user.id);
      }
    });
  }

  onCardDropped(event: CdkDragDrop<any>) {
    if (event.previousContainer !== event.container) {
      const droppedCard = event.previousContainer.data[event.previousIndex] as Card;
      // Set scheduledDate to now — the calendar grid date selection will be enhanced in a future iteration
      this.cardService.updateCard(droppedCard.id, {
        scheduledDate: new Date().toISOString()
      }).subscribe();
    }
  }
}
