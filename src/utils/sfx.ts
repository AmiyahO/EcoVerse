// src/utils/sfx.ts
import { Audio } from 'expo-av';

// Preloaded sound map — call preloadSounds() once on app boot
const sounds: Record<string, Audio.Sound> = {};

const SOUND_ASSETS: Record<string, any> = {
  'level-up':      require('../../assets/sounds/level-up.mp3'),
  'token-earn':    require('../../assets/sounds/token-earn.wav'),
  'activity-save': require('../../assets/sounds/activity-save.mp3'),
  'goal-reached':  require('../../assets/sounds/goal-reached.mp3'),
};

export async function preloadSounds() {
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: false });
  for (const [key, asset] of Object.entries(SOUND_ASSETS)) {
    const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: false, volume: 0.8 });
    sounds[key] = sound;
  }
}

export async function playSound(key: keyof typeof SOUND_ASSETS) {
  try {
    const sound = sounds[key];
    if (!sound) return;
    await sound.setPositionAsync(0); // rewind in case it was played before
    await sound.playAsync();
  } catch {
    // Silently fail — SFX should never crash the app
  }
}