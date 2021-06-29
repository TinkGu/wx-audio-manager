import { DEFAULT_MANAGER_INFO, WHITE_AM_KEYS, EVENT_NAMES, AUDIO_STATUS } from './constants';
import { AnyFunction, EventEmitter } from './event-emitter';
import { AudioManagerEvents, AudioManagerInfo } from './types';
import { isValidProgress, throttle, ensureStartTime, logAm, formatTimeString } from './utils';

let rawManager: WechatMiniprogram.BackgroundAudioManager;
// NOTE: wx.getBackgroundAudioManager() 并不会返回 title、startTime 等字段，需要自行维护
let curAmInfo: Partial<AudioManagerInfo> = Object.assign(
  {
    src: '',
    status: AUDIO_STATUS.INITIAL,
    // duration: 只会在更换音频或 timeupdate 中改变
  },
  DEFAULT_MANAGER_INFO,
);
let lastUpdate = {}; // 上一次 update 事件传递的数据
let _stopLaterTimer = 0; // 延迟停止播放的计时器
let PLATFORM = wx.getSystemInfoSync().platform;

/**
 * 每次 src 变更时调用，
 * @param {*} nextManager 想要更新的 am
 * @param {*} lastManager 上一个 am
 */
function onSrcUpdate(nextManager: Partial<AudioManagerInfo>, lastManager: Partial<AudioManagerInfo>) {
  let result = {} as Partial<AudioManagerInfo>;
  if (isValidProgress(nextManager.duration)) {
    curAmInfo.duration = nextManager.duration; // 获取新视频的 duration
    result.duration = nextManager.duration;
  }

  curAmInfo.currentTime = 0;
  result.currentTime = 0;
  EventEmitter.emit(EVENT_NAMES.srcUpdate, lastManager);
  return result;
}

// --- 事件相关 ---

function emitUpdate(ename: string) {
  const manager = AudioManager.get();
  // const { duration, currentTime, status, src } = manager
  // ename !== 'timeUpdate' && console.log('update', ename, { duration, currentTime, status, src })

  if (!manager.duration) {
    return;
  }
  const value = { data: manager, ename };
  EventEmitter.emit(EVENT_NAMES.update, value, Object.assign({}, lastUpdate));
  lastUpdate = value;
}

/**
 * 任何修改 curAmInfo 的函数都必须使用该方法！方便 debug 比较两次赋值
 */
function _setAmInfo(setter: Partial<AudioManagerInfo>) {
  curAmInfo = Object.assign(curAmInfo, setter);
}

/**
 * 更应当调用此函数，方便以后统一触发某种回调。
 */
function setAudioStatus(status: number) {
  _setAmInfo({
    status,
  });
}

/**
 * 是否还能获取到来自 wx.getBackgroundAudioManager 的真实数据
 */
function hasWxAudioProgressInfo(status: number) {
  return [AUDIO_STATUS.PLAYING, AUDIO_STATUS.PAUSED].includes(status);
}

export class AudioManager {
  /**
   * 初始化 AudioManager，为其注册生命周期
   */
  static init() {
    rawManager = wx.getBackgroundAudioManager();
    const commonSave = (name: string, status: number) => {
      setAudioStatus(status);
      emitUpdate(name);
    };

    // NOTE: 必须监听 onPlay 否则在部分安卓机型上会播放一段时间后停止！
    // call 了 play() 或重设了 src，但是还需要一些时间才能切到 playing，所以不使用它来标志正在播放
    rawManager.onPlay(() => {});

    const onTimeUpdate = () => {
      const { buffered, currentTime, duration: rawDuration } = rawManager;
      const duration = rawDuration || curAmInfo.duration || 0; // 微信有时无法返回 duration，此时使用后端给的 duration
      if (duration > 0) {
        _setAmInfo({
          buffered,
          currentTime,
          duration,
        });
        commonSave('timeUpdate', AUDIO_STATUS.PLAYING);
      }
    };
    // NOTE: 仅对安卓平台进行节流，iOS 微信已自动节流过
    rawManager.onTimeUpdate(PLATFORM === 'android' ? throttle(onTimeUpdate, 600) : onTimeUpdate);
    rawManager.onPause(() => {
      // 由于安卓使用了节流，timeupdate 有时会延迟执行，导致有时暂停后会跳回播放状态（但事实不再播放了）
      // 所以暂停操作对应延迟相应的时间
      if (PLATFORM === 'android') {
        setTimeout(() => {
          commonSave('pause', AUDIO_STATUS.PAUSED);
        }, 500);
        return;
      }
      commonSave('pause', AUDIO_STATUS.PAUSED);
    });
    rawManager.onStop(() => {
      _setAmInfo({ src: '' });
      commonSave('stop', AUDIO_STATUS.STOP);
    });
    rawManager.onEnded(() => {
      commonSave('preended', AUDIO_STATUS.PRE_ENDED);
      // 略微延迟后再设置终止，使得进度条能够先触底，再弹回 0
      setTimeout(() => {
        _setAmInfo({ src: '' });
        commonSave('ended', AUDIO_STATUS.ENDED);
      }, 100);
    });
    rawManager.onError((e) => {
      console.warn('play audio error', e);
      setAudioStatus(AUDIO_STATUS.ERROR);
      emitUpdate('error');
      EventEmitter.emit(EVENT_NAMES.error, e);
    });
  }

