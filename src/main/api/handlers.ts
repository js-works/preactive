import { Context, Ref } from 'preact'
import { asRef } from './utils'
import Ctrl from './types/Ctrl'
import Props from './types/Props'
import Action from '../internal/types/Action'
import ValueOrRef from './types/ValueOrRef'

export function handler<P extends Props, A extends [Ctrl<P>, ...any[]], R>(
  name: string,
  func: (...args: A) => R
 ): (...args: A) => R {
  function ret() {
    if (process.env.NODE_ENV === 'development' as any) {
      const c = arguments[0]

      if (!c || typeof c !== 'object' || typeof c.isInitialized !== 'function') {
        throw new TypeError(`First argument of handler function "${name}" must be a component controller`)
      } else if (c.isInitialized()) {
        throw new Error(
          `Hook function "${name}" has been called after initialization phase of component "${c.getDisplayName()}"`)
      }
    }

    return func.apply(null, arguments as any)
  }

  Object.defineProperty(ret, 'name', {
    value: name
  })

  return ret
}

// --- withProps ------------------------------------------------------

type KeysOfOptionals<P extends Props> = Exclude<{
  [K in keyof P]: undefined extends P[K] ? K : never
}[keyof P], undefined>

type PickDefaultProps<P extends Props> = {
  [K in KeysOfOptionals<P>]?: P[K]
}

type ValidateShape<T, Shape> =
  T extends Shape
    ? Exclude<keyof T, keyof Shape> extends never
    ? T
    : never
    : never

export const withProps = handler('withProps', function <P extends Props, D = undefined>(
  c: Ctrl<P>,
  defaultProps?: D 
): D extends undefined ? P : P & ValidateShape<D, PickDefaultProps<P>> {
  const props: any = Object.assign({}, defaultProps, c.getProps()) // TODO

  c.beforeUpdate(() => {
    for (const propName in props) {
      delete props[propName]
    }

    Object.assign(props, defaultProps, c.getProps())
  })

  return props
})

// --- withValue ------------------------------------------------------

export const withValue = handler('withValue',  function <T>(c: Ctrl, initialValue: T):
  [{ value: T }, (updater: (T | ((value: T) => T))) => void]
{
  let nextValue = initialValue
  
  const
    value = { value: initialValue },
  
    setValue = (updater: any) => { // TODO
      nextValue = typeof updater === 'function'
        ? updater(nextValue)
        : updater

      c.refresh(() => {
        value.value = nextValue
      })
    }

  return [value, setValue as any] // TODO
})

// --- withState ------------------------------------------------------

type StateUpdater<T extends Record<string, any>> = {
  (newState: Partial<T>): void,
  (stateUpdate: (oldState: T) => Partial<T>): void,
  (key: keyof T, newValue: T[typeof key]): void,
  (key: keyof T, valueUpdate: (oldValue: T[typeof key]) => T[typeof key]): void
}

export const withState = handler('withState', function <T extends Record<string, any>>(
  c: Ctrl,
  initialState: T
): [T, StateUpdater<T>] {
  let
    nextState: any, // TODO
    mergeNecessary = false

  const
    state = { ...initialState },

    setState = (arg1: any, arg2: any) => {
      mergeNecessary = true

      if (typeof arg1 === 'string') {
        nextState[arg1] =
          typeof arg2 === 'function'
            ? arg2(nextState[arg1])
            : arg2
      } else if (typeof arg1 === 'function') {
        Object.assign(nextState, arg1(nextState))
      } else {
        Object.assign(nextState, arg1)
      }

      c.refresh(() => {
        if (mergeNecessary) {
          Object.assign(state, nextState)
          mergeNecessary = false
        }
      })
    }

  nextState = { ...state }

  return [state, setState as any] // TODO
})

// --- withMemo -------------------------------------------------------

// TODO - this is not really optimized, is it?

export const withMemo = handler('withMemo', function <T, A extends any[], G extends () => A>(
  c: Ctrl,
  getValue: (...args: ReturnType<G>) => T,
  getDeps: G
) {
  let oldDeps: any[], value: T

  const memo = {
    get value() {
      const newDeps = getDeps()

      if (!oldDeps || !isEqualArray(oldDeps, newDeps)) {
        value = getValue.apply(null, newDeps as any) // TODO
      }

      oldDeps = newDeps
      return value
    }
  }

  return memo
})

