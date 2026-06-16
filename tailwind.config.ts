import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4F7F5',
        ink: '#16241E',
        muted: '#5B6F66',
        accent: {
          DEFAULT: '#1B7A5E',
          light: '#D7ECE3',
          dark: '#0F4D3B',
        },
        warm: '#E8B65A',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-body)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