  /**
   * 获取全局音频播放设置
   * @returns audioManager 当前 audioManager 实例
   */
  static get() {
    const { currentTime, paused, buffered } = rawManager;
    let audioManager = {
      ...curAmInfo,
      paused,
      currentTime: currentTime || 0,
      duration: curAmInfo.duration || 0,
      buffered: buffered || 0,
      status: curAmInfo.status || AUDIO_STATUS.INITIAL,
    };

    // 未知微信返回的播放进度时，使用当前的数据
    if (!hasWxAudioProgressInfo(audioManager.status)) {
      audioManager.duration = curAmInfo.duration || 0;
      audioManager.currentTime = curAmInfo.currentTime || 0;
    }

    if (audioManager.status === AUDIO_STATUS.PRE_ENDED || audioManager.status === AUDIO_STATUS.ENDED) {
      audioManager.currentTime = curAmInfo.duration || 0;
    }

    return audioManager;
  }

  /**
   * 设置全局音频播放设置
   */
  static set(nextManager: Partial<AudioManagerInfo>) {
    if (!nextManager) {
      return;
    }

    let hasSrcChanged = false;
    let curManager = AudioManager.get();
    const lastManager = Object.assign({}, curManager); // 建立一个快照

    Object.keys(nextManager).forEach((key) => {
      if (key in DEFAULT_MANAGER_INFO) {
        const newV = (nextManager as any)[key];
        const oldV = (curAmInfo as any)[key];
        const hasChanged = newV !== oldV;
        if (key === 'src' && hasChanged) {
          hasSrcChanged = true;
        }
        if (WHITE_AM_KEYS.includes(key)) {
          (rawManager as any)[key] = newV;
        }
        (curAmInfo as any)[key] = newV;
      }
    });

    let updatedInfo = {};
    if (hasSrcChanged) {
      updatedInfo = onSrcUpdate(nextManager, lastManager);
    }

    return {
      ...AudioManager.get(),
      ...updatedInfo,
      hasSrcChanged,
    };
  }

  // --- 播放相关 ---

  /**
   * 播放背景音乐，同时需要定义若干播放条件，src 必传
   */
  static play(am: Partial<AudioManagerInfo>) {
    const newAm = AudioManager.set(am)!;
    let startTime = am.startTime;
    // 暂停后继续播放，如没有 startTime 必须使用 currentTime
    am.status === AUDIO_STATUS.PAUSED && (startTime = startTime || newAm.currentTime);
    startTime = ensureStartTime(startTime, newAm.duration);

    curAmInfo.currentTime = startTime;
    rawManager.startTime = startTime;
    rawManager.coverImgUrl = newAm.coverImgUrl || '';
    rawManager.title = newAm.title || DEFAULT_MANAGER_INFO.title; // NOTE: 必须在播放前设置，否则真机无法播放
    // NOTE: 安卓上，对于同一个音频，重新 play 会触发 stop 导致无法继续播放，必须重设一个新的 src
    if (PLATFORM === 'android') {
      rawManager.src = `${newAm.src}?_uid=${Math.random()}`; // 使微信认为是两个不同的音频
    } else {
      rawManager.src = newAm.src!; // 设置 src 后自动播放
    }
  }

  /**
   * 播放背景音乐，只需传入 src
   */
  static playSrc(src: string) {
    if (!src) {
      return;
    }
    const am = {
      src,
    };
    AudioManager.play(am);
  }

  /**
   * 使指定 am 跳到指定的地方开始播放或继续播放
   * @param {Object} am audioManager，必须传入 startTime 和 src
   */
  static seek(am: AudioManagerInfo) {
    // 为什么不用原生 seek
    // 1. iOS 不能稳定 seek，会闪烁
    // 2. 安卓 seek 后快速暂停会触发且仅触发一次 timeupdate
    return AudioManager.play(am);
  }

  /**
   * 暂停播放
   */
  static pause() {
    rawManager.pause();
  }

  /**
   * 停止播放，会丢失 src 等信息
   */
  static stop() {
    rawManager.stop();
  }

  /**
   * 在一段时间后，停止播放
   * @param {number} countdown 倒计时持续时间
   */
  static stopLater(countdown: number) {
    clearTimeout(_stopLaterTimer);
    _stopLaterTimer = setTimeout(() => {
      const am = AudioManager.get();
      const runningStatus = [AUDIO_STATUS.PLAYING, AUDIO_STATUS.WAITING, AUDIO_STATUS.PAUSED];
      if (runningStatus.includes(am.status)) {
        AudioManager.stop();
      }
    }, countdown * 1000);
  }

  static isPlaying(am?: AudioManagerInfo) {
    const _am = am || AudioManager.get();
    return _am.status === AUDIO_STATUS.PLAYING || _am.status === AUDIO_STATUS.WAITING;
  }

  /**
   * 向 audioManager 订阅事件，具体可监听的事件可见 EVENT_NAMES
   * @param {object} callbacks 一组事件名，回调的映射
   * @returns {function} 一个批量取消监听的方法
   */
  static on(callbacks: AudioManagerEvents) {
    const validEvents: Array<[string, AnyFunction]> = [];
    Object.keys(callbacks).forEach((ename) => {
      const cb = (callbacks as any)[ename];
      if (ename in EVENT_NAMES && typeof cb === 'function') {
        validEvents.push([ename, cb]);
        EventEmitter.on(ename, cb);
      }
    });
    return () => {
      validEvents.forEach(([key, cb]) => {
        EventEmitter.off(key, cb);
      });
    };
  }
}

export { AUDIO_STATUS, isValidProgress, logAm, formatTimeString };
export type { AudioManagerInfo };
