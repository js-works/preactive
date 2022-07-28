import {
  createElement,
  render as preactRender,
  Component as PreactComponent,
  ComponentClass,
  JSX
} from 'preact';

import type { Context, VNode } from 'preact';

// === exports =======================================================

export { component, h, preset, render, getCtrl };
export type { Ctrl, Props, PropsOf };

// === global types ==================================================

declare global {
  namespace JSX {
    interface IntrinsicElements extends preact.JSX.IntrinsicElements {}
    interface IntrinsicAttributes extends preact.JSX.IntrinsicAttributes {}
  }
}

// === exported types ================================================

interface Props extends Record<string, any> {}

interface ComponentFunc<P extends Props> {
  (p: P): VNode | (() => VNode);
}

interface Ctrl {
  afterMount(task: () => void): void;
  beforeUpdate(task: () => void): void;
  afterUpdate(task: () => void): void;
  beforeUnmount(task: () => void): void;
  refresh(): void;
  consumeContext<T>(ctx: Context<T>): () => T;
}

type PropsOf<T extends ComponentClass<any>> = T extends ComponentClass<infer P>
  ? P
  : never;

// === local types ===================================================

type Task = () => void;

type LifecycleEvent =
  | 'afterMount'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'beforeUnmount';

type LifecycleEventHandler = (event: LifecycleEvent) => void;

// ===  constants ====================================================

// Brrrr, this is horrible as hell - please fix asap!!!!
const isMinimized = PreactComponent.name !== 'Component';
const keyContextId = isMinimized ? '__c' : '_id';
const keyContextDefaultValue = isMinimized ? '__' : '_defaultValue';
const preactComponentKey = Symbol('preactComponent');

// === local data ====================================================

let getCurrentCtrl: (() => Ctrl) | null = null;
const defaultsCache = new WeakMap<any, any>();

// --- preset --------------------------------------------------------

// === local classes and functions ===================================

class Controller implements Ctrl {
  #component: BaseComponent<any>;

  #lifecycle: Record<LifecycleEvent, Task[]> = {
    afterMount: [],
    beforeUpdate: [],
    afterUpdate: [],
    beforeUnmount: []
  };

  constructor(
    component: BaseComponent<any>,
    setLifecycleEventHandler: (handler: LifecycleEventHandler) => void
  ) {
    this.#component = component;

    setLifecycleEventHandler((eventName) => {
      this.#lifecycle[eventName].forEach((it) => it());
    });
  }

  afterMount(task: Task) {
    this.#lifecycle.afterMount.push(task);
  }

  beforeUpdate(task: Task) {
    this.#lifecycle.beforeUpdate.push(task);
  }

  afterUpdate(task: Task) {
    this.#lifecycle.afterUpdate.push(task);
  }

  beforeUnmount(task: Task) {
    this.#lifecycle.beforeUnmount.push(task);
  }

  refresh() {
    this.#component.forceUpdate();
  }

  consumeContext<T>(ctx: Context<T>): () => T {
    return () => {
      const context = this.#component.context;
      const provider = !context ? null : context[(ctx as any)[keyContextId]];

      return !provider
        ? (ctx as any)[keyContextDefaultValue]
        : provider.props.value;
    };
  }
}

class BaseComponent<P extends Props> extends PreactComponent<P> {
  #ctrl!: Ctrl;
  #emit: null | ((event: LifecycleEvent) => void) = null;
  #mounted = false;
  #main: any;
  #propsObj: any;
  #render: null | (() => VNode) = null;
  #stateful: boolean | undefined = undefined;

  static #controllerBaseClasses = new WeakMap<any, any>();

  constructor(props: P, main: ComponentFunc<P>) {
    super(props);
    this.#main = main;
    this.#propsObj = { ...props };
  }

  componentDidMount() {
    if (this.#stateful) {
      this.#mounted = true;
      this.#emit && this.#emit('afterMount');
    }
  }

