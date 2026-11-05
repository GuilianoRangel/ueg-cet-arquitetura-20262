import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dialog } from '@angular/cdk/dialog';
import { Subject, firstValueFrom } from 'rxjs';
import { UiDialogService } from './ui-dialog.service';
import { UiConfirmDialogComponent } from './ui-confirm-dialog.component';

@Component({
  selector: 'app-dummy-modal',
  standalone: true,
  template: '<div>Dummy Modal</div>',
})
class DummyModalComponent {}

describe('UiDialogService', () => {
  let service: UiDialogService;
  let closedSubject: Subject<unknown>;
  let cdkDialogMock: {
    open: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    closedSubject = new Subject<unknown>();
    cdkDialogMock = {
      open: vi.fn().mockImplementation(() => ({
        closed: closedSubject.asObservable(),
        close: (result?: unknown) => {
          closedSubject.next(result);
          closedSubject.complete();
        },
      })),
    };

    TestBed.configureTestingModule({
      providers: [
        UiDialogService,
        { provide: Dialog, useValue: cdkDialogMock },
      ],
    });

    service = TestBed.inject(UiDialogService);
  });

  it('open should open a component inside CDK Dialog with UEG Design System panel classes', () => {
    const dialogRef = service.open<{ saved: boolean }, { id: string }>(
      DummyModalComponent,
      {
        data: { id: '123' },
        width: '600px',
      },
    );

    expect(cdkDialogMock.open).toHaveBeenCalledTimes(1);
    const [componentArg, configArg] = cdkDialogMock.open.mock.calls[0] as [
      unknown,
      Record<string, unknown>,
    ];
    expect(componentArg).toBe(DummyModalComponent);
    expect(configArg['data']).toEqual({ id: '123' });
    expect(configArg['width']).toBe('600px');
    expect(configArg['panelClass']).toEqual(
      expect.arrayContaining(['ui-dialog-panel']),
    );
    expect(dialogRef).toBeDefined();
    expect(typeof dialogRef.close).toBe('function');
  });

  it('confirm should open UiConfirmDialogComponent and emit true when confirmed and false when cancelled', async () => {
    // 1. Confirmed case
    const confirmPromise = firstValueFrom(
      service.confirm({
        title: 'Excluir registro',
        message: 'Tem certeza que deseja excluir?',
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        variant: 'destructive',
      }),
    );

    expect(cdkDialogMock.open).toHaveBeenCalledWith(
      UiConfirmDialogComponent,
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Excluir registro',
          message: 'Tem certeza que deseja excluir?',
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
          variant: 'destructive',
        }),
      }),
    );

    closedSubject.next(true);
    closedSubject.complete();

    const confirmedResult = await confirmPromise;
    expect(confirmedResult).toBe(true);

    // 2. Cancelled / dismissed (undefined) case
    closedSubject = new Subject<unknown>();
    const cancelPromise = firstValueFrom(
      service.confirm({
        title: 'Confirmar ação',
        message: 'Deseja prosseguir?',
      }),
    );

    closedSubject.next(undefined);
    closedSubject.complete();

    const cancelledResult = await cancelPromise;
    expect(cancelledResult).toBe(false);
  });
});

