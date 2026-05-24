import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Feedback, AdminStats } from '../models/planner.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api`;

  /**
   * Submits user feedback (bug report, feature request, general feedback, etc.)
   */
  submitFeedback(feedback: Omit<Feedback, 'id' | 'createdAt' | 'status'>): Observable<Feedback> {
    return this.http.post<Feedback>(`${this.baseUrl}/feedback`, feedback);
  }

  /**
   * Retrieves all submitted feedbacks (Admin only)
   */
  getFeedbackList(adminUserId: number): Observable<Feedback[]> {
    const params = new HttpParams().set('adminUserId', adminUserId.toString());
    return this.http.get<Feedback[]>(`${this.baseUrl}/admin/feedback`, { params });
  }

  /**
   * Updates feedback status or notes (Admin only)
   */
  updateFeedback(id: number, adminUserId: number, updated: Partial<Feedback>): Observable<Feedback> {
    const params = new HttpParams().set('adminUserId', adminUserId.toString());
    return this.http.put<Feedback>(`${this.baseUrl}/admin/feedback/${id}`, updated, { params });
  }

  /**
   * Retrieves query-based analytics and usage stats (Admin only)
   */
  getAdminStats(adminUserId: number): Observable<AdminStats> {
    const params = new HttpParams().set('adminUserId', adminUserId.toString());
    return this.http.get<AdminStats>(`${this.baseUrl}/admin/stats`, { params });
  }
}
