// eslint-disable-next-line no-shadow
export enum AUDIO_STATUS {
  INITIAL = 1, // 完全初始状态，还没有 src，无法播放
  PLAYING = 3, // 正在播放
  WAITING = 4, // 正在缓冲
  PAUSED = 5, // 已暂停
  ENDED = 6, // 播放到结尾
  STOP = 7, // 中断播放，可能是直接关闭了播放器，或者切换了音频
  ERROR = 8, // 音频错误
  PRE_ENDED = 9, // 即将终止
}
export const DEFAULT_MANAGER_INFO = {
  // 只读属性 （比如 duration）也不会被赋值
  src: '',
  title: '微信音频', // NOTE: 必须有值
  epname: '',
  singer: '',
  coverUrl: '',
  coverImgUrl: '', // 微信设置分享的字段名
  webUrl: '',
  protocol: '',
};
// 能设置到 wx.backgroundManager 的 key
export const WHITE_AM_KEYS = ['title', 'epname', 'singer', 'coverImgUrl', 'webUrl', 'protocol'];
export const EVENT_NAMES = {
  update: 'update', // audioManager 上任何属性发生了更新
  error: 'error', // 发生了错误
  srcUpdate: 'srcUpdate', // src 发生了改变
};
export const PLATFORM_NAME = {
  mac: 'mac',
  windows: 'windows',
  ios: 'ios',
  android: 'android',
};
