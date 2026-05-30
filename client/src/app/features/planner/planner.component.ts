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
import { WhiteboardLayoutService } from '../../core/services/whiteboard-layout.service';

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
  templateUrl: './planner.component.html',
  styleUrls: ['./planner.component.css']
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
  protected readonly whiteboardLayout = inject(WhiteboardLayoutService);

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

  removeWorkspaceMember(member: any): void {
    const workspace = this.workspaceService.activeWorkspace();
    const currentUserId = this.userService.currentUser()?.id;
    if (!workspace || !currentUserId) return;

    if (confirm(`Are you sure you want to remove ${member.name || member.email} from the workspace?`)) {
      this.workspaceService.removeMember(workspace.id, member.id, currentUserId).subscribe();
    }
  }

  transferWorkspaceOwnership(member: any): void {
    const workspace = this.workspaceService.activeWorkspace();
    const currentUserId = this.userService.currentUser()?.id;
    if (!workspace || !currentUserId) return;

    const msg = `Are you sure you want to transfer ownership of "${workspace.name}" to ${member.name || member.email}? You will lose Owner permissions and this settings panel will close.`;
    if (confirm(msg)) {
      this.workspaceService.transferOwnership(workspace.id, member.id, currentUserId).subscribe({
        next: () => {
          this.isWorkspaceSettingsOpen.set(false);
        }
      });
    }
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

  onCardDragEnded(event: CdkDragEnd, card: Card): void {
    const offset = event.distance;
    const cards = this.cardService.unscheduledCards();
    const currentX = this.whiteboardLayout.getCardX(card, cards);
    const currentY = this.whiteboardLayout.getCardY(card, cards);

    const rawNewX = currentX + offset.x;
    const rawNewY = currentY + offset.y;

    const resolved = this.whiteboardLayout.resolveOverlap(card.id, rawNewX, rawNewY, cards);

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

