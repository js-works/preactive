# preactive

A R&D project to evaluate an alternative API for developing components with Preact using an alternative to hook functions (called "extensions").<br>
The main advantages of the new API are:

- No rules of hooks
- No special linter necessary
- 100% accurately typeable

Be aware that this project is just for research purposes and
is not meant to be used in production.

### Installation

```
git clone https://github.com/js-works/preactive.git
cd preactive
npm install
```

### Running demos

```
npm run storybook
```

## Examples

Remark: We are using the following naming convention to reduce the amount of noise in the source code (for non-trivial components, where you access the props and the state object very often, that makes quite a difference):

- `p` is the variable for the props object
- `s` is the variable for a state object

### Simple counter

```tsx
import { render } from 'preact';
import { component } from 'preactive';
import { preset, state } from 'preactive/ext';

const Counter = component('Counter')<{
  initialCount?: number;
  label?: string;
}>((p) => {
  preset(p, () => ({
    initialCount: 0,
    label: 'Counter'
  }));

  const [s, set] = state({ count: p.initialCount });
  const increment = () => set.count((it) => it + 1);

  return () => (
    <div>
      <button onClick={increment}>
        {p.label}: {s.count}
      </button>
    </div>
  );
});

render(<Counter />, document.querySelector('#app')!);
```

### Additional example - showing more features

```tsx
import { h, render } from 'preact';
import { component } from 'preactive';
import { effect, preset, state } from 'preactive/ext';

const Counter = component('Counter')<{
  initialCount?: number;
  label?: string;
}>((p) => {
  preset(p, () => ({
    initialCount: 0,
    label: 'Counter'
  }));

  const [s, set] = state({ count: p.initialCount });
  const increment = () => s.count((it) => it + 1);

  effect(
    () => console.log(`Value of "${p.label}": ${s.count}`),
    () => [s.count]
  );

  return () => (
    <div>
      <button onClick={increment}>
        {p.label}: {s.count}
      </button>
    </div>
  );
});

render(<Counter />, document.querySelector('#app')!);
```

## API

### Core functions

- `component(displayName, render: props => vnode): ComponentClass`
- `component(displayName, init: props => () => vnode): ComponentClass`
- `component(displayName): (render: props => vnode) => ComponentClass`
- `component(displayName): (init: props => () => vnode) => ComponentClass`

### Utility functions

- tbd

### Extensions

- `atom(initialValue)`
- `state(initialValues)`
- `createMemo(calculation, getDependencies)`
- `consume(context)`
- `effect(action, getDependencies? | null)`
- `interval(action, milliseconds)`
- `handlePromise(getPromise)`
- `preset(props, defaultProps or getDefaultProps)`

## Project state

This R&D project is in a very early development state
