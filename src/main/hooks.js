//import ObservableSlim from 'observable-slim'
import onChange from 'on-change'
import { asRef } from './utils'

// --- useValue ------------------------------------------------------
export function useValue(c, initialValue) {
  let currValue = initialValue
  
  const
    value = {
      get value() {
        return currValue
      }
    },

    setValue = updater => {
      c.update(() =>
        currValue = typeof updater === 'function'
          ? updater(currValue)
          : updater)
    }

  return [value, setValue]
}

// --- useState ------------------------------------------------------

export function useState(c, initialState) {
  let state = {}
  
  const
    data = Object.assign({}, initialState),
    keys = Object.keys(initialState)

  Object.keys(initialState).forEach(key => {
    Object.defineProperty(state, key, {
      enumerable: true,
      get: () => data[key]
    })
  })

  const setState = (arg1, arg2) => {
    let updater

    if (typeof arg1 !== 'string') {
      updater = arg1
    } else if (typeof arg2 !== 'function') {
      updater = { [arg1]: arg2 }
    } else {
      updater = state => ({
        [arg1]: arg2(state[arg1])
      })
    } 

    c.update(() => {
      Object.assign(data, typeof updater === 'function'
        ? updater(state)
        : updater
      )
    })
  }
  
  return [state, setState]
}

// --- useObsValue ----------------------------------------------

export function useObsValue(c, initialValue) {
  return useObsState(c, { value: initialValue })
}

// --- useObsState ---------------------------------------------------

export function useObsState(c, initialState) {
  return onChange(initialState, () => c.update())
}

// --- useMemo -------------------------------------------------------

// TODO - this is not really optimized, is it?

export function useMemo(c, getValue, getDeps) {
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
}

// --- useContext ----------------------------------------------------

export function useContext(c, context) {


  return {
    get value() {
      return c.getContextValue(context) 
    }
  }

  return ret
}

// --- useEffect -----------------------------------------------------

export function useEffect(c, action, getDeps) {
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
}

// --- useInterval ---------------------------------------------------

export function useInterval(c, callback, delay) {
  const
    callbackRef = asRef(callback),
    delayRef = asRef(delay)
  
  useEffect(c, () => {
    const id = setInterval(callbackRef.current, delayRef.current)

    return () => clearInterval(id)
  }, () => [callbackRef.current, delayRef.current])
}

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
