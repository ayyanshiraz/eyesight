import nodemailer from 'nodemailer'

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (transporter) return transporter

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'SMTP_HOST, SMTP_USER, and SMTP_PASS must be set in .env to send email (see .env.example).'
    )
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 465),
    secure: true, // Hostinger uses TLS on port 465
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  return transporter
}

type OtpPurpose = 'verify-email' | 'reset-password'

const COPY: Record<OtpPurpose, { subject: string; intro: string }> = {
  'verify-email': {
    subject: 'Verify your ClearSight account',
    intro: 'Use the code below to verify your email address and activate your account.',
  },
  'reset-password': {
    subject: 'Reset your ClearSight password',
    intro: 'Use the code below to reset your password.',
  },
}

export async function sendOtpEmail(to: string, code: string, purpose: OtpPurpose) {
  const { subject, intro } = COPY[purpose]
  const from = `"ClearSight" <${process.env.SMTP_USER}>`

  await getTransporter().sendMail({
    from,
    to,
    subject,
    text: `${intro}\n\nYour code: ${code}\n\nThis code expires in 15 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #16241E;">
        <h2 style="margin-bottom: 8px;">${subject}</h2>
        <p style="color: #5B6F66;">${intro}</p>
        <p style="font-size: 28px; font-weight: 600; letter-spacing: 6px; color: #1B7A5E; margin: 24px 0;">${code}</p>
        <p style="color: #5B6F66; font-size: 13px;">
          This code expires in 15 minutes. If you didn't request this, you can ignore this email.
        </p>
      </div>
    `,
  })
}
