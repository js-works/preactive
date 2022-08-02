import {
  createElement,
  render as preactRender,
  options,
  Component as PreactComponent,
  ComponentClass,
  JSX
} from 'preact';

import type { Context, VNode } from 'preact';

// === exports =======================================================

export { component, h, intercept, render };
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
  update(force?: boolean): void;
  shouldUpdate(pred: (prevProps: Props, nextProps: Props) => boolean): void;
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

// Brrrr, this is horrible as hell - but what shall we do?
const isMinimized = PreactComponent.name !== 'Component';
const keyContextId = isMinimized ? '__c' : '_id';
const keyContextDefaultValue = isMinimized ? '__' : '_defaultValue';

// === local data ====================================================

let onInit: (next: () => void, getCtrl: () => Ctrl) => void = (next) => next();

let onCreateElement:
  | ((next: () => void, type: string | Function, props: Props) => void)
  | null = null;

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
    component: BaseComponent<Props & unknown>,
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

  update(forced = false) {
    if (forced) {
      this.#component.forceUpdate();
    } else {
      this.#component.setState((state) => ({ toggle: !state.toggle }));
    }
  }

  shouldUpdate(pred: (prevProps: Props, nextProps: Props) => boolean) {
    this.#component.shouldComponentUpdate = (nextProps) => {
      return pred(this.#component.props, nextProps);
    };
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

class BaseComponent<P extends Props> extends PreactComponent<
  P,
  { toggle: boolean }
> {
  #ctrl!: Ctrl;
  #emit: null | ((event: LifecycleEvent) => void) = null;
  #mounted = false;
  #main: any;
  #propsObj: any;
  #render: null | (() => VNode) = null;
  #stateful: boolean | undefined = undefined;

  constructor(props: P, main: ComponentFunc<P>) {
    super(props);
    this.state = { toggle: false };
    this.#main = main;

    const propsObjClass = class extends Object {
      static __preactClass = this.constructor;
    };

    this.#propsObj = Object.assign(new propsObjClass(), props);
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
      const getCtrl = () => {
        if (this.#ctrl) {
          return this.#ctrl;
        }

        this.#ctrl = new Controller(this, (handler: any) => {
          this.#emit = handler;
        });

        this.#ctrl.beforeUpdate(() => {
          for (const key in this.#propsObj) {
            delete this.#propsObj[key];
          }

          Object.assign(this.#propsObj, this.props);
        });

        return this.#ctrl;
      };

      onInit(() => {
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
      }, getCtrl);
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

function intercept(params: {
  onInit?(next: () => void, getCtrl: () => Ctrl): void;

  onCreateElement?(
    next: () => void,
    type: string | Function,
    props: Props
  ): void;
}) {
  if (params.onInit) {
    const oldOnInit = onInit;
    const newOnInit = params.onInit;

    onInit = (next, getCtrl) =>
      void newOnInit(() => oldOnInit(next, getCtrl), getCtrl);
  }

  if (params.onCreateElement) {
    if (!onCreateElement) {
      const noop = () => {};
      onCreateElement = noop;

      options.vnode = (vnode) => {
        let type = vnode.type;

        if (typeof type === 'function') {
          const type2 = (type as any).__preactClass;

          if (type2) {
            type = type2;
          }
        }

        onCreateElement!(noop, vnode.type, vnode.props);
      };
    }

    const oldOnCreateElement = onCreateElement;
    const newOnCreateElement = params.onCreateElement;

    onCreateElement = (next, type, props) =>
      void newOnCreateElement(
        () => oldOnCreateElement(next, type, props),
        type,
        props
      );
  }
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

  let preactClass: any = (type as any).__preactClass;

  if (!preactClass) {
    preactClass = component(type.name, type);
    (type as any).__preactClass = preactClass;
  }

  return createElement(preactClass, props, ...children);
}
