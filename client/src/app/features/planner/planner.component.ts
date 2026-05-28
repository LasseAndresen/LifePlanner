import { Component, computed, effect, inject, signal, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardSidebarComponent } from './components/card-sidebar/card-sidebar.component';
import { CalendarGridComponent } from './components/calendar-grid/calendar-grid.component';
import { CreateCardFormComponent, CardFormData } from './components/create-card-form/create-card-form.component';
import { IntegrationsDialogComponent } from './components/integrations-dialog/integrations-dialog.component';
import { CardService } from '../../core/services/card.service';
import { CalendarService } from '../../core/services/calendar.service';
import { CategoryService } from '../../core/services/category.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/auth/auth.service';
import { IntegrationService } from '../../core/services/integration.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { Card, ListItem, ScheduledInstance } from '../../core/models/planner.models';
import { CdkDragDrop, DragDropModule, CdkDragEnd, moveItemInArray } from '@angular/cdk/drag-drop';
import { NotificationService } from '../../core/services/notification.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CalendarInstanceDialogComponent, CalendarInstanceFormData } from './components/calendar-instance-dialog/calendar-instance-dialog.component';
import { FeedbackDialogComponent } from './components/feedback-dialog/feedback-dialog.component';
import { AdminDashboardDialogComponent } from './components/admin-dashboard-dialog/admin-dashboard-dialog.component';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [
    CommonModule,
    CardSidebarComponent,
    CalendarGridComponent,
    CreateCardFormComponent,
    IntegrationsDialogComponent,
    DragDropModule,
    CalendarInstanceDialogComponent,
    FeedbackDialogComponent,
    AdminDashboardDialogComponent
  ],
  template: `
    <div class="app-layout">
      <!-- Teams-like Sidebar -->
      <nav class="teams-sidebar">
        <div class="sidebar-brand">
          <span class="logo-spark">✦</span>
        </div>

        <!-- Workspace Selector Badge -->
        <div class="workspace-selector-container">
          <button class="workspace-badge" (click)="toggleWorkspaceDropdown()" [title]="activeWorkspaceName()">
            {{ activeWorkspaceInitials() }}
          </button>
          
          <!-- Workspace Dropdown -->
          @if (isWorkspaceDropdownOpen()) {
            <div class="workspace-dropdown glass-panel" (click)="$event.stopPropagation()">
              <div class="dropdown-header">
                <h3>Workspaces</h3>
                <p>Switch or manage workspaces</p>
              </div>
              
              <ul class="workspace-list">
                @for (ws of workspaceService.workspaces(); track ws.id) {
                  <li 
                    [class.active]="ws.id === workspaceService.activeWorkspace()?.id"
                    (click)="selectWorkspace(ws)">
                    <span class="ws-avatar">{{ getInitials(ws.name) }}</span>
                    <span class="ws-name">{{ ws.name }}</span>
                    @if (ws.id === workspaceService.activeWorkspace()?.id) {
                      <span class="ws-check">✓</span>
                    }
                  </li>
                }
              </ul>
              
              <div class="dropdown-footer">
                <button class="dropdown-action-btn" (click)="openCreateWorkspace()">
                  <span class="btn-icon">+</span> Create Workspace
                </button>
                @if (workspaceService.activeWorkspace()?.role === 'Owner') {
                  <button class="dropdown-action-btn" (click)="openWorkspaceSettings()">
                    <span class="btn-icon">⚙</span> Settings
                  </button>
                }
              </div>
            </div>
          }
        </div>
        
        <div class="sidebar-nav">
          <button 
            [class.active]="viewMode() === 'calendar'" 
            (click)="setViewMode('calendar')" 
            title="Calendar View"
            class="nav-item"
            id="nav-calendar-btn">
            <span class="nav-icon">📅</span>
            <span class="nav-label">Calendar</span>
          </button>
          
          <button 
            [class.active]="viewMode() === 'whiteboard'" 
            (click)="setViewMode('whiteboard')" 
            title="Whiteboard View"
            class="nav-item"
            id="nav-whiteboard-btn">
            <span class="nav-icon">📋</span>
            <span class="nav-label">Whiteboard</span>
          </button>
        </div>

        <div class="sidebar-footer">
          @if (userService.currentUser()?.isAdmin || false) {
            <button class="nav-item action-btn" (click)="isAdminDashboardOpen.set(true)" title="Admin Console" id="nav-admin-btn">
              <span class="nav-icon">👑</span>
              <span class="nav-label">Admin</span>
            </button>
          }
          <button class="nav-item action-btn" (click)="isFeedbackOpen.set(true)" title="Send Feedback" id="nav-feedback-btn">
            <span class="nav-icon">💬</span>
            <span class="nav-label">Feedback</span>
          </button>
          <button class="nav-item action-btn" (click)="openIntegrations()" title="Manage Integrations" id="nav-integrations-btn">
            <span class="nav-icon">🔌</span>
            <span class="nav-label">Integrations</span>
          </button>
          <button class="nav-item action-btn delete-account-btn" (click)="deleteAccount()" title="Delete Account & Data" id="nav-delete-account-btn">
            <span class="nav-icon">⚠️</span>
            <span class="nav-label">Delete Data</span>
          </button>
          <button class="nav-item action-btn logout-btn" (click)="logout()" title="Logout" id="nav-logout-btn">
            <span class="nav-icon">🚪</span>
            <span class="nav-label">Logout</span>
          </button>
        </div>
      </nav>

      <!-- Main Planner Content Area -->
      <div class="planner-layout">
        <!-- Card Sidebar Column (which expands to Whiteboard Canvas) -->
        <div class="sidebar-wrapper" [class.expanded]="viewMode() === 'whiteboard'">
          <app-card-sidebar
              [viewMode]="viewMode()"
              [cards]="cardService.unscheduledCards()"
              [categories]="categoryService.categories()"
              [connectedTo]="allDropLists()"
              (addCardClicked)="startCreateCard()"
              (editCardClicked)="onEditCard($event)"
              (itemDropped)="onItemDropped($event)"
              (cardsReordered)="onCardsReordered($event)"
              (cardDragEnded)="onCardDragEnded($event.event, $event.card)">
          </app-card-sidebar>
        </div>

        <!-- Calendar Grid Column (which collapses to the right) -->
        <div class="calendar-wrapper" [class.collapsed]="viewMode() === 'whiteboard'">
          <app-calendar-grid
            [connectedTo]="allDropLists()"
            (itemDropped)="onItemDropped($event)"
            (addClicked)="onAddCalendarItem($event)"
            (editClicked)="onEditCalendarItem($event)"
            (instanceToggled)="onInstanceToggled($event)"
            (instanceUnscheduled)="onInstanceUnscheduled($event)"
            (instanceConfirmed)="onInstanceConfirmed($event)"
            (instanceReverted)="onInstanceReverted($event)">
          </app-calendar-grid>
        </div>
      </div>
    </div>

    <!-- Create Workspace Modal -->
    @if (isCreateWorkspaceOpen()) {
      <div class="modal-backdrop" (click)="isCreateWorkspaceOpen.set(false)">
        <div class="modal-container glass-panel" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div class="header-title-area">
              <span class="icon-sparkle">✦</span>
              <h2>Create New Workspace</h2>
              <p class="subtitle">Organize cards and schedules in a new space</p>
            </div>
            <button class="close-btn" (click)="isCreateWorkspaceOpen.set(false)">✕</button>
          </header>
          <div class="modal-body">
            <div class="form-group" style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
              <label for="ws-name-input" class="form-label" style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">Workspace Name</label>
              <input 
                id="ws-name-input" 
                type="text" 
                #wsNameInput
                placeholder="e.g. Home chores, Travel planning..." 
                class="glass-input" />
            </div>
            <div class="modal-footer">
              <button class="cancel-btn" (click)="isCreateWorkspaceOpen.set(false)">Cancel</button>
              <button class="submit-btn" (click)="submitCreateWorkspace(wsNameInput.value)">Create Workspace</button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Workspace Settings / Invite Modal -->
    @if (isWorkspaceSettingsOpen()) {
      <div class="modal-backdrop" (click)="isWorkspaceSettingsOpen.set(false)">
        <div class="modal-container glass-panel" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <div class="header-title-area">
              <span class="icon-sparkle">⚙</span>
              <h2>Workspace Settings</h2>
              <p class="subtitle">Manage members for {{ activeWorkspaceName() }}</p>
            </div>
            <button class="close-btn" (click)="isWorkspaceSettingsOpen.set(false)">✕</button>
          </header>
          <div class="modal-body">
            <div class="members-section">
              <h3>Active Members</h3>
              <ul class="members-list">
                @for (member of workspaceService.activeWorkspace()?.members; track member.id) {
                  <li class="member-item">
                    <span class="member-avatar">{{ getInitials(member.name || member.email) }}</span>
                    <div class="member-info">
                      <span class="member-name">{{ member.name || member.email }}</span>
                      <span class="member-role">{{ member.role }}</span>
                    </div>
                  </li>
                }
              </ul>
            </div>
            
            <div class="invite-section">
              <h3>Invite Member</h3>
              <p class="section-desc">Search and invite an existing user by email.</p>
              <div class="invite-form-row">
                <input 
                  type="email" 
                  #inviteEmailInput
                  placeholder="partner@example.com" 
                  class="glass-input" />
                <button class="invite-btn" (click)="submitInvite(inviteEmailInput.value); inviteEmailInput.value=''">Invite</button>
              </div>
            </div>

            <div class="invite-link-section" style="margin-top: 1.25rem; width: 100%; border-top: 1px solid rgba(255, 255, 255, 0.04); padding-top: 1.25rem;">
              <h3>Invite Link</h3>
              <p class="section-desc">Generate a shareable link to invite users to this workspace.</p>
              <div class="invite-link-row" style="display: flex; gap: 0.5rem; width: 100%; align-items: center;">
                @if (generatedInviteLink()) {
                  <input 
                    type="text" 
                    [value]="generatedInviteLink()" 
                    readonly 
                    class="glass-input" 
                    style="flex: 1; font-size: 0.8rem;" 
                    #linkInput />
                  <button class="invite-btn" (click)="copyInviteLink(linkInput)" style="white-space: nowrap;">Copy Link</button>
                } @else {
                  <button class="invite-btn" (click)="generateInviteLink()" style="width: 100%;">Generate Link</button>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    }

    @if (isFormOpen()) {
      <app-create-card-form
        [cardToEdit]="editingCard()"
        (submitted)="onCardFormSubmit($event)"
        (cancelled)="onCardFormCancel()">
      </app-create-card-form>
    }

    @if (isIntegrationsOpen()) {
      <app-integrations-dialog
        (closed)="isIntegrationsOpen.set(false)"
        (synced)="onIntegrationsSynced()">
      </app-integrations-dialog>
    }

    @if (isCalendarDialogOpen()) {
      <app-calendar-instance-dialog
        [instance]="activeInstance()"
        [defaultDate]="defaultDate()"
        (save)="onSaveCalendarItem($event)"
        (delete)="onDeleteCalendarItem($event)"
        (cancel)="isCalendarDialogOpen.set(false)">
      </app-calendar-instance-dialog>
    }

    @if (isFeedbackOpen()) {
      <app-feedback-dialog (closed)="isFeedbackOpen.set(false)"></app-feedback-dialog>
    }

    @if (isAdminDashboardOpen()) {
      <app-admin-dashboard-dialog (closed)="isAdminDashboardOpen.set(false)"></app-admin-dashboard-dialog>
    }
  `,
  styles: [`
    .app-layout {
      display: flex;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background-color: var(--bg-primary);
    }
    .teams-sidebar {
      width: 80px;
      height: 100%;
      background-color: var(--bg-secondary);
      border-right: 1px solid var(--border-glass);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem 0;
      gap: 1.5rem;
      z-index: 10;
      flex-shrink: 0;
    }
    .sidebar-brand {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.2rem;
      box-shadow: 0 0 16px rgba(99, 102, 241, 0.4);
    }
    .logo-spark {
      color: #fff;
      font-size: 1.5rem;
      animation: float-sparkle 3s ease-in-out infinite;
    }
    
    /* Workspace Switcher Styling */
    .workspace-selector-container {
      position: relative;
      margin-bottom: 0.5rem;
    }
    .workspace-badge {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--border-glass-strong);
      color: var(--text-primary);
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
    }
    .workspace-badge:hover {
      background: rgba(99, 102, 241, 0.2);
      border-color: rgba(99, 102, 241, 0.45);
      transform: scale(1.05);
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.3);
    }
    .workspace-dropdown {
      position: absolute;
      top: 0;
      left: 60px;
      width: 250px;
      background: rgba(18, 18, 28, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-glass-strong);
      border-radius: var(--radius-md);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      z-index: 100;
      padding: 1rem 0;
      animation: fadeIn 0.18s ease-out;
    }
    .dropdown-header {
      padding: 0 1.25rem 0.75rem 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .dropdown-header h3 {
      font-size: 0.95rem;
      font-weight: 700;
      margin: 0;
      color: var(--text-primary);
    }
    .dropdown-header p {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin: 2px 0 0 0;
    }
    .workspace-list {
      list-style: none;
      padding: 0.5rem 0;
      margin: 0;
      max-height: 200px;
      overflow-y: auto;
    }
    .workspace-list li {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 1.25rem;
      cursor: pointer;
      transition: all 0.15s;
      color: var(--text-secondary);
    }
    .workspace-list li:hover {
      background: var(--bg-glass-hover);
      color: var(--text-primary);
    }
    .workspace-list li.active {
      background: rgba(99, 102, 241, 0.12);
      color: var(--text-primary);
      font-weight: 600;
    }
    .ws-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
      color: white;
      font-size: 0.72rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ws-name {
      flex: 1;
      font-size: 0.85rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: left;
    }
    .ws-check {
      color: var(--accent-secondary);
      font-weight: bold;
    }
    .dropdown-footer {
      padding: 0.5rem 0.75rem 0 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .dropdown-action-btn {
      width: 100%;
      text-align: left;
      background: none;
      border: none;
      color: var(--text-secondary);
      font-family: inherit;
      font-size: 0.8rem;
      padding: 0.4rem 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: var(--radius-sm);
      transition: all 0.15s;
    }
    .dropdown-action-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
    }
    .btn-icon {
      font-size: 0.95rem;
      font-weight: bold;
      color: var(--accent-primary);
    }

    /* Modal styling inside scoped Component */
    .glass-input {
      width: 100%;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-glass);
      color: var(--text-primary);
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      font-family: inherit;
      font-size: 0.9rem;
      transition: all 0.25s;
    }
    .glass-input:focus {
      outline: none;
      background: rgba(255, 255, 255, 0.06);
      border-color: var(--accent-primary);
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.25);
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
      width: 100%;
    }
    .cancel-btn, .submit-btn, .invite-btn {
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.5rem 1.1rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s;
    }
    .cancel-btn {
      background: transparent;
      color: var(--text-secondary);
      border: 1px solid var(--border-glass);
    }
    .cancel-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
    }
    .submit-btn {
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
      color: white;
      border: none;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
    }
    .submit-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
    }

    /* Workspace Settings Members */
    .members-section, .invite-section {
      width: 100%;
      display: flex;
      flex-direction: column;
    }
    .members-section h3, .invite-section h3 {
      font-size: 0.9rem;
      font-weight: 700;
      margin: 0 0 0.75rem 0;
      color: var(--text-primary);
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      padding-bottom: 0.35rem;
      text-align: left;
    }
    .members-list {
      list-style: none;
      padding: 0;
      margin: 0 0 1.5rem 0;
      max-height: 150px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .member-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.4rem 0.6rem;
      border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.015);
      border: 1px solid rgba(255, 255, 255, 0.04);
    }
    .member-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-primary);
      font-size: 0.75rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border-glass);
    }
    .member-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      text-align: left;
    }
    .member-name {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .member-role {
      font-size: 0.7rem;
      color: var(--text-muted);
    }
    .section-desc {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin: 0 0 0.5rem 0;
      text-align: left;
    }
    .invite-form-row {
      display: flex;
      gap: 0.5rem;
      width: 100%;
    }
    .invite-btn {
      background: var(--text-primary);
      color: var(--bg-primary);
      border: none;
    }
    .invite-btn:hover {
      background: white;
      transform: scale(1.02);
    }
    
    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      flex: 1;
      width: 100%;
      align-items: center;
    }
    .nav-item {
      width: 68px;
      height: 60px;
      border-radius: var(--radius-md);
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      color: var(--text-muted);
      position: relative;
      padding: 6px 2px;
    }
    .nav-item:hover {
      background: var(--bg-glass-hover);
      color: var(--text-primary);
      border-color: var(--border-glass-strong);
      transform: translateY(-2px);
    }
    .nav-item.active {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.35);
      color: var(--text-primary);
    }
    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 15px;
      height: 30px;
      width: 4px;
      background: linear-gradient(to bottom, var(--accent-primary), var(--accent-secondary));
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      box-shadow: 0 0 8px var(--accent-primary);
    }
    .nav-icon {
      font-size: 1.30rem;
    }
    .nav-label {
      font-size: 0.65rem;
      margin-top: 2px;
      font-weight: 500;
    }
    .sidebar-footer {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      width: 100%;
      align-items: center;
      border-top: 1px solid var(--border-glass);
      padding-top: 1.25rem;
    }
    .action-btn {
      color: var(--text-muted);
    }
    .logout-btn:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.2);
    }
    .delete-account-btn:hover {
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
      border-color: rgba(245, 158, 11, 0.2);
    }
    .planner-layout {
      display: flex;
      flex: 1;
      height: 100vh;
      overflow: hidden;
      background-image:
        radial-gradient(circle at top right, rgba(99, 102, 241, 0.12), transparent 40%),
        radial-gradient(circle at bottom left, rgba(236, 72, 153, 0.12), transparent 40%);
      position: relative;
    }
    .sidebar-wrapper {
      width: 320px;
      height: 100%;
      flex-shrink: 0;
      flex-grow: 0;
      transition: width 1.0s cubic-bezier(0.25, 0.8, 0.25, 1), flex-grow 1.0s cubic-bezier(0.25, 0.8, 0.25, 1);
      overflow: hidden;
      display: block;
    }
    .sidebar-wrapper.expanded {
      width: 100% !important;
      flex-grow: 1 !important;
    }
    .calendar-wrapper {
      width: calc(100% - 320px);
      flex-grow: 1;
      height: 100%;
      transition: width 1.0s cubic-bezier(0.25, 0.8, 0.25, 1), flex-grow 1.0s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 1.0s cubic-bezier(0.25, 0.8, 0.25, 1);
      overflow: hidden;
    }
    .calendar-wrapper.collapsed {
      width: 0 !important;
      flex-grow: 0 !important;
      opacity: 0;
      pointer-events: none;
    }

    /* Modal / Dialog Styles */
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
      max-width: 500px;
      display: flex;
      flex-direction: column;
      background: rgba(18, 18, 28, 0.85);
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
      text-align: left;
    }
    .header-title-area h2 {
      font-size: 1.3rem;
      font-weight: 700;
      margin: 0;
      background: linear-gradient(90deg, var(--text-primary), var(--text-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .icon-sparkle {
      font-size: 1.1rem;
      margin-bottom: 0.1rem;
      color: var(--accent-primary);
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
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1.25rem;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(15px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes float-sparkle {
      0%, 100% { transform: translateY(0) scale(1); filter: drop-shadow(0 0 2px var(--accent-primary)); }
      50% { transform: translateY(-3px) scale(1.05); filter: drop-shadow(0 0 6px var(--accent-secondary)); }
    }
  `]
})
export class PlannerComponent {
  public readonly cardService = inject(CardService);
  public readonly calendarService = inject(CalendarService);
  public readonly categoryService = inject(CategoryService);
  public readonly userService = inject(UserService);
  public readonly authService = inject(AuthService);
  public readonly workspaceService = inject(WorkspaceService);
  private readonly integrationService = inject(IntegrationService);
  private readonly notifications = inject(NotificationService);

