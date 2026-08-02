import type { KitchenNotificationType } from '../types/notification.types';

const FREQUENCIES_HZ: Record<KitchenNotificationType, number> = {
  'new-order': 880,
  'ready-too-long': 660,
};

// Real bells aren't a single pure tone: several inharmonic partials ring
// together, the higher ones fading faster than the fundamental, on top of
// a short percussive "strike" transient. Approximating that (instead of
// one or two plain sine waves) is what keeps this from sounding like a
// flat electronic beep.
const PARTIALS = [
  { ratio: 1, gain: 0.22, decaySeconds: 0.45 },
  { ratio: 2.0, gain: 0.11, decaySeconds: 0.3 },
  { ratio: 3.0, gain: 0.05, decaySeconds: 0.18 },
];

const STRIKE_DURATION_SECONDS = 0.02;
const STRIKE_GAIN = 0.15;
const STRIKE_FILTER_HZ = 3000;

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

function playPartial(
  context: AudioContext,
  frequency: number,
  peakGain: number,
  decaySeconds: number,
  startTime: number,
): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';

  gain.gain.setValueAtTime(peakGain, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + decaySeconds);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + decaySeconds);
}

// A short burst of filtered noise standing in for the physical "strike"
// of a bell being hit -- without it, the partials alone just fade in and
// out, which reads as synthetic no matter how many of them there are.
function playStrike(context: AudioContext, startTime: number): void {
  const bufferSize = Math.max(1, Math.floor(context.sampleRate * STRIKE_DURATION_SECONDS));
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = context.createBufferSource();
  noise.buffer = buffer;

  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = STRIKE_FILTER_HZ;

  const gain = context.createGain();
  gain.gain.setValueAtTime(STRIKE_GAIN, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + STRIKE_DURATION_SECONDS);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);

  noise.start(startTime);
  noise.stop(startTime + STRIKE_DURATION_SECONDS);
}

export function playNotificationSound(type: KitchenNotificationType): void {
  const context = getAudioContext();
  if (context.state === 'suspended') {
    context.resume();
  }

  const startTime = context.currentTime;
  const fundamentalFreq = FREQUENCIES_HZ[type];

  playStrike(context, startTime);

  for (const partial of PARTIALS) {
    playPartial(
      context,
      fundamentalFreq * partial.ratio,
      partial.gain,
      partial.decaySeconds,
      startTime,
    );
  }
}
