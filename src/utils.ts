import { AudioManagerInfo } from './types';

export function formatTimeString(seconds?: number | string) {
  if (typeof seconds === 'number' && seconds > 0) {
    const mmss = new Date(seconds * 1000).toISOString().substr(14, 5);
    if (seconds < 3600) {
      return mmss;
    }
    const hh = Math.floor(seconds / 3600);
    return `${hh}:${mmss}`;
  }
  return '00:00';
}

export function isValidProgress(n: any) {
  return typeof n === 'number' && n >= 0;
}

/**
 * 不四舍五入，不会用 0 补全小数点位数
 * @param {number} n
 * @param {number} limit 限制几位小数
 * @returns {string}
 */
function toLazyFixed(n: number, limit: number) {
  const parts = (n + '').split('.');
  if (parts.length >= 2) {
    return `${parts[0]}.${parts[1].slice(0, limit)}`;
  }
  return n + '';
}

function range(x: number, min: number, max: number, _default?: number) {
  let result = Math.max(x, min);
  return Math.min(result, max) || _default || min;
}

function divide(a: number, b: number) {
  return a / b || 0;
}

/** 返回百分比 */
function percent(a: number, b: number) {
  return range(divide(a, b) * 100, 1, 100);
}

export function throttle<T = Function>(fn: T, threshhold: number) {
  let last = 0;
  let context;
  let args;

  return function () {
    /** @ts-ignore */
    context = this;
    // eslint-disable-next-line prefer-rest-params
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

/** 格式化打印 am 中的关键信息 */
export function logAm(am: AudioManagerInfo) {
  return JSON.stringify({
    startTime: am.startTime,
    status: am.status,
    duration: am.duration,
    currentTime: am.currentTime,
  });
}

/**
 * 根据 am 计算各种进度百分比和格式化字符串
 * @param {AudioManager} am audioManager
 * @returns {AudioManager}
 */
export function getFormattedAudioInfo(am: AudioManagerInfo) {
  const rawPlayRate = percent(am.currentTime, am.duration);
  return {
    ...am,
    countdown: formatTimeString(am.duration - am.currentTime),
    startSec: formatTimeString(am.currentTime),
    durationSec: formatTimeString(am.duration),
    countdownSec: Math.floor(am.duration - am.currentTime) || 0,
    playRate: toLazyFixed(rawPlayRate, 2),
  };
}
