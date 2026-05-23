import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntegrationService, GoogleTaskList, IntegrationStatus } from '../../../../core/services/integration.service';
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

          <!-- Google Tasks Integration Card -->
          <section class="integration-card tasks-theme" [class.connected]="status().googleTasksConnected">
            <div class="card-left">
              <div class="logo-area">
                <span class="logo-icon">✓</span>
              </div>
              <div class="details">
                <h3>Google Tasks</h3>
                <p>Select which Google Tasks lists you want to import. Each list will appear as an independent card in your sidebar, retaining its checklist items.</p>
                
                @if (status().googleTasksConnected) {
                  <div class="sync-info-area">
                    <span class="badge badge-success">✓ Connected</span>
                  </div>
                }
              </div>
            </div>
            
            <div class="card-right">
              @if (status().googleTasksConnected) {
                <button class="disconnect-btn" (click)="toggleConnection('GoogleTasks')">Disconnect</button>
              } @else {
                <button class="connect-btn" (click)="toggleConnection('GoogleTasks')" [disabled]="isConnectingTasks()">
                  @if (isConnectingTasks()) {
                    <span class="spinner"></span> Connecting...
                  } @else {
                    Connect
                  }
                </button>
              }
            </div>
          </section>

          <!-- Google Tasks Import Selector Area -->
          @if (status().googleTasksConnected) {
            <section class="tasks-selector-panel glass-panel">
              <div class="panel-header">
                <h4>Select lists to import from Google Tasks</h4>
                <p class="panel-subtitle">Checked lists will sync to your sidebar. Unchecking removes them.</p>
              </div>

              @if (isLoadingTasks()) {
                <div class="loading-state">
                  <span class="spinner large"></span>
                  <p>Fetching lists from Google Tasks...</p>
                </div>
              } @else {
                <div class="notes-grid">
                  @for (list of googleTaskLists(); track list.id) {
                    <div class="note-item" [class.selected]="selectedTaskListIds().includes(list.id)" (click)="toggleTaskListSelection(list.id)">
                      <div class="note-checkbox-wrapper">
                        <input 
                          type="checkbox" 
                          [checked]="selectedTaskListIds().includes(list.id)" 
                          (click)="$event.stopPropagation(); toggleTaskListSelection(list.id)" 
                          class="custom-checkbox" />
                      </div>
                      <div class="note-preview-content">
                        <h5>{{ list.title }}</h5>
                        <ul class="preview-items">
                          @for (item of list.items.slice(0, 3); track item) {
                            <li>• {{ item }}</li>
                          }
                          @if (list.items.length > 3) {
                            <li class="more-items">+ {{ list.items.length - 3 }} more items</li>
                          }
                        </ul>
                      </div>
                    </div>
                  } @empty {
                    <div class="empty-notes">
                      <p>No Google Tasks lists found in your account.</p>
                    </div>
                  }
                </div>

                <div class="panel-actions">
                  <button 
                    class="save-tasks-btn" 
                    (click)="saveTaskListImports()" 
                    [disabled]="isSavingTaskListImports() || !isSelectionChanged()">
                    @if (isSavingTaskListImports()) {
                      <span class="spinner"></span> Saving...
                    } @else {
                      Import & Sync Selected Lists
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
    .tasks-theme .logo-area {
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
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

    /* Google Tasks Selection Panel */
    .tasks-selector-panel {
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
      background: rgba(14, 165, 233, 0.05);
      border-color: rgba(14, 165, 233, 0.25);
    }

    .note-checkbox-wrapper {
      margin-top: 1px;
    }
    .custom-checkbox {
      cursor: pointer;
      accent-color: #0ea5e9;
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
    
    .save-tasks-btn {
      font-family: var(--font-family);
      font-size: 0.82rem;
      font-weight: 600;
      padding: 0.45rem 1rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      background: linear-gradient(135deg, #0ea5e9, #0284c7);
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
      transition: all 0.2s;
    }
    .save-tasks-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(14, 165, 233, 0.35);
    }
    .save-tasks-btn:disabled {
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

  protected readonly status = signal<IntegrationStatus>({ microsoftTodoConnected: false, googleTasksConnected: false });
  
  // Microsoft TODO state
  protected readonly isConnectingTodo = signal(false);
  protected readonly isSyncingTodo = signal(false);

  // Google Tasks state
  protected readonly isConnectingTasks = signal(false);
  protected readonly isLoadingTasks = signal(false);
  protected readonly googleTaskLists = signal<GoogleTaskList[]>([]);
  protected readonly selectedTaskListIds = signal<string[]>([]);
  protected readonly originallySelectedIds = signal<string[]>([]);
  protected readonly isSavingTaskListImports = signal(false);

  ngOnInit(): void {
    this.loadStatus();
  }

  private loadStatus(): void {
    const user = this.userService.currentUser();
    if (!user) return;

    this.integrations.getStatus(user.id).subscribe({
      next: (status) => {
        this.status.set(status);
        if (status.googleTasksConnected) {
          this.loadTasksLists();
        }
      },
      error: () => this.notifications.error('Failed to load integrations status.')
    });
  }

  protected toggleConnection(provider: 'MicrosoftTodo' | 'GoogleTasks'): void {
    const user = this.userService.currentUser();
    if (!user) return;

    const isCurrentlyConnected = provider === 'MicrosoftTodo' ? this.status().microsoftTodoConnected : this.status().googleTasksConnected;

    if (isCurrentlyConnected) {
      // Disconnect
      this.integrations.disconnect(user.id, provider).subscribe({
        next: (newStatus) => {
          this.status.set(newStatus);
          this.notifications.success(`${provider === 'MicrosoftTodo' ? 'Microsoft To-Do' : 'Google Tasks'} disconnected successfully.`);
          this.synced.emit(); // Reload sidebar cards
          if (provider === 'GoogleTasks') {
            this.googleTaskLists.set([]);
            this.selectedTaskListIds.set([]);
            this.originallySelectedIds.set([]);
          }
        },
        error: () => this.notifications.error(`Could not disconnect ${provider === 'MicrosoftTodo' ? 'Microsoft To-Do' : 'Google Tasks'}.`)
      });
    } else {
      // Connect
      if (provider === 'MicrosoftTodo') this.isConnectingTodo.set(true);
      if (provider === 'GoogleTasks') this.isConnectingTasks.set(true);

      this.integrations.connect(user.id, provider).subscribe({
        next: (newStatus) => {
          this.status.set(newStatus);
          this.isConnectingTodo.set(false);
          this.isConnectingTasks.set(false);
          this.notifications.success(`Successfully connected to ${provider === 'MicrosoftTodo' ? 'Microsoft To-Do' : 'Google Tasks'}!`);
          this.synced.emit(); // Reload sidebar cards

          if (provider === 'GoogleTasks') {
            this.loadTasksLists();
          }
        },
        error: () => {
          this.isConnectingTodo.set(false);
          this.isConnectingTasks.set(false);
          this.notifications.error(`Failed to connect to ${provider === 'MicrosoftTodo' ? 'Microsoft To-Do' : 'Google Tasks'}.`);
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

  // Google Tasks Actions
  private loadTasksLists(): void {
    const user = this.userService.currentUser();
    if (!user) return;

    this.isLoadingTasks.set(true);
    this.integrations.getGoogleTaskLists(user.id).subscribe({
      next: (lists) => {
        this.googleTaskLists.set(lists);
        const imported = lists.filter(l => l.isImported).map(l => l.id);
        this.selectedTaskListIds.set(imported);
        this.originallySelectedIds.set([...imported]);
        this.isLoadingTasks.set(false);
      },
      error: () => {
        this.isLoadingTasks.set(false);
        this.notifications.error('Failed to load Google Tasks lists.');
      }
    });
  }

  protected toggleTaskListSelection(listId: string): void {
    const current = this.selectedTaskListIds();
    if (current.includes(listId)) {
      this.selectedTaskListIds.set(current.filter(id => id !== listId));
    } else {
      this.selectedTaskListIds.set([...current, listId]);
    }
  }

  protected isSelectionChanged(): boolean {
    const cur = this.selectedTaskListIds().sort();
    const orig = this.originallySelectedIds().sort();
    if (cur.length !== orig.length) return true;
    return cur.some((v, i) => v !== orig[i]);
  }

  protected saveTaskListImports(): void {
    const user = this.userService.currentUser();
    if (!user) return;

    this.isSavingTaskListImports.set(true);
    this.integrations.importGoogleTaskLists(user.id, this.selectedTaskListIds()).subscribe({
      next: () => {
        this.isSavingTaskListImports.set(false);
        this.originallySelectedIds.set([...this.selectedTaskListIds()]);
        this.notifications.success('Google Tasks cards updated.');
        this.synced.emit();
      },
      error: () => {
        this.isSavingTaskListImports.set(false);
        this.notifications.error('Failed to save imported lists.');
      }
    });
  }

  protected close(): void {
    this.closed.emit();
  }
}
