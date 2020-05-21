# js-preactive 

A R&D project to evaluate an alternative API for developing components
with Preact using an alternative to hook functions (called "handlers").<br>
The main advantages of the new API are:

- 0% magic
- Does not make any trouble for the garbage collector
- No rules of hooks
- No special linter necessary
- 100% accurately typeable - in the function type signature
  of handler functions or function that generate handler functions etc.,
  it will always be visible what we are dealing with.

### Installation

```
git clone https://github.com/js-works/js-preactive.git
cd preactive
npm install
```

### Running demos

```
npm run storybook
```

## Examples

### Stateless components

```jsx
import { h, render } from 'preact'
import { stateless } from 'js-preactive'

const HelloWorld = stateless('HelloWorld', ({
  salutation = 'Hello',
  name = 'world'
}) => {
  return (
    <div>
      {salutation}, {name}
    </div>
  )
})

render(<HelloWorld/>, document.getElementById('app'))
```

### Stateful components

```jsx
import { h, render } from 'preact'
import { stateful, withProps, withState } from 'js-preactive'

const Counter = stateful('Counter', c => {
  const
    props = withProps(c, {
      initialCount: 0,
      label: 'Counter'
    }),

    [state, setState] = withState(c, {
      count: props.initialCount
    }),

    onIncrement = () => setState('count', it => it + 1)

  return () =>
    <div>
      <label>{props.label}: </label>
      <button onClick={onIncrement}>{state.count}</button>
    </div>
})

render(<Counter/>, document.getElementById('app'))
```

In the above examples the `c` is a so called component controller
(some kind of representation for the component instance).
The type of the component controller is currently the following
(please be aware that "normal" developers will never have to with these
methods directly they will only be used internally by some basic
handler and utility functions):

```typescript
type Ctrl<P extends Props = {}> = {
  getDisplayName(): string,
  getProps(): P,
  isInitialized(): boolean,
  isMounted(): boolean,
  refresh(runOnceBeforeRender?: Action): void,
  getContextValue<T>(context: Context<T>): T,
  afterMount(action: Action): void,
  afterUpdate(action: Action): void,
  beforeUnmount(action: Action): void,
}

type Props = Record<string, any>
type Action = () => void
type Context<T> = Preact.Context<T>
```

### Additional example - showing some more features

```jsx
import { h, render } from 'preact'
import { stateful, withEffect, withProps, withValue } from 'js-preactive'

const Counter = stateful('Counter', c => {
  const
    props = withProps(c, { initialCount: 0, label: 'Counter' }),
    [count, setCount] = withValue(c, props.initialCount),
    onIncrement = () => setCount(it => it + 1)

  withEffect(c, () => {
    console.log(`"${props.label}" has been mounted`)

    return () => console.log(`Unmounting "${props.label}"`)
  }, null)

  withEffect(c, () => {
    console.log(`Value of "${props.label}": ${count.value}`)
  }, () => [count.value])

  return () =>
    <div>
      <label>{props.label}: </label>
      <button onClick={onIncrement}>{count.value}</button>
    </div>
})

render(<Counter/>, document.getElementById('app'))
```

## API

### Component definition

- `stateless(displayName, render: props => vnode)`
- `stateful(displayName, init: c => props => vnode)`

### Utility functions

- `isMounted(c)`
- `refresh(c)`
- `getContextValue(c, context, defaultValue?)`
- `asRef(valueOrRef)`
- `toRef(getter)`

### Handlers

- `withProps(c, defaultProps?)`
- `withState(c, initialState)`
- `withValue(c, initialCount)`
- `withMemo(c, calculation, () => dependencies)`
- `withContext(c, context)`
- `withEffect(c, action, () => dependencies)`
- `withInterval(c, action, milliseconds)`
- `withPromise(c, () => getPromise)`

## Project state

This R&D project is in a very early development state
