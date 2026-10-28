# Setting up `HttpClient`

## Table of Contents

- **[Setting up `HttpClient`](#setting-up-httpclient)**
  - [Providing `HttpClient` through dependency injection](#providing-httpclient-through-dependency-injection)
  - [Configuring features of `HttpClient`](#configuring-features-of-httpclient)
  - [`HttpClientModule`-based configuration](#httpclientmodule-based-configuration)
- **[Making HTTP requests](#making-http-requests)**
  - [Fetching JSON data](#fetching-json-data)
  - [Fetching other types of data](#fetching-other-types-of-data)
  - [Mutating server state](#mutating-server-state)
  - [Setting URL parameters](#setting-url-parameters)
  - [Setting request headers](#setting-request-headers)
  - [Interacting with the server response events](#interacting-with-the-server-response-events)
  - [Receiving raw progress events](#receiving-raw-progress-events)
  - [Handling request failure](#handling-request-failure)
  - [Advanced fetch options](#advanced-fetch-options)
  - [HTTP `Observable`s](#http-observables)
  - [Best practices](#best-practices)
- **[Interceptors](#interceptors)**
  - [Interceptors](#interceptors)
  - [Defining an interceptor](#defining-an-interceptor)
  - [Configuring interceptors](#configuring-interceptors)
  - [Modifying requests](#modifying-requests)
  - [Dependency injection in interceptors](#dependency-injection-in-interceptors)
  - [Request and response metadata](#request-and-response-metadata)
  - [Synthetic responses](#synthetic-responses)
  - [Working with redirect information](#working-with-redirect-information)
  - [Working with response types](#working-with-response-types)
  - [DI-based interceptors](#di-based-interceptors)
- **[Test requests](#test-requests)**
  - [Setup for testing](#setup-for-testing)
  - [Expecting and answering requests](#expecting-and-answering-requests)
  - [Handling more than one request at once](#handling-more-than-one-request-at-once)
  - [Advanced matching](#advanced-matching)
  - [Testing error handling](#testing-error-handling)
  - [Testing an Interceptor](#testing-an-interceptor)

---


Before you can use `HttpClient` in your app, you must configure it using [dependency injection](guide/di).

## Providing `HttpClient` through dependency injection

`HttpClient` is provided using the `provideHttpClient` helper function, which most apps include in the application `providers` in `app.config.ts`.

```ts
export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient()],
};
```

If your app is using NgModule-based bootstrap instead, you can include `provideHttpClient` in the providers of your app's NgModule:

```ts
@NgModule({
  providers: [provideHttpClient()],
  // ... other application configuration
})
export class AppModule {}
```

You can then inject the `HttpClient` service as a dependency of your components, services, or other classes:

```ts
@Service()
export class ConfigService {
  private http = inject(HttpClient);
  // This service can now make HTTP requests via `this.http`.
}
```

## Configuring features of `HttpClient`

`provideHttpClient` accepts a list of optional feature configurations to enable or configure different aspects of the client. This section details the optional features and their usage.

### `withXhr`

```ts
export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withXhr())],
};
```

By default, `HttpClient` uses the [`fetch`](https://developer.mozilla.org/docs/Web/API/Fetch_API) API to make requests. The `withXhr` feature switches the client to use the [`XMLHttpRequest`](https://developer.mozilla.org/docs/Web/API/XMLHttpRequest) API instead.

`fetch` is a more modern API and is available in a few environments where `XMLHttpRequest` is not supported. It does have a few limitations, such as not producing upload progress events.
XHR support on the server is **deprecated** and is intended to be removed in Angular 23. The underlying `xhr2` library does not safely handle redirects: it can forward `Authorization` headers on cross-origin redirects and is susceptible to denial-of-service (DoS) via redirect loops. For SSR applications, use the default `fetch` backend instead.
### `withInterceptors(...)`

`withInterceptors` configures the set of interceptor functions which will process requests made through `HttpClient`. See the [interceptor guide](guide/http/interceptors) for more information.

### `withInterceptorsFromDi()`

`withInterceptorsFromDi` includes the older style of class-based interceptors in the `HttpClient` configuration. See the [interceptor guide](guide/http/interceptors) for more information.

HELPFUL: Functional interceptors (through `withInterceptors`) have more predictable ordering and we recommend them over DI-based interceptors.

### `withRequestsMadeViaParent()`

By default, when you configure `HttpClient` using `provideHttpClient` within a given injector, this configuration overrides any configuration for `HttpClient` which may be present in the parent injector.

When you add `withRequestsMadeViaParent()`, `HttpClient` is configured to instead pass requests up to the `HttpClient` instance in the parent injector, once they've passed through any configured interceptors at this level. This is useful if you want to _add_ interceptors in a child injector while still sending the request through the parent injector's interceptors.

CRITICAL: You must configure an instance of `HttpClient` above the current injector, or this option is not valid and you'll get a runtime error when you try to use it.

### `withJsonpSupport()`

Including `withJsonpSupport` enables the `.jsonp()` method on `HttpClient`, which makes a GET request via the [JSONP convention](https://en.wikipedia.org/wiki/JSONP) for cross-domain loading of data.

HELPFUL: Prefer using [CORS](https://developer.mozilla.org/docs/Web/HTTP/CORS) to make cross-domain requests instead of JSONP when possible.

### `withXsrfConfiguration(...)`

Including this option allows customization of `HttpClient`'s built-in XSRF security functionality. See the [security guide](best-practices/security) for more information.

### `withNoXsrfProtection()`

Including this option disables `HttpClient`'s built-in XSRF security functionality. See the [security guide](best-practices/security) for more information.

## `HttpClientModule`-based configuration

Some applications may configure `HttpClient` using the older API based on NgModules.

This table lists the NgModules available from `@angular/common/http` and how they relate to the provider configuration functions above.

| **NgModule**                            | `provideHttpClient()` equivalent                         |
| --------------------------------------- | -------------------------------------------------------- |
| `HttpClientModule`                      | `provideHttpClient(withInterceptorsFromDi(), withXhr())` |
| `HttpClientJsonpModule`                 | `withJsonpSupport()`                                     |
| `HttpClientXsrfModule.withOptions(...)` | `withXsrfConfiguration(...)`                             |
| `HttpClientXsrfModule.disable()`        | `withNoXsrfProtection()`                                 |
When `HttpClientModule` is present in multiple injectors, the behavior of interceptors is poorly defined and depends on the exact options and provider/import ordering.

Prefer `provideHttpClient` for multi-injector configurations, as it has more stable behavior. See the `withRequestsMadeViaParent` feature above.

# Making HTTP requests

`HttpClient` has methods corresponding to the different HTTP verbs used to make requests, both to load data and to apply mutations on the server. Each method returns an [RxJS `Observable`](https://rxjs.dev/guide/observable) which, when subscribed, sends the request and then emits the results when the server responds.

NOTE: `Observable`s created by `HttpClient` may be subscribed any number of times and will make a new backend request for each subscription.

Through an options object passed to the request method, various properties of the request and the returned response type can be adjusted.

## Fetching JSON data

Fetching data from a backend often requires making a GET request using the [`HttpClient.get()`](api/common/http/HttpClient#get) method. This method takes two arguments: the string endpoint URL from which to fetch, and an _optional options_ object to configure the request.

For example, to fetch configuration data from a hypothetical API using the `HttpClient.get()` method:

```ts
http.get<Config>('/api/config').subscribe((config) => {
  // process the configuration.
});
```

Note the generic type argument which specifies that the data returned by the server will be of type `Config`. This argument is optional, and if you omit it, the returned data will have type `Object`.

TIP: When dealing with data of uncertain structure and potential `undefined` or `null` values, consider using the `unknown` type instead of `Object` as the response type.

CRITICAL: The generic type of request methods is a type **assertion** about the data returned by the server. `HttpClient` does not verify that the actual return data matches this type.

## Fetching other types of data

By default, `HttpClient` assumes that servers will return JSON data. When interacting with a non-JSON API, you can tell `HttpClient` what response type to expect when making the request. This is done with the `responseType` option.

| **`responseType` value** | **Returned response type**                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `'json'` (default)       | JSON data of the given generic type                                                                                                       |
| `'text'`                 | string data                                                                                                                               |
| `'arraybuffer'`          | [`ArrayBuffer`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) containing the raw response bytes |
| `'blob'`                 | [`Blob`](https://developer.mozilla.org/docs/Web/API/Blob) instance                                                                        |

For example, you can ask `HttpClient` to download the raw bytes of a `.jpeg` image into an `ArrayBuffer`:

```ts
http.get('/images/dog.jpg', {responseType: 'arraybuffer'}).subscribe((buffer) => {
  console.log('The image is ' + buffer.byteLength + ' bytes large');
});
```
Because the value of `responseType` affects the type returned by `HttpClient`, it must have a literal type and not a `string` type.

This happens automatically if the options object passed to the request method is a literal object, but if you're extracting the request options out into a variable or helper method you might need to explicitly specify it as a literal, such as `responseType: 'text' as const`.
## Mutating server state

Server APIs that perform mutations often require making POST requests with a request body specifying the new state or the change to be made.

The [`HttpClient.post()`](api/common/http/HttpClient#post) method behaves similarly to `get()`, and accepts an additional `body` argument before its options:

```ts
http.post<Config>('/api/config', newConfig).subscribe((config) => {
  console.log('Updated config:', config);
});
```

Many different types of values can be provided as the request's `body`, and `HttpClient` will serialize them accordingly:

| **`body` type**                                                                                                               | **Serialized as**                                    |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| string                                                                                                                        | Plain text                                           |
| number, boolean, array, or plain object                                                                                       | JSON                                                 |
| [`ArrayBuffer`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)                       | raw data from the buffer                             |
| [`Blob`](https://developer.mozilla.org/docs/Web/API/Blob)                                                                     | raw data with the `Blob`'s content type              |
| [`FormData`](https://developer.mozilla.org/docs/Web/API/FormData)                                                             | `multipart/form-data` encoded data                   |
| [`HttpParams`](api/common/http/HttpParams) or [`URLSearchParams`](https://developer.mozilla.org/docs/Web/API/URLSearchParams) | `application/x-www-form-urlencoded` formatted string |

IMPORTANT: Remember to `.subscribe()` to mutation request `Observable`s in order to actually fire the request.

## Setting URL parameters

Specify request parameters that should be included in the request URL using the `params` option.

Passing an object literal is the simplest way of configuring URL parameters:

```ts
http
  .get('/api/config', {
    params: {filter: 'all'},
  })
  .subscribe((config) => {
    // ...
  });
```

Alternatively, pass an instance of `HttpParams` if you need more control over the construction or serialization of the parameters.

IMPORTANT: Instances of `HttpParams` are _immutable_ and cannot be directly changed. Instead, mutation methods such as `append()` return a new instance of `HttpParams` with the mutation applied.

```ts
const baseParams = new HttpParams().set('filter', 'all');

http
  .get('/api/config', {
    params: baseParams.set('details', 'enabled'),
  })
  .subscribe((config) => {
    // ...
  });
```

You can instantiate `HttpParams` with a custom `HttpParameterCodec` that determines how `HttpClient` will encode the parameters into the URL.

### Custom parameter encoding

By default, `HttpParams` uses the built-in [`HttpUrlEncodingCodec`](api/common/http/HttpUrlEncodingCodec) to encode and decode parameter keys and values.

You can provide your own implementation of [`HttpParameterCodec`](api/common/http/HttpParameterCodec) to customize how encoding and decoding are applied.

```ts
import {HttpClient, HttpParams, HttpParameterCodec} from '@angular/common/http';
import {inject} from '@angular/core';

export class CustomHttpParamEncoder implements HttpParameterCodec {
  encodeKey(key: string): string {
    return encodeURIComponent(key);
  }

  encodeValue(value: string): string {
    return encodeURIComponent(value);
  }

  decodeKey(key: string): string {
    return decodeURIComponent(key);
  }

  decodeValue(value: string): string {
    return decodeURIComponent(value);
  }
}

export class ApiService {
  private http = inject(HttpClient);

  search() {
    const params = new HttpParams({
      encoder: new CustomHttpParamEncoder(),
    })
      .set('email', 'dev+alerts@example.com')
      .set('q', 'a & b? c/d = e');

    return this.http.get('/api/items', {params});
  }
}
```

## Setting request headers

Specify request headers that should be included in the request using the `headers` option.

Passing an object literal is the simplest way of configuring request headers:

```ts
http
  .get('/api/config', {
    headers: {
      'X-Debug-Level': 'verbose',
    },
  })
  .subscribe((config) => {
    // ...
  });
```

Alternatively, pass an instance of `HttpHeaders` if you need more control over the construction of headers.

IMPORTANT: Instances of `HttpHeaders` are _immutable_ and cannot be directly changed. Instead, mutation methods such as `append()` return a new instance of `HttpHeaders` with the mutation applied.

```ts
const baseHeaders = new HttpHeaders().set('X-Debug-Level', 'minimal');

http
  .get<Config>('/api/config', {
    headers: baseHeaders.set('X-Debug-Level', 'verbose'),
  })
  .subscribe((config) => {
    // ...
  });
```

## Interacting with the server response events

For convenience, `HttpClient` by default returns an `Observable` of the data returned by the server (the response body). Occasionally it's desirable to examine the actual response, for example to retrieve specific response headers.

To access the entire response, set the `observe` option to `'response'`:

```ts
http.get<Config>('/api/config', {observe: 'response'}).subscribe((res) => {
  console.log('Response status:', res.status);
  console.log('Body:', res.body);
});
```
Because the value of `observe` affects the type returned by `HttpClient`, it must have a literal type and not a `string` type.

This happens automatically if the options object passed to the request method is a literal object, but if you're extracting the request options out into a variable or helper method you might need to explicitly specify it as a literal, such as `observe: 'response' as const`.
## Receiving raw progress events

In addition to the response body or response object, `HttpClient` can also return a stream of raw _events_ corresponding to specific moments in the request lifecycle. These events include when the request is sent, when the response header is returned, and when the body is complete. These events can also include _progress events_ that report upload and download status for large request or response bodies.

Progress events are disabled by default (as they have a performance cost) but can be enabled with the `reportProgress` option.

NOTE: The default fetch backend of `HttpClient` does not report _upload_ progress events. If your app needs upload progress events, configure `HttpClient` with `withXhr()` in `provideHttpClient(...)`.

To observe the event stream, set the `observe` option to `'events'`:

```ts
http
  .post('/api/upload', myData, {
    reportProgress: true,
    observe: 'events',
  })
  .subscribe((event) => {
    switch (event.type) {
      case HttpEventType.UploadProgress:
        console.log('Uploaded ' + event.loaded + ' out of ' + event.total + ' bytes');
        break;
      case HttpEventType.Response:
        console.log('Finished uploading!');
        break;
    }
  });
```
Because the value of `observe` affects the type returned by `HttpClient`, it must have a literal type and not a `string` type.

This happens automatically if the options object passed to the request method is a literal object, but if you're extracting the request options out into a variable or helper method you might need to explicitly specify it as a literal, such as `observe: 'events' as const`.
Each `HttpEvent` reported in the event stream has a `type` which distinguishes what the event represents:

| **`type` value**                 | **Event meaning**                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `HttpEventType.Sent`             | The request has been dispatched to the server                                      |
| `HttpEventType.UploadProgress`   | An `HttpUploadProgressEvent` reporting progress on uploading the request body      |
| `HttpEventType.ResponseHeader`   | The head of the response has been received, including status and headers           |
| `HttpEventType.DownloadProgress` | An `HttpDownloadProgressEvent` reporting progress on downloading the response body |
| `HttpEventType.Response`         | The entire response has been received, including the response body                 |
| `HttpEventType.User`             | A custom event from an HTTP interceptor.                                           |

## Handling request failure

There are three ways an HTTP request can fail:

- A network or connection error can prevent the request from reaching the backend server.
- A request didn't respond in time when the timeout option was set.
- The backend can receive the request but fail to process it, and return an error response.

`HttpClient` captures all of the above kinds of errors in an `HttpErrorResponse` which it returns through the `Observable`'s error channel. Network and timeout errors have a `status` code of `0` and an `error` which is an instance of [`ProgressEvent`](https://developer.mozilla.org/docs/Web/API/ProgressEvent). Backend errors have the failing `status` code returned by the backend, and the error response as the `error`. Inspect the response to identify the error's cause and the appropriate action to handle the error.

The [RxJS library](https://rxjs.dev/) offers several operators which can be useful for error handling.

You can use the `catchError` operator to transform an error response into a value for the UI. This value can tell the UI to display an error page or value, and capture the error's cause if necessary.

Sometimes transient errors such as network interruptions can cause a request to fail unexpectedly, and simply retrying the request will allow it to succeed. RxJS provides several _retry_ operators which automatically re-subscribe to a failed `Observable` under certain conditions. For example, the `retry()` operator will automatically attempt to re-subscribe a specified number of times.

### Timeouts

To set a timeout for a request, you can set the `timeout` option to a number of milliseconds along other request options. If the backend request does not complete within the specified time, the request will be aborted and an error will be emitted.

NOTE: The timeout will only apply to the backend HTTP request itself. It is not a timeout for the entire request handling chain. Therefore, this option is not affected by any delay introduced by interceptors.

```ts
http
  .get('/api/config', {
    timeout: 3000,
  })
  .subscribe({
    next: (config) => {
      console.log('Config fetched successfully:', config);
    },
    error: (err) => {
      // If the request times out, an error will have been emitted.
    },
  });
```

## Advanced fetch options

Angular's `HttpClient` supports advanced fetch API options that can improve performance and user experience. These options are available when using the fetch backend, which is the default.

### Fetch options

The following options provide fine-grained control over request behavior when using the fetch backend.

#### Keep-alive connections

The `keepalive` option allows a request to outlive the page that initiated it. This is particularly useful for analytics or logging requests that need to complete even if the user navigates away from the page.

```ts
http
  .post('/api/analytics', analyticsData, {
    keepalive: true,
  })
  .subscribe();
```

#### HTTP caching control

The `cache` option controls how the request interacts with the browser's HTTP cache, which can significantly improve performance for repeated requests.

```ts
//  Use cached response regardless of freshness
http
  .get('/api/config', {
    cache: 'force-cache',
  })
  .subscribe((config) => {
    // ...
  });

// Always fetch from network, bypass cache
http
  .get('/api/live-data', {
    cache: 'no-cache',
  })
  .subscribe((data) => {
    // ...
  });

// Use cached response only, fail if not in cache
http
  .get('/api/static-data', {
    cache: 'only-if-cached',
  })
  .subscribe((data) => {
    // ...
  });
```

#### Request priority for Core Web Vitals

The `priority` option allows you to indicate the relative importance of a request, helping browsers optimize resource loading for better Core Web Vitals scores.

```ts
// High priority for critical resources
http
  .get('/api/user-profile', {
    priority: 'high',
  })
  .subscribe((profile) => {
    // ...
  });

// Low priority for non-critical resources
http
  .get('/api/recommendations', {
    priority: 'low',
  })
  .subscribe((recommendations) => {
    // ...
  });

// Auto priority (default) lets the browser decide
http
  .get('/api/settings', {
    priority: 'auto',
  })
  .subscribe((settings) => {
    // ...
  });
```

Available `priority` values:

- `'high'`: High priority, loaded early (e.g., critical user data, above-the-fold content)
- `'low'`: Low priority, loaded when resources are available (e.g., analytics, prefetch data)
- `'auto'`: Browser determines priority based on request context (default)

TIP: Use `priority: 'high'` for requests that affect Largest Contentful Paint (LCP) and `priority: 'low'` for requests that don't impact initial user experience.

#### Request mode

The `mode` option controls how the request handles cross-origin requests and determines the response type.

```ts
// Same-origin requests only
http
  .get('/api/local-data', {
    mode: 'same-origin',
  })
  .subscribe((data) => {
    // ...
  });

// CORS-enabled cross-origin requests
http
  .get('https://api.external.com/data', {
    mode: 'cors',
  })
  .subscribe((data) => {
    // ...
  });

// No-CORS mode for simple cross-origin requests
http
  .get('https://external-api.com/public-data', {
    mode: 'no-cors',
  })
  .subscribe((data) => {
    // ...
  });
```

Available `mode` values:

- `'same-origin'`: Only allow same-origin requests, fail for cross-origin requests
- `'cors'`: Allow cross-origin requests with CORS (default)
- `'no-cors'`: Allow simple cross-origin requests without CORS, response is opaque

TIP: Use `mode: 'same-origin'` for sensitive requests that should never go cross-origin.

#### Redirect handling

The `redirect` option specifies how to handle redirect responses from the server.

```ts
// Follow redirects automatically (default behavior)
http
  .get('/api/resource', {
    redirect: 'follow',
  })
  .subscribe((data) => {
    // ...
  });

// Prevent automatic redirects
http
  .get('/api/resource', {
    redirect: 'manual',
  })
  .subscribe((response) => {
    // Handle redirect manually
  });

// Treat redirects as errors
http
  .get('/api/resource', {
    redirect: 'error',
  })
  .subscribe({
    next: (data) => {
      // Success response
    },
    error: (err) => {
      // Redirect responses will trigger this error handler
    },
  });
```

Available `redirect` values:

- `'follow'`: Automatically follow redirects (default)
- `'error'`: Treat redirects as errors
- `'manual'`: Don't follow redirects automatically, return redirect response

TIP: Use `redirect: 'manual'` when you need to handle redirects with custom logic.

#### Credentials handling

The `credentials` option controls whether cookies, authorization headers, and other credentials are sent with cross-origin requests. This is particularly important for authentication scenarios.

```ts
// Include credentials for cross-origin requests
http
  .get('https://api.example.com/protected-data', {
    credentials: 'include',
  })
  .subscribe((data) => {
    // ...
  });

// Never send credentials (default for cross-origin)
http
  .get('https://api.example.com/public-data', {
    credentials: 'omit',
  })
  .subscribe((data) => {
    // ...
  });

// Send credentials only for same-origin requests
http
  .get('/api/user-data', {
    credentials: 'same-origin',
  })
  .subscribe((data) => {
    // ...
  });

// withCredentials overrides credentials setting
http
  .get('https://api.example.com/data', {
    credentials: 'omit', // This will be ignored
    withCredentials: true, // This forces credentials: 'include'
  })
  .subscribe((data) => {
    // Request will include credentials despite credentials: 'omit'
  });

// Legacy approach (still supported)
http
  .get('https://api.example.com/data', {
    withCredentials: true,
  })
  .subscribe((data) => {
    // Equivalent to credentials: 'include'
  });
```

IMPORTANT: The `withCredentials` option takes precedence over the `credentials` option. If both are specified, `withCredentials: true` will always result in `credentials: 'include'`, regardless of the explicit `credentials` value.

Available `credentials` values:

- `'omit'`: Never send credentials
- `'same-origin'`: Send credentials only for same-origin requests (default)
- `'include'`: Always send credentials, even for cross-origin requests

TIP: Use `credentials: 'include'` when you need to send authentication cookies or headers to a different domain that supports CORS. Avoid mixing `credentials` and `withCredentials` options to prevent confusion.

#### Referrer

The `referrer` option allows you to control what referrer information is sent with the request. This is important for privacy and security considerations.

```ts
// Send a specific referrer URL
http
  .get('/api/data', {
    referrer: 'https://example.com/page',
  })
  .subscribe((data) => {
    // ...
  });

// Use the current page as referrer (default behavior)
http
  .get('/api/analytics', {
    referrer: 'about:client',
  })
  .subscribe((data) => {
    // ...
  });
```

The `referrer` option accepts:

- A valid URL string: Sets the specific referrer URL to send
- An empty string `''`: Sends no referrer information
- `'about:client'`: Uses the default referrer (current page URL)

TIP: Use `referrer: ''` for sensitive requests where you don't want to leak the referring page URL.

#### Referrer policy

The `referrerPolicy` option controls how much referrer information , the URL of the page making the request is sent along with an HTTP request. This setting affects both privacy and analytics, allowing you to balance data visibility with security considerations.

```ts
// Send no referrer information regardless of the current page
http
  .get('/api/data', {
    referrerPolicy: 'no-referrer',
  })
  .subscribe();

// Send origin only (e.g. https://example.com)
http
  .get('/api/analytics', {
    referrerPolicy: 'origin',
  })
  .subscribe();
```

The `referrerPolicy` option accepts:

- `'no-referrer'` Never send the `Referer` header.
- `'no-referrer-when-downgrade'` Sends the referrer for same-origin and secure (HTTPS→HTTPS) requests, but omits it when navigating from a secure to a less secure origin (HTTPS→HTTP).
- `'origin'` Sends only the origin (scheme, host, port) of the referrer, omitting path and query information.
- `'origin-when-cross-origin'` Sends the full URL for same-origin requests, but only the origin for cross-origin requests.
- `'same-origin'` Sends the full URL for same-origin requests and no referrer for cross-origin requests.
- `'strict-origin'` Sends only the origin, and only if the protocol security level is not downgraded (e.g., HTTPS→HTTPS). Omits the referrer on downgrade.
- `'strict-origin-when-cross-origin'` Default browser behavior. Sends the full URL for same-origin requests, the origin for cross-origin requests when not downgraded, and omits the referrer on downgrade.
- `'unsafe-url'`Always sends the full URL (including path and query). This can expose sensitive data and should be used with caution.

TIP: Prefer conservative values such as `'no-referrer'`, `'origin'`, or `'strict-origin-when-cross-origin'` for privacy-sensitive requests.

#### Integrity

The `integrity` option allows you to verify that the response hasn't been tampered with by providing a cryptographic hash of the expected content. This is particularly useful for loading scripts or other resources from CDNs.

```ts
// Verify response integrity with SHA-256 hash
http
  .get('/api/script.js', {
    integrity: 'sha256-ABC123...',
    responseType: 'text',
  })
  .subscribe((script) => {
    // Script content is verified against the hash
  });
```

IMPORTANT: The `integrity` option requires an exact match between the response content and the provided hash. If the content doesn't match, the request will fail with a network error.

TIP: Use subresource integrity when loading critical resources from external sources to ensure they haven't been modified. Generate hashes using tools like `openssl`.

## HTTP `Observable`s

Each request method on `HttpClient` constructs and returns an `Observable` of the requested response type. Understanding how these `Observable`s work is important when using `HttpClient`.

`HttpClient` produces what RxJS calls "cold" `Observable`s, meaning that no actual request happens until the `Observable` is subscribed. Only then is the request actually dispatched to the server. Subscribing to the same `Observable` multiple times will trigger multiple backend requests. Each subscription is independent.

TIP: You can think of `HttpClient` `Observable`s as _blueprints_ for actual server requests.

Once subscribed, unsubscribing will abort the in-progress request. This is very useful if the `Observable` is subscribed via the `async` pipe, as it will automatically cancel the request if the user navigates away from the current page. Additionally, if you use the `Observable` with an RxJS combinator like `switchMap`, this cancellation will clean up any stale requests.

Once the response returns, `Observable`s from `HttpClient` usually complete (although interceptors can influence this).

Because of the automatic completion, there is usually no risk of memory leaks if `HttpClient` subscriptions are not cleaned up. However, as with any async operation, we strongly recommend that you clean up subscriptions when the component using them is destroyed, as the subscription callback may otherwise run and encounter errors when it attempts to interact with the destroyed component.

TIP: Using the `async` pipe or the `toSignal` operation to subscribe to `Observable`s ensures that subscriptions are disposed properly.

## Best practices

While `HttpClient` can be injected and used directly from components, generally we recommend you create reusable, injectable services which isolate and encapsulate data access logic. For example, this `UserService` encapsulates the logic to request data for a user by their id:

```ts
@Service()
export class UserService {
  private http = inject(HttpClient);

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`/api/user/${id}`);
  }
}
```

Within a component, you can combine `@if` with the `async` pipe to render the UI for the data only after it's finished loading:

```typescript
import {AsyncPipe} from '@angular/common';

@Component({
  imports: [AsyncPipe],
  template: `
    @if (user$ | async; as user) {
      <p>Name: {{ user.name }}</p>
      <p>Biography: {{ user.biography }}</p>
    }
  `,
})
export class UserProfile {
  userId = input.required<string>();
  user$!: Observable<User>;

  private userService = inject(UserService);

  constructor(): void {
    effect(() => {
      this.user$ = this.userService.getUser(this.userId());
    });
  }
}
```
# Interceptors

`HttpClient` supports a form of middleware known as _interceptors_.

TLDR: Interceptors are middleware that allows common patterns around retrying, caching, logging, and authentication to be abstracted away from individual requests.

`HttpClient` supports two kinds of interceptors: functional and DI-based. Our recommendation is to use functional interceptors because they have more predictable behavior, especially in complex setups. Our examples in this guide use functional interceptors, and we cover [DI-based interceptors](#di-based-interceptors) in their own section at the end.

## Interceptors

Interceptors are generally functions that you can run for each request and have broad capabilities to affect the contents and overall flow of requests and responses. You can install multiple interceptors, which form an interceptor chain where each interceptor processes the request or response before forwarding it to the next interceptor in the chain.

You can use interceptors to implement a variety of common patterns, such as:

- Adding authentication headers to outgoing requests to a particular API.
- Retrying failed requests with exponential backoff.
- Caching responses for a period of time, or until invalidated by mutations.
- Customizing the parsing of responses.
- Measuring server response times and logging them.
- Driving UI elements such as a loading spinner while network operations are in progress.
- Collecting and batch requests made within a certain timeframe.
- Automatically failing requests after a configurable deadline or timeout.
- Regularly polling the server and refreshing results.

## Defining an interceptor

The basic form of an interceptor is a function which receives the outgoing `HttpRequest` and a `next` function representing the next processing step in the interceptor chain.

For example, this `loggingInterceptor` will log the outgoing request URL to `console.log` before forwarding the request:

```ts
export function loggingInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  console.log(req.url);
  return next(req);
}
```

In order for this interceptor to actually intercept requests, you must configure `HttpClient` to use it.

## Configuring interceptors

You declare the set of interceptors to use when configuring `HttpClient` through dependency injection, by using the `withInterceptors` feature:

```ts
bootstrapApplication(App, {
  providers: [provideHttpClient(withInterceptors([loggingInterceptor, cachingInterceptor]))],
});
```

The interceptors you configure are chained together in the order that you've listed them in the providers. In the above example, the `loggingInterceptor` would process the request and then forward it to the `cachingInterceptor`.

### Intercepting response events

An interceptor may transform the `Observable` stream of `HttpEvent`s returned by `next` in order to access or manipulate the response. Because this stream includes all response events, inspecting the `.type` of each event may be necessary in order to identify the final response object.

```ts
export function loggingInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  return next(req).pipe(
    tap((event) => {
      if (event.type === HttpEventType.Response) {
        console.log(req.url, 'returned a response with status', event.status);
      }
    }),
  );
}
```

TIP: Interceptors naturally associate responses with their outgoing requests, because they transform the response stream in a closure that captures the request object.

## Modifying requests

Most aspects of `HttpRequest` and `HttpResponse` instances are _immutable_, and interceptors cannot directly modify them. Instead, interceptors apply mutations by cloning these objects using the `.clone()` operation, and specifying which properties should be mutated in the new instance. This might involve performing immutable updates on the value itself (like `HttpHeaders` or `HttpParams`).

For example, to add a header to a request:

```ts
const reqWithHeader = req.clone({
  headers: req.headers.set('X-New-Header', 'new header value'),
});
```

This immutability allows most interceptors to be idempotent if the same `HttpRequest` is submitted to the interceptor chain multiple times. This can happen for a few reasons, including when a request is retried after failure.

CRITICAL: The body of a request or response is **not** protected from deep mutations. If an interceptor must mutate the body, take care to handle running multiple times on the same request.

## Dependency injection in interceptors

Interceptors are run in the _injection context_ of the injector which registered them, and can use Angular's [`inject`](/api/core/inject) API to retrieve dependencies.

For example, suppose an application has a service called `AuthService`, which creates authentication tokens for outgoing requests. An interceptor can inject and use this service:

```ts
export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  // Inject the current `AuthService` and use it to get an authentication token:
  const authToken = inject(AuthService).getAuthToken();

  // Clone the request to add the authentication header.
  const newReq = req.clone({
    headers: req.headers.append('X-Authentication-Token', authToken),
  });
  return next(newReq);
}
```

## Request and response metadata

Often it's useful to include information in a request that's not sent to the backend, but is specifically meant for interceptors. `HttpRequest`s have a `.context` object which stores this kind of metadata as an instance of `HttpContext`. This object functions as a typed map, with keys of type `HttpContextToken`.

To illustrate how this system works, let's use metadata to control whether a caching interceptor is enabled for a given request.

### Defining context tokens

To store whether the caching interceptor should cache a particular request in that request's `.context` map, define a new `HttpContextToken` to act as a key:

```ts
export const CACHING_ENABLED = new HttpContextToken<boolean>(() => true);
```

The provided function creates the default value for the token for requests that haven't explicitly set a value for it. Using a function ensures that if the token's value is an object or array, each request gets its own instance.

### Reading the token in an interceptor

An interceptor can then read the token and choose to apply caching logic or not based on its value:

```ts
export function cachingInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  if (req.context.get(CACHING_ENABLED)) {
    // apply caching logic
    return ...;
  } else {
    // caching has been disabled for this request
    return next(req);
  }
}
```

### Setting context tokens when making a request

When making a request via the `HttpClient` API, you can provide values for `HttpContextToken`s:

```ts
const data$ = http.get('/sensitive/data', {
  context: new HttpContext().set(CACHING_ENABLED, false),
});
```

Interceptors can read these values from the `HttpContext` of the request.

### The request context is mutable

Unlike other properties of `HttpRequest`s, the associated `HttpContext` is _mutable_. If an interceptor changes the context of a request that is later retried, the same interceptor will observe the context mutation when it runs again. This is useful for passing state across multiple retries if needed.

## Synthetic responses

Most interceptors will simply invoke the `next` handler while transforming either the request or the response, but this is not strictly a requirement. This section discusses several of the ways in which an interceptor may incorporate more advanced behavior.

Interceptors are not required to invoke `next`. They may instead choose to construct responses through some other mechanism, such as from a cache or by sending the request through an alternate mechanism.

Constructing a response is possible using the `HttpResponse` constructor:

```ts
const resp = new HttpResponse({
  body: 'response body',
});
```

## Working with redirect information

When `HttpClient` uses the fetch backend, responses include a `redirected` property that indicates whether the response was the result of a redirect. This property aligns with the native Fetch API specification and can be useful in interceptors for handling redirect scenarios.

An interceptor can access and act upon the redirect information:

```ts
export function redirectTrackingInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  return next(req).pipe(
    tap((event) => {
      if (event.type === HttpEventType.Response && event.redirected) {
        console.log('Request to', req.url, 'was redirected to', event.url);
        // Handle redirect logic - maybe update analytics, security checks, etc.
      }
    }),
  );
}
```

You can also use the redirect information to implement conditional logic in your interceptors:

```ts
export function authRedirectInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  return next(req).pipe(
    tap((event) => {
      if (event.type === HttpEventType.Response && event.redirected) {
        // Check if we were redirected to a login page
        if (event.url?.includes('/login')) {
          // Handle authentication redirect
          handleAuthRedirect();
        }
      }
    }),
  );
}
```

## Working with response types

When `HttpClient` uses the fetch backend, responses include a `type` property that indicates how the browser handled the response based on CORS policies and request mode. This property aligns with the native Fetch API specification and provides valuable insights for debugging CORS issues and understanding response accessibility.

The response `type` property can have the following values:

- `'basic'` - Same-origin response with all headers accessible
- `'cors'` - Cross-origin response with CORS headers properly configured
- `'opaque'` - Cross-origin response without CORS, headers and body may be limited
- `'opaqueredirect'` - Response from a redirected request in no-cors mode
- `'error'` - Network error occurred

An interceptor can use response type information for CORS debugging and error handling:

```ts
export function responseTypeInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  return next(req).pipe(
    map((event) => {
      if (event.type === HttpEventType.Response) {
        // Handle different response types appropriately
        switch (event.responseType) {
          case 'opaque':
            // Limited access to response data
            console.warn('Limited response data due to CORS policy');
            break;
          case 'cors':
          case 'basic':
            // Full access to response data
            break;
          case 'error':
            // Handle network errors
            console.error('Network error in response');
            break;
        }
      }
    }),
  );
}
```

## DI-based interceptors

`HttpClient` also supports interceptors which are defined as injectable classes and configured through the DI system. The capabilities of DI-based interceptors are identical to those of functional interceptors, but the configuration mechanism is different.

A DI-based interceptor is an injectable class which implements the `HttpInterceptor` interface:

```ts
@Injectable()
export class LoggingInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, handler: HttpHandler): Observable<HttpEvent<any>> {
    console.log('Request URL: ' + req.url);
    return handler.handle(req);
  }
}
```

DI-based interceptors are configured through a dependency injection multi-provider:

```ts
bootstrapApplication(App, {
  providers: [
    provideHttpClient(
      // DI-based interceptors must be explicitly enabled.
      withInterceptorsFromDi(),
    ),

    {provide: HTTP_INTERCEPTORS, useClass: LoggingInterceptor, multi: true},
  ],
});
```

DI-based interceptors run in the order that their providers are registered. In an app with an extensive and hierarchical DI configuration, this order can be very hard to predict.
# Test requests

As for any external dependency, you must mock the HTTP backend so your tests can simulate interaction with a remote server. The `@angular/common/http/testing` library provides tools to capture requests made by the application, make assertions about them, and mock the responses to emulate your backend's behavior.

The testing library is designed for a pattern where the app executes code and makes requests first. The test then expects that certain requests have or have not been made, performs assertions against those requests, and finally provides responses by "flushing" each expected request.

Finally, tests can verify that the app made no unexpected requests.

## Setup for testing

To begin testing usage of `HttpClient`, configure `TestBed` and include `provideHttpClientTesting()` in your test's setup. `HttpClient` is provided by Angular's test environment, and `provideHttpClientTesting()` configures it to use a test backend instead of the real network. It also provides `HttpTestingController`, which you'll use to interact with the test backend, set expectations about which requests have been made, and flush responses to those requests. `HttpTestingController` can be injected from `TestBed` once configured.

```ts
TestBed.configureTestingModule({
  providers: [
    // ... other test providers
    provideHttpClientTesting(),
  ],
});

const httpTesting = TestBed.inject(HttpTestingController);
```

Now when your tests make requests, they will hit the testing backend instead of the normal one. You can use `httpTesting` to make assertions about those requests.

### Configuring `HttpClient` in tests

If a test needs to configure `HttpClient` features, such as interceptors, include `provideHttpClient(...)` before `provideHttpClientTesting()`.
IMPORTANT: Keep in mind to provide `provideHttpClient()` **before** `provideHttpClientTesting()`, as `provideHttpClientTesting()` will overwrite parts of `provideHttpClient()`. Doing it the other way around can potentially break your tests.

```ts
TestBed.configureTestingModule({
  providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
});
```

## Expecting and answering requests

For example, you can write a test that expects a GET request to occur and provides a mock response:

```ts
TestBed.configureTestingModule({
  providers: [ConfigService, provideHttpClientTesting()],
});

const httpTesting = TestBed.inject(HttpTestingController);

// Load `ConfigService` and request the current configuration.
const service = TestBed.inject(ConfigService);
const config$ = service.getConfig<Config>();

// `firstValueFrom` subscribes to the `Observable`, which makes the HTTP request,
// and creates a `Promise` of the response.
const configPromise = firstValueFrom(config$);

// At this point, the request is pending, and we can assert it was made
// via the `HttpTestingController`:
const req = httpTesting.expectOne('/api/config', 'Request to load the configuration');

// We can assert various properties of the request if desired.
expect(req.request.method).toBe('GET');

// Flushing the request causes it to complete, delivering the result.
req.flush(DEFAULT_CONFIG);

// We can then assert that the response was successfully delivered by the `ConfigService`:
expect(await configPromise).toEqual(DEFAULT_CONFIG);

// Finally, we can assert that no other requests were made.
httpTesting.verify();
```

NOTE: `expectOne` will fail if the test has made more than one request which matches the given criteria.

As an alternative to asserting on `req.method`, you could instead use an expanded form of `expectOne` to also match the request method:

```ts
const req = httpTesting.expectOne(
  {
    method: 'GET',
    url: '/api/config',
  },
  'Request to load the configuration',
);
```

HELPFUL: The expectation APIs match against the full URL of requests, including any query parameters.

The last step, verifying that no requests remain outstanding, is common enough for you to move it into an `afterEach()` step:

```ts
afterEach(() => {
  // Verify that none of the tests make any extra HTTP requests.
  TestBed.inject(HttpTestingController).verify();
});
```

## Handling more than one request at once

If you need to respond to duplicate requests in your test, use the `match()` API instead of `expectOne()`. It takes the same arguments but returns an array of matching requests. Once returned, these requests are removed from future matching and you are responsible for flushing and verifying them.

```ts
const allGetRequests = httpTesting.match({method: 'GET'});
for (const req of allGetRequests) {
  // Handle responding to each request.
}
```

## Advanced matching

All matching functions accept a predicate function for custom matching logic:

```ts
// Look for one request that has a request body.
const requestsWithBody = httpTesting.expectOne((req) => req.body !== null);
```

The `expectNone` function asserts that no requests match the given criteria.

```ts
// Assert that no mutation requests have been issued.
httpTesting.expectNone((req) => req.method !== 'GET');
```

## Testing error handling

You should test your app's responses when HTTP requests fail.

### Backend errors

To test handling of backend errors (when the server returns a non-successful status code), flush requests with an error response that emulates what your backend would return when a request fails.

```ts
const req = httpTesting.expectOne('/api/config');
req.flush('Failed!', {status: 500, statusText: 'Internal Server Error'});

// Assert that the application successfully handled the backend error.
```

### Network errors

Requests can also fail due to network errors, which surface as `ProgressEvent` errors. These can be delivered with the `error()` method:

```ts
const req = httpTesting.expectOne('/api/config');
req.error(new ProgressEvent('network error!'));

// Assert that the application successfully handled the network error.
```

## Testing an Interceptor

You should test that your interceptors work under the desired circumstances.

For example, an application may be required to add an authentication token generated by a service to each outgoing request.
This behavior can be enforced with the use of an interceptor:

```ts
export function authInterceptor(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> {
  const authService = inject(AuthService);

  const clonedRequest = request.clone({
    headers: request.headers.append('X-Authentication-Token', authService.getAuthToken()),
  });
  return next(clonedRequest);
}
```

The `TestBed` configuration for this interceptor should rely on the `withInterceptors` feature.

```ts
TestBed.configureTestingModule({
  providers: [
    AuthService,
    // Testing one interceptor at a time is recommended.
    provideHttpClient(withInterceptors([authInterceptor])),
    provideHttpClientTesting(),
  ],
});
```

The `HttpTestingController` can retrieve the request instance that can then be inspected to ensure that the request was modified.

```ts
const service = TestBed.inject(AuthService);
const req = httpTesting.expectOne('/api/config');

expect(req.request.headers.get('X-Authentication-Token')).toEqual(service.getAuthToken());
```

A similar interceptor could be implemented with class-based interceptors:

```ts
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private authService = inject(AuthService);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const clonedRequest = request.clone({
      headers: request.headers.append('X-Authentication-Token', this.authService.getAuthToken()),
    });
    return next.handle(clonedRequest);
  }
}
```

In order to test it, the `TestBed` configuration should instead be:

```ts
TestBed.configureTestingModule({
  providers: [
    AuthService,
    provideHttpClient(withInterceptorsFromDi()),
    provideHttpClientTesting(),
    // We rely on the HTTP_INTERCEPTORS token to register the AuthInterceptor as an HttpInterceptor
    {provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true},
  ],
});
```
