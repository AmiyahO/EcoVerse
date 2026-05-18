// src/utils/sfx.ts
import { AudioPlayer, createAudioPlayer } from 'expo-audio';

const SOUND_ASSETS: Record<string, any> = {
  'level-up':      require('../../assets/sounds/level-up.mp3'),
  'token-earn':    require('../../assets/sounds/token-earn.wav'),
  'activity-save': require('../../assets/sounds/activity-save.mp3'),
  'goal-reached':  require('../../assets/sounds/goal-reached.mp3'),
};

const players: Record<string, AudioPlayer> = {};

export async function preloadSounds() {
  for (const [key, asset] of Object.entries(SOUND_ASSETS)) {
    const player = createAudioPlayer(asset);
    player.volume = 0.8;
    players[key] = player;
  }
}

export async function playSound(key: string, delayMs = 0) {
  try {
    const player = players[key];
    if (!player) return;
    if (delayMs > 0) {
      await new Promise(res => setTimeout(res, delayMs));
    }
    if (player.playing) return; // don't interrupt a currently playing sound
    player.seekTo(0);
    player.play();
  } catch {
    // Silently fail — SFX should never crash the app
  }
}