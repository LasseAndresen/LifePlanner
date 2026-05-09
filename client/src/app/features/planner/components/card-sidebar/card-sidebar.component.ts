import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopicCard } from '../../../../core/models/planner.models';
import { TopicCardComponent } from '../topic-card/topic-card.component';
import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-card-sidebar',
  standalone: true,
  imports: [CommonModule, TopicCardComponent, DragDropModule],
  template: `
    <div class="sidebar-container glass-panel">
      <h2>Ideas & Tasks</h2>
      <p class="subtitle">Drag cards onto your calendar</p>
      
      <div 
        class="card-list"
        cdkDropList
        id="sidebarList"
        [cdkDropListData]="cards"
        [cdkDropListConnectedTo]="['calendarGridList']">
        
        @for (card of cards; track card.id) {
          <app-topic-card 
            [card]="card" 
            cdkDrag 
            [cdkDragData]="card">
          </app-topic-card>
        } @empty {
          <p class="empty-state">No cards available.</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .sidebar-container {
      width: 320px;
      height: 100%;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      border-radius: 0;
      border-top: none;
      border-bottom: none;
      border-left: none;
      background: rgba(18, 18, 26, 0.6);
    }
    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }
    .subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 1.5rem;
    }
    .card-list {
      flex: 1;
      overflow-y: auto;
      min-height: 100px;
    }
    .empty-state {
      color: var(--text-muted);
      font-style: italic;
      text-align: center;
      margin-top: 2rem;
    }
    /* CDK Drag & Drop styles */
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: var(--radius-md);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
      opacity: 0.9;
    }
    .cdk-drag-placeholder {
      opacity: 0;
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `]
})
export class CardSidebarComponent {
  @Input({ required: true }) cards: TopicCard[] = [];
}
