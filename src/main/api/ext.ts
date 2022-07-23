import { Context, Ref, RefObject } from 'preact';
import { asRef } from './utils';
import { getCtrl, Ctrl, Props } from './core';

// === types =========================================================

type ValueOrRef<T> = T | { current: T };
type Action<A extends any[] = [], R = void> = (...args: A) => R;

type ContextType<C extends Context<any>> = C extends Context<infer T>
  ? T
  : never;

// === exports =======================================================

export {
  consume,
  createMemo,
  createTicker,
  effect,
  getRefresher,
  stateVal,
  stateObj,
  interval,
  handleMethods,
  handlePromise,
  preset
};

// === types =========================================================

type Getter<T> = () => T;
type Updater<T, U = T> = Exclude<U, Function> | ((value: T) => U);
type Setter<T> = (updater: Updater<T>) => void;

type StateObjSetter<T extends Record<string, any>> = {
  (updater: Updater<T, Partial<T>>): void;
} & {
  [K in keyof T]: (updater: Updater<T[K]>) => void;
};

// === local data ====================================================

// used for extension `preset`
const defaultsCache = new WeakMap<any, any>();

// === extensions ====================================================

// --- getRefresher --------------------------------------------------

function getRefresher() {
  const ctrl = getCtrl();

  return () => ctrl.refresh();
}

// --- preset --------------------------------------------------------

function preset<T extends Record<string, any>, D extends Partial<T>>(
  obj: T,
  defaults: D | (() => D)
) {
  const ctrl = getCtrl();
  let defaultValues: D | null = null;

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

  const presetObj = Object.assign({}, defaultValues, obj);

  ctrl.beforeUpdate(() => {
    for (const key in presetObj) {
      delete presetObj[key];
    }

    Object.assign(presetObj, defaultValues, obj);
  });

  return presetObj as T & D;
}

function stateVal<T>(value: T): [Getter<T>, Setter<T>] {
  const ctrl = getCtrl();
  let currVal: T = value;
  let nextVal: T = value;

  const getter = () => currVal;

  const setter: Setter<T> = (valueOrMapper): void => {
    nextVal =
      typeof valueOrMapper === 'function'
        ? (valueOrMapper as any)(nextVal)
        : valueOrMapper;

    ctrl.refresh();
  };

  ctrl.beforeUpdate(() => void (currVal = nextVal));
  return [getter, setter];
}

function stateObj<T extends Record<string, any>>(
  values: T
): [T, StateObjSetter<T>] {
  const ctrl = getCtrl();
  const obj = { ...values };
  const clone = { ...values };

  let merge = false;

  ctrl.beforeUpdate(() => {
    if (merge) {
      Object.assign(obj, clone);

      merge = false;
    }
  });

  const setter: StateObjSetter<T> = ((updater: Updater<T, Partial<T>>) => {
    const values =
      typeof updater === 'function' ? (updater as any)(clone) : updater;

    Object.assign(clone, values);
    merge = true;
    ctrl.refresh();
  }) as any;

  for (const key of Object.keys(obj)) {
    (setter as any)[key] = (updater: Updater<T>) => {
      (clone as any)[key] =
        typeof updater === 'function' ? (updater as any)(clone[key]) : updater;
      merge = true;
      ctrl.refresh();
    };
  }

  return [obj, setter];
}

// --- createMemo ----------------------------------------------------

// TODO - this is not really optimized, is it?

function createMemo<T, A extends any[], G extends () => A>(
  getValue: (...args: ReturnType<G>) => T,
  getDeps: G
) {
  const ctrl = getCtrl();
  let oldDeps: any[], value: T;

  const memo = {
    get value() {
      const newDeps = getDeps();

      if (!oldDeps || !isEqualArray(oldDeps, newDeps)) {
        value = getValue.apply(null, newDeps as any); // TODO
      }

      oldDeps = newDeps;
      return value;
    }
  };

  return memo;
}

// --- effect --------------------------------------------------------