  private hasAutoSynced = false;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly calendarDayIds = computed(() => 
    this.calendarService.daysGrid().map(day => 'calendar-day-' + day.dateIso)
  );

  readonly cardItemIds = computed(() => 
    this.cardService.unscheduledCards().map(card => 'card-items-' + card.id)
  );

  readonly allDropLists = computed(() => [
    ...this.calendarDayIds(),
    ...this.cardItemIds()
  ]);

  readonly isFormOpen = signal(false);
  readonly editingCard = signal<Card | null>(null);
  readonly isIntegrationsOpen = signal(false);
  readonly isFeedbackOpen = signal(false);
  readonly isAdminDashboardOpen = signal(false);

  readonly isWorkspaceDropdownOpen = signal(false);
  readonly isCreateWorkspaceOpen = signal(false);
  readonly isWorkspaceSettingsOpen = signal(false);
  readonly generatedInviteLink = signal<string>('');

  readonly activeWorkspaceName = computed(() => this.workspaceService.activeWorkspace()?.name ?? 'Select Workspace');
  readonly activeWorkspaceInitials = computed(() => this.getInitials(this.activeWorkspaceName()));

  readonly isCalendarDialogOpen = signal(false);
  readonly activeInstance = signal<ScheduledInstance | null>(null);
  readonly activeItem = signal<ListItem | null>(null);
  readonly activeCard = signal<Card | null>(null);
  readonly defaultDate = signal<string | null>(null);

