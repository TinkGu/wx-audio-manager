export type AudioManagerInfo = WechatMiniprogram.BackgroundAudioManager & {
  status: number;
};

/**
 * AudioManager 支持监听的事件
 * - update: audioManager 有任何信息发生变化
 * - error: 音频播放错误
 * - srcUpdate: src 更换时触发
 */
export type AudioManagerEvents = {
  update: (currentInfo: { data: AudioManagerInfo; evname: string }, lastAm: AudioManagerInfo) => void;
  error: (err: Error) => void;
  srcUpdate: (lastAm: AudioManagerInfo) => void;
};
