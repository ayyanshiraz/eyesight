import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import Navbar from '@/components/Navbar'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'ClearSight | Free at-home vision screening',
  description:
    'A free, browser-based pre-screening for visual acuity, refractive error, color vision, astigmatism, contrast sensitivity, and macular health.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  )
}