  componentDidUpdate() {
    this.#emit && this.#emit('afterUpdate');
  }

  componentWillUnmount() {
    this.#emit && this.#emit('beforeUnmount');
  }

  render() {
    let content: any;

    if (this.#stateful === undefined) {
      try {
        getCurrentCtrl = () => {
          let ctrlBaseClass = BaseComponent.#controllerBaseClasses.get(
            this.#main
          );

          if (!ctrlBaseClass) {
            ctrlBaseClass = class Ctrl extends Controller {};
            BaseComponent.#controllerBaseClasses.set(this.#main, ctrlBaseClass);
          }

          this.#ctrl = new ctrlBaseClass(this, (handler: any) => {
            this.#emit = handler;
          });

          this.#ctrl.beforeUpdate(() => {
            for (const key in this.#propsObj) {
              delete this.#propsObj[key];
            }

            Object.assign(this.#propsObj, this.props);
          });

          getCurrentCtrl = () => this.#ctrl;

          return this.#ctrl;
        };

        const result = this.#main(this.#propsObj);

        if (typeof result === 'function') {
          this.#stateful = true;
          this.#render = result;
        } else {
          if (this.#ctrl) {
            throw new Error(
              'Not allowed to call extensions inside of stateless components'
            );
          }

          this.#stateful = false;
          content = result ?? null;
        }
      } finally {
        getCurrentCtrl = null;
      }
    }

    if (this.#stateful) {
      if (this.#mounted) {
        this.#emit && this.#emit!('beforeUpdate');
      }

      return this.#render!();
    } else {
      return content !== undefined ? content : this.#main(this.#propsObj);
    }
  }
}

// === exported functions ============================================

function getCtrl(): Ctrl {
  if (!getCurrentCtrl) {
    throw new Error('Extension has been called outside of component function');
  }

  return getCurrentCtrl();
}

function render(content: VNode, container: Element | string) {
  const target =
    typeof container === 'string'
      ? document.querySelector(container)
      : container;

  if (!target) {
    throw Error('Invalid argument "container" used for function "render"');
  }

  preactRender(content, target);
}

function component(
  name: string
): <P extends Props>(fn: ComponentFunc<P>) => ComponentClass<P>;

function component<P extends Props>(
  name: string,
  fn: ComponentFunc<P>
): ComponentClass<P>;

function component(arg1: any, arg2?: any): any {
  if (arguments.length === 1) {
    return (fn: ComponentFunc<any>) => component(arg1, fn);
  }

  const clazz = class extends BaseComponent<any> {
    constructor(props: unknown) {
      super(props, arg2);
    }
  };

  return Object.defineProperty(clazz, 'name', {
    value: arg1
  });
}

function h<P extends Props>(
  type: string | ComponentFunc<any>,
  props: P,
  ...children: VNode[]
): JSX.Element {
  if (typeof type === 'string') {
    return createElement(type, props, ...children);
  }

  let preactComponent: any = (type as any)[preactComponentKey];

  if (!preactComponent) {
    preactComponent = component(type.name, type);
    (type as any)[preactComponentKey] = preactComponent;
  }

  return createElement(preactComponent, props, ...children);
}

function preset<P extends Record<string, any>, D extends Partial<P>>(
  props: P,
  defaults: D | (() => D)
): asserts props is P & D {
  let defaultValues: D | null = null;
  const ctrl = getCtrl();

  if (typeof defaults !== 'function') {
    defaultValues = defaults;
  } else {
    let cachedDefaults = defaultsCache.get(ctrl.constructor);

    if (!cachedDefaults) {
      cachedDefaults = defaults();
      defaultsCache.set(ctrl.constructor, cachedDefaults);
    }

    defaultValues = cachedDefaults;
  }

  const updateProps = () => {
    for (const key in defaultValues) {
      if (!props.hasOwnProperty(key)) {
        (props as any)[key] = defaultValues[key];
      }
    }
  };

  updateProps();
  ctrl.beforeUpdate(updateProps);
}
