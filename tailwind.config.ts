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
        // heatt "obsidian" palette — true black rooms, charcoal glass panels,
        // one electric accent. Colour is data (temperature), never wallpaper.
        void: '#000000',
        base: '#050505',
        panel: '#121212',
        elev: '#1A1A1A',
        lift: '#1E1E1E',
        line: '#262626',
        ink: {
          DEFAULT: '#FFFFFF',
          dim: '#A0A0A0',
          mute: '#6F6F6F',
          faint: '#4A4A4A',
        },
        // the single accent: electric emerald. Named `ember` so every heat
        // semantic (ignition, temperature, active) keeps its class name.
        ember: {
          50: '#EAFFF7',
          100: '#C6FFE7',
          200: '#8AFFD0',
          300: '#4BF7B3',
          400: '#00E5A0',
          500: '#00C98C',
          600: '#00A876',
          700: '#067F5C',
          800: '#0A5440',
          900: '#062E23',
        },
        magma: '#7CFFD0',
        flare: '#B8FFE3',
        whitehot: '#F2FFFA',
        // cool counterweight — "cold"/decayed states, electric cyan.
        cryo: {
          indigo: '#7AA2FF',
          violet: '#B07CFF',
          teal: '#3DDCFF',
        },
        jade: '#2EF2A6',
        // the reading sheet: obsidian paper (kept light-on-dark, never white).
        paper: {
          DEFAULT: '#0B0B0B',
          soft: '#101010',
          ink: '#FFFFFF',
          dim: '#A0A0A0',
          line: '#1E1E1E',
        },
      },
      fontFamily: {
        sans: ['Inter Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', 'Inter Variable', 'ui-sans-serif', 'sans-serif'],
        serif: ['Newsreader Variable', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        heat: '0 0 0 1px rgba(0,229,160,.3), 0 18px 50px -24px rgba(0,229,160,.42)',
        'heat-lg': '0 0 0 1px rgba(0,229,160,.45), 0 30px 80px -28px rgba(0,229,160,.5)',
        panel: '0 1px 0 rgba(255,255,255,.05) inset, 0 30px 70px -40px rgba(0,0,0,.95)',
        paper: '0 44px 110px -56px rgba(0,0,0,1), 0 0 0 1px rgba(255,255,255,.06)',
        glass: '0 1px 0 rgba(255,255,255,.06) inset, 0 40px 90px -50px rgba(0,0,0,1)',
      },
      keyframes: {
        flicker: {
          '0%,100%': { opacity: '.94', transform: 'scaleY(1)' },
          '25%': { opacity: '1', transform: 'scaleY(1.03)' },
          '50%': { opacity: '.9', transform: 'scaleY(.98)' },
          '75%': { opacity: '1', transform: 'scaleY(1.02)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'heat-pulse': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(0,229,160,0)' },
          '50%': { boxShadow: '0 0 0 8px rgba(0,229,160,.06)' },
        },
        // slow ambient drift — one gentle pass every ~50s, not a constant throb.
        'atmos-drift': {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2%,-1.5%,0) scale(1.05)' },
        },
        // the profile badge float — a few pixels, very slow, gyro-nudged.
        'badge-drift': {
          '0%,100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(0,-4px,0)' },
        },
      },
      animation: {
        flicker: 'flicker 2.4s ease-in-out infinite',
        shimmer: 'shimmer 2.2s linear infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
        'heat-pulse': 'heat-pulse 2.2s ease-in-out infinite',
        'atmos-drift': 'atmos-drift 52s ease-in-out infinite',
        'badge-drift': 'badge-drift 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
