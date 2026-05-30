import { TestBed } from '@angular/core/testing';
import { CategoryService } from './category.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Category } from '../models/planner.models';
import { environment } from '../../../environments/environment';

describe('CategoryService', () => {
  let service: CategoryService;
  let httpMock: HttpTestingController;

  const mockCategories: Category[] = [
    { id: 1, name: 'Work', color: '#ff0000', userId: 100, workspaceId: 10 },
    { id: 2, name: 'Personal', color: '#00ff00', userId: 100, workspaceId: 10 }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CategoryService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(CategoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created with an empty list of categories', () => {
    expect(service).toBeTruthy();
    expect(service.categories()).toEqual([]);
  });

  it('should load categories and update signal', () => {
    service.loadCategories(10);

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/workspaces/10/categories`);
    expect(req.request.method).toBe('GET');
    req.flush(mockCategories);

    expect(service.categories()).toEqual(mockCategories);
  });

  it('should create category and add to local signal', () => {
    // Prime the categories first
    service.loadCategories(10);
    let req = httpMock.expectOne(`${environment.apiBaseUrl}/api/workspaces/10/categories`);
    req.flush(mockCategories);

    const newCategory: Omit<Category, 'id'> = { name: 'Health', color: '#0000ff', userId: 100, workspaceId: 10 };
    const createdCategory: Category = { id: 3, ...newCategory };

    service.createCategory(newCategory).subscribe(created => {
      expect(created).toEqual(createdCategory);
    });

    const postReq = httpMock.expectOne(`${environment.apiBaseUrl}/api/categories`);
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual(newCategory);
    postReq.flush(createdCategory);

    expect(service.categories().length).toBe(3);
    expect(service.categories()[2]).toEqual(createdCategory);
  });

  it('should update category and update local signal', () => {
    service.loadCategories(10);
    let req = httpMock.expectOne(`${environment.apiBaseUrl}/api/workspaces/10/categories`);
    req.flush(mockCategories);

    const updates = { name: 'Work Project' };

    service.updateCategory(1, updates).subscribe();

    const putReq = httpMock.expectOne(`${environment.apiBaseUrl}/api/categories/1`);
    expect(putReq.request.method).toBe('PUT');
    putReq.flush(null);

    const workCat = service.categories().find(c => c.id === 1);
    expect(workCat?.name).toBe('Work Project');
  });

  it('should delete category and filter local signal', () => {
    service.loadCategories(10);
    let req = httpMock.expectOne(`${environment.apiBaseUrl}/api/workspaces/10/categories`);
    req.flush(mockCategories);

    service.deleteCategory(1).subscribe();

    const deleteReq = httpMock.expectOne(`${environment.apiBaseUrl}/api/categories/1`);
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    expect(service.categories().length).toBe(1);
    expect(service.categories()[0].id).toBe(2);
  });
});
