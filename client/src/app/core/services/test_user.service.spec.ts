import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { User } from '../models/planner.models';
import { environment } from '../../../environments/environment';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created with no current user', () => {
    expect(service).toBeTruthy();
    expect(service.currentUser()).toBeNull();
  });

  it('should bootstrap user and set currentUser signal', () => {
    const mockUser: User = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      isAdmin: false
    };

    service.bootstrapUser('mock-token', 'access-token').subscribe(user => {
      expect(user).toEqual(mockUser);
      expect(service.currentUser()).toEqual(mockUser);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/auth/me`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ idToken: 'mock-token', accessToken: 'access-token' });
    req.flush(mockUser);
  });

  it('should call delete endpoint on deleteUser', () => {
    service.deleteUser(42).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/users/42`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
