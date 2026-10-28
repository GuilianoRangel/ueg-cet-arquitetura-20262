# Unit testing

## Table of Contents

- **[Unit testing](#unit-testing)**
  - [Set up for testing](#set-up-for-testing)
  - [Configuration](#configuration)
  - [Code coverage](#code-coverage)
  - [Running tests in a browser](#running-tests-in-a-browser)
- **[Example for Playwright (headed)](#example-for-playwright-headed)**
- **[Example for Playwright (headless)](#example-for-playwright-headless)**
- **[Example for WebdriverIO (headed)](#example-for-webdriverio-headed)**
- **[Example for WebdriverIO (headless)](#example-for-webdriverio-headless)**
  - [Other test frameworks](#other-test-frameworks)
  - [Testing in continuous integration](#testing-in-continuous-integration)
  - [More information on testing](#more-information-on-testing)
- **[Code coverage](#code-coverage)**
  - [Prerequisites](#prerequisites)
  - [Generating a report](#generating-a-report)
  - [Enforcing code coverage thresholds](#enforcing-code-coverage-thresholds)
  - [Advanced configuration](#advanced-configuration)
- **[Testing services](#testing-services)**
  - [Testing a service](#testing-a-service)
  - [Testing services with dependencies](#testing-services-with-dependencies)
  - [Testing HTTP services](#testing-http-services)
- **[Basics of testing components](#basics-of-testing-components)**
  - [Component DOM testing](#component-dom-testing)
- **[Component testing scenarios](#component-testing-scenarios)**
  - [Component binding](#component-binding)
  - [Component with a dependency](#component-with-a-dependency)
  - [Component with async service](#component-with-async-service)
  - [Component with inputs and outputs](#component-with-inputs-and-outputs)
  - [Component inside a test host](#component-inside-a-test-host)
  - [Routing component](#routing-component)
  - [Routed components](#routed-components)
  - [Nested component tests](#nested-component-tests)
  - [Use a `page` object](#use-a-page-object)
  - [Override component providers](#override-component-providers)
- **[Debugging tests](#debugging-tests)**
  - [Debugging in Node.js](#debugging-in-nodejs)
  - [Debugging in a browser](#debugging-in-a-browser)
- **[Testing Utility APIs](#testing-utility-apis)**
  - [`TestBed` class summary](#testbed-class-summary)
  - [The `ComponentFixture`](#the-componentfixture)
- **[Component harnesses overview](#component-harnesses-overview)**
- **[Using component harnesses in tests](#using-component-harnesses-in-tests)**
  - [Before you start](#before-you-start)
  - [Test harness environments and loaders](#test-harness-environments-and-loaders)
  - [Using a harness loader](#using-a-harness-loader)
  - [Using test harness APIs](#using-test-harness-apis)
  - [Interop with Angular change detection](#interop-with-angular-change-detection)
- **[Creating harnesses for your components](#creating-harnesses-for-your-components)**
  - [Before you start](#before-you-start)
  - [Extending `ComponentHarness`](#extending-componentharness)
  - [Finding elements in the component's DOM](#finding-elements-in-the-components-dom)
  - [Working with `TestElement` instances](#working-with-testelement-instances)
  - [Loading harnesses for subcomponents](#loading-harnesses-for-subcomponents)
  - [Filtering harness instances with `HarnessPredicate`](#filtering-harness-instances-with-harnesspredicate)
  - [Creating `HarnessLoader` for elements that use content projection](#creating-harnessloader-for-elements-that-use-content-projection)
  - [Accessing elements outside of the component's host element](#accessing-elements-outside-of-the-components-host-element)
  - [Waiting for asynchronous tasks](#waiting-for-asynchronous-tasks)

---


Testing your Angular application helps you check that it is working as you expect. Unit tests are crucial for catching bugs early, ensuring code quality, and facilitating safe refactoring.

NOTE: This guide covers the default testing setup for new Angular CLI projects, which uses Vitest. If you are migrating an existing project from Karma, see the [Migrating from Karma to Vitest guide](guide/testing/migrating-to-vitest). Karma is still supported; for more information, see the [Karma testing guide](guide/testing/karma).

## Set up for testing

The Angular CLI downloads and installs everything you need to test an Angular application with the [Vitest testing framework](https://vitest.dev). New projects include `vitest` and `jsdom` by default.

Vitest runs your unit tests in a Node.js environment. To simulate the browser's DOM, Vitest uses a library called `jsdom`. This allows for faster test execution by avoiding the overhead of launching a browser. You can swap `jsdom` for an alternative like `happy-dom` by installing it and uninstalling `jsdom`. Currently, `jsdom` and `happy-dom` are the supported DOM emulation libraries.

The project you create with the CLI is immediately ready to test. Run the [`ng test`](cli/test) command:

```shell
ng test
```

The `ng test` command builds the application in _watch mode_ and launches the [Vitest test runner](https://vitest.dev).

The console output looks like this:

```shell
✓ src/app/app.spec.ts (3)
   ✓ AppComponent should create the app
   ✓ AppComponent should have as title 'my-app'
   ✓ AppComponent should render title
 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  18:18:01
   Duration  2.46s (transform 615ms, setup 2ms, collect 2.21s, tests 5ms)
```

The `ng test` command also watches your files for changes. If you modify a file and save it, the tests will run again.

## Configuration

The Angular CLI handles most of the Vitest configuration for you. You can customize the test behavior by modifying the `test` target options in your `angular.json` file.

### Angular.json options

- `include`: Glob patterns for files to include for testing. Defaults to `['**/*.spec.ts', '**/*.test.ts']`.
- `exclude`: Glob patterns for files to exclude from testing.
- `setupFiles`: A list of paths to global setup files (e.g., polyfills or global mocks) that are executed before your tests.
- `providersFile`: The path to a file that exports a default array of Angular providers for the test environment. This is useful for setting up global test providers which are injected into your tests.
- `coverage`: A boolean to enable or disable code coverage reporting. Defaults to `false`.
- `browsers`: An array of browser names to run tests in a real browser (e.g., `["chromium"]`). Requires a browser provider to be installed. See the [Running tests in a browser](#running-tests-in-a-browser) section for more details.

### Global test setup and providers

The `setupFiles` and `providersFile` options are particularly useful for managing global test configuration.

For example, you could create a `src/test-providers.ts` file to provide `provideHttpClientTesting` to all your tests:

```typescript
import {EnvironmentProviders, Provider} from '@angular/core';
import {provideHttpClientTesting} from '@angular/common/http/testing';

const testProviders: (Provider | EnvironmentProviders)[] = [provideHttpClientTesting()];

export default testProviders;
```

You would then reference this file in your `angular.json`:

```json
{
  "projects": {
    "your-project-name": {
      "architect": {
        "test": {
          "builder": "@angular/build:unit-test",
          "options": {
            "providersFile": "src/test-providers.ts"
          }
        }
      }
    }
  }
}
```

HELPFUL: When creating new TypeScript files for test setup or providers, like `src/test-providers.ts`, ensure they are included in your project's test TypeScript configuration file (typically `tsconfig.spec.json`). This allows the TypeScript compiler to properly process these files during testing.

### Advanced Vitest configuration

For advanced use cases, you can provide a custom Vitest configuration file using the `configFile` option in `angular.json`.

IMPORTANT: While using a custom configuration enables advanced options, the Angular team does not provide support for the contents of the configuration file or for any third-party plugins. The CLI will also override certain properties (`test.projects`, `test.include`) to ensure proper integration.

You can create a Vitest configuration file (e.g., `vitest-base.config.ts`) and reference it in your `angular.json`:

```json
{
  "projects": {
    "your-project-name": {
      "architect": {
        "test": {
          "builder": "@angular/build:unit-test",
          "options": {
            "runnerConfig": "vitest-base.config.ts"
          }
        }
      }
    }
  }
}
```

You can also generate a base configuration file using the CLI:

```shell
ng generate config vitest
```

This creates a `vitest-base.config.ts` file that you can customize.

HELPFUL: Read more about Vitest configuration in the [official Vitest documentation](https://vitest.dev/config/).

## Code coverage

You can generate a code coverage report by adding the `--coverage` flag to the `ng test` command. The report is generated in the `coverage/` directory.

For more detailed information, see the [Code coverage guide](guide/testing/code-coverage).

## Running tests in a browser

While the default Node.js environment is faster for most unit tests, you can also run your tests in a real browser. This is useful for tests that rely on browser-specific APIs (like rendering) or for debugging.

To run tests in a browser, you must first install a browser provider. Read more about Vitest's browser mode in the [official documentation](https://vitest.dev/guide/browser).

Once the provider is installed, you can run your tests in the browser by configuring the `browsers` option in `angular.json` or by using the `--browsers` CLI flag. Tests run in a headed browser by default. If the `CI` environment variable is set, headless mode is used instead. To explicitly control headless mode, you can suffix the browser name with `Headless` (e.g., `chromiumHeadless`).

```bash
# Example for Playwright (headed)
ng test --browsers=chromium

# Example for Playwright (headless)
ng test --browsers=chromiumHeadless

# Example for WebdriverIO (headed)
ng test --browsers=chrome

# Example for WebdriverIO (headless)
ng test --browsers=chromeHeadless
```

Choose one of the following browser providers based on your needs:

### Playwright

[Playwright](https://playwright.dev/) is a browser automation library that supports Chromium, Firefox, and WebKit.

```shell
// npm
npm install --save-dev @vitest/browser-playwright playwright
```
```shell
// yarn
yarn add --dev @vitest/browser-playwright playwright
```
```shell
// pnpm
pnpm add -D @vitest/browser-playwright playwright
```
```shell
// bun
bun add --dev @vitest/browser-playwright playwright
```
### WebdriverIO

[WebdriverIO](https://webdriver.io/) is a browser and mobile automation test framework that supports Chrome, Firefox, Safari, and Edge.

```shell
// npm
npm install --save-dev @vitest/browser-webdriverio webdriverio
```
```shell
// yarn
yarn add --dev @vitest/browser-webdriverio webdriverio
```
```shell
// pnpm
pnpm add -D @vitest/browser-webdriverio webdriverio
```
```shell
// bun
bun add --dev @vitest/browser-webdriverio webdriverio
```
### Preview

The `@vitest/browser-preview` provider is designed for WebContainer environments like StackBlitz and is not intended for use in CI/CD.

```shell
// npm
npm install --save-dev @vitest/browser-preview
```
```shell
// yarn
yarn add --dev @vitest/browser-preview
```
```shell
// pnpm
pnpm add -D @vitest/browser-preview
```
```shell
// bun
bun add --dev @vitest/browser-preview
```
HELPFUL: For more advanced browser-specific configuration, see the [Advanced Vitest configuration](#advanced-vitest-configuration) section.

## Other test frameworks

You can also unit test an Angular application with other testing libraries and test runners. Each library and runner has its own installation procedures, configuration, and syntax.

## Testing in continuous integration

A robust test suite is a key part of a continuous integration (CI) pipeline. CI servers let you automate your tests to run on every commit and pull request.

To test your Angular application in a CI server, run the standard test command:

```shell
ng test
```

Most CI servers set a `CI=true` environment variable, which `ng test` detects. This automatically configures your tests to run in a non-interactive, single-run mode.

If your CI server does not set this variable, or if you need to force single-run mode manually, you can use the `--no-watch` and `--no-progress` flags:

```shell
ng test --no-watch --no-progress
```

## More information on testing

After you've set up your application for testing, you might find the following testing guides useful.

|                                                                    | Details                                                                           |
| :----------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| [Code coverage](guide/testing/code-coverage)                       | How much of your app your tests are covering and how to specify required amounts. |
| [Testing services](guide/testing/services)                         | How to test the services your application uses.                                   |
| [Basics of testing components](guide/testing/components-basics)    | Basics of testing Angular components.                                             |
| [Component testing scenarios](guide/testing/components-scenarios)  | Various kinds of component testing scenarios and use cases.                       |
| [Testing attribute directives](guide/testing/attribute-directives) | How to test your attribute directives.                                            |
| [Testing pipes](guide/testing/pipes)                               | How to test pipes.                                                                |
| [Debugging tests](guide/testing/debugging)                         | Common testing bugs.                                                              |
| [Testing utility APIs](guide/testing/utility-apis)                 | Angular testing features.                                                         |
# Code coverage

Code coverage reports show you any parts of your code base that might not be properly tested by your unit tests.

## Prerequisites

To generate code coverage reports with Vitest, you must install the `@vitest/coverage-v8` package:

```shell
// npm
npm install --save-dev @vitest/coverage-v8
```
```shell
// yarn
yarn add --dev @vitest/coverage-v8
```
```shell
// pnpm
pnpm add -D @vitest/coverage-v8
```
```shell
// bun
bun add --dev @vitest/coverage-v8
```
## Generating a report

To generate a coverage report, add the `--coverage` flag to the `ng test` command:

```shell
ng test --coverage
```

After the tests run, the command creates a new `coverage/` directory in the project. Open the `index.html` file to see a report with your source code and code coverage values.

If you want to create code-coverage reports every time you test, you can set the `coverage` option to `true` in your `angular.json` file:

```json
{
  "projects": {
    "your-project-name": {
      "architect": {
        "test": {
          "builder": "@angular/build:unit-test",
          "options": {
            "coverage": true
          }
        }
      }
    }
  }
}
```

## Enforcing code coverage thresholds

The code coverage percentages let you estimate how much of your code is tested. If your team decides on a minimum amount to be unit tested, you can enforce this minimum in your configuration.

For example, suppose you want the code base to have a minimum of 80% code coverage. To enable this, add the `coverageThresholds` option to your `angular.json` file:

```json
{
  "projects": {
    "your-project-name": {
      "architect": {
        "test": {
          "builder": "@angular/build:unit-test",
          "options": {
            "coverage": true,
            "coverageThresholds": {
              "statements": 80,
              "branches": 80,
              "functions": 80,
              "lines": 80
            }
          }
        }
      }
    }
  }
}
```

Now, if your coverage drops below 80% when you run your tests, the command will fail.

## Advanced configuration

You can configure several other coverage options in your `angular.json` file:

- `coverageInclude`: Glob patterns of files to include in the coverage report.
- `coverageExclude`: Glob patterns of files to exclude in the coverage report.
- `coverageReporters`: An array of reporters to use (e.g., `html`, `lcov`, `json`).
- `coverageWatermarks`: An object specifying `[low, high]` watermarks for the HTML reporter, which can affect the color-coding of the report.

```json
{
  "projects": {
    "your-project-name": {
      "architect": {
        "test": {
          "builder": "@angular/build:unit-test",
          "options": {
            "coverage": true,
            "coverageReporters": ["html", "lcov"],
            "coverageWatermarks": {
              "statements": [50, 80],
              "branches": [50, 80],
              "functions": [50, 80],
              "lines": [50, 80]
            }
          }
        }
      }
    }
  }
}
```
# Testing services

Services typically contain your application's business logic that components rely on. Testing services verifies that the logic works correctly in isolation, independent of any component or template.

This guide uses [Vitest](https://vitest.dev/), which Angular CLI projects include by default. For more on testing setup, see the [testing overview guide](guide/testing#set-up-for-testing).

## Testing a service

Consider a `Calculator` service that performs basic arithmetic:

```ts
{ header: 'calculator.ts' }
import {Service} from '@angular/core';

@Service()
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }

  subtract(a: number, b: number): number {
    return a - b;
  }
}
```

To test this service, configure a `TestBed`, which is Angular's testing utility for creating an isolated testing environment for each test. It sets up dependency injection and lets you retrieve service instances — simulating how Angular wires things together in a real application.

```ts
{ header: 'calculator.spec.ts' }
import {TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it} from 'vitest';
import {Calculator} from './calculator';

describe('Calculator', () => {
  let service: Calculator;

  beforeEach(() => {
    // Injects the Calculator service which is available to Angular
    // because the service uses `providedIn: 'root'`
    service = TestBed.inject(Calculator);
  });

  it('adds two numbers', () => {
    expect(service.add(1, 2)).toBe(3);
  });

  it('subtracts two numbers', () => {
    expect(service.subtract(5, 3)).toBe(2);
  });
});
```

In the example above, the `beforeEach` block injects a fresh instance of the service before every test. This ensures each test runs in isolation with no leaked state from previous tests.

## Testing services with dependencies

Most services depend on other services to run properly. By default, `TestBed` provides the real implementations of these dependencies, which means your tests exercise the actual code paths your application uses. Sometimes, however, a dependency may be complex, slow, or unpredictable. In those cases, you can substitute it with a controlled replacement.

Consider an `OrderTotal` service that relies on a `TaxCalculator` to compute the final price of an order:

```ts
{ header: 'tax-calculator.ts' }
import {Service} from '@angular/core';

@Service()
export class TaxCalculator {
  calculate(subtotal: number): number {
    return subtotal * 0.05;
  }
}
```

```ts
{ header: 'order-total.ts' }
import {inject, Service} from '@angular/core';
import {TaxCalculator} from './tax-calculator';

@Service()
export class OrderTotal {
  private taxCalculator = inject(TaxCalculator);

  total(subtotal: number): number {
    return subtotal + this.taxCalculator.calculate(subtotal);
  }
}
```

In this example, `OrderTotal` uses `inject()` to request `TaxCalculator` from Angular's dependency injection system. By default, `TestBed` provides the real `TaxCalculator` which is perfect for simple calculations like this. However, if `TaxCalculator` involved complex logic, network requests, or unpredictable results, you might want to substitute it with a controlled replacement.

### Replacing a dependency with a stub

A stub is a way to replace a dependency or method with one that returns predictable values, which can make test results easier to verify.

To test `OrderTotal` without relying on the real `TaxCalculator`, you can provide a stub in the `TestBed` configuration.

```ts
{ header: 'order-total.spec.ts' }
import {TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it, vi, type Mocked} from 'vitest';
import {OrderTotal} from './order-total';
import {TaxCalculator} from './tax-calculator';

// Vitest's `Mocked` utility type ensures the stub is type-safe,
// while `vi.fn()` creates a mock function for each method
const taxCalculatorStub: Mocked<TaxCalculator> = {
  calculate: vi.fn(),
};

describe('OrderTotal', () => {
  let service: OrderTotal;

  beforeEach(() => {
    // `mockReturnValue` sets a controlled return value for the stub
    taxCalculatorStub.calculate.mockReturnValue(5);

    TestBed.configureTestingModule({
      // The `providers` array accepts a provider object where `provide`
      // specifies the dependency to replace and `useValue` defines the stub
      providers: [{provide: TaxCalculator, useValue: taxCalculatorStub}],
    });
    service = TestBed.inject(OrderTotal);
  });

  it('adds tax to the subtotal', () => {
    expect(service.total(100)).toBe(105);
  });
});
```

With this stub, whenever `OrderTotal` requests `TaxCalculator`, the `TestBed` knows to use the `taxCalculatorStub` instead. Because the stub always returns 5, the test verifies that `OrderTotal` correctly adds the tax value to the subtotal regardless of whether the tax rate changes in `TaxCalculator`.

### Verifying interactions with spies

A stub controls what a dependency returns, but sometimes you also need to verify that a service called its dependency with the correct arguments. This can be accomplished with spies, which track how a function is called. With Vitest, this functionality is built into `vi.fn()` and lets you assert on interactions between services.

```ts
{ header: 'order-total.spec.ts' }
import {TestBed} from '@angular/core/testing';
import {beforeEach, describe, expect, it, vi, type Mocked} from 'vitest';
import {OrderTotal} from './order-total';
import {TaxCalculator} from './tax-calculator';

const taxCalculatorStub: Mocked<TaxCalculator> = {
  calculate: vi.fn(),
};

describe('OrderTotal', () => {
  let service: OrderTotal;

  beforeEach(() => {
    taxCalculatorStub.calculate.mockReturnValue(5);

    TestBed.configureTestingModule({
      providers: [{provide: TaxCalculator, useValue: taxCalculatorStub}],
    });
    service = TestBed.inject(OrderTotal);
  });

  it('adds tax to the subtotal', () => {
    expect(service.total(100)).toBe(105);
  });

  // Verify the interaction with a spy
  it('calls the tax calculator', () => {
    service.total(100);
    expect(taxCalculatorStub.calculate).toHaveBeenCalledExactlyOnce();
  });
});
```

The new test verifies that `OrderTotal` called `TaxCalculator.calculate` when computing the total. This is useful when verifying that the interaction between services happened correctly.

## Testing HTTP services

Many services use Angular's `HttpClient` to fetch data from a server. Angular provides dedicated testing utilities for `HttpClient` that let you control HTTP responses without making real network requests.

For details on testing services that use `HttpClient`, see the [HTTP testing guide](guide/http/testing).
# Basics of testing components

A component, unlike all other parts of an Angular application, combines an HTML template and a TypeScript class.
The component truly is the template and the class _working together_.
To adequately test a component, you should test that they work together as intended.

Such tests require creating the component's host element in the browser DOM, as Angular does, and investigating the component class's interaction with the DOM as described by its template.

The Angular `TestBed` facilitates this kind of testing as you'll see in the following sections.
But in many cases, _testing the component class alone_, without DOM involvement, can validate much of the component's behavior in a straightforward, more obvious way.

## Component DOM testing

A component is more than just its class.
A component interacts with the DOM and with other components.
Classes alone cannot tell you if the component is going to render properly, respond to user input and gestures, or integrate with its parent and child components.

- Is `Lightswitch.clicked()` bound to anything such that the user can invoke it?
- Is the `Lightswitch.message` displayed?
- Can the user actually select the hero displayed by the `DashboardHero` component?
- Is the hero name displayed as expected \(such as uppercase\)?
- Is the welcome message displayed by the template of the `Welcome` component?

These might not be troubling questions for the preceding simple components illustrated.
But many components have complex interactions with the DOM elements described in their templates, causing HTML to appear and disappear as the component state changes.

To answer these kinds of questions, you have to create the DOM elements associated with the components, you must examine the DOM to confirm that component state displays properly at the appropriate times, and you must simulate user interaction with the screen to determine whether those interactions cause the component to behave as expected.

To write these kinds of test, you'll use additional features of the `TestBed` as well as other testing helpers.

### CLI-generated tests

The CLI creates an initial test file for you by default when you ask it to generate a new component.

For example, the following CLI command generates a `Banner` component in the `app/banner` folder \(with inline template and styles\):

```shell
ng generate component banner --inline-template --inline-style
```

It also generates an initial test file for the component, `banner.spec.ts`, that looks like this:

```ts
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Banner} from './banner';

describe('Banner', () => {
  let component: Banner;
  let fixture: ComponentFixture<Banner>;

  beforeEach(async () => {
    TestBed.configureTestingModule({});

    fixture = TestBed.createComponent(Banner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

### Reduce the setup

Only the last three lines of this file actually test the component and all they do is assert that Angular can create the component.

The rest of the file is boilerplate setup code anticipating more advanced tests that _might_ become necessary if the component evolves into something substantial.

You'll learn about these advanced test features in the following sections.
For now, you can radically reduce this test file to a more manageable size:

```ts
describe('Banner (minimal)', () => {
  it('should create', () => {
    const fixture = TestBed.createComponent(Banner);
    const component = fixture.componentInstance;
    expect(component).toBeDefined();
  });
});
```

Later you'll call `TestBed.configureTestingModule()` with imports, providers, and more declarations to suit your testing needs.
Optional `override` methods can further fine-tune aspects of the configuration.

NOTE: `TestBed.compileComponents` is only required when `@defer` blocks are used in the tested components.

### `createComponent()`

After configuring `TestBed`, you call its `createComponent()` method.

```ts
const fixture = TestBed.createComponent(Banner);
```

`TestBed.createComponent()` creates an instance of the `Banner` component, adds a corresponding element to the test-runner DOM, and returns a [`ComponentFixture`](#componentfixture).

IMPORTANT: Do not re-configure `TestBed` after calling `createComponent`.

The `createComponent` method freezes the current `TestBed` definition, closing it to further configuration.

You cannot call any more `TestBed` configuration methods, not `configureTestingModule()`, nor `get()`, nor any of the `override...` methods.
If you try, `TestBed` throws an error.

### `ComponentFixture`

The [`ComponentFixture`](api/core/testing/ComponentFixture) is a test harness for interacting with the created component and its corresponding element.

Access the component instance through the fixture and confirm it exists with an expectation:

```ts
const component = fixture.componentInstance;
expect(component).toBeDefined();
```

### `beforeEach()`

You will add more tests as this component evolves.
Rather than duplicate the `TestBed` configuration for each test, you refactor to pull the setup into a `beforeEach()` and some supporting variables:

```ts
describe('Banner (with beforeEach)', () => {
  let component: Banner;
  let fixture: ComponentFixture<Banner>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Banner);
    component = fixture.componentInstance;

    await fixture.whenStable(); // necessary to wait for the initial rendering
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });
});
```

HELPFUL: By awaiting the initial rendering in the `beforeEach` with `await fixture.whenStable` the single tests synchronous.

Now add a test that gets the component's element from `fixture.nativeElement` and looks for the expected text.

```ts
it('should contain "banner works!"', () => {
  const bannerElement: HTMLElement = fixture.nativeElement;
  expect(bannerElement.textContent).toContain('banner works!');
});
```

### create a `setup` function

As an alternative to `beforeEach`, you can also create a setup function that you will call in every test.
A setup function has the advantage of being customizable via parameters.

Here is an example of what a setup function could look like:

```ts
function setup(providers?: StaticProviders[]): ComponentFixture<Banner> {
  TestBed.configureTestingModule({providers});
  return TestBed.createComponent(Banner);
}
```

### `nativeElement`

The value of `ComponentFixture.nativeElement` has the `any` type.
Later you'll encounter the `DebugElement.nativeElement` and it too has the `any` type.

Angular can't know at compile time what kind of HTML element the `nativeElement` is or if it even is an HTML element.
The application might be running on a _non-browser platform_, such as the server or a node environment, where the element might have a diminished API or not exist at all.

The tests in this guide are designed to run in a browser so a `nativeElement` value will always be an `HTMLElement` or one of its derived classes.

Knowing that it is an `HTMLElement` of some sort, use the standard HTML `querySelector` to dive deeper into the element tree.

Here's another test that calls `HTMLElement.querySelector` to get the paragraph element and look for the banner text:

```ts
it('should have <p> with "banner works!"', () => {
  const bannerElement: HTMLElement = fixture.nativeElement;
  const p = bannerElement.querySelector('p')!;
  expect(p.textContent).toEqual('banner works!');
});
```

### `DebugElement`

The Angular _fixture_ provides the component's element directly through the `fixture.nativeElement`.

```ts
const bannerElement: HTMLElement = fixture.nativeElement;
```

This is actually a convenience method, implemented as `fixture.debugElement.nativeElement`.

```ts
const bannerDe: DebugElement = fixture.debugElement;
const bannerEl: HTMLElement = bannerDe.nativeElement;
```

There's a good reason for this circuitous path to the element.

The properties of the `nativeElement` depend upon the runtime environment.
You could be running these tests on a _non-browser_ platform that doesn't have a DOM or whose DOM-emulation doesn't support the full `HTMLElement` API.

Angular relies on the `DebugElement` abstraction to work safely across _all supported platforms_.
Instead of creating an HTML element tree, Angular creates a `DebugElement` tree that wraps the _native elements_ for the runtime platform.
The `nativeElement` property unwraps the `DebugElement` and returns the platform-specific element object.

Because the sample tests for this guide are designed to run only in a browser, a `nativeElement` in these tests is always an `HTMLElement` whose familiar methods and properties you can explore within a test.

Here's the previous test, re-implemented with `fixture.debugElement.nativeElement`:

```ts
it('should find the <p> with fixture.debugElement.nativeElement', () => {
  const bannerDe: DebugElement = fixture.debugElement;
  const bannerEl: HTMLElement = bannerDe.nativeElement;
  const p = bannerEl.querySelector('p')!;
  expect(p.textContent).toEqual('banner works!');
});
```

The `DebugElement` has other methods and properties that are useful in tests, as you'll see elsewhere in this guide.

You import the `DebugElement` symbol from the Angular core library.

```ts
import {DebugElement} from '@angular/core';
```

### `By.css()`

Although the tests in this guide all run in the browser, some applications might run on a different platform at least some of the time.

For example, the component might render first on the server as part of a strategy to make the application launch faster on poorly connected devices.
The server-side renderer might not support the full HTML element API.
If it doesn't support `querySelector`, the previous test could fail.

The `DebugElement` offers query methods that work for all supported platforms.
These query methods take a _predicate_ function that returns `true` when a node in the `DebugElement` tree matches the selection criteria.

You create a _predicate_ with the help of a `By` class imported from a library for the runtime platform.
Here's the `By` import for the browser platform:

```ts
import {By} from '@angular/platform-browser';
```

The following example re-implements the previous test with `DebugElement.query()` and the browser's `By.css` method.

```ts
it('should find the <p> with fixture.debugElement.query(By.css)', () => {
  const bannerDe: DebugElement = fixture.debugElement;
  const paragraphDe = bannerDe.query(By.css('p'));
  const p: HTMLElement = paragraphDe.nativeElement;
  expect(p.textContent).toEqual('banner works!');
});
```

Some noteworthy observations:

- The `By.css()` static method selects `DebugElement` nodes with a [standard CSS selector](https://developer.mozilla.org/docs/Learn/CSS/Building_blocks/Selectors 'CSS selectors').
- The query returns a `DebugElement` for the paragraph.
- You must unwrap that result to get the paragraph element.

When you're filtering by CSS selector and only testing properties of a browser's _native element_, the `By.css` approach might be overkill.

It's often more straightforward and clear to filter with a standard `HTMLElement` method such as `querySelector()` or `querySelectorAll()`.
# Component testing scenarios

This guide explores common component testing use cases.

## Component binding

In the example application, the `Banner` component presents static title text in the HTML template.

After a few changes, the `Banner` component presents a dynamic title by binding to the component's `title` property like this.

```typescript
{header="banner.ts"}
import {Component, signal} from '@angular/core';

@Component({
  selector: 'app-banner',
  template: '<h1>{{ title() }}</h1>',
  styles: ['h1 { color: green; font-size: 350%}'],
})
export class Banner {
  title = signal('Test Tour of Heroes');
}
```

As minimal as this is, you decide to add a test to confirm that component actually displays the right content where you think it should.

### Query for the `<h1>`

You'll write a sequence of tests that inspect the value of the `<h1>` element that wraps the _title_ property interpolation binding.

You update the `beforeEach` to find that element with a standard HTML `querySelector` and assign it to the `h1` variable.

```ts
let component: Banner;
let fixture: ComponentFixture<Banner>;
let h1: HTMLElement;

beforeEach(() => {
  fixture = TestBed.createComponent(Banner);
  component = fixture.componentInstance; // Banner test instance
  h1 = fixture.nativeElement.querySelector('h1');
});
```

### `createComponent()` does not bind data

For your first test you'd like to see that the screen displays the default `title`.
Your instinct is to write a test that immediately inspects the `<h1>` like this:

```ts
it('should display original title', () => {
  expect(h1.textContent).toContain(component.title());
});
```

_That test fails_ with the message:

```shell
{hideCopy}
expected '' to contain 'Test Tour of Heroes'.
```

Binding happens when Angular performs **change detection**.

In production, change detection kicks in automatically when Angular creates a component or the user enters a keystroke, for example.

The `TestBed.createComponent` does not trigger change detection synchronously; a fact confirmed in the revised test:

```ts
it('no title in the DOM after createComponent()', () => {
  expect(h1.textContent).toEqual('');
});
```

### `whenStable()`

You can tell the `TestBed` to wait for change detection to run with `await fixture.whenStable()`.
Only then does the `<h1>` have the expected title.

```ts
it('should display original title', async () => {
  await fixture.whenStable();
  expect(h1.textContent).toContain(component.title());
});
```

Delayed change detection is intentional and useful.
It gives the tester an opportunity to inspect and change the state of the component _before Angular initiates data binding and calls [lifecycle hooks](guide/components/lifecycle)_.

Here's another test that changes the component's `title` property _before_ calling `fixture.whenStable()`.

```ts
it('should display a different test title', async () => {
  component.title.set('Test Title');
  await fixture.whenStable();
  expect(h1.textContent).toContain('Test Title');
});
```

### Binding signals to inputs

To reflect changes to inputs and listen to outputs you can dynamically bind signals to inputs and functions to outputs.

```ts
import {inputBinding, outputBinding} from '@angular/core';

const fixture = TestBed.createComponent(ValueDisplay, {
  bindings: [
    inputBinding('value', value),
    outputBinding('valueChange', () =>  (/* ... */) ),
  ],
});
```

### Change an input value with `dispatchEvent()`

To simulate user input, find the input element and set its `value` property.

But there is an essential, intermediate step.

Angular doesn't know that you set the input element's `value` property.
It won't read that property until you raise the element's `input` event by calling `dispatchEvent()`.

The following example of a component using the `TitleCasePipe` demonstrates the proper sequence.

```ts
it('should convert hero name to Title Case', async () => {
  const hostElement = fixture.nativeElement;
  const nameInput: HTMLInputElement = hostElement.querySelector('input')!;
  const nameDisplay: HTMLElement = hostElement.querySelector('span')!;

  // simulate user entering a new name into the input box
  nameInput.value = 'quick BROWN  fOx';

  // Dispatch a DOM event so that Angular learns of input value change.
  nameInput.dispatchEvent(new Event('input'));

  // Wait for Angular to update the display binding through the title pipe
  await fixture.whenStable();

  expect(nameDisplay.textContent).toBe('Quick Brown  Fox');
});
```

## Component with a dependency

Components often have service dependencies.

The `Welcome` component displays a welcome message to the logged-in user.
It knows who the user is based on a property of the injected `UserAuthentication`:

```typescript
import {Component, inject, OnInit, signal} from '@angular/core';
import {UserAuthentication} from '../model/user.authentication';

@Component({
  selector: 'app-welcome',
  template: '<h3 class="welcome"><i>{{ welcome() }}</i></h3>',
})
export class Welcome {
  private userAuth = inject(UserAuthentication);
  welcome = signal(
    this.userAuth.isLoggedIn() ? `Welcome, ${this.userAuth.user().name}` : 'Please log in.',
  );
}
```

The `Welcome` component has decision logic that interacts with the service, logic that makes this component worth testing.

### Provide service test doubles

A _component-under-test_ doesn't have to be provided with real services.

Injecting the real `UserAuthentication` could be difficult.
The real service might ask the user for login credentials and attempt to reach an authentication server.
These behaviors can be hard to intercept. Be aware that using test doubles makes the test behave differently from production so use them sparingly.

### Get injected services

The tests need access to the `UserAuthentication` injected into the `Welcome` component.

Angular has a hierarchical injection system.
There can be injectors at multiple levels, from the root injector created by the `TestBed` down through the component tree.

The safest way to get the injected service, the way that **_always works_**,
is to **get it from the injector of the _component-under-test_**.
The component injector is a property of the fixture's `DebugElement`.

```ts
// UserAuthentication actually injected into the component
userAuth = fixture.debugElement.injector.get(UserAuthentication);
```

HELPFUL: This is _usually_ not necessary. Services are often provided in the root or the TestBed overrides and can be retrieved more easily with `TestBed.inject()` (see below).

### `TestBed.inject()`

This is easier to remember and less verbose than retrieving a service using the fixture's `DebugElement`.

In this test suite, the _only_ provider of `UserAuthentication` is the root testing module, so it is safe to call `TestBed.inject()` as follows:

```ts
userAuth = TestBed.inject(UserAuthentication);
```

HELPFUL: For a use case in which `TestBed.inject()` does not work, see the [_Override component providers_](#override-component-providers) section that explains when and why you must get the service from the component's injector instead.

### Final setup and tests

Here's the complete `beforeEach()`, using `TestBed.inject()`:

```ts
let fixture: ComponentFixture<Welcome>;
let comp: Welcome;
let userAuth: UserAuthentication; // the TestBed injected service
let el: HTMLElement; // the DOM element with the welcome message

beforeEach(() => {
  fixture = TestBed.createComponent(Welcome);
  comp = fixture.componentInstance;

  // UserAuthentication from the root injector
  userAuth = TestBed.inject(UserAuthentication);

  //  get the "welcome" element by CSS selector (e.g., by class name)
  el = fixture.nativeElement.querySelector('.welcome');
});
```

And here are some tests:

```ts
it('should welcome the user', async () => {
  await fixture.whenStable();
  const content = el.textContent;

  expect(content, '"Welcome ..."').toContain('Welcome');
  expect(content, 'expected name').toContain('Test User');
});

it('should welcome "Bubba"', async () => {
  userAuth.user.set({name: 'Bubba'}); // welcome message hasn't been shown yet
  await fixture.whenStable();

  expect(el.textContent).toContain('Bubba');
});

it('should request login if not logged in', async () => {
  userAuth.isLoggedIn.set(false); // welcome message hasn't been shown yet
  await fixture.whenStable();
  const content = el.textContent;

  expect(content, 'not welcomed').not.toContain('Welcome');
  expect(content, '"log in"').toMatch(/log in/i);
});
```

The first is a sanity test; it confirms that the `UserAuthentication` is called and working.

HELPFUL: The 2nd argument of `expect` \(for example, `'expected name'`\) is an optional failure label.
If the expectation fails, Vitest appends this label to the expectation failure message.
In a spec with multiple expectations, it can help clarify what went wrong and which expectation failed.

The remaining tests confirm the logic of the component when the service returns different values.
The second test validates the effect of changing the user name.
The third test checks that the component displays the proper message when there is no logged-in user.

## Component with async service

In this sample, the `About` component template hosts a `Twain` component.
The `Twain` component displays Mark Twain quotes.

```html
<p class="twain">
  <i>{{ quote | async }}</i>
</p>
<button type="button" (click)="getQuote()">Next quote</button>
@if (errorMessage()) {
  <p class="error">{{ errorMessage() }}</p>
}
```

HELPFUL: The value of the component's `quote` property passes through an `AsyncPipe`.
That means the property returns either a `Promise` or an `Observable`.

In this example, the `TwainQuotes.getQuote()` method tells you that the `quote` property returns an `Observable`.

```ts
getQuote() {
  this.errorMessage.set('');
  this.quote = this.twainQuotes.getQuote().pipe(
    startWith('...'),
    catchError((err: any) => {
      this.errorMessage.set(err.message || err.toString());
      return of('...'); // reset message to placeholder
    }),
  );
}
```

The `Twain` component gets quotes from an injected `TwainQuotes`.
The component starts the returned `Observable` with a placeholder value \(`'...'`\), before the service can return its first quote.

The `catchError` intercepts service errors, prepares an error message, and returns the placeholder value on the success channel.

These are all features you'll want to test.

### Testing by mocking http requests with the `HttpTestingController`.

When testing a component, only the service's public API should matter.
In general, tests themselves should not make calls to remote servers.
They should emulate such calls.

In the case your async service relies on the `HttpClient` to load remote data, it is recommended to return mock responses at the HTTP level with the `HttpTestingController`.

For more details on mocking the `HttpBackend`, refer to the [dedicated guide](guide/http/testing).

### Testing by providing a stubbed implementation of a service.

When mocking async request at the http level isn't possible, an alternative is to leverage spies.

The setup in this `app/twain/twain-quotes.spec.ts` shows one way to do that:

```ts
class TwainQuotesStub implements TwainQuotes {
  private testQuote = 'Test Quote';

  getQuote() {
    return of(this.testQuote);
  }

  // ... Implement everything to conform to the API
}

beforeEach(async () => {
  TestBed.configureTestingModule({
    providers: [{provide: TwainQuotes, useClass: TwainQuotesStub}],
  });

  fixture = TestBed.createComponent(Twain);
  component = fixture.componentInstance;
  await fixture.whenStable();
  quoteEl = fixture.nativeElement.querySelector('.twain');
});
```

Focus on the how the stub implementation replaces the original one.

```ts
TestBed.configureTestingModule({
  providers: [{provide: TwainQuotes, useClass: TwainQuotesStub}],
});
```

The stub is designed in such a way that any component or service that injects it will receive the stubbed implementation.
It means that any call to `getQuote` receives an observable with a test quote.

Unlike the real `getQuote()` method, this spy bypasses the server and returns a synchronous observable whose value is available immediately.

### Async test with a Vitest fake timers

To mock async functions like `setTimeout` or `Promise`s, you can leverage Vitest fake timers to control whenever they fire.

```ts
it('should display error when TwainQuotes service fails', async () => {
  class TwainQuotesStub implements TwainQuotes {
    getQuote() {
      return defer(() => {
        return new Promise<string>((_, reject) => {
          setTimeout(() => reject('TwainService test failure'));
        });
      });
    }

    // ... Implement everything to conform to the API
  }

  TestBed.configureTestingModule({
    providers: [{provide: TwainQuotes, useClass: TwainQuotesStub}],
  });

  vi.useFakeTimers(); // setting up the fake timers
  const fixture = TestBed.createComponent(TwainComponent);

  // rendering isn't async, we need to flush
  await vi.runAllTimersAsync();

  await expect(fixture.nativeElement.querySelector('.error')!.textContent).toMatch(/test failure/);
  expect(fixture.nativeElement.querySelector('.twain')!.textContent).toBe('...');

  vi.useRealTimers(); // resets to regular async execution
});
```

### More async tests

With the stubbed service returning async observables, most of your tests will have to be async as well.

Here's a test that demonstrates the data flow you'd expect in the real world.

```ts
it('should show quote after getQuote', async () => {
  class MockTwainQuotes implements TwainQuotes {
    private subject = new Subject<string>();

    getQuote() {
      return this.subject.asObservable();
    }

    emit(val: string) {
      this.subject.next(val);
    }
  }

  it('should show quote after getQuote (success)', async () => {
    vi.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [{provide: TwainQuotes, useClass: MockTwainQuotes}],
    });

    const fixture = TestBed.createComponent(TwainComponent);
    const twainQuotes = TestBed.inject(TwainQuotes) as MockTwainQuotes;
    await vi.runAllTimersAsync(); // render before the quote is received

    const quoteEl = fixture.nativeElement.querySelector('.twain');
    expect(quoteEl.textContent).toBe('...');

    twainQuotes.emit('Twain Quote'); // emits the quote
    await vi.runAllTimersAsync(); // render with the quote received

    expect(quoteEl.textContent).toBe('Twain Quote');
    expect(fixture.nativeElement.querySelector('.error')).toBeNull();

    vi.useRealTimers();
  });
});
```

Notice that the quote element displays the placeholder value \(`'...'`\) on first rendering.
The first quote hasn't arrived yet.

Then you can assert that the quote element displays the expected text.

### Async tests with `zone.js` and `fakeAsync`

The `fakeAsync` helper function is another mock clock that relies on patching asynchronous APIs with `zone.js`. It was commonly used in `zone.js` based applications for testing. The use of `fakeAsync` is no longer recommended.

TIP: Prefer using native async testing strategies or other fake timers (also called mock clocks) like those from Vitest or Jasmine.

IMPORTANT: `fakeAsync` cannot be used with the Vitest test runner as no `zone.js` patch is applied for this runner.

## Component with inputs and outputs

A component with inputs and outputs typically appears inside the view template of a host component.
The host uses a property binding to set the input property and an event binding to listen to events raised by the output property.

The testing goal is to verify that such bindings work as expected.
The tests should set input values and listen for output events.

The `DashboardHero` component is a tiny example of a component in this role.
It displays an individual hero provided by the `Dashboard` component.
Clicking that hero tells the `Dashboard` component that the user has selected the hero.

The `DashboardHero` component is embedded in the `Dashboard` component template like this:

```html
@for (hero of heroes; track hero) {
  <dashboard-hero class="col-1-4" [hero]="hero" (selected)="gotoDetail($event)" />
}
```

The `DashboardHero` component appears in an `@for` block, which sets each component's `hero` input property to the looping value and listens for the component's `selected` event.

Here's the component's full definition:

```typescript
@Component({
  selector: 'dashboard-hero',
  imports: [UpperCasePipe],
  template: `
    <button type="button" (click)="click()" class="hero">
      {{ hero().name | uppercase }}
    </button>
  `,
})
export class DashboardHero {
  readonly hero = input.required<Hero>();
  readonly selected = output<Hero>();

  click() {
    this.selected.emit(this.hero());
  }
}
```

While testing a component this simple has little intrinsic value, it's worth knowing how.
Use one of these approaches:

- Test it as used by the `Dashboard` component
- Test it as a standalone component
- Test it as used by a substitute for the `Dashboard` component

The immediate goal is to test the `DashboardHero` component, not the `Dashboard` component, so, try the second and third options.

### Test the `DashboardHero` component standalone

Here's the meat of the spec file setup.

```ts
let fixture: ComponentFixture<DashboardHero>;
let comp: DashboardHero;
let heroDe: DebugElement;
let heroEl: HTMLElement;
let expectedHero: Hero;

beforeEach(async () => {
  fixture = TestBed.createComponent(DashboardHero);
  comp = fixture.componentInstance;

  // find the hero's DebugElement and element
  heroDe = fixture.debugElement.query(By.css('.hero'));
  heroEl = heroDe.nativeElement;

  // mock the hero supplied by the parent component
  expectedHero = {id: 42, name: 'Test Name'};

  // simulate the parent setting the input property with that hero
  fixture.componentRef.setInput('hero', expectedHero);

  // wait for initial data binding
  await fixture.whenStable();
});
```

Notice how the setup code assigns a test hero \(`expectedHero`\) to the component's `hero` property, emulating the way the `Dashboard` would set it using the property binding in its repeater.

The following test verifies that the hero name is propagated to the template using a binding.

```ts
it('should display hero name in uppercase', () => {
  const expectedPipedName = expectedHero.name.toUpperCase();
  expect(heroEl.textContent).toContain(expectedPipedName);
});
```

Because the template passes the hero name through the Angular `UpperCasePipe`, the test must match the element value with the upper-cased name.

### Clicking

Clicking the hero should raise a `selected` event that the host component \(`Dashboard` presumably\) can hear:

```ts
it('should raise selected event when clicked (triggerEventHandler)', () => {
  let selectedHero: Hero | undefined;
  comp.selected.subscribe((hero: Hero) => (selectedHero = hero));

  heroDe.triggerEventHandler('click');
  expect(selectedHero).toBe(expectedHero);
});
```

The component's `selected` property returns an `EventEmitter`, which looks like an RxJS synchronous `Observable` to consumers.
The test subscribes to it _explicitly_ just as the host component does _implicitly_.

If the component behaves as expected, clicking the hero's element should tell the component's `selected` property to emit the `hero` object.

The test detects that event through its subscription to `selected`.

### `triggerEventHandler`

The `heroDe` in the previous test is a `DebugElement` that represents the hero ``.

It has Angular properties and methods that abstract interaction with the native element.
This test calls the `DebugElement.triggerEventHandler` with the "click" event name.
The "click" event binding responds by calling `DashboardHero.click()`.

The Angular `DebugElement.triggerEventHandler` can raise _any data-bound event_ by its _event name_.
The second parameter is the event object passed to the handler.

The test triggered a "click" event.

```ts
heroDe.triggerEventHandler('click');
```

In this case, the test correctly assumes that the runtime event handler, the component's `click()` method, doesn't care about the event object.

HELPFUL: Other handlers are less forgiving.
For example, the `RouterLink` directive expects an object with a `button` property that identifies which mouse button, if any, was pressed during the click.
The `RouterLink` directive throws an error if the event object is missing.

### Click the element

The following test alternative calls the native element's own `click()` method, which is perfectly fine for _this component_.

```ts
it('should raise selected event when clicked (element.click)', () => {
  let selectedHero: Hero | undefined;
  comp.selected.subscribe((hero: Hero) => (selectedHero = hero));

  heroEl.click();
  expect(selectedHero).toBe(expectedHero);
});
```

### `click()` helper

Clicking a button, an anchor, or an arbitrary HTML element is a common test task.

Make that consistent and straightforward by encapsulating the _click-triggering_ process in a helper such as the following `click()` function:

```ts
/** Button events to pass to `DebugElement.triggerEventHandler` for RouterLink event handler */
export const ButtonClickEvents = {
  left: {button: 0},
  right: {button: 2},
};

/** Simulate element click. Defaults to mouse left-button click event. */
export function click(
  el: DebugElement | HTMLElement,
  eventObj: any = ButtonClickEvents.left,
): void {
  if (el instanceof HTMLElement) {
    el.click();
  } else {
    el.triggerEventHandler('click', eventObj);
  }
}
```

The first parameter is the _element-to-click_.
If you want, pass a custom event object as the second parameter.
The default is a partial [left-button mouse event object](https://developer.mozilla.org/docs/Web/API/MouseEvent/button) accepted by many handlers including the `RouterLink` directive.

IMPORTANT: The `click()` helper function is **not** one of the Angular testing utilities.
It's a function defined in _this guide's sample code_.
All of the sample tests use it.
If you like it, add it to your own collection of helpers.

Here's the previous test, rewritten using the click helper.

```ts
it('should raise selected event when clicked (click helper with DebugElement)', () => {
  let selectedHero: Hero | undefined;
  comp.selected.subscribe((hero: Hero) => (selectedHero = hero));

  click(heroDe); // click helper with DebugElement

  expect(selectedHero).toBe(expectedHero);
});
```

## Component inside a test host

The previous tests played the role of the host `Dashboard` component themselves.
But does the `DashboardHero` component work correctly when properly data-bound to a host component?

```typescript
@Component({
  imports: [DashboardHero],
  template: ` <dashboard-hero [hero]="hero" (selected)="onSelected($event)" />`,
})
class TestHost {
  hero: Hero = {id: 42, name: 'Test Name'};
  selectedHero: Hero | undefined;

  onSelected(hero: Hero) {
    this.selectedHero = hero;
  }
}
```

The test host sets the component's `hero` input property with its test hero.
It binds the component's `selected` event with its `onSelected` handler, which records the emitted hero in its `selectedHero` property.

Later, the tests will be able to check `selectedHero` to verify that the `DashboardHero.selected` event emitted the expected hero.

The setup for the `test-host` tests is similar to the setup for the stand-alone tests:

```ts
beforeEach(async () => {
  // create TestHost instead of DashboardHero
  fixture = TestBed.createComponent(TestHost);
  testHost = fixture.componentInstance;
  heroEl = fixture.nativeElement.querySelector('.hero');

  await fixture.whenStable();
});
```

This testing module configuration shows two important differences:

- It _creates_ the `TestHost` component instead of the `DashboardHero`
- The `TestHost` component sets the `DashboardHero.hero` with a binding

The `createComponent` returns a `fixture` that holds an instance of `TestHost` instead of an instance of `DashboardHero`.

Creating the `TestHost` has the side effect of creating a `DashboardHero` because the latter appears within the template of the former.
The query for the hero element \(`heroEl`\) still finds it in the test DOM, albeit at greater depth in the element tree than before.

The tests themselves are almost identical to the stand-alone version:

```ts
it('should display hero name', () => {
  const expectedPipedName = testHost.hero.name.toUpperCase();
  expect(heroEl.textContent).toContain(expectedPipedName);
});

it('should raise selected event when clicked', () => {
  click(heroEl);
  // selected hero should be the same data bound hero
  expect(testHost.selectedHero).toBe(testHost.hero);
});
```

Only the selected event test differs.
It confirms that the selected `DashboardHero` hero really does find its way up through the event binding to the host component.

## Routing component

A _routing component_ is a component that tells the `Router` to navigate to another component.
The `Dashboard` component is a _routing component_ because the user can navigate to the `HeroDetail` component by clicking on one of the _hero buttons_ on the dashboard.

Angular provides test helpers to reduce boilerplate and more effectively test code which depends on `HttpClient`. The `provideRouter` function can be used directly in the test module as well.

```ts
beforeEach(async () => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{path: '**', component: Dashboard}]),
      provideHttpClientTesting(),
      HeroService,
    ],
  });
  harness = await RouterTestingHarness.create();
  comp = await harness.navigateByUrl('/', Dashboard);
  TestBed.inject(HttpTestingController).expectOne('api/heroes').flush(getTestHeroes());
});
```

The following test clicks the displayed hero and confirms that we navigate to the expected URL.

```ts
it('should tell navigate when hero clicked', async () => {
  // get first <dashboard-hero> DebugElement
  const heroDe = harness.routeDebugElement!.query(By.css('dashboard-hero'));
  heroDe.triggerEventHandler('selected', comp.heroes[0]);

  // expecting to navigate to id of the component's first hero
  const id = comp.heroes[0].id;
  expect(TestBed.inject(Router).url, 'should nav to HeroDetail for first hero').toEqual(
    `/heroes/${id}`,
  );
});
```

## Routed components

A _routed component_ is the destination of a `Router` navigation.
It can be trickier to test, especially when the route to the component _includes parameters_.
The `HeroDetail` is a _routed component_ that is the destination of such a route.

When a user clicks a _Dashboard_ hero, the `Dashboard` tells the `Router` to navigate to `heroes/:id`.
The `:id` is a route parameter whose value is the `id` of the hero to edit.

The `Router` matches that URL to a route to the `HeroDetail`.
It creates an `ActivatedRoute` object with the routing information and injects it into a new instance of the `HeroDetail`.

Here are the services injected into `HeroDetail`:

```ts
private heroDetailService = inject(HeroDetailService);
private route = inject(ActivatedRoute);
private router = inject(Router);
```

The `HeroDetail` component needs the `id` parameter so it can fetch the corresponding hero using the `HeroDetailService`.
The component has to get the `id` from the `ActivatedRoute.paramMap` property which is an `Observable`.

It can't just reference the `id` property of the `ActivatedRoute.paramMap`.
The component has to _subscribe_ to the `ActivatedRoute.paramMap` observable and be prepared for the `id` to change during its lifetime.

```ts
constructor() {
  // get hero when `id` param changes
  this.route.paramMap
    .pipe(takeUntilDestroyed())
    .subscribe((pmap) => this.getHero(pmap.get('id')));
}
```

Tests can explore how the `HeroDetail` responds to different `id` parameter values by navigating to different routes.

## Nested component tests

Component templates often have nested components, whose templates might contain more components.

The component tree can be very deep and sometimes the nested components play no role in testing the component at the top of the tree.

The `App` component, for example, displays a navigation bar with anchors and their `RouterLink` directives.

```html
<app-banner />
<app-welcome />

<nav>
  <a routerLink="/dashboard">Dashboard</a>
  <a routerLink="/heroes">Heroes</a>
  <a routerLink="/about">About</a>
</nav>

<router-outlet />
```

To validate the links but not the navigation, you don't need the `Router` to navigate and you don't need the `<router-outlet>` to mark where the `Router` inserts _routed components_.

The `Banner` and `Welcome` components \(indicated by `<app-banner>` and `<app-welcome>`\) are also irrelevant.

Yet any test that creates the `App` component in the DOM also creates instances of these three components and, if you let that happen, you'll have to configure the `TestBed` to create them.

If you neglect to declare them, the Angular compiler won't recognize the `<app-banner>`, `<app-welcome>`, and `<router-outlet>` tags in the `App` template and will throw an error.

If you declare the real components, you'll also have to declare _their_ nested components and provide for _all_ services injected in _any_ component in the tree.

This section describes two techniques for minimizing the setup.
Use them, alone or in combination, to stay focused on testing the primary component.

### Stubbing unneeded components

In the first technique, you create and declare stub versions of the components and directive that play little or no role in the tests.

```ts
@Component({selector: 'app-banner', template: ''})
class BannerStub {}

@Component({selector: 'router-outlet', template: ''})
class RouterOutletStub {}

@Component({selector: 'app-welcome', template: ''})
class WelcomeStub {}
```

The stub selectors match the selectors for the corresponding real components.
But their templates and classes are empty.

Then declare them by overriding the `imports` of your component using `TestBed.overrideComponent`.

```ts
let comp: App;
let fixture: ComponentFixture<App>;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), UserAuthentication],
  }).overrideComponent(App, {
    set: {
      imports: [RouterLink, BannerStub, RouterOutletStub, WelcomeStub],
    },
  });

  fixture = TestBed.createComponent(App);
  comp = fixture.componentInstance;
});
```

HELPFUL: The `set` key in this example replaces all the existing imports on your component, make sure to import all dependencies, not only the stubs. Alternatively you can use the `remove`/`add` keys to selectively remove and add imports.

### `NO_ERRORS_SCHEMA`

In the second approach, add `NO_ERRORS_SCHEMA` to the metadata overrides of your component.

```ts
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), UserAuthentication],
  }).overrideComponent(App, {
    set: {
      imports: [], // resets all imports
      schemas: [NO_ERRORS_SCHEMA],
    },
  });
});
```

The `NO_ERRORS_SCHEMA` tells the Angular compiler to ignore unrecognized elements and attributes.

The compiler recognizes the `<app-root>` element and the `routerLink` attribute because you declared a corresponding `App` component and `RouterLink` in the `TestBed` configuration.

But the compiler won't throw an error when it encounters `<app-banner>`, `<app-welcome>`, or `<router-outlet>`.
It simply renders them as empty tags and the browser ignores them.

You no longer need the stub components.

### Use both techniques together

These are techniques for _Shallow Component Testing_, so-named because they reduce the visual surface of the component to just those elements in the component's template that matter for tests.

The `NO_ERRORS_SCHEMA` approach is the easier of the two but don't overuse it.

The `NO_ERRORS_SCHEMA` also prevents the compiler from telling you about the missing components and attributes that you omitted inadvertently or misspelled.
You could waste hours chasing phantom bugs that the compiler would have caught in an instant.

The _stub component_ approach has another advantage.
While the stubs in _this_ example were empty, you could give them stripped-down templates and classes if your tests need to interact with them in some way.

In practice you will combine the two techniques in the same setup, as seen in this example.

```ts
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), UserAuthentication],
  }).overrideComponent(App, {
    remove: {imports: [RouterOutlet, Welcome]},
    set: {schemas: [NO_ERRORS_SCHEMA]},
  });
});
```

The Angular compiler creates the `BannerStub` for the `<app-banner>` element and applies the `RouterLink` to the anchors with the `routerLink` attribute, but it ignores the `<app-welcome>` and `<router-outlet>` tags.

### `By.directive` and injected directives

A little more setup triggers the initial data binding and gets references to the navigation links:

```ts
beforeEach(async () => {
  await fixture.whenStable();

  // find DebugElements with an attached RouterLinkStubDirective
  linkDes = fixture.debugElement.queryAll(By.directive(RouterLink));

  // get attached link directive instances
  // using each DebugElement's injector
  routerLinks = linkDes.map((de) => de.injector.get(RouterLink));
});
```

Three points of special interest:

- Locate the anchor elements with an attached directive using `By.directive`
- The query returns `DebugElement` wrappers around the matching elements
- Each `DebugElement` exposes a dependency injector with the specific instance of the directive attached to that element

The `App` component links to validate are as follows:

```html
<nav>
  <a routerLink="/dashboard">Dashboard</a>
  <a routerLink="/heroes">Heroes</a>
  <a routerLink="/about">About</a>
</nav>
```

Here are some tests that confirm those links are wired to the `routerLink` directives as expected:

```ts
it('can get RouterLinks from template', () => {
  expect(routerLinks.length, 'should have 3 routerLinks').toBe(3);
  expect(routerLinks[0].href).toBe('/dashboard');
  expect(routerLinks[1].href).toBe('/heroes');
  expect(routerLinks[2].href).toBe('/about');
});

it('can click Heroes link in template', async () => {
  const heroesLinkDe = linkDes[1]; // heroes link DebugElement

  TestBed.inject(Router).resetConfig([{path: '**', children: []}]);
  heroesLinkDe.triggerEventHandler('click', {button: 0});

  await fixture.whenStable();

  expect(TestBed.inject(Router).url).toBe('/heroes');
});
```

## Use a `page` object

The `HeroDetail` component is a simple view with a title, two hero fields, and two buttons.

But there's plenty of template complexity even in this simple form.

```html
@if (hero) {
  <h2>
      <span>{{ hero.name | titlecase }}</span> Details
    </h2>
    <span>id: </span>{{ hero.id }}<label for="name">name: </label>
      <input id="name" [(ngModel)]="hero.name" placeholder="name" />
    <button type="button" (click)="save()">Save</button>
    <button type="button" (click)="cancel()">Cancel</button>
  }
```

Tests that exercise the component need …

- To wait until a hero arrives before elements appear in the DOM
- A reference to the title text
- A reference to the name input box to inspect and set it
- References to the two buttons so they can click them

Even a small form such as this one can produce a mess of tortured conditional setup and CSS element selection.

Tame the complexity with a `Page` class that handles access to component properties and encapsulates the logic that sets them.

Here is such a `Page` class for the `hero-detail.component.spec.ts`

```ts
class Page {
  // getter properties wait to query the DOM until called.
  get buttons() {
    return this.queryAll<HTMLButtonElement>('button');
  }
  get saveBtn() {
    return this.buttons[0];
  }
  get cancelBtn() {
    return this.buttons[1];
  }
  get nameDisplay() {
    return this.query<HTMLElement>('span');
  }
  get nameInput() {
    return this.query<HTMLInputElement>('input');
  }

  //// query helpers ////
  private query<T>(selector: string): T {
    return harness.routeNativeElement!.querySelector(selector)! as T;
  }

  private queryAll<T>(selector: string): T[] {
    return harness.routeNativeElement!.querySelectorAll(selector) as any as T[];
  }
}
```

Now the important hooks for component manipulation and inspection are neatly organized and accessible from an instance of `Page`.

A `createComponent` method creates a `page` object and fills in the blanks once the `hero` arrives.

```ts
async function createComponent(id: number) {
  harness = await RouterTestingHarness.create();
  component = await harness.navigateByUrl(`/heroes/${id}`, HeroDetail);
  page = new Page();

  const request = TestBed.inject(HttpTestingController).expectOne(`api/heroes/?id=${id}`);
  const hero = getTestHeroes().find((h) => h.id === Number(id));
  request.flush(hero ? [hero] : []);
  await harness.fixture.whenStable();
}
```

Here are a few more `HeroDetail` component tests to reinforce the point.

```ts
it("should display that hero's name", () => {
  expect(page.nameDisplay.textContent).toBe(expectedHero.name);
});

it('should navigate when click cancel', () => {
  click(page.cancelBtn);
  expect(TestBed.inject(Router).url).toEqual(`/heroes/${expectedHero.id}`);
});

it('should save when click save but not navigate immediately', () => {
  click(page.saveBtn);
  expect(TestBed.inject(HttpTestingController).expectOne({method: 'PUT', url: 'api/heroes'}));
  expect(TestBed.inject(Router).url).toEqual('/heroes/41');
});

it('should navigate when click save and save resolves', async () => {
  click(page.saveBtn);
  await harness.fixture.whenStable();
  expect(TestBed.inject(Router).url).toEqual('/heroes/41');
});

it('should convert hero name to Title Case', async () => {
  // get the name's input and display elements from the DOM
  const hostElement: HTMLElement = harness.routeNativeElement!;
  const nameInput: HTMLInputElement = hostElement.querySelector('input')!;
  const nameDisplay: HTMLElement = hostElement.querySelector('span')!;

  // simulate user entering a new name into the input box
  nameInput.value = 'quick BROWN  fOx';

  // Dispatch a DOM event so that Angular learns of input value change.
  nameInput.dispatchEvent(new Event('input'));

  // Wait for Angular to update the display binding through the title pipe
  await harness.fixture.whenStable();

  expect(nameDisplay.textContent).toBe('Quick Brown  Fox');
});
```

## Override component providers

The `HeroDetail` provides its own `HeroDetailService`.

```ts
@Component({
  /* ... */
  providers: [HeroDetailService],
})
export class HeroDetail {
  private heroDetailService = inject(HeroDetailService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
}
```

It's not possible to stub the component's `HeroDetailService` in the `providers` of the `TestBed.configureTestingModule`.
Those are providers for the _testing module_, not the component.
They prepare the dependency injector at the _fixture level_.

Angular creates the component with its _own_ injector, which is a _child_ of the fixture injector.
It registers the component's providers \(the `HeroDetailService` in this case\) with the child injector.

A test cannot get to child injector services from the fixture injector.
And `TestBed.configureTestingModule` can't configure them either.

Angular has created new instances of the real `HeroDetailService` all along!

HELPFUL: These tests could fail or timeout if the `HeroDetailService` made its own XHR calls to a remote server.
There might not be a remote server to call.

Fortunately, the `HeroDetailService` delegates responsibility for remote data access to an injected `HeroService`.

```ts
@Service()
export class HeroDetailService {
  private heroService = inject(HeroService);
}
```

The previous test configuration replaces the real `HeroService` with a `TestHeroService` that intercepts server requests and fakes their responses.

What if you aren't so lucky.
What if faking the `HeroService` is hard?
What if `HeroDetailService` makes its own server requests?

The `TestBed.overrideComponent` method can replace the component's `providers` with easy-to-manage _test doubles_ as seen in the following setup variation:

```ts
beforeEach(async () => {
  await TestBed.configureTestingModule({
    providers: [
      provideRouter([
        {path: 'heroes', component: HeroList},
        {path: 'heroes/:id', component: HeroDetail},
      ]),
      // HeroDetailService at this level is IRRELEVANT!
      {provide: HeroDetailService, useValue: {}},
    ],
  }).overrideComponent(HeroDetail, {
    set: {providers: [{provide: HeroDetailService, useClass: HeroDetailServiceSpy}]},
  });
});
```

Notice that `TestBed.configureTestingModule` no longer provides a fake `HeroService` because it's [not needed](#provide-a-spy-stub-herodetailservicespy).

### The `overrideComponent` method

Focus on the `overrideComponent` method.

```ts
.overrideComponent(HeroDetail, {
  set: {providers: [{provide: HeroDetailService, useClass: HeroDetailServiceSpy}]},
});
```

It takes two arguments: the component type to override \(`HeroDetail`\) and an override metadata object.
The [override metadata object](/guide/testing/utility-apis#testbed-class-summary) is a generic defined as follows:

```ts
type MetadataOverride<T> = {
  add?: Partial<T>;
  remove?: Partial<T>;
  set?: Partial<T>;
};
```

A metadata override object can either add-and-remove elements in metadata properties or completely reset those properties.
This example resets the component's `providers` metadata.

The type parameter, `T`, is the kind of metadata you'd pass to the `@Component` decorator:

```ts
selector?: string;
template?: string;
templateUrl?: string;
providers?: any[];
…
```

### Provide a _spy stub_ (`HeroDetailServiceSpy`)

This example completely replaces the component's `providers` array with a new array containing a `HeroDetailServiceSpy`.

The `HeroDetailServiceSpy` is a stubbed version of the real `HeroDetailService` that fakes all necessary features of that service.
It neither injects nor delegates to the lower level `HeroService` so there's no need to provide a test double for that.

The related `HeroDetail` component tests will assert that methods of the `HeroDetailService` were called by spying on the service methods.
Accordingly, the stub implements its methods as spies:

```ts
import {vi} from 'vitest';

class HeroDetailServiceSpy {
  testHero: Hero = {...testHero};

  /* emit cloned test hero */
  getHero = vi.fn(() => asyncData({...this.testHero}));

  /* emit clone of test hero, with changes merged in */
  saveHero = vi.fn((hero: Hero) => asyncData(Object.assign(this.testHero, hero)));
}
```

### The override tests

Now the tests can control the component's hero directly by manipulating the spy-stub's `testHero` and confirm that service methods were called.

```ts
let hdsSpy: HeroDetailServiceSpy;

beforeEach(async () => {
  harness = await RouterTestingHarness.create();
  component = await harness.navigateByUrl(`/heroes/${testHero.id}`, HeroDetail);
  page = new Page();
  // get the component's injected HeroDetailServiceSpy
  hdsSpy = harness.routeDebugElement!.injector.get(HeroDetailService) as any;

  harness.detectChanges();
});

it('should have called `getHero`', () => {
  expect(hdsSpy.getHero, 'getHero called once').toHaveBeenCalledTimes(1);
});

it("should display stub hero's name", () => {
  expect(page.nameDisplay.textContent).toBe(hdsSpy.testHero.name);
});

it('should save stub hero change', async () => {
  const origName = hdsSpy.testHero.name;
  const newName = 'New Name';

  page.nameInput.value = newName;

  page.nameInput.dispatchEvent(new Event('input')); // tell Angular

  expect(component.hero.name, 'component hero has new name').toBe(newName);
  expect(hdsSpy.testHero.name, 'service hero unchanged before save').toBe(origName);

  click(page.saveBtn);
  expect(hdsSpy.saveHero, 'saveHero called once').toHaveBeenCalledTimes(1);

  await harness.fixture.whenStable();
  expect(hdsSpy.testHero.name, 'service hero has new name after save').toBe(newName);
  expect(TestBed.inject(Router).url).toEqual('/heroes');
});
```

### More overrides

The `TestBed.overrideComponent` method can be called multiple times for the same or different components.
The `TestBed` offers similar `overrideDirective`, `overrideModule`, and `overridePipe` methods for digging into and replacing parts of these other classes.

Explore the options and combinations on your own.
# Debugging tests

If your tests aren't working as you expect, you can debug them in both the default Node.js environment and in a real browser.

## Debugging in Node.js

Debugging in the default Node.js environment is often the quickest way to diagnose issues that are not related to browser-specific APIs or rendering.

1.  Run the `ng test` command with the `--debug` flag:
    ```shell
ng test --debug
    ```
2.  The test runner will start in debug mode and wait for a debugger to attach.
3.  You can now attach your preferred debugger. For example, you can use the built-in Node.js debugger in VS Code or the Chrome DevTools for Node.js.

## Debugging in a browser

The same way you start a debugging session with in Node, you can use `ng test` with the `--debug` flag with Vitest and [browser mode](/guide/testing/migrating-to-vitest#5-configure-browser-mode-optional).

The test runner will start in debug mode and wait for you to open the browser devtools to debug the tests.
# Testing Utility APIs

NOTE: While this guide is being updated for Vitest, some descriptions and examples of utility APIs are currently presented within the context of Karma/Jasmine. We are actively working to provide Vitest equivalents and updated guidance where applicable.

This page describes the most useful Angular testing features.

The Angular testing utilities include the `TestBed`, the `ComponentFixture`, and a handful of functions that control the test environment.
The [`TestBed`](#testbed-class-summary) and [`ComponentFixture`](#the-componentfixture) classes are covered separately.

Here's a summary of the stand-alone functions, in order of likely utility:

| Function     | Details                                                                                                                                                                                                                                                      |
| :----------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`inject`]   | Injects one or more services from the current `TestBed` injector into a test function. It cannot inject a service provided by the component itself. See discussion of the [debugElement.injector](guide/testing/components-scenarios#get-injected-services). |
| `getTestBed` | Gets the current instance of the `TestBed`. Usually unnecessary because the static class methods of the `TestBed` class are typically sufficient. The `TestBed` instance exposes a few rarely used members that are not available as static methods.         |

For handling complex asynchronous scenarios or testing legacy Zone.js-based applications, see the [Zone.js Testing Utilities](guide/testing/zone-js-testing-utilities) guide.

## `TestBed` class summary

The `TestBed` class is one of the principal Angular testing utilities.
Its API is quite large and can be overwhelming until you've explored it, a little at a time.
Read the early part of this guide first to get the basics before trying to absorb the full API.

The module definition passed to `configureTestingModule` is a subset of the `@NgModule` metadata properties.

```ts
type TestModuleMetadata = {
  providers?: any[];
  declarations?: any[];
  imports?: any[];
  schemas?: Array<SchemaMetadata | any[]>;
};
```

Each override method takes a `MetadataOverride<T>` where `T` is the kind of metadata appropriate to the method, that is, the parameter of an `@NgModule`, `@Component`, `@Directive`, or `@Pipe`.

```ts
type MetadataOverride<T> = {
  add?: Partial<T>;
  remove?: Partial<T>;
  set?: Partial<T>;
};
```

The `TestBed` API consists of static class methods that either update or reference a _global_ instance of the `TestBed`.

Internally, all static methods cover methods of the current runtime `TestBed` instance, which is also returned by the `getTestBed()` function.

Call `TestBed` methods _within_ a `beforeEach()` to ensure a fresh start before each individual test.

Here are the most important static methods, in order of likely utility.

| Methods                  | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configureTestingModule` | The testing shims establish the [initial test environment](guide/testing) and a default testing module. The default testing module is configured with basic declaratives and some Angular service substitutes that every tester needs. <br /> Call `configureTestingModule` to refine the testing module configuration for a particular set of tests by adding and removing imports, declarations \(of components, directives, and pipes\), and providers. |
| `compileComponents`      | Compile the testing module asynchronously after you've finished configuring it. You **must** call this method if _any_ of the testing module components have asynchronously loaded resources (like @defer blocks). <br /> After calling `compileComponents`, the `TestBed` configuration is frozen for the duration of the current spec.                                                                                                                   |
| `createComponent<T>`     | Create an instance of a component of type `T` based on the current `TestBed` configuration. After calling `createComponent`, the `TestBed` configuration is frozen for the duration of the current spec.                                                                                                                                                                                                                                                   |
| `overrideComponent`      | Replace metadata for the given component class, which could be nested deeply within an inner module.                                                                                                                                                                                                                                                                                                                                                       |
| `overrideDirective`      | Replace metadata for the given directive class, which could be nested deeply within an inner module.                                                                                                                                                                                                                                                                                                                                                       |
| `overridePipe`           | Replace metadata for the given pipe class, which could be nested deeply within an inner module.                                                                                                                                                                                                                                                                                                                                                            |
| `overrideModule`         | Replace metadata for the given `NgModule`. Recall that modules can import other modules. The `overrideModule` method can reach deeply into the current testing module to modify one of these inner modules.                                                                                                                                                                                                                                                |

|
`inject` | Retrieve a service from the current `TestBed` injector. The `inject` function is often adequate for this purpose. But `inject` throws an error if it can't provide the service. <br /> What if the service is optional? <br /> The `TestBed.inject()` method takes an optional second parameter, the object to return if Angular can't find the provider \(`null` in this example\): `expect(TestBed.inject(NotProvided, null)).toBeNull();` After calling `TestBed.inject`, the `TestBed` configuration is frozen for the duration of the current spec. |
|
`initTestEnvironment` | Initialize the testing environment for the entire test run. <br /> The testing shims call it for you so there is rarely a reason for you to call it yourself. <br /> Call this method _exactly once_. To change this default in the middle of a test run, call `resetTestEnvironment` first. <br /> Specify the Angular compiler factory, a `PlatformRef`, and a default Angular testing module. Alternatives for non-browser platforms are available in the general form `@angular/platform-<platform_name>/testing/<platform_name>`. |
| `resetTestEnvironment` | Reset the initial test environment, including the default testing module. |

A few of the `TestBed` instance methods are not covered by static `TestBed` _class_ methods.
These are rarely needed.

## The `ComponentFixture`

The `TestBed.createComponent<T>` creates an instance of the component `T` and returns a strongly typed `ComponentFixture` for that component.

The `ComponentFixture` properties and methods provide access to the component, its DOM representation, and aspects of its Angular environment.

### `ComponentFixture` properties

Here are the most important properties for testers, in order of likely utility.

| Properties          | Details                                                                                                                                                                                                                                                                                   |
| :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `componentInstance` | The instance of the component class created by `TestBed.createComponent`.                                                                                                                                                                                                                 |
| `debugElement`      | The `DebugElement` associated with the root element of the component. <br /> The `debugElement` provides insight into the component and its DOM element during test and debugging. It's a critical property for testers. The most interesting members are covered [below](#debugelement). |
| `nativeElement`     | The native DOM element at the root of the component.                                                                                                                                                                                                                                      |
| `changeDetectorRef` | The `ChangeDetectorRef` for the component. <br /> The `ChangeDetectorRef` is most valuable when testing a component that has the `ChangeDetectionStrategy.OnPush` method or the component's change detection is under your programmatic control.                                          |

### `ComponentFixture` methods

The _fixture_ methods cause Angular to perform certain tasks on the component tree.
Call these method to trigger Angular behavior in response to simulated user action.

Here are the most useful methods for testers.

| Methods             | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| :------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `detectChanges`     | Trigger a change detection cycle for the component. <br /> Call it to initialize the component \(it calls `ngOnInit`\) and after your test code, change the component's data bound property values. Angular can't see that you've changed `personComponent.name` and won't update the `name` binding until you call `detectChanges`. <br /> Runs `checkNoChanges` afterwards to confirm that there are no circular updates unless called as `detectChanges(false)`;                                                                                    |
| `autoDetectChanges` | Set this to `true` when you want the fixture to detect changes automatically. <br /> When autodetect is `true`, the test fixture calls `detectChanges` immediately after creating the component. Then it listens for pertinent zone events and calls `detectChanges` accordingly. When your test code modifies component property values directly, you probably still have to call `fixture.detectChanges` to trigger data binding updates. <br /> The default is `false`. Testers who prefer fine control over test behavior tend to keep it `false`. |
| `checkNoChanges`    | Do a change detection run to make sure there are no pending changes. Throws an exceptions if there are.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `isStable`          | If the fixture is currently _stable_, returns `true`. If there are async tasks that have not completed, returns `false`.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `whenStable`        | Returns a promise that resolves when the fixture is stable. <br /> To resume testing after completion of asynchronous activity or asynchronous change detection, hook that promise. See [whenStable](guide/testing/components-scenarios#whenstable).                                                                                                                                                                                                                                                                                                   |
| `destroy`           | Trigger component destruction.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

#### `DebugElement`

The `DebugElement` provides crucial insights into the component's DOM representation.

From the test root component's `DebugElement` returned by `fixture.debugElement`, you can walk \(and query\) the fixture's entire element and component subtrees.

Here are the most useful `DebugElement` members for testers, in approximate order of utility:

| Members               | Details                                                                                                                                                                                                                                                                                                                                         |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nativeElement`       | The corresponding DOM element in the browser                                                                                                                                                                                                                                                                                                    |
| `query`               | Calling `query(predicate: Predicate<DebugElement>)` returns the first `DebugElement` that matches the predicate at any depth in the subtree.                                                                                                                                                                                                    |
| `queryAll`            | Calling `queryAll(predicate: Predicate<DebugElement>)` returns all `DebugElements` that matches the predicate at any depth in subtree.                                                                                                                                                                                                          |
| `injector`            | The host dependency injector. For example, the root element's component instance injector.                                                                                                                                                                                                                                                      |
| `componentInstance`   | The element's own component instance, if it has one.                                                                                                                                                                                                                                                                                            |
| `context`             | An object that provides parent context for this element. Often an ancestor component instance that governs this element. <br /> When an element is repeated within `@for` block, the context is an `RepeaterContext` whose `$implicit` property is the value of the row instance value. For example, the `hero` in `@for(hero of heroes; ...)`. |
| `children`            | The immediate `DebugElement` children. Walk the tree by descending through `children`. `DebugElement` also has `childNodes`, a list of `DebugNode` objects. `DebugElement` derives from `DebugNode` objects and there are often more nodes than elements. Testers can usually ignore plain nodes.                                               |
| `parent`              | The `DebugElement` parent. Null if this is the root element.                                                                                                                                                                                                                                                                                    |
| `name`                | The element tag name, if it is an element.                                                                                                                                                                                                                                                                                                      |
| `triggerEventHandler` | Triggers the event by its name if there is a corresponding listener in the element's `listeners` collection. The second parameter is the _event object_ expected by the handler. <br /> If the event lacks a listener or there's some other problem, consider calling `nativeElement.dispatchEvent(eventObject)`.                               |
| `listeners`           | The callbacks attached to the component's `@Output` properties and/or the element's event properties.                                                                                                                                                                                                                                           |
| `providerTokens`      | This component's injector lookup tokens. Includes the component itself plus the tokens that the component lists in its `providers` metadata.                                                                                                                                                                                                    |
| `source`              | Where to find this element in the source component template.                                                                                                                                                                                                                                                                                    |
| `references`          | Dictionary of objects associated with template local variables \(for example, `#foo`\), keyed by the local variable name.                                                                                                                                                                                                                       |

The `DebugElement.query(predicate)` and `DebugElement.queryAll(predicate)` methods take a predicate that filters the source element's subtree for matching `DebugElement`.

The predicate is any method that takes a `DebugElement` and returns a _truthy_ value.
The following example finds all `DebugElements` with a reference to a template local variable named "content":

```ts
// Filter for DebugElements with a #content reference
const contentRefs = el.queryAll((de) => de.references['content']);
```

The Angular `By` class has three static methods for common predicates:

| Static method             | Details                                                                    |
| :------------------------ | :------------------------------------------------------------------------- |
| `By.all`                  | Return all elements                                                        |
| `By.css(selector)`        | Return elements with matching CSS selectors                                |
| `By.directive(directive)` | Return elements that Angular matched to an instance of the directive class |

```ts
// Can find DebugElement either by css selector or by directive
const h2 = fixture.debugElement.query(By.css('h2'));
const directive = fixture.debugElement.query(By.directive(Highlight));
```
# Component harnesses overview

A <strong>component harness</strong> is a class that allows tests to interact with components the way an end user does via a supported API. You can create test harnesses for any component, ranging from small reusable widgets to full pages.

Harnesses offer several benefits:

- They make tests less brittle by insulating themselves against implementation details of a component, such as its DOM structure
- They make tests become more readable and easier to maintain
- They can be used across multiple testing environments

```ts
// Example of test with a harness for a component called MyButtonComponent
it('should load button with exact text', async () => {
  const button = await loader.getHarness(MyButtonComponentHarness);
  expect(await button.getText()).toBe('Confirm');
});
```

Component harnesses are especially useful for shared UI widgets. Developers often write tests that depend on private implementation details of widgets, such as DOM structure and CSS classes. Those dependencies make tests brittle and hard to maintain. Harnesses offer an alternative— a supported API that interacts with the widget the same way an end-user does. Widget implementation changes now become less likely to break user tests. For example, [Angular Material](https://material.angular.dev/components/categories) provides a test harness for each component in the library.

Component harnesses support multiple testing environments. You can use the same harness implementation in both unit and end-to-end tests. Test authors only need to learn one API and component authors don't have to maintain separate unit and end-to-end test implementations.

Many developers can be categorized by one of the following developer type categories: test authors, component harness authors, and harness environment authors. Use the table below to find the most relevant section in this guide based on these categories:

| Developer Type              | Description                                                                                                                                                                                                                                                                                            | Relevant Section                                                                                             |
| :-------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- |
| Test Authors                | Developers that use component harnesses written by someone else to test their application. For example, this could be an app developer who uses a third-party menu component and needs to interact with the menu in a unit test.                                                                       | [Using component harnesses in tests](guide/testing/using-component-harnesses)                                |
| Component harness authors   | Developers who maintain some reusable Angular components and want to create a test harness for its users to use in their tests. For example, an author of a third party Angular component library or a developer who maintains a set of common components for a large Angular application.             | [Creating component harnesses for your components](guide/testing/creating-component-harnesses)               |
| Harness environment authors | Developers who want to add support for using component harnesses in additional testing environments. For information on supported testing environments out-of-the-box, see the [test harness environments and loaders](guide/testing/using-component-harnesses#test-harness-environments-and-loaders). | [Adding support for additional testing environments](guide/testing/component-harnesses-testing-environments) |

For the full API reference, please see the [Angular CDK's component harness API reference page](/api#angular_cdk_testing).
# Using component harnesses in tests

## Before you start

TIP: This guide assumes you've already read the [component harnesses overview guide](guide/testing/component-harnesses-overview). Read that first if you're new to using component harnesses.

### CDK Installation

The [Component Dev Kit (CDK)](https://material.angular.dev/cdk/categories) is a set of behavior primitives for building components. To use the component harnesses, first install `@angular/cdk` from npm. You can do this from your terminal using the Angular CLI:

```shell
ng add @angular/cdk
```

## Test harness environments and loaders

You can use component test harnesses in different test environments. Angular CDK supports two built-in environments:

- Unit tests with Angular's `TestBed`
- End-to-end tests with [WebDriver](https://developer.mozilla.org/en-US/docs/Web/WebDriver)

Each environment provides a <strong>harness loader</strong>. The loader creates the harness instances you use throughout your tests. See below for more specific guidance on supported testing environments.

Additional testing environments require custom bindings. See the [adding harness support for additional testing environments guide](guide/testing/component-harnesses-testing-environments) for more information.

### Using the loader from `TestbedHarnessEnvironment` for unit tests

For unit tests you can create a harness loader from [TestbedHarnessEnvironment](/api/cdk/testing/testbed/TestbedHarnessEnvironment). This environment uses a [component fixture](api/core/testing/ComponentFixture) created by Angular's `TestBed`.

To create a harness loader rooted at the fixture's root element, use the `loader()` method:

```ts
const fixture = TestBed.createComponent(MyComponent);

// Create a harness loader from the fixture
const loader = TestbedHarnessEnvironment.loader(fixture);
...

// Use the loader to get harness instances
const myComponentHarness = await loader.getHarness(MyComponent);
```

To create a harness loader for harnesses for elements that fall outside the fixture, use the `documentRootLoader()` method. For example, code that displays a floating element or pop-up often attaches DOM elements directly to the document body, such as the `Overlay` service in Angular CDK.

You can also create a harness loader directly with `harnessForFixture()` for a harness at that fixture's root element directly.

### Using the loader from `SeleniumWebDriverHarnessEnvironment` for end-to-end tests

For WebDriver-based end-to-end tests you can create a harness loader with `SeleniumWebDriverHarnessEnvironment`.

Use the `loader()` method to get the harness loader instance for the current HTML document, rooted at the document's root element. This environment uses a WebDriver client.

```ts
let wd: webdriver.WebDriver = getMyWebDriverClient();
const loader = SeleniumWebDriverHarnessEnvironment.loader(wd);
...
const myComponentHarness = await loader.getHarness(MyComponent);
```

## Using a harness loader

Harness loader instances correspond to a specific DOM element and are used to create component harness instances for elements under that specific element.

To get `ComponentHarness` for the first instance of the element, use the `getHarness()` method. To get all `ComponentHarness` instances, use the `getAllHarnesses()` method.

```ts
// Get harness for first instance of the element
const myComponentHarness = await loader.getHarness(MyComponent);

// Get harnesses for all instances of the element
const myComponentHarnesses = await loader.getAllHarnesses(MyComponent);
```

In addition to `getHarness` and `getAllHarnesses`, `HarnessLoader` has several other useful methods for querying for harnesses:

- `getHarnessAtIndex(...)`: Gets the harness for a component that matches the given criteria at a specific index.
- `countHarnesses(...)`: Counts the number of component instances that match the given criteria.
- `hasHarness(...)`: Checks if at least one component instance matches the given criteria.

As an example, consider a reusable dialog-button component that opens a dialog on click. It contains the following components, each with a corresponding harness:

- `MyDialogButton` (composes the `MyButton` and `MyDialog` with a convenient API)
- `MyButton` (a standard button component)
- `MyDialog` (a dialog appended to `document.body` by `MyDialogButton` upon click)

The following test loads harnesses for each of these components:

```ts
let fixture: ComponentFixture<MyDialogButton>;
let loader: HarnessLoader;
let rootLoader: HarnessLoader;

beforeEach(() => {
  fixture = TestBed.createComponent(MyDialogButton);
  loader = TestbedHarnessEnvironment.loader(fixture);
  rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture);
});

it('loads harnesses', async () => {
  // Load a harness for the bootstrapped component with `harnessForFixture`
  dialogButtonHarness = await TestbedHarnessEnvironment.harnessForFixture(
    fixture,
    MyDialogButtonHarness,
  );

  // The button element is inside the fixture's root element, so we use `loader`.
  const buttonHarness = await loader.getHarness(MyButtonHarness);

  // Click the button to open the dialog
  await buttonHarness.click();

  // The dialog is appended to `document.body`, outside of the fixture's root element,
  // so we use `rootLoader` in this case.
  const dialogHarness = await rootLoader.getHarness(MyDialogHarness);

  // ... make some assertions
});
```

### Harness behavior in different environments

Harnesses may not behave exactly the same in all environments. Some differences are unavoidable between the real user interaction versus the simulated events generated in unit tests. Angular CDK makes a best effort to normalize the behavior to the extent possible.

### Interacting with child elements

To interact with elements below the root element of this harness loader, use the `HarnessLoader` instance of a child element. For the first instance of the child element, use the `getChildLoader()` method. For all instances of the child element, use the `getAllChildLoaders()` method.

```ts
const myComponentHarness = await loader.getHarness(MyComponent);

// Get loader for first instance of child element with '.child' selector
const childLoader = await myComponentHarness.getLoader('.child');

// Get loaders for all instances of child elements with '.child' selector
const allChildLoaders = await myComponentHarness.getAllChildLoaders('.child');
```

### Filtering harnesses

When a page contains multiple instances of a particular component, you may want to filter based on some property of the component to get a particular component instance. You can use a <strong>harness predicate</strong>, a class used to associate a `ComponentHarness` class with predicates functions that can be used to filter component instances, to do so.

When you ask a `HarnessLoader` for a harness, you're actually providing a HarnessQuery. A query can be one of two things:

- A harness constructor. This just gets that harness
- A `HarnessPredicate`, which gets harnesses that are filtered based on one or more conditions

`HarnessPredicate` does support some base filters (selector, ancestor) that work on anything that extends `ComponentHarness`.

```ts
// Example of loading a MyButtonComponentHarness with a harness predicate
const disabledButtonPredicate = new HarnessPredicate(MyButtonComponentHarness, {
  selector: '[disabled]',
});
const disabledButton = await loader.getHarness(disabledButtonPredicate);
```

However it's common for harnesses to implement a static `with()` method that accepts component-specific filtering options and returns a `HarnessPredicate`.

```ts
// Example of loading a MyButtonComponentHarness with a specific selector
const button = await loader.getHarness(MyButtonComponentHarness.with({selector: 'btn'}));
```

For more details refer to the specific harness documentation since additional filtering options are specific to each harness implementation.

## Using test harness APIs

While every harness defines an API specific to its corresponding component, they all share a common base class, [ComponentHarness](/api/cdk/testing/ComponentHarness). This base class defines a static property, `hostSelector`, that matches the harness class to instances of the component in the DOM.

Beyond that, the API of any given harness is specific to its corresponding component; refer to the component's documentation to learn how to use a specific harness.

As an example, the following is a test for a component that uses the [Angular Material slider component harness](https://material.angular.dev/components/slider/api#MatSliderHarness):

```ts
it('should get value of slider thumb', async () => {
  const slider = await loader.getHarness(MatSliderHarness);
  const thumb = await slider.getEndThumb();
  expect(await thumb.getValue()).toBe(50);
});
```

## Interop with Angular change detection

By default, test harnesses runs Angular's [change detection](/best-practices/runtime-performance) before reading the state of a DOM element and after interacting with a DOM element.

There may be times that you need finer-grained control over change detection in your tests. such as checking the state of a component while an async operation is pending. In these cases use the `manualChangeDetection` function to disable automatic handling of change detection for a block of code.

```ts
it('checks state while async action is in progress', async () => {
  const buttonHarness = loader.getHarness(MyButtonHarness);
  await manualChangeDetection(async () => {
    await buttonHarness.click();
    fixture.detectChanges();
    // Check expectations while async click operation is in progress.
    expect(isProgressSpinnerVisible()).toBe(true);
    await fixture.whenStable();
    // Check expectations after async click operation complete.
    expect(isProgressSpinnerVisible()).toBe(false);
  });
});
```

Almost all harness methods are asynchronous and return a `Promise` to support the following:

- Support for unit tests
- Support for end-to-end tests
- Insulate tests against changes in asynchronous behavior

The Angular team recommends using [await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) to improve the test readability. Calling `await` blocks the execution of your test until the associated `Promise` resolves.

Occasionally, you may want to perform multiple actions simultaneously and wait until they're all done rather than performing each action sequentially. For example, read multiple properties of a single component. In these situations use the `parallel` function to parallelize the operations. The parallel function works similarly to `Promise.all`, while also optimizing change detection checks.

```ts
it('reads properties in parallel', async () => {
  const checkboxHarness = loader.getHarness(MyCheckboxHarness);
  // Read the checked and intermediate properties simultaneously.
  const [checked, indeterminate] = await parallel(() => [
    checkboxHarness.isChecked(),
    checkboxHarness.isIndeterminate(),
  ]);
  expect(checked).toBe(false);
  expect(indeterminate).toBe(true);
});
```
# Creating harnesses for your components

## Before you start

TIP: This guide assumes you've already read the [component harnesses overview guide](guide/testing/component-harnesses-overview). Read that first if you're new to using component harnesses.

### When does creating a test harness make sense?

The Angular team recommends creating component test harnesses for shared components that are used in many places and have some user interactivity. This most commonly applies to widget libraries and similar reusable components. Harnesses are valuable for these cases because they provide the consumers of these shared components a well- supported API for interacting with a component. Tests that use harnesses can avoid depending on unreliable implementation details of these shared components, such as DOM structure and specific event listeners.

For components that appear in only one place, such as a page in an application, harnesses don't provide as much benefit. In these situations, a component's tests can reasonably depend on the implementation details of this component, as the tests and components are updated at the same time. However, harnesses still provide some value if you would use the harness in both unit and end-to-end tests.

### CDK Installation

The [Component Dev Kit (CDK)](https://material.angular.dev/cdk/categories) is a set of behavior primitives for building components. To use the component harnesses, first install `@angular/cdk` from npm. You can do this from your terminal using the Angular CLI:

```shell
ng add @angular/cdk
```

## Extending `ComponentHarness`

The abstract `ComponentHarness` class is the base class for all component harnesses. To create a custom component harness, extend `ComponentHarness` and implement the static property `hostSelector`.

The `hostSelector` property identifies elements in the DOM that match this harness subclass. In most cases, the `hostSelector` should be the same as the selector of the corresponding `Component` or `Directive`. For example, consider a simple popup component:

```ts
@Component({
  selector: 'my-popup',
  template: `
    <button (click)="toggle()">{{ triggerText() }}</button>
    @if (isOpen()) {
      <ng-content></ng-content>}
  `,
})
class MyPopup {
  triggerText = input('');

  isOpen = signal(false);

  toggle() {
    this.isOpen.update((value) => !value);
  }
}
```

In this case, a minimal harness for the component would look like the following:

```ts
class MyPopupHarness extends ComponentHarness {
  static hostSelector = 'my-popup';
}
```

While `ComponentHarness` subclasses require only the `hostSelector` property, most harnesses should also implement a static `with` method to generate `HarnessPredicate` instances. The [filtering harnesses section](guide/testing/using-component-harnesses#filtering-harnesses) covers this in more detail.

## Finding elements in the component's DOM

Each instance of a `ComponentHarness` subclass represents a particular instance of the corresponding component. You can access the component's host element via the `host() `method from the `ComponentHarness` base class.

`ComponentHarness` also offers several methods for locating elements within the component's DOM. These methods are `locatorFor()`, `locatorForOptional()`, and `locatorForAll()`. These methods create functions that find elements, they do not directly find elements. This approach safeguards against caching references to out-of-date elements. For example, when an `@if` block hides and then shows an element, the result is a new DOM element; using functions ensures that tests always reference the current state of the DOM.

See the [ComponentHarness API reference page](/api/cdk/testing/ComponentHarness) for the full list details of the different `locatorFor` methods.

For example, the `MyPopupHarness` example discussed above could provide methods to get the trigger and content elements as follows:

```ts
class MyPopupHarness extends ComponentHarness {
  static hostSelector = 'my-popup';

  // Gets the trigger element
  getTriggerElement = this.locatorFor('button');

  // Gets the content element.
  getContentElement = this.locatorForOptional('.my-popup-content');
}
```

## Working with `TestElement` instances

`TestElement` is an abstraction designed to work across different test environments (Unit tests, WebDriver, etc). When using harnesses, you should perform all DOM interaction via this interface. Other means of accessing DOM elements, such as `document.querySelector()`, do not work in all test environments.

`TestElement` has a number of methods to interact with the underlying DOM, such as `blur()`, `click()`, `getAttribute()`, and more. See the [TestElement API reference page](/api/cdk/testing/TestElement) for the full list of methods.

Do not expose `TestElement` instances to harness users unless it's an element the component consumer defines directly, such as the component's host element. Exposing `TestElement` instances for internal elements leads users to depend on a component's internal DOM structure.

Instead, provide more narrow-focused methods for specific actions the end-user may take or particular state they may observe. For example, `MyPopupHarness` from previous sections could provide methods like `toggle` and `isOpen`:

```ts
class MyPopupHarness extends ComponentHarness {
  static hostSelector = 'my-popup';

  protected getTriggerElement = this.locatorFor('button');
  protected getContentElement = this.locatorForOptional('.my-popup-content');

  /** Toggles the open state of the popup. */
  async toggle() {
    const trigger = await this.getTriggerElement();
    return trigger.click();
  }

  /** Checks if the popup us open. */
  async isOpen() {
    const content = await this.getContentElement();
    return !!content;
  }
}
```

## Loading harnesses for subcomponents

Larger components often compose sub-components. You can reflect this structure in a component's harness as well. Each of the `locatorFor` methods on `ComponentHarness` has an alternate signature that can be used for locating sub-harnesses rather than elements.

See the [ComponentHarness API reference page](/api/cdk/testing/ComponentHarness) for the full list of the different locatorFor methods.

For example, consider a menu build using the popup from above:

```ts
@Directive({
  selector: 'my-menu-item',
})
class MyMenuItem {}

@Component({
  selector: 'my-menu',
  template: `
    <my-popup>
      <ng-content />
    </my-popup>
  `,
})
class MyMenu {
  triggerText = input('');

  items = contentChildren(MyMenuItem);
}
```

The harness for `MyMenu` can then take advantage of other harnesses for `MyPopup` and `MyMenuItem`:

```ts
class MyMenuHarness extends ComponentHarness {
  static hostSelector = 'my-menu';

  protected getPopupHarness = this.locatorFor(MyPopupHarness);

  /** Gets the currently shown menu items (empty list if menu is closed). */
  getItems = this.locatorForAll(MyMenuItemHarness);

  /** Toggles open state of the menu. */
  async toggle() {
    const popupHarness = await this.getPopupHarness();
    return popupHarness.toggle();
  }
}

class MyMenuItemHarness extends ComponentHarness {
  static hostSelector = 'my-menu-item';
}
```

## Filtering harness instances with `HarnessPredicate`

When a page contains multiple instances of a particular component, you may want to filter based on some property of the component to get a particular component instance. For example, you may want a button with some specific text, or a menu with a specific ID. The `HarnessPredicate` class can capture criteria like this for a `ComponentHarness` subclass. While the test author is able to construct `HarnessPredicate` instances manually, it's easier when the `ComponentHarness` subclass provides a helper method to construct predicates for common filters.

You should create a static `with()` method on each `ComponentHarness` subclass that returns a `HarnessPredicate` for that class. This allows test authors to write easily understandable code, e.g. `loader.getHarness(MyMenuHarness.with({selector: '#menu1'}))`. In addition to the standard selector and ancestor options, the `with` method should add any other options that make sense for the particular subclass.

Harnesses that need to add additional options should extend the `BaseHarnessFilters` interface and additional optional properties as needed. `HarnessPredicate` provides several convenience methods for adding options: `stringMatches()`, `addOption()`, and `add()`. See the [HarnessPredicate API page](/api/cdk/testing/HarnessPredicate) for the full description.

For example, when working with a menu it is useful to filter based on trigger text and to filter menu items based on their text:

```ts
interface MyMenuHarnessFilters extends BaseHarnessFilters {
  /** Filters based on the trigger text for the menu. */
  triggerText?: string | RegExp;
}

interface MyMenuItemHarnessFilters extends BaseHarnessFilters {
  /** Filters based on the text of the menu item. */
  text?: string | RegExp;
}

class MyMenuHarness extends ComponentHarness {
  static hostSelector = 'my-menu';

  /** Creates a `HarnessPredicate` used to locate a particular `MyMenuHarness`. */
  static with(options: MyMenuHarnessFilters): HarnessPredicate<MyMenuHarness> {
    return new HarnessPredicate(MyMenuHarness, options).addOption(
      'trigger text',
      options.triggerText,
      (harness, text) => HarnessPredicate.stringMatches(harness.getTriggerText(), text),
    );
  }

  protected getPopupHarness = this.locatorFor(MyPopupHarness);

  /** Gets the text of the menu trigger. */
  async getTriggerText(): Promise<string> {
    const popupHarness = await this.getPopupHarness();
    return popupHarness.getTriggerText();
  }
}

class MyMenuItemHarness extends ComponentHarness {
  static hostSelector = 'my-menu-item';

  /** Creates a `HarnessPredicate` used to locate a particular `MyMenuItemHarness`. */
  static with(options: MyMenuItemHarnessFilters): HarnessPredicate<MyMenuItemHarness> {
    return new HarnessPredicate(MyMenuItemHarness, options).addOption(
      'text',
      options.text,
      (harness, text) => HarnessPredicate.stringMatches(harness.getText(), text),
    );
  }

  /** Gets the text of the menu item. */
  async getText(): Promise<string> {
    const host = await this.host();
    return host.text();
  }
}
```

You can pass a `HarnessPredicate` instead of a `ComponentHarness` class to any of the APIs on `HarnessLoader`, `LocatorFactory`, or `ComponentHarness`. This allows test authors to easily target a particular component instance when creating a harness instance. It also allows the harness author to leverage the same `HarnessPredicate` to enable more powerful APIs on their harness class. For example, consider the `getItems` method on the `MyMenuHarness` shown above. Adding a filtering API allows users of the harness to search for particular menu items:

```ts
class MyMenuHarness extends ComponentHarness {
  static hostSelector = 'my-menu';

  /** Gets a list of items in the menu, optionally filtered based on the given criteria. */
  async getItems(filters: MyMenuItemHarnessFilters = {}): Promise<MyMenuItemHarness[]> {
    const getFilteredItems = this.locatorForAll(MyMenuItemHarness.with(filters));
    return getFilteredItems();
  }
  ...
}
```

## Creating `HarnessLoader` for elements that use content projection

Some components project additional content into the component's template. See the [content projection guide](guide/components/content-projection) for more information.

Add a `HarnessLoader` instance scoped to the element containing the `<ng-content>` when you create a harness for a component that uses content projection. This allows the user of the harness to load additional harnesses for whatever components were passed in as content. `ComponentHarness` has several methods that can be used to create HarnessLoader instances for cases like this: `harnessLoaderFor()`, `harnessLoaderForOptional()`, `harnessLoaderForAll()`. See the [HarnessLoader interface API reference page](/api/cdk/testing/HarnessLoader) for more details.

For example, the `MyPopupHarness` example from above can extend `ContentContainerComponentHarness` to add support to load harnesses within the `<ng-content>` of the component.

```ts
class MyPopupHarness extends ContentContainerComponentHarness<string> {
  static hostSelector = 'my-popup';
}
```

## Accessing elements outside of the component's host element

There are times when a component harness might need to access elements outside of its corresponding component's host element. For example, code that displays a floating element or pop-up often attaches DOM elements directly to the document body, such as the `Overlay` service in Angular CDK.

In this case, `ComponentHarness` provides a method that can be used to get a `LocatorFactory` for the root element of the document. The `LocatorFactory` supports most of the same APIs as the `ComponentHarness` base class, and can then be used to query relative to the document's root element.

Consider if the `MyPopup` component above used the CDK overlay for the popup content, rather than an element in its own template. In this case, `MyPopupHarness` would have to access the content element via `documentRootLocatorFactory()` method that gets a locator factory rooted at the document root.

```ts
class MyPopupHarness extends ComponentHarness {
  static hostSelector = 'my-popup';

  /** Gets a `HarnessLoader` whose root element is the popup's content element. */
  async getHarnessLoaderForContent(): Promise<HarnessLoader> {
    const rootLocator = this.documentRootLocatorFactory();
    return rootLocator.harnessLoaderFor('my-popup-content');
  }
}
```

## Waiting for asynchronous tasks

The methods on `TestElement` automatically trigger Angular's change detection and wait for tasks inside the `NgZone`. In most cases no special effort is required for harness authors to wait on asynchronous tasks. However, there are some edge cases where this may not be sufficient.

Under some circumstances, Angular animations may require a second cycle of change detection and subsequent `NgZone` stabilization before animation events are fully flushed. In cases where this is needed, the `ComponentHarness` offers a `forceStabilize()` method that can be called to do the second round.

You can use `NgZone.runOutsideAngular()` to schedule tasks outside of NgZone. Call the `waitForTasksOutsideAngular()` method on the corresponding harness if you need to explicitly wait for tasks outside `NgZone` since this does not happen automatically.
