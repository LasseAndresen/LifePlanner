import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationService]
    });
    service = TestBed.inject(NotificationService);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should be created with an empty notifications list', () => {
    expect(service).toBeTruthy();
    expect(service.notifications()).toEqual([]);
  });

  it('should add a notification via show()', () => {
    service.show('Test Message', 'info');
    const list = service.notifications();
    expect(list.length).toBe(1);
    expect(list[0]).toEqual({
      id: 0,
      message: 'Test Message',
      type: 'info'
    });
  });

  it('should add an error notification via error()', () => {
    service.error('Error Message');
    const list = service.notifications();
    expect(list.length).toBe(1);
    expect(list[0].type).toBe('error');
    expect(list[0].message).toBe('Error Message');
  });

  it('should add a success notification via success()', () => {
    service.success('Success Message');
    const list = service.notifications();
    expect(list.length).toBe(1);
    expect(list[0].type).toBe('success');
  });

  it('should remove a notification via remove()', () => {
    service.show('Msg 1');
    service.show('Msg 2');
    expect(service.notifications().length).toBe(2);

    const firstId = service.notifications()[0].id;
    service.remove(firstId);

    const list = service.notifications();
    expect(list.length).toBe(1);
    expect(list[0].message).toBe('Msg 2');
  });

  it('should auto-remove notification after 5 seconds', () => {
    service.show('Self Destruct');
    expect(service.notifications().length).toBe(1);

    // Fast-forward 5 seconds
    vi.advanceTimersByTime(5000);
    expect(service.notifications().length).toBe(0);
  });
});
