# wx-audio-manager

全局的微信背景音频管理器，支持 TypeScript

## Install

```
yarn add wx-audio-manager --save

# or

npm i wx-audio-manager -S
```

# Get Start

```javascript
import { AudioManager } from 'wx-audio-manager';

class App extends Component {
  componentDidMount() {
    // 初始化
    AudioManager.init();
    // 播放
    AudioManager.play({
      src: '',
      startTime: 5, // 音频开始播放的位置（单位：s）。
    });
    // 或
    AudioManager.playSrc('');
  }

  render() {
    return this.props.children;
  }
}
```

## API

### AudioManager.init

初始化

### AudioManager.get

`function get(): AudioManagerInfo`
获取当前音频信息

### AudioManager.isPlaying

`function isPlaying(): boolean`

是否正在播放音频

### AudioManager.play

`function play(am: AudioManagerInfo): void`
⏯ 播放音频

```javascript
AudioManager.play({
  src: '', // 音频地址
  startTime: 5, // 从第几秒开始播放
  duration: 120, // 音频长度，秒。人为设置 duration 仅在未播放时有效，实际播放时展示音频的真实长度
});
```

### AudioManager.playSrc

`function playSrc(src: string): void`
直接播放音频

### AudioManager.seek

`function seek(am: AudioManagerInfo): void`

⏩ 快进到第几秒，本质也是 AudioManager.play

### AudioManager.pause

⏸ 暂停

### AudioManager.stop

⏹ 停止播放。停止播放后进行 `get` 会丢失 src 等信息

### AudioManager.stopLater

`function stopLater(count: number): void`

⏰⏹ 一段时间后再停止播放

### AudioManager.on

`function on(callbacks: AudioManagerEvents): () => void`

```typescript
type AudioManagerEvents = {
  update: (currentInfo: { data: AudioManagerInfo; evname: string }, lastAm: AudioManagerInfo) => void;
  error: (err: Error) => void;
  srcUpdate: (lastAm: AudioManagerInfo) => void;
};
```

监听音频事件，返回一个取消监听的 off 方法

```javascript
const off = AudioManager.on({
  /** src 更换时触发 */
  srcUpdate() {},
  /** 音频播放错误 */
  error(e) {},
  /** audioManager 有任何信息发生变化 */
  update(res) {
    const { data, evname } = res;
    // dosomething
  },
});
```

## 其他工具方法

### `AUDIO_STATUS`

音频状态枚举

```typescript
enum AUDIO_STATUS {
  INITIAL = 1, // 完全初始状态，还没有 src，无法播放
  PLAYING = 3, // 正在播放
  WAITING = 4, // 正在缓冲
  PAUSED = 5, // 已暂停
  ENDED = 6, // 播放到结尾
  STOP = 7, // 中断播放，可能是直接关闭了播放器，或者切换了音频
  ERROR = 8, // 音频错误
  PRE_ENDED = 9, // 即将终止
}
```

### `getFormattedAudioInfo`

`function getFormattedAudioInfo(am: AudioManagerInfo): AudioManagerInfoExtra`

在 AudioManagerInfo 基础上，额外返回一些信息，便于播放器渲染时使用

```typescript
countdown; // 倒计时，hh:mm:ss 格式字符串
countdownSec; // 倒计时，数字，单位秒
startSec; // 当前进度，数字，单位秒
durationSec; // 总时长，数字，单位秒
playRate; // 当前播放了百分之多少，常用于进度条
```

### `formatTimeString`

`function formatTimeString(n: number): string`

输入秒数，返回 `hh:mm:ss` 的格式化字符串
