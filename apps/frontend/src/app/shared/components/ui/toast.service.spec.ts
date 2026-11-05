import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { toast as sonnerToast } from 'ngx-sonner';
import { ToastService } from './toast.service';

vi.mock('ngx-sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should expose success, error, info and warning methods', () => {
    expect(typeof service.success).toBe('function');
    expect(typeof service.error).toBe('function');
    expect(typeof service.info).toBe('function');
    expect(typeof service.warning).toBe('function');
  });

  it('should maintain reactive toasts signal and delegate to ngx-sonner', () => {
    service.success('Salvo com sucesso');
    expect(sonnerToast.success).toHaveBeenCalledWith(
      'Salvo com sucesso',
      expect.objectContaining({ duration: 3000 }),
    );
    expect(service.toasts().some((t) => t.message === 'Salvo com sucesso')).toBe(
      true,
    );

    service.error('Erro ao salvar');
    expect(sonnerToast.error).toHaveBeenCalledWith(
      'Erro ao salvar',
      expect.objectContaining({ duration: 3000 }),
    );

    service.info('Informação');
    expect(sonnerToast.info).toHaveBeenCalledWith(
      'Informação',
      expect.objectContaining({ duration: 3000 }),
    );

    service.warning('Atenção');
    expect(sonnerToast.warning).toHaveBeenCalledWith(
      'Atenção',
      expect.objectContaining({ duration: 3000 }),
    );

    expect(service.toasts().length).toBe(4);
    vi.advanceTimersByTime(3000);
    expect(service.toasts().length).toBe(0);
  });
});
