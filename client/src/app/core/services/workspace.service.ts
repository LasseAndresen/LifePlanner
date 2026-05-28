import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError, map } from 'rxjs';
import { Workspace, WorkspaceMember } from '../models/planner.models';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);

  readonly workspaces = signal<Workspace[]>([]);
  readonly activeWorkspace = signal<Workspace | null>(null);

  private readonly STORAGE_KEY = 'lp_active_workspace_id';

  /**
   * Loads all workspaces for a given user. If a workspace ID was previously saved,
   * it sets it as active; otherwise, it defaults to the first workspace.
   */
  loadWorkspaces(userId: number): Observable<Workspace[]> {
    return this.http
      .get<Workspace[]>(`${environment.apiBaseUrl}/api/workspaces/user/${userId}`)
      .pipe(
        tap(workspaces => {
          this.workspaces.set(workspaces);
          if (workspaces.length > 0) {
            const savedIdStr = localStorage.getItem(this.STORAGE_KEY);
            const savedId = savedIdStr ? parseInt(savedIdStr, 10) : null;
            
            const matched = workspaces.find(w => w.id === savedId);
            if (matched) {
              this.activeWorkspace.set(matched);
            } else {
              this.activeWorkspace.set(workspaces[0]);
              localStorage.setItem(this.STORAGE_KEY, workspaces[0].id?.toString() || '');
            }
          } else {
            this.activeWorkspace.set(null);
          }
        }),
        catchError(err => {
          this.notifications.error('Failed to load workspaces.');
          return throwError(() => err);
        })
      );
  }

  createWorkspace(name: string, userId: number): Observable<Workspace> {
    return this.http
      .post<Workspace>(`${environment.apiBaseUrl}/api/workspaces`, { name, userId })
      .pipe(
        tap(created => {
          const normalized: Workspace = {
            id: created.id,
            name: created.name,
            role: created.role,
            members: created.members ?? []
          };
          this.workspaces.update(list => [...list, normalized]);
          this.setActiveWorkspace(normalized);
          this.notifications.success(`Workspace "${normalized.name}" created successfully!`);
        }),
        catchError(err => {
          this.notifications.error('Could not create workspace.');
          return throwError(() => err);
        })
      );
  }

  inviteUser(workspaceId: number, email: string): Observable<WorkspaceMember> {
    return this.http
      .post<WorkspaceMember>(`${environment.apiBaseUrl}/api/workspaces/${workspaceId}/invite`, { email })
      .pipe(
        tap(newMember => {
          this.workspaces.update(list =>
            list.map(w => {
              if (w.id === workspaceId) {
                const members = w.members ? [...w.members, newMember] : [newMember];
                return { ...w, members };
              }
              return w;
            })
          );
          // Sync active workspace reference
          const currentActive = this.activeWorkspace();
          if (currentActive && currentActive.id === workspaceId) {
            const members = currentActive.members ? [...currentActive.members, newMember] : [newMember];
            this.activeWorkspace.set({ ...currentActive, members });
          }
          this.notifications.success(`Successfully added ${email} to the workspace!`);
        }),
        catchError(err => {
          const msg = err.error?.detail || 'Failed to invite user.';
          this.notifications.error(msg);
          return throwError(() => err);
        })
      );
  }

  leaveWorkspace(workspaceId: number, userId: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiBaseUrl}/api/workspaces/${workspaceId}/users/${userId}?requesterId=${userId}`)
      .pipe(
        tap(() => {
          this.workspaces.update(list => list.filter(w => w.id !== workspaceId));
          const list = this.workspaces();
          if (list.length > 0) {
            this.setActiveWorkspace(list[0]);
          } else {
            this.activeWorkspace.set(null);
            localStorage.removeItem(this.STORAGE_KEY);
          }
          this.notifications.success('Successfully left the workspace.');
        }),
        catchError(err => {
          this.notifications.error('Failed to leave workspace.');
          return throwError(() => err);
        })
      );
  }

  removeMember(workspaceId: number, userId: number, requesterId: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiBaseUrl}/api/workspaces/${workspaceId}/users/${userId}?requesterId=${requesterId}`)
      .pipe(
        tap(() => {
          this.workspaces.update(list =>
            list.map(w => {
              if (w.id === workspaceId) {
                return { ...w, members: w.members ? w.members.filter(m => m.id !== userId) : [] };
              }
              return w;
            })
          );
          const currentActive = this.activeWorkspace();
          if (currentActive && currentActive.id === workspaceId) {
            this.activeWorkspace.set({
              ...currentActive,
              members: currentActive.members ? currentActive.members.filter(m => m.id !== userId) : []
            });
          }
          this.notifications.success('Member removed from workspace.');
        }),
        catchError(err => {
          const msg = err.error?.detail || 'Failed to remove member.';
          this.notifications.error(msg);
          return throwError(() => err);
        })
      );
  }

  setActiveWorkspace(workspace: Workspace): void {
    const id = workspace.id;
    this.activeWorkspace.set(workspace);
    localStorage.setItem(this.STORAGE_KEY, id.toString());
    this.notifications.success(`Switched to workspace "${workspace.name}"`);
  }

  getInviteToken(workspaceId: number): Observable<string> {
    return this.http
      .post<{ inviteToken: string }>(`${environment.apiBaseUrl}/api/workspaces/${workspaceId}/invite-token`, {})
      .pipe(
        map(res => res.inviteToken),
        catchError(err => {
          this.notifications.error('Could not generate invite link.');
          return throwError(() => err);
        })
      );
  }

  joinWorkspace(token: string, userId: number): Observable<Workspace> {
    return this.http
      .post<Workspace>(`${environment.apiBaseUrl}/api/workspaces/join`, { token, userId })
      .pipe(
        tap(joined => {
          // Add to workspaces signal if not already present
          const exists = this.workspaces().some(w => w.id === joined.id);
          if (!exists) {
            this.workspaces.update(list => [...list, joined]);
          }
          this.notifications.success(`Successfully joined workspace "${joined.name}"!`);
        }),
        catchError(err => {
          const msg = err.error?.detail || 'Failed to join workspace.';
          this.notifications.error(msg);
          return throwError(() => err);
        })
      );
  }

  transferOwnership(workspaceId: number, newOwnerId: number, currentOwnerId: number): Observable<void> {
    return this.http
      .post<void>(`${environment.apiBaseUrl}/api/workspaces/${workspaceId}/transfer-ownership?requesterId=${currentOwnerId}`, { newOwnerId })
      .pipe(
        tap(() => {
          this.workspaces.update(list =>
            list.map(w => {
              if (w.id === workspaceId) {
                const members = w.members ? w.members.map(m => {
                  if (m.id === currentOwnerId) {
                    return { ...m, role: 'Member' };
                  }
                  if (m.id === newOwnerId) {
                    return { ...m, role: 'Owner' };
                  }
                  return m;
                }) : [];
                return { ...w, role: 'Member', members };
              }
              return w;
            })
          );
          
          const currentActive = this.activeWorkspace();
          if (currentActive && currentActive.id === workspaceId) {
            const members = currentActive.members ? currentActive.members.map(m => {
              if (m.id === currentOwnerId) {
                return { ...m, role: 'Member' };
              }
              if (m.id === newOwnerId) {
                return { ...m, role: 'Owner' };
              }
              return m;
            }) : [];
            this.activeWorkspace.set({ ...currentActive, role: 'Member', members });
          }
          this.notifications.success('Ownership transferred successfully.');
        }),
        catchError(err => {
          const msg = err.error?.detail || 'Failed to transfer ownership.';
          this.notifications.error(msg);
          return throwError(() => err);
        })
      );
  }
}
