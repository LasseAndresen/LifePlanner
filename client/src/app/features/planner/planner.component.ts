import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardSidebarComponent } from './components/card-sidebar/card-sidebar.component';
import { CalendarGridComponent } from './components/calendar-grid/calendar-grid.component';
import { CardService } from '../../core/services/card.service';
import { CalendarService } from '../../core/services/calendar.service';
import { TopicCard } from '../../core/models/planner.models';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [CommonModule, CardSidebarComponent, CalendarGridComponent],
  template: `
    <div class="planner-layout">
      <app-card-sidebar [cards]="cardService.cards()"></app-card-sidebar>
      <app-calendar-grid 
        [events]="calendarService.events()"
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
  public cardService = inject(CardService);
  public calendarService = inject(CalendarService);

  onCardDropped(event: CdkDragDrop<any>) {
    if (event.previousContainer !== event.container) {
      // Card moved from sidebar to calendar
      const droppedCard = event.previousContainer.data[event.previousIndex] as TopicCard;
      
      // 1. Remove from sidebar service
      this.cardService.removeCard(droppedCard.id);
      
      // 2. Add to calendar service
      this.calendarService.addEvent({
        title: droppedCard.title,
        description: droppedCard.description,
        category: droppedCard.category,
        startTime: new Date(), // Mock date for MVP
        endTime: new Date(new Date().getTime() + 60 * 60 * 1000), // +1 hour
        cardId: droppedCard.id
      });
    }
  }
}
