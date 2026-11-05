import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiPaginatorComponent } from './ui-paginator.component';

describe('UiPaginatorComponent', () => {
  let fixture: ComponentFixture<UiPaginatorComponent>;
  let component: UiPaginatorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiPaginatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UiPaginatorComponent);
    component = fixture.componentInstance;
  });

  it('should display current range and total items', () => {
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('limit', 10);
    fixture.componentRef.setInput('total', 35);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Exibindo 11 a 20 de 35 registros');
  });

  it('should emit page change when clicking next, prev, first, last or page number', () => {
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('limit', 10);
    fixture.componentRef.setInput('total', 40);
    fixture.detectChanges();

    const pageChangeSpy = vi.fn();
    component.pageChange.subscribe(pageChangeSpy);

    const host = fixture.nativeElement as HTMLElement;

    const nextBtn = host.querySelector(
      '[data-testid="paginator-next"]',
    ) as HTMLButtonElement;
    nextBtn.click();
    expect(pageChangeSpy).toHaveBeenLastCalledWith(3);

    const prevBtn = host.querySelector(
      '[data-testid="paginator-prev"]',
    ) as HTMLButtonElement;
    prevBtn.click();
    expect(pageChangeSpy).toHaveBeenLastCalledWith(1);

    const firstBtn = host.querySelector(
      '[data-testid="paginator-first"]',
    ) as HTMLButtonElement;
    firstBtn.click();
    expect(pageChangeSpy).toHaveBeenLastCalledWith(1);

    const lastBtn = host.querySelector(
      '[data-testid="paginator-last"]',
    ) as HTMLButtonElement;
    lastBtn.click();
    expect(pageChangeSpy).toHaveBeenLastCalledWith(4);

    const page3Btn = host.querySelector(
      '[data-testid="paginator-page-3"]',
    ) as HTMLButtonElement;
    page3Btn.click();
    expect(pageChangeSpy).toHaveBeenLastCalledWith(3);
  });

  it('should emit limit change and reset to page 1 when changing page size selector', () => {
    fixture.componentRef.setInput('page', 2);
    fixture.componentRef.setInput('limit', 10);
    fixture.componentRef.setInput('total', 50);
    fixture.detectChanges();

    const limitChangeSpy = vi.fn();
    component.limitChange.subscribe(limitChangeSpy);

    const host = fixture.nativeElement as HTMLElement;
    const select = host.querySelector(
      '[data-testid="paginator-limit-select"]',
    ) as HTMLSelectElement;

    select.value = '25';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(limitChangeSpy).toHaveBeenCalledWith(25);
  });
});
