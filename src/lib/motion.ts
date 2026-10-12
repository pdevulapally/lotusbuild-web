// One easing curve and timing scale for every transition, so motion feels consistent.
export const EASE = [0.22, 1, 0.36, 1] as const;

export function reveal(delay = 0) {
  return {
    initial: {opacity: 0, y: 24},
    whileInView: {opacity: 1, y: 0},
    viewport: {once: true, margin: "-80px"},
    transition: {duration: 0.8, delay, ease: EASE},
  } as const;
}