// --- withContext ----------------------------------------------------

export const withContext = handler('withContext', function <T>(
  c: Ctrl,
  context: Context<T>
): { value: T } {
  return {
    get value() {
      return c.getContextValue(context) 
    }
  }
})

// --- withEffect -----------------------------------------------------

export const withEffect = handler('withEffect', function (
  c: Ctrl,
  action: () => void | undefined | null | (() => void),
  getDeps?: null | (() => any[])
): void {
  let
    oldDeps: (any[] | null) = null,
    cleanup: Action | null | undefined | void
  
  if (getDeps === null) {
    c.afterMount(() => { cleanup = action() })
    c.beforeUnmount(() => { cleanup && cleanup() }) 
  } else if (getDeps === undefined || typeof getDeps === 'function'){
    const callback = () => {
      let needsAction = getDeps === undefined

      if (!needsAction) {
        const newDeps = getDeps!()

        needsAction = oldDeps === null || newDeps ===  null || !isEqualArray(oldDeps, newDeps)
        oldDeps = newDeps
      }

      if (needsAction) {
        cleanup && cleanup()
        cleanup = action()
      }
    }

    c.afterMount(callback)
    c.afterUpdate(callback)
  } else {
    throw new TypeError(
      '[withEffect] Third argument must either be undefined, null or a function')
  }
})

// --- withMethods ---------------------------------------------------

type MethodsOf<R> =
  R extends Ref<infer T>
    ? T
    : never

function updateRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (ref) {
    if (typeof ref === 'function') {
      ref(value)
    } else {
      ref.current = value
    }
  }
}

export const withMethods = handler('withMethods', function<P extends Props, K extends keyof P> (
  c: Ctrl<P>,
  key: K,
  methods: MethodsOf<P[K]>
) {
  let ref: Ref<MethodsOf<P[K]>> = c.getProps()[key]

  updateRef(ref, methods)


  c.beforeUpdate(() => {
    const newRef = c.getProps()[key]

    if (newRef !== ref) {
      updateRef(ref, null)
      ref = newRef
      updateRef(ref, methods)
    }
  })

  c.beforeUnmount(() => {
    updateRef(ref, null)
  })
})

// --- withInterval ---------------------------------------------------

export const withInterval = handler('withInterval', (
  c,
  callback: ValueOrRef<() => void>,
  delay: ValueOrRef<number>
) => {
  const
    callbackRef = asRef(callback),
    delayRef = asRef(delay)
  
  withEffect(c, () => {
    const id = setInterval(callbackRef.current, delayRef.current)

    return () => clearInterval(id)
  }, () => [callbackRef.current, delayRef.current])
})

// --- withPromise ---------------------------------------------------

type PromiseRes<T> = {
  result: undefined,
  error: undefined,
  state: 'pending'
} | {
  result: T,
  error: undefined,
  state: 'resolved'
} | {
  result: undefined,
  error: Error,
  state: 'rejected'
}

const initialState: PromiseRes<any> = {
  result: undefined,
  error: undefined,
  state: 'pending'
}

export const withPromise = handler('withPromise', function<T>(
  c: Ctrl,
  getPromise: () => Promise<T>,
  getDeps?: () => any[]
): PromiseRes<T> {
  const [state, setState] = withState<PromiseRes<T>>(c, initialState)

  let promiseIdx = -1

  withEffect(c, () => {
    ++promiseIdx

    if (state.state !== 'pending') {
      setState(initialState)
    }

    const myPromiseIdx = promiseIdx
  
    getPromise()
      .then(result => {
        if (promiseIdx === myPromiseIdx) {
          setState({
            result,
            state: 'resolved'
          })
        }
      })
      .catch(error => {
        if (promiseIdx === myPromiseIdx) {
          setState({
            error: error instanceof Error ? error : new Error(String(error)),
            state: 'rejected'
          })
        }
      })
  }, typeof getDeps === 'function' ? getDeps : null)

  return state
})

// --- locals --------------------------------------------------------

function isEqualArray(arr1: any[], arr2: any[]) {
  let ret =
    Array.isArray(arr1) && Array.isArray(arr2) && arr1.length === arr2.length

  if (ret) {
    for (let i = 0; i < arr1.length; ++i) {
      if (arr1[i] !== arr2[i]) {
        ret = false
        break
      }
    }
  }

  return ret
}
