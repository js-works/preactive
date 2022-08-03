import { intercept, Ctrl } from 'preactive';

// === types =========================================================

type Ref<T> = { current: T };

// === interception logic ============================================

let getCurrCtrl: ((neededForExtensions?: boolean) => Ctrl) | null = null;

function getCtrl() {
  if (!getCurrCtrl) {
    throw Error('Hook has been called outside of component function');
  }

  return getCurrCtrl();
}

intercept({
  onMain(next, getCtrl) {
    try {
      getCurrCtrl = getCtrl;
      next();
    } finally {
      getCurrCtrl = null;
    }
  }
});

// === exports =======================================================

export { useEffect, useRef, useState };

// === types =========================================================

type StateUpdater<T> = (value: T) => T;
type StateSetter<T> = (updater: StateUpdater<T>) => void;

// === local data ====================================================

const hookData = new WeakMap<
  Ctrl,
  {
    hookIndex: number;
    values: any[];
  }
>();

// === local functions ===============================================

function createRef<T>(value: T) {
  return { current: value };
}

function hook<T>(
  action: (ctrl: Ctrl, prevValue: T | undefined, isInitialized: boolean) => T
): T {
  const ctrl = getCtrl();
  let rec = hookData.get(ctrl);

  if (!rec) {
    rec = { hookIndex: -1, values: [] };
    hookData.set(ctrl, rec);

    const resetHookIndex = () => void (rec!.hookIndex = -1);

    ctrl.afterMount(resetHookIndex);
    ctrl.afterUpdate(resetHookIndex);
  }

  const isInitialized = ++rec.hookIndex < rec.values.length;
  const nextValue = action(ctrl, rec.values[rec.hookIndex], isInitialized);
  rec.values[rec.hookIndex] = nextValue;

  return nextValue;
}

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

// === public hook functions =========================================

function useRef<T>(value: T): Ref<T>;
function useRef<T>(): Ref<T | null>;

function useRef(value?: any): Ref<any> {
  return hook<Ref<any>>((_, prevValue) => prevValue || createRef(value));
}

function useState<T>(
  value: T
): [value: T, setter: (updater: StateUpdater<T>) => void] {
  const data = hook<[T, StateSetter<T>, () => void]>(
    (ctrl, data, isInitialized) => {
      let refresh = data && data[2];

      if (!isInitialized) {
        const updaters: StateUpdater<T>[] = [];
        refresh = ctrl.getUpdater();

        data = [
          value,
          (updater) => {
            updaters.push(updater);
            refresh!();
          },
          refresh
        ];

        ctrl.beforeUpdate(() => {
          try {
            updaters.forEach((updater) => (data![0] = updater(data![0])));
          } finally {
            updaters.length = 0;
          }
        });
      }

      return data!;
    }
  );

  return [data[0], data[1]];
}

function useEffect<T extends any[]>(
  action: () => void,
  deps: T | null = null
): void {
  const actionRef = useRef(action);
  const prevDepsRef = useRef<T>();
  const currDepsRef = useRef<T>();

  hook((ctrl, _, isInitialized) => {
    actionRef.current = action;
    prevDepsRef.current = currDepsRef.current;
    currDepsRef.current = deps;

    if (!isInitialized) {
      const task = () => {
        const currDeps = currDepsRef.current;
        const prevDeps = prevDepsRef.current;

        if (!currDeps || !prevDeps || !isEqualArray(currDeps, prevDeps)) {
          actionRef.current();
        }
      };

      ctrl.afterMount(task);
      ctrl.afterUpdate(task);
    }
  });
}