import { z } from 'zod'

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'At least 3 characters')
  .max(24, 'At most 24 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, and underscores only')

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  username: usernameSchema,
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().trim().min(1, 'Phone number is required'),
  address: z.string().trim().min(1, 'Address is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your username or email'),
  password: z.string().min(1, 'Enter your password'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const verifySchema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().length(6, 'Enter the 6-digit code'),
})

export type VerifyInput = z.infer<typeof verifySchema>

export const resendCodeSchema = z.object({
  email: z.string().trim().email(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
})

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().length(6, 'Enter the 6-digit code'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

