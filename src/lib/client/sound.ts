const MUTE_KEY = "mafia_muted";

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MUTE_KEY) === "1";
}

export function setMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const Ctor = window.AudioContext || w.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

export function playTone(freq: number, durationMs: number, type: OscillatorType = "sine", volume = 0.05) {
  if (isMuted()) return;
  const audioCtx = getCtx();
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationMs / 1000);
    osc.stop(audioCtx.currentTime + durationMs / 1000 + 0.02);
  } catch {
    // ignore audio failures silently
  }
}

export function soundPhaseChange() {
  playTone(220, 350, "sine", 0.06);
  setTimeout(() => playTone(165, 400, "sine", 0.05), 150);
}

export function soundTick() {
  playTone(880, 80, "square", 0.02);
}

export function soundSuccess() {
  playTone(520, 120, "sine", 0.05);
  setTimeout(() => playTone(780, 180, "sine", 0.05), 110);
}

export function soundError() {
  playTone(140, 220, "sawtooth", 0.05);
}

export function vibrate(pattern: number | number[]) {
  if (typeof window === "undefined") return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}
