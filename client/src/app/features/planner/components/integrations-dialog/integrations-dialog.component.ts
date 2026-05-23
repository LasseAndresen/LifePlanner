import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntegrationService, KeepNote, IntegrationStatus } from '../../../../core/services/integration.service';
import { UserService } from '../../../../core/services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CardService } from '../../../../core/services/card.service';

@Component({
  selector: 'app-integrations-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close()">
      <div class="modal-container glass-panel" (click)="$event.stopPropagation()">
        
        <!-- Modal Header -->
        <header class="modal-header">
          <div class="header-title-area">
            <span class="icon-sparkle">✦</span>
            <h2>Integrations Manager</h2>
            <p class="subtitle">Connect external applications to your LifePlanner workspace</p>
          </div>
          <button class="close-btn" (click)="close()" aria-label="Close dialog">✕</button>
        </header>

        <!-- Modal Body -->
        <div class="modal-body">
          
          <!-- Microsoft TODO Integration Card -->
          <section class="integration-card ms-todo-theme" [class.connected]="status().microsoftTodoConnected">
            <div class="card-left">
              <div class="logo-area">
                <span class="logo-icon">☑</span>
              </div>
              <div class="details">
                <h3>Microsoft To-Do</h3>
                <p>Sync tasks from your Microsoft To-Do list directly into a dedicated readonly card. Drag and drop these tasks onto your calendar to plan your schedule.</p>
                
                @if (status().microsoftTodoConnected) {
                  <div class="sync-info-area">
                    <span class="badge badge-success">✓ Connected</span>
                    <button class="sync-now-btn" (click)="syncTodo()" [disabled]="isSyncingTodo()">
                      @if (isSyncingTodo()) {
                        <span class="spinner"></span> Syncing...
                      } @else {
                        ↻ Sync Now
                      }
                    </button>
                  </div>
                }
              </div>
            </div>
            
            <div class="card-right">
              @if (status().microsoftTodoConnected) {
                <button class="disconnect-btn" (click)="toggleConnection('MicrosoftTodo')">Disconnect</button>
              } @else {
                <button class="connect-btn" (click)="toggleConnection('MicrosoftTodo')" [disabled]="isConnectingTodo()">
                  @if (isConnectingTodo()) {
                    <span class="spinner"></span> Connecting...
                  } @else {
                    Connect
                  }
                </button>
              }
            </div>
          </section>

          <!-- Google Keep Integration Card -->
          <section class="integration-card keep-theme" [class.connected]="status().googleKeepConnected">
            <div class="card-left">
              <div class="logo-area">
                <span class="logo-icon">💡</span>
              </div>
              <div class="details">
                <h3>Google Keep Notes</h3>
                <p>Select which Google Keep notes you want to import. Each note will appear as an independent read-only card in your sidebar, retaining its checklist items.</p>
                
                @if (status().googleKeepConnected) {
                  <div class="sync-info-area">
                    <span class="badge badge-success">✓ Connected</span>
                  </div>
                }
              </div>
            </div>
            
            <div class="card-right">
              @if (status().googleKeepConnected) {
                <button class="disconnect-btn" (click)="toggleConnection('GoogleKeep')">Disconnect</button>
              } @else {
                <button class="connect-btn" (click)="toggleConnection('GoogleKeep')" [disabled]="isConnectingKeep()">
                  @if (isConnectingKeep()) {
                    <span class="spinner"></span> Connecting...
                  } @else {
                    Connect
                  }
                </button>
              }
            </div>
          </section>

          <!-- Google Keep Import Selector Area -->
          @if (status().googleKeepConnected) {
            <section class="keep-selector-panel glass-panel">
              <div class="panel-header">
                <h4>Select notes to import from Google Keep</h4>
                <p class="panel-subtitle">Checked notes will sync to your sidebar. Unchecking removes them.</p>
              </div>

              @if (isLoadingKeepNotes()) {
                <div class="loading-state">
                  <span class="spinner large"></span>
                  <p>Fetching notes from Google Keep...</p>
                </div>
              } @else {
                <div class="notes-grid">
                  @for (note of keepNotes(); track note.id) {
                    <div class="note-item" [class.selected]="selectedKeepNoteIds().includes(note.id)" (click)="toggleNoteSelection(note.id)">
                      <div class="note-checkbox-wrapper">
                        <input 
                          type="checkbox" 
                          [checked]="selectedKeepNoteIds().includes(note.id)" 
                          (click)="$event.stopPropagation(); toggleNoteSelection(note.id)" 
                          class="custom-checkbox" />
                      </div>
                      <div class="note-preview-content">
                        <h5>{{ note.title }}</h5>
                        <ul class="preview-items">
                          @for (item of note.items.slice(0, 3); track item) {
                            <li>• {{ item }}</li>
                          }
                          @if (note.items.length > 3) {
                            <li class="more-items">+ {{ note.items.length - 3 }} more items</li>
                          }
                        </ul>
                      </div>
                    </div>
                  } @empty {
                    <div class="empty-notes">
                      <p>No Keep notes found in your account.</p>
                    </div>
                  }
                </div>

                <div class="panel-actions">
                  <button 
                    class="save-keep-btn" 
                    (click)="saveKeepImports()" 
                    [disabled]="isSavingKeepImports() || !isSelectionChanged()">
                    @if (isSavingKeepImports()) {
                      <span class="spinner"></span> Saving...
                    } @else {
                      Import & Sync Selected Notes
                    }
                  </button>
                </div>
              }
            </section>
          }

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
      max-width: 680px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      background: rgba(18, 18, 28, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
      border-radius: var(--radius-lg);
    }

    .modal-header {
      padding: 1.5rem 1.75rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;
    }

    .header-title-area {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .icon-sparkle {
      color: var(--accent-secondary);
      font-size: 1.1rem;
      margin-bottom: 0.2rem;
      text-shadow: 0 0 10px rgba(236, 72, 153, 0.6);
    }
    h2 {
      font-size: 1.45rem;
      font-weight: 700;
      margin: 0;
      background: linear-gradient(90deg, var(--text-primary), var(--text-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 0.85rem;
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
      padding: 1.75rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      flex: 1;
    }

    /* Integration Cards */
    .integration-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-radius: var(--radius-md);
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .integration-card:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.1);
      transform: translateY(-2px);
    }
    .integration-card.connected {
      background: rgba(255, 255, 255, 0.035);
      border-color: rgba(255, 255, 255, 0.12);
    }

    .card-left {
      display: flex;
      align-items: flex-start;
      gap: 1.25rem;
      flex: 1;
    }
    .logo-area {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }

    /* Provider specifics */
    .ms-todo-theme .logo-area {
      background: linear-gradient(135deg, #2563eb, #1e40af);
      color: white;
    }
    .keep-theme .logo-area {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
    }

    .details h3 {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 0.35rem 0;
    }
    .details p {
      font-size: 0.82rem;
      color: var(--text-secondary);
      margin: 0;
      line-height: 1.4;
      max-width: 420px;
    }

    .sync-info-area {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.75rem;
    }
    .badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.55rem;
      border-radius: var(--radius-full);
    }
    .badge-success {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .sync-now-btn {
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #a5b4fc;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.18rem 0.6rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      transition: background 0.15s;
    }
    .sync-now-btn:hover:not(:disabled) {
      background: rgba(99, 102, 241, 0.28);
    }
    .sync-now-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Buttons in Cards */
    .connect-btn, .disconnect-btn {
      font-family: var(--font-family);
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.45rem 1rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
      min-width: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }
    .connect-btn {
      background: var(--text-primary);
      color: var(--bg-primary);
      border: none;
    }
    .connect-btn:hover:not(:disabled) {
      background: white;
      transform: scale(1.03);
    }
    .connect-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .disconnect-btn {
      background: transparent;
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .disconnect-btn:hover {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.6);
    }

    /* Google Keep Selection Panel */
    .keep-selector-panel {
      padding: 1.25rem 1.5rem;
      background: rgba(255, 255, 255, 0.015);
      border-color: rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      animation: slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .panel-header h4 {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }
    .panel-subtitle {
      font-size: 0.76rem;
      color: var(--text-muted);
      margin: 0.15rem 0 0 0;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 2rem 0;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .notes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
      max-height: 220px;
      overflow-y: auto;
      padding-right: 0.35rem;
    }

    .note-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.85rem;
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.015);
      border: 1px solid rgba(255, 255, 255, 0.05);
      cursor: pointer;
      transition: all 0.15s;
    }
    .note-item:hover {
      background: rgba(255, 255, 255, 0.035);
      border-color: rgba(255, 255, 255, 0.1);
    }
    .note-item.selected {
      background: rgba(245, 158, 11, 0.05);
      border-color: rgba(245, 158, 11, 0.25);
    }

    .note-checkbox-wrapper {
      margin-top: 1px;
    }
    .custom-checkbox {
      cursor: pointer;
      accent-color: #f59e0b;
      width: 15px;
      height: 15px;
    }

    .note-preview-content h5 {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 0.35rem 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
    }
    .preview-items {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .preview-items li {
      font-size: 0.74rem;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 150px;
    }
    .preview-items .more-items {
      color: var(--text-muted);
      font-style: italic;
      margin-top: 0.1rem;
    }
    
    .empty-notes {
      text-align: center;
      padding: 2rem 0;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .panel-actions {
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 0.85rem;
    }
    
    .save-keep-btn {
      font-family: var(--font-family);
      font-size: 0.82rem;
      font-weight: 600;
      padding: 0.45rem 1rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
      transition: all 0.2s;
    }
    .save-keep-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(245, 158, 11, 0.35);
    }
    .save-keep-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
    }

    /* Loading Spinners */
    .spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.25);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    .spinner.large {
      width: 24px;
      height: 24px;
      border-width: 3px;
      border-top-color: var(--accent-primary);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideDown {
      from { transform: translateY(-10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class IntegrationsDialogComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  @Output() synced = new EventEmitter<void>();

  private readonly integrations = inject(IntegrationService);
  private readonly userService = inject(UserService);
  private readonly notifications = inject(NotificationService);
  private readonly cardService = inject(CardService);

  protected readonly status = signal<IntegrationStatus>({ microsoftTodoConnected: false, googleKeepConnected: false });
  
  // Microsoft TODO state
  protected readonly isConnectingTodo = signal(false);
  protected readonly isSyncingTodo = signal(false);

  // Google Keep state
  protected readonly isConnectingKeep = signal(false);
  protected readonly isLoadingKeepNotes = signal(false);
  protected readonly keepNotes = signal<KeepNote[]>([]);
  protected readonly selectedKeepNoteIds = signal<string[]>([]);
  protected readonly originallySelectedIds = signal<string[]>([]);
  protected readonly isSavingKeepImports = signal(false);

  ngOnInit(): void {
    this.loadStatus();
  }

  private loadStatus(): void {
    const user = this.userService.currentUser();
    if (!user) return;

    this.integrations.getStatus(user.id).subscribe({
      next: (status) => {
        this.status.set(status);
        if (status.googleKeepConnected) {
          this.loadKeepNotes();
        }
      },
      error: () => this.notifications.error('Failed to load integrations status.')
    });
  }

  protected toggleConnection(provider: 'MicrosoftTodo' | 'GoogleKeep'): void {
    const user = this.userService.currentUser();
    if (!user) return;

    const isCurrentlyConnected = provider === 'MicrosoftTodo' ? this.status().microsoftTodoConnected : this.status().googleKeepConnected;

    if (isCurrentlyConnected) {
      // Disconnect
      this.integrations.disconnect(user.id, provider).subscribe({
        next: (newStatus) => {
          this.status.set(newStatus);
          this.notifications.success(`${provider === 'MicrosoftTodo' ? 'Microsoft To-Do' : 'Google Keep'} disconnected successfully.`);
          this.synced.emit(); // Reload sidebar cards
          if (provider === 'GoogleKeep') {
            this.keepNotes.set([]);
            this.selectedKeepNoteIds.set([]);
            this.originallySelectedIds.set([]);
          }
        },
        error: () => this.notifications.error(`Could not disconnect ${provider === 'MicrosoftTodo' ? 'Microsoft To-Do' : 'Google Keep'}.`)
      });
    } else {
      // Connect
      if (provider === 'MicrosoftTodo') this.isConnectingTodo.set(true);
      if (provider === 'GoogleKeep') this.isConnectingKeep.set(true);

      this.integrations.connect(user.id, provider).subscribe({
        next: (newStatus) => {
          this.status.set(newStatus);
          this.isConnectingTodo.set(false);
          this.isConnectingKeep.set(false);
          this.notifications.success(`Successfully connected to ${provider === 'MicrosoftTodo' ? 'Microsoft To-Do' : 'Google Keep'}!`);
          this.synced.emit(); // Reload sidebar cards

          if (provider === 'GoogleKeep') {
            this.loadKeepNotes();
          }
        },
        error: () => {
          this.isConnectingTodo.set(false);
          this.isConnectingKeep.set(false);
          this.notifications.error(`Failed to connect to ${provider === 'MicrosoftTodo' ? 'Microsoft To-Do' : 'Google Keep'}.`);
        }
      });
    }
  }

  // Microsoft TODO Actions
  protected syncTodo(): void {
    const user = this.userService.currentUser();
    if (!user) return;

    this.isSyncingTodo.set(true);
    this.integrations.syncTodo(user.id).subscribe({
      next: () => {
        this.isSyncingTodo.set(false);
        this.notifications.success('Microsoft To-Do tasks synced successfully.');
        this.synced.emit();
      },
      error: () => {
        this.isSyncingTodo.set(false);
        this.notifications.error('Sync failed. Please try again.');
      }
    });
  }

  // Google Keep Actions
  private loadKeepNotes(): void {
    const user = this.userService.currentUser();
    if (!user) return;

    this.isLoadingKeepNotes.set(true);
    this.integrations.getKeepNotes(user.id).subscribe({
      next: (notes) => {
        this.keepNotes.set(notes);
        const imported = notes.filter(n => n.isImported).map(n => n.id);
        this.selectedKeepNoteIds.set(imported);
        this.originallySelectedIds.set([...imported]);
        this.isLoadingKeepNotes.set(false);
      },
      error: () => {
        this.isLoadingKeepNotes.set(false);
        this.notifications.error('Failed to load Keep notes.');
      }
    });
  }

  protected toggleNoteSelection(noteId: string): void {
    const current = this.selectedKeepNoteIds();
    if (current.includes(noteId)) {
      this.selectedKeepNoteIds.set(current.filter(id => id !== noteId));
    } else {
      this.selectedKeepNoteIds.set([...current, noteId]);
    }
  }

  protected isSelectionChanged(): boolean {
    const cur = this.selectedKeepNoteIds().sort();
    const orig = this.originallySelectedIds().sort();
    if (cur.length !== orig.length) return true;
    return cur.some((v, i) => v !== orig[i]);
  }

  protected saveKeepImports(): void {
    const user = this.userService.currentUser();
    if (!user) return;

    this.isSavingKeepImports.set(true);
    this.integrations.importKeepNotes(user.id, this.selectedKeepNoteIds()).subscribe({
      next: () => {
        this.isSavingKeepImports.set(false);
        this.originallySelectedIds.set([...this.selectedKeepNoteIds()]);
        this.notifications.success('Google Keep cards updated.');
        this.synced.emit();
      },
      error: () => {
        this.isSavingKeepImports.set(false);
        this.notifications.error('Failed to save imported notes.');
      }
    });
  }

  protected close(): void {
    this.closed.emit();
  }
}
