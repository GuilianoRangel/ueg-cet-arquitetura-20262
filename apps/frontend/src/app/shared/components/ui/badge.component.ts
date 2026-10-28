import { Component, HostBinding, input } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.util';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-success text-success-foreground hover:bg-success/80',
        warning: 'border-transparent bg-warning text-warning-foreground hover:bg-warning/80',
        info: 'border-transparent bg-info text-info-foreground hover:bg-info/80',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type BadgeVariants = VariantProps<typeof badgeVariants>;

@Component({
  selector: 'ui-badge',
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class BadgeComponent {
  variant = input<BadgeVariants['variant']>('default');
  class = input<string>('');

  @HostBinding('class')
  get hostClasses() {
    return cn(badgeVariants({ variant: this.variant(), className: this.class() }));
  }
}
