import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: 'var(--color-brand-bg)',
          'bg-2': 'var(--color-brand-bg-2)',
          'bg-3': 'var(--color-brand-bg-3)',
          accent: 'var(--color-brand-accent)',
          'accent-2': 'var(--color-brand-accent-2)',
          text: 'var(--color-brand-text)',
          'text-muted': 'var(--color-brand-text-muted)',
          line: 'var(--color-brand-line)',
          like: 'var(--color-brand-like)',
          skip: 'var(--color-brand-skip)',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        panel: '0 22px 60px -30px rgba(7, 10, 17, 0.72)',
        float: '0 28px 90px -40px rgba(0, 0, 0, 0.75)',
      },
    },
  },
  plugins: [],
}

export default config
