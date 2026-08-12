let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  return audioContext;
}

export function prepareStaffNotificationSound(): void {
  const context = getAudioContext();

  if (context.state === 'suspended') {
    void context.resume();
  }
}

export function playStaffNotificationSound(): void {
  const context = getAudioContext();

  const play = () => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startTime = context.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, startTime);

    gain.gain.setValueAtTime(0.12, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.35);
  };

  if (context.state === 'suspended') {
    void context
      .resume()
      .then(play)
      .catch(() => undefined);
    return;
  }

  play();
}
