import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryService } from '../../../../core/services/category.service';
import { UserService } from '../../../../core/services/user.service';

export interface CardFormData {
  title: string;
  description?: string;
  categoryId: number;
}

@Component({
  selector: 'app-create-card-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="backdrop" (click)="onCancel()">
      <div class="modal glass-panel" (click)="$event.stopPropagation()">

        <header class="modal-header">
          <h2>New Card</h2>
          <button class="close-btn" (click)="onCancel()">✕</button>
        </header>

        <div class="modal-body">
          <!-- Title -->
          <div class="field">
            <label for="card-title">Title <span class="required">*</span></label>
            <input
              id="card-title"
              type="text"
              [(ngModel)]="title"
              placeholder="What's on your mind?"
              (keydown.enter)="onSubmit()"
              autofocus />
          </div>

          <!-- Description -->
          <div class="field">
            <label for="card-desc">Description <span class="optional">optional</span></label>
            <textarea
              id="card-desc"
              [(ngModel)]="description"
              rows="3"
              placeholder="Add details..."></textarea>
          </div>

          <!-- Category -->
          <div class="field">
            <label>Category <span class="required">*</span></label>
            <div class="category-pills">
              @for (cat of categoryService.categories(); track cat.id) {
                <button
                  class="pill"
                  [class.selected]="selectedCategoryId === cat.id"
                  [style.--pill-color]="cat.color"
                  (click)="selectedCategoryId = cat.id">
                  <span class="dot" [style.background]="cat.color"></span>
                  {{ cat.name }}
                </button>
              }
              <button class="pill pill-new" (click)="showNewCat = !showNewCat">
                {{ showNewCat ? '✕' : '+ New' }}
              </button>
            </div>

            <!-- Inline new-category form -->
            @if (showNewCat) {
              <div class="new-cat-form">
                <input
                  [(ngModel)]="newCatName"
                  placeholder="Category name..."
                  (keydown.enter)="createCategory()" />
                <div class="swatches">
                  @for (color of presetColors; track color) {
                    <button
                      class="swatch"
                      [class.active]="newCatColor === color"
                      [style.background]="color"
                      (click)="newCatColor = color">
                    </button>
                  }
                </div>
                <button class="btn-add-cat" (click)="createCategory()" [disabled]="!newCatName.trim()">
                  Add Category
                </button>
              </div>
            }
          </div>
        </div>

        <footer class="modal-footer">
          <button class="btn-ghost" (click)="onCancel()">Cancel</button>
          <button class="btn-primary" (click)="onSubmit()" [disabled]="!isValid">
            Create Card →
          </button>
        </footer>

      </div>
    </div>
  `,
  styles: [`
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }
    .modal {
      width: 100%;
      max-width: 480px;
      margin: 1rem;
      border-radius: var(--radius-lg);
      background: rgba(18, 18, 30, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.12);
      animation: slideUp 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
      overflow: hidden;
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem 1.5rem 0;
    }
    h2 {
      font-size: 1.25rem;
      font-weight: 700;
      background: linear-gradient(90deg, #f8fafc, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1rem;
      cursor: pointer;
      padding: 0.25rem;
      line-height: 1;
      transition: color 0.15s;
    }
    .close-btn:hover { color: var(--text-primary); }

    .modal-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }

    .field { display: flex; flex-direction: column; gap: 0.5rem; }
    label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); letter-spacing: 0.04em; text-transform: uppercase; }
    .required { color: #ef4444; margin-left: 2px; }
    .optional { color: var(--text-muted); font-weight: 400; text-transform: none; letter-spacing: 0; font-size: 0.75rem; }

    input, textarea {
      width: 100%;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-sm);
      padding: 0.7rem 0.9rem;
      color: var(--text-primary);
      font-family: var(--font-family);
      font-size: 0.95rem;
      outline: none;
      resize: vertical;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    input:focus, textarea:focus {
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
    }
    input::placeholder, textarea::placeholder { color: var(--text-muted); }

    /* Category pills */
    .category-pills { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .pill {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-full);
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      font-family: var(--font-family);
    }
    .pill:hover { border-color: rgba(255, 255, 255, 0.25); color: var(--text-primary); }
    .pill.selected {
      background: color-mix(in srgb, var(--pill-color) 20%, transparent);
      border-color: var(--pill-color);
      color: var(--text-primary);
    }
    .pill-new { border-style: dashed; }
    .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

    /* New category inline form */
    .new-cat-form {
      margin-top: 0.75rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      animation: expandDown 0.2s ease-out;
    }
    .swatches { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .swatch {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.15s, border-color 0.15s;
    }
    .swatch:hover { transform: scale(1.15); }
    .swatch.active { border-color: white; transform: scale(1.1); }
    .btn-add-cat {
      align-self: flex-start;
      padding: 0.4rem 0.9rem;
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(99, 102, 241, 0.4);
      border-radius: var(--radius-full);
      color: #a5b4fc;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      font-family: var(--font-family);
      transition: background 0.15s;
    }
    .btn-add-cat:hover:not(:disabled) { background: rgba(99, 102, 241, 0.35); }
    .btn-add-cat:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Footer */
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem 1.5rem;
    }
    .btn-ghost {
      padding: 0.6rem 1.25rem;
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-full);
      color: var(--text-secondary);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      font-family: var(--font-family);
      transition: border-color 0.15s, color 0.15s;
    }
    .btn-ghost:hover { border-color: rgba(255, 255, 255, 0.3); color: var(--text-primary); }
    .btn-primary {
      padding: 0.6rem 1.4rem;
      background: linear-gradient(135deg, #6366f1, #ec4899);
      border: none;
      border-radius: var(--radius-full);
      color: white;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      font-family: var(--font-family);
      transition: opacity 0.15s, transform 0.15s;
    }
    .btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
    .btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(28px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1);    }
    }
    @keyframes expandDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0);    }
    }
  `]
})
export class CreateCardFormComponent {
  @Output() submitted = new EventEmitter<CardFormData>();
  @Output() cancelled = new EventEmitter<void>();

  protected readonly categoryService = inject(CategoryService);
  private readonly userService = inject(UserService);

  protected title = '';
  protected description = '';
  protected selectedCategoryId: number | null = null;

  protected showNewCat = false;
  protected newCatName = '';
  protected newCatColor = '#6366f1';

  protected readonly presetColors = [
    '#6366f1', '#ec4899', '#3b82f6', '#10b981',
    '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6',
    '#f97316', '#0ea5e9'
  ];

  protected get isValid(): boolean {
    return this.title.trim().length > 0 && this.selectedCategoryId !== null;
  }

  protected onSubmit(): void {
    if (!this.isValid) return;
    this.submitted.emit({
      title: this.title.trim(),
      description: this.description.trim() || undefined,
      categoryId: this.selectedCategoryId!
    });
    this.reset();
  }

  protected onCancel(): void {
    this.reset();
    this.cancelled.emit();
  }

  protected createCategory(): void {
    const userId = this.userService.currentUser()?.id;
    if (!this.newCatName.trim() || !userId) return;
    this.categoryService.createCategory({
      name: this.newCatName.trim(),
      color: this.newCatColor,
      userId
    }).subscribe(created => {
      this.selectedCategoryId = created.id;
      this.showNewCat = false;
      this.newCatName = '';
      this.newCatColor = this.presetColors[0];
    });
  }

  private reset(): void {
    this.title = '';
    this.description = '';
    this.selectedCategoryId = null;
    this.showNewCat = false;
    this.newCatName = '';
    this.newCatColor = this.presetColors[0];
  }
}
