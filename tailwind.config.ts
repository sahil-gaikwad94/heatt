import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Full 0-100 opacity scale so any /NN colour modifier compiles
      // (Tailwind's default scale omits steps like 12, 35, 45, 55…).
      opacity: Object.fromEntries(
        Array.from({ length: 101 }, (_, i) => [String(i), (i / 100).toString()])
      ) as Record<string, string>,
      colors: {
        // heatt "dark tech" palette — elevated darks, never absolute black.
        void: '#06060 7'.replace(' ', ''),
        base: '#0A0A0B',
        panel: '#101012',
        elev: '#16161A',
        lift: '#1D1D22',
        line: '#26262C',
        ink: {
          DEFAULT: '#EFEDEA',
          dim: '#A09C97',
          mute: '#6E6A66',
          faint: '#46433F',
        },
        ember: {
          50: '#FFF4E0',
          100: '#FFE3B0',
          200: '#FFCB78',
          300: '#FFAE44',
          400: '#FF8A1F',
          500: '#FF5C0A',
          600: '#EC3F05',
          700: '#B92806',
          800: '#7C1B09',
          900: '#3D1006',
        },
        magma: '#FF2D12',
        flare: '#FFB531',
        whitehot: '#FFF6DE',
        cryo: {
          indigo: '#5B4BFF',
          violet: '#8A5CFF',
          teal: '#2BE0C8',
        },
      },
      fontFamily: {
        sans: ['Inter Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', 'Inter Variable', 'ui-sans-serif', 'sans-serif'],
        serif: ['Newsreader Variable', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        heat: '0 0 0 1px rgba(255,92,10,.28), 0 12px 44px -12px rgba(255,92,10,.35)',
        'heat-lg': '0 0 0 1px rgba(255,92,10,.4), 0 24px 80px -18px rgba(255,92,10,.55)',
        panel: '0 1px 0 rgba(255,255,255,.045) inset, 0 24px 60px -30px rgba(0,0,0,.9)',
      },
      keyframes: {
        'ember-rise': {
          '0%': { transform: 'translate3d(0,0,0) scale(.6)', opacity: '0' },
          '12%': { opacity: '1' },
          '100%': { transform: 'translate3d(var(--dx,8px),-120px,0) scale(.15)', opacity: '0' },
        },
        flicker: {
          '0%,100%': { opacity: '.92', transform: 'scaleY(1)' },
          '25%': { opacity: '1', transform: 'scaleY(1.05)' },
          '50%': { opacity: '.85', transform: 'scaleY(.97)' },
          '75%': { opacity: '1', transform: 'scaleY(1.03)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'heat-pulse': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(255,92,10,0)' },
          '50%': { boxShadow: '0 0 0 8px rgba(255,92,10,.06)' },
        },
      },
      animation: {
        'ember-rise': 'ember-rise 2.6s linear infinite',
        flicker: 'flicker 2.4s ease-in-out infinite',
        shimmer: 'shimmer 2.2s linear infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
        'heat-pulse': 'heat-pulse 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
