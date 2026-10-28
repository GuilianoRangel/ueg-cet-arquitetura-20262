import { Component, HostBinding, input } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn.util';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
        outline: 'border border-border bg-background hover:bg-muted hover:text-foreground',
        secondary: 'bg-surface text-surface-foreground hover:bg-muted shadow-sm',
        ghost: 'hover:bg-muted hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

@Component({
  selector: 'button[ui-button], a[ui-button]',
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class ButtonComponent {
  variant = input<ButtonVariants['variant']>('default');
  size = input<ButtonVariants['size']>('default');
  class = input<string>('');

  @HostBinding('class')
  get hostClasses() {
    return cn(buttonVariants({ variant: this.variant(), size: this.size(), className: this.class() }));
  }
}
