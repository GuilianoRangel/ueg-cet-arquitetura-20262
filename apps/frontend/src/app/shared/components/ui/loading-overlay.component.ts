import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/loading/loading.service';

@Component({
  selector: 'ui-loading-overlay',
  standalone: true,
  templateUrl: './loading-overlay.component.html',
  styleUrl: './loading-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiLoadingOverlayComponent {
  protected readonly loadingService = inject(LoadingService);
}
