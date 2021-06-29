export type AnyFunction = (...args: any[]) => any;
const __events: Map<string, Array<AnyFunction>> = new Map();

/**
 * 基础事件订阅
 */
export const EventEmitter = {
  events() {
    return __events;
  },
  on(key: string, fn: AnyFunction) {
    let exits = __events.get(key);
    if (exits) {
      exits.push(fn);
    } else {
      __events.set(key, [fn]);
    }
  },
  off(key: string, fn: AnyFunction) {
    const _events = __events.get(key);
    if (!_events) return;
    if (fn && _events.length) {
      let tmplArr = [];
      for (let i = _events.length - 1; i >= 0; i--) {
        if (_events[i] !== fn) {
          tmplArr.push(_events[i]);
        }
      }
      tmplArr.length ? __events.set(key, tmplArr) : __events.delete(key);
      return;
    }
    __events.delete(key);
  },
  emit(key: string, ...args: any[]) {
    const _events = __events.get(key);
    if (_events) {
      _events.forEach((func) => func.apply(null, args));
    }
  },
};
