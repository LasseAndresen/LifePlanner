import { TestBed } from '@angular/core/testing';
import { WorkspaceService } from './workspace.service';
import { NotificationService } from './notification.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Workspace, WorkspaceMember } from '../models/planner.models';
import { environment } from '../../../environments/environment';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let httpMock: HttpTestingController;
  let mockNotificationService: any;

  const mockWorkspaces: Workspace[] = [
    { id: 1, name: 'Workspace A', role: 'Owner', members: [{ id: 100, name: 'Owner User', role: 'Owner', email: 'owner@example.com' }] },
    { id: 2, name: 'Workspace B', role: 'Member', members: [{ id: 101, name: 'Other User', role: 'Owner', email: 'other@example.com' }] }
  ];

  beforeEach(() => {
    mockNotificationService = {
      error: vi.fn(),
      success: vi.fn(),
      show: vi.fn()
    };

    // Mock localStorage
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { for (const k in store) delete store[k]; }
    });

    TestBed.configureTestingModule({
      providers: [
        WorkspaceService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    });

    service = TestBed.inject(WorkspaceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  it('should load workspaces and set active workspace', () => {
    service.loadWorkspaces(100).subscribe(workspaces => {
      expect(workspaces).toEqual(mockWorkspaces);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/workspaces/user/100`);
    expect(req.request.method).toBe('GET');
    req.flush(mockWorkspaces);

    expect(service.workspaces()).toEqual(mockWorkspaces);
    // Should default to first workspace if nothing in localStorage
    expect(service.activeWorkspace()).toEqual(mockWorkspaces[0]);
    expect(localStorage.getItem('lp_active_workspace_id')).toBe('1');
  });

  it('should load workspaces and respect saved active workspace in localStorage', () => {
    localStorage.setItem('lp_active_workspace_id', '2');

    service.loadWorkspaces(100).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/workspaces/user/100`);
    req.flush(mockWorkspaces);

    expect(service.activeWorkspace()).toEqual(mockWorkspaces[1]);
  });

  it('should show error notification on load fail', () => {
    service.loadWorkspaces(100).subscribe({
      error: (err) => {
        expect(err).toBeTruthy();
      }
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/workspaces/user/100`);
    req.flush('Failed', { status: 500, statusText: 'Internal Server Error' });

    expect(mockNotificationService.error).toHaveBeenCalledWith('Failed to load workspaces.');
  });

  it('should create workspace, update list, set active, and show success', () => {
    const createdWorkspace: Workspace = { id: 3, name: 'Workspace C', role: 'Owner', members: [] };

    service.createWorkspace('Workspace C', 100).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/workspaces`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Workspace C', userId: 100 });
    req.flush(createdWorkspace);

    // List should contain Workspace C
    expect(service.workspaces().some(w => w.id === 3)).toBe(true);
    expect(service.activeWorkspace()?.id).toBe(3);
    expect(mockNotificationService.success).toHaveBeenCalledWith('Workspace "Workspace C" created successfully!');
  });

  it('should invite user and append to workspace members list', () => {
    // Set initial workspaces
    service.workspaces.set(JSON.parse(JSON.stringify(mockWorkspaces)));
    service.activeWorkspace.set(JSON.parse(JSON.stringify(mockWorkspaces[0])));

    const newMember: WorkspaceMember = { id: 102, name: 'Invited User', role: 'Member', email: 'invited@example.com' };

    service.inviteUser(1, 'invited@example.com').subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/workspaces/1/invite`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'invited@example.com' });
    req.flush(newMember);

    // Workspace 1 members list should now have length 2
    const ws1 = service.workspaces().find(w => w.id === 1);
    expect(ws1?.members?.length).toBe(2);
    expect(ws1?.members?.[1]).toEqual(newMember);
    expect(service.activeWorkspace()?.members?.length).toBe(2);
  });

  it('should handle transferOwnership correctly', () => {
    service.workspaces.set(JSON.parse(JSON.stringify(mockWorkspaces)));
    // Set workspace 1 as active (role 'Owner', members currentOwnerId=100 and newOwnerId=102)
    const activeWs: Workspace = {
      id: 1,
      name: 'Workspace A',
      role: 'Owner',
      members: [
        { id: 100, name: 'Owner User', role: 'Owner', email: 'owner@example.com' },
        { id: 102, name: 'New Owner', role: 'Member', email: 'new@example.com' }
      ]
    };
    service.workspaces.set([activeWs]);
    service.activeWorkspace.set(activeWs);

    service.transferOwnership(1, 102, 100).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/workspaces/1/transfer-ownership`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ newOwnerId: 102, requesterId: 100 });
    req.flush(null);

    // Active workspace should update role to Member, and update roles of member list
    const updatedActive = service.activeWorkspace();
    expect(updatedActive?.role).toBe('Member');
    expect(updatedActive?.members?.find(m => m.id === 100)?.role).toBe('Member');
    expect(updatedActive?.members?.find(m => m.id === 102)?.role).toBe('Owner');
  });
});
