// src/lib/optics.ts — ClearSight clinical optics library
// Standard: 1 CSS px = 1/96 inch = 0.2646 mm (CSS spec reference pixel)

const MM_PER_PX     = 25.4 / 96           // 0.2646 mm per CSS px
const RAD_PER_ARCMIN = Math.PI / (180 * 60)

// ── Screen calibration ─────────────────────────────────────────────────────
// Standard credit/CNIC card: ISO 7810 ID-1 = 85.60 × 53.98 mm
export const CARD_WIDTH_MM  = 85.60
export const CARD_HEIGHT_MM = 53.98

/**
 * Given the user-measured card width in CSS px, returns how many px = 1 mm
 * on THEIR actual physical screen. Falls back to CSS spec (96 dpi) default.
 */
export function pxPerMmFromCard(cardWidthPx: number): number {
  if (cardWidthPx <= 0) return 1 / MM_PER_PX   // CSS spec fallback
  return cardWidthPx / CARD_WIDTH_MM
}

// ── Snellen chart ──────────────────────────────────────────────────────────
// Denominators worst → best
export const SNELLEN_DENOMINATORS = [200, 100, 70, 60, 50, 40, 30, 20] as const
export type SnellenDenom = typeof SNELLEN_DENOMINATORS[number]

// Va labels matching the clinical card (6/X notation used in Pakistan/UK)
export const VA_LABELS: Record<number, string> = {
  200: '6/60', 100: '6/36', 70: '6/24', 60: '6/18',
  50: '6/15',  40: '6/12',  30: '6/9',  20: '6/6',
}

/**
 * Calibration-aware E height in CSS px.
 * Uses the physical pxPerMm derived from card calibration, so the
 * letter truly subtends the correct visual angle regardless of screen.
 *
 * Formula: height_mm = tan(5 arcmin × denom/20) × distance_mm
 */
export function calculateSnellenPixelHeight(
  denom: number,
  distanceCm: number,
  pxPerMm: number = 1 / MM_PER_PX
): number {
  const arcmin    = 5 * (denom / 20)
  const heightMm  = Math.tan(arcmin * RAD_PER_ARCMIN) * (distanceCm * 10)
  const px        = heightMm * pxPerMm
  return Math.min(Math.max(px, 8), 320)
}

/** Decimal acuity: 6/6 = 1.0,  6/60 = 0.1 */
export function getDecimalAcuity(denom: number): number { return 20 / denom }

/** Clinical Va label: 6/9, 6/6, etc. */
export function vaLabel(denom: number): string { return VA_LABELS[denom] ?? `6/${Math.round(denom * 0.3)}` }

/** Snellen label in 20/X format */
export function snellenLabel(decimal: number): string { return `20/${Math.round(20 / decimal)}` }

// ── Sphere (Sph) ───────────────────────────────────────────────────────────
export const SPH_MIN  = -10.0
export const SPH_MAX  =   6.0
export const SPH_STEP =   0.25

export function estimateSphere(
  acuity: number, duochrome: number,
  slope = 5.0, duoMyopic = -0.5, duoHyperopic = 0.75
): number {
  let sph = slope * (acuity - 1)
  if (duochrome === 0) sph += duoMyopic
  if (duochrome === 2) sph += duoHyperopic
  return roundToStep(Math.max(SPH_MIN, Math.min(SPH_MAX, sph)), SPH_STEP)
}

// ── Cylinder (Cyl) ────────────────────────────────────────────────────────
// Clinical range: 0.00 to -3.00 D (always negative in minus cylinder notation)
export const CYL_MIN  = -3.00
export const CYL_MAX  =  0.00
export const CYL_STEP =  0.25

// ── Axis ──────────────────────────────────────────────────────────────────
// 1° – 180°, tested via the Jackson cross-cylinder / clock dial
export const AXIS_STEP = 5   // degrees

/**
 * Astigmatism clock-dial: returns the 6 line angles in degrees (0–180)
 * and which one corresponds to the given axis estimate.
 */
export function clockDialLines(): number[] {
  return [0, 30, 60, 90, 120, 150]
}

/** Given which dial sector the user says is darkest, convert to axis degrees */
export function dialSectorToAxis(sector: number): number {
  // sector 0=vertical(90°), 1=30°, 2=60°, 3=horizontal(180°), 4=120°, 5=150°
  const map: Record<number, number> = { 0: 90, 1: 30, 2: 60, 3: 180, 4: 120, 5: 150 }
  return map[sector] ?? 90
}

// ── Helpers ───────────────────────────────────────────────────────────────
export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step
}

export function blurForOffset(offsetDiopters: number): number {
  return Math.min(14, Math.abs(offsetDiopters) * 3.5)
}

export function lensLabel(sph: number): string {
  if (sph <= -0.5) return `Concave (Myopia)   ${sph.toFixed(2)} D`
  if (sph >=  0.5) return `Convex (Hyperopia) +${sph.toFixed(2)} D`
  return `No correction  ${sph.toFixed(2)} D`
}

// ── Diagnosis ─────────────────────────────────────────────────────────────
export type DiagnosisClass = 'EMMETROPIA' | 'MYOPIA' | 'HYPEROPIA' | 'ASTIGMATISM' | 'MIXED'

export function classifyDiagnosis(
  sphL: number, sphR: number, cylL: number, cylR: number
): DiagnosisClass {
  const hasAstig = Math.abs(cylL) >= 0.5 || Math.abs(cylR) >= 0.5
  const worst    = Math.abs(sphL) > Math.abs(sphR) ? sphL : sphR
  if (hasAstig && worst < -0.5) return 'MIXED'
  if (hasAstig) return 'ASTIGMATISM'
  if (worst <= -0.5) return 'MYOPIA'
  if (worst >=  0.5) return 'HYPEROPIA'
  return 'EMMETROPIA'
}

// ── Reading add (presbyopia) ──────────────────────────────────────────────
export function readingAddForAge(age: number): number {
  if (age < 40) return 0
  return Math.min(3.0, roundToStep(((age - 40) / 10 + 1) * 0.75, 0.25))
}
