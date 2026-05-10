import { Component, Input } from '@angular/core';
import { Card } from '../../../../core/models/planner.models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-topic-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="topic-card glass-panel" [style.border-left-color]="card.category?.color ?? '#6366f1'">
      <div class="card-header">
        <h4>{{ card.title }}</h4>
        <span class="category-badge">{{ card.category?.name ?? 'Uncategorized' }}</span>
      </div>
      <p class="description">{{ card.description }}</p>
    </div>
  `,
  styles: [`
    .topic-card {
      padding: 1rem;
      margin-bottom: 0.75rem;
      cursor: grab;
      transition: box-shadow 0.2s;
      border-left: 4px solid transparent;
    }
    .topic-card:active {
      cursor: grabbing;
      transform: scale(0.98);
    }
    .topic-card:hover {
      box-shadow: 0 8px 32px rgba(255, 255, 255, 0.1);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    }
    h4 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .category-badge {
      font-size: 0.7rem;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-full);
      background: var(--bg-secondary);
      color: var(--text-secondary);
    }
    .description {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
  `]
})
export class TopicCardComponent {
  @Input({ required: true }) card!: Card;
}

