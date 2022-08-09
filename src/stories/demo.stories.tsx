/** @jsx h */
import { ReactiveControllerHost } from 'lit';
import { h, createContext, createRef, RefObject } from 'preact';
import { component, PropsOf } from 'preactive';

import {
  atom,
  consume,
  create,
  createMemo,
  createTicker,
  effect,
  getRefresher,
  state,
  interval,
  handleMethods,
  handlePromise,
  preset
} from '../main/ext';

export default {
  title: 'Demos'
};

export const simpleCounterDemo = () => <SimpleCounterDemo />;
export const complexCounterDemo = () => <ComplexCounterDemo />;
export const clockDemo = () => <ClockDemo />;
export const memoDemo = () => <MemoDemo />;
export const intervalDemo = () => <IntervalDemo />;
export const contextDemo = () => <ContextDemo />;
export const mousePositionDemo = () => <MousePositionDemo />;
export const promiseDemo = () => <PromiseDemo />;

// === Simple counter demo ===========================================

const SimpleCounterDemo = component('SimpleCounterDemo')<{
  initialCount?: number;
  label?: string;
}>((p) => {
  preset(p, () => ({
    initialCount: 0,
    label: 'Counter'
  }));

  const [s, set] = state({ count: p.initialCount });
  const onIncrement = () => set.count((it) => it + 1);
  const onInput = (ev: any) => set.count(ev.currentTarget.valueAsNumber); // TODO

  effect(
    () => {
      console.log(`Value of "${p.label}": ${s.count}`);
    },
    () => [s.count]
  );

  return () => (
    <div>
      <h3>Simple counter demo:</h3>
      <label>{p.label}: </label>
      <input type="number" value={s.count} onInput={onInput} />
      <button onClick={onIncrement}>{s.count}</button>
    </div>
  );
});

// === Complex counter demo ==========================================

const ComplexCounter = component('ComplexCounter')<{
  initialCount?: number;
  label?: string;

  componentRef?: RefObject<{
    reset(n: number): void;
  }>;
}>((p) => {
  preset(p, {
    initialCount: 0,
    label: 'Counter'
  });

  const [s, set] = state({ count: p.initialCount });
  const onIncrement = () => set.count((it) => it + 1);
  const onDecrement = () => set.count((it) => it - 1);

  handleMethods(() => p.componentRef, {
    reset(n) {
      set.count(n);
    }
  });

  return () => (
    <div>
      <h3>Complex counter demo:</h3>
      <label>{p.label}: </label>
      <button onClick={onDecrement}>-</button>
      {` ${s.count} `}
      <button onClick={onIncrement}>+</button>
    </div>
  );
});

const ComplexCounterDemo = component('ComplexCounterDemo', () => {
  const counterRef: any =
    createRef<PropsOf<typeof ComplexCounter>['componentRef']>(); // TODO

  const onResetToZeroClick = () => counterRef.current.reset(0);
  const onResetToOneHundredClick = () => counterRef.current.reset(100);

  return () => (
    <div>
      <ComplexCounter componentRef={counterRef} />
      <br />
      <button onClick={onResetToZeroClick}>Reset to 0</button>
      <button onClick={onResetToOneHundredClick}>Reset to 100</button>
    </div>
  );
});

// === Clock demo ====================================================

const ClockDemo = component('ClockDemo', () => {
  const getTime = createTicker((it) => it.toLocaleTimeString());

  return () => (
    <div>
      <h3>Clock demo:</h3>
      Current time: {getTime()}
    </div>
  );
});

// === Memo demo =====================================================

const MemoDemo = component('MemoDemo', () => {
  const [s, set] = state({ count: 0 });
  const onButtonClick = () => set.count((it) => it + 1);
  const memo = createMemo(
    () =>
      'Last time the memoized value was calculated: ' +
      new Date().toLocaleTimeString(),
    () => [Math.floor(s.count / 5)]
  );

  return () => (
    <div>
      <h3>Memoization demo:</h3>
      <button onClick={onButtonClick}>
        Every time you've clicked this button 5 times
        <br />
        the memoized calculation will be performed again
      </button>
      <p>{memo.value}</p>
    </div>
  );
});

// === Interval demo =================================================

