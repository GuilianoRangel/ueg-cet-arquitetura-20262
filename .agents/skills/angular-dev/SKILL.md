---
name: angular-dev
description: >
  Comprehensive Angular development guide covering modern Angular (v20+/v21+) patterns including
  standalone components, signals, zoneless change detection, resource API, httpResource, reactive
  forms, routing, SSR/hydration, and the official Angular style guide. Use this skill whenever the
  user is working with Angular components, services, templates, signals, dependency injection,
  routing, forms, HTTP requests, SSR, testing, animations, or any Angular-specific code. Also
  trigger when the user mentions Angular CLI, ng commands, @Component, @Injectable, signal(),
  computed(), linkedSignal(), resource(), httpResource(), inject(), OnPush, zoneless, @defer,
  @if/@for control flow, or any Angular template syntax. Do NOT use for AngularJS (v1.x) or
  non-Angular TypeScript/JavaScript code.
---

# Angular Development Guide

Modern Angular (v20+/v21+) best practices and patterns based on the official Angular documentation.

## Core Principles

Angular v21+ is **zoneless by default** — ZoneJS is no longer required. All new code should follow these principles:

1. **Standalone components** — No NgModules for new code. Use `imports` array in `@Component`.
2. **Separate HTML and SCSS files** — Always use `templateUrl` and `styleUrl` with SCSS. Never use inline `template` or `styles`.
3. **Signals for state** — Use `signal()`, `computed()`, `linkedSignal()` for reactive state.
4. **`inject()` function** — Prefer `inject()` over constructor parameter injection.
5. **OnPush change detection** — Use `ChangeDetectionStrategy.OnPush` on all components.
6. **Control flow syntax** — Use `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`, `*ngSwitch`.
7. **`resource()` / `httpResource()`** — For async data fetching instead of manual subscriptions.
8. **Feature-based structure** — Organize by feature, not by type (no `components/`, `services/` dirs).

## Quick Reference — Modern APIs

### Signals

```typescript
import { signal, computed, effect } from '@angular/core';

// Writable signal
const count = signal(0);
count.set(5);
count.update(c => c + 1);

// Computed (read-only, auto-tracks dependencies)
const doubled = computed(() => count() * 2);

// Effect (side effects on signal changes)
effect(() => console.log(`Count: ${count()}`));
```

### linkedSignal (dependent state)

```typescript
import { linkedSignal } from '@angular/core';

// Resets when source signal changes
const options = signal(['A', 'B', 'C']);
const selected = linkedSignal(() => options()[0]);

// With previous value preservation
const selected = linkedSignal<string[], string>({
  source: options,
  computation: (newOpts, previous) =>
    newOpts.find(o => o === previous?.value) ?? newOpts[0],
});
```

### Resource API (async data)

```typescript
import { resource } from '@angular/core';

const userId = signal('123');
const userResource = resource({
  params: () => ({ id: userId() }),
  loader: ({ params, abortSignal }) => fetch(`/api/users/${params.id}`, { signal: abortSignal }),
});

// Status: userResource.value(), userResource.isLoading(), userResource.error(), userResource.status()
```

### httpResource (HTTP + signals)

```typescript
import { httpResource } from '@angular/common/http';

const user = httpResource<User>(() => `/api/users/${this.userId()}`);
// Uses HttpClient internally (interceptors work), returns signal-based resource
```

### Inject function

```typescript
import { inject } from '@angular/core';

@Component({ /* ... */ })
export class MyComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
}
```

### Component pattern (modern)

Each component consists of 3 separate files: `.ts`, `.html`, and `.scss`.

```typescript
// user-profile.component.ts
@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, RouterLink],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserProfileComponent {
  private readonly userService = inject(UserService);
  readonly userId = input.required<string>();
  readonly userSaved = output<User>();
  readonly userName = model<string>();

  protected readonly userResource = httpResource<User>(
    () => `/api/users/${this.userId()}`
  );

  protected save() {
    this.userSaved.emit(this.userResource.value()!);
  }
}
```

