import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgxSonnerToaster } from 'ngx-sonner';
import { ToastService } from './toast.service';

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

@Component({
  selector: 'ui-toast',
  standalone: true,
  imports: [NgxSonnerToaster],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
}
