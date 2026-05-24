import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardSidebarComponent } from './components/card-sidebar/card-sidebar.component';
import { CalendarGridComponent } from './components/calendar-grid/calendar-grid.component';
import { CreateCardFormComponent, CardFormData } from './components/create-card-form/create-card-form.component';
import { IntegrationsDialogComponent } from './components/integrations-dialog/integrations-dialog.component';
import { CardService } from '../../core/services/card.service';
import { CalendarService } from '../../core/services/calendar.service';
import { CategoryService } from '../../core/services/category.service';
import { UserService } from '../../core/services/user.service';
import { Card, ListItem, ScheduledInstance } from '../../core/models/planner.models';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { NotificationService } from '../../core/services/notification.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CalendarInstanceDialogComponent, CalendarInstanceFormData } from './components/calendar-instance-dialog/calendar-instance-dialog.component';

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [CommonModule, CardSidebarComponent, CalendarGridComponent, CreateCardFormComponent, IntegrationsDialogComponent, DragDropModule, CalendarInstanceDialogComponent],
  template: `
    <div class="planner-layout">
      <app-card-sidebar
          [cards]="cardService.unscheduledCards()"
          [connectedTo]="allDropLists()"
          (addCardClicked)="startCreateCard()"
          (editCardClicked)="onEditCard($event)"
          (integrationsClicked)="openIntegrations()"
          (itemDropped)="onItemDropped($event)"
          (cardsReordered)="onCardsReordered($event)">
      </app-card-sidebar>

      <app-calendar-grid
        [connectedTo]="allDropLists()"
        (itemDropped)="onItemDropped($event)"
        (addClicked)="onAddCalendarItem($event)"
        (editClicked)="onEditCalendarItem($event)"
        (instanceToggled)="onInstanceToggled($event)"
        (instanceUnscheduled)="onInstanceUnscheduled($event)">
      </app-calendar-grid>
    </div>

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
  `,
  styles: [`
    .planner-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      height: 100vh;
      width: 100vw;
      background-image:
        radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 40%),
        radial-gradient(circle at bottom left, rgba(236, 72, 153, 0.15), transparent 40%);
      overflow: hidden;
    }
    .planner-layout > * {
      min-height: 0;
      min-width: 0;
      height: 100%;
      overflow: hidden;
    }
  `]
})
export class PlannerComponent {
  public readonly cardService = inject(CardService);
  public readonly calendarService = inject(CalendarService);
  public readonly categoryService = inject(CategoryService);
  private readonly userService = inject(UserService);
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

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

  readonly isCalendarDialogOpen = signal(false);
  readonly activeInstance = signal<ScheduledInstance | null>(null);
  readonly activeItem = signal<ListItem | null>(null);
  readonly activeCard = signal<Card | null>(null);
  readonly defaultDate = signal<string | null>(null);

  constructor() {
    effect(() => {
      const user = this.userService.currentUser();
      if (user) {
        this.cardService.loadCards(user.id);
        this.categoryService.loadCategories(user.id);
      }
    });

    // Listen to query params for integration redirects
    this.route.queryParams.subscribe(params => {
      const integration = params['integration'];
      if (integration === 'microsoft-success') {
        this.notifications.success('Successfully connected to Microsoft To-Do!');
        this.isIntegrationsOpen.set(true); // Re-open the integrations dialog to show connection status
        
        // Reload cards so that the sidebar instantly shows the newly imported Microsoft Tasks card
        const user = this.userService.currentUser();
        if (user) {
          this.cardService.loadCards(user.id);
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
    if (currentEdit) {
      this.cardService.updateCard(currentEdit.id, data).subscribe();
      this.editingCard.set(null);
    } else {
      const userId = this.userService.currentUser()?.id;
      if (!userId) return;
      this.cardService.createCard({
        ...data,
        userId,
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

  openIntegrations(): void {
    this.isIntegrationsOpen.set(true);
  }

  onIntegrationsSynced(): void {
    const user = this.userService.currentUser();
    if (user) {
      this.cardService.loadCards(user.id);
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
    if (!userId) return;

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
        categoryId: formData.categoryId
      }).subscribe();
    } else {
      // Create mode
      if (formData.cardId) {
        // Linked event: add item to card, then schedule
        this.cardService.addListItem(formData.cardId, formData.title).subscribe(item => {
          this.cardService.createScheduledInstance({
            userId,
            listItemId: item.id,
            date: formData.date,
            isCompleted: formData.isCompleted,
            title: formData.title,
            description: formData.description,
            type: formData.type,
            startTime: formData.startTime,
            endTime: formData.endTime,
            categoryId: formData.categoryId
          }).subscribe();
        });
      } else {
        // Standalone event
        this.cardService.createScheduledInstance({
          userId,
          date: formData.date,
          isCompleted: formData.isCompleted,
          title: formData.title,
          description: formData.description,
          type: formData.type,
          startTime: formData.startTime,
          endTime: formData.endTime,
          categoryId: formData.categoryId
        }).subscribe();
      }
    }
    this.isCalendarDialogOpen.set(false);
  }

  onDeleteCalendarItem(id: number): void {
    this.cardService.deleteScheduledInstance(id).subscribe();
    this.isCalendarDialogOpen.set(false);
  }
}
