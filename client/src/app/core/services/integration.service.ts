import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Card } from '../models/planner.models';
import { environment } from '../../../environments/environment';

export interface IntegrationStatus {
  microsoftTodoConnected: boolean;
  googleKeepConnected: boolean;
}

export interface KeepNote {
  id: string;
  title: string;
  items: string[];
  isImported: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class IntegrationService {
  private readonly http = inject(HttpClient);

  getStatus(userId: number): Observable<IntegrationStatus> {
    return this.http.get<IntegrationStatus>(`${environment.apiBaseUrl}/api/integrations/status/${userId}`);
  }

  connect(userId: number, provider: string): Observable<IntegrationStatus> {
    return this.http.post<IntegrationStatus>(`${environment.apiBaseUrl}/api/integrations/connect/${userId}`, { provider });
  }

  disconnect(userId: number, provider: string): Observable<IntegrationStatus> {
    return this.http.post<IntegrationStatus>(`${environment.apiBaseUrl}/api/integrations/disconnect/${userId}`, { provider });
  }

  getKeepNotes(userId: number): Observable<KeepNote[]> {
    return this.http.get<KeepNote[]>(`${environment.apiBaseUrl}/api/integrations/keep-notes/${userId}`);
  }

  importKeepNotes(userId: number, externalIds: string[]): Observable<Card[]> {
    return this.http.post<Card[]>(`${environment.apiBaseUrl}/api/integrations/keep-notes/import/${userId}`, { externalIds });
  }

  syncTodo(userId: number): Observable<Card> {
    return this.http.post<Card>(`${environment.apiBaseUrl}/api/integrations/todo/sync/${userId}`, {});
  }
}
