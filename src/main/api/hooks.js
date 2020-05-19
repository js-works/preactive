//import ObservableSlim from 'observable-slim'
import onChange from 'on-change'
import { asRef } from './utils'


export function hook(name, func) {
  function ret() {
    if (process.env.NODE_ENV === 'development') {
      const c = arguments[0]

      if (!c || typeof c !== 'object' || typeof c.isInitialized !== 'function') {
        throw new TypeError(`First argument of hook function "${name}" must be a component controller`)
      } else if (c.isInitialized()) {
        throw new Error(
          `Hook function "${name}" has been called after initialization phase of component "${c.getDisplayName()}"`)
      }
    }

    return func.apply(null, arguments)
  }

  Object.defineProperty(ret, 'name', {
    value: name
  })

  return ret
}

// --- useProps ------------------------------------------------------

export const useProps = hook('useProps', (c, defaultProps) => {
  const props = Object.assign({}, defaultProps, c.getProps())

  c.beforeUpdate(() => {
    for (const propName in props) {
      delete props[propName]
    }

    Object.assign(props, defaultProps, c.getProps())
  })

  return props
})

// --- useValue ------------------------------------------------------
export const useValue = hook('useValue', (c, initialValue) => {
let nextValue = initialValue
  
  const
    value = { value: initialValue },
  
    setValue = updater => {
      nextValue = typeof updater === 'function'
        ? updater(nextValue)
        : updater

      c.update(() => {
        value.value = nextValue
      })
    }

  return [value, setValue]
})

// --- useState ------------------------------------------------------

export const useState = hook('useState', (c, initialState) => {
  let
    nextState,
    mergeNecessary = false

  const
    state = { ...initialState },

    setState = (arg1, arg2) => {
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

      c.update(() => {
        if (mergeNecessary) {
          Object.assign(state, nextState)
          mergeNecessary = false
        }
      })
    }

  nextState = { ...state }

  return [state, setState]
})

// --- useMemo -------------------------------------------------------

// TODO - this is not really optimized, is it?

export const useMemo = hook('useMemo', (c, getValue, getDeps) => {
  let oldDeps, value

  const memo = {
    get value() {
      const newDeps = getDeps()

      if (!oldDeps || !isEqualArray(oldDeps, newDeps)) {
        value = getValue.call(null, newDeps)
      }

      oldDeps = newDeps
      return value
    }
  }

  return memo
})

// --- useContext ----------------------------------------------------

export const useContext = hook('useContext', (c, context) => {


  return {
    get value() {
      return c.getContextValue(context) 
    }
  }

  return ret
})

// --- useEffect -----------------------------------------------------

export const useEffect = hook('useEffect', (c, action, getDeps) => {
  let
    oldDeps = null,
    cleanup

  if (getDeps === null) {
    c.afterMount(() => { cleanup = action() })
    c.beforeUnmount(() => { cleanup && cleanup() }) 
  } else if (getDeps === undefined || typeof getDeps === 'function'){
    const callback = () => {
      let needsAction = getDeps === undefined

      if (!needsAction) {
        const newDeps = getDeps()

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
      '[useEffect] Third argument must either be undefined, null or a function')
  }
})

// --- useInterval ---------------------------------------------------

export const useInterval = hook('useInterval', (c, callback, delay) => {
  const
    callbackRef = asRef(callback),
    delayRef = asRef(delay)
  
  useEffect(c, () => {
    const id = setInterval(callbackRef.current, delayRef.current)

    return () => clearInterval(id)
  }, () => [callbackRef.current, delayRef.current])
})

// --- locals --------------------------------------------------------

function isEqualArray(arr1, arr2) {
  let ret = Array.isArray(arr1) && Array.isArray(arr2) && arr1.length === arr2.length

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
