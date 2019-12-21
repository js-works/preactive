import { Component } from 'preact'
import { observe } from '@nx-js/observer-util'
import * as Spec from 'js-spec/validators'

// Brrrr, this is horrible as hell - please fix asap!!!!
const
  isMinimized = Component.name !== 'Component',
  keyContextId = isMinimized ? '__c' : '_id',
  keyContextDefaultValue = isMinimized ? '__' : '_defaultValue'

// --- constants -----------------------------------------------------

const
  REGEX_DISPLAY_NAME = /^[A-Z][a-zA-Z0-9]*$/

// --- statelessComponent --------------------------------------------

export function statelessComponent(arg1, arg2) {
  const config = typeof arg1 === 'string'
    ? { displayName: arg1, init: arg2 }
    : typeof arg2 === 'function'
      ? { ...arg1, init: arg2 }
      : arg1

  if (process.env.NODE_ENV === 'development') {
    let errorMsg

    const
      type1 = typeof arg1,
      type2 = typeof arg2

    if (arg1 === null || (type1 !== 'object' && type1 !== 'string')) {
      errorMsg = 'First argument must be a string or an object'
    } else if (type1 === 'object' && arg2 !== undefined && type2 !== 'function') {
      errorMsg = 'Unexpected second argument'
    } else if (type1 === 'string' && type2 !== 'function') {
      errorMsg = 'Expected function as second argument'
    } else {
      const error = validateStatelessComponentConfig(config)

      if (error) {
        errorMsg = error.message
      }
    }

    if (errorMsg) {
      const displayName = type1 === 'string'
        ? arg1
        : arg1 && typeof arg1.displayName === 'string'
          ? arg1.displayName
          : '' 
      
      throw new TypeError(
        '[statelessComponent] Error: '
          + (displayName ? `${displayName} ` : '')
          + errorMsg)
    }
  }

  let ret = config.defaultProps
    ? props => config.render(Object.assign({}, config.defaultProps, props)) // TODO - optimize
    : config.render.bind(null)

  ret.displayName = config.displayName

  if (config.memoize === true) {
    // TODO - `memo` is only available in "preact/compat"
    // ret = memo(ret)
  }

  return ret
}

// --- statefulComponent ---------------------------------------------

export function statefulComponent(arg1, arg2) {
  const config = typeof arg1 === 'string'
    ? { displayName: arg1, init: arg2 }
    : typeof arg2 === 'function'
      ? { ...arg1, init: arg2 }
      : arg1

  if (process.env.NODE_ENV === 'development') {
    let errorMsg

    const
      type1 = typeof arg1,
      type2 = typeof arg2

    if (arg1 === null || (type1 !== 'object' && type1 !== 'string')) {
      errorMsg = 'First argument must be a string or an object'
    } else if (type1 === 'object' && arg2 !== undefined && type2 !== 'function') {
      errorMsg = 'Unexpected second argument'
    } else if (type1 === 'string' && type2 !== 'function') {
      errorMsg = 'Expected function as second argument'
    } else {
      const error = validateStatefulComponentConfig(config)

      if (error) {
        errorMsg = error.message
      }
    }

    if (errorMsg) {
      const displayName = type1 === 'string'
        ? arg1
        : arg1 && typeof arg1.displayName === 'string'
          ? arg1.displayName
          : '' 
      
      throw new TypeError(
        '[statefulComponent] Error '
          + (displayName ? `when defining component "${displayName}" ` : '')
          + '=> ' + errorMsg)
    }
  }

  const
    hasDefaultProps =
      config.defaultProps && Object.keys(config.defaultProps) > 0,

    needsPropObject = config.init.length > 1

  const CustomComponent = function (props) {
    let
      mounted = false,
      oldProps = props

    const
      propsObject =
        !needsPropObject ? null : Object.assign({}, config.defaultProps, props),

      afterMountNotifier = createNotifier(),
      beforeUpdateNotifier = createNotifier(),
      afterUpdateNotifier = createNotifier(),
      beforeUnmountNotifier = createNotifier(),
      runOnceBeforeUpdateTasks = [],

      ctrl = {
        isMounted: () => mounted,
        update: () => this.forceUpdate(),

        getContextValue: ctx => {
          const provider = this.context[ctx[keyContextId]]

          return  !provider ? ctx[keyContextDefaultValue] : provider.props.value
        },

        afterMount: afterMountNotifier.subscribe,
        beforeUpdate: beforeUpdateNotifier.subscribe,
        afterUpdate: afterUpdateNotifier.subscribe,
        beforeUnmount: beforeUnmountNotifier.subscribe,

        runOnceBeforeUpdate: task => runOnceBeforeUpdateTasks.push(task)
      },

      render = config.init(ctrl, propsObject)

    this.props = props

    this.componentDidMount = () => {
      mounted = true
      afterMountNotifier.notify()
    }

    this.componentDidUpdate = afterUpdateNotifier.notify
    this.componentWillUnmount = beforeUnmountNotifier.notify

    if (config.memoize === true) {
      this.shouldComponentUpdate = () => false
    } else if (typeof config.memoize === 'function') {
      // This will follow in a later version
    }

    this.render = () => {
      if (needsPropObject) {
        if (this.props !== oldProps) {
          oldProps = this.props

          for (const key in propsObject) {
            delete propsObject[key]
          }

          if (hasDefaultProps) {
            Object.assign(propsObject, config.defaultProps)
          }

          Object.assign(propsObject, this.props)
        }
      }

      const taskCount = runOnceBeforeUpdateTasks.length

      for (let i = 0; i < taskCount; ++i) {
        runOnceBeforeUpdateTasks[i]()
      }

      if (taskCount === runOnceBeforeUpdateTasks.length) {
        runOnceBeforeUpdateTasks.length = 0
      } else {
        runOnceBeforeUpdateTasks.splice(0, taskCount)
      }

      beforeUpdateNotifier.notify()

      let content

      // TODO!!!!!!!!!!!!!!!!!!!!!
      // This implementation is surely not working properly in general
      if (mounted) {
        content = render(props)
      } else {
        observe(() => {
          content = render(props)

          if (mounted) {
            this.forceUpdate()
          }
        })
      }

      return content
    }
  }

  CustomComponent.prototype = Object.create(Component.prototype)
  CustomComponent.displayName = config.displayName

  return CustomComponent
}

// --- locals --------------------------------------------------------

let
  validateStatelessComponentConfig,
  validateStatefulComponentConfig

if (process.env.NODE_ENV === 'development') {
  validateStatelessComponentConfig =
    Spec.exact({
      displayName: Spec.match(REGEX_DISPLAY_NAME),
      memoize: Spec.optional(Spec.boolean),
      validate: Spec.optional(Spec.func),

      defaultProps: Spec.optional(Spec.object),
      render: Spec.func
    })

  validateStatefulComponentConfig =
    Spec.exact({
      displayName: Spec.match(REGEX_DISPLAY_NAME),
      memoize: Spec.optional(Spec.boolean),
      validate: Spec.optional(Spec.func),

      defaultProps: Spec.optional(Spec.object),
      init: Spec.func
    })
}

function hasOnwProp(obj, propName) {
  return Object.prototype.hasOwnProperty.call(obj, propName)
}

function createNotifier() {
  const subscribers = []

  return {
    notify: () => subscribers.forEach(it => it()),
    subscribe: subscriber => subscribers.push(subscriber)
  }
}
