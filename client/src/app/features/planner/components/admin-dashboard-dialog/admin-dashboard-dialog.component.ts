import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { UserService } from '../../../../core/services/user.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { Feedback, AdminStats } from '../../../../core/models/planner.models';

@Component({
  selector: 'app-admin-dashboard-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="close()">
      <div class="modal-container glass-panel" (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <header class="modal-header">
          <div class="header-title-area">
            <span class="icon-sparkle">👑</span>
            <h2>Admin Console</h2>
            <p class="subtitle">System statistics, usage insights, and user feedback reviews</p>
          </div>
          <div class="header-actions">
            <!-- Tab togglers -->
            <div class="tabs-container">
              <button class="tab-btn" [class.active]="activeTab() === 'stats'" (click)="activeTab.set('stats')">
                📊 Statistics
              </button>
              <button class="tab-btn" [class.active]="activeTab() === 'feedback'" (click)="activeTab.set('feedback')">
                💬 Feedback List
              </button>
            </div>
            <button class="close-btn" (click)="close()" aria-label="Close dialog">✕</button>
          </div>
        </header>

        <!-- Body -->
        <div class="modal-body">
          @if (isLoading()) {
            <div class="loading-state">
              <span class="spinner large"></span>
              <p>Fetching admin dashboard data...</p>
            </div>
          } @else {
            
            <!-- STATS TAB -->
            @if (activeTab() === 'stats') {
              @if (stats(); as s) {
                <div class="stats-tab-content">
                  
                  <!-- Metric Cards Grid -->
                  <div class="metrics-grid">
                    <div class="metric-card">
                      <span class="metric-icon">👤</span>
                      <div class="metric-value">{{ s.totalUsers }}</div>
                      <div class="metric-label">Total Users</div>
                    </div>
                    <div class="metric-card">
                      <span class="metric-icon">📇</span>
                      <div class="metric-value">{{ s.totalCards }}</div>
                      <div class="metric-label">Topic Cards</div>
                    </div>
                    <div class="metric-card">
                      <span class="metric-icon">📝</span>
                      <div class="metric-value">{{ s.totalListItems }}</div>
                      <div class="metric-label">Action Tasks</div>
                    </div>
                    <div class="metric-card">
                      <span class="metric-icon">📅</span>
                      <div class="metric-value">{{ s.totalScheduledInstances }}</div>
                      <div class="metric-label">Scheduled Instances</div>
                    </div>
                  </div>

                  <!-- Integrations & Categories Layout -->
                  <div class="stats-details-row">
                    
                    <!-- Integrations Card -->
                    <div class="stats-panel glass-panel">
                      <h4>🔌 Integration Adoptions</h4>
                      <div class="stats-list">
                        <div class="stats-list-item">
                          <span>Microsoft To-Do Connected</span>
                          <span class="stat-badge">{{ s.microsoftTodoConnectedCount }} users</span>
                        </div>
                        <div class="stats-list-item">
                          <span>Google Tasks Connected</span>
                          <span class="stat-badge">{{ s.googleTasksConnectedCount }} users</span>
                        </div>
                      </div>
                    </div>

                    <!-- Categories Card -->
                    <div class="stats-panel glass-panel">
                      <h4>🎨 Category Popularity</h4>
                      <div class="stats-list">
                        @for (cat of s.categoryStats; track cat.name) {
                          <div class="stats-list-item">
                            <span class="cat-pill" [style.background-color]="cat.color">{{ cat.name }}</span>
                            <span class="stat-badge">{{ cat.cardCount }} cards</span>
                          </div>
                        } @empty {
                          <div class="empty-list-info">No category statistics available.</div>
                        }
                      </div>
                    </div>

                  </div>

                </div>
              }
            }

            <!-- FEEDBACK TAB -->
            @if (activeTab() === 'feedback') {
              <div class="feedback-tab-content">
                
                <!-- Feedback Filter Toolbar -->
                <div class="filter-toolbar">
                  <div class="filter-group">
                    <label>Filter Type:</label>
                    <select class="glass-select" [(ngModel)]="typeFilter">
                      <option value="All">All Categories</option>
                      <option value="BugReport">🐞 Bug Reports</option>
                      <option value="FeatureRequest">✨ Feature Requests</option>
                      <option value="Integration">🔌 Integrations</option>
                      <option value="General">💬 General</option>
                    </select>
                  </div>
                  
                  <div class="filter-group">
                    <label>Filter Status:</label>
                    <select class="glass-select" [(ngModel)]="statusFilter">
                      <option value="All">All Statuses</option>
                      <option value="New">🟢 New</option>
                      <option value="UnderReview">🟡 Under Review</option>
                      <option value="Planned">🔵 Planned</option>
                      <option value="Completed">🟣 Completed</option>
                      <option value="Closed">🔴 Closed</option>
                    </select>
                  </div>
                </div>

                <!-- Feedback List -->
                <div class="feedback-list">
                  @for (fb of filteredFeedback(); track fb.id) {
                    <div class="feedback-item" [class.expanded]="expandedFeedbackId() === fb.id">
                      
                      <!-- Summary Line (Always visible) -->
                      <div class="feedback-summary" (click)="toggleExpand(fb.id)">
                        <div class="summary-left">
                          <span class="type-badge" [class]="fb.type.toLowerCase()">
                            {{ fb.type === 'BugReport' ? '🐞 Bug' : fb.type === 'FeatureRequest' ? '✨ Feature' : fb.type === 'Integration' ? '🔌 Integration' : '💬 General' }}
                          </span>
                          <span class="title-text">{{ fb.title }}</span>
                        </div>
                        <div class="summary-right">
                          <span class="status-badge" [class]="fb.status.toLowerCase()">
                            {{ fb.status }}
                          </span>
                          <span class="date-text">{{ fb.createdAt | date:'shortDate' }}</span>
                          <span class="chevron">{{ expandedFeedbackId() === fb.id ? '▲' : '▼' }}</span>
                        </div>
                      </div>

                      <!-- Detailed Area (Visible when expanded) -->
                      @if (expandedFeedbackId() === fb.id) {
                        <div class="feedback-details">
                          <div class="details-text">
                            <strong>User Info:</strong> {{ fb.user ? (fb.user.name + ' (' + fb.user.email + ')') : 'Anonymous' }}
                          </div>
                          
                          <div class="details-description">
                            <p>{{ fb.description }}</p>
                          </div>

                          <div class="details-divider"></div>

                          <!-- Admin Update Form -->
                          <div class="admin-action-form">
                            <h5>Update Feedback State</h5>
                            <div class="form-row">
                              <div class="form-field">
                                <label>Status</label>
                                <select class="glass-select" [(ngModel)]="editStatus">
                                  <option value="New">New</option>
                                  <option value="UnderReview">Under Review</option>
                                  <option value="Planned">Planned</option>
                                  <option value="Completed">Completed</option>
                                  <option value="Closed">Closed</option>
                                </select>
                              </div>
                              <div class="form-field full-width">
                                <label>Admin Notes</label>
                                <input type="text" class="glass-input" placeholder="Add internal notes..." [(ngModel)]="editNotes" />
                              </div>
                              <div class="form-field action-button-container">
                                <button class="save-status-btn" (click)="saveFeedbackEdit(fb.id)" [disabled]="isSaving()">
                                  Save Change
                                </button>
                              </div>
                            </div>
                          </div>

                        </div>
                      }

                    </div>
                  } @empty {
                    <div class="empty-list-state">
                      <p class="empty-icon">✓</p>
                      <p>No feedback matching filters.</p>
                    </div>
                  }
                </div>

              </div>
            }

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
      background: rgba(5, 5, 10, 0.75);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.25s ease-out;
    }
    
    .modal-container {
      width: 95%;
      max-width: 820px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      background: rgba(16, 16, 26, 0.82);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65);
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .modal-header {
      padding: 1.25rem 1.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;
    }

    .header-title-area {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    h2 {
      font-size: 1.35rem;
      font-weight: 700;
      margin: 0;
      background: linear-gradient(90deg, #fbc2eb 0%, #a6c1ee 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 0.78rem;
      color: var(--text-secondary);
      margin: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    /* Tabs buttons */
    .tabs-container {
      display: flex;
      background: rgba(255, 255, 255, 0.03);
      padding: 0.2rem;
      border-radius: var(--radius-md);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-family: var(--font-family);
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.35rem 0.85rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
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
      flex: 1;
      min-height: 380px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 5rem 0;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    /* Stats Styling */
    .stats-tab-content {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    .metric-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s;
    }
    .metric-card:hover {
      transform: translateY(-2px);
      background: rgba(255, 255, 255, 0.035);
      border-color: rgba(255, 255, 255, 0.1);
    }
    .metric-icon {
      font-size: 1.2rem;
      opacity: 0.5;
    }
    .metric-value {
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--text-primary);
      line-height: 1.2;
    }
    .metric-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .stats-details-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }

    .stats-panel {
      padding: 1.25rem 1.5rem;
      background: rgba(255, 255, 255, 0.015);
      border-color: rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .stats-panel h4 {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 0.5rem;
    }
    .stats-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .stats-list-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.85rem;
    }
    .stat-badge {
      font-weight: 600;
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.05);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .cat-pill {
      font-size: 0.75rem;
      font-weight: 600;
      color: white;
      padding: 0.15rem 0.55rem;
      border-radius: var(--radius-full);
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    }
    .empty-list-info {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-style: italic;
      text-align: center;
      padding: 1rem 0;
    }

    /* Feedback List Styling */
    .feedback-tab-content {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .filter-toolbar {
      display: flex;
      gap: 1rem;
      background: rgba(255, 255, 255, 0.015);
      padding: 0.85rem 1.25rem;
      border-radius: var(--radius-md);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .glass-select {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      outline: none;
      cursor: pointer;
      font-family: var(--font-family);
    }
    .glass-select option {
      background-color: var(--bg-secondary);
      color: var(--text-primary);
    }

    .feedback-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      max-height: 440px;
      overflow-y: auto;
      padding-right: 0.35rem;
    }

    .feedback-item {
      background: rgba(255, 255, 255, 0.015);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: var(--radius-md);
      overflow: hidden;
      transition: all 0.2s;
    }
    .feedback-item:hover {
      border-color: rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.025);
    }
    .feedback-item.expanded {
      background: rgba(255, 255, 255, 0.028);
      border-color: rgba(255, 255, 255, 0.12);
    }

    .feedback-summary {
      padding: 0.95rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
    }
    .summary-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      min-width: 0;
    }
    .title-text {
      font-size: 0.86rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .summary-right {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex-shrink: 0;
    }
    .date-text {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .chevron {
      font-size: 0.65rem;
      color: var(--text-muted);
      width: 12px;
      text-align: center;
    }

    /* Badges */
    .type-badge, .status-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .type-badge.bugreport { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25); }
    .type-badge.featurerequest { background: rgba(236, 72, 153, 0.15); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.25); }
    .type-badge.integration { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.25); }
    .type-badge.general { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.25); }

    .status-badge.new { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
    .status-badge.underreview { background: rgba(245, 158, 11, 0.1); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); }
    .status-badge.planned { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }
    .status-badge.completed { background: rgba(139, 92, 246, 0.1); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.2); }
    .status-badge.closed { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }

    /* Expanded Details */
    .feedback-details {
      padding: 0 1.25rem 1.25rem 1.25rem;
      background: rgba(0, 0, 0, 0.12);
      border-top: 1px solid rgba(255, 255, 255, 0.03);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .details-text {
      font-size: 0.78rem;
      color: var(--text-secondary);
      margin-top: 0.75rem;
    }
    .details-description {
      font-size: 0.85rem;
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid rgba(255, 255, 255, 0.04);
      padding: 0.85rem 1rem;
      border-radius: var(--radius-sm);
      line-height: 1.45;
    }
    .details-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.06);
      margin: 0.25rem 0;
    }

    /* Admin form */
    .admin-action-form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .admin-action-form h5 {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--accent-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
    }
    .form-row {
      display: grid;
      grid-template-columns: 140px 1fr 120px;
      gap: 0.75rem;
      align-items: flex-end;
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }
    .form-field label {
      font-size: 0.72rem;
      color: var(--text-muted);
      font-weight: 600;
    }
    .glass-input {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      outline: none;
      width: 100%;
    }
    .glass-input:focus {
      border-color: var(--accent-primary);
    }
    .save-status-btn {
      background: var(--text-primary);
      color: var(--bg-primary);
      border: none;
      font-weight: 700;
      font-size: 0.78rem;
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s;
      width: 100%;
    }
    .save-status-btn:hover:not(:disabled) {
      background: white;
      transform: translateY(-1px);
    }
    .save-status-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .action-button-container {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-list-state {
      text-align: center;
      padding: 4rem 0;
      color: var(--text-muted);
    }
    .empty-list-state .empty-icon {
      font-size: 1.75rem;
      margin-bottom: 0.5rem;
      opacity: 0.4;
    }

    /* Spinners */
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
      from { transform: translateY(15px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideDown {
      from { transform: translateY(-8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class AdminDashboardDialogComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();

  private readonly feedbackService = inject(FeedbackService);
  private readonly userService = inject(UserService);
  private readonly notifications = inject(NotificationService);

  protected readonly activeTab = signal<'stats' | 'feedback'>('stats');
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);

  protected stats = signal<AdminStats | null>(null);
  protected feedback = signal<Feedback[]>([]);
  protected expandedFeedbackId = signal<number | null>(null);

  // Filters
  protected typeFilter = 'All';
  protected statusFilter = 'All';

  // Edit states for current expanded item
  protected editStatus = 'New';
  protected editNotes = '';

  ngOnInit(): void {
    this.loadAdminData();
  }

  private loadAdminData(): void {
    const user = this.userService.currentUser();
    if (!user) {
      this.notifications.error('Must be logged in to view Admin Console.');
      this.close();
      return;
    }

    this.isLoading.set(true);

    // Call service methods parallelly
    this.feedbackService.getAdminStats(user.id).subscribe({
      next: (s) => {
        this.stats.set(s);
        this.feedbackService.getFeedbackList(user.id).subscribe({
          next: (fbList) => {
            this.feedback.set(fbList);
            this.isLoading.set(false);
          },
          error: () => {
            this.isLoading.set(false);
            this.notifications.error('Failed to load feedback records.');
          }
        });
      },
      error: () => {
        this.isLoading.set(false);
        this.notifications.error('Failed to retrieve system statistics. Are you an admin?');
        this.close();
      }
    });
  }

  protected toggleExpand(id: number): void {
    if (this.expandedFeedbackId() === id) {
      this.expandedFeedbackId.set(null);
    } else {
      this.expandedFeedbackId.set(id);
      
      // Load current item edit states
      const item = this.feedback().find(f => f.id === id);
      if (item) {
        this.editStatus = item.status;
        this.editNotes = item.adminNotes || '';
      }
    }
  }

  protected saveFeedbackEdit(id: number): void {
    const user = this.userService.currentUser();
    if (!user) return;

    this.isSaving.set(true);
    const payload = {
      status: this.editStatus,
      adminNotes: this.editNotes.trim()
    };

    this.feedbackService.updateFeedback(id, user.id, payload).subscribe({
      next: (updatedItem) => {
        this.isSaving.set(false);
        this.notifications.success('Feedback status updated successfully.');
        
        // Update local list
        this.feedback.set(
          this.feedback().map(f => f.id === id ? { ...f, ...updatedItem } : f)
        );
        this.expandedFeedbackId.set(null);
      },
      error: () => {
        this.isSaving.set(false);
        this.notifications.error('Failed to save changes. Please try again.');
      }
    });
  }

  protected filteredFeedback(): Feedback[] {
    return this.feedback().filter(fb => {
      const matchType = this.typeFilter === 'All' || fb.type === this.typeFilter;
      const matchStatus = this.statusFilter === 'All' || fb.status === this.statusFilter;
      return matchType && matchStatus;
    });
  }

  protected close(): void {
    this.closed.emit();
  }
}
