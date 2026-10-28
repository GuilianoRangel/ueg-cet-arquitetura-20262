# Event listener statements

## Table of Contents

- **[Event listener statements](#event-listener-statements)**
- **[Attribute directives](#attribute-directives)**
  - [Building an attribute directive](#building-an-attribute-directive)
  - [Applying an attribute directive](#applying-an-attribute-directive)
  - [Handling user events](#handling-user-events)
  - [Passing values into an attribute directive](#passing-values-into-an-attribute-directive)
  - [Binding to a second property](#binding-to-a-second-property)
  - [Deactivating Angular processing with `NgNonBindable`](#deactivating-angular-processing-with-ngnonbindable)
- **[Structural directives](#structural-directives)**
  - [Example use case](#example-use-case)
  - [Structural directive shorthand](#structural-directive-shorthand)
  - [One structural directive per element](#one-structural-directive-per-element)
  - [Creating a structural directive](#creating-a-structural-directive)
  - [Structural directive syntax reference](#structural-directive-syntax-reference)
  - [Improving template type checking for custom directives](#improving-template-type-checking-for-custom-directives)
- **[Directive composition API](#directive-composition-api)**
  - [Adding directives to a component](#adding-directives-to-a-component)
  - [Including inputs and outputs](#including-inputs-and-outputs)
  - [Adding directives to another directive](#adding-directives-to-another-directive)
  - [Host directive semantics](#host-directive-semantics)

---


Event handlers are **statements** rather than expressions. While they support all of the same syntax as Angular expressions, there are two key differences:

1. Statements **do support** assignment operators (but not destructing assignments)
1. Statements **do not support** pipes
# Attribute directives

Change the appearance or behavior of DOM elements and Angular components with attribute directives.

## Building an attribute directive

This section walks you through creating a highlight directive that sets the background color of the host element to yellow.

1. To create a directive, use the CLI command [`ng generate directive`](tools/cli/schematics).

   ```shell
ng generate directive highlight
   ```

   The CLI creates `src/app/highlight.directive.ts`, a corresponding test file `src/app/highlight.directive.spec.ts`.

   ```typescript
import {Directive} from '@angular/core';

   @Directive({
     selector: '[appHighlight]',
   })
   export class HighlightDirective {}
   ```

   The `@Directive()` decorator's configuration property specifies the directive's CSS attribute selector, `[appHighlight]`.

1. Import `ElementRef` and `inject` from `@angular/core`.
   `ElementRef` grants direct access to the host DOM element through its `nativeElement` property.

1. Use [`inject`](guide/di) to obtain a reference to the host DOM element, the element to which you apply `appHighlight`.

1. Add logic to the `HighlightDirective` class that sets the background to yellow.

   <docs-code header="highlight.directive.ts" path="adev/src/content/examples/attribute-directives/src/app/highlight.directive.1.ts"/>

IMPORTANT: Directives _do not_ support namespaces.

```html
<!-- avoid -->
<p app:Highlight>This is invalid</p>
```

## Applying an attribute directive

To use the `HighlightDirective`, add a `<p>` element to the HTML template with the directive as an attribute.

<docs-code header="app.component.html" path="adev/src/content/examples/attribute-directives/src/app/app.component.1.html" region="applied"/>

Angular creates an instance of the `HighlightDirective` class, which uses `inject(ElementRef)` to get a reference to the `<p>` element and set its background style to yellow.

## Handling user events

This section shows you how to detect when a user mouses into or out of the element and to respond by setting or clearing the highlight color.

1. Configure host event bindings using the `host` property in the `@Directive()` decorator.

   <docs-code header="src/app/highlight.directive.ts (decorator)" path="adev/src/content/examples/attribute-directives/src/app/highlight.directive.2.ts" region="decorator"/>

1. Add two event handler methods, and map host element events to them via the `host` property.

   <docs-code header="highlight.directive.ts (mouse-methods)" path="adev/src/content/examples/attribute-directives/src/app/highlight.directive.2.ts" region="mouse-methods"/>

Subscribe to events of the DOM element that hosts an attribute directive (the `<p>` in this case) by configuring event listeners on the directive's [`host` property](guide/components/host-elements#binding-to-the-host-element).

HELPFUL: The handlers delegate to a helper method, `highlight()`, that sets the color on the host DOM element, `el`.

The complete directive is as follows:

<docs-code header="highlight.directive.ts" path="adev/src/content/examples/attribute-directives/src/app/highlight.directive.2.ts"/>

The background color appears when the pointer hovers over the paragraph element and disappears as the pointer moves out.


## Passing values into an attribute directive

This section walks you through setting the highlight color while applying the `HighlightDirective`.

1. In `highlight.directive.ts`, import `input` from `@angular/core`.

   <docs-code header="highlight.directive.ts (imports)" path="adev/src/content/examples/attribute-directives/src/app/highlight.directive.3.ts" region="imports"/>

1. Add an `appHighlight` `input` property.

   <docs-code header="highlight.directive.ts" path="adev/src/content/examples/attribute-directives/src/app/highlight.directive.3.ts" region="input"/>

   The `input()` function adds metadata to the class that makes the directive's `appHighlight` property available for binding.

1. In `app.component.ts`, add a `color` property to the `AppComponent`.

   <docs-code header="app.component.ts (class)" path="adev/src/content/examples/attribute-directives/src/app/app.component.1.ts" region="class"/>

1. To simultaneously apply the directive and the color, use property binding with the `appHighlight` directive selector, setting it equal to `color`.

   <docs-code header="app.component.html (color)" path="adev/src/content/examples/attribute-directives/src/app/app.component.html" region="color"/>

   The `[appHighlight]` attribute binding performs two tasks:
   - Applies the highlighting directive to the `<p>` element
   - Sets the directive's highlight color with a property binding

### Setting the value with user input

This section guides you through adding radio buttons to bind your color choice to the `appHighlight` directive.

1. Add markup to `app.component.html` for choosing a color as follows:

   <docs-code header="app.component.html (v2)" path="adev/src/content/examples/attribute-directives/src/app/app.component.html" region="v2"/>

2. Revise the `AppComponent.color` so that it has no initial value.

   <docs-code header="app.component.ts (class)" path="adev/src/content/examples/attribute-directives/src/app/app.component.ts" region="class"/>

3. In `highlight.directive.ts`, revise `onMouseEnter` method so that it first tries to highlight with `appHighlight` and falls back to `red` if `appHighlight` is `undefined`.
   <docs-code header="highlight.directive.ts (mouse-enter)" path="adev/src/content/examples/attribute-directives/src/app/highlight.directive.3.ts" region="mouse-enter"/>

4. Serve your application to verify that the user can choose the color with the radio buttons.

   

## Binding to a second property

This section guides you through configuring your application so the developer can set the default color.

1. Add a second `input()` property to `HighlightDirective` called `defaultColor`.

   <docs-code header="highlight.directive.ts (defaultColor)" path="adev/src/content/examples/attribute-directives/src/app/highlight.directive.ts" region="defaultColor"/>

2. Revise the directive's `onMouseEnter` so that it first tries to highlight with the `appHighlight`, then with the `defaultColor`, and falls back to `red` if both properties are `undefined`.

   <docs-code header="highlight.directive.ts (mouse-enter)" path="adev/src/content/examples/attribute-directives/src/app/highlight.directive.ts" region="mouse-enter"/>

3. To bind to the `AppComponent.color` and fall back to "violet" as the default color, add the following HTML.
   In this case, the `defaultColor` binding doesn't use square brackets, `[]`, because the value is a static string, not a dynamic expression.

   <docs-code header="app.component.html (defaultColor)" path="adev/src/content/examples/attribute-directives/src/app/app.component.html" region="defaultColor"/>

   As with components, you can add multiple directive property bindings to a host element.

The default color is red if there is no default color binding.
When the user chooses a color the selected color becomes the active highlight color.


## Deactivating Angular processing with `NgNonBindable`

To prevent expression evaluation in the browser, add `ngNonBindable` to the host element.
`ngNonBindable` deactivates interpolation, directives, and binding in templates.

In the following example, the expression `{{ 1 + 1 }}` renders just as it does in your code editor, and does not display `2`.

<docs-code header="app.component.html" path="adev/src/content/examples/attribute-directives/src/app/app.component.html" region="ngNonBindable"/>

Applying `ngNonBindable` to an element stops binding for that element's child elements.
However, `ngNonBindable` still lets directives work on the element where you apply `ngNonBindable`.
In the following example, the `appHighlight` directive is still active but Angular does not evaluate the expression `{{ 1 + 1 }}`.

<docs-code header="app.component.html" path="adev/src/content/examples/attribute-directives/src/app/app.component.html" region="ngNonBindable-with-directive"/>

If you apply `ngNonBindable` to a parent element, Angular disables interpolation and binding of any sort, such as property binding or event binding, for the element's children.
# Structural directives

Structural directives are directives applied to an `<ng-template>` element that conditionally or repeatedly render the content of that `<ng-template>`.

## Example use case

In this guide you'll build a structural directive which fetches data from a given data source and renders its template when that data is available. This directive is called `SelectDirective`, after the SQL keyword `SELECT`, and match it with an attribute selector `[select]`.

`SelectDirective` will have an input naming the data source to be used, which you will call `selectFrom`. The `select` prefix for this input is important for the [shorthand syntax](#structural-directive-shorthand). The directive will instantiate its `<ng-template>` with a template context providing the selected data.

The following is an example of using this directive directly on an `<ng-template>` would look like:

```html
<ng-template select let-data [selectFrom]="source">
  <p>The data is: {{ data }}</p>
</ng-template>
```

The structural directive can wait for the data to become available and then render its `<ng-template>`.

HELPFUL: Note that Angular's `<ng-template>` element defines a template that doesn't render anything by default, if you just wrap elements in an `<ng-template>` without applying a structural directive those elements will not be rendered.

For more information, see the [ng-template API](api/core/ng-template) documentation.

## Structural directive shorthand

Angular supports a shorthand syntax for structural directives which avoids the need to explicitly author an `<ng-template>` element.

Structural directives can be applied directly on an element by prefixing the directive attribute selector with an asterisk (`*`), such as `*select`. Angular transforms the asterisk in front of a structural directive into an `<ng-template>` that hosts the directive and surrounds the element and its descendants.

You can use this with `SelectDirective` as follows:

```html
<p *select="let data; from: source">The data is: {{ data }}</p>
```

This example shows the flexibility of structural directive shorthand syntax, which is sometimes called _microsyntax_.

When used in this way, only the structural directive and its bindings are applied to the `<ng-template>`. Any other attributes or bindings on the `<p>` tag are left alone. For example, these two forms are equivalent:

```html
<!-- Shorthand syntax: -->
<p class="data-view" *select="let data; from: source">The data is: {{ data }}</p>

<!-- Long-form syntax: -->
<ng-template select let-data [selectFrom]="source">
  <p class="data-view">The data is: {{ data }}</p>
</ng-template>
```

Shorthand syntax is expanded through a set of conventions. A more thorough [grammar](#structural-directive-syntax-reference) is defined below, but in the above example, this transformation can be explained as follows:

The first part of the `*select` expression is `let data`, which declares a template variable `data`. Since no assignment follows, the template variable is bound to the template context property `$implicit`.

The second piece of syntax is a key-expression pair, `from source`. `from` is a binding key and `source` is a regular template expression. Binding keys are mapped to properties by transforming them to PascalCase and prepending the structural directive selector. The `from` key is mapped to `selectFrom`, which is then bound to the expression `source`. This is why many structural directives will have inputs that are all prefixed with the structural directive's selector.

## One structural directive per element

You can only apply one structural directive per element when using the shorthand syntax. This is because there is only one `<ng-template>` element onto which that directive gets unwrapped. Multiple directives would require multiple nested `<ng-template>`, and it's unclear which directive should be first. `<ng-container>` can be used to create wrapper layers when multiple structural directives need to be applied around the same physical DOM element or component, which allows the user to define the nested structure.

## Creating a structural directive

This section guides you through creating the `SelectDirective`.

<docs-workflow>
<docs-step title="Generate the directive">
Using the Angular CLI, run the following command, where `select` is the name of the directive:

```shell
ng generate directive select
```

Angular creates the directive class and specifies the CSS selector, `[select]`, that identifies the directive in a template.
</docs-step>
<docs-step title="Make the directive structural">
Import `TemplateRef`, `ViewContainerRef`, and `input`. Inject `TemplateRef` and `ViewContainerRef` in the directive as private properties.

```ts
import {Directive, TemplateRef, ViewContainerRef, inject, input} from '@angular/core';

export interface DataSource<T> {
  load(): Promise<T>;
}

@Directive({
  selector: '[select]',
})
export class SelectDirective {
  private templateRef = inject(TemplateRef);
  private viewContainerRef = inject(ViewContainerRef);
}
```

</docs-step>
<docs-step title="Add the 'selectFrom' input">
Add a `selectFrom` `input()` property.

```ts
export class SelectDirective {
  // ...
  selectFrom = input.required<DataSource<unknown>>();
}
```

</docs-step>
<docs-step title="Add the business logic">
With `SelectDirective` now scaffolded as a structural directive with its input, you can now add the logic to fetch the data and render the template with it:

```ts
export class SelectDirective {
  // ...
  async ngOnInit() {
    const data = await this.selectFrom().load();
    this.viewContainerRef.createEmbeddedView(this.templateRef, {
      // Create the embedded view with a context object that contains
      // the data via the key `$implicit`.
      $implicit: data,
    });
  }
}
```

</docs-step>
</docs-workflow>

That's it - `SelectDirective` is up and running. A follow-up step might be to [add template type-checking support](#typing-the-directives-context).

## Structural directive syntax reference

When you write your own structural directives, use the following syntax:

```ts
{hideCopy}
_: prefix = "( :let | :expression ) (';' | ',')? ( :let | :as | :keyExp )_";
```

The following patterns describe each portion of the structural directive grammar:

```ts
as = :export "as" :local ";"?
keyExp = :key ":"? :expression ("as" :local)? ";"?
let = "let" :local "=" :export ";"?
```

| Keyword      | Details                                            |
| :----------- | :------------------------------------------------- |
| `prefix`     | HTML attribute key                                 |
| `key`        | HTML attribute key                                 |
| `local`      | Local variable name used in the template           |
| `export`     | Value exported by the directive under a given name |
| `expression` | Standard Angular expression                        |

### How Angular translates shorthand

Angular translates structural directive shorthand into the normal binding syntax as follows:

| Shorthand                       | Translation                                                     |
| :------------------------------ | :-------------------------------------------------------------- |
| `prefix` and naked `expression` | `[prefix]="expression"`                                         |
| `keyExp`                        | `[prefixKey]="expression"` (The `prefix` is added to the `key`) |
| `let local`                     | `let-local="export"`                                            |

### Shorthand examples

The following table provides shorthand examples:

| Shorthand                                                             | How Angular interprets the syntax                                                                             |
| :-------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------ |
| `*myDir="let item of [1,2,3]"`                                        | `<ng-template myDir let-item [myDirOf]="[1, 2, 3]">`                                                          |
| `*myDir="let item of [1,2,3] as items; trackBy: myTrack; index as i"` | `<ng-template myDir let-item [myDirOf]="[1,2,3]" let-items="myDirOf" [myDirTrackBy]="myTrack" let-i="index">` |
| `*ngComponentOutlet="componentClass";`                                | `<ng-template [ngComponentOutlet]="componentClass">`                                                          |
| `*ngComponentOutlet="componentClass; inputs: myInputs";`              | `<ng-template [ngComponentOutlet]="componentClass" [ngComponentOutletInputs]="myInputs">`                     |
| `*myDir="exp as value"`                                               | `<ng-template [myDir]="exp" let-value="myDir">`                                                               |

## Improving template type checking for custom directives

You can improve template type checking for custom directives by adding template guards to your directive definition.
These guards help the Angular template type checker find mistakes in the template at compile time, which can avoid runtime errors.
Two different types of guards are possible:

- `ngTemplateGuard_(input)` lets you control how an input expression should be narrowed based on the type of a specific input.
- `ngTemplateContextGuard` is used to determine the type of the context object for the template, based on the type of the directive itself.

This section provides examples of both kinds of guards.
For more information, see [Template type checking](tools/cli/template-typecheck 'Template type-checking guide').

### Type narrowing with template guards

A structural directive in a template controls whether that template is rendered at run time. Some structural directives want to perform type narrowing based on the type of input expression.

There are two narrowings which are possible with input guards:

- Narrowing the input expression based on a TypeScript type assertion function.
- Narrowing the input expression based on its truthiness.

To narrow the input expression by defining a type assertion function:

```ts
// This directive only renders its template if the actor is a user.
// You want to assert that within the template, the type of the `actor`
// expression is narrowed to `User`.
@Directive(...)
class ActorIsUser {
  actor = input<User | Robot>();

  static ngTemplateGuard_actor(dir: ActorIsUser, expr: User | Robot): expr is User {
    // The return statement is unnecessary in practice, but included to
    // prevent TypeScript errors.
    return true;
  }
}
```

Type-checking will behave within the template as if the `ngTemplateGuard_actor` has been asserted on the expression bound to the input.

Some directives only render their templates when an input is truthy. It's not possible to capture the full semantics of truthiness in a type assertion function, so instead a literal type of `'binding'` can be used to signal to the template type-checker that the binding expression itself should be used as the guard:

```ts
@Directive(...)
class CustomIf {
  condition = input.required<boolean>();

  static ngTemplateGuard_condition: 'binding';
}
```

The template type-checker will behave as if the expression bound to `condition` was asserted to be truthy within the template.

### Typing the directive's context

If your structural directive provides a context to the instantiated template, you can properly type it inside the template by providing a static `ngTemplateContextGuard` type assertion function. This function can use the type of the directive to derive the type of the context, which is useful when the type of the directive is generic.

For the `SelectDirective` described above, you can implement an `ngTemplateContextGuard` to correctly specify the data type, even if the data source is generic.

```ts
// Declare an interface for the template context:
export interface SelectTemplateContext<T> {
  $implicit: T;
}

@Directive(...)
export class SelectDirective<T> {
  // The directive's generic type `T` will be inferred from the `DataSource` type
  // passed to the input.
  selectFrom = input.required<DataSource<T>>();

  // Narrow the type of the context using the generic type of the directive.
  static ngTemplateContextGuard<T>(dir: SelectDirective<T>, ctx: any): ctx is SelectTemplateContext<T> {
    // As before the guard body is not used at runtime, and included only to avoid
    // TypeScript errors.
    return true;
  }
}
```
# Directive composition API

Angular directives offer a great way to encapsulate reusable behaviors— directives can apply
attributes, CSS classes, and event listeners to an element.

The _directive composition API_ lets you apply directives to a component's host element from
_within_ the component TypeScript class.

## Adding directives to a component

You apply directives to a component by adding a `hostDirectives` property to a component's
decorator. We call such directives _host directives_.

In this example, we apply the directive `MenuBehavior` to the host element of `AdminMenu`. This
works similarly to applying the `MenuBehavior` to the `<admin-menu>` element in a template.

```typescript
@Component({
  selector: 'admin-menu',
  templateUrl: './admin-menu.html',
  hostDirectives: [MenuBehavior],
})
export class AdminMenu {}
```

When the framework renders a component, Angular also creates an instance of each host directive. The
directives' host bindings apply to the component's host element. By default, host directive inputs
and outputs are not exposed as part of the component's public API. See
[Including inputs and outputs](#including-inputs-and-outputs) below for more information.

**Angular applies host directives statically at compile time.** You cannot dynamically add
directives at runtime.

**Directives used in `hostDirectives` may not specify `standalone: false`.**

**Angular ignores the `selector` of directives applied in the `hostDirectives` property.**

## Including inputs and outputs

When you apply `hostDirectives` to your component, the inputs and outputs from the host directives
are not included in your component's API by default. You can explicitly include inputs and outputs
in your component's API by expanding the entry in `hostDirectives`:

```typescript
@Component({
  selector: 'admin-menu',
  templateUrl: './admin-menu.html',
  hostDirectives: [
    {
      directive: MenuBehavior,
      inputs: ['menuId'],
      outputs: ['menuClosed'],
    },
  ],
})
export class AdminMenu {}
```

By explicitly specifying the inputs and outputs, consumers of the component with `hostDirective` can
bind them in a template:

```html
<admin-menu menuId="top-menu" (menuClosed)="logMenuClosed()"></admin-menu>
```

Furthermore, you can alias inputs and outputs from `hostDirective` to customize the API of your
component:

```typescript
@Component({
  selector: 'admin-menu',
  templateUrl: './admin-menu.html',
  hostDirectives: [
    {
      directive: MenuBehavior,
      inputs: ['menuId: id'],
      outputs: ['menuClosed: closed'],
    },
  ],
})
export class AdminMenu {}
```

```html
<admin-menu id="top-menu" (closed)="logMenuClosed()"></admin-menu>
```

## Adding directives to another directive

You can also add `hostDirectives` to other directives, in addition to components. This enables the
transitive aggregation of multiple behaviors.

In the following example, we define two directives, `Menu` and `Tooltip`. We then compose the behavior
of these two directives in `MenuWithTooltip`. Finally, we apply `MenuWithTooltip`
to `SpecializedMenuWithTooltip`.

When `SpecializedMenuWithTooltip` is used in a template, it creates instances of all of `Menu`
, `Tooltip`, and `MenuWithTooltip`. Each of these directives' host bindings apply to the host
element of `SpecializedMenuWithTooltip`.

```ts
@Directive({
  /* ... */
})
export class Menu {}

@Directive({
  /* ... */
})
export class Tooltip {}

// MenuWithTooltip can compose behaviors from multiple other directives
@Directive({
  hostDirectives: [Tooltip, Menu],
})
export class MenuWithTooltip {}

// CustomWidget can apply the already-composed behaviors from MenuWithTooltip
@Directive({
  hostDirectives: [MenuWithTooltip],
})
export class SpecializedMenuWithTooltip {}
```

## Host directive semantics

### Directive execution order

Host directives go through the same lifecycle as components and directives used directly in a
template. However, host directives always execute their constructor, lifecycle hooks, and bindings _before_ the component or directive on which they are applied.

The following example shows minimal use of a host directive:

```typescript
@Component({
  selector: 'admin-menu',
  templateUrl: './admin-menu.html',
  hostDirectives: [MenuBehavior],
})
export class AdminMenu {}
```

The order of execution here is:

1. `MenuBehavior` instantiated
2. `AdminMenu` instantiated
3. `MenuBehavior` receives inputs (`ngOnInit`)
4. `AdminMenu` receives inputs (`ngOnInit`)
5. `MenuBehavior` applies host bindings
6. `AdminMenu` applies host bindings

This order of operations means that components with `hostDirectives` can override any host bindings
specified by a host directive.

This order of operations extends to nested chains of host directives, as shown in the following
example.

```typescript
@Directive({...})
export class Tooltip { }

@Directive({
  hostDirectives: [Tooltip],
})
export class CustomTooltip { }

@Directive({
  hostDirectives: [CustomTooltip],
})
export class EvenMoreCustomTooltip { }
```

In the example above, the order of execution is:

1. `Tooltip` instantiated
2. `CustomTooltip` instantiated
3. `EvenMoreCustomTooltip` instantiated
4. `Tooltip` receives inputs (`ngOnInit`)
5. `CustomTooltip` receives inputs (`ngOnInit`)
6. `EvenMoreCustomTooltip` receives inputs (`ngOnInit`)
7. `Tooltip` applies host bindings
8. `CustomTooltip` applies host bindings
9. `EvenMoreCustomTooltip` applies host bindings

### Dependency injection

A component or directive that specifies `hostDirectives` can inject the instances of those host
directives and vice versa.

When applying host directives to a component, both the component and host directives can define
providers.

If a component or directive with `hostDirectives` and those host directives both provide the same
injection token, the providers defined by class with `hostDirectives` take precedence over providers
defined by the host directives.

### Host directive de-duplication

When the same directive appears more than once in the resolved host directive tree, it is automatically de-duplicated rather than throwing an error. Two deterministic rules are used to decide which match survives.

#### Template match takes precedence

If a directive matches an element once through a **template selector** and also appears as a
**host directive**, Angular keeps only the template match and discards all host directive matches.

The mental model is that a host directive match represents `Partial<YourDirective>` , a partial
application where only the inputs and outputs explicitly listed in `hostDirectives` are exposed,
while a template match represents the full directive with its complete public API.

```ts
@Directive({selector: '[hoverable]'})
export class Hoverable {}

@Component({
  selector: 'app-button',
  hostDirectives: [Hoverable],
})
export class Button {}
```

```html
<!-- Hoverable is matched by selector AND as a host directive of Button. -->
<!-- Angular keeps only the selector match, which has the full public API. -->
<app-button hoverable></app-button>
```

#### Multiple host directive matches are merged

If the same directive appears **more than once as a host directive** , for example, when two
directives both declare a common dependency in their `hostDirectives` , Angular merges all
instances into a single directive instance. The input and output mappings from all instances are
combined.

This resolves the classic [diamond problem](https://en.wikipedia.org/wiki/Multiple_inheritance#The_diamond_problem) in host directive composition:

```ts
// A shared behavior that both triggers need
@Directive({
  host: {
    '[attr.data-trigger-id]': 'triggerId',
  },
})
export class TriggerRef {
  readonly triggerId = `trigger-${crypto.randomUUID()}`;
}

// Two separate triggers, each declaring TriggerRef as a host directive
@Directive({
  selector: '[popoverTrigger]',
  hostDirectives: [TriggerRef],
})
export class PopoverTrigger {
  readonly triggerRef = inject(TriggerRef);
}

@Directive({
  selector: '[dropdownTrigger]',
  hostDirectives: [TriggerRef],
})
export class DropdownTrigger {
  readonly triggerRef = inject(TriggerRef);
}
```

```html
<!-- Angular keeps one TriggerRef instance, shared by both triggers. -->
<button popoverTrigger dropdownTrigger>Actions</button>
```

HELPFUL: Because Angular produces only one instance of the shared directive, both `PopoverTrigger`
and `DropdownTrigger` receive the same `TriggerRef` instance when they inject it.

#### Conflicting aliases

When Angular merges duplicate host directive matches it also merges their input and output mappings.
If two instances of the same host directive expose the **same input or output under different
aliases**, Angular throws an error at compile time ([NG8024](errors/NG8024))

```ts
@Directive({
  selector: '[popoverTrigger]',
  hostDirectives: [{directive: TriggerRef, inputs: ['triggerId: popoverTriggerId']}],
})
export class PopoverTrigger {}

@Directive({
  selector: '[dropdownTrigger]',
  hostDirectives: [
    {directive: TriggerRef, inputs: ['triggerId: dropdownTriggerId']}, // different alias!
  ],
})
export class DropdownTrigger {}
```

```html
<!-- Error: triggerId is exposed as both "popoverTriggerId" and "dropdownTriggerId". -->
<button popoverTrigger dropdownTrigger></button>
```

To resolve this, ensure that both paths expose the shared input or output under the same alias, or
do not expose it at all.
