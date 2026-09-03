import confetti from 'canvas-confetti'

export function useConfetti() {
  return () => {
    confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 }, colors: ['#00ff88', '#7c3aed', '#0ea5e9', '#fff'] })
    setTimeout(() => confetti({ particleCount: 100, angle: 60, spread: 80, origin: { x: 0 }, colors: ['#00ff88', '#7c3aed'] }), 300)
    setTimeout(() => confetti({ particleCount: 100, angle: 120, spread: 80, origin: { x: 1 }, colors: ['#00ff88', '#7c3aed'] }), 300)
  }
}
