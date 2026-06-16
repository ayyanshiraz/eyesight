import nodemailer from 'nodemailer'

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (transporter) return transporter
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP_HOST, SMTP_USER, and SMTP_PASS must be set in .env')
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 465),
    secure: true,
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
    from, to, subject,
    text: `${intro}\n\nYour code: ${code}\n\nThis code expires in 15 minutes.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#16241E">
        <h2 style="margin-bottom:8px">${subject}</h2>
        <p style="color:#5B6F66">${intro}</p>
        <p style="font-size:28px;font-weight:600;letter-spacing:6px;color:#1B7A5E;margin:24px 0">${code}</p>
        <p style="color:#5B6F66;font-size:13px">This code expires in 15 minutes.</p>
      </div>
    `,
  })
}

// ── Send prescription results email after test completion ──────────────────
type EyeResult = { sph: number; cyl: number; axis: number; va: string }
export interface ResultsEmailData {
  firstName: string
  email: string
  diagnosis: string
  right: EyeResult
  left: EyeResult
  recommendation: string
  readingAdd?: number
  sessionId: string
  appUrl: string
}

function fmt(n: number, plus = false): string {
  return `${plus && n > 0 ? '+' : ''}${n.toFixed(2)}`
}

export async function sendResultsEmail(data: ResultsEmailData) {
  const from = `"ClearSight" <${process.env.SMTP_USER}>`
  const diagColors: Record<string, string> = {
    MYOPIA: '#1e40af', HYPEROPIA: '#c2410c', EMMETROPIA: '#15803d',
    ASTIGMATISM: '#a16207', MIXED: '#b91c1c',
  }
  const diagColor = diagColors[data.diagnosis] ?? '#374151'

  await getTransporter().sendMail({
    from,
    to: data.email,
    subject: 'Your ClearSight Vision Prescription',
    text: [
      `Hi ${data.firstName},`,
      '',
      'Your ClearSight eye screening is complete. Here are your results:',
      '',
      `Diagnosis: ${data.diagnosis}`,
      '',
      'RIGHT EYE (OD):',
      `  Sph: ${fmt(data.right.sph, true)} D`,
      `  Cyl: ${data.right.cyl !== 0 ? fmt(data.right.cyl) + ' D' : '—'}`,
      `  Axis: ${data.right.cyl !== 0 ? data.right.axis + '°' : '—'}`,
      `  Va: ${data.right.va}`,
      '',
      'LEFT EYE (OS):',
      `  Sph: ${fmt(data.left.sph, true)} D`,
      `  Cyl: ${data.left.cyl !== 0 ? fmt(data.left.cyl) + ' D' : '—'}`,
      `  Axis: ${data.left.cyl !== 0 ? data.left.axis + '°' : '—'}`,
      `  Va: ${data.left.va}`,
      ...(data.readingAdd && data.readingAdd > 0 ? ['', `Reading Add: +${data.readingAdd.toFixed(2)} D`] : []),
      '',
      `Recommendation: ${data.recommendation}`,
      '',
      `View full report: ${data.appUrl}/sessions/${data.sessionId}`,
      '',
      'Note: This is a screening result, not a clinical prescription. Please confirm with an optometrist.',
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#16241E;background:#F4F7F5;padding:24px;border-radius:16px">
        <h2 style="margin:0 0 4px;font-size:22px">ClearSight Vision Prescription</h2>
        <p style="color:#5B6F66;margin:0 0 20px;font-size:14px">Hi ${data.firstName}, your screening is complete.</p>

        <div style="background:white;border-radius:12px;overflow:hidden;border:1px solid #D7ECE3;margin-bottom:16px">
          <div style="background:#1B7A5E;color:white;padding:10px 16px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase">
            ClearSight — Vision Prescription
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <thead>
              <tr style="background:#D7ECE3">
                <th style="padding:8px 12px;text-align:left;color:#5B6F66;font-weight:500;font-size:12px">Eye</th>
                <th style="padding:8px 12px;text-align:center;color:#5B6F66;font-weight:500;font-size:12px">Sph</th>
                <th style="padding:8px 12px;text-align:center;color:#5B6F66;font-weight:500;font-size:12px">Cyl</th>
                <th style="padding:8px 12px;text-align:center;color:#5B6F66;font-weight:500;font-size:12px">Axis</th>
                <th style="padding:8px 12px;text-align:center;color:#5B6F66;font-weight:500;font-size:12px">Va</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-top:1px solid #D7ECE3">
                <td style="padding:12px"><span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600">Right (OD)</span></td>
                <td style="padding:12px;text-align:center;font-family:monospace;font-weight:600">${fmt(data.right.sph, true)}</td>
                <td style="padding:12px;text-align:center;font-family:monospace">${data.right.cyl !== 0 ? fmt(data.right.cyl) : '—'}</td>
                <td style="padding:12px;text-align:center;font-family:monospace">${data.right.cyl !== 0 ? data.right.axis + '°' : '—'}</td>
                <td style="padding:12px;text-align:center;font-family:monospace;font-weight:600;color:#0F4D3B">${data.right.va}</td>
              </tr>
              <tr style="border-top:1px solid #D7ECE3">
                <td style="padding:12px"><span style="background:#f3e8ff;color:#7c3aed;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600">Left (OS)</span></td>
                <td style="padding:12px;text-align:center;font-family:monospace;font-weight:600">${fmt(data.left.sph, true)}</td>
                <td style="padding:12px;text-align:center;font-family:monospace">${data.left.cyl !== 0 ? fmt(data.left.cyl) : '—'}</td>
                <td style="padding:12px;text-align:center;font-family:monospace">${data.left.cyl !== 0 ? data.left.axis + '°' : '—'}</td>
                <td style="padding:12px;text-align:center;font-family:monospace;font-weight:600;color:#0F4D3B">${data.left.va}</td>
              </tr>
              ${data.readingAdd && data.readingAdd > 0 ? `
              <tr style="border-top:1px solid #D7ECE3;background:#F4F7F5">
                <td colspan="4" style="padding:8px 12px;font-size:12px;color:#5B6F66">Reading Add (presbyopia)</td>
                <td style="padding:8px 12px;text-align:center;font-family:monospace;font-weight:600;color:#0F4D3B">+${data.readingAdd.toFixed(2)}</td>
              </tr>` : ''}
            </tbody>
          </table>
        </div>

        <div style="background:white;border-radius:12px;border:1px solid #D7ECE3;padding:12px 16px;margin-bottom:16px">
          <p style="margin:0 0 4px;font-size:12px;color:#5B6F66;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Diagnosis</p>
          <p style="margin:0;font-weight:600;color:${diagColor}">${data.diagnosis}</p>
        </div>

        <div style="background:#D7ECE3;border-radius:12px;padding:12px 16px;margin-bottom:20px">
          <p style="margin:0 0 4px;font-size:12px;color:#0F4D3B;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Recommendation</p>
          <p style="margin:0;font-size:14px;color:#16241E">${data.recommendation}</p>
        </div>

        <a href="${data.appUrl}/sessions/${data.sessionId}"
          style="display:block;background:#1B7A5E;color:white;text-align:center;padding:12px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:16px">
          View Full Report →
        </a>

        <p style="font-size:11px;color:#5B6F66;text-align:center;margin:0">
          This is a screening result, not a clinical prescription.<br>
          Please confirm with a qualified optometrist before acting on these results.
        </p>
      </div>
    `,
  })
}
