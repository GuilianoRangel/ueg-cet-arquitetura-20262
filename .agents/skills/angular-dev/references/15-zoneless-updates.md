# Angular without ZoneJS (Zoneless)

## Why use Zoneless?

The main advantages to removing ZoneJS as a dependency are:

- **Improved performance**: ZoneJS uses DOM events and async tasks as indicators of when application state _might_ have updated and subsequently triggers application synchronization to run change detection on the application's views. ZoneJS does not have any insight into whether application state actually changed and so this synchronization is triggered more frequently than necessary.
- **Improved Core Web Vitals**: ZoneJS brings a fair amount of overhead, both in payload size and in startup time cost.
- **Improved debugging experience**: ZoneJS makes debugging code more difficult. Stack traces are harder to understand with ZoneJS. It's also difficult to understand when code breaks as a result of being outside the Angular Zone.
- **Better ecosystem compatibility**: ZoneJS works by patching browser APIs but does not automatically have patches for every new browser API. Some APIs cannot be patched effectively, such as `async`/`await`, and have to be downleveled to work with ZoneJS. Sometimes libraries in the ecosystem are also incompatible with the way ZoneJS patches the native APIs. Removing ZoneJS as a dependency ensures better long-term compatibility by removing a source of complexity, monkey patching, and ongoing maintenance.

## Enabling Zoneless in an application

Zoneless is the default in Angular v21+ so you do not need to do anything to enable it. You should verify that `provideZoneChangeDetection` is not used anywhere to override the default configuration.

If you are using Angular v20, enable zoneless change detection by adding `provideZonelessChangeDetection()` at bootstrap:

```ts
bootstrapApplication(MyApp, {providers: [provideZonelessChangeDetection()]});
```

```ts
platformBrowser().bootstrapModule(AppModule);

@NgModule({
  providers: [provideZonelessChangeDetection()],
})
export class AppModule {}
```

## Removing ZoneJS

Zoneless applications should remove ZoneJS entirely from the build to reduce bundle size. ZoneJS is typically
loaded via the `polyfills` option in `angular.json`, both in the `build` and `test` targets. Remove `zone.js`
and `zone.js/testing` from both to remove it from the build. Projects which use an explicit `polyfills.ts` file
should remove `import 'zone.js';` and `import 'zone.js/testing';` from the file.

After removing ZoneJS from the build, there is no longer a need for a `zone.js` dependency either and the
package can be removed entirely:

```shell
npm uninstall zone.js
```

## Requirements for Zoneless compatibility

Angular relies on notifications from core APIs in order to determine when to run change detection and on which views.
These notifications include:

- `ChangeDetectorRef.markForCheck` (called automatically by `AsyncPipe`)
- `ComponentRef.setInput`
- Updating a signal that's read in a template
- Bound host or template listeners callbacks
- Attaching a view that was marked dirty by one of the above

### `OnPush`-compatible components

