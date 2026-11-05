import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    service.reset();
    vi.useRealTimers();
  });

  it('should increment active requests on show() and decrement on hide()', () => {
    expect(service.isBusy()).toBe(false);
    service.show();
    expect(service.isBusy()).toBe(true);
    service.show();
    expect(service.isBusy()).toBe(true);
    service.hide();
    expect(service.isBusy()).toBe(true);
    service.hide();
    expect(service.isBusy()).toBe(false);
  });

  it('should only set isLoading to true after 150ms debounce to avoid flicker on fast requests', () => {
    service.show();
    expect(service.isBusy()).toBe(true);
    expect(service.isLoading()).toBe(false);

    vi.advanceTimersByTime(149);
    expect(service.isLoading()).toBe(false);

    vi.advanceTimersByTime(1);
    expect(service.isLoading()).toBe(true);

    service.hide();
    expect(service.isLoading()).toBe(false);
    expect(service.isBusy()).toBe(false);
  });

  it('should immediately cancel pending debounce timer if hide() is called before 150ms', () => {
    service.show();
    vi.advanceTimersByTime(100);
    expect(service.isLoading()).toBe(false);

    service.hide();
    vi.advanceTimersByTime(100);
    expect(service.isLoading()).toBe(false);
    expect(service.isBusy()).toBe(false);
  });
});
