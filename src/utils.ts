import { AudioManagerInfo } from './types';

export function formatTimeString(seconds?: number | string) {
  if (typeof seconds === 'number' && seconds > 0) {
    const mmss = new Date(seconds * 1000).toISOString().substr(14, 5);
    if (seconds < 3600) {
      return mmss;
    } else {
      const hh = Math.floor(seconds / 3600);
      return `${hh}:${mmss}`;
    }
  }
  return '00:00';
}

export function isValidProgress(n: any) {
  return typeof n === 'number' && n >= 0;
}

export function throttle<T = Function>(fn: T, threshhold: number) {
  let last = 0;
  let context, args;

  return function () {
    /** @ts-ignore */
    context = this;
    args = arguments;
    const now = +new Date();
    const remaining = last ? last + threshhold - now : 0;

    // 表示两次调用间隔时间已经超过阈值，可以继续调用
    if (remaining <= 0) {
      last = +new Date();
      /** @ts-ignore */
      fn.apply(context, args);
      // 防止内存泄漏
      context = null;
      args = null;
    }
  };
}

export function ensureStartTime(startTime?: number, duration?: number): number {
  if (!startTime) {
    return 0;
  }

  if (!isValidProgress(startTime)) {
    return 0;
  }

  if (startTime <= 0) {
    return 0; // NOTE: 原生接口无法 seek 到 0
  }

  // 如果直接从末尾开始播放，把 startTime 减去一些，否则可能会从头开始播放
  if (duration && duration > 0 && startTime >= duration) {
    return duration - 0.5;
  }

  return startTime;
}

export function logAm(am: AudioManagerInfo) {
  return JSON.stringify({
    startTime: am.startTime,
    status: am.status,
    duration: am.duration,
    currentTime: am.currentTime,
  });
}
