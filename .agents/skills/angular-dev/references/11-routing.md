# Define routes

## Table of Contents

- **[Define routes](#define-routes)**
  - [What are routes?](#what-are-routes)
  - [Route URL Paths](#route-url-paths)
  - [How Angular matches URLs](#how-angular-matches-urls)
  - [Redirects](#redirects)
  - [Page titles](#page-titles)
  - [Route-level providers for dependency injection](#route-level-providers-for-dependency-injection)
  - [Associating data with routes](#associating-data-with-routes)
  - [Nested Routes](#nested-routes)
  - [Next steps](#next-steps)
- **[Show routes with outlets](#show-routes-with-outlets)**
  - [Nesting routes with child routes](#nesting-routes-with-child-routes)
  - [Secondary routes with named outlets](#secondary-routes-with-named-outlets)
  - [Outlet lifecycle events](#outlet-lifecycle-events)
  - [Passing contextual data to routed components](#passing-contextual-data-to-routed-components)
  - [Next steps](#next-steps)
- **[Navigate to routes](#navigate-to-routes)**
  - [How to use RouterLink](#how-to-use-routerlink)
  - [Programmatic navigation to routes](#programmatic-navigation-to-routes)
  - [Customizing the browser URL with RouterLink](#customizing-the-browser-url-with-routerlink)
  - [Next steps](#next-steps)
- **[Read route state](#read-route-state)**
  - [Get information about the current route with ActivatedRoute](#get-information-about-the-current-route-with-activatedroute)
  - [Understanding route snapshots](#understanding-route-snapshots)
  - [Reading parameters on a route](#reading-parameters-on-a-route)
  - [Detect active current route with RouterLinkActive](#detect-active-current-route-with-routerlinkactive)
  - [Check if a URL is active](#check-if-a-url-is-active)
- **[Other common Routing Tasks](#other-common-routing-tasks)**
  - [Getting route information](#getting-route-information)
  - [Displaying a 404 page](#displaying-a-404-page)
  - [Link parameters array](#link-parameters-array)
  - [`LocationStrategy` and browser URL styles](#locationstrategy-and-browser-url-styles)
- **[Creating custom route matches](#creating-custom-route-matches)**
  - [Objectives](#objectives)
  - [Create a sample application](#create-a-sample-application)
  - [Configure your routes for your application](#configure-your-routes-for-your-application)
  - [Reading the route parameters](#reading-the-route-parameters)
  - [Test your custom URL matcher](#test-your-custom-url-matcher)
  - [Next steps](#next-steps)

---


Routes serve as the fundamental building blocks for navigation within an Angular app.

## What are routes?

In Angular, a **route** is an object that defines which component should render for a specific URL path or pattern, as well as additional configuration options about what happens when a user navigates to that URL.

Here is a basic example of a route:

```ts
import {AdminPage} from './app-admin';

const adminPage = {
  path: 'admin',
  component: AdminPage,
};
```

For this route, when a user visits the `/admin` path, the app will display the `AdminPage` component.

### Managing routes in your application

Most projects define routes in a separate file that contains `routes` in the filename.

A collection of routes looks like this:

```ts
import {Routes} from '@angular/router';
import {HomePage} from './home-page';
import {AdminPage} from './about-page';

export const routes: Routes = [
  {
    path: '',
    component: HomePage,
  },
  {
    path: 'admin',
    component: AdminPage,
  },
];
```

Tip: If you generated a project with Angular CLI, your routes are defined in `src/app/app.routes.ts`.

### Adding the router to your application

When bootstrapping an Angular application without the Angular CLI, you can pass a configuration object that includes a `providers` array.

Inside of the `providers` array, you can add the Angular router to your application by adding a `provideRouter` function call with your routes.

```ts
import {ApplicationConfig} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    // ...
  ],
};
```

## Route URL Paths

### Static URL Paths

Static URL Paths refer to routes with predefined paths that don't change based on dynamic parameters. These are routes that match a `path` string exactly and have a fixed outcome.

Examples of this include:

- "/admin"
- "/blog"
- "/settings/account"

### Define URL Paths with Route Parameters

Parameterized URLs allow you to define dynamic paths that allow multiple URLs to the same component while dynamically displaying data based on parameters in the URL.

You can define this type of pattern by adding parameters to your route’s `path` string and prefixing each parameter with the colon (`:`) character.

IMPORTANT: Parameters are distinct from information in the URL's [query string](https://en.wikipedia.org/wiki/Query_string).
Learn more about [query parameters in Angular in this guide](/guide/routing/read-route-state#query-parameters).

The following example displays a user profile component based on the user id passed in through the URL.

```ts
import {Routes} from '@angular/router';
import {UserProfile} from './user-profile/user-profile';

const routes: Routes = [{path: 'user/:id', component: UserProfile}];
```

In this example, URLs such as `/user/leeroy` and `/user/jenkins` render the `UserProfile` component. This component can then read the `id` parameter and use it to perform additional work, such as fetching data. See [reading route state guide](/guide/routing/read-route-state) for details on reading route parameters.

Valid route parameter names must start with a letter (a-z, A-Z) and can only contain:

- Letters (a-z, A-Z)
- Numbers (0-9)
- Underscore (\_)
- Hyphen (-)

You can also define paths with multiple parameters:

```ts
import {Routes} from '@angular/router';
import {UserProfile} from './user-profile';
import {SocialMediaFeed} from './social-media-feed';

const routes: Routes = [
  {path: 'user/:id/:social-media', component: SocialMediaFeed},
  {path: 'user/:id/', component: UserProfile},
];
```

With this new path, users can visit `/user/leeroy/youtube` and `/user/leeroy/bluesky` and see respective social media feeds based on the parameter for the user leeroy.

See [Reading route state](/guide/routing/read-route-state) for details on reading route parameters.

### Wildcards

When you need to catch all routes for a specific path, the solution is a wildcard route which is defined with the double asterisk (`**`).

A common example is defining a Page Not Found component.

```ts
import {Home} from './home/home';
import {UserProfile} from './user-profile';
import {NotFound} from './not-found';

const routes: Routes = [
  {path: 'home', component: Home},
  {path: 'user/:id', component: UserProfile},
  {path: '**', component: NotFound},
];
```

In this routes array, the app displays the `NotFound` component when the user visits any path outside of `home` and `user/:id`.

Tip: Wildcard routes are typically placed at the end of a routes array.

## How Angular matches URLs

When you define routes, the order is important because Angular uses a first-match wins strategy. This means that once Angular matches a URL with a route `path`, it stops checking any further routes. As a result, always put more specific routes before less specific routes.

The following example shows routes defined from most-specific to least specific:

```ts
const routes: Routes = [
  {path: '', component: Home}, // Empty path
  {path: 'users/new', component: NewUser}, // Static, most specific
  {path: 'users/:id', component: UserDetail}, // Dynamic
  {path: 'users', component: Users}, // Static, less specific
  {path: '**', component: NotFound}, // Wildcard - always last
];
```

If a user visits `/users/new`, Angular router would go through the following steps:

1. Checks `''` - doesn't match
1. Checks `users/new` - matches! Stops here
1. Never reaches `users/:id` even though it could match
1. Never reaches `users`
1. Never reaches `**`

## Redirects

You can define a route that redirects to another route instead of rendering a component:

```ts
import {Blog} from './home/blog';

const routes: Routes = [
  {
    path: 'articles',
    redirectTo: '/blog',
  },
  {
    path: 'blog',
    component: Blog,
  },
];
```

If you modify or remove a route, some users may still click on out-of-date links or bookmarks to that route. You can add a redirect to direct those users to an appropriate alternative route instead of a "not found" page.

## Page titles

You can associate a **title** with each route. Angular automatically updates the [page title](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title) when a route activates. Always define appropriate page titles for your application, as these titles are necessary to create an accessible experience.

```ts
import {Routes} from '@angular/router';
import {Home} from './home';
import {About} from './about';
import {Products} from './products';

const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'Home Page',
  },
  {
    path: 'about',
    component: About,
    title: 'About Us',
  },
];
```

The page `title` property can be set dynamically to a resolver function using [`ResolveFn`](/api/router/ResolveFn).

```ts
const titleResolver: ResolveFn<string> = (route) => route.queryParams['id'];
const routes: Routes = [
  ...{
    path: 'products',
    component: Products,
    title: titleResolver,
  },
];
```

Route titles can also be set via a service extending the [`TitleStrategy`](/api/router/TitleStrategy) abstract class. By default, Angular uses the [`DefaultTitleStrategy`](/api/router/DefaultTitleStrategy).

### Using TitleStrategy for page titles

For advanced scenarios where you need centralized control over how the document title is composed, implement a `TitleStrategy`.

`TitleStrategy` is a token you can provide to override the default title strategy used by Angular. You can supply a custom `TitleStrategy` to implement conventions such as adding an application suffix, formatting titles from breadcrumbs, or generating titles dynamically from route data.

```ts
import {inject, Injectable} from '@angular/core';
import {Title} from '@angular/platform-browser';
import {TitleStrategy, RouterStateSnapshot} from '@angular/router';

@Injectable()
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  updateTitle(snapshot: RouterStateSnapshot): void {
    // PageTitle is equal to the "Title" of a route if it's set
    // If its not set it will use the "title" given in index.html
    const pageTitle = this.buildTitle(snapshot) || this.title.getTitle();
    this.title.setTitle(`MyAwesomeApp - ${pageTitle}`);
  }
}
```

To use the custom strategy, provide it with the `TitleStrategy` token at the application level:

```ts
import {provideRouter, TitleStrategy} from '@angular/router';
import {AppTitleStrategy} from './app-title.strategy';

export const appConfig = {
  providers: [provideRouter(routes), {provide: TitleStrategy, useClass: AppTitleStrategy}],
};
```

## Route-level providers for dependency injection

Each route has a `providers` property that lets you provide dependencies to that route's content via [dependency injection](/guide/di).

Common scenarios where this can be helpful include applications that have different services based on whether the user is an admin or not.

```ts
export const ROUTES: Route[] = [
  {
    path: 'admin',
    providers: [AdminService, {provide: ADMIN_API_KEY, useValue: '12345'}],
    children: [
      {path: 'users', component: AdminUsers},
      {path: 'teams', component: AdminTeams},
    ],
  },
  // ... other application routes that don't
  //     have access to ADMIN_API_KEY or AdminService.
];
```

In this code sample, the `admin` path contains a protected data property of `ADMIN_API_KEY` that is only available to children within its section. As a result, no other paths will be able to access the data provided via `ADMIN_API_KEY`.

See the [Dependency injection guide](/guide/di) for more information about providers and injection in Angular.

## Associating data with routes

Route data enables you to attach additional information to routes. You are able to configure how components behave based on this data.

There are two ways to work with route data: static data that remains constant, and dynamic data that can change based on runtime conditions.

### Static data

You can associate arbitrary static data with a route via the `data` property in order to centralize things like route-specific metadata (e.g., analytics tracking, permissions, etc.):

```ts
import {Routes} from '@angular/router';
import {Home} from './home';
import {About} from './about';
import {Products} from './products';

const routes: Routes = [
  {
    path: 'about',
    component: About,
    data: {analyticsId: '456'},
  },
  {
    path: '',
    component: Home,
    data: {analyticsId: '123'},
  },
];
```

In this code sample, the home and about page are configured with specific `analyticsId` which would then be used in their respective components for page tracking analytics.

You can read this static data by injecting the `ActivatedRoute`. See [Reading route state](/guide/routing/read-route-state) for details.

### Dynamic data with data resolvers

When you need to provide dynamic data to a route, check out the [guide on route data resolvers](/guide/routing/data-resolvers).

## Nested Routes

Nested routes, also known as child routes, are a common technique for managing more complex navigation routes where a component has a sub-view that changes based on the URL.


You can add child routes to any route definition with the `children` property:

```ts
const routes: Routes = [
  {
    path: 'product/:id',
    component: Product,
    children: [
      {
        path: 'info',
        component: ProductInfo,
      },
      {
        path: 'reviews',
        component: ProductReviews,
      },
    ],
  },
];
```

The above example defines a route for a product page that allows a user to change whether the product info or reviews are displayed based on the url.

The `children` property accepts an array of `Route` objects.

To display child routes, the parent component (`Product` in the example above) includes its own `<router-outlet>`.

```html
<!-- Product -->
<article>
  <h1>Product {{ id }}</h1>
  <router-outlet />
</article>
```

After adding child routes to the configuration and adding a `<router-outlet>` to the component, navigation between URLs that match the child routes updates only the nested outlet.

## Next steps
# Show routes with outlets

The `RouterOutlet` directive is a placeholder that marks the location where the router should render the component for the current URL.

```html
<app-header />
<!-- Angular inserts your route content here -->
<router-outlet />
<app-footer />
```

```ts
import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
```

In this example, if an application has the following routes defined:

```ts
import {Routes} from '@angular/router';
import {Home} from './home';
import {Products} from './products';

const routes: Routes = [
  {
    path: '',
    component: Home,
    title: 'Home Page',
  },
  {
    path: 'products',
    component: Products,
    title: 'Our Products',
  },
];
```

When a user visits `/products`, Angular renders the following:

```html
<app-header />
<app-products />
<app-footer />
```

If the user goes back to the home page, then Angular renders:

```html
<app-header />
<app-home />
<app-footer />
```

When displaying a route, the `<router-outlet>` element remains present in the DOM as a reference point for future navigations. Angular inserts routed content just after the outlet element as a sibling.

```html
<!-- Contents of the component's template -->
<app-header />
<router-outlet />
<app-footer />
```

```html
<!-- Content rendered on the page when the user visits /admin -->
<app-header />
<router-outlet />
<app-admin-page />
<app-footer />
```

## Nesting routes with child routes

As your application grows more complex, you might want to create routes that are relative to a component other than your root component. This enables you to create experiences where only part of the application changes when the URL changes, as opposed to the users feeling like the entire page is refreshed.

These types of nested routes are called child routes. This means you're adding a second `<router-outlet>` to your app, because it is in addition to the `<router-outlet>` in AppComponent.

In this example, the `Settings` component will display the desired panel based on what the user selects. One of the unique things you’ll notice about child routes is that the component often has its own `<nav>` and `<router-outlet>`.

```html
<h1>Settings</h1>
<nav>
  <ul>
    <li><a routerLink="profile">Profile</a></li>
    <li><a routerLink="security">Security</a></li>
  </ul>
</nav>
<router-outlet />
```

A child route is like any other route, in that it needs both a `path` and a `component`. The one difference is that you place child routes in a children array within the parent route.

```ts
const routes: Routes = [
  {
    path: 'settings',
    component: Settings, // this is the component with the <router-outlet> in the template
    children: [
      {
        path: 'profile', // child route path
        component: Profile, // child route component that the router renders
      },
      {
        path: 'security',
        component: Security, // another child route component that the router renders
      },
    ],
  },
];
```

Once both the `routes` and `<router-outlet>` are configured correctly, your application is now using nested routes!

## Secondary routes with named outlets

Pages may have multiple outlets— you can assign a name to each outlet to specify which content belongs to which outlet.

```html
<app-header />
<router-outlet />
<router-outlet name="read-more" />
<router-outlet name="additional-actions" />
<app-footer />
```

Each outlet must have a unique name. The name cannot be set or changed dynamically. By default, the name is `'primary'`.

Angular matches the outlet's name to the `outlet` property defined on each route:

```ts
{
  path: 'user/:id',
  component: UserDetails,
  outlet: 'additional-actions'
}
```

## Outlet lifecycle events

There are four lifecycle events that a router outlet can emit:

| Event        | Description                                                              |
| ------------ | ------------------------------------------------------------------------ |
| `activate`   | When a new component is instantiated                                     |
| `deactivate` | When a component is destroyed                                            |
| `attach`     | When the `RouteReuseStrategy` instructs the outlet to attach the subtree |
| `detach`     | When the `RouteReuseStrategy` instructs the outlet to detach the subtree |

You can add event listeners with the standard event binding syntax:

```html
<router-outlet
  (activate)="onActivate($event)"
  (deactivate)="onDeactivate($event)"
  (attach)="onAttach($event)"
  (detach)="onDetach($event)"
/>
```

Check out the [API docs for RouterOutlet](/api/router/RouterOutlet?tab=api) if you’d like to learn more.

## Passing contextual data to routed components

Passing contextual data to routed components often requires global state or complicated route configurations. To make this easier, each `RouterOutlet` supports a `routerOutletData` input. Routed components and their children can read this data as a signal using the `ROUTER_OUTLET_DATA` injection token, allowing outlet-specific configuration without modifying route definitions.

```typescript
import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-dashboard',
  imports: [RouterOutlet],
  template: `
    <h2>Dashboard</h2>
    <router-outlet [routerOutletData]="{layout: 'sidebar'}" />
  `,
})
export class Dashboard {}
```

The routed component can inject the provided outlet data using `ROUTER_OUTLET_DATA`:

```typescript
import {Component, inject} from '@angular/core';
import {ROUTER_OUTLET_DATA} from '@angular/router';

@Component({
  selector: 'app-stats',
  template: `<p>Stats view (layout: {{ outletData().layout }})</p>`,
})
export class Stats {
  outletData = inject(ROUTER_OUTLET_DATA) as Signal<{layout: string}>;
}
```

When Angular activates the `Stats` in that outlet, it receives `{ layout: 'sidebar' }` as injected data.

NOTE: When the `routerOutletData` input is unset, the injected value is null by default.

---

## Next steps

Learn how to [navigate to routes](/guide/routing/navigate-to-routes) with Angular Router.
# Navigate to routes

The RouterLink directive is Angular's declarative approach to navigation. It allows you to use standard anchor elements (`<a>`) that seamlessly integrate with Angular's routing system.

## How to use RouterLink

Instead of using regular anchor elements `<a>` with an `href` attribute, you add a RouterLink directive with the appropriate path in order to leverage Angular routing.

```typescript
import {RouterLink} from '@angular/router';

@Component({
  template: `
    <nav>
      <a routerLink="/user-profile">User profile</a>
      <a routerLink="/settings">Settings</a>
    </nav>
  `,
  imports: [RouterLink],
  ...
})
export class App {}
```

### Using absolute or relative links

**Relative URLs** in Angular routing allow you to define navigation paths relative to the current route's location. This is in contrast to **absolute URLs** which contain the full path with the protocol (e.g., `http://`) and the **root domain** (e.g., `google.com`).

```html
<!-- Absolute URL -->
<a href="https://www.angular.dev/essentials">Angular Essentials Guide</a>

<!-- Relative URL -->
<a href="/essentials">Angular Essentials Guide</a>
```

In this example, the first example contains the full path with the protocol (i.e., `https://`) and the root domain (i.e., `angular.dev`) explicitly defined for the essentials page. In contrast, the second example assumes the user is already on the correct root domain for `/essentials`.

Generally speaking, relative URLs are preferred as they are more maintainable across applications since they don’t need to know their absolute position within the routing hierarchy.

### How relative URLs work

Angular routing has two syntaxes for defining relative URLs: strings and arrays.

```html
<!-- Navigates user to /dashboard -->
<a routerLink="dashboard">Dashboard</a>
<a [routerLink]="['dashboard']">Dashboard</a>
```

HELPFUL: Passing a string is the most common way to define relative URLs.

When you need to define dynamic parameters in a relative URL, use the array syntax:

```html
<a [routerLink]="['user', currentUserId]">Current User</a>
```

In addition, Angular routing allows you to specify whether you want the path to be relative to the current URL or to the root domain based on whether the relative path is prefixed with a forward slash (`/`) or not.

For example, if the user is on `example.com/settings`, here is how different relative paths can be defined for various scenarios:

```html
<!-- Navigates to /settings/notifications -->
<a routerLink="notifications">Notifications</a>
<a routerLink="/settings/notifications">Notifications</a>

<!-- Navigates to /team/:teamId/user/:userId -->
<a routerLink="/team/123/user/456">User 456</a>
<a [routerLink]="['/team', teamId, 'user', userId]">Current User</a>
```

## Programmatic navigation to routes

While `RouterLink` handles declarative navigation in templates, Angular provides programmatic navigation for scenarios where you need to navigate based on logic, user actions, or application state. By injecting `Router`, you can dynamically navigate to routes, pass parameters, and control navigation behavior in your TypeScript code.

### `router.navigate()`

You can use the `router.navigate()` method to programmatically navigate between routes by specifying a URL path array.

```typescript
import {Router} from '@angular/router';

@Component({
  selector: 'app-dashboard',
  template: ` <button (click)="navigateToProfile()">View Profile</button> `,
})
export class AppDashboard {
  private router = inject(Router);

  navigateToProfile() {
    // Standard navigation
    this.router.navigate(['/profile']);

    // With route parameters
    this.router.navigate(['/users', userId]);

    // With query parameters
    this.router.navigate(['/search'], {
      queryParams: {category: 'books', sort: 'price'},
    });

    // With matrix parameters
    this.router.navigate(['/products', {featured: true, onSale: true}]);
  }
}
```

`router.navigate()` supports both simple and complex routing scenarios, allowing you to pass route parameters, [query parameters](/guide/routing/read-route-state#query-parameters), and control navigation behavior.

You can also build dynamic navigation paths relative to your component’s location in the routing tree using the `relativeTo` option.

```typescript
import {Router, ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-user-detail',
  template: `
    <button (click)="navigateToEdit()">Edit User</button>
    <button (click)="navigateToParent()">Back to List</button>
  `,
})
export class UserDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Navigate to a sibling route
  navigateToEdit() {
    // From: /users/123
    // To:   /users/123/edit
    this.router.navigate(['edit'], {relativeTo: this.route});
  }

  // Navigate to parent
  navigateToParent() {
    // From: /users/123
    // To:   /users
    this.router.navigate(['..'], {relativeTo: this.route});
  }

  navigateToList() {
    // Angular resolves the commands array as a single navigation path relative to the current route.
    // From: /users/123
    // Result: /users/list
    this.router.navigate(['..', 'list'], {relativeTo: this.route});
  }
}
```

When navigating multiple levels up, all `..` segments must be in the **first element** of the commands array. The router only parses `..` from the first command string — subsequent array elements are treated as literal path segments.

```typescript
<!-- prefer -->
// From: /team/123/users/456
// Result: /team/123/settings
this.router.navigate(['../../settings'], {relativeTo: this.route});
```

When using `relativeTo`, never prefix the first command with `/`. A leading `/` makes the navigation absolute and ignores `relativeTo` entirely.

```typescript
<!-- prefer -->
// From: /team/123/users/456
// Result: /team/123/users/456/edit
this.router.navigate(['edit'], {relativeTo: this.route});
```

```typescript
<!-- avoid -->
// From: /team/123/users/456
// Leading '/' causes absolute navigation — relativeTo is ignored
// Result: /edit
this.router.navigate(['/edit'], {relativeTo: this.route});
```

### `router.navigateByUrl()`

The `router.navigateByUrl()` method provides a direct way to programmatically navigate using URL path strings rather than array segments. This method is ideal when you have a full URL path and need to perform absolute navigation, especially when working with externally provided URLs or deep linking scenarios.

```ts
// Standard route navigation
router.navigateByUrl('/products');

// Navigate to nested route
router.navigateByUrl('/products/featured');

// Complete URL with parameters and fragment
router.navigateByUrl('/products/123?view=details#reviews');

// Navigate with query parameters
router.navigateByUrl('/search?category=books&sortBy=price');

// With matrix parameters
router.navigateByUrl('/sales-awesome;isOffer=true;showModal=false');
```

In the event you need to replace the current URL in history, `navigateByUrl` also accepts a configuration object that has a `replaceUrl` option.

```ts
// Replace current URL in history
router.navigateByUrl('/checkout', {
  replaceUrl: true,
});
```

### Display a different URL in the address bar

You can pass a browserUrl option to navigateByUrl to display a different URL in the browser's address bar than the one used for route matching.

This is useful when you want to redirect a user to a different route—such as an error page—without changing the URL that the user originally tried to visit.

```ts
router.navigateByUrl('/not-found', {browserUrl: '/products/missing-item'});
```

Angular navigates to and renders the `/not-found` route, but the browser address bar shows `/products/missing-item`.

NOTE: `browserUrl` only affects what appears in the browser's address bar.

## Customizing the browser URL with RouterLink

The `RouterLink` directive also supports a `browserUrl` input, which lets you control the URL displayed in the browser's address bar when a link is clicked, independently of the route Angular navigates to.

```html
<!-- Navigates to /dashboard, but the address bar shows /home -->
<a [routerLink]="['/dashboard']" [browserUrl]="'/home'">Go to Dashboard</a>
```

You can also bind a `UrlTree` for more dynamic use cases:

```typescript
import {Component, inject} from '@angular/core';
import {Router, RouterLink, UrlTree} from '@angular/router';

@Component({
  template: `
    <a [routerLink]="['/products', product.id]" [browserUrl]="displayUrl">
      {{ product.name }}
    </a>
  `,
  imports: [RouterLink],
})
export class ProductList {
  private router = inject(Router);

  product = {id: 42, name: 'Widget'};

  // Create a UrlTree to display in the address bar
  displayUrl: UrlTree = this.router.createUrlTree(['/products', 'widget']);
}
```

## Next steps

Learn how to [read route state](/guide/routing/read-route-state) to create responsive and context-aware components.
# Read route state

Angular Router allows you to read and use information associated with a route to create responsive and context-aware components.

## Get information about the current route with ActivatedRoute

`ActivatedRoute` is a service from `@angular/router` that provides all the information associated with the current route.

```typescript
import {Component} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-product',
})
export class Product {
  private activatedRoute = inject(ActivatedRoute);

  constructor() {
    console.log(this.activatedRoute);
  }
}
```

The `ActivatedRoute` can provide different information about the route. Some common properties include:

| Property      | Details                                                                                                                           |
| :------------ | :-------------------------------------------------------------------------------------------------------------------------------- |
| `url`         | An `Observable` of the route paths, represented as an array of strings for each part of the route path.                           |
| `data`        | An `Observable` that contains the `data` object provided for the route. Also contains any resolved values from the resolve guard. |
| `params`      | An `Observable` that contains the required and optional parameters specific to the route.                                         |
| `queryParams` | An `Observable` that contains the query parameters available to all routes.                                                       |

Check out the [`ActivatedRoute` API docs](/api/router/ActivatedRoute) for a complete list of what you can access with in the route.

## Understanding route snapshots

Page navigations are events over time, and you can access the router state at a given time by retrieving a route snapshot.

Route snapshots contain essential information about the route, including its parameters, data, and child routes. In addition, snapshots are static and will not reflect future changes.

Here’s an example of how you’d access a route snapshot:

```typescript
import {ActivatedRoute, ActivatedRouteSnapshot} from '@angular/router';

@Component({
  /*...*/
})
export class UserProfile {
  readonly userId: string;
  private route = inject(ActivatedRoute);

  constructor() {
    // Example URL: https://www.angular.dev/users/123?role=admin&status=active#contact

    // Access route parameters from snapshot
    this.userId = this.route.snapshot.paramMap.get('id');

    // Access multiple route elements
    const snapshot = this.route.snapshot;
    console.log({
      url: snapshot.url, // https://www.angular.dev
      // Route parameters object: {id: '123'}
      params: snapshot.params,
      // Query parameters object: {role: 'admin', status: 'active'}
      queryParams: snapshot.queryParams, // Query parameters
    });
  }
}
```

Check out the [`ActivatedRoute` API docs](/api/router/ActivatedRoute) and [`ActivatedRouteSnapshot` API docs](/api/router/ActivatedRouteSnapshot) for a complete list of all properties you can access.

## Reading parameters on a route

There are two types of parameters that developers can utilize from a route: route and query parameters.

### Route Parameters

Route parameters allow you to pass data to a component through the URL. This is useful when you want to display specific content based on an identifier in the URL, like a user ID or a product ID.

You can [define route parameters](/guide/routing/define-routes#define-url-paths-with-route-parameters) by prefixing the parameter name with a colon (`:`).

```typescript
import {Routes} from '@angular/router';
import {Product} from './product';

const routes: Routes = [{path: 'product/:id', component: Product}];
```

You can access parameters by subscribing to `route.params`.

```typescript
import {Component, inject, signal} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-product-detail',
  template: `<h1>Product Details: {{ productId() }}</h1>`,
})
export class ProductDetail {
  productId = signal('');
  private activatedRoute = inject(ActivatedRoute);

  constructor() {
    // Access route parameters
    this.activatedRoute.params.subscribe((params) => {
      this.productId.set(params['id']);
    });
  }
}
```

### Query Parameters

[Query parameters](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) provide a flexible way to pass optional data through URLs without affecting the route structure. Unlike route parameters, query parameters can persist across navigation events and are perfect for handling filtering, sorting, pagination, and other stateful UI elements.

```typescript
// Single parameter structure
// /products?category=electronics
router.navigate(['/products'], {
  queryParams: {category: 'electronics'},
});

// Multiple parameters
// /products?category=electronics&sort=price&page=1
router.navigate(['/products'], {
  queryParams: {
    category: 'electronics',
    sort: 'price',
    page: 1,
  },
});
```

You can access query parameters with `route.queryParams`.

Here is an example of a `ProductList` that updates the query parameters that affect how it displays a list of products:

```typescript
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-product-list',
  template: `
    <select (change)="updateSort($event)">
        <option value="price">Price</option>
        <option value="name">Name</option>
      </select>
      <!-- Products list -->
    `,
})
export class ProductList {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  constructor() {
    // Access query parameters reactively
    this.route.queryParams.subscribe((params) => {
      const sort = params['sort'] || 'price';
      const page = Number(params['page']) || 1;
      this.loadProducts(sort, page);
    });
  }

  updateSort(event: Event) {
    const sort = (event.target as HTMLSelectElement).value;
    // Update URL with new query parameter
    this.router.navigate([], {
      queryParams: {sort},
      queryParamsHandling: 'merge', // Preserve other query parameters
    });
  }
}
```

In this example, users can use a select element to sort the product list by name or price. The associated change handler updates the URL’s query parameters, which in turn triggers a change event that can read the updated query parameters and update the product list.

For more information, check out the [official docs on QueryParamsHandling](/api/router/QueryParamsHandling).

### Matrix Parameters

Matrix parameters are optional parameters that belong to a specific URL segment, rather than applying to the entire route. Unlike query parameters which appear after a `?` and apply globally, matrix parameters use semicolons (`;`) and are scoped to individual path segments.

Matrix parameters are useful when you need to pass auxiliary data to a specific route segment without affecting the route definition or matching behavior. Like query parameters, they don't need to be defined in your route configuration.

```ts
// URL format: /path;key=value
// Multiple parameters: /path;key1=value1;key2=value2

// Navigate with matrix parameters
this.router.navigate(['/awesome-products', {view: 'grid', filter: 'new'}]);
// Results in URL: /awesome-products;view=grid;filter=new
```

**Using ActivatedRoute**

```ts
import {Component, inject} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

@Component(/* ... */)
export class AwesomeProducts {
  private route = inject(ActivatedRoute);

  constructor() {
    // Access matrix parameters via params
    this.route.params.subscribe((params) => {
      const view = params['view']; // e.g., 'grid'
      const filter = params['filter']; // e.g., 'new'
    });
  }
}
```

NOTE: As an alternative to using `ActivatedRoute`, matrix parameters are also bound to component inputs when using the `withComponentInputBinding`.

## Detect active current route with RouterLinkActive

You can use the `RouterLinkActive` directive to dynamically style navigation elements based on the current active route. This is common in navigation elements to inform users what the active route is.

```html
<nav>
  <a
    class="button"
    routerLink="/about"
    routerLinkActive="active-button"
    ariaCurrentWhenActive="page"
  >
    About
  </a>
  |
  <a
    class="button"
    routerLink="/settings"
    routerLinkActive="active-button"
    ariaCurrentWhenActive="page"
  >
    Settings
  </a>
</nav>
```

In this example, Angular Router will apply the `active-button` class to the correct anchor link and `ariaCurrentWhenActive` to `page` when the URL matches the corresponding `routerLink`.

If you need to add multiple classes onto the element, you can use either a space-separated string or an array:

```html
<!-- Space-separated string syntax -->
<a routerLink="/user/bob" routerLinkActive="class1 class2">Bob</a>

<!-- Array syntax -->
<a routerLink="/user/bob" [routerLinkActive]="['class1', 'class2']">Bob</a>
```

When you specify a value for routerLinkActive, you are also defining the same value for `ariaCurrentWhenActive`. This makes sure that visually impaired users (which may not perceive the different styling being applied) can also identify the active button.

If you want to define a different value for aria, you’ll need to explicitly set the value using the `ariaCurrentWhenActive` directive.

### Route matching strategy

By default, `RouterLinkActive` considers any ancestors in the route a match.

```html
<a [routerLink]="['/user/jane']" routerLinkActive="active-link"> User </a>
<a [routerLink]="['/user/jane/role/admin']" routerLinkActive="active-link"> Role </a>
```

When the user visits `/user/jane/role/admin`, both links would have the `active-link` class.

### Only apply RouterLinkActive on exact route matches

If you only want to apply the class on an exact match, you need to provide the `routerLinkActiveOptions` directive with a configuration object that contains the value `exact: true`.

```html
<a
  [routerLink]="['/user/jane']"
  routerLinkActive="active-link"
  [routerLinkActiveOptions]="{exact: true}"
>
  User
</a>
<a
  [routerLink]="['/user/jane/role/admin']"
  routerLinkActive="active-link"
  [routerLinkActiveOptions]="{exact: true}"
>
  Role
</a>
```

If you want to be more precise in how a route is matched, it’s worth noting that `exact: true` is actually syntactic sugar for the full set of matching options:

```typescript
// `exact: true` is equivalent to
{
  paths: 'exact',
  fragment: 'ignored',
  matrixParams: 'ignored',
  queryParams: 'exact',
}

// `exact: false` is equivalent
{
  paths: 'subset',
  fragment: 'ignored',
  matrixParams: 'ignored',
  queryParams: 'subset',
}
```

For more information, check out the official docs for [isActiveMatchOptions](/api/router/IsActiveMatchOptions).

### Apply RouterLinkActive to an ancestor

The RouterLinkActive directive can also be applied to an ancestor element in order to allow developers to style the elements as desired.

```html
<a routerLink="/user/jim">Jim</a>
  <a routerLink="/user/bob">Bob</a>
```

For more information, check out the [API docs for RouterLinkActive](/api/router/RouterLinkActive).

## Check if a URL is active

The `isActive` function returns a computed signal that tracks whether a given URL is currently active in the router. The signal automatically updates as the router state changes.

```typescript
import {Component, inject} from '@angular/core';
import {isActive, Router} from '@angular/router';

@Component({
  template: `
    <h2>Settings</h2>
    `,
})
export class Panel {
  private router = inject(Router);

  isSettingsActive = isActive('/settings', this.router, {
    paths: 'subset',
    queryParams: 'ignored',
    fragment: 'ignored',
    matrixParams: 'ignored',
  });
}
```
# Other common Routing Tasks

This guide covers some other common tasks associated with using Angular router in your application.

## Getting route information

Often, as a user navigates your application, you want to pass information from one component to another.
For example, consider an application that displays a shopping list of grocery items.
Each item in the list has a unique `id`.
To edit an item, users click an Edit button, which opens an `EditGroceryItem` component.
You want that component to retrieve the `id` for the grocery item so it can display the right information to the user.

Use a route to pass this type of information to your application components.
To do so, you use the `withComponentInputBinding` feature with `provideRouter` or the `bindToComponentInputs` option of `RouterModule.forRoot`.

To get information from a route:

<docs-workflow>

<docs-step title="Add `withComponentInputBinding`">

Add the `withComponentInputBinding` feature to the `provideRouter` method.

```ts
providers: [provideRouter(appRoutes, withComponentInputBinding())];
```

</docs-step>

<docs-step title="Add an `input` to the component">

Update the component to have an `input()` property matching the name of the parameter.

```ts
id = input.required<string>();
hero = computed(() => this.service.getHero(id()));
```

</docs-step>
<docs-step title="Optional: Use a default value">
The router assigns values to all inputs based on the current route when `withComponentInputBinding` is enabled.
The router assigns `undefined` if no route data matches the input key, such as when an optional query parameter is missing.
You should include `undefined` in the `input`'s type when there's a possibility that an input might not be matched by the route.

Provide a default value by either using the `transform` option on the input or managing a local state with a `linkedSignal`.

```ts
id = input.required({
  transform: (maybeUndefined: string | undefined) => maybeUndefined ?? '0',
});
// or
id = input<string | undefined>();
internalId = linkedSignal(() => this.id() ?? getDefaultId());
```

</docs-step>
</docs-workflow>

NOTE: You can bind all route data with key, value pairs to component inputs: static or resolved route data, path parameters, matrix parameters, and query parameters.

### Disable query parameter binding

Use `ComponentInputBindingOptions` to disable query parameter binding if you manage query parameters separately:

```ts
provideRouter(appRoutes, withComponentInputBinding({queryParams: false}));
```

### Configure behavior for inputs not available in router data

By default, the router sets an input to `undefined` if it was not available in the router data during a navigation. This ensures that stale data is not retained.

If you want to avoid setting `undefined` for inputs that have _never_ been available in the router data for the active component instance, you can set the `unmatchedInputBehavior` option to `'undefinedIfStale'`:

```ts
provideRouter(appRoutes, withComponentInputBinding({unmatchedInputBehavior: 'undefinedIfStale'}));
```

When you combine `unmatchedInputBehavior: 'undefinedIfStale'` with `queryParams: false`, inputs retain their initial values unless they are explicitly provided by the router. The exception is matrix parameters: if a matrix parameter is provided in one navigation and removed in a subsequent one, the router will set the input to `undefined` to avoid retaining stale data.

```ts
provideRouter(
  appRoutes,
  withComponentInputBinding({
    queryParams: false,
    unmatchedInputBehavior: 'undefinedIfStale',
  }),
);
```

### Inherit parent route data

By default, child routes inherit parameters and data from parent routes (equivalent to `paramsInheritanceStrategy: 'always'`). This means you can access parent route info directly in child components.

If you need to restore the legacy behavior where parameters were only inherited from empty path routes, you can set `paramsInheritanceStrategy` to `'emptyOnly'`:

```ts
provideRouter(routes, withRouterConfig({paramsInheritanceStrategy: 'emptyOnly'}));
```

See [router configuration options](guide/routing/customizing-route-behavior#router-configuration-options) for details on other available settings.

## Displaying a 404 page

To display a 404 page, set up a [wildcard route](guide/routing/define-routes#wildcards) with the `component` property set to the component you'd like to use for your 404 page as follows:

```ts
const routes: Routes = [
  {path: 'first-component', component: First},
  {path: 'second-component', component: Second},
  {path: '**', component: PageNotFound}, // Wildcard route for a 404 page
];
```

The last route with the `path` of `**` is a wildcard route.
The router selects this route if the requested URL doesn't match any of the paths earlier in the list and sends the user to the `PageNotFound`.

## Link parameters array

A link parameters array holds the following ingredients for router navigation:

- The path of the route to the destination component
- Required and optional route parameters that go into the route URL

Bind the `RouterLink` directive to such an array like this:

```html
<a [routerLink]="['/heroes']">Heroes</a>
```

The following is a two-element array when specifying a route parameter:

```html
<a [routerLink]="['/hero', hero.id]">
  <span class="badge">{{ hero.id }}</span
  >{{ hero.name }}
</a>
```

Provide optional route parameters in an object, as in `{ foo: 'foo' }`:

```html
<a [routerLink]="['/crisis-center', {foo: 'foo'}]">Crisis Center</a>
```

This syntax passes matrix parameters, which are optional parameters associated with a specific URL segment. Learn more about [matrix parameters](/guide/routing/read-route-state#matrix-parameters).

These three examples cover the needs of an application with one level of routing.
However, with a child router, such as in the crisis center, you create new link array possibilities.

The following minimal `RouterLink` example builds upon a specified default child route for the crisis center.

```html
<a [routerLink]="['/crisis-center']">Crisis Center</a>
```

Review the following:

- The first item in the array identifies the parent route \(`/crisis-center`\)
- There are no parameters for this parent route
- There is no default for the child route so you need to pick one
- You're navigating to the `CrisisList`, whose route path is `/`, but you don't need to explicitly add the slash

Consider the following router link that navigates from the root of the application down to the Dragon Crisis:

```html
<a [routerLink]="['/crisis-center', 1]">Dragon Crisis</a>
```

- The first item in the array identifies the parent route \(`/crisis-center`\)
- There are no parameters for this parent route
- The second item identifies the child route details about a particular crisis \(`/:id`\)
- The details child route requires an `id` route parameter
- You added the `id` of the Dragon Crisis as the second item in the array \(`1`\)
- The resulting path is `/crisis-center/1`

You could also redefine the `App` template with Crisis Center routes exclusively:

```typescript
@Component({
  template: `
    <h1 class="title">Angular Router</h1>
    <nav>
      <a [routerLink]="['/crisis-center']">Crisis Center</a>
      <a [routerLink]="['/crisis-center/1', {foo: 'foo'}]">Dragon Crisis</a>
      <a [routerLink]="['/crisis-center/2']">Shark Crisis</a>
    </nav>
    <router-outlet />
  `,
})
export class App {}
```

In summary, you can write applications with one, two or more levels of routing.
The link parameters array affords the flexibility to represent any routing depth and any legal sequence of route paths, \(required\) router parameters, and \(optional\) route parameter objects.

## `LocationStrategy` and browser URL styles

When the router navigates to a new component view, it updates the browser's location and history with a URL for that view.

Modern HTML5 browsers support [history.pushState](https://developer.mozilla.org/docs/Web/API/History_API/Working_with_the_History_API#adding_and_modifying_history_entries 'HTML5 browser history push-state'), a technique that changes a browser's location and history without triggering a server page request.
The router can compose a "natural" URL that is indistinguishable from one that would otherwise require a page load.

Here's the Crisis Center URL in this "HTML5 pushState" style:

```text
localhost:3002/crisis-center
```

Older browsers send page requests to the server when the location URL changes unless the change occurs after a "#" \(called the "hash"\).
Routers can take advantage of this exception by composing in-application route URLs with hashes.
Here's a "hash URL" that routes to the Crisis Center.

```text
localhost:3002/src/#/crisis-center
```

The router supports both styles with two `LocationStrategy` providers:

| Providers              | Details                              |
| :--------------------- | :----------------------------------- |
| `PathLocationStrategy` | The default "HTML5 pushState" style. |
| `HashLocationStrategy` | The "hash URL" style.                |

The `RouterModule.forRoot()` function sets the `LocationStrategy` to the `PathLocationStrategy`, which makes it the default strategy.
You also have the option of switching to the `HashLocationStrategy` with an override during the bootstrapping process.

HELPFUL: For more information on providers and the bootstrap process, see [Dependency Injection](guide/di/defining-dependency-providers).
# Creating custom route matches

The Angular Router supports a powerful matching strategy that you can use to help users navigate your application.
This matching strategy supports static routes, variable routes with parameters, wildcard routes, and so on.
Also, build your own custom pattern matching for situations in which the URLs are more complicated.

In this tutorial, you'll build a custom route matcher using Angular's `UrlMatcher`.
This matcher looks for a Twitter handle in the URL.

## Objectives

Implement Angular's `UrlMatcher` to create a custom route matcher.

## Create a sample application

Using the Angular CLI, create a new application, _angular-custom-route-match_.
In addition to the default Angular application framework, you will also create a _profile_ component.

1. Create a new Angular project, _angular-custom-route-match_.

   ```shell
ng new angular-custom-route-match
   ```

   When prompted with `Would you like to add Angular routing?`, select `Y`.

   When prompted with `Which stylesheet format would you like to use?`, select `CSS`.

   After a few moments, a new project, `angular-custom-route-match`, is ready.

1. From your terminal, navigate to the `angular-custom-route-match` directory.
1. Create a component, _profile_.

   ```shell
ng generate component profile
   ```

1. In your code editor, locate the file, `profile.html` and replace the placeholder content with the following HTML.

   <docs-code header="profile.html" path="adev/src/content/examples/routing-with-urlmatcher/src/app/profile/profile.html"/>

1. In your code editor, locate the file, `app.html` and replace the placeholder content with the following HTML.

   <docs-code header="app.html" path="adev/src/content/examples/routing-with-urlmatcher/src/app/app.html"/>

## Configure your routes for your application

With your application framework in place, you next need to add routing capabilities to the `app.config.ts` file.
As a part of this process, you will create a custom URL matcher that looks for a Twitter handle in the URL.
This handle is identified by a preceding `@` symbol.

1. In your code editor, open your `app.config.ts` file.
1. Add an `import` statement for Angular's `provideRouter` and `withComponentInputBinding` as well as the application routes.

   ```ts
import {provideRouter, withComponentInputBinding} from '@angular/router';

   import {routes} from './app.routes';
   ```

1. In the providers array, add a `provideRouter(routes, withComponentInputBinding())` statement.

1. Define the custom route matcher by adding the following code to the application routes.

   <docs-code header="app.routes.ts" path="adev/src/content/examples/routing-with-urlmatcher/src/app/app.routes.ts" region="matcher"/>

This custom matcher is a function that performs the following tasks:

- The matcher verifies that the array contains only one segment
- The matcher employs a regular expression to ensure that the format of the username is a match
- If there is a match, the function returns the entire URL, defining a `username` route parameter as a substring of the path
- If there isn't a match, the function returns null and the router continues to look for other routes that match the URL

HELPFUL: A custom URL matcher behaves like any other route definition. Define child routes or lazy loaded routes as you would with any other route.

## Reading the route parameters

With the custom matcher in place, you can now bind the route parameter in the `profile` component.

In your code editor, open your `profile.ts` file and create an `input` matching the `username` parameter.
We added the `withComponentInputBinding` feature earlier
in `provideRouter`. This allows the `Router` to bind information directly to the route components.

```ts
username = input.required<string>();
```

## Test your custom URL matcher

With your code in place, you can now test your custom URL matcher.

1. From a terminal window, run the `ng serve` command.

   ```shell
ng serve
   ```

1. Open a browser to `http://localhost:4200`.

   You should see a single web page, consisting of a sentence that reads `Navigate to my profile`.

1. Click the **my profile** hyperlink.

   A new sentence, reading `Hello, Angular!` appears on the page.

## Next steps

Pattern matching with the Angular Router provides you with a lot of flexibility when you have dynamic URLs in your application.
To learn more about the Angular Router, see the following topics:
HELPFUL: This content is based on [Custom Route Matching with the Angular Router](https://medium.com/@brandontroberts/custom-route-matching-with-the-angular-router-fbdd48665483), by [Brandon Roberts](https://twitter.com/brandontroberts).
