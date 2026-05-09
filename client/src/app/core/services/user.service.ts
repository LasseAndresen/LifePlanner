import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User } from '../models/planner.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly http = inject(HttpClient);

  readonly currentUser = signal<User | null>(null);

  /**
   * Sends the Google ID token to the backend to validate it and create or
   * retrieve the corresponding User record. Should be called once after a
   * successful Google login.
   */
  bootstrapUser(idToken: string): Observable<User> {
    return this.http
      .post<User>(`${environment.apiBaseUrl}/api/auth/me`, { idToken })
      .pipe(tap(user => this.currentUser.set(user)));
  }
}
