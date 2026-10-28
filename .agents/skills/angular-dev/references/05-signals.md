In Angular, you use _signals_ to create and manage state. A signal is a lightweight wrapper around a value.

Use the `signal` function to create a signal for holding local state:

```typescript
import {signal} from '@angular/core';

// Create a signal with the `signal` function.
const firstName = signal('Morgan');

// Read a signal value by calling it— signals are functions.
console.log(firstName());

// Change the value of this signal by calling its `set` method with a new value.
firstName.set('Jaime');

// You can also use the `update` method to change the value
// based on the previous value.
firstName.update((name) => name.toUpperCase());
```

Angular tracks where signals are read and when they're updated. The framework uses this information to do additional work, such as updating the DOM with new state. This ability to respond to changing signal values over time is known as _reactivity_.

## Computed expressions

A `computed` is a signal that produces its value based on other signals.

```typescript
import {signal, computed} from '@angular/core';

const firstName = signal('Morgan');
const firstNameCapitalized = computed(() => firstName().toUpperCase());

console.log(firstNameCapitalized()); // MORGAN
```

A `computed` signal is read-only; it does not have a `set` or an `update` method. Instead, the value of the `computed` signal automatically changes when any of the signals it reads change:

```typescript
import {signal, computed} from '@angular/core';

const firstName = signal('Morgan');
const firstNameCapitalized = computed(() => firstName().toUpperCase());
console.log(firstNameCapitalized()); // MORGAN

firstName.set('Jaime');
console.log(firstNameCapitalized()); // JAIME
```

## Using signals in components

Use `signal` and `computed` inside your components to create and manage state:

```ts
@Component({
  /* ... */
})
export class UserProfile {
  isTrial = signal(false);
  isTrialExpired = signal(false);
  showTrialDuration = computed(() => this.isTrial() && !this.isTrialExpired());

  activateTrial() {
    this.isTrial.set(true);
  }
}
```

TIP: Want to know more about Angular Signals? See the [In-depth Signals guide](guide/signals) for the full details.

## Next Step

Now that you have learned how to declare and manage dynamic data, it's time to learn how to use that data inside of templates.
# Dependent state with `linkedSignal`

You can use the `signal` function to hold some state in your Angular code. Sometimes, this state depends on some _other_ state. For example, imagine a component that lets the user select a shipping method for an order:

```typescript
@Component({
  /* ... */
})
export class ShippingMethodPicker {
  shippingOptions: Signal<ShippingMethod[]> = getShippingOptions();

  // Select the first shipping option by default.
  selectedOption = signal(this.shippingOptions()[0]);

  changeShipping(newOptionIndex: number) {
    this.selectedOption.set(this.shippingOptions()[newOptionIndex]);
  }
}
```

In this example, the `selectedOption` defaults to the first option, but changes if the user selects another option. But `shippingOptions` is a signal— its value may change! If `shippingOptions` changes, `selectedOption` may contain a value that is no longer a valid option.

**The `linkedSignal` function lets you create a signal to hold some state that is intrinsically _linked_ to some other state.** Revisiting the example above, `linkedSignal` can replace `signal`:

```ts
@Component({
  /* ... */
})
export class ShippingMethodPicker {
  shippingOptions: Signal<ShippingMethod[]> = getShippingOptions();

  // Initialize selectedOption to the first shipping option.
  selectedOption = linkedSignal(() => this.shippingOptions()[0]);

  changeShipping(index: number) {
    this.selectedOption.set(this.shippingOptions()[index]);
  }
}
```

`linkedSignal` works similarly to `signal` with one key difference— instead of passing a default value, you pass a _computation function_, just like `computed`. When the value of the computation changes, the value of the `linkedSignal` changes to the computation result. This helps ensure that the `linkedSignal` always has a valid value.

The following example shows how the value of a `linkedSignal` can change based on its linked state:

```ts
const shippingOptions = signal(['Ground', 'Air', 'Sea']);
const selectedOption = linkedSignal(() => shippingOptions()[0]);
console.log(selectedOption()); // 'Ground'

selectedOption.set(shippingOptions()[2]);
console.log(selectedOption()); // 'Sea'

shippingOptions.set(['Email', 'Will Call', 'Postal service']);
console.log(selectedOption()); // 'Email'
```

## Accounting for previous state

In some cases, the computation for a `linkedSignal` needs to account for the previous value of the `linkedSignal`.

In the example above, `selectedOption` always updates back to the first option when `shippingOptions` changes. You may, however, want to preserve the user's selection if their selected option is still somewhere in the list. To accomplish this, you can create a `linkedSignal` with a separate _source_ and _computation_:

```ts
interface ShippingMethod {
  id: number;
  name: string;
}

@Component({
  /* ... */
})
export class ShippingMethodPicker {
  constructor() {
    this.changeShipping(2);
    this.changeShippingOptions();
    console.log(this.selectedOption()); // {"id":2,"name":"Postal Service"}
  }

  shippingOptions = signal<ShippingMethod[]>([
    {id: 0, name: 'Ground'},
    {id: 1, name: 'Air'},
    {id: 2, name: 'Sea'},
  ]);

  selectedOption = linkedSignal<ShippingMethod[], ShippingMethod>({
    // `selectedOption` is set to the `computation` result whenever this `source` changes.
    source: this.shippingOptions,
    computation: (newOptions, previous) => {
      // If the newOptions contain the previously selected option, preserve that selection.
      // Otherwise, default to the first option.
      return newOptions.find((opt) => opt.id === previous?.value.id) ?? newOptions[0];
    },
  });

  changeShipping(index: number) {
    this.selectedOption.set(this.shippingOptions()[index]);
  }

  changeShippingOptions() {
    this.shippingOptions.set([
      {id: 0, name: 'Email'},
      {id: 1, name: 'Sea'},
      {id: 2, name: 'Postal Service'},
    ]);
  }
}
```

When you create a `linkedSignal`, you can pass an object with separate `source` and `computation` properties instead of providing just a computation.

The `source` can be any signal, such as a `computed` or component `input`. The `linkedSignal` updates its value when the `source` changes or when any signal referenced in the `computation` changes, updating its value with the result of the provided `computation`.

The `computation` is a function that receives the new value of `source` and a `previous` object. The `previous` object has two properties— `previous.source` is the previous value of `source`, and `previous.value` is the previous value of the `linkedSignal`. You can use these previous values to decide the new result of the computation.

HELPFUL: When using the `previous` parameter, it is necessary to provide the generic type arguments of `linkedSignal` explicitly. The first generic type corresponds with the type of `source` and the second generic type determines the output type of `computation`.

## Custom equality comparison

`linkedSignal`, as any other signal, can be configured with a custom equality function. This function is used by downstream dependencies to determine if that value of the `linkedSignal` (result of a computation) changed:

```typescript
const activeUser = signal({id: 123, name: 'Morgan', isAdmin: true});

const activeUserEditCopy = linkedSignal(() => activeUser(), {
  // Consider the user as the same if it's the same `id`.
  equal: (a, b) => a.id === b.id,
});

// Or, if separating `source` and `computation`
const activeUserEditCopy = linkedSignal({
  source: activeUser,
  computation: (user) => user,
  equal: (a, b) => a.id === b.id,
});
```
