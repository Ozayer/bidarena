let ctx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

/** Plays a short sine tone — silently no-ops if the browser blocks audio (e.g. no user gesture yet). */
function playTone(frequency: number, startOffset: number, duration: number, gainPeak = 0.15) {
  const audio = getContext()
  if (!audio) return
  try {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    const start = audio.currentTime + startOffset
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(gainPeak, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
    osc.connect(gain).connect(audio.destination)
    osc.start(start)
    osc.stop(start + duration)
  } catch {
    // audio not available — ignore
  }
}

export function playBidCue() {
  playTone(660, 0, 0.12)
}

export function playSoldCue() {
  playTone(523, 0, 0.12)
  playTone(784, 0.12, 0.2)
}

export function playTimerLowCue() {
  playTone(880, 0, 0.08, 0.12)
}
