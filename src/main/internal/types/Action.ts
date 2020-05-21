export default Action

type Action<A extends any[] = [], R = void> = (...args: A) => R