import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';

const MIN_PLAY_INTERVAL_MS = 650;

let nativeSound: Audio.Sound | null = null;
let nativeAudioModeConfigured = false;
let lastPlayedAt = 0;
let webAudioContext: AudioContext | null = null;

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

async function playWebNotificationSound() {
  if (typeof window === 'undefined') {
    return;
  }

  const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }

  if (!webAudioContext) {
    webAudioContext = new AudioContextCtor();
  }

  if (webAudioContext.state === 'suspended') {
    await webAudioContext.resume();
  }

  const oscillator = webAudioContext.createOscillator();
  const gain = webAudioContext.createGain();
  const startTime = webAudioContext.currentTime;

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(880, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.03, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.14);

  oscillator.connect(gain);
  gain.connect(webAudioContext.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + 0.15);
}

async function ensureNativeSoundLoaded() {
  if (!nativeAudioModeConfigured) {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      shouldDuckAndroid: true,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playThroughEarpieceAndroid: false,
    });
    nativeAudioModeConfigured = true;
  }

  if (!nativeSound) {
    const created = await Audio.Sound.createAsync(
      require('../assets/sounds/notification-soft.wav'),
      {
        shouldPlay: false,
        volume: 0.34,
      }
    );
    nativeSound = created.sound;
  }
}

export async function playNotificationSound() {
  const now = Date.now();
  if (now - lastPlayedAt < MIN_PLAY_INTERVAL_MS) {
    return;
  }
  lastPlayedAt = now;

  try {
    if (Platform.OS === 'web') {
      await playWebNotificationSound();
      return;
    }

    await ensureNativeSoundLoaded();
    if (!nativeSound) {
      return;
    }

    await nativeSound.replayAsync();
  } catch {
    // Fail silently for autoplay restrictions or audio errors.
  }
}
