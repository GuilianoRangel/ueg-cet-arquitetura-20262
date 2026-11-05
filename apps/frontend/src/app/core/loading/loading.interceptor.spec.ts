import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  LoadingService,
  withSkipGlobalLoading,
} from './loading.service';
import { loadingInterceptor } from './loading.interceptor';

describe('loadingInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let loadingService: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([loadingInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    loadingService = TestBed.inject(LoadingService);
  });

  afterEach(() => {
    httpMock.verify();
    loadingService.reset();
  });

  it('loadingInterceptor should trigger LoadingService by default on HTTP requests', () => {
    expect(loadingService.isBusy()).toBe(false);

    http.get('/api/test').subscribe();
    expect(loadingService.isBusy()).toBe(true);

    const req = httpMock.expectOne('/api/test');
    req.flush({ ok: true });

    expect(loadingService.isBusy()).toBe(false);
  });

  it('loadingInterceptor should NOT trigger LoadingService when SKIP_GLOBAL_LOADING is true in HttpContext', () => {
    expect(loadingService.isBusy()).toBe(false);

    http
      .get('/api/silent', { context: withSkipGlobalLoading() })
      .subscribe();
    expect(loadingService.isBusy()).toBe(false);

    const req = httpMock.expectOne('/api/silent');
    req.flush({ ok: true });

    expect(loadingService.isBusy()).toBe(false);
  });
});

