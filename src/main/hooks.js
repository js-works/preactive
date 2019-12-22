import ObservableSlim from 'observable-slim'
import { asRef } from './utils'

// --- useValue ------------------------------------------------------

export function useValue(c, initialValue) {
  let value = initialValue

  return {
    get value() {
      return value
    },

    setValue(newValue) {
      value = newValue
      c.forceUpdate()
    }
  }
}

// --- useState ------------------------------------------------------

export function useState(c, initialState) {
  return ObservableSlim.create(initialState, true, () => c.update())

  /* with just shallow change detection
  let ret = {}
  
  const
    data = Object.assign({}, initialState),
    keys = Object.keys(initialState)

  Object.keys(initialState).forEach(key => {
    Object.defineProperty(ret, keys, {
      enumerable: true,
      get: () => data[key],
      set: value => {
        c.update()
        data[key] = value
      }
    })
  })

  return ret
  */
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
