import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FuncionalidadeGroupDto } from '@repo/utils';
import {
  UI_DIALOG_DATA,
  UiCdkDialogRef,
} from '../../shared/components/ui/dialog/ui-dialog.types';
import { ButtonComponent } from '../../shared/components/ui/button.component';
import { PerfisService, PerfilDto } from './perfis.service';

export interface PerfilFormModalData {
  mode: 'create' | 'edit';
  initialData: PerfilDto | null;
  readOnly?: boolean;
  entityLabel: string;
  service: PerfisService;
}

@Component({
  selector: 'app-perfil-form-modal',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './perfil-form-modal.component.html',
  styleUrl: './perfil-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilFormModalComponent implements OnInit {
  readonly data = inject<PerfilFormModalData>(UI_DIALOG_DATA);
  private readonly dialogRef = inject<UiCdkDialogRef<unknown>>(UiCdkDialogRef);

  readonly nome = signal<string>(this.data.initialData?.nome ?? '');
  readonly ativo = signal<boolean>(this.data.initialData?.ativo ?? true);
  readonly selectedAcaoIds = signal<Set<string>>(
    new Set<string>(this.data.initialData?.acaoIds ?? []),
  );

  readonly funcionalidades = signal<FuncionalidadeGroupDto[]>([]);
  readonly loading = signal<boolean>(true);
  readonly submitting = signal<boolean>(false);
  readonly backendError = signal<string | null>(null);

  readonly modalTitle = computed(() => {
    if (this.data.readOnly) {
      return `Visualizar ${this.data.entityLabel} (Somente Leitura)`;
    }
    return this.data.mode === 'create'
      ? `Novo ${this.data.entityLabel}`
      : `Editar ${this.data.entityLabel}`;
  });

  readonly isSaveDisabled = computed(() => {
    return !this.nome().trim() || this.submitting();
  });

  ngOnInit(): void {
    this.data.service.getRolesCatalog().subscribe({
      next: (res) => {
        this.funcionalidades.set(res.funcionalidades ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  isActionSelected(acaoId: string): boolean {
    return this.selectedAcaoIds().has(acaoId);
  }

  toggleAction(acaoId: string): void {
    if (this.data.readOnly) return;
    const current = new Set(this.selectedAcaoIds());
    if (current.has(acaoId)) {
      current.delete(acaoId);
    } else {
      current.add(acaoId);
    }
    this.selectedAcaoIds.set(current);
  }

  isFuncionalidadeFullySelected(func: FuncionalidadeGroupDto): boolean {
    if (!func.acoes || func.acoes.length === 0) return false;
    const current = this.selectedAcaoIds();
    return func.acoes.every((a) => current.has(a.id));
  }

  getSelectedCount(func: FuncionalidadeGroupDto): number {
    if (!func.acoes) return 0;
    const current = this.selectedAcaoIds();
    return func.acoes.filter((a) => current.has(a.id)).length;
  }

  toggleFuncionalidade(func: FuncionalidadeGroupDto): void {
    if (this.data.readOnly || !func.acoes) return;
    const current = new Set(this.selectedAcaoIds());
    const fullySelected = this.isFuncionalidadeFullySelected(func);

    if (fullySelected) {
      for (const a of func.acoes) {
        current.delete(a.id);
      }
    } else {
      for (const a of func.acoes) {
        current.add(a.id);
      }
    }
    this.selectedAcaoIds.set(current);
  }

  onNomeChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.nome.set(val);
  }

  onAtivoChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.ativo.set(checked);
  }

  onSubmit(): void {
    if (this.data.readOnly || this.isSaveDisabled()) return;

    this.submitting.set(true);
    this.backendError.set(null);

    const payload = {
      nome: this.nome().trim(),
      ativo: this.ativo(),
      acaoIds: Array.from(this.selectedAcaoIds()),
    };

    const action$ =
      this.data.mode === 'create'
        ? this.data.service.create(payload)
        : this.data.service.update(this.data.initialData!.id, {
            ...payload,
            version: this.data.initialData?.version,
          });

    action$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.dialogRef.close(true);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.submitting.set(false);
        const msg =
          err?.error?.message || err?.message || 'Erro ao processar requisição';
        this.backendError.set(msg);
      },
    });
  }

  onClose(): void {
    this.dialogRef.close(undefined);
  }
}

