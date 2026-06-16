import { z } from 'zod'

export const intakeSchema = z.object({
  age:                 z.coerce.number().int().min(5).max(120),
  country:             z.string().trim().optional(),
  symptomDistanceBlur: z.boolean(),
  symptomNearBlur:     z.boolean(),
  symptomHeadache:     z.boolean(),
  historyGlasses:      z.boolean(),
  familyHistory:       z.boolean(),
  screenTime:          z.coerce.number().min(0).max(24),
  fatigueScore:        z.coerce.number().int().min(1).max(5),
  cataractRisk:        z.enum(['NONE', 'HALOS', 'FADING', 'BOTH']),
})
export type IntakeInput = z.infer<typeof intakeSchema>

// Full clinical results — matches the prescription card format:
// Right/Left × (Sph, Cyl, Axis, Va)
export const resultsSchema = z.object({
  ipdMm:             z.number().optional(),
  ipdConfidence:     z.number().optional(),
  avgDistanceCm:     z.number().optional(),
  pxPerMm:           z.number().optional(),   // screen calibration factor

  // Visual acuity (decimal)
  acuityRight:       z.number().optional(),
  acuityLeft:        z.number().optional(),

  // Sphere — right and left
  sphRight:          z.number().optional(),
  sphLeft:           z.number().optional(),

  // Cylinder (always ≤ 0 in minus notation)
  cylRight:          z.number().optional(),
  cylLeft:           z.number().optional(),

  // Axis 1–180°
  axisRight:         z.number().int().optional(),
  axisLeft:          z.number().int().optional(),

  // Legacy single cylinder field (kept for DB compat)
  cylinder:          z.number().optional(),

  // Other tests
  astigmatismScore:  z.number().int().optional(),
  colorVisionPass:   z.boolean().optional(),
  macularDistortion: z.boolean().optional(),
  duochromeScore:    z.number().int().optional(),

  readingAdd:        z.number().optional(),
  diagnosisClass:    z.enum(['EMMETROPIA','MYOPIA','HYPEROPIA','ASTIGMATISM','MIXED']).optional(),
  recommendation:    z.unknown().optional(),
})
export type ResultsInput = z.infer<typeof resultsSchema>
