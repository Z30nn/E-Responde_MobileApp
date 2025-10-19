declare module 'react-native-incall-manager' {
  interface InCallManagerOptions {
    media: 'audio' | 'video';
    auto?: boolean;
    ringback?: string;
    busytone?: string;
    ringtone?: string;
    incallManagerAutoFocus?: boolean;
    incallManagerAutoFocusOnSpeaker?: boolean;
    incallManagerForceSpeakerphoneOn?: boolean;
    incallManagerForceSpeakerphoneOff?: boolean;
    incallManagerUseSpeakerphoneOn?: boolean;
    incallManagerUseSpeakerphoneOff?: boolean;
  }

  interface InCallManager {
    start(options: InCallManagerOptions): void;
    stop(options?: any): void;
    setForceSpeakerphoneOn(enabled: boolean): void;
    setSpeakerphoneOn(enabled: boolean): void;
    getIsSpeakerphoneOn(callback: (isSpeakerOn: boolean) => void): void;
    setKeepScreenOn(enabled: boolean): void;
    setMicrophoneMute(enabled: boolean): void;
    turnScreenOn(): void;
    turnScreenOff(): void;
    setSpeakerphoneOn(enabled: boolean): void;
    setForceSpeakerphoneOn(enabled: boolean): void;
    setKeepScreenOn(enabled: boolean): void;
    turnScreenOn(): void;
    turnScreenOff(): void;
    setMicrophoneMute(enabled: boolean): void;
    getIsSpeakerphoneOn(callback: (isSpeakerOn: boolean) => void): void;
  }

  const InCallManager: InCallManager;
  export default InCallManager;
}
