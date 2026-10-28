# Server and hybrid rendering

## Table of Contents

- **[Server and hybrid rendering](#server-and-hybrid-rendering)**
  - [What is hybrid rendering?](#what-is-hybrid-rendering)
  - [Setting up hybrid rendering](#setting-up-hybrid-rendering)
  - [Server routing](#server-routing)
  - [Authoring server-compatible components](#authoring-server-compatible-components)
  - [Setting providers on the server](#setting-providers-on-the-server)
  - [Providing platform-specific implementations](#providing-platform-specific-implementations)
  - [Accessing Document via DI](#accessing-document-via-di)
  - [Accessing Request and Response via DI](#accessing-request-and-response-via-di)
  - [Generate a fully static application](#generate-a-fully-static-application)
  - [Caching data when using HttpClient](#caching-data-when-using-httpclient)
  - [Configuring a server](#configuring-a-server)
  - [Security](#security)
- **[Hydration](#hydration)**
  - [What is hydration](#what-is-hydration)
  - [Why is hydration important?](#why-is-hydration-important)
  - [How do you enable hydration in Angular](#how-do-you-enable-hydration-in-angular)
  - [Capturing and replaying events](#capturing-and-replaying-events)
  - [Constraints](#constraints)
  - [Errors](#errors)
  - [How to skip hydration for particular components](#how-to-skip-hydration-for-particular-components)
  - [Hydration Timing and Application Stability](#hydration-timing-and-application-stability)
  - [I18N](#i18n)
  - [Consistent rendering across server-side and client-side](#consistent-rendering-across-server-side-and-client-side)
  - [Third Party Libraries with DOM Manipulation](#third-party-libraries-with-dom-manipulation)
  - [Third Party Scripts with DOM Manipulation](#third-party-scripts-with-dom-manipulation)
  - [Incremental Hydration](#incremental-hydration)
- **[Incremental Hydration](#incremental-hydration)**
  - [Why use incremental hydration?](#why-use-incremental-hydration)
  - [How do you enable incremental hydration in Angular?](#how-do-you-enable-incremental-hydration-in-angular)
  - [How does incremental hydration work?](#how-does-incremental-hydration-work)
  - [Controlling hydration of content with triggers](#controlling-hydration-of-content-with-triggers)
  - [Hydrate triggers alongside regular triggers](#hydrate-triggers-alongside-regular-triggers)
  - [How does incremental hydration work with nested `@defer` blocks?](#how-does-incremental-hydration-work-with-nested-defer-blocks)
  - [Constraints](#constraints)
  - [Do I still need to specify `@placeholder` blocks?](#do-i-still-need-to-specify-placeholder-blocks)

---


Angular ships all applications as client-side rendered (CSR) by default. While this approach delivers an initial payload that's lightweight, it introduces trade-offs including slower load times, degraded performance metrics, and higher resource demands since the user's device performs most of the computations. As a result, many applications achieve significant performance improvements by integrating server-side rendering (SSR) into a hybrid rendering strategy.

## What is hybrid rendering?

Hybrid rendering allows developers to leverage the benefits of server-side rendering (SSR), pre-rendering (also known as "static site generation" or SSG) and client-side rendering (CSR) to optimize your Angular application. It gives you fine-grained control over how the different parts of your app are rendered to give your users the best experience possible.

## Setting up hybrid rendering

You can create a **new** project with hybrid rendering by using the server-side rendering flag (i.e., `--ssr`) with the Angular CLI `ng new` command:

```shell
ng new --ssr
```

You can also enable hybrid rendering by adding server-side rendering to an existing project with the `ng add` command:

```shell
ng add @angular/ssr
```

NOTE: By default, Angular prerenders your entire application and generates a server file. To disable this and create a fully static app, set `outputMode` to `static`. To enable SSR, update the server routes to use `RenderMode.Server`. For more details, see [`Server routing`](#server-routing) and [`Generate a fully static application`](#generate-a-fully-static-application).

## Server routing

### Configuring server routes

You can create a server route config by declaring an array of [`ServerRoute`](api/ssr/ServerRoute 'API reference') objects. This configuration typically lives in a file named `app.routes.server.ts`.

```typescript
// app.routes.server.ts
import {RenderMode, ServerRoute} from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '', // This renders the "/" route on the client (CSR)
    renderMode: RenderMode.Client,
  },
  {
    path: 'about', // This page is static, so we prerender it (SSG)
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'profile', // This page requires user-specific data, so we use SSR
    renderMode: RenderMode.Server,
  },
  {
    path: '**', // All other routes will be rendered on the server (SSR)
    renderMode: RenderMode.Server,
  },
];
```

You can add this config to your application with [`provideServerRendering`](api/ssr/provideServerRendering 'API reference') using the [`withRoutes`](api/ssr/withRoutes 'API reference') function:

```typescript
import {provideServerRendering, withRoutes} from '@angular/ssr';
import {serverRoutes} from './app.routes.server';

// app.config.server.ts
const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // ... other providers ...
  ],
};
```

When using the [App shell pattern](ecosystem/service-workers/app-shell), you must specify the component to be used as the app shell for client-side rendered routes. To do this, use the [`withAppShell`](api/ssr/withAppShell 'API reference') feature:

```typescript
import {provideServerRendering, withRoutes, withAppShell} from '@angular/ssr';
import {AppShell} from './app-shell';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes), withAppShell(AppShell)),
    // ... other providers ...
  ],
};
```

### Rendering modes

The server routing configuration lets you specify how each route in your application should render by setting a [`RenderMode`](api/ssr/RenderMode 'API reference'):

| Rendering mode      | Description                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Server (SSR)**    | Renders the application on the server for each request, sending a fully populated HTML page to the browser. |
| **Client (CSR)**    | Renders the application in the browser. This is the default Angular behavior.                               |
| **Prerender (SSG)** | Prerenders the application at build time, generating static HTML files for each route.                      |

#### Choosing a rendering mode

Each rendering mode has different benefits and drawbacks. You can choose rendering modes based on the specific needs of your application.

##### Client-side rendering (CSR)

Client-side rendering has the simplest development model, as you can write code that assumes it always runs in a web browser. This lets you use a wide range of client-side libraries that also assume they run in a browser.

Client-side rendering generally has worse performance than other rendering modes, as it must download, parse, and execute your page's JavaScript before the user can see any rendered content. If your page fetches more data from the server as it renders, users also have to wait for those additional requests before they can view the complete content.

If your page is indexed by search crawlers, client-side rendering may negatively affect search engine optimization (SEO), as search crawlers have limits to how much JavaScript they execute when indexing a page.

When client-side rendering, the server does not need to do any work to render a page beyond serving static JavaScript assets. You may consider this factor if server cost is a concern.

Applications that support installable, offline experiences with [service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API) can rely on client-side rendering without needing to communicate with a server.

##### Server-side rendering (SSR)

Server-side rendering offers faster page loads than client-side rendering. Instead of waiting for JavaScript to download and run, the server directly renders an HTML document upon receiving a request from the browser. The user experiences only the latency necessary for the server to fetch data and render the requested page. This mode also eliminates the need for additional network requests from the browser, as your code can fetch data during rendering on the server.

Server-side rendering generally has excellent search engine optimization (SEO), as search crawlers receive a fully rendered HTML document.

Server-side rendering requires you to author code that does not strictly depend on browser APIs and limits your selection of JavaScript libraries that assume they run in a browser.

When server-side rendering, your server runs Angular to produce an HTML response for every request which may increase server hosting costs.

##### Build-time prerendering

Prerendering offers faster page loads than both client-side rendering and server-side rendering. Because prerendering creates HTML documents at _build-time_, the server can directly respond to requests with the static HTML document without any additional work.

Prerendering requires that all information necessary to render a page is available at _build-time_. This means that prerendered pages cannot include any data to the specific user loading the page. Prerendering is primarily useful for pages that are the same for all users of your application.

Because prerendering occurs at build-time, it may add significant time to your production builds. Using [`getPrerenderParams`](api/ssr/ServerRoutePrerenderWithParams#getPrerenderParams 'API reference') to produce a large number of HTML documents may affect the total file size of your deployments, and thus lead to slower deployments.

Prerendering generally has excellent search engine optimization (SEO), as search crawlers receive a fully rendered HTML document.

Prerendering requires you to author code that does not strictly depend on browser APIs and limits your selection of JavaScript libraries that assume they run in a browser.

Prerendering incurs extremely little overhead per server request, as your server responds with static HTML documents. Static files are also easily cached by Content Delivery Networks (CDNs), browsers, and intermediate caching layers for even faster subsequent page loads. Fully static sites can also be deployed solely through a CDN or static file server, eliminating the need to maintain a custom server runtime for your application. This enhances scalability by offloading work from an application web server, making it particularly beneficial for high-traffic applications.

NOTE: When using Angular service worker, the first request is server-rendered, but all subsequent requests are handled by the service worker and rendered client-side.

### Setting headers and status codes

You can set custom headers and status codes for individual server routes using the `headers` and `status` properties in the `ServerRoute` configuration.

```typescript
// app.routes.server.ts
import {RenderMode, ServerRoute} from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'profile',
    renderMode: RenderMode.Server,
    headers: {
      'X-My-Custom-Header': 'some-value',
    },
    status: 201,
  },
  // ... other routes
];
```

### Redirects

Angular handles redirects specified by the [`redirectTo`](api/router/Route#redirectTo 'API reference') property in route configurations, differently on the server-side.

**Server-Side Rendering (SSR)**
Redirects are performed using standard HTTP redirects (e.g., 301, 302) within the server-side rendering process.

**Prerendering (SSG)**
Redirects are implemented as "soft redirects" using [`<meta http-equiv="refresh">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#refresh) tags in the prerendered HTML.

### Customizing build-time prerendering (SSG)

When using [`RenderMode.Prerender`](api/ssr/RenderMode#Prerender 'API reference'), you can specify several configuration options to customize the prerendering and serving process.

#### Parameterized routes

For each route with [`RenderMode.Prerender`](api/ssr/RenderMode#Prerender 'API reference'), you can specify a [`getPrerenderParams`](api/ssr/ServerRoutePrerenderWithParams#getPrerenderParams 'API reference') function. This function lets you control which specific parameters produce separate prerendered documents.

The [`getPrerenderParams`](api/ssr/ServerRoutePrerenderWithParams#getPrerenderParams 'API reference') function returns a `Promise` that resolves to an array of objects. Each object is a key-value map of route parameter name to value. For example, if you define a route like `post/:id`, `getPrerenderParams ` could return the array `[{id: 123}, {id: 456}]`, and thus render separate documents for `post/123` and `post/456`.

The body of [`getPrerenderParams`](api/ssr/ServerRoutePrerenderWithParams#getPrerenderParams 'API reference') can use Angular's [`inject`](api/core/inject 'API reference') function to inject dependencies and perform any work to determine which routes to prerender. This typically includes making requests to fetch data to construct the array of parameter values.

You can also use this function with catch-all routes (e.g., `/**`), where the parameter name will be `"**"` and the return value will be the segments of the path, such as `foo/bar`. These can be combined with other parameters (e.g., `/post/:id/**`) to handle more complex route configuration.

```ts
// app.routes.server.ts
import {RenderMode, ServerRoute} from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'post/:id',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const dataService = inject(PostService);
      const ids = await dataService.getIds(); // Assuming this returns ['1', '2', '3']

      return ids.map((id) => ({id})); // Generates paths like: /post/1, /post/2, /post/3
    },
  },
  {
    path: 'post/:id/**',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return [
        {id: '1', '**': 'foo/3'},
        {id: '2', '**': 'bar/4'},
      ]; // Generates paths like: /post/1/foo/3, /post/2/bar/4
    },
  },
];
```

Because [`getPrerenderParams`](api/ssr/ServerRoutePrerenderWithParams#getPrerenderParams 'API reference') exclusively applies to [`RenderMode.Prerender`](api/ssr/RenderMode#Prerender 'API reference'), this function always runs at _build-time_. `getPrerenderParams` must not rely on any browser-specific or server-specific APIs for data.

IMPORTANT: When using [`inject`](api/core/inject 'API reference') inside `getPrerenderParams`, please remember that `inject` must be used synchronously. It cannot be invoked within asynchronous callbacks or following any `await` statements. For more information, refer to `runInInjectionContext`.

#### Fallback strategies

When using [`RenderMode.Prerender`](api/ssr/RenderMode#Prerender 'API reference') mode, you can specify a fallback strategy to handle requests for paths that haven't been prerendered.

The available fallback strategies are:

- **Server:** Falls back to server-side rendering. This is the **default** behavior if no `fallback` property is specified.
- **Client:** Falls back to client-side rendering.
- **None:** No fallback. Angular will not handle requests for paths that are not prerendered.

```ts
// app.routes.server.ts
import {RenderMode, PrerenderFallback, ServerRoute} from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'post/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client, // Fallback to CSR if not prerendered
    async getPrerenderParams() {
      // This function returns an array of objects representing prerendered posts at the paths:
      // `/post/1`, `/post/2`, and `/post/3`.
      // The path `/post/4` will utilize the fallback behavior if it's requested.
      return [{id: 1}, {id: 2}, {id: 3}];
    },
  },
];
```

## Authoring server-compatible components

Some common browser APIs and capabilities might not be available on the server. Applications cannot make use of browser-specific global objects like `window`, `document`, `navigator`, or `location` as well as certain properties of `HTMLElement`.

In general, code which relies on browser-specific symbols should only be executed in the browser, not on the server. This can be enforced through the `afterEveryRender` and `afterNextRender` lifecycle hooks. These are only executed on the browser and skipped on the server.

```typescript
import {Component, viewChild, afterNextRender} from '@angular/core';

@Component({
  selector: 'my-cmp',
  template: `<span #content>{{ ... }}</span>`,
})
export class MyComponent {
  contentRef = viewChild.required<ElementRef>('content');

  constructor() {
    afterNextRender(() => {
      // Safe to check `scrollHeight` because this will only run in the browser, not the server.
      console.log('content height: ' + this.contentRef().nativeElement.scrollHeight);
    });
  }
}
```

NOTE: Prefer [platform-specific providers](guide/ssr#providing-platform-specific-implementations) over runtime checks with `isPlatformBrowser` or `isPlatformServer`.

IMPORTANT: Avoid using `isPlatformBrowser` in templates with `@if` or other conditionals to render different content on server and client. This causes hydration mismatches and layout shifts, negatively impacting user experience and [Core Web Vitals](https://web.dev/learn-core-web-vitals/). Instead, use `afterNextRender` for browser-specific initialization and keep rendered content consistent across platforms.

## Setting providers on the server

On the server side, top level provider values are set once when the application code is initially parsed and evaluated.
This means that providers configured with `useValue` will keep their value across multiple requests, until the server application is restarted.

If you want to generate a new value for each request, use a factory provider with `useFactory`. The factory function will run for every incoming request, ensuring that a new value is created and assigned to the token each time.

## Providing platform-specific implementations

When your application needs different behavior on the browser and server, provide separate service implementations for each platform. This approach centralizes platform logic in dedicated services.

```ts
export abstract class AnalyticsService {
  abstract trackEvent(name: string): void;
}
```

Create the browser implementation:

```ts
@Injectable()
export class BrowserAnalyticsService implements AnalyticsService {
  trackEvent(name: string): void {
    // Sends the event to the browser-based third-party analytics provider
  }
}
```

Create the server implementation:

```ts
@Injectable()
export class ServerAnalyticsService implements AnalyticsService {
  trackEvent(name: string): void {
    // Records the event on the server
  }
}
```

Register the browser implementation in your main application configuration:

```ts
// app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [{provide: AnalyticsService, useClass: BrowserAnalyticsService}],
};
```

Override with the server implementation in your server configuration:

```ts
// app.config.server.ts
const serverConfig: ApplicationConfig = {
  providers: [{provide: AnalyticsService, useClass: ServerAnalyticsService}],
};
```

Inject and use the service in your components:

```ts
@Component({
  /*...*/
})
export class Checkout {
  private analytics = inject(AnalyticsService);

  onAction() {
    this.analytics.trackEvent('action');
  }
}
```

## Accessing Document via DI

When working with server-side rendering, you should avoid directly referencing browser-specific globals like `document`. Instead, use the [`DOCUMENT`](api/core/DOCUMENT) token to access the document object in a platform-agnostic way.

```ts
import {inject, DOCUMENT, Service} from '@angular/core';

@Service()
export class CanonicalLinkService {
  private readonly document = inject(DOCUMENT);

  // During server rendering, inject a <link rel="canonical"> tag
  // so the generated HTML includes the correct canonical URL
  setCanonical(href: string): void {
    const link = this.document.createElement('link');
    link.rel = 'canonical';
    link.href = href;
    this.document.head.appendChild(link);
  }
}
```

HELPFUL: For managing meta tags, Angular provides the `Meta` service.

## Accessing Request and Response via DI

The `@angular/core` package provides several tokens for interacting with the server-side rendering environment. These tokens give you access to crucial information and objects within your Angular application during SSR.

- **[`REQUEST`](api/core/REQUEST 'API reference'):** Provides access to the current request object, which is of type [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) from the Web API. This allows you to access headers, cookies, and other request information.
- **[`RESPONSE_INIT`](api/core/RESPONSE_INIT 'API reference'):** Provides access to the response initialization options, which is of type [`ResponseInit`](https://developer.mozilla.org/en-US/docs/Web/API/Response/Response#parameters) from the Web API. This allows you to set headers and the status code for the response dynamically. Use this token to set headers or status codes that need to be determined at runtime.
- **[`REQUEST_CONTEXT`](api/core/REQUEST_CONTEXT 'API reference'):** Provides access to additional context related to the current request. This context can be passed as the second parameter of the [`handle`](api/ssr/AngularAppEngine#handle 'API reference') function. Typically, this is used to provide additional request-related information that is not part of the standard Web API.

```typescript
import {inject, REQUEST} from '@angular/core';

@Component({
  selector: 'app-my-component',
  template: `<h1>My Component</h1>`,
})
export class MyComponent {
  constructor() {
    const request = inject(REQUEST);
    console.log(request?.url);
  }
}
```

<!-- UL is used below as otherwise the list will not be include as part of the note. -->
<!-- prettier-ignore-start -->

IMPORTANT: The above tokens will be `null` in the following scenarios:<ul class="docs-list">
  <li>During the build processes.</li>
  <li>When the application is rendered in the browser (CSR).</li>
  <li>When performing static site generation (SSG).</li>
  <li>During route extraction in development (at the time of the request).</li>
</ul>

<!-- prettier-ignore-end -->

## Generate a fully static application

By default, Angular prerenders your entire application and generates a server file for handling requests. This allows your app to serve pre-rendered content to users. However, if you prefer a fully static site without a server, you can opt out of this behavior by setting the `outputMode` to `static` in your `angular.json` configuration file.

When `outputMode` is set to `static`, Angular generates pre-rendered HTML files for each route at build time, but it does not generate a server file or require a Node.js server to serve the app. This is useful for deploying to static hosting providers where a backend server is not needed.

To configure this, update your `angular.json` file as follows:

```json
{
  "projects": {
    "your-app": {
      "architect": {
        "build": {
          "options": {
            "outputMode": "static"
          }
        }
      }
    }
  }
}
```

## Caching data when using HttpClient

`HttpClient` caches outgoing network requests when running on the server. This information is serialized and transferred to the browser as part of the initial HTML sent from the server. In the browser, `HttpClient` checks whether it has data in the cache and if so, reuses it instead of making a new HTTP request during initial application rendering. `HttpClient` stops using the cache once an application becomes [stable](api/core/ApplicationRef#isStable) while running in a browser.

### Configuring the caching options

You can customize how Angular caches HTTP responses during server‑side rendering (SSR) and reuses them during hydration by configuring `HttpTransferCacheOptions`.  
This configuration is provided globally using `withHttpTransferCacheOptions` inside `provideClientHydration()`.

By default, `HttpClient` caches all `HEAD` and `GET` requests which don't contain `Authorization`, `Proxy-Authorization`, or `Cookie` headers and are not sent with `withCredentials` or Fetch API `credentials` modes that can send credentials. Angular also skips transfer cache when a request or response includes `Cache-Control` directives that forbid caching (`no-store`, `no-cache`, or `private`), or when the Fetch API `cache` option is set to `no-store` or `no-cache`. You can override the request filtering settings by using `withHttpTransferCacheOptions` in the hydration configuration.

```ts
import {bootstrapApplication} from '@angular/platform-browser';
import {provideClientHydration, withHttpTransferCacheOptions} from '@angular/platform-browser';

bootstrapApplication(App, {
  providers: [
    provideClientHydration(
      withHttpTransferCacheOptions({
        includeHeaders: ['ETag', 'Cache-Control'],
        filter: (req) => !req.url.includes('/api/profile'),
        includePostRequests: true,
        includeRequestsWithAuthHeaders: false,
      }),
    ),
  ],
});
```

---

### `includeHeaders`

Specifies which headers from the server response should be included in cached entries.  
No headers are included by default.

```ts
withHttpTransferCacheOptions({
  includeHeaders: ['ETag', 'Cache-Control'],
});
```

IMPORTANT: Avoid including sensitive headers like authentication tokens. These can leak user‑specific data between requests.

Including `Cache-Control` in `includeHeaders` only makes that header available on the hydrated response. Angular already evaluates `Cache-Control` headers automatically when deciding whether a request or response is eligible for transfer cache.

---

### `includePostRequests`

By default, only `GET` and `HEAD` requests are cached.  
You can enable caching for `POST` requests when they are used as read operations such as GraphQL queries.

```ts
withHttpTransferCacheOptions({
  includePostRequests: true,
});
```

Use this only when `POST` requests are **idempotent** and safe to reuse between server and client renders.

---

### `includeRequestsWithAuthHeaders`

Determines whether requests containing `Authorization`, `Proxy‑Authorization`, or `Cookie` headers are eligible for caching.  
By default, these are excluded to prevent caching user‑specific responses. Requests sent with `withCredentials` or Fetch API `credentials` set to `include` or `same-origin` are also excluded by default.

```ts
withHttpTransferCacheOptions({
  includeRequestsWithAuthHeaders: true,
});
```

Enable only when authentication headers do **not** affect the response content (for example, public tokens for analytics APIs).

### Per‑request overrides

You can override caching behavior for a specific request using the `transferCache` request option.

```ts
// Include specific headers for this request
http.get('/api/profile', {transferCache: {includeHeaders: ['CustomHeader']}});
```

### Disabling caching

You can disable HTTP caching of requests sent from the server either globally or individually.

#### Globally

To disable caching for all requests in your application, use the `withNoHttpTransferCache` feature:

```ts
import {
  bootstrapApplication,
  provideClientHydration,
  withNoHttpTransferCache,
} from '@angular/platform-browser';

bootstrapApplication(App, {
  providers: [provideClientHydration(withNoHttpTransferCache())],
});
```

#### Filtering

You can also selectively disable caching for certain requests using the [`filter`](api/common/http/HttpTransferCacheOptions) option in `withHttpTransferCacheOptions`. For example, you can disable caching for a specific API endpoint:

```ts
import {
  bootstrapApplication,
  provideClientHydration,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';

bootstrapApplication(App, {
  providers: [
    provideClientHydration(
      withHttpTransferCacheOptions({
        filter: (req) => !req.url.includes('/api/sensitive-data'),
      }),
    ),
  ],
});
```

Use this option to exclude endpoints with user‑specific or dynamic data (for example `/api/profile`).

#### Per-request

To disable caching for an individual request, you can specify the [`transferCache`](api/common/http/HttpRequest#transferCache) option in an `HttpRequest`.

```ts
httpClient.get('/api/sensitive-data', {transferCache: false});
```

`HttpTransferCache` does not cache requests or responses that explicitly opt out of caching. Angular skips transfer cache entries when a request includes a `Cache-Control` header with `no-store`, `no-cache`, or `private`, or when the request uses the Fetch API `cache` option set to `no-store` or `no-cache`. Responses with `Cache-Control: no-store`, `Cache-Control: no-cache`, or `Cache-Control: private` are also not stored in the transfer cache.

NOTE: If your application uses different HTTP origins to make API calls on the server and on the client, the `HTTP_TRANSFER_CACHE_ORIGIN_MAP` token allows you to establish a mapping between those origins, so that `HttpTransferCache` feature can recognize those requests as the same ones and reuse the data cached on the server during hydration on the client.

## Configuring a server

### Node.js

The `@angular/ssr/node` extends `@angular/ssr` specifically for Node.js environments. It provides APIs that make it easier to implement server-side rendering within your Node.js application. For a complete list of functions and usage examples, refer to the [`@angular/ssr/node` API reference](api/ssr/node/AngularNodeAppEngine) API reference.

```ts
// server.ts
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use('*', (req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => {
      if (response) {
        writeResponseToNodeResponse(response, res);
      } else {
        next(); // Pass control to the next middleware
      }
    })
    .catch(next);
});

/**
 * The request handler used by the Angular CLI (dev-server and during build).
 */
export const reqHandler = createNodeRequestHandler(app);
```

### Non-Node.js

The `@angular/ssr` provides essential APIs for server-side rendering your Angular application on platforms other than Node.js. It leverages the standard [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) objects from the Web API, enabling you to integrate Angular SSR into various server environments. For detailed information and examples, refer to the [`@angular/ssr` API reference](api/ssr/AngularAppEngine).

```ts
// server.ts
import {AngularAppEngine, createRequestHandler} from '@angular/ssr';

const angularApp = new AngularAppEngine();

/**
 * This is a request handler used by the Angular CLI (dev-server and during build).
 */
export const reqHandler = createRequestHandler(async (req: Request) => {
  const res: Response | null = await angularApp.render(req);

  // ...
});
```

## Security

For detailed information on preventing Server-Side Request Forgery (SSRF) and configuring allowed hosts, see the [Server-side security](best-practices/security#preventing-server-side-request-forgery-ssrf) guide.
# Hydration

## What is hydration

Hydration is the process that restores the server-side rendered application on the client. This includes things like reusing the server rendered DOM structures, persisting the application state, transferring application data that was retrieved already by the server, and other processes.

## Why is hydration important?

Hydration improves application performance by avoiding extra work to re-create DOM nodes. Instead, Angular tries to match existing DOM elements to the applications structure at runtime and reuses DOM nodes when possible. This results in a performance improvement that can be measured using [Core Web Vitals (CWV)](https://web.dev/learn-core-web-vitals/) statistics, such as reducing the First Input Delay ([FID](https://web.dev/fid/)) and Largest Contentful Paint ([LCP](https://web.dev/lcp/)), as well as Cumulative Layout Shift ([CLS](https://web.dev/cls/)). Improving these numbers also affects things like SEO performance.

Without hydration enabled, server-side rendered Angular applications will destroy and re-render the application's DOM, which may result in a visible UI flicker. This re-rendering can negatively impact [Core Web Vitals](https://web.dev/learn-core-web-vitals/) like [LCP](https://web.dev/lcp/) and cause a layout shift. Enabling hydration allows the existing DOM to be re-used and prevents a flicker.

## How do you enable hydration in Angular

Hydration can be enabled for server-side rendered (SSR) applications only. Follow the [Angular SSR Guide](guide/ssr) to enable server-side rendering first.

### Using Angular CLI

If you've used Angular CLI to enable SSR (either by enabling it during application creation or later via `ng add @angular/ssr`), the code that enables hydration should already be included into your application.

### Manual setup

If you have a custom setup and didn't use Angular CLI to enable SSR, you can enable hydration manually by visiting your main application component or module and importing `provideClientHydration` from `@angular/platform-browser`. You'll then add that provider to your app's bootstrapping providers list.

```typescript
import {
  bootstrapApplication,
  provideClientHydration,
} from '@angular/platform-browser';
...

bootstrapApplication(App, {
  providers: [provideClientHydration()]
});
```

Alternatively if you are using NgModules, you would add `provideClientHydration` to your root app module's provider list.

```typescript
import {provideClientHydration} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

@NgModule({
  declarations: [App],
  exports: [App],
  bootstrap: [App],
  providers: [provideClientHydration()],
})
export class AppModule {}
```

IMPORTANT: Make sure that the `provideClientHydration()` call is also included into a set of providers that is used to bootstrap an application on the **server**. In applications with the default project structure (generated by the `ng new` command), adding a call to the root `AppModule` should be sufficient, since this module is imported by the server module. If you use a custom setup, add the `provideClientHydration()` call to the providers list in the server bootstrap configuration.

### Verify that hydration is enabled

After you've configured hydration and have started up your server, load your application in the browser.

HELPFUL: You will likely need to fix instances of Direct DOM Manipulation before hydration will fully work either by switching to Angular constructs or by using `ngSkipHydration`. See [Constraints](#constraints), [Direct DOM Manipulation](#direct-dom-manipulation), and [How to skip hydration for particular components](#how-to-skip-hydration-for-particular-components) for more details.

While running an application in dev mode, you can confirm hydration is enabled by opening the Developer Tools in your browser and viewing the console. You should see a message that includes hydration-related stats, such as the number of components and nodes hydrated. Angular calculates the stats based on all components rendered on a page, including those that come from third-party libraries.

You can also use [Angular DevTools browser extension](tools/devtools) to see hydration status of components on a page. Angular DevTools also allows to enable an overlay to indicate which parts of the page were hydrated. If there is a hydration mismatch error - DevTools would also highlight a component that caused the error.

## Capturing and replaying events

When an application is rendered on the server, it is visible in a browser as soon as produced HTML loads. Users may assume that they can interact with the page, but event listeners are not attached until hydration completes. Starting from v18, you can enable the Event Replay feature that allows to capture all events that happen before hydration and replay those events once hydration has completed. You can enable it using the `withEventReplay()` function, for example:

```typescript
import {provideClientHydration, withEventReplay} from '@angular/platform-browser';

bootstrapApplication(App, {
  providers: [provideClientHydration(withEventReplay())],
});
```

### How event replay works

Event Replay is a feature that improves user experience by capturing user events that were triggered before the hydration process is complete. Then those events are replayed, ensuring none of that interaction was lost.

The Event Replay is divided into three main phases:

- **Capturing user interactions**<br>
  Prior to **Hydration**, Event Replay captures and stores all interactions that the user may perform, such as clicks and other browser native events.

- **Storing events**<br>
  The **Event Contract** keeps in memory all the interactions recorded in the previous step, ensuring that they are not lost for later replay.

- **Relaunch of events**<br>
  Once **Hydration** is complete, Angular re-invokes the captured events.

Event replay supports _native browser events_, for example `click`, `mouseover`, and `focusin`. If you'd like to learn more about JSAction, the library that powers event replay, you can read more [on the readme](https://github.com/angular/angular/tree/main/packages/core/primitives/event-dispatch#readme).

---

This feature ensures a consistent user experience, preventing user actions performed before Hydration from being ignored.

NOTE: If you have [incremental hydration](guide/incremental-hydration) enabled, event replay is automatically enabled under the hood.

## Constraints

Hydration imposes a few constraints on your application that are not present without hydration enabled. Your application must have the same generated DOM structure on both the server and the client. The process of hydration expects the DOM tree to have the same structure in both places. This also includes whitespaces and comment nodes that Angular produces during the rendering on the server. Those whitespaces and nodes must be present in the HTML generated by the server-side rendering process.

IMPORTANT: The HTML produced by the server side rendering operation **must not** be altered between the server and the client.

If there is a mismatch between server and client DOM tree structures, the hydration process will encounter problems attempting to match up what was expected to what is actually present in the DOM. Components that do direct DOM manipulation using native DOM APIs are the most common culprit.

### Direct DOM Manipulation

If you have components that manipulate the DOM using native DOM APIs or use `innerHTML` or `outerHTML`, the hydration process will encounter errors. Specific cases where DOM manipulation is a problem are situations like accessing the `document`, querying for specific elements, and injecting additional nodes using `appendChild`. Detaching DOM nodes and moving them to other locations will also result in errors.

This is because Angular is unaware of these DOM changes and cannot resolve them during the hydration process. Angular will expect a certain structure, but it will encounter a different structure when attempting to hydrate. This mismatch will result in hydration failure and throw a DOM mismatch error ([see below](#errors)).

It is best to refactor your component to avoid this sort of DOM manipulation. Try to use Angular APIs to do this work, if you can. If you cannot refactor this behavior, use the `ngSkipHydration` attribute ([described below](#how-to-skip-hydration-for-particular-components)) until you can refactor into a hydration friendly solution.

### Valid HTML structure

There are a few cases where if you have a component template that does not have valid HTML structure, this could result in a DOM mismatch error during hydration.

As an example, here are some of the most common cases of this issue.

- `<table>` without a `<tbody>`
- `` inside a `<p>`
- `<a>` inside another `<a>`

If you are uncertain about whether your HTML is valid, you can use a [syntax validator](https://validator.w3.org/) to check it.

NOTE: While the HTML standard does not require the `<tbody>` element inside tables, modern browsers automatically create a `<tbody>` element in tables that do not declare one. Because of this inconsistency, always explicitly declare a `<tbody>` element in tables to avoid hydration errors.

### Preserve Whitespaces Configuration

When using the hydration feature, we recommend using the default setting of `false` for `preserveWhitespaces`. If this setting is not in your tsconfig, the value will be `false` and no changes are required. If you choose to enable preserving whitespaces by adding `preserveWhitespaces: true` to your tsconfig, it is possible you may encounter issues with hydration. This is not yet a fully supported configuration.

HELPFUL: Make sure that this setting is set **consistently** in `tsconfig.server.json` for your server and `tsconfig.app.json` for your browser builds. A mismatched value will cause hydration to break.

If you choose to set this setting in your tsconfig, we recommend to set it only in `tsconfig.app.json` which by default the `tsconfig.server.json` will inherit it from.

### Custom or Noop Zone.js are not yet supported

Hydration relies on a signal from Zone.js when it becomes stable inside an application, so that Angular can start the serialization process on the server or post-hydration cleanup on the client to remove DOM nodes that remained unclaimed.

Providing a custom or a "noop" Zone.js implementation may lead to a different timing of the "stable" event, thus triggering the serialization or the cleanup too early or too late. This is not yet a fully supported configuration and you may need to adjust the timing of the `onStable` event in the custom Zone.js implementation.

## Errors

There are several hydration related errors you may encounter ranging from node mismatches to cases when the `ngSkipHydration` was used on an invalid host node. The most common error case that may occur is due to direct DOM manipulation using native APIs that results in hydration being unable to find or match the expected DOM tree structure on the client that was rendered by the server. The other case you may encounter this type of error was mentioned in the [Valid HTML structure](#valid-html-structure) section earlier. So, make sure the HTML in your templates is using valid structure, and you'll avoid that error case.

For a full reference on hydration related errors, visit the [Errors Reference Guide](/errors).

## How to skip hydration for particular components

Some components may not work properly with hydration enabled due to some of the aforementioned issues, like [Direct DOM Manipulation](#direct-dom-manipulation). As a workaround, you can add the `ngSkipHydration` attribute to a component's tag in order to skip hydrating the entire component.

```html
<app-example ngSkipHydration />
```

Alternatively you can set `ngSkipHydration` as a host binding.

```typescript
@Component({
  ...
  host: {ngSkipHydration: 'true'},
})
class ExampleComponent {}
```

The `ngSkipHydration` attribute will force Angular to skip hydrating the entire component and its children. Using this attribute means that the component will behave as if hydration is not enabled, meaning it will destroy and re-render itself.

HELPFUL: This will fix rendering issues, but it means that for this component (and its children), you don't get the benefits of hydration. You will need to adjust your component's implementation to avoid hydration-breaking patterns (i.e. Direct DOM Manipulation) to be able to remove the skip hydration annotation.

The `ngSkipHydration` attribute can only be used on component host nodes. Angular throws an error if this attribute is added to other nodes.

Keep in mind that adding the `ngSkipHydration` attribute to your root application component would effectively disable hydration for your entire application. Be careful and thoughtful about using this attribute. It is intended as a last resort workaround. Components that break hydration should be considered bugs that need to be fixed.

## Hydration Timing and Application Stability

Application stability is an important part of the hydration process. Hydration and any post-hydration processes only occur once the application has reported stability. There are a number of ways that stability can be delayed. Examples include setting timeouts and intervals, unresolved promises, and pending microtasks. In those cases, you may encounter the [Application remains unstable](errors/NG0506) error, which indicates that your app has not yet reached the stable state after 10 seconds. If you're finding that your application is not hydrating right away, take a look at what is impacting application stability and refactor to avoid causing these delays.

### Debugging Application Stability

The `provideStabilityDebugging` utility helps identify why your application fails to stabilize. This utility is provided by default in dev mode when using `provideClientHydration`. You can also add it manually to the application providers for use in production bundles or when using SSR without hydration, for example. The feature logs information to the console if the application takes longer than expected to stabilize.

```typescript
import {provideStabilityDebugging} from '@angular/core';
import {bootstrapApplication} from '@angular/platform-browser';
import 'zone.js/plugins/task-tracking'; // Use if you have Zone.js with `provideZoneChangeDetection`

bootstrapApplication(App, {
  providers: [provideStabilityDebugging()],
});
```

When enabled, the utility logs pending tasks (`PendingTasks`) to the console. If your application uses Zone.js, you can also import `zone.js/plugins/task-tracking` to see which macrotasks are keeping the Angular Zone from stabilizing. This plugin provides the stack trace of the macrotask creation, effectively helping you identify the source of the delay.

IMPORTANT: Angular does not remove the zone.js task tracking plugin or this utility from production bundles. Use them only for temporary debugging of stability issues during development, including for optimized production builds.

## I18N

HELPFUL: By default, Angular will skip hydration for components that use i18n blocks, effectively re-rendering those components from scratch.

To enable hydration for i18n blocks, you can add [`withI18nSupport`](/api/platform-browser/withI18nSupport) to your `provideClientHydration` call.

```typescript
import {
  bootstrapApplication,
  provideClientHydration,
  withI18nSupport,
} from '@angular/platform-browser';
...

bootstrapApplication(App, {
  providers: [provideClientHydration(withI18nSupport())]
});
```

## Consistent rendering across server-side and client-side

Avoid introducing `@if` blocks and other conditionals that display different content when server-side rendering than client-side rendering, such as using an `@if` block with Angular's `isPlatformBrowser` function. These rendering differences cause layout shifts, negatively impacting end-user experience and core web vitals.

## Third Party Libraries with DOM Manipulation

There are a number of third party libraries that depend on DOM manipulation to be able to render. D3 charts is a prime example. These libraries worked without hydration, but they may cause DOM mismatch errors when hydration is enabled. For now, if you encounter DOM mismatch errors using one of these libraries, you can add the `ngSkipHydration` attribute to the component that renders using that library.

## Third Party Scripts with DOM Manipulation

Many third party scripts, such as ad trackers and analytics, modify the DOM before hydration can occur. These scripts may cause hydration errors because the page no longer matches the structure expected by Angular. Prefer deferring this type of script until after hydration whenever possible. Consider using [`AfterNextRender`](api/core/afterNextRender) to delay the script until post-hydration processes have occurred.

## Incremental Hydration

Incremental hydration is an advanced form of hydration that allows for more granular control over when hydration happens. See the [incremental hydration guide](guide/incremental-hydration) for more information.
# Incremental Hydration

**Incremental hydration** is an advanced type of [hydration](guide/hydration) that can leave sections of your application dehydrated and _incrementally_ trigger hydration of those sections as they are needed.

## Why use incremental hydration?

Incremental hydration is a performance improvement that builds on top of full application hydration. It can produce smaller initial bundles while still providing an end-user experience that is comparable to a full application hydration experience. Smaller bundles improve initial load times, reducing [First Input Delay (FID)](https://web.dev/fid) and [Cumulative Layout Shift (CLS)](https://web.dev/cls).

Incremental hydration also lets you use deferrable views (`@defer`) for content that may not have been deferrable before. Specifically, you can now use deferrable views for content that is above the fold. Prior to incremental hydration, putting a `@defer` block above the fold would result in placeholder content rendering and then being replaced by the `@defer` block's main template content. This would result in a layout shift. Incremental hydration means the main template of the `@defer` block will render with no layout shift on hydration.

## How do you enable incremental hydration in Angular?

You can enable incremental hydration for applications that already use server-side rendering (SSR) with hydration. Follow the [Angular SSR Guide](guide/ssr) to enable server-side rendering and the [Angular Hydration Guide](guide/hydration) to enable hydration first.

Incremental hydration is enabled by default when you use `provideClientHydration()`.

```ts
import {bootstrapApplication, provideClientHydration} from '@angular/platform-browser';

bootstrapApplication(App, {
  providers: [provideClientHydration()],
});
```

NOTE: Incremental Hydration depends on and enables [event replay](guide/hydration#capturing-and-replaying-events) automatically. If you already have `withEventReplay()` in your list, you can safely remove it.

To opt out of incremental hydration, use `withNoIncrementalHydration()`:

```ts
import {
  bootstrapApplication,
  provideClientHydration,
  withNoIncrementalHydration,
} from '@angular/platform-browser';

bootstrapApplication(App, {
  providers: [provideClientHydration(withNoIncrementalHydration())],
});
```

## How does incremental hydration work?

Incremental hydration builds on top of full-application [hydration](guide/hydration), [deferrable views](/guide/templates/defer), and [event replay](guide/hydration#capturing-and-replaying-events). With incremental hydration, you can add additional triggers to `@defer` blocks that define incremental hydration boundaries. Adding a `hydrate` trigger to a defer block tells Angular that it should load that defer block's dependencies during server-side rendering and render the main template rather than the `@placeholder`. When client-side rendering, the dependencies are still deferred, and the defer block content stays dehydrated until its `hydrate` trigger fires. That trigger tells the defer block to fetch its dependencies and hydrate the content. Any browser events, specifically those that match listeners registered in your component, that are triggered by the user prior to hydration are queued up and replayed once the hydration process is complete.

## Controlling hydration of content with triggers

You can specify **hydrate triggers** that control when Angular loads and hydrates deferred content. These are additional triggers that can be used alongside regular `@defer` triggers.

Each `@defer` block may have multiple hydrate event triggers, separated with a semicolon (`;`). Angular triggers hydration when _any_ of the triggers fire.

There are three types of hydrate triggers: `hydrate on`, `hydrate when`, and `hydrate never`.

### `hydrate on`

`hydrate on` specifies a condition for when hydration is triggered for the `@defer` block.

The available triggers are as follows:

| Trigger                                             | Description                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| [`hydrate on idle`](#hydrate-on-idle)               | Triggers when the browser is idle. Supports an optional timeout.       |
| [`hydrate on viewport`](#hydrate-on-viewport)       | Triggers when specified content enters the viewport                    |
| [`hydrate on interaction`](#hydrate-on-interaction) | Triggers when the user interacts with specified element                |
| [`hydrate on hover`](#hydrate-on-hover)             | Triggers when the mouse hovers over specified area                     |
| [`hydrate on immediate`](#hydrate-on-immediate)     | Triggers immediately after non-deferred content has finished rendering |
| [`hydrate on timer`](#hydrate-on-timer)             | Triggers after a specific duration                                     |

#### `hydrate on idle`

The `hydrate on idle` trigger loads the deferrable view's dependencies and hydrates the content once the browser has reached an idle state, based on `requestIdleCallback`.

You can optionally specify a timeout in milliseconds that is passed to [`requestIdleCallback`](https://developer.mozilla.org/docs/Web/API/Window/requestIdleCallback). If the browser doesn't schedule the callback soon enough, the work will run no later than the specified timeout.

```html
@defer (hydrate on idle) {
  <large-cmp />
} @placeholder {
  Large component placeholder}

<!-- With a 500ms timeout -->
@defer (hydrate on idle(500)) {
  <large-cmp />
}
```

#### `hydrate on viewport`

The `hydrate on viewport` trigger loads the deferrable view's dependencies and hydrates the corresponding page of the app when the specified content enters the viewport using the
[Intersection Observer API](https://developer.mozilla.org/docs/Web/API/Intersection_Observer_API).

```html
@defer (hydrate on viewport) {
  <large-cmp />
} @placeholder {
  Large component placeholder}
```

#### `hydrate on interaction`

The `hydrate on interaction` trigger loads the deferrable view's dependencies and hydrates the content when the user interacts with the specified element through
`click` or `keydown` events.

```html
@defer (hydrate on interaction) {
  <large-cmp />
} @placeholder {
  Large component placeholder}
```

#### `hydrate on hover`

The `hydrate on hover` trigger loads the deferrable view's dependencies and hydrates the content when the mouse has hovered over the triggered area through the
`mouseover` and `focusin` events.

```html
@defer (hydrate on hover) {
  <large-cmp />
} @placeholder {
  Large component placeholder}
```

#### `hydrate on immediate`

The `hydrate on immediate` trigger loads the deferrable view's dependencies and hydrates the content immediately. This means that the deferred block loads as soon
as all other non-deferred content has finished rendering.

```html
@defer (hydrate on immediate) {
  <large-cmp />
} @placeholder {
  Large component placeholder}
```

#### `hydrate on timer`

The `hydrate on timer` trigger loads the deferrable view's dependencies and hydrates the content after a specified duration.

```html
@defer (hydrate on timer(500ms)) {
  <large-cmp />
} @placeholder {
  Large component placeholder}
```

The duration parameter must be specified in milliseconds (`ms`) or seconds (`s`).

### `hydrate when`

The `hydrate when` trigger accepts a custom conditional expression and loads the deferrable view's dependencies and hydrates the content when the
condition becomes truthy.

```html
@defer (hydrate when condition) {
  <large-cmp />
} @placeholder {
  Large component placeholder}
```

NOTE: `hydrate when` conditions only trigger when they are the top-most dehydrated `@defer` block. The condition provided for the trigger is
specified in the parent component, which needs to exist before it can be triggered. If the parent block is dehydrated, that expression will not yet
be resolvable by Angular.

### `hydrate never`

The `hydrate never` allows users to specify that the content in the defer block should remain dehydrated indefinitely, effectively becoming static
content. Note that this applies to the initial render only. During a subsequent client-side render, a `@defer` block with `hydrate never` would
still fetch dependencies, as hydration only applies to initial load of server-side rendered content. In the example below, subsequent client-side
renders would load the `@defer` block dependencies on viewport.

```html
@defer (on viewport; hydrate never) {
  <large-cmp />
} @placeholder {
  Large component placeholder}
```

NOTE: Using `hydrate never` prevents hydration of the entire nested subtree of a given `@defer` block. No other `hydrate` triggers fire for content nested underneath that block.

## Hydrate triggers alongside regular triggers

Hydrate triggers are additional triggers that are used alongside regular triggers on a `@defer` block. Hydration is an initial load optimization, and that means hydrate triggers only apply to that initial load. Any subsequent client side render will still use the regular trigger.

```html
@defer (on idle; hydrate on interaction) {
  <example-cmp />
} @placeholder {
  Example Placeholder}
```

In this example, on the initial load, the `hydrate on interaction` applies. Hydration will be triggered on interaction with the `<example-cmp />` component. On any subsequent page load that is client-side rendered, for example when a user clicks a routerLink that loads a page with this component, the `on idle` will apply.

## How does incremental hydration work with nested `@defer` blocks?

Angular's component and dependency system is hierarchical, which means hydrating any component requires all of its parents also be hydrated. So if hydration is triggered for a child `@defer` block of a nested set of dehydrated `@defer` blocks, hydration is triggered from the top-most dehydrated `@defer` block down to the triggered child and fire in that order.

```html
@defer (hydrate on interaction) {
  <parent-block-cmp />
  @defer (hydrate on hover) {
    <child-block-cmp />
  } @placeholder {
    Child placeholder}
} @placeholder {
  Parent Placeholder}
```

In the above example, hovering over the nested `@defer` block triggers hydration. The parent `@defer` block with the `<parent-block-cmp />` hydrates first, then the child `@defer` block with `<child-block-cmp />` hydrates after.

## Constraints

Incremental hydration has the same constraints as full-application hydration, including limits on direct DOM manipulation and requiring valid HTML structure. Visit the [Hydration guide constraints](guide/hydration#constraints) section for more details.

## Do I still need to specify `@placeholder` blocks?

Yes. `@placeholder` block content is not used for incremental hydration, but a `@placeholder` is still necessary for subsequent client-side rendering cases. If your content was not on the route that was part of the initial load, then any navigation to the route that has your `@defer` block content renders like a regular `@defer` block. So the `@placeholder` is rendered in those client-side rendering cases.