function effect(
  action: () => void | undefined | null | (() => void),
  getDeps?: null | (() => any[])
): void {
  const ctrl = getCtrl();

  let oldDeps: any[] | null = null,
    cleanup: Action | null | undefined | void;

  if (getDeps === null) {
    ctrl.afterMount(() => {
      cleanup = action();
    });
    ctrl.beforeUnmount(() => {
      cleanup && cleanup();
    });
  } else if (getDeps === undefined || typeof getDeps === 'function') {
    const callback = () => {
      let needsAction = getDeps === undefined;

      if (!needsAction) {
        const newDeps = getDeps!();

        needsAction =
          oldDeps === null ||
          newDeps === null ||
          !isEqualArray(oldDeps, newDeps);
        oldDeps = newDeps;
      }

      if (needsAction) {
        cleanup && cleanup();
        cleanup = action();
      }
    };

    ctrl.afterMount(callback);
    ctrl.afterUpdate(callback);
  } else {
    throw new TypeError(
      '[effect] Third argument must either be undefined, null or a function'
    );
  }
}

// --- consume -------------------------------------------------------

function consume<T>(context: Context<T>): () => T;

function consume<T extends Record<string, Context<any>>>(
  contexts: T
): { [K in keyof T]: ContextType<T[K]> };

function consume(ctx: any): any {
  const ctrl = getCtrl();

  if (ctx.Provider) {
    return ctrl.consumeContext(ctx);
  }

  const ret = {};

  for (const key of Object.keys(ctx)) {
    const get = ctrl.consumeContext(ctx[key]);

    Object.defineProperty(ctx, key, {
      get
    });
  }

  return ret;
}

// --- handleMethods -------------------------------------------------

function updateRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (ref) {
    if (typeof ref === 'function') {
      ref(value);
    } else {
      ref.current = value;
    }
  }
}

function handleMethods<M extends Record<string, Function>>(
  getMethodsRef: () => RefObject<M> | undefined,
  methods: M
) {
  const ctrl = getCtrl();
  let ref: RefObject<M> | undefined = getMethodsRef();

  updateRef(ref, methods);

  ctrl.beforeUpdate(() => {
    const newRef = getMethodsRef();

    if (newRef !== ref) {
      updateRef(ref, null);
      ref = newRef;
      updateRef(ref, methods);
    }
  });

  ctrl.beforeUnmount(() => {
    updateRef(ref, null);
  });
}

// --- interval ------------------------------------------------------

function interval(callback: ValueOrRef<() => void>, delay: ValueOrRef<number>) {
  const callbackRef = asRef(callback);
  const delayRef = asRef(delay);

  effect(
    () => {
      const id = setInterval(callbackRef.current, delayRef.current);

      return () => clearInterval(id);
    },
    () => [callbackRef.current, delayRef.current]
  );
}

// --- handlePromise ---------------------------------------------------

type PromiseRes<T> =
  | {
      result: null;
      error: null;
      state: 'pending';
    }
  | {
      result: T;
      error: null;
      state: 'resolved';
    }
  | {
      result: null;
      error: Error;
      state: 'rejected';
    };

const initialState: PromiseRes<any> = {
  result: null,
  error: null,
  state: 'pending'
};

function handlePromise<T>(
  getPromise: () => Promise<T>,
  getDeps?: () => any[]
): PromiseRes<T> {
  const ctrl = getCtrl();
  const [getState, setState] = stateVal<PromiseRes<T>>(initialState);

  let promiseIdx = -1;

  effect(
    () => {
      ++promiseIdx;

      if (getState().state !== 'pending') {
        setState(initialState);
      }

      const myPromiseIdx = promiseIdx;

      getPromise()
        .then((result) => {
          if (promiseIdx === myPromiseIdx) {
            setState({
              result,
              error: null,
              state: 'resolved'
            });
          }
        })
        .catch((error) => {
          if (promiseIdx === myPromiseIdx) {
            setState({
              result: null,
              error: error instanceof Error ? error : new Error(String(error)),
              state: 'rejected'
            });
          }
        });
    },
    typeof getDeps === 'function' ? getDeps : null
  );

  return getState();
}

// --- locals --------------------------------------------------------

function isEqualArray(arr1: any[], arr2: any[]) {
  let ret =
    Array.isArray(arr1) && Array.isArray(arr2) && arr1.length === arr2.length;

  if (ret) {
    for (let i = 0; i < arr1.length; ++i) {
      if (arr1[i] !== arr2[i]) {
        ret = false;
        break;
      }
    }
  }

  return ret;
}

// --- ticker --------------------------------------------------------

function createTicker(): () => Date;
function createTicker<T>(mapper: (time: Date) => T): () => T;

function createTicker(mapper?: (time: Date) => any): any {
  const now = () => new Date();
  const [getTime, setTime] = stateVal(now());

  interval(() => {
    setTime(now());
  }, 1000);

  return mapper ? () => mapper(getTime()) : getTime();
}
