import { Component, HostBinding, input } from '@angular/core';
import { cn } from '../../utils/cn.util';

@Component({
  selector: 'ui-card',
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class CardComponent {
  class = input<string>('');
  @HostBinding('class') get hostClasses() {
    return cn('block rounded-xl border border-border bg-card text-card-foreground shadow-card transition-all duration-200', this.class());
  }
}

@Component({
  selector: 'ui-card-header',
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class CardHeaderComponent {
  class = input<string>('');
  @HostBinding('class') get hostClasses() {
    return cn('flex flex-col space-y-1.5 p-6', this.class());
  }
}

@Component({
  selector: 'ui-card-title',
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class CardTitleComponent {
  class = input<string>('');
  @HostBinding('class') get hostClasses() {
    return cn('text-xl font-semibold leading-none tracking-tight', this.class());
  }
}

@Component({
  selector: 'ui-card-content',
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class CardContentComponent {
  class = input<string>('');
  @HostBinding('class') get hostClasses() {
    return cn('block p-6 pt-0', this.class());
  }
}
