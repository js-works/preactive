import { h, createContext } from 'preact'

import {
  statefulComponent,
  useContext, useEffect, useInterval, useMemo,
  useObsState, useObsValue,
  useState
} from '../main'

import { toRef } from '../main/utils'

export default {
  title: 'Demos'
}

export const counterDemo1 = () => <CounterDemo1/>
export const counterDemo2 = () => <CounterDemo2/>
export const counterDemo3 = () => <CounterDemo3/>
export const clockDemo = () => <ClockDemo/>
export const memoDemo = () => <MemoDemo/>
export const intervalDemo = () => <IntervalDemo/>
export const contextDemo = () => <ContextDemo/>

// === Counter demo 1 ================================================

const CounterDemo1 = statefulComponent('CounterDemo1', (c, props) => {
  const
    //state = useObsState(c, { count: props.initialValue || 0 }),
    [state, setState] = useState(c, { count: props.initialValue || 0 }),
    onIncrement = () => setState('count', it => it + 1),
    onInput = ev => setState('count', ev.currentTarget.valueAsNumber)

  useEffect(c, () => {
    console.log(`Value of "${props.label}" is now ${state.count}`)
  }, () => [state.count])

  return () =>
    <div>
      <h3>Counter demo 1:</h3>
      <input type="number" value={state.count} onInput={onInput} />
      <button onClick={onIncrement}>{state.count}</button>
    </div>
})

// === Counter demo 2 ================================================

const CounterDemo2 = statefulComponent({
  displayName: 'CounterDemo2',

  defaultProps: {

    initialValue: 0,
    label: 'Counter'
  }
}, (c, props) => {
  const
    state = useObsState(c, { count: props.initialValue }),
    onIncrement = () => state.count++,
    onInput = ev => state.count = ev.currentTarget.valueAsNumber

  useEffect(c, () => {
    console.log(`Value of "${props.label}" is now ${state.count}`)
  }, () => [state.count])

  return () =>
    <div>
      <h3>Counter demo 2:</h3>
      <input type="number" value={state.count} onInput={onInput} />
      <button onClick={onIncrement}>{state.count}</button>
    </div>
})

// === Counter demo 3 ================================================

const CounterDemo3 = statefulComponent({
  displayName: 'CounterDemo3',
  memoize: true,

  defaultProps: {
    initialValue: 0,
    label: 'Counter'
  },
  init: (c, props) => {
    const
      state = useObsState(c, { count: props.initialValue }),
      onIncrement = () => state.count++,
      onInput = ev => state.count = ev.currentTarget.valueAsNumber

    useEffect(c, () => {
      console.log(`Value of "${props.label}" is now ${state.count}`)
    }, () => [state.count])

    return () =>
      <div>
        <h3>Counter demo 3:</h3>
        <input type="number" value={state.count} onInput={onInput} />
        <button onClick={onIncrement}>{state.count}</button>
      </div>
  }
})

// === Clock demo ====================================================

const ClockDemo = statefulComponent('ClockDemo', c => {
  const time = useTime(c)

  return () =>
    <div>
      <h3>Clock demo:</h3>
      Current time: {time.value}
    </div>
})

function getTime() {
  return new Date().toLocaleTimeString()
}

function useTime(c) {
  const time = useObsValue(c, getTime())

  useInterval(c, () => {
    time.value = getTime()
  }, 1000)

  return time
}

// === Memo demo =====================================================

const MemoDemo = statefulComponent('MemoDemo', c => {
  const
    state = useObsState(c, { count: 0 }),
    onButtonClick = () => state.count++,

    memo = useMemo(c,
      () => 'Last time the memoized value was calculated: ' + new Date().toLocaleTimeString(),
      () => [Math.floor(state.count / 5)])

  return () =>
    <div>
      <h3>Memoization demo:</h3>
      <button onClick={onButtonClick}>
        Every time you've clicked this button 5 times<br/>
        the memoized calculation will be performed again
      </button>
      <p>
        {memo.value}
      </p>
    </div>
})

// === Interval demo =================================================

const IntervalDemo = statefulComponent('IntervalDemo', c => {
  const
    state = useObsState(c, {
      count: 0,
      delay: 1000
    }),

    onReset = () => state.delay = 1000

  useInterval(c, () => {
    state.count++
  }, toRef(() => state.delay))

  useInterval(c, () => {
    if (state.delay > 10) {
      state.delay /= 2
    }
  }, 1000)

  return () =>
    <div>
      <h3>Interval demo:</h3>
      <div>Counter: {state.count}</div>
      <div>Delay: {state.delay}</div>
      <br/>
      <button onClick={onReset}>
        Reset delay
      </button>
    </div>
})

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
}

const LocaleCtx = createContext('en')

const ContextDemo = statefulComponent('ContextDemo', c => {
  const
    state = useObsState(c, { locale: 'en' }),
    onLocaleChange = ev =>state.locale = ev.target.value

  return () => (
    <LocaleCtx.Provider value={state.locale}>
      <h3>Context demo:</h3>
      <div>
        <label htmlFor="lang-selector">Select language: </label>
        <select id="lang-selector" value={state.locale} onChange={onLocaleChange}>
          <option value="en">en</option>
          <option value="fr">fr</option>
          <option value="de">de</option>
        </select>
        <LocaleText id="salutation"/>
      </div>
    </LocaleCtx.Provider>
  )
})

const LocaleText = statefulComponent('LocaleText', (c, props) => {
  const locale = useContext(c, LocaleCtx)

  return () => (
    <p>
      { translations[locale.value][props.id] }
    </p>
  )
})