const IntervalDemo = component('IntervalDemo', () => {
  const [s, set] = state({
    count: 0,
    delay: 1000
  });

  const onReset = () => set.delay(1000);

  interval(
    () => set.count((it) => it + 1),
    () => s.delay
  );

  interval(() => {
    if (s.delay > 10) {
      set.delay((it) => (it /= 2));
    }
  }, 1000);

  return () => (
    <div>
      <h3>Interval demo:</h3>
      <div>Counter: {s.count}</div>
      <div>Delay: {s.delay}</div>
      <br />
      <button onClick={onReset}>Reset delay</button>
    </div>
  );
});

// === Context demo ==================================================

const translations = {
  en: {
    salutation: 'Hello, ladies and gentlemen!'
  },
  de: {
    salutation: 'Hallo, meine Damen und Herren!'
  },
  fr: {
    salutation: 'Salut, Mesdames, Messieurs!'
  }
};

const LocaleCtx = createContext('en');

const ContextDemo = component('ContextDemo', () => {
  const [getLocale, setLocale] = atom('en');
  const onLocaleChange = (ev: any) => setLocale(ev.target.value);

  return () => (
    <LocaleCtx.Provider value={getLocale()}>
      <h3>Context demo:</h3>
      <div>
        <label htmlFor="lang-selector">Select language: </label>
        <select
          id="lang-selector"
          value={getLocale()}
          onChange={onLocaleChange}
        >
          <option value="en">en</option>
          <option value="fr">fr</option>
          <option value="de">de</option>
        </select>
        <LocaleText id="salutation" />
      </div>
    </LocaleCtx.Provider>
  );
});

const LocaleText = component<{
  id: string;
}>('LocaleText', (p) => {
  const getLocale = consume(LocaleCtx);

  return () => (
    <p>
      {(translations as any)[getLocale()][p.id]} {/* // TODO */}
    </p>
  );
});

// === mouse position demo / ReactiveContoller demo ==================

class MousePosController {
  #valid = false;
  #x = -1;
  #y = -1;

  constructor(host: ReactiveControllerHost) {
    const mouseMoveListener = (ev: MouseEvent) => {
      this.#valid = true;
      this.#x = ev.clientX;
      this.#y = ev.clientY;
      host.requestUpdate();
    };

    host.addController({
      hostConnected() {
        window.addEventListener('mousemove', mouseMoveListener);
      },

      hostDisconnected() {
        window.removeEventListener('mousemove', mouseMoveListener);
      }
    });
  }

  valid() {
    return this.#valid;
  }

  x() {
    return this.#x;
  }

  y() {
    return this.#y;
  }
}

const MousePositionDemo = component('MousePositionDemo', () => {
  const mousePos = create(MousePosController);

  return () => (
    <div>
      {mousePos.valid()
        ? `Mouse position: ${mousePos.x()}x${mousePos.y()}`
        : 'Please move mouse ...'}
    </div>
  );
});

// === promise demo ==================================================

const Loader = component('Loader')<{
  loadingText?: string;
  finishText?: string;
}>((p) => {
  const res = handlePromise(() => wait(4000));

  return () =>
    res.state === 'pending' ? (
      <div>{p.loadingText}</div>
    ) : (
      <div>{p.finishText}</div>
    );
});

const PromiseDemo = component('PromiseDemo', () => {
  const [s, set] = state({
    key: 0,
    loadingText: 'Loading...',
    finishText: 'Finished!'
  });

  const refresh = getRefresher();
  const onRefresh = () => refresh();
  const onRestart = () => set.key((it) => it + 1); // TODO

  const onToggleLoadingText = () =>
    set.loadingText((it) =>
      it === 'Loading...' ? 'Please wait...' : 'Loading...'
    );

  const onToggleFinishText = () =>
    set.finishText((it) => (it === 'Finished!' ? 'Done!' : 'Finished!'));

  return () => (
    <div>
      <h3>Promise demo (last update {new Date().toLocaleTimeString()})</h3>
      <section>
        <Loader
          key={s.key}
          loadingText={s.loadingText}
          finishText={s.finishText}
        />
      </section>
      <br />
      <button onClick={onRefresh}>Refresh</button>
      <button onClick={onRestart}>Restart</button>
      <button onClick={onToggleLoadingText}>Toggle loading text</button>
      <button onClick={onToggleFinishText}>Toggle finish text</button>
    </div>
  );
});

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
}
