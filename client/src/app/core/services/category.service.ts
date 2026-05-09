import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Category } from '../models/planner.models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly categoriesSignal = signal<Category[]>([]);

  readonly categories = this.categoriesSignal.asReadonly();

  loadCategories(userId: number): void {
    this.http
      .get<Category[]>(`${environment.apiBaseUrl}/api/users/${userId}/categories`)
      .subscribe(categories => this.categoriesSignal.set(categories));
  }

  createCategory(category: Omit<Category, 'id'>): Observable<Category> {
    return this.http
      .post<Category>(`${environment.apiBaseUrl}/api/categories`, category)
      .pipe(tap(created => this.categoriesSignal.update(cats => [...cats, created])));
  }

  updateCategory(id: number, updates: Partial<Category>): Observable<void> {
    const current = this.categoriesSignal().find(c => c.id === id);
    if (!current) return new Observable(sub => sub.complete());
    return this.http
      .put<void>(`${environment.apiBaseUrl}/api/categories/${id}`, { ...current, ...updates })
      .pipe(tap(() => this.categoriesSignal.update(cats =>
        cats.map(c => c.id === id ? { ...c, ...updates } : c)
      )));
  }

  deleteCategory(id: number): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiBaseUrl}/api/categories/${id}`)
      .pipe(tap(() => this.categoriesSignal.update(cats => cats.filter(c => c.id !== id))));
  }
}