  readonly viewMode = signal<'calendar' | 'whiteboard'>('calendar');

  constructor() {
    effect(() => {
      const user = this.userService.currentUser();
      if (user) {
        this.workspaceService.loadWorkspaces(user.id).subscribe({
          next: () => {
            const pendingToken = sessionStorage.getItem('lp_pending_invite_token');
            if (pendingToken) {
              sessionStorage.removeItem('lp_pending_invite_token');
              this.workspaceService.joinWorkspace(pendingToken, user.id).subscribe({
                next: (joinedWs) => {
                  this.workspaceService.setActiveWorkspace(joinedWs);
                }
              });
            }
          }
        });

        if (!this.hasAutoSynced) {
          this.integrationService.getStatus(user.id).subscribe({
            next: (status) => {
              if ((status.microsoftTodoConnected || status.googleTasksConnected) && !this.hasAutoSynced) {
                this.hasAutoSynced = true;
                if (status.microsoftTodoConnected) {
                  this.syncMicrosoftTodo(user.id);
                }
                if (status.googleTasksConnected) {
                  this.syncGoogleTasks(user.id);
                }
              }
            },
            error: (err) => {
              console.error('Failed to load integration status for auto-sync:', err);
            }
          });
        }
      }
    });

    effect(() => {
      const workspace = this.workspaceService.activeWorkspace();
      if (workspace) {
        const wsId = workspace.id;
        this.cardService.loadCards(wsId);
        this.categoryService.loadCategories(wsId);
      }
    });

    // Listen to query params for integration redirects and invitations
    this.route.queryParams.subscribe(params => {
      const inviteToken = params['inviteToken'];
      if (inviteToken) {
        sessionStorage.setItem('lp_pending_invite_token', inviteToken);
        this.router.navigate([], {
          queryParams: { inviteToken: null },
          queryParamsHandling: 'merge'
        });
      }

      const integration = params['integration'];
      if (integration === 'microsoft-success') {
        this.notifications.success('Successfully connected to Microsoft To-Do!');
        this.isIntegrationsOpen.set(true); // Re-open the integrations dialog to show connection status
        
        // Reload cards so that the sidebar instantly shows the newly imported Microsoft Tasks card
        const workspace = this.workspaceService.activeWorkspace();
        if (workspace) {
          this.cardService.loadCards(workspace.id);
        }

        // Clean parameters from the URL
        this.router.navigate([], {
          queryParams: { integration: null },
          queryParamsHandling: 'merge'
        });
      } else if (integration === 'microsoft-error') {
        const message = params['message'] || 'An unknown error occurred.';
        this.notifications.error(`Failed to connect Microsoft To-Do: ${message}`);
        this.isIntegrationsOpen.set(true); // Open the dialog to let them try again

        // Clean parameters from the URL
        this.router.navigate([], {
          queryParams: { integration: null, message: null },
          queryParamsHandling: 'merge'
        });
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.workspace-selector-container')) {
      this.isWorkspaceDropdownOpen.set(false);
    }
  }

  toggleWorkspaceDropdown(): void {
    this.isWorkspaceDropdownOpen.update(v => !v);
  }

  selectWorkspace(ws: any): void {
    this.workspaceService.setActiveWorkspace(ws);
    this.isWorkspaceDropdownOpen.set(false);
  }

  openCreateWorkspace(): void {
    this.isWorkspaceDropdownOpen.set(false);
    this.isCreateWorkspaceOpen.set(true);
  }

  submitCreateWorkspace(name: string): void {
    const userId = this.userService.currentUser()?.id;
    if (!userId || !name.trim()) return;
    this.workspaceService.createWorkspace(name.trim(), userId).subscribe({
      next: () => this.isCreateWorkspaceOpen.set(false)
    });
  }

  openWorkspaceSettings(): void {
    this.isWorkspaceDropdownOpen.set(false);
    this.generatedInviteLink.set('');
    this.isWorkspaceSettingsOpen.set(true);
  }

  generateInviteLink(): void {
    const workspace = this.workspaceService.activeWorkspace();
    if (!workspace) return;
    this.workspaceService.getInviteToken(workspace.id).subscribe({
      next: (token) => {
        const baseUrl = window.location.origin;
        this.generatedInviteLink.set(`${baseUrl}/?inviteToken=${token}`);
      }
    });
  }

  copyInviteLink(inputElement: HTMLInputElement): void {
    inputElement.select();
    navigator.clipboard.writeText(inputElement.value).then(() => {
      this.notifications.success('Invite link copied to clipboard!');
    });
  }

  submitInvite(email: string): void {
    const workspace = this.workspaceService.activeWorkspace();
    const wsId = workspace ? workspace.id : null;
    if (!wsId || !email.trim()) return;
    this.workspaceService.inviteUser(wsId, email.trim()).subscribe({
      next: () => this.isWorkspaceSettingsOpen.set(false)
    });
  }

  getInitials(name: string): string {
    if (!name) return 'WS';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, Math.min(2, name.length)).toUpperCase();
  }

  logout(): void {
    if (confirm('Are you sure you want to log out?')) {
      this.authService.logout();
    }
  }

  deleteAccount(): void {
    const user = this.userService.currentUser();
    if (!user) return;

    const confirm1 = confirm(
      'WARNING: This will permanently delete your user profile, all your feedback, and all your personal workspaces (with their cards, categories, and calendar schedules). This action is irreversible. Do you want to proceed?'
    );
    if (!confirm1) return;

    const confirm2 = confirm(
      'This is your LAST warning. Are you absolutely sure you want to delete ALL your data and logout?'
    );
    if (!confirm2) return;

    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.notifications.success('Account and data deleted successfully.');
        this.authService.logout();
      },
      error: () => {
        this.notifications.error('Failed to delete account. Please try again.');
      }
    });
  }

  startCreateCard(): void {
    this.editingCard.set(null);
    this.isFormOpen.set(true);
  }

  onEditCard(card: Card): void {
    this.editingCard.set(card);
    this.isFormOpen.set(true);
  }

  onCardFormCancel(): void {
    this.editingCard.set(null);
    this.isFormOpen.set(false);
  }

  onCardFormSubmit(data: CardFormData): void {
    const currentEdit = this.editingCard();
    const workspace = this.workspaceService.activeWorkspace();
    const workspaceId = workspace ? workspace.id : null;
    if (!workspaceId) return;

    if (currentEdit) {
      this.cardService.updateCard(currentEdit.id, data).subscribe();
      this.editingCard.set(null);
    } else {
      const userId = this.userService.currentUser()?.id;
      if (!userId) return;
      this.cardService.createCard({
        ...data,
        userId,
        workspaceId,
        listItems: []
      }).subscribe();
    }
    this.isFormOpen.set(false);
  }

  onItemDropped(event: CdkDragDrop<any>): void {
    const prevId = event.previousContainer.id;
    const currId = event.container.id;
    const data = event.item.data as { instance?: ScheduledInstance; item: ListItem; card: Card };

    if (prevId !== currId) {
      if (!data?.item || !data?.card) {
        console.warn('onItemDropped returned early: item or card data is missing', data);
        return;
      }

      if (currId.startsWith('calendar-day-')) {
        const targetDateIso = currId.replace('calendar-day-', '');
        const targetDate = new Date(targetDateIso);
        const dateStr = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (data.instance) {
          this.cardService.updateItemInstance(data.card.id, data.item.id, data.instance.id, { date: targetDateIso }).subscribe({
            next: () => this.notifications.success(`Rescheduled "${data.item.text}" to ${dateStr}`)
          });
        } else {
          const existingInstances = this.cardService.scheduledInstances().filter(si => si.listItemId === data.item.id);
          if (data.card.isChecklist && existingInstances.length > 0) {
            // Limit checklist items to 1 instance: move the existing scheduled instance
            const existing = existingInstances[0];
            this.cardService.updateScheduledInstance(existing.id, { date: targetDateIso }).subscribe({
              next: () => this.notifications.success(`Rescheduled "${data.item.text}" to ${dateStr}`)
            });
          } else {
            this.cardService.scheduleItemInstance(data.card.id, data.item.id, targetDateIso).subscribe({
              next: () => this.notifications.success(`Scheduled "${data.item.text}" on ${dateStr}`)
            });
          }
        }
      } else if (currId.startsWith('card-items-')) {
        if (data.instance) {
          this.cardService.deleteItemInstance(data.card.id, data.item.id, data.instance.id).subscribe({
            next: () => this.notifications.success(`Unscheduled "${data.item.text}"`)
          });
        } else {
          const targetCardId = parseInt(currId.replace('card-items-', ''), 10);
          if (targetCardId !== data.card.id) {
            this.cardService.updateListItem(data.card.id, {
              ...data.item,
              cardId: targetCardId
            }).subscribe({
              next: () => {
                const targetCard = this.cardService.unscheduledCards().find(c => c.id === targetCardId);
                const cardTitle = targetCard ? targetCard.title : 'another card';
                this.notifications.success(`Moved "${data.item.text}" to "${cardTitle}"`);
              }
            });
          }
        }
      }
    } else {
      if (currId.startsWith('card-items-')) {
        const cardId = parseInt(currId.replace('card-items-', ''), 10);
        const card = this.cardService.unscheduledCards().find(c => c.id === cardId);
        if (card && card.listItems) {
          // Mutate CDK's bound array in-place — CDK already knows the new order,
          // no need to replace the array reference via updateCardItems.
          moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);

          const itemIds = (event.container.data as ListItem[]).map(item => item.id);
          this.cardService.reorderChecklistItems(cardId, data.item.id, itemIds).subscribe();
        }
      }
    }
  }

  // Handle reordered cards from sidebar
  onCardsReordered(cards: Card[]): void {
    this.cardService.reorderCards(cards);
  }

  onInstanceToggled({ instance }: { instance: ScheduledInstance }): void {
    this.cardService.updateScheduledInstance(instance.id, { isCompleted: !instance.isCompleted }).subscribe();
  }

  onInstanceUnscheduled(instanceId: number): void {
    this.cardService.deleteScheduledInstance(instanceId).subscribe();
  }

  onInstanceConfirmed({ instance }: { instance: ScheduledInstance }): void {
    this.cardService.updateScheduledInstance(instance.id, { isConfirmed: true }).subscribe({
      next: () => this.notifications.success(`"${instance.title || 'Event'}" confirmed & synced to Google Calendar!`)
    });
  }

  onInstanceReverted({ instance }: { instance: ScheduledInstance }): void {
    this.cardService.updateScheduledInstance(instance.id, { isConfirmed: false }).subscribe({
      next: () => this.notifications.success(`"${instance.title || 'Event'}" reverted to draft.`)
    });
  }

  openIntegrations(): void {
    this.isIntegrationsOpen.set(true);
  }

  onIntegrationsSynced(): void {
    const workspace = this.workspaceService.activeWorkspace();
    if (workspace) {
      this.cardService.loadCards(workspace.id);
    }
  }

  onAddCalendarItem(dateIso: string): void {
    this.activeInstance.set(null);
    this.activeItem.set(null);
    this.activeCard.set(null);
    this.defaultDate.set(dateIso);
    this.isCalendarDialogOpen.set(true);
  }

  onEditCalendarItem(entry: { instance: ScheduledInstance; item?: ListItem; card?: Card }): void {
    this.activeInstance.set(entry.instance);
    this.activeItem.set(entry.item || null);
    this.activeCard.set(entry.card || null);
    this.defaultDate.set(null);
    this.isCalendarDialogOpen.set(true);
  }

  onSaveCalendarItem(formData: CalendarInstanceFormData): void {
    const userId = this.userService.currentUser()?.id;
    const workspace = this.workspaceService.activeWorkspace();
    const workspaceId = workspace ? workspace.id : null;
    if (!userId || !workspaceId) return;

    if (formData.id) {
      // Edit mode: update parent text if linked
      const active = this.activeInstance();
      const item = this.activeItem();
      const card = this.activeCard();
      if (active && item && card && active.listItemId) {
        if (item.text !== formData.title) {
          this.cardService.updateListItem(card.id, {
            ...item,
            text: formData.title
          }).subscribe();
        }
      }

      // Update the scheduled instance properties
      this.cardService.updateScheduledInstance(formData.id, {
        date: formData.date,
        isCompleted: formData.isCompleted,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        startTime: formData.startTime,
        endTime: formData.endTime,
        categoryId: formData.categoryId,
        isConfirmed: formData.isConfirmed
      }).subscribe();
    } else {
      // Create mode
      if (formData.cardId) {
        // Linked event: add item to card, then schedule
        this.cardService.addListItem(formData.cardId, formData.title).subscribe(item => {
          this.cardService.createScheduledInstance({
            userId,
            workspaceId,
            listItemId: item.id,
            date: formData.date,
            isCompleted: formData.isCompleted,
            title: formData.title,
            description: formData.description,
            type: formData.type,
            startTime: formData.startTime,
            endTime: formData.endTime,
            categoryId: formData.categoryId,
            isConfirmed: formData.isConfirmed
          }).subscribe();
        });
      } else {
        // Standalone event
        this.cardService.createScheduledInstance({
          userId,
          workspaceId,
          date: formData.date,
          isCompleted: formData.isCompleted,
          title: formData.title,
          description: formData.description,
          type: formData.type,
          startTime: formData.startTime,
          endTime: formData.endTime,
          categoryId: formData.categoryId,
          isConfirmed: formData.isConfirmed
        }).subscribe();
      }
    }
    this.isCalendarDialogOpen.set(false);
  }

  onDeleteCalendarItem(id: number): void {
    this.cardService.deleteScheduledInstance(id).subscribe();
    this.isCalendarDialogOpen.set(false);
  }

  // --- Whiteboard Coordinates Logic ---

  getCardX(card: Card): number {
    return card.whiteboardX !== null && card.whiteboardX !== undefined
      ? card.whiteboardX
      : this.getDefaultCoordinates(card).x;
  }

  getCardY(card: Card): number {
    return card.whiteboardY !== null && card.whiteboardY !== undefined
      ? card.whiteboardY
      : this.getDefaultCoordinates(card).y;
  }

  getDefaultCoordinates(card: Card): { x: number, y: number } {
    const cards = this.cardService.unscheduledCards();
    const index = cards.findIndex(c => c.id === card.id);
    const cardsPerRow = 3;
    const cardWidth = 320;
    const cardHeight = 250;
    const gap = 32;
    const startX = 48;
    const startY = 120;

    const row = Math.floor(index / cardsPerRow);
    const col = index % cardsPerRow;

    return {
      x: startX + col * (cardWidth + gap),
      y: startY + row * (cardHeight + gap)
    };
  }

  resolveOverlap(cardId: number, targetX: number, targetY: number, cards: Card[]): { x: number, y: number } {
    const getCardSize = (id: number) => {
      const el = document.querySelector(`.sidebar-card-item[data-card-id="${id}"]`);
      if (el) {
        return { w: el.clientWidth || 320, h: el.clientHeight || 250 };
      }
      return { w: 320, h: 250 };
    };

    const targetSize = getCardSize(cardId);
    let resolvedX = Math.max(16, targetX);
    let resolvedY = Math.max(16, targetY);

    let hasOverlap = true;
    let iterations = 0;
    const maxIterations = 50;

    while (hasOverlap && iterations < maxIterations) {
      hasOverlap = false;
      iterations++;

      for (const other of cards) {
        if (other.id === cardId) continue;

        const otherX = this.getCardX(other);
        const otherY = this.getCardY(other);
        const otherSize = getCardSize(other.id);

        const overlapX = Math.max(0, Math.min(resolvedX + targetSize.w, otherX + otherSize.w) - Math.max(resolvedX, otherX));
        const overlapY = Math.max(0, Math.min(resolvedY + targetSize.h, otherY + otherSize.h) - Math.max(resolvedY, otherY));

        if (overlapX > 0 && overlapY > 0) {
          hasOverlap = true;
          if (overlapX < overlapY) {
            if (resolvedX < otherX) {
              resolvedX -= overlapX;
            } else {
              resolvedX += overlapX;
            }
          } else {
            if (resolvedY < otherY) {
              resolvedY -= overlapY;
            } else {
              resolvedY += overlapY;
            }
          }
          resolvedX = Math.max(16, resolvedX);
          resolvedY = Math.max(16, resolvedY);
          break;
        }
      }
    }

    return { x: Math.round(resolvedX), y: Math.round(resolvedY) };
  }

  onCardDragEnded(event: CdkDragEnd, card: Card): void {
    const offset = event.distance;
    const currentX = this.getCardX(card);
    const currentY = this.getCardY(card);

    const rawNewX = currentX + offset.x;
    const rawNewY = currentY + offset.y;

    const cards = this.cardService.unscheduledCards();
    const resolved = this.resolveOverlap(card.id, rawNewX, rawNewY, cards);

    event.source.reset();

    this.cardService.updateCard(card.id, {
      whiteboardX: resolved.x,
      whiteboardY: resolved.y
    }).subscribe();
  }

  setViewMode(mode: 'calendar' | 'whiteboard'): void {
    if (this.viewMode() === mode) return;

    // Capture first positions in the DOM before class toggles update positions
    const firstRects = new Map<number, DOMRect>();
    document.querySelectorAll('.sidebar-card-item').forEach((el) => {
      const cardIdStr = el.getAttribute('data-card-id');
      if (cardIdStr) {
        const cardId = parseInt(cardIdStr, 10);
        if (!isNaN(cardId)) {
          firstRects.set(cardId, el.getBoundingClientRect());
        }
      }
    });

    this.viewMode.set(mode);

    // Force synchronous DOM layout update so they are placed in their final HTML structure instantly
    this.cdr.detectChanges();

    // Query elements in the new DOM structure (instantly available) and apply FLIP
    document.querySelectorAll('.sidebar-card-item').forEach((el) => {
      const htmlEl = el as HTMLElement;
      const cardIdStr = htmlEl.getAttribute('data-card-id');
      if (!cardIdStr) return;
      const cardId = parseInt(cardIdStr, 10);
      if (isNaN(cardId)) return;

      const firstRect = firstRects.get(cardId);
      if (!firstRect) return;

      // Lock unscaled layout width to prevent stretching to transitioning parent (210px for sticky notes, 288px for topic cards)
      const card = this.cardService.unscheduledCards().find(c => c.id === cardId);
      const isSticky = card?.isStickyNote || htmlEl.classList.contains('list-sticky-note') || htmlEl.classList.contains('sticky-note-item');
      htmlEl.style.width = isSticky ? '210px' : '288px';
      const lastRect = htmlEl.getBoundingClientRect();

      const dx = firstRect.left - lastRect.left;
      const dy = firstRect.top - lastRect.top;
      const sw = lastRect.width > 0 ? (firstRect.width / lastRect.width) : 1;
      const sh = lastRect.height > 0 ? (firstRect.height / lastRect.height) : 1;

      // Apply "First" styling instantly in the same paint cycle
      htmlEl.style.transformOrigin = '0 0';
      htmlEl.style.transition = 'none';
      htmlEl.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${sw}, ${sh})`;
      htmlEl.style.zIndex = '1000';

      // Play transition to zero-translate and scale=1 (the final destination layout)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          htmlEl.style.transition = 'transform 1.0s cubic-bezier(0.25, 0.8, 0.25, 1)';
          htmlEl.style.transform = 'translate3d(0, 0, 0) scale(1, 1)';

          setTimeout(() => {
            htmlEl.style.transition = '';
            htmlEl.style.transform = '';
            htmlEl.style.transformOrigin = '';
            htmlEl.style.width = '';
            htmlEl.style.zIndex = '';
          }, 1000);
        });
      });
    });
  }

  private syncMicrosoftTodo(userId: number): void {
    this.integrationService.syncTodo(userId).subscribe({
      next: () => {
        const workspace = this.workspaceService.activeWorkspace();
        if (workspace) {
          this.cardService.loadCards(workspace.id);
        }
      },
      error: (err) => {
        console.error('Failed to auto-sync Microsoft To-Do:', err);
      }
    });
  }

  private syncGoogleTasks(userId: number): void {
    this.integrationService.syncGoogleTasks(userId).subscribe({
      next: () => {
        const workspace = this.workspaceService.activeWorkspace();
        if (workspace) {
          this.cardService.loadCards(workspace.id);
        }
      },
      error: (err) => {
        console.error('Failed to auto-sync Google Tasks:', err);
      }
    });
  }
}

