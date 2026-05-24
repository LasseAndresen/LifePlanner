import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { UserService } from '../../../../core/services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-feedback-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close()">
      <div class="modal-container glass-panel" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <header class="modal-header">
          <div class="header-title-area">
            <span class="icon-sparkle">💬</span>
            <h2>Send Feedback</h2>
            <p class="subtitle">Bug report, feature request, or general feedback. We love ideas!</p>
          </div>
          <button class="close-btn" (click)="close()" aria-label="Close dialog">✕</button>
        </header>

        <!-- Body -->
        <div class="modal-body">
          <form (ngSubmit)="onSubmit()" #feedbackForm="ngForm" class="feedback-form">
            
            <!-- Type Buttons -->
            <div class="form-group">
              <label class="form-label">Category</label>
              <div class="type-selector-grid">
                <button type="button" 
                        class="type-btn bug-theme" 
                        [class.active]="selectedType() === 'BugReport'"
                        (click)="selectedType.set('BugReport')">
                  <span class="type-icon">🐞</span>
                  <span class="type-label">Bug Report</span>
                </button>
                <button type="button" 
                        class="type-btn feature-theme" 
                        [class.active]="selectedType() === 'FeatureRequest'"
                        (click)="selectedType.set('FeatureRequest')">
                  <span class="type-icon">✨</span>
                  <span class="type-label">Feature</span>
                </button>
                <button type="button" 
                        class="type-btn integration-theme" 
                        [class.active]="selectedType() === 'Integration'"
                        (click)="selectedType.set('Integration')">
                  <span class="type-icon">🔌</span>
                  <span class="type-label">Integration</span>
                </button>
                <button type="button" 
                        class="type-btn general-theme" 
                        [class.active]="selectedType() === 'General'"
                        (click)="selectedType.set('General')">
                  <span class="type-icon">💬</span>
                  <span class="type-label">General</span>
                </button>
              </div>
            </div>

            <!-- Title -->
            <div class="form-group">
              <label for="title" class="form-label">Title</label>
              <input type="text" 
                     id="title" 
                     name="title" 
                     required 
                     placeholder="Briefly state your topic..."
                     [(ngModel)]="titleText"
                     class="glass-input" />
            </div>

            <!-- Description -->
            <div class="form-group">
              <label for="description" class="form-label">Details</label>
              <textarea id="description" 
                        name="description" 
                        required 
                        rows="4"
                        placeholder="Provide details. What would you like to see? Or how can we reproduce the bug?"
                        [(ngModel)]="descriptionText"
                        class="glass-textarea"></textarea>
            </div>

            <!-- Actions -->
            <div class="form-actions">
              <button type="button" class="cancel-btn" (click)="close()">Cancel</button>
              <button type="submit" 
                      class="submit-btn" 
                      [disabled]="isSubmitting() || !feedbackForm.form.valid">
                @if (isSubmitting()) {
                  <span class="spinner"></span> Sending...
                } @else {
                  Submit Feedback
                }
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(5, 5, 10, 0.7);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.25s ease-out;
    }
    
    .modal-container {
      width: 90%;
      max-width: 540px;
      display: flex;
      flex-direction: column;
      background: rgba(18, 18, 28, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;
    }

    .header-title-area {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .icon-sparkle {
      font-size: 1.1rem;
      margin-bottom: 0.1rem;
    }
    h2 {
      font-size: 1.3rem;
      font-weight: 700;
      margin: 0;
      background: linear-gradient(90deg, var(--text-primary), var(--text-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 1.1rem;
      cursor: pointer;
      padding: 0.2rem 0.5rem;
      border-radius: 50%;
      transition: all 0.15s;
    }
    .close-btn:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.08);
    }

    .modal-body {
      padding: 1.5rem;
    }

    .feedback-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .form-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Grid of choices */
    .type-selector-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
    }

    .type-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.4rem;
      padding: 0.75rem 0.5rem;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .type-icon {
      font-size: 1.3rem;
      transition: transform 0.2s;
    }

    .type-label {
      font-size: 0.72rem;
      font-weight: 550;
      color: var(--text-secondary);
      text-align: center;
    }

    .type-btn:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.12);
      transform: translateY(-2px);
    }
    .type-btn:hover .type-icon {
      transform: scale(1.15);
    }

    /* Active States */
    .type-btn.active.bug-theme {
      background: rgba(239, 68, 68, 0.08);
      border-color: rgba(239, 68, 68, 0.4);
    }
    .type-btn.active.bug-theme .type-label { color: #fca5a5; }

    .type-btn.active.feature-theme {
      background: rgba(236, 72, 153, 0.08);
      border-color: rgba(236, 72, 153, 0.4);
    }
    .type-btn.active.feature-theme .type-label { color: #fbcfe8; }

    .type-btn.active.integration-theme {
      background: rgba(59, 130, 246, 0.08);
      border-color: rgba(59, 130, 246, 0.4);
    }
    .type-btn.active.integration-theme .type-label { color: #bfdbfe; }

    .type-btn.active.general-theme {
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.4);
    }
    .type-btn.active.general-theme .type-label { color: #a7f3d0; }

    /* Glass Fields */
    .glass-input, .glass-textarea {
      width: 100%;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      padding: 0.65rem 0.85rem;
      font-size: 0.85rem;
      font-family: var(--font-family);
      outline: none;
      transition: all 0.2s;
    }
    .glass-input:focus, .glass-textarea:focus {
      background: rgba(255, 255, 255, 0.04);
      border-color: var(--accent-primary);
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 0.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 1rem;
    }

    .cancel-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.82rem;
      padding: 0.5rem 1rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s;
    }
    .cancel-btn:hover {
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-primary);
    }

    .submit-btn {
      background: linear-gradient(135deg, #6366f1, #ec4899);
      color: white;
      border: none;
      font-weight: 600;
      font-size: 0.82rem;
      padding: 0.5rem 1.2rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
    }
    .submit-btn:hover:not(:disabled) {
      opacity: 0.92;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
    }
    .submit-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* Spinner */
    .spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.25);
      border-top-color: white;
      border-radius: 50%;
      margin-right: 0.4rem;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(15px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class FeedbackDialogComponent {
  @Output() closed = new EventEmitter<void>();

  private readonly feedbackService = inject(FeedbackService);
  private readonly userService = inject(UserService);
  private readonly notifications = inject(NotificationService);

  protected readonly selectedType = signal<'BugReport' | 'FeatureRequest' | 'Integration' | 'General'>('BugReport');
  protected readonly isSubmitting = signal(false);

  protected titleText = '';
  protected descriptionText = '';

  protected onSubmit(): void {
    const user = this.userService.currentUser();
    
    this.isSubmitting.set(true);
    this.feedbackService.submitFeedback({
      userId: user?.id,
      type: this.selectedType(),
      title: this.titleText.trim(),
      description: this.descriptionText.trim()
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notifications.success('Thank you! Your feedback was submitted successfully.');
        this.close();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.notifications.error('Failed to submit feedback. Please try again.');
      }
    });
  }

  protected close(): void {
    this.closed.emit();
  }
}
