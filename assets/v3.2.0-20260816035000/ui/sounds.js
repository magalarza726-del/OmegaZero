let context;

export const SOUND_PACKS = Object.freeze({
  chesscom: { name: 'Chess.com · inspirado' },
  lichess: { name: 'Lichess · inspirado' },
  wood: { name: 'Madera' },
  minimal: { name: 'Minimalista' },
  arcade: { name: 'Arcade' },
});

function ctx() {
  context ||= new (window.AudioContext || window.webkitAudioContext)();
  if (context.state === 'suspended') context.resume().catch(() => {});
  return context;
}

function normaliseOptions(options) {
  if (typeof options === 'boolean') return { enabled: options, pack: 'classic', volume: 0.7 };
  return {
    enabled: options?.enabled !== false,
    pack: SOUND_PACKS[options?.pack] ? options.pack : 'chesscom',
    volume: Math.max(0, Math.min(1, Number(options?.volume ?? 0.7))),
  };
}

function oscillator(audio, destination, { frequency, endFrequency = frequency, type = 'sine', start = 0, duration = 0.09, gain = 0.035 }) {
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  const at = audio.currentTime + start;
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), at + duration);
  amp.gain.setValueAtTime(Math.max(0.0001, gain), at);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(amp).connect(destination);
  osc.start(at);
  osc.stop(at + duration + 0.01);
}

function noise(audio, destination, { start = 0, duration = 0.055, gain = 0.018, highpass = 500 }) {
  const length = Math.max(1, Math.floor(audio.sampleRate * duration));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const amp = audio.createGain();
  const at = audio.currentTime + start;
  source.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.value = highpass;
  amp.gain.setValueAtTime(gain, at);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  source.connect(filter).connect(amp).connect(destination);
  source.start(at);
}

function synth(audio, pack, kind, master) {
  const event = ['move', 'capture', 'check', 'end'].includes(kind) ? kind : 'move';
  if (pack === 'lichess') {
    const base = { move: 285, capture: 205, check: 510, end: 165 }[event];
    oscillator(audio, master, { frequency: base, endFrequency: base * 0.82, type: 'sine', duration: event === 'end' ? 0.22 : 0.095, gain: 0.045 });
    if (event === 'check') oscillator(audio, master, { frequency: 720, endFrequency: 560, type: 'triangle', start: 0.045, duration: 0.11, gain: 0.022 });
    return;
  }
  if (pack === 'wood') {
    noise(audio, master, { duration: event === 'capture' ? 0.085 : 0.055, gain: event === 'capture' ? 0.055 : 0.035, highpass: 280 });
    oscillator(audio, master, { frequency: event === 'check' ? 430 : event === 'end' ? 120 : 155, endFrequency: 85, type: 'triangle', duration: event === 'end' ? 0.24 : 0.075, gain: 0.025 });
    if (event === 'capture') noise(audio, master, { start: 0.035, duration: 0.06, gain: 0.035, highpass: 450 });
    return;
  }
  if (pack === 'minimal') {
    oscillator(audio, master, { frequency: { move: 360, capture: 260, check: 600, end: 190 }[event], type: 'sine', duration: event === 'end' ? 0.14 : 0.055, gain: 0.03 });
    return;
  }
  if (pack === 'arcade') {
    const base = { move: 420, capture: 180, check: 680, end: 220 }[event];
    oscillator(audio, master, { frequency: base, endFrequency: event === 'capture' ? 95 : base * 1.35, type: 'square', duration: event === 'end' ? 0.26 : 0.09, gain: 0.022 });
    if (event === 'check' || event === 'end') oscillator(audio, master, { frequency: base * 1.5, endFrequency: base, type: 'triangle', start: 0.07, duration: 0.13, gain: 0.02 });
    return;
  }
  // Preset “Chess.com inspirado”: ataque corto, nítido y con un pequeño golpe de madera.
  const base = { move: 315, capture: 190, check: 560, end: 145 }[event];
  noise(audio, master, { duration: event === 'capture' ? 0.07 : 0.04, gain: event === 'capture' ? 0.045 : 0.025, highpass: 650 });
  oscillator(audio, master, { frequency: base, endFrequency: event === 'check' ? 690 : base * 0.72, type: 'triangle', duration: event === 'end' ? 0.23 : 0.075, gain: 0.04 });
  if (event === 'check') oscillator(audio, master, { frequency: 760, endFrequency: 610, type: 'sine', start: 0.045, duration: 0.12, gain: 0.025 });
}

export function playTone(kind = 'move', options = true) {
  const { enabled, pack, volume } = normaliseOptions(options);
  if (!enabled || volume <= 0 || typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return;
  try {
    const audio = ctx();
    const master = audio.createGain();
    master.gain.value = 0.8 * volume;
    master.connect(audio.destination);
    synth(audio, pack, kind, master);
  } catch { /* El sonido nunca debe bloquear el juego. */ }
}