```html
<!-- user-profile.component.html -->
@if (userResource.isLoading()) {
  <div class="spinner">Loading...</div>
} @else if (userResource.hasValue()) {
  <h1>{{ userResource.value().name }}</h1>
  <p>{{ userResource.value().email }}</p>
} @else if (userResource.error()) {
  <div class="error">Failed to load user</div>
}
```

```scss
// user-profile.component.scss
:host {
  display: block;
}

.spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.error {
  color: var(--color-error, #d32f2f);
}
```

### Template Control Flow

```html
<!-- Conditional -->
@if (condition) {
  <p>True</p>
} @else if (other) {
  <p>Other</p>
} @else {
  <p>False</p>
}

<!-- Loop with tracking -->
@for (item of items(); track item.id) {
  <app-item [data]="item" />
} @empty {
  <p>No items found</p>
}

<!-- Switch -->
@switch (status()) {
  @case ('loading') { <spinner /> }
  @case ('error') { <error-msg /> }
  @default { <content /> }
}

<!-- Deferred loading -->
@defer (on viewport) {
  <heavy-component />
} @placeholder {
  <p>Scroll to load...</p>
} @loading (minimum 300ms) {
  <spinner />
}

<!-- Local variables -->
@let fullName = firstName() + ' ' + lastName();
<p>{{ fullName }}</p>
```

## Style Guide Summary

- **Separate files per component**: Always use `templateUrl` (.html) + `styleUrl` (.scss). Never inline `template` or `styles`.
- **Use SCSS**: All component styles use `.scss` extension, never `.css`.
- **File naming**: Use hyphen-case (`user-profile.component.ts`, `user-profile.component.html`, `user-profile.component.scss`)
- **Selector prefix**: Use app-specific prefix (e.g., `app-`, `yt-`). Never use `ng-`.
- **One concept per file**: One component/service/directive per file
- **Feature-based dirs**: Group by feature, not by type
- **`protected` for template-only members**: Use `protected` on members only used by the template
- **`readonly` for Angular properties**: Mark `input()`, `output()`, `model()`, queries as `readonly`
- **Prefer `class`/`style` over `ngClass`/`ngStyle`**: Better performance, simpler syntax
- **Name handlers by action**: `saveUser()` not `handleClick()`
- **Keep lifecycle hooks simple**: Delegate to well-named methods
- **Implement lifecycle interfaces**: `implements OnInit`, `implements OnDestroy`

## Anti-Patterns to Avoid

| ❌ Avoid | ✅ Prefer |
|----------|-----------|
| Inline `template:` in component | `templateUrl: './name.component.html'` |
| Inline `styles:` in component | `styleUrl: './name.component.scss'` |
| `.css` for component styles | `.scss` (SCSS) |
| `NgModule` for new code | Standalone components with `imports` |
| `constructor(private svc: MyService)` | `private readonly svc = inject(MyService)` |
| `*ngIf`, `*ngFor`, `*ngSwitch` | `@if`, `@for`, `@switch` |
| `ngClass`, `ngStyle` | `[class.x]="cond"`, `[style.x]="val"` |
| Manual `subscribe()` for HTTP | `httpResource()` or `resource()` |
| `zone.js` dependency | Zoneless (default in v21+) |
| `@Input()` decorator | `input()` / `input.required()` signal function |
| `@Output()` decorator | `output()` signal function |
| `BehaviorSubject` for simple state | `signal()` |
| `combineLatest` for derived state | `computed()` |
| Type-by-type folders (`components/`, `services/`) | Feature-based folders |
| `handleClick()` event handler names | `saveData()` action-based names |

## Zoneless (Angular v21+ Default)

Angular v21+ is zoneless by default. Key points:

