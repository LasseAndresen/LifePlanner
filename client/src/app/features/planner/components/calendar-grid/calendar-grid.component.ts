import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent } from '../../../../core/models/planner.models';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-calendar-grid',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="calendar-container">
      <header class="calendar-header">
        <h1>Today's Plan</h1>
      </header>
      
      <div class="timeline glass-panel">
        <!-- Simplified 1-day timeline for MVP -->
        <div 
          class="drop-zone"
          cdkDropList
          id="calendarGridList"
          [cdkDropListData]="events"
          [cdkDropListConnectedTo]="['sidebarList']"
          (cdkDropListDropped)="onDrop($event)">
          
          @for (event of events; track event.id) {
            <div class="event-card glass-panel" [ngClass]="event.category.toLowerCase()">
              <h4>{{ event.title }}</h4>
              <span class="time">Scheduled</span>
            </div>
          } @empty {
            <div class="empty-timeline">
              <p>Your day is empty. Drag some cards here!</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .calendar-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 2rem;
      height: 100%;
    }
    .calendar-header {
      margin-bottom: 2rem;
    }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .timeline {
      flex: 1;
      padding: 1.5rem;
      background: rgba(255, 255, 255, 0.01);
      border-radius: var(--radius-lg);
      overflow-y: auto;
    }
    .drop-zone {
      min-height: 100%;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .empty-timeline {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      border: 2px dashed var(--border-glass-strong);
      border-radius: var(--radius-md);
      color: var(--text-muted);
      font-size: 1.1rem;
    }
    .event-card {
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .event-card h4 {
      margin: 0;
      font-size: 1.1rem;
      color: var(--text-primary);
    }
    .time {
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .ideas { border-left: 4px solid var(--color-ideas); }
    .chores { border-left: 4px solid var(--color-chores); }
    .events { border-left: 4px solid var(--color-events); }
  `]
})
export class CalendarGridComponent {
  @Input({ required: true }) events: CalendarEvent[] = [];
  @Output() cardDropped = new EventEmitter<CdkDragDrop<any>>();

  onDrop(event: CdkDragDrop<any>) {
    this.cardDropped.emit(event);
  }
}
