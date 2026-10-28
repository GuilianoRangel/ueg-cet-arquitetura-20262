# Animating your applications with `animate.enter` and `animate.leave`

## Table of Contents

- **[Animating your applications with `animate.enter` and `animate.leave`](#animating-your-applications-with-animateenter-and-animateleave)**
  - [`animate.enter`](#animateenter)
  - [`animate.leave`](#animateleave)
  - [Event Bindings, Functions, and Third-party Libraries](#event-bindings-functions-and-third-party-libraries)
  - [Compatibility with Legacy Angular Animations](#compatibility-with-legacy-angular-animations)
  - [Testing](#testing)
  - [More on Angular animations](#more-on-angular-animations)
- **[Animating your Application with CSS](#animating-your-application-with-css)**
  - [How to write animations in native CSS](#how-to-write-animations-in-native-css)
  - [Creating Reusable Animations](#creating-reusable-animations)
  - [Animating a Transition](#animating-a-transition)
  - [Transition and Triggers](#transition-and-triggers)
  - [Complex Sequences](#complex-sequences)
  - [Programmatic control of animations](#programmatic-control-of-animations)
  - [More on Angular animations](#more-on-angular-animations)
- **[Route transition animations](#route-transition-animations)**
  - [How View Transitions work](#how-view-transitions-work)
  - [How the Router uses view transitions](#how-the-router-uses-view-transitions)
  - [Enabling View Transitions in the Router](#enabling-view-transitions-in-the-router)
  - [Customizing transitions with CSS](#customizing-transitions-with-css)
  - [Advanced transition control with onViewTransitionCreated](#advanced-transition-control-with-onviewtransitioncreated)
  - [Examples from the Chrome explainer adapted to Angular](#examples-from-the-chrome-explainer-adapted-to-angular)
- **[Migrating away from Angular's Animations package](#migrating-away-from-angulars-animations-package)**
  - [How to write animations in native CSS](#how-to-write-animations-in-native-css)
  - [Creating Reusable Animations](#creating-reusable-animations)
  - [Animating a Transition](#animating-a-transition)
  - [Transition and Triggers](#transition-and-triggers)
  - [Complex Sequences](#complex-sequences)
  - [Migrating usages of AnimationPlayer](#migrating-usages-of-animationplayer)
  - [Route Transitions](#route-transitions)

---


Well-designed animations can make your application more intuitive and engaging, but they aren't just cosmetic.
Animations can improve your application and the user experience in a number of ways:

- Without animations, web page transitions can seem abrupt and jarring
- Motion greatly enhances the user experience, so animations give users a chance to detect the application's response to their actions
- Good animations can smoothly direct the user's attention throughout a workflow

Angular provides `animate.enter` and `animate.leave` to animate your application's elements. These two features apply enter and leave CSS classes at the appropriate times or call functions to apply animations from third party libraries. `animate.enter` and `animate.leave` are not directives. They are special API supported directly by the Angular compiler. They can be used directly on elements and also as a host binding.

## `animate.enter`

You can use `animate.enter` to animate elements as they _enter_ the DOM. You can define enter animations using CSS classes with either transitions or keyframe animations.

<docs-code header="enter.ts" path="adev/src/content/examples/animations/src/app/enter-and-leave/enter.ts" />
    <docs-code header="enter.html" path="adev/src/content/examples/animations/src/app/enter-and-leave/enter.html" />
    <docs-code header="enter.css" path="adev/src/content/examples/animations/src/app/enter-and-leave/enter.css"/>
When the animation completes, Angular removes the class or classes that you specified in `animate.enter` from the DOM. Animation classes are only present while the animation is active.

NOTE: When using multiple keyframe animations or transition properties on an element, Angular removes all classes only _after_ the longest animation has completed.

You can use `animate.enter` with any other Angular features, such as control flow or dynamic expressions. `animate.enter` accepts both a single class string (with multiple classes separated by spaces), or an array of class strings.

A quick note about using CSS transitions: If you choose to use transitions instead of keyframe animations, the classes added to the element with `animate.enter` represent the state that the transition will animate _to_. Your base element CSS is what the element will look like when no animations run, which is likely similar to the end state of the CSS transition. So you would still need to pair it with `@starting-style` to have an appropriate _from_ state for your transition to work.

<docs-code header="enter-binding.ts" path="adev/src/content/examples/animations/src/app/enter-and-leave/enter-binding.ts" />
    <docs-code header="enter-binding.html" path="adev/src/content/examples/animations/src/app/enter-and-leave/enter-binding.html" />
    <docs-code header="enter-binding.css" path="adev/src/content/examples/animations/src/app/enter-and-leave/enter-binding.css"/>
## `animate.leave`

You can use `animate.leave` to animate elements as they _leave_ the DOM. You can define leave animations using CSS classes with either transforms or keyframe animations.

<docs-code header="leave.ts" path="adev/src/content/examples/animations/src/app/enter-and-leave/leave.ts" />
    <docs-code header="leave.html" path="adev/src/content/examples/animations/src/app/enter-and-leave/leave.html" />
    <docs-code header="leave.css" path="adev/src/content/examples/animations/src/app/enter-and-leave/leave.css"/>
When the animation completes, Angular automatically removes the animated element from the DOM.

NOTE: When using multiple keyframe animations or transition properties on an element, Angular waits to remove the element only _after_ the longest of those animations has completed.

`animate.leave` can also be used with signals, and other bindings. You can use `animate.leave` with a single class or multiple classes. Either specify it as a simple string with spaces or a string array.

<docs-code header="leave-binding.ts" path="adev/src/content/examples/animations/src/app/enter-and-leave/leave-binding.ts" />
    <docs-code header="leave-binding.html" path="adev/src/content/examples/animations/src/app/enter-and-leave/leave-binding.html" />
    <docs-code header="leave-binding.css" path="adev/src/content/examples/animations/src/app/enter-and-leave/leave-binding.css"/>
### Element removal order

There is some nuance to how `animate.leave` animations are run and when an animation will occur. `animate.leave` works if it is placed on the element that is being removed, and if `animate.leave` is placed on an element that is a _descendent_ of the element being removed, those child animations will happen _before_ the parent node is removed from the DOM. This ensures that you can confidently animate away child elements without the parent node disappearing prematurely.

<docs-code header="leave.ts" path="adev/src/content/examples/animations/src/app/enter-and-leave/leave-parent.ts" />
    <docs-code header="leave.html" path="adev/src/content/examples/animations/src/app/enter-and-leave/leave-parent.html" />
    <docs-code header="leave.css" path="adev/src/content/examples/animations/src/app/enter-and-leave/leave-parent.css"/>
## Event Bindings, Functions, and Third-party Libraries

Both `animate.enter` and `animate.leave` support event binding syntax that allows for function calls. You can use this syntax to call a function in your component code or utilize third-party animation libraries, like [GSAP](https://gsap.com/), [anime.js](https://animejs.com/), or any other JavaScript animation library.

<docs-code header="leave-event.ts" path="adev/src/content/examples/animations/src/app/enter-and-leave/leave-event.ts" />
    <docs-code header="leave-event.html" path="adev/src/content/examples/animations/src/app/enter-and-leave/leave-event.html" />
    <docs-code header="leave-event.css" path="adev/src/content/examples/animations/src/app/enter-and-leave/leave-event.css"/>
The `$event` object has the type `AnimationCallbackEvent`. It includes the element as the `target` and provides an `animationComplete()` function to notify the framework when the animation finishes.

IMPORTANT: You **must** call the `animationComplete()` function when using `animate.leave` for Angular to remove the element.

If you don't call `animationComplete()` when using `animate.leave`, Angular calls the function automatically after a four-second delay. You can configure the duration of the delay by providing the token `MAX_ANIMATION_TIMEOUT` in milliseconds.

```typescript
{ provide: MAX_ANIMATION_TIMEOUT, useValue: 6000 }
```

## Compatibility with Legacy Angular Animations

You cannot use legacy animations alongside `animate.enter` and `animate.leave` within the same component. Doing so would result in enter classes remaining on the element or leaving nodes not being removed. It is otherwise fine to use both legacy animations and the new `animate.enter` and `animate.leave` animations within the same _application_. The only caveat is content projection. If you are projecting content from one component with legacy animations into another component with `animate.enter` or `animate.leave`, or vice versa, this will result in the same behavior as if they are used together in the same component. This is not supported.

## Testing

TestBed provides built-in support for enabling or disabling animations in your test environment. CSS animations require a browser to run, and many of the APIs are not available in a test environment. By default, TestBed disables animations for you in your test environments.

If you want to test that the animations are animating in a browser test, for example an end-to-end test, you can configure TestBed to enable animations by specifying `animationsEnabled: true` in your test configuration.

```typescript
TestBed.configureTestingModule({animationsEnabled: true});
```

This will configure animations in your test environment to behave normally.

NOTE: Some test environments do not emit animation events like `animationstart`, `animationend` and their transition event equivalents.

## More on Angular animations

You might also be interested in the following:
# Animating your Application with CSS

CSS offers a robust set of tools for you to create beautiful and engaging animations within your application.

## How to write animations in native CSS

If you've never written any native CSS animations, there are a number of excellent guides to get you started. Here are a few of them:
[MDN's CSS Animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations/Using_CSS_animations)
[W3Schools CSS3 Animations guide](https://www.w3schools.com/css/css3_animations.asp)
[The Complete CSS Animations Tutorial](https://www.lambdatest.com/blog/css-animations-tutorial/)
[CSS Animation for Beginners](https://thoughtbot.com/blog/css-animation-for-beginners)

and a couple of videos:
[Learn CSS Animation in 9 Minutes](https://www.youtube.com/watch?v=z2LQYsZhsFw)
[Net Ninja CSS Animation Tutorial Playlist](https://www.youtube.com/watch?v=jgw82b5Y2MU&list=PL4cUxeGkcC9iGYgmEd2dm3zAKzyCGDtM5)

Check out some of these guides and tutorials, then come back to this guide.

## Creating Reusable Animations

You can create reusable animations that can be shared across your application using `@keyframes`. Define keyframe animations in a shared CSS file, and you'll be able to re-use those keyframe animations wherever you want within your application.

<docs-code header="animations.css" path="adev/src/content/examples/animations/src/app/animations.css" region="animation-shared"/>

Adding the class `animated-class` to an element would trigger the animation on that element.

## Animating a Transition

### Animating State and Styles

You may want to animate between two different states, for example when an element is opened or closed. You can accomplish this by using CSS classes, either with a keyframe animation or transition styling.

<docs-code header="animations.css" path="adev/src/content/examples/animations/src/app/animations.css" region="animation-states"/>

Triggering the `open` or `closed` state is done by toggling classes on the element in your component. You can find examples of how to do this in our [template guide](guide/templates/binding#css-class-and-style-property-bindings).

You can see similar examples in the template guide for [animating styles directly](guide/templates/binding#css-style-properties).

### Transitions, Timing, and Easing

Animating often requires adjusting timing, delays, and easing behaviors. This can be done using several css properties or shorthand properties.

Specify `animation-duration`, `animation-delay`, and `animation-timing-function` for a keyframe animation in CSS, or alternatively use the `animation` shorthand property.

<docs-code header="animations.css" path="adev/src/content/examples/animations/src/app/animations.css" region="animation-timing"/>

Similarly, you can use `transition-duration`, `transition-delay`, and `transition-timing-function` and the `transition` shorthand for animations that are not using `@keyframes`.

<docs-code header="animations.css" path="adev/src/content/examples/animations/src/app/animations.css" region="transition-timing"/>

### Triggering an Animation

Animations can be triggered by toggling CSS styles or classes. Once a class is present on an element, the animation will occur. Removing the class will revert the element back to whatever CSS is defined for that element. Here's an example:

<docs-code header="open-close.ts" path="adev/src/content/examples/animations/src/app/native-css/open-close.ts" />
    <docs-code header="open-close.html" path="adev/src/content/examples/animations/src/app/native-css/open-close.html" />
    <docs-code header="open-close.css" path="adev/src/content/examples/animations/src/app/native-css/open-close.css"/>
## Transition and Triggers

### Animating Auto Height

You can use CSS Grid to animate to auto height.

<docs-code header="auto-height.ts" path="adev/src/content/examples/animations/src/app/native-css/auto-height.ts" />
    <docs-code header="auto-height.html" path="adev/src/content/examples/animations/src/app/native-css/auto-height.html" />
    <docs-code header="auto-height.css" path="adev/src/content/examples/animations/src/app/native-css/auto-height.css"  />
If you don't have to worry about supporting all browsers, you can also check out `calc-size()`, which is the true solution to animating auto height. See [MDN's docs](https://developer.mozilla.org/en-US/docs/Web/CSS/calc-size) and [this tutorial](https://frontendmasters.com/blog/one-of-the-boss-battles-of-css-is-almost-won-transitioning-to-auto/) for more information.

### Animate entering and leaving a view

You can create animations for when an item enters a view or leaves a view. Let's start by looking at how to animate an element entering a view. We'll do this with `animate.enter`, which will apply animation classes when an element enters the view.

<docs-code header="insert.ts" path="adev/src/content/examples/animations/src/app/native-css/insert.ts" />
    <docs-code header="insert.html" path="adev/src/content/examples/animations/src/app/native-css/insert.html" />
    <docs-code header="insert.css" path="adev/src/content/examples/animations/src/app/native-css/insert.css"  />
Animating an element when it leaves the view is similar to animating when entering a view. Use `animate.leave` to specify which CSS classes to apply when the element leaves the view.

<docs-code header="remove.ts" path="adev/src/content/examples/animations/src/app/native-css/remove.ts" />
    <docs-code header="remove.html" path="adev/src/content/examples/animations/src/app/native-css/remove.html" />
    <docs-code header="remove.css" path="adev/src/content/examples/animations/src/app/native-css/remove.css"  />
For more information on `animate.enter` and `animate.leave`, see the [Enter and Leave animations guide](guide/animations).

### Animating increment and decrement

Animating on increment and decrement is a common pattern in applications. Here's an example of how you can accomplish that behavior.

<docs-code header="increment-decrement.ts" path="adev/src/content/examples/animations/src/app/native-css/increment-decrement.ts" />
    <docs-code header="increment-decrement.html" path="adev/src/content/examples/animations/src/app/native-css/increment-decrement.html" />
    <docs-code header="increment-decrement.css" path="adev/src/content/examples/animations/src/app/native-css/increment-decrement.css" />
### Disabling an animation or all animations

If you'd like to disable the animations that you've specified, you have multiple options.

1. Create a custom class that forces animation and transition to `none`.

```css
.no-animation {
  animation: none !important;
  transition: none !important;
}
```

Applying this class to an element prevents any animation from firing on that element. You could alternatively scope this to your entire DOM or section of your DOM to enforce this behavior. However, this prevents animation events from firing. If you are awaiting animation events for element removal, this solution won't work. A workaround is to set durations to 1 millisecond instead.

2. Use the [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) media query to ensure no animations play for users that prefer less animation.

3. Prevent adding animation classes programatically

### Animation Callbacks

If you have actions you would like to execute at certain points during animations, there are a number of available events you can listen to. Here's a few of them.

[`OnAnimationStart`](https://developer.mozilla.org/en-US/docs/Web/API/Element/animationstart_event)  
[`OnAnimationEnd`](https://developer.mozilla.org/en-US/docs/Web/API/Element/animationend_event)  
[`OnAnimationIteration`](https://developer.mozilla.org/en-US/docs/Web/API/Element/animationitration_event)  
[`OnAnimationCancel`](https://developer.mozilla.org/en-US/docs/Web/API/Element/animationcancel_event)

[`OnTransitionStart`](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitionstart_event)  
[`OnTransitionRun`](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitionrun_event)  
[`OnTransitionEnd`](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitionend_event)  
[`OnTransitionCancel`](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitioncancel_event)

The Web Animations API has a lot of additional functionality. [Take a look at the documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) to see all the available animation APIs.

NOTE: Be aware of bubbling issues with these callbacks. If you are animating children and parents, the events bubble up from children to parents. Consider stopping propagation or looking at more details within the event to determine if you're responding to the desired event target rather than an event bubbling up from a child node. You can examine the `animationname` property or the properties being transitioned to verify you have the right nodes.

## Complex Sequences

Animations are often more complicated than just a simple fade in or fade out. You may have lots of complicated sequences of animations you may want to run. Let's take a look at some of those possible scenarios.

### Staggering animations in a list

One common effect is to stagger the animations of each item in a list to create a cascade effect. This can be accomplished by utilizing `animation-delay` or `transition-delay`. Here is an example of what that CSS might look like.

<docs-code header="stagger.ts" path="adev/src/content/examples/animations/src/app/native-css/stagger.ts" />
    <docs-code header="stagger.html" path="adev/src/content/examples/animations/src/app/native-css/stagger.html" />
    <docs-code header="stagger.css" path="adev/src/content/examples/animations/src/app/native-css/stagger.css" />
### Parallel Animations

You can apply multiple animations to an element at once using the `animation` shorthand property. Each can have their own durations and delays. This allows you to compose animations together and create complicated effects.

```css
.target-element {
  animation:
    rotate 3s,
    fade-in 2s;
}
```

In this example, the `rotate` and `fade-in` animations fire at the same time, but have different durations.

### Animating the items of a reordering list

Items in a `@for` loop will be removed and re-added, which will fire off animations using `@starting-styles` for entry animations. Alternatively, you can use `animate.enter` for this same behavior. Use `animate.leave` to animate elements as they are removed, as seen in the example below.

<docs-code header="reorder.ts" path="adev/src/content/examples/animations/src/app/native-css/reorder.ts" />
    <docs-code header="reorder.html" path="adev/src/content/examples/animations/src/app/native-css/reorder.html" />
    <docs-code header="reorder.css" path="adev/src/content/examples/animations/src/app/native-css/reorder.css" />
## Programmatic control of animations

You can retrieve animations off an element directly using [`Element.getAnimations()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAnimations). This returns an array of every [`Animation`](https://developer.mozilla.org/en-US/docs/Web/API/Animation) on that element. You can use the `Animation` API to do much more than you could with what the `AnimationPlayer` from the animations package offered. From here you can `cancel()`, `play()`, `pause()`, `reverse()` and much more. This native API should provide everything you need to control your animations.

## More on Angular animations

You might also be interested in the following:
# Route transition animations

Route transition animations enhance user experience by providing smooth visual transitions when navigating between different views in your Angular application. [Angular Router](/guide/routing) includes built-in support for the browser's View Transitions API, enabling seamless animations between route changes in supported browsers.

HELPFUL: The Router's native View Transitions integration is currently in [developer preview](/reference/releases#developer-preview). Native View Transitions are a relatively new browser feature with limited support across all browsers.

## How View Transitions work

View transitions use the browser's native [`document.startViewTransition` API](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition) to create smooth animations between different states of your application. The API works by:

1. **Capturing the current state** - The browser takes a screenshot of the current page
2. **Executing the DOM update** - Your callback function runs to update the DOM
3. **Capturing the new state** - The browser captures the updated page state
4. **Playing the transition** - The browser animates between the old and new states

Here's the basic structure of the `startViewTransition` API:

```ts
document.startViewTransition(async () => {
  await updateTheDOMSomehow();
});
```

For more details about the browser API, see the [Chrome Explainer](https://developer.chrome.com/docs/web-platform/view-transitions).

## How the Router uses view transitions

Angular Router integrates view transitions into the navigation lifecycle to create seamless route changes. During navigation, the Router:

1. **Completes navigation preparation** - Route matching, [lazy loading](guide/routing/loading-strategies#lazily-loaded-components-and-routes), [guards](/guide/routing/route-guards), and [resolvers](/guide/routing/data-resolvers) execute
2. **Initiates the view transition** - Router calls `startViewTransition` when routes are ready for activation
3. **Updates the DOM** - Router activates new routes and deactivates old ones within the transition callback
4. **Finalizes the transition** - The transition Promise resolves when Angular completes rendering

The Router's view transition integration acts as a [progressive enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement). When browsers don't support the View Transitions API, the Router performs normal DOM updates without animation, ensuring your application works across all browsers.

## Enabling View Transitions in the Router

Enable view transitions by adding the `withViewTransitions` feature to your [router configuration](/guide/routing/define-routes#adding-the-router-to-your-application). Angular supports both standalone and NgModule bootstrap approaches:

### Standalone bootstrap

```ts
import {bootstrapApplication} from '@angular/platform-browser';
import {provideRouter, withViewTransitions} from '@angular/router';
import {routes} from './app.routes';

bootstrapApplication(MyApp, {
  providers: [provideRouter(routes, withViewTransitions())],
});
```

### NgModule bootstrap

```ts
import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';

@NgModule({
  imports: [RouterModule.forRoot(routes, {enableViewTransitions: true})],
})
export class AppRouting {}
```

[Try the "count" example on StackBlitz](https://stackblitz.com/edit/stackblitz-starters-2dnvtm?file=src%2Fmain.ts)

This example demonstrates how router navigation can replace direct `startViewTransition` calls for counter updates.

## Customizing transitions with CSS

You can customize view transitions using CSS to create unique animation effects. The browser creates separate transition elements that you can target with CSS selectors.

To create custom transitions:

1. **Add view-transition-name** - Assign unique names to elements you want to animate
2. **Define global animations** - Create CSS animations in your global styles
3. **Target transition pseudo-elements** - Use `::view-transition-old()` and `::view-transition-new()` selectors

Here's an example that adds a rotation effect to a counter element:

```css
/* Define keyframe animations */
@keyframes rotate-out {
  to {
    transform: rotate(90deg);
  }
}

@keyframes rotate-in {
  from {
    transform: rotate(-90deg);
  }
}

/* Target view transition pseudo-elements */
::view-transition-old(count),
::view-transition-new(count) {
  animation-duration: 200ms;
  animation-name: -ua-view-transition-fade-in, rotate-in;
}

::view-transition-old(count) {
  animation-name: -ua-view-transition-fade-out, rotate-out;
}
```

IMPORTANT: Define view transition animations in your global styles file, not in component styles. Angular's [view encapsulation](/guide/components/styling#style-scoping) scopes component styles, which prevents them from targeting the transition pseudo-elements correctly.

[Try the updated “count” example on StackBlitz](https://stackblitz.com/edit/stackblitz-starters-fwn4i7?file=src%2Fmain.ts)

## Advanced transition control with onViewTransitionCreated

The `withViewTransitions` feature accepts an options object with an `onViewTransitionCreated` callback for advanced control over view transitions. This callback:

- Runs in an [injection context](/guide/di/dependency-injection-context#run-within-an-injection-context)
- Receives a [`ViewTransitionInfo`](/api/router/ViewTransitionInfo) object containing:
  - The `ViewTransition` instance from `startViewTransition`
  - The [`ActivatedRouteSnapshot`](/api/router/ActivatedRouteSnapshot) for the route being navigated from
  - The [`ActivatedRouteSnapshot`](/api/router/ActivatedRouteSnapshot) for the route being navigated to

Use this callback to customize transition behavior based on navigation context. For example, you can skip transitions for specific navigation types:

```ts
import {inject} from '@angular/core';
import {Router, withViewTransitions, isActive} from '@angular/router';

withViewTransitions({
  onViewTransitionCreated: ({transition}) => {
    const router = inject(Router);
    const targetUrl = router.currentNavigation()!.finalUrl!;

    // Skip transition if only fragment or query params change
    const config = {
      paths: 'exact',
      matrixParams: 'exact',
      fragment: 'ignored',
      queryParams: 'ignored',
    };

    const isTargetRouteCurrent = isActive(targetUrl, router, config);

    if (isTargetRouteCurrent()) {
      transition.skipTransition();
    }
  },
});
```

This example skips the view transition when navigation only changes the [URL fragment or query parameters](/guide/routing/read-route-state#query-parameters) (such as anchor links within the same page). The `skipTransition()` method prevents the animation while still allowing the navigation to complete.

## Examples from the Chrome explainer adapted to Angular

The following examples demonstrate various view transition techniques adapted from the Chrome team's documentation for use with Angular Router:

### Transitioning elements don't need to be the same DOM element

Elements can transition smoothly between different DOM elements as long as they share the same `view-transition-name`.

- [Chrome Explainer](https://developer.chrome.com/docs/web-platform/view-transitions/same-document#transitioning_elements_dont_need_to_be_the_same_dom_element)
- [Angular Example on StackBlitz](https://stackblitz.com/edit/stackblitz-starters-dh8npr?file=src%2Fmain.ts)

### Custom entry and exit animations

Create unique animations for elements entering and leaving the viewport during route transitions.

- [Chrome Explainer](https://developer.chrome.com/docs/web-platform/view-transitions/same-document#custom_entry_and_exit_transitions)
- [Angular Example on StackBlitz](https://stackblitz.com/edit/stackblitz-starters-8kly3o)

### Async DOM updates and waiting for content

Angular Router prioritizes immediate transitions over waiting for additional content to load.

- [Chrome Explainer](https://developer.chrome.com/docs/web-platform/view-transitions/same-document#async_dom_updates_and_waiting_for_content)

NOTE: Angular Router does not provide a way to delay view transitions. This design choice prevents pages from becoming non-interactive while waiting for additional content. As the Chrome documentation notes: "During this time, the page is frozen, so delays here should be kept to a minimum…in some cases it's better to avoid the delay altogether, and use the content you already have."

### Handle multiple view transition styles with view transition types

Use view transition types to apply different animation styles based on navigation context.

- [Chrome Explainer](https://developer.chrome.com/docs/web-platform/view-transitions/same-document#view-transition-types)
- [Angular Example on StackBlitz](https://stackblitz.com/edit/stackblitz-starters-vxzcam)

### Handle multiple view transition styles with a class name on the view transition root (deprecated)

This approach uses CSS classes on the transition root element to control animation styles.

- [Chrome Explainer](https://developer.chrome.com/docs/web-platform/view-transitions/same-document#changing-on-navigation-type)
- [Angular Example on StackBlitz](https://stackblitz.com/edit/stackblitz-starters-nmnzzg?file=src%2Fmain.ts)

### Transitioning without freezing other animations

Maintain other page animations during view transitions to create more dynamic user experiences.

- [Chrome Explainer](https://developer.chrome.com/docs/web-platform/view-transitions/same-document#transitioning-without-freezing)
- [Angular Example on StackBlitz](https://stackblitz.com/edit/stackblitz-starters-76kgww)

### Animating with JavaScript

Control view transitions programmatically using JavaScript APIs for complex animation scenarios.

- [Chrome Explainer](https://developer.chrome.com/docs/web-platform/view-transitions/same-document#animating-with-javascript)
- [Angular Example on StackBlitz](https://stackblitz.com/edit/stackblitz-starters-cklnkm)
# Migrating away from Angular's Animations package

The `@angular/animations` package is deprecated as of v20.2, which also introduced the new `animate.enter` and `animate.leave` feature to add animations to your application. Using these new features, you can replace all animations based on `@angular/animations` with plain CSS or JS animation libraries. Removing `@angular/animations` from your application can significantly reduce the size of your JavaScript bundle. Native CSS animations generally offer superior performance, as they can benefit from hardware acceleration. This guide walks through the process of refactoring your code from `@angular/animations` to native CSS animations.

## How to write animations in native CSS

If you've never written any native CSS animations, there are a number of excellent guides to get you started. Here are a few of them:  
[MDN's CSS Animations guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations/Using_CSS_animations)  
[W3Schools CSS3 Animations guide](https://www.w3schools.com/css/css3_animations.asp)  
[The Complete CSS Animations Tutorial](https://www.lambdatest.com/blog/css-animations-tutorial/)  
[CSS Animation for Beginners](https://thoughtbot.com/blog/css-animation-for-beginners)

and a couple of videos:  
[Learn CSS Animation in 9 Minutes](https://www.youtube.com/watch?v=z2LQYsZhsFw)  
[Net Ninja CSS Animation Tutorial Playlist](https://www.youtube.com/watch?v=jgw82b5Y2MU&list=PL4cUxeGkcC9iGYgmEd2dm3zAKzyCGDtM5)

Check out some of these guides and tutorials, then come back to this guide.

## Creating Reusable Animations

Just like with the animations package, you can create reusable animations that can be shared across your application. The animations package version of this had you using the `animation()` function in a shared typescript file. The native CSS version of this is similar, but lives in a shared CSS file.

#### With Animations Package

<docs-code header="animations.ts" path="adev/src/content/examples/animations/src/app/animations.1.ts" region="animation-example"/>

#### With Native CSS

<docs-code header="animations.css" path="adev/src/content/examples/animations/src/app/animations.css" region="animation-shared"/>

Adding the class `animated-class` to an element would trigger the animation on that element.

## Animating a Transition

### Animating State and Styles

The animations package allowed you to define various states using the [`state()`](api/animations/state) function within a component. Examples might be an `open` or `closed` state containing the styles for each respective state within the definition. For example:

#### With Animations Package

<docs-code header="open-close.ts" path="adev/src/content/examples/animations/src/app/open-close.ts" region="state1"/>

This same behavior can be accomplished natively by using CSS classes, either with a keyframe animation or transition styling.

#### With Native CSS

<docs-code header="animations.css" path="adev/src/content/examples/animations/src/app/animations.css" region="animation-states"/>

Triggering the `open` or `closed` state is done by toggling classes on the element in your component. You can find examples of how to do this in our [template guide](guide/templates/binding#css-class-and-style-property-bindings).

You can see similar examples in the template guide for [animating styles directly](guide/templates/binding#css-style-properties).

### Transitions, Timing, and Easing

The animations package `animate()` function allows for providing timing, like duration, delays and easing. This can be done natively with CSS using several css properties or shorthand properties.

Specify `animation-duration`, `animation-delay`, and `animation-timing-function` for a keyframe animation in CSS, or alternatively use the `animation` shorthand property.

<docs-code header="animations.css" path="adev/src/content/examples/animations/src/app/animations.css" region="animation-timing"/>

Similarly, you can use `transition-duration`, `transition-delay`, and `transition-timing-function` and the `transition` shorthand for animations that are not using `@keyframes`.

<docs-code header="animations.css" path="adev/src/content/examples/animations/src/app/animations.css" region="transition-timing"/>

### Triggering an Animation

The animations package required specifying triggers using the `trigger()` function and nesting all of your states within it. With native CSS, this is unnecessary. Animations can be triggered by toggling CSS styles or classes. Once a class is present on an element, the animation will occur. Removing the class will revert the element back to whatever CSS is defined for that element. This results in significantly less code to do the same animation. Here's an example:

#### With Animations Package
#### With Native CSS

<docs-code header="open-close.ts" path="adev/src/content/examples/animations/src/app/native-css/open-close.ts" />
    <docs-code header="open-close.html" path="adev/src/content/examples/animations/src/app/native-css/open-close.html" />
    <docs-code header="open-close.css" path="adev/src/content/examples/animations/src/app/native-css/open-close.css"/>
## Transition and Triggers

### Predefined State and wildcard matching

The animations package offers the ability to match your defined states to a transition via strings. For example, animating from open to closed would be `open => closed`. You can use wildcards to match any state to a target state, like `* => closed` and the `void` keyword can be used for entering and exiting states. For example: `* => void` for when an element leaves a view or `void => *` for when the element enters a view.

These state matching patterns are not needed at all when animating with CSS directly. You can manage what transitions and `@keyframes` animations apply based on whatever classes you set and / or styles you set on the elements. You can also add `@starting-style` to control how the element looks upon immediately entering the DOM.

### Automatic Property Calculation with Wildcards

The animations package offers the ability to animate things that have been historically difficult to animate, like animating a set height to `height: auto`. You can now do this with pure CSS as well.

#### With Animations Package
You can use CSS Grid to animate to auto height.

#### With Native CSS

<docs-code header="auto-height.ts" path="adev/src/content/examples/animations/src/app/native-css/auto-height.ts" />
    <docs-code header="auto-height.html" path="adev/src/content/examples/animations/src/app/native-css/auto-height.html" />
    <docs-code header="auto-height.css" path="adev/src/content/examples/animations/src/app/native-css/auto-height.css"  />
If you don't have to worry about supporting all browsers, you can also check out `calc-size()`, which is the true solution to animating auto height. See [MDN's docs](https://developer.mozilla.org/en-US/docs/Web/CSS/calc-size) and (this tutorial)[https://frontendmasters.com/blog/one-of-the-boss-battles-of-css-is-almost-won-transitioning-to-auto/] for more information.

### Animate entering and leaving a view

The animations package offered the previously mentioned pattern matching for entering and leaving but also included the shorthand aliases of `:enter` and `:leave`.

#### With Animations Package
#### With Native CSS

<docs-code header="insert.ts" path="adev/src/content/examples/animations/src/app/native-css/insert.ts" />
    <docs-code header="insert.html" path="adev/src/content/examples/animations/src/app/native-css/insert.html" />
    <docs-code header="insert.css" path="adev/src/content/examples/animations/src/app/native-css/insert.css"  />
#### With Native CSS

<docs-code header="remove.ts" path="adev/src/content/examples/animations/src/app/native-css/remove.ts" />
    <docs-code header="remove.html" path="adev/src/content/examples/animations/src/app/native-css/remove.html" />
    <docs-code header="remove.css" path="adev/src/content/examples/animations/src/app/native-css/remove.css"  />
For more information on `animate.enter` and `animate.leave`, see the [Enter and Leave animations guide](guide/animations).

### Animating increment and decrement

Along with the aforementioned `:enter` and `:leave`, there's also `:increment` and `:decrement`. You can animate these also by adding and removing classes. Unlike the animation package built-in aliases, there is no automatic application of classes when the values go up or down. You can apply the appropriate classes programmatically. Here's an example:

#### With Animations Package
#### With Native CSS

<docs-code header="increment-decrement.ts" path="adev/src/content/examples/animations/src/app/native-css/increment-decrement.ts" />
    <docs-code header="increment-decrement.html" path="adev/src/content/examples/animations/src/app/native-css/increment-decrement.html" />
    <docs-code header="increment-decrement.css" path="adev/src/content/examples/animations/src/app/native-css/increment-decrement.css" />
### Parent / Child Animations

Unlike the animations package, when multiple animations are specified within a given component, no animation has priority over another and nothing blocks any animation from firing. Any sequencing of animations would have to be handled by your definition of your CSS animation, using animation / transition delay, and / or using `animationend` or `transitionend` to handle adding the next css to be animated.

### Disabling an animation or all animations

With native CSS animations, if you'd like to disable the animations that you've specified, you have multiple options.

1. Create a custom class that forces animation and transition to `none`.

```css
.no-animation {
  animation: none !important;
  transition: none !important;
}
```

Applying this class to an element prevents any animation from firing on that element. You could alternatively scope this to your entire DOM or section of your DOM to enforce this behavior. However, this prevents animation events from firing. If you are awaiting animation events for element removal, this solution won't work. A workaround is to set durations to 1 millisecond instead.

2. Use the [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) media query to ensure no animations play for users that prefer less animation.

3. Prevent adding animation classes programatically

### Animation Callbacks

The animations package exposed callbacks for you to use in the case that you want to do something when the animation has finished. Native CSS animations also have these callbacks.

[`OnAnimationStart`](https://developer.mozilla.org/en-US/docs/Web/API/Element/animationstart_event)  
[`OnAnimationEnd`](https://developer.mozilla.org/en-US/docs/Web/API/Element/animationend_event)  
[`OnAnimationIteration`](https://developer.mozilla.org/en-US/docs/Web/API/Element/animationitration_event)  
[`OnAnimationCancel`](https://developer.mozilla.org/en-US/docs/Web/API/Element/animationcancel_event)

[`OnTransitionStart`](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitionstart_event)  
[`OnTransitionRun`](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitionrun_event)  
[`OnTransitionEnd`](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitionend_event)  
[`OnTransitionCancel`](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitioncancel_event)

The Web Animations API has a lot of additional functionality. [Take a look at the documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) to see all the available animation APIs.

NOTE: Be aware of bubbling issues with these callbacks. If you are animating children and parents, the events bubble up from children to parents. Consider stopping propagation or looking at more details within the event to determine if you're responding to the desired event target rather than an event bubbling up from a child node. You can examine the `animationname` property or the properties being transitioned to verify you have the right nodes.

## Complex Sequences

The animations package has built-in functionality for creating complex sequences. These sequences are all entirely possible without the animations package.

### Targeting specific elements

In the animations package, you could target specific elements by using the `query()` function to find specific elements by a CSS class name, similar to [`document.querySelector()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelector). This is unnecessary in a native CSS animation world. Instead, you can use your CSS selectors to target sub-classes and apply any desired `transform` or `animation`.

To toggle classes for child nodes within a template, you can use class and style bindings to add the animations at the right points.

### Stagger()

The `stagger()` function allowed you to delay the animation of each item in a list of items by a specified time to create a cascade effect. You can replicate this behavior in native CSS by utilizing `animation-delay` or `transition-delay`. Here is an example of what that CSS might look like.

#### With Animations Package
#### With Native CSS

<docs-code header="stagger.ts" path="adev/src/content/examples/animations/src/app/native-css/stagger.ts" />
    <docs-code header="stagger.html" path="adev/src/content/examples/animations/src/app/native-css/stagger.html" />
    <docs-code header="stagger.css" path="adev/src/content/examples/animations/src/app/native-css/stagger.css" />
### Parallel Animations

The animations package has a `group()` function to play multiple animations at the same time. In CSS, you have full control over animation timing. If you have multiple animations defined, you can apply all of them at once.

```css
.target-element {
  animation:
    rotate 3s,
    fade-in 2s;
}
```

In this example, the `rotate` and `fade-in` animations fire at the same time.

### Animating the items of a reordering list

Items reordering in a list works out of the box using the previously described techniques. No additional special work is required. Items in a `@for` loop will be removed and re-added properly, which will fire off animations using `@starting-styles` for entry animations. Alternatively, you can use `animate.enter` for this same behavior. Use `animate.leave` to animate elements as they are removed, as seen in the example above.

#### With Animations Package
#### With Native CSS

<docs-code header="reorder.ts" path="adev/src/content/examples/animations/src/app/native-css/reorder.ts" />
    <docs-code header="reorder.html" path="adev/src/content/examples/animations/src/app/native-css/reorder.html" />
    <docs-code header="reorder.css" path="adev/src/content/examples/animations/src/app/native-css/reorder.css" />
## Migrating usages of AnimationPlayer

The `AnimationPlayer` class allows access to an animation to do more advanced things like pause, play, restart, and finish an animation through code. All of these things can be handled natively as well.

You can retrieve animations off an element directly using [`Element.getAnimations()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAnimations). This returns an array of every [`Animation`](https://developer.mozilla.org/en-US/docs/Web/API/Animation) on that element. You can use the `Animation` API to do much more than you could with what the `AnimationPlayer` from the animations package offered. From here you can `cancel()`, `play()`, `pause()`, `reverse()` and much more. This native API should provide everything you need to control your animations.

## Route Transitions

You can use view transitions to animate between routes. See the [Route Transition Animations Guide](guide/routing/route-transition-animations) to get started.
