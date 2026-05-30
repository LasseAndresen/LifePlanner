import { TestBed } from '@angular/core/testing';
import { CardService } from './card.service';
import { NotificationService } from './notification.service';
import { UserService } from './user.service';
import { WorkspaceService } from './workspace.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Card, ListItem, ScheduledInstance, Workspace, User } from '../models/planner.models';
import { environment } from '../../../environments/environment';
import { signal } from '@angular/core';

describe('CardService', () => {
  let service: CardService;
  let httpMock: HttpTestingController;
  let mockNotificationService: any;
  let mockUserService: any;
  let mockWorkspaceService: any;

  const mockUser: User = { id: 100, name: 'Lasse', email: 'lasse@example.com' };
  const mockWorkspace: Workspace = { id: 10, name: 'Personal Workspace', role: 'Owner', members: [] };

  const mockCards: Card[] = [
    {
      id: 1,
      title: 'Work Tasks',
      isChecklist: true,
      categoryId: 1,
      userId: 100,
      listItems: [
        { id: 10, text: 'Task 1', isCompleted: false, cardId: 1, scheduledInstances: [] },
        { id: 11, text: 'Task 2', isCompleted: true, cardId: 1, scheduledInstances: [] }
      ]
    },
    {
      id: 2,
      title: 'Sticky Note',
      isChecklist: false,
      categoryId: 2,
      userId: 100,
      listItems: [],
      isStickyNote: true,
      whiteboardX: 100,
      whiteboardY: 200
    }
  ];

  const mockScheduledInstances: ScheduledInstance[] = [
    { id: 20, date: '2026-05-30', isCompleted: false, userId: 100, listItemId: 10 }
  ];

  beforeEach(() => {
    mockNotificationService = {
      success: vi.fn(),
      error: vi.fn(),
      show: vi.fn()
    };

    mockUserService = {
      currentUser: signal<User | null>(mockUser)
    };

    mockWorkspaceService = {
      activeWorkspace: signal<Workspace | null>(mockWorkspace)
    };

    TestBed.configureTestingModule({
      providers: [
        CardService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: UserService, useValue: mockUserService },
        { provide: WorkspaceService, useValue: mockWorkspaceService }
      ]
    });

    service = TestBed.inject(CardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('should be created with empty initial arrays', () => {
    expect(service).toBeTruthy();
    expect(service.cards()).toEqual([]);
    expect(service.scheduledInstances()).toEqual([]);
    expect(service.unscheduledCards()).toEqual([]);
    expect(service.scheduledItems()).toEqual([]);
  });

  it('should load scheduled instances and update signal', () => {
    service.loadScheduledInstances(10);

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/workspaces/10/scheduled-instances`);
    expect(req.request.method).toBe('GET');
    req.flush(mockScheduledInstances);

    expect(service.scheduledInstances()).toEqual(mockScheduledInstances);
  });

  it('should load cards (which also loads scheduled instances) and compute scheduledItems', () => {
    service.loadCards(10);

    const instReq = httpMock.expectOne(`${environment.apiBaseUrl}/api/workspaces/10/scheduled-instances`);
    instReq.flush(mockScheduledInstances);

    const cardsReq = httpMock.expectOne(`${environment.apiBaseUrl}/api/workspaces/10/cards`);
    expect(cardsReq.request.method).toBe('GET');
    cardsReq.flush(mockCards);

    expect(service.cards()).toEqual(mockCards);
    expect(service.scheduledInstances()).toEqual(mockScheduledInstances);

    // Verify computer selector `scheduledItems` maps correctly
    const items = service.scheduledItems();
    expect(items.length).toBe(1);
    expect(items[0].instance).toEqual(mockScheduledInstances[0]);
    expect(items[0].item).toEqual(mockCards[0].listItems[0]);
    expect(items[0].card).toEqual(mockCards[0]);
  });

  it('should create a card and notify success', () => {
    const newCard: Omit<Card, 'id'> = {
      title: 'New Card',
      isChecklist: false,
      categoryId: 1,
      userId: 100,
      listItems: []
    };
    const created: Card = { id: 3, ...newCard };

    service.createCard(newCard).subscribe(res => {
      expect(res).toEqual(created);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/cards`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newCard);
    req.flush(created);

    expect(service.cards()).toContainEqual(created);
    expect(mockNotificationService.success).toHaveBeenCalledWith('Card created successfully!');
  });

  describe('updateCard with Optimistic UI & Rollback', () => {
    it('should update local signal instantly, and keep it if HTTP PUT is successful', () => {
      // Set local cards first
      service['cardsSignal'].set(JSON.parse(JSON.stringify(mockCards)));

      service.updateCard(2, { title: 'Updated Sticky' }).subscribe();

      // Local signal should reflect update instantly
      expect(service.cards().find(c => c.id === 2)?.title).toBe('Updated Sticky');

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/cards/2`);
      expect(req.request.method).toBe('PUT');
      req.flush({ ...mockCards[1], title: 'Updated Sticky' });

      expect(service.cards().find(c => c.id === 2)?.title).toBe('Updated Sticky');
      expect(mockNotificationService.error).not.toHaveBeenCalled();
    });

    it('should roll back changes if HTTP PUT fails', () => {
      service['cardsSignal'].set(JSON.parse(JSON.stringify(mockCards)));

      service.updateCard(2, { title: 'Updated Sticky' }).subscribe({
        error: (err) => expect(err).toBeTruthy()
      });

      // Verify immediate local change
      expect(service.cards().find(c => c.id === 2)?.title).toBe('Updated Sticky');

      const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/cards/2`);
      req.flush({ detail: 'Failed validation' }, { status: 400, statusText: 'Bad Request' });

      // After failure, it should be rolled back to original
      expect(service.cards().find(c => c.id === 2)?.title).toBe('Sticky Note');
      expect(mockNotificationService.error).toHaveBeenCalledWith('Update failed. Failed validation');
    });
  });

  it('should delete a card and notify success', () => {
    service['cardsSignal'].set(JSON.parse(JSON.stringify(mockCards)));

    service.deleteCard(1).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/cards/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(service.cards().length).toBe(1);
    expect(service.cards()[0].id).toBe(2);
    expect(mockNotificationService.success).toHaveBeenCalledWith('Card deleted.');
  });

  // --- List Item CRUD ---

  it('should add list item to card', () => {
    service['cardsSignal'].set(JSON.parse(JSON.stringify(mockCards)));

    service.addListItem(1, 'Task 3').subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/cards/1/items`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.text).toBe('Task 3');

    const mockCreatedItem: ListItem = { id: 12, text: 'Task 3', isCompleted: false, cardId: 1, scheduledInstances: [] };
    req.flush(mockCreatedItem);

    const updatedCard = service.cards().find(c => c.id === 1);
    expect(updatedCard?.listItems.length).toBe(3);
    expect(updatedCard?.listItems[0]).toEqual({ ...mockCreatedItem, isNew: true });
  });

  it('should update list item and sync to scheduled instances signal', () => {
    service['cardsSignal'].set(JSON.parse(JSON.stringify(mockCards)));
    service['scheduledInstancesSignal'].set(JSON.parse(JSON.stringify(mockScheduledInstances)));

    const itemToUpdate: ListItem = { id: 10, text: 'Task 1 Renamed', isCompleted: true, cardId: 1, scheduledInstances: [] };

    service.updateListItem(1, itemToUpdate).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/cards/1/items/10`);
    expect(req.request.method).toBe('PUT');
    req.flush(itemToUpdate);

    // Verify item is updated in cards list
    const updatedCard = service.cards().find(c => c.id === 1);
    const updatedItem = updatedCard?.listItems.find(i => i.id === 10);
    expect(updatedItem?.text).toBe('Task 1 Renamed');
    expect(updatedItem?.isCompleted).toBe(true);

    // Verify title and status are synced to scheduled instances
    const instance = service.scheduledInstances().find(s => s.listItemId === 10);
    expect(instance?.title).toBe('Task 1 Renamed');
    expect(instance?.isCompleted).toBe(true);
  });

  it('should delete list item from card', () => {
    service['cardsSignal'].set(JSON.parse(JSON.stringify(mockCards)));

    service.deleteListItem(1, 10).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/cards/1/items/10`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    const card = service.cards().find(c => c.id === 1);
    expect(card?.listItems.length).toBe(1);
    expect(card?.listItems[0].id).toBe(11);
  });

  // --- Scheduled Instances ---

  it('should create scheduled instance', () => {
    const newInstance: Omit<ScheduledInstance, 'id'> = {
      date: '2026-06-01',
      isCompleted: false,
      userId: 100,
      listItemId: 10
    };
    const created: ScheduledInstance = { id: 25, ...newInstance };

    service.createScheduledInstance(newInstance).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/scheduled-instances`);
    expect(req.request.method).toBe('POST');
    req.flush(created);

    expect(service.scheduledInstances()).toContainEqual(created);
    expect(mockNotificationService.success).toHaveBeenCalledWith('Event scheduled successfully!');
  });

  it('should update scheduled instance and sync status to item if listItemId exists', () => {
    service['cardsSignal'].set(JSON.parse(JSON.stringify(mockCards)));
    service['scheduledInstancesSignal'].set(JSON.parse(JSON.stringify(mockScheduledInstances)));

    service.updateScheduledInstance(20, { isCompleted: true }).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/scheduled-instances/20`);
    expect(req.request.method).toBe('PUT');
    req.flush({ ...mockScheduledInstances[0], isCompleted: true });

    // Inst should be updated
    expect(service.scheduledInstances().find(s => s.id === 20)?.isCompleted).toBe(true);

    // Corresponding card item should be marked complete
    const card = service.cards().find(c => c.id === 1);
    expect(card?.listItems.find(i => i.id === 10)?.isCompleted).toBe(true);
  });

  it('should delete scheduled instance', () => {
    service['scheduledInstancesSignal'].set(JSON.parse(JSON.stringify(mockScheduledInstances)));

    service.deleteScheduledInstance(20).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/scheduled-instances/20`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(service.scheduledInstances().length).toBe(0);
    expect(mockNotificationService.success).toHaveBeenCalledWith('Event unscheduled.');
  });

  it('should schedule item instance using current user and active workspace', () => {
    const dateIso = '2026-06-05';
    service.scheduleItemInstance(1, 10, dateIso).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/scheduled-instances`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      userId: 100,
      workspaceId: 10,
      listItemId: 10,
      date: dateIso,
      isCompleted: false,
      isConfirmed: false
    });
    req.flush({ id: 99, userId: 100, workspaceId: 10, listItemId: 10, date: dateIso, isCompleted: false });
  });

  it('should throw error when scheduling item if user is not logged in', () => {
    mockUserService.currentUser.set(null);
    expect(() => service.scheduleItemInstance(1, 10, '2026-06-05')).toThrow('User not logged in');
  });

  it('should throw error when scheduling item if workspace is not active', () => {
    mockWorkspaceService.activeWorkspace.set(null);
    expect(() => service.scheduleItemInstance(1, 10, '2026-06-05')).toThrow('No active workspace selected');
  });

  // --- Reordering ---

  it('should reorder checklist items and update local card', () => {
    service['cardsSignal'].set(JSON.parse(JSON.stringify(mockCards)));

    service.reorderChecklistItems(1, 11, [11, 10]).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/cards/1/items/reorder`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ movedItemId: 11, itemIds: [11, 10] });

    const updatedCard: Card = {
      ...mockCards[0],
      listItems: [
        { id: 11, text: 'Task 2', isCompleted: true, cardId: 1, scheduledInstances: [] },
        { id: 10, text: 'Task 1', isCompleted: false, cardId: 1, scheduledInstances: [] }
      ]
    };
    req.flush(updatedCard);

    expect(service.cards().find(c => c.id === 1)?.listItems).toEqual(updatedCard.listItems);
  });

  it('should reorder cards, update signal, and make post request to server', () => {
    service['cardsSignal'].set(JSON.parse(JSON.stringify(mockCards)));

    // Reorder: element 1 (Sticky Note) goes to index 0, element 0 (Work Tasks) goes to index 1
    const sortedCards = [mockCards[1], mockCards[0]];

    service.reorderCards(sortedCards);

    // Signal updated immediately
    expect(service.cards()[0].id).toBe(2);
    expect(service.cards()[0].order).toBe(0);
    expect(service.cards()[1].id).toBe(1);
    expect(service.cards()[1].order).toBe(1);

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/cards/reorder`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual([
      { id: 2, order: 0 },
      { id: 1, order: 1 }
    ]);
    req.flush(null);

    expect(mockNotificationService.success).toHaveBeenCalledWith('Card order saved.');
  });
});