One way to ensure that a component is using the correct notification mechanisms from above is to
use [ChangeDetectionStrategy.OnPush](/best-practices/skipping-subtrees#using-onpush).

The `OnPush` change detection strategy is not required, but it is a recommended step towards zoneless compatibility for application components. It is not always possible for library components to use `ChangeDetectionStrategy.OnPush`.
When a library component is a host for user-components which might use `ChangeDetectionStrategy.Eager`/`Default`, it cannot use `OnPush` because that would prevent the child component from being refreshed if it is not `OnPush` compatible and relies on ZoneJS to trigger change detection. Components can use the `Default` strategy as long as they notify Angular when change detection needs to run (calling `markForCheck`, using signals, `AsyncPipe`, etc.).
Being a host for a user component means using an API such as `ViewContainerRef.createComponent` and not just hosting a portion of a template from a user component (i.e. content projection or using a template ref input).

### Remove `NgZone.onMicrotaskEmpty`, `NgZone.onUnstable`, `NgZone.isStable`, or `NgZone.onStable`

Applications and libraries need to remove uses of `NgZone.onMicrotaskEmpty`, `NgZone.onUnstable` and `NgZone.onStable`.
These observables will never emit when an Application enables zoneless change detection.
Similarly, `NgZone.isStable` will always be `true` and should not be used as a condition for code execution.

The `NgZone.onMicrotaskEmpty` and `NgZone.onStable` observables are most often used to wait for Angular to
complete change detection before performing a task. Instead, these can be replaced by `afterNextRender`
if they need to wait for a single change detection or `afterEveryRender` if there is some condition that might span
several change detection rounds. In other cases, these observables were used because they happened to be
familiar and have similar timing to what was needed. More straightforward or direct DOM APIs can be used instead,
such as `MutationObserver` when code needs to wait for certain DOM state (rather than waiting for it indirectly
through Angular's render hooks).
`NgZone.run` and `NgZone.runOutsideAngular` do not need to be removed in order for code to be compatible with
Zoneless applications. In fact, removing these calls can lead to performance regressions for libraries that
are used in applications that still rely on ZoneJS.
### `PendingTasks` for Server Side Rendering (SSR)

If you are using SSR with Angular, you may know that it relies on ZoneJS to help determine when the application
is "stable" and can be serialized. If there are asynchronous tasks that should prevent serialization, an application
not using ZoneJS must make Angular aware of these with the [PendingTasks](/api/core/PendingTasks) service. Serialization
will wait for the first moment that all pending tasks have been removed.

The two most straightforward uses of pending tasks are the `run` method:

```typescript
const taskService = inject(PendingTasks);
taskService.run(async () => {
  const someResult = await doSomeWorkThatNeedsToBeRendered();
  this.someState.set(someResult);
});
```

For more complicated use-cases, you can manually add and remove a pending task:

```typescript
const taskService = inject(PendingTasks);
const taskCleanup = taskService.add();
try {
  await doSomeWorkThatNeedsToBeRendered();
} catch {
  // handle error
} finally {
  taskCleanup();
}
```

In addition, the [pendingUntilEvent](/api/core/rxjs-interop/pendingUntilEvent#) helper in `rxjs-interop` ensures
the application remains unstable until the observable emits, completes, errors, or is unsubscribed.

```typescript
readonly myObservableState = someObservable.pipe(pendingUntilEvent());
```

The framework uses this service internally as well to prevent serialization until asynchronous tasks are complete. These include, but are not limited to,
an ongoing Router navigation and an incomplete `HttpClient` request.

### Reactive forms in zoneless applications

Reactive forms model updates (`setValue`, `patchValue`, `FormArray.push`, and similar APIs) update form state and emit forms observables, but they do not automatically schedule component change detection.

If a template depends on reactive forms state, connect forms observables to a change-detection notification (for example `ChangeDetectorRef.markForCheck()`), or reflect the data through signals consumed by the template.

## Testing and Debugging

### Using Zoneless in `TestBed`

`TestBed` uses Zone-based change detection by default when `zone.js` is loaded via the `polyfills`.

If `zone.js` is not present, `TestBed` runs zoneless by default. To force zoneless mode when `zone.js` is loaded, add `provideZonelessChangeDetection()`:

```typescript
TestBed.configureTestingModule({
  // Optional: include the provider to force the testing environment
  // uses the same zoneless behavior as a zoneless application.
  providers: [provideZonelessChangeDetection()],
});

const fixture = TestBed.createComponent(MyComponent);
await fixture.whenStable();
```

To ensure tests have the most similar behavior to production code,
avoid using `fixture.detectChanges()` when possible. This forces
change detection to run when Angular might otherwise have not
scheduled change detection. Tests should ensure these notifications
are happening and allow Angular to handle when to synchronize
state rather than manually forcing it to happen in the test.

For existing test suites, using `fixture.detectChanges()` is a common pattern
and it is likely not worth the effort of converting these to
`await fixture.whenStable()`. `TestBed` will still enforce that the
fixture's component is `OnPush` compatible and throws `ExpressionChangedAfterItHasBeenCheckedError`
if it finds that template values were updated without a
change notification (i.e. `fixture.componentInstance.someValue = 'newValue';`).
If the component is used in production, this issue should be addressed by updating
the component to use signals for state or call `ChangeDetectorRef.markForCheck()`.
If the component is only used as a test wrapper and never used in an application,
it is acceptable to use `fixture.changeDetectorRef.markForCheck()`.

### Debug-mode check to ensure updates are detected

Angular also provides an additional tool to help verify that an application is making
updates to state in a zoneless-compatible way. `provideCheckNoChangesConfig({exhaustive: true, interval: <milliseconds>})`
can be used to periodically check to ensure that no bindings have been updated
without a notification. Angular throws `ExpressionChangedAfterItHasBeenCheckedError`
if there is an updated binding that would not have refreshed by the zoneless change
detection.
As an open source project, Angular’s daily commits, PRs and momentum is all trackable on GitHub. To increase transparency into how this daily work connects to the framework’s future, our roadmap brings together the team’s current and future planned vision.

The following projects are not associated with a particular Angular version. We will release them on completion, and they will be part of a specific version based on our release schedule, following semantic versioning. For example, we release features in the next minor after completion or the next major if they include breaking changes.

Currently, Angular has three goals for the framework:

1. Improve the [AI experience for developers](/ai)
1. Improve the [Angular developer experience](#improving-the-angular-developer-experience)
1. Improve the framework’s performance

Continue reading to learn how we plan to deliver these objectives with specific project work.

## Explore modern Angular

Start developing with the latest Angular features from our roadmap. This list represents the current status of new features from our roadmap:

### Available to experiment with

- [Signal Forms](/guide/forms/signals/overview)
- [Resource API](/guide/signals/resource)
- [httpResource](/api/common/http/httpResource)

### Production ready

- [Zoneless change detection](/guide/zoneless)
- [Linked Signal API](/guide/signals/linked-signal)
- [Incremental hydration](/guide/incremental-hydration)
- [Effect API](/api/core/effect)
- [Event replay with SSR](/api/platform-browser/withEventReplay)
- [Route-level render mode](/guide/ssr)

## Improving the AI experience for Angular Developers

### Bringing the best of AI to Angular
## Improving the Angular developer experience

### Developer velocity
### Improve tooling
## Completed projects
# Keeping your Angular projects up-to-date

Just like Web and the entire web ecosystem, Angular is continuously improving.
Angular balances continuous improvement with a strong focus on stability and making updates straightforward.
Keeping your Angular application up-to-date enables you to take advantage of leading-edge new features, as well as optimizations and bug fixes.

This document contains information and resources to help you keep your Angular applications and libraries up-to-date.

For information about our versioning policy and practices — including support and deprecation practices, as well as the release schedule — see [Angular versioning and releases](reference/releases 'Angular versioning and releases').

HELPFUL: If you are currently using AngularJS, see [Upgrading from AngularJS](https://angular.io/guide/upgrade 'Upgrading from AngularJS').
_AngularJS_ is the name for all v1.x versions of Angular.

## Getting notified of new releases

To be notified when new releases are available, follow [@angular](https://x.com/angular '@angular on X') on X (formerly Twitter) or subscribe to the [Angular blog](https://blog.angular.dev 'Angular blog').

## Learning about new features

What's new? What's changed? We share the most important things you need to know on the Angular blog in [release announcements](https://blog.angular.dev/ 'Angular blog - release announcements').

To review a complete list of changes, organized by version, see the [Angular change log](https://github.com/angular/angular/blob/main/CHANGELOG.md 'Angular change log').

## Checking your version of Angular

To check your application's version of Angular use the `ng version` command from within your project directory.

## Finding the current version of Angular

The most recent stable released version of Angular appears [on npm](https://www.npmjs.com/package/@angular/core 'Angular on npm') under "Version." For example, `16.2.4`.

You can also find the most current version of Angular by using the CLI command [`ng update`](cli/update).
By default, [`ng update`](cli/update) (without additional arguments) lists the updates that are available to you.

## Updating your environment and apps

To make updating uncomplicated, we provide complete instructions in the interactive [Angular Update Guide](update-guide).

The Angular Update Guide provides customized update instructions, based on the current and target versions that you specify.
It includes basic and advanced update paths, to match the complexity of your applications.
It also includes troubleshooting information and any recommended manual changes to help you get the most out of the new release.

For simple updates, the CLI command [`ng update`](cli/update) is all you need.
Without additional arguments, [`ng update`](cli/update) lists the updates that are available to you and provides recommended steps to update your application to the most current version.

[Angular Versioning and Releases](reference/releases#angular-versioning 'Angular Release Practices, Versioning') describes the level of change that you can expect based on a release's version number.
It also describes supported update paths.

## Resource summary

- Release announcements:
  [Angular blog - release announcements](https://blog.angular.dev/ 'Angular blog announcements about recent releases')

- Release details:
  [Angular change log](https://github.com/angular/angular/blob/main/CHANGELOG.md 'Angular change log')

- Update instructions:
  [Angular Update Guide](update-guide)

- Update command reference:
  [Angular CLI `ng update` command reference](cli/update)

- Versioning, release, support, and deprecation practices:
  [Angular versioning and releases](reference/releases 'Angular versioning and releases')
