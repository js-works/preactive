# js-preactive 

A R&D project to evaluate an alternative API for developing
components and hook functions with Preact.<br>
The main advantages of the new API are:

- 0% magic
- Does not make any trouble for the garbage collector
- No rules of hooks
- No special linter necessary
- 100% accurately typeable - in the function type signature
  of hook functions or function that generate hook functions etc.,
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
import { statelessComponent } from 'js-preactive'

const HelloWorld = statelessComponent('HelloWorld', props => {
  return (
    <div>
      {props.salutation || 'Hello'}, {props.name || 'world'}
    </div>
  )
})
```

### Stateful components

```jsx
import { h, render } from 'preact'
import { statefulComponent, useState } from 'js-preactive'

const Counter = statefulComponent('Counter', (c, props) => {
  const
    [state, setState] = useState(c, { count: props.initialCount || 0 }),
    onIncrement = () => setState('count', it => it + 1)

  return () =>
    <div>
      <label>{props.label || 'Counter'}: </label>
      <button onClick={onIncrement}>{state.count}</button>
    </div>
})

render(<Counter/>, document.getElementById('app'))
```

In the above examples the `c` is a so called component controller
(some kind of representation for the component instance).
The type of the component controller is currently the following
(please be aware that "normal" developers will never have to use these
methods directly they will only be used internally by some basic
hook and utility functions):

```typescript
type Ctrl<P extends Props = {}> = {
  getDisplayName(): string,
  getProps(): P,
  isInitialized(): boolean,
  isMounted(): boolean,
  refresh(runOnceBeforeRender?: () => void): void,
  getContextValue<T>(context: Context<T>): T,
  afterMount(subscriber: Subscriber): void,
  afterUpdate(subscriber: Subscriber): void,
  beforeUnmount(subscriber: Subscriber): void,
}

type Props = Record<string, any>
type Subscriber = () => void
type Context<T> = Preact.Context<T>
```

### Additional example - showing some more features

```jsx
import { h, render } from 'preact'
import { statefulComponent, useEffect, useProps, useValue } from 'js-preactive'

const Counter = statefulComponent('Counter', c => {
  const
    props = useProps(c, { initialCount: 0, label: 'Counter' }),
    [count, setCount] = useValue(c, props.initialCount),
    onIncrement = () => setCount(it => it + 1)

  useEffect(c, () => {
    console.log(`"${props.label}" has been mounted`)

    return () => console.log(`Unmounting "${props.label}"`)
  }, null)

  useEffect(c, () => {
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

- `statelessComponent(displayName, render: props => vnode)`
- `statefulComponent(displayName, init: c => props => vnode)`

### Utility functions

- `isMounted(c)`
- `forceUpdate(c)`
- `getContextValue(c, context, defaultValue?)`
- `asRef(valueOrRef)`
- `toRef(getter)`

### Hooks

- `useState(c, initialState)`
- `useValue(c, initialCount)`
- `useMemo(c, calculation, () => dependencies)`
- `useContext(c, context)`
- `useEffect(c, action, () => dependencies)`
- `useInterval(c, action, milliseconds)`

## Project state

This R&D project is in a very early development state
