/** Format a credit number like 0.5 -> "0.5 cr", 12 -> "12 cr". */
export function cr(n: number): string {
  return `${round(n)} cr`
}

export function round(n: number): number {
  return Math.round(n * 100) / 100
}