- Remove `zone.js` from `polyfills` in `angular.json`
- Run `npm uninstall zone.js`
- All state changes must use signals, `AsyncPipe`, or `ChangeDetectorRef.markForCheck()`
- Use `OnPush` strategy on all components
- Replace `NgZone.onMicrotaskEmpty`/`onStable` with `afterNextRender`/`afterEveryRender`
- In SSR, use `PendingTasks` service for async operations
- In tests, use `await fixture.whenStable()` instead of `fixture.detectChanges()` when possible

## Reference Index

Read the relevant reference file when you need **detailed documentation** on a specific topic. Each file contains the complete official Angular documentation for that domain.

| Reference File | When to Read | Topics |
|---|---|---|
| [00-style-guide.md](references/00-style-guide.md) | Code review, project setup, naming conventions | Naming, structure, DI style, component patterns |
| [01-components.md](references/01-components.md) | Creating/modifying components | Selectors, styling, inputs, outputs, content projection, lifecycle |
| [02-templates.md](references/02-templates.md) | Template syntax questions | Events, binding, control flow, @defer, @let, expressions |
| [03-directives.md](references/03-directives.md) | Creating custom directives | Attribute directives, structural directives, composition API |
| [04-image-optimization.md](references/04-image-optimization.md) | Image performance, NgOptimizedImage | ngSrc, loaders, LCP optimization, preconnect |
| [05-signals.md](references/05-signals.md) | State management with signals | signal, computed, linkedSignal, equality |
| [06-resources.md](references/06-resources.md) | Async data fetching | resource(), httpResource, loaders, status, SSR caching |
| [07-dependency-injection.md](references/07-dependency-injection.md) | DI configuration, providers | Services, lazy loading, injection context, hierarchical injectors |
| [08-rxjs-interop.md](references/08-rxjs-interop.md) | RxJS ↔ Signals interop | toSignal, toObservable, outputToObservable |
| [09-http.md](references/09-http.md) | HTTP requests | HttpClient setup, requests, interceptors, testing |
| [10-forms.md](references/10-forms.md) | Form implementation | Reactive, template-driven, typed, validation, dynamic, signal forms |
| [11-routing.md](references/11-routing.md) | Navigation, routes | Define routes, outlets, navigation, route state, lazy loading |
| [12-ssr-hydration.md](references/12-ssr-hydration.md) | Server rendering | SSR, hydration, incremental hydration, rendering strategies |
| [13-testing.md](references/13-testing.md) | Writing tests | Unit testing, component testing, services, harnesses, coverage |
| [14-animations.md](references/14-animations.md) | Animations | CSS native animations, route transitions, migration from package |
| [15-zoneless-updates.md](references/15-zoneless-updates.md) | Zoneless migration, updates | Zoneless setup, compatibility, PendingTasks, update guide |
| [16-security-i18n.md](references/16-security-i18n.md) | Security, internationalization | XSRF/XSSI, CSP, i18n setup |

## Project Setup

```bash
# Install Angular CLI
npm install -g @angular/cli

# Create new project
ng new my-app

# Run development server
npm start   # or: ng serve

# Generate components/services
ng generate component features/user-profile
ng generate service core/services/user

# Run tests
ng test
ng test --code-coverage

# Build for production
ng build
```

## Key File Structure

```
src/
├── main.ts                    # Bootstrap entry point
├── app/
│   ├── app.component.ts       # Root component
│   ├── app.routes.ts          # Route definitions
│   ├── app.config.ts          # Application config (providers)
│   └── features/
│       ├── user-profile/
│       │   ├── user-profile.component.ts
│       │   ├── user-profile.component.html
│       │   ├── user-profile.component.scss
│       │   └── user-profile.component.spec.ts
│       └── dashboard/
│           ├── dashboard.component.ts
│           ├── dashboard.component.html
│           ├── dashboard.component.scss
│           └── widgets/
│               ├── stats-widget.component.ts
│               ├── stats-widget.component.html
│               └── stats-widget.component.scss
├── core/
│   └── services/
│       ├── auth.service.ts
│       └── api.service.ts
└── shared/
    ├── components/
    └── pipes/
```
