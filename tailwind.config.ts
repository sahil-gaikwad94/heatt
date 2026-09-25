import type { Config } from 'tailwindcss';

/* ============================================================================
   heatt — design tokens (the "Signal" system)

   The room is black. Everything above it is a five-step neutral stack that
   rises in tiny luminance increments, because on OLED a drop shadow has
   nothing to cast on and elevation has to be built out of value, a lit top
   edge and a wide ambient pool instead.

     room     #000000 → #06070A → #0B0D12 → #11141A → #181C23
     ink      #F2F5FA → #A3ACBD → #6B7486 → #454C5B
     ember    #6BA2FF   the one accent: active, live, hot
     gold     #E8D3A4   heat numbers and editorial highlights
     iris     #E8D3A4   the cool half: kept, saved, archived, focused

   Legacy token names (`ember`, `cryo`, `magma`, `flare`, `paper`, …) are kept
   as aliases so every existing utility class keeps compiling — the whole app
   recolours from this one file.
   ==========================================================================*/

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /* Full 0-100 opacity scale so any /NN colour modifier compiles. */
      opacity: Object.fromEntries(
        Array.from({ length: 101 }, (_, i) => [String(i), (i / 100).toString()])
      ) as Record<string, string>,

      colors: {
        /* ---- the room -------------------------------------------------- */
        void: '#000000',
        base: '#06070A',
        surface: '#0B0D12',
        panel: '#0B0D12',
        elev: '#11141A',
        lift: '#181C23',
        top: '#1F242C',
        /* `line` and `ink` carry numeric aliases so utilities read the way the
           components write them: border-line-2, text-ink-4. */
        line: {
          DEFAULT: 'rgba(255,255,255,0.065)',
          2: 'rgba(255,255,255,0.12)',
          3: 'rgba(255,255,255,0.2)',
          soft: 'rgba(255,255,255,0.065)',
          strong: 'rgba(255,255,255,0.12)',
        },

        /* ---- ink ------------------------------------------------------- */
        ink: {
          DEFAULT: '#F2F5FA',
          dim: '#A3ACBD',
          mute: '#6B7486',
          faint: '#454C5B',
          2: '#A3ACBD',
          3: '#6B7486',
          4: '#454C5B',
        },

        /* ---- the accent: glacier --------------------------------------- */
        ember: {
          50: '#F2F7FF',
          100: '#E2EEFF',
          200: '#C6DEFF',
          300: '#A3C9FF',
          400: '#86B6FF',
          500: '#6BA2FF',
          600: '#4A7FE0',
          700: '#335BA8',
          800: '#1F3A70',
          900: '#101E3C',
        },
        magma: '#86B6FF',
        flare: '#C6DEFF',
        whitehot: '#F2F7FF',
        copper: '#335BA8',
        opal: '#EDE7DA',

        /* ---- supporting hues ------------------------------------------- */
        gold: '#E8D3A4',
        iris: '#E8D3A4',
        /* legacy alias for the cool half of the palette */
        cryo: {
          ice: '#E2EEFF',
          teal: '#A3C9FF',
          indigo: '#6BA2FF',
          violet: '#C6DEFF',
        },
        jade: '#E8D3A4',
        pos: '#7FD0B0',
        warn: '#E8C07A',
        neg: '#FF8F8F',

        /* ---- the reading sheet ----------------------------------------- */
        paper: {
          DEFAULT: '#0A0C11',
          soft: '#0F1218',
          ink: '#F2F5FA',
          dim: '#A3ACBD',
          line: '#1F242C',
        },
      },

      fontFamily: {
        sans: ['Inter Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', 'Inter Variable', 'ui-sans-serif', 'sans-serif'],
        serif: ['Newsreader Variable', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      fontSize: {
        micro: ['clamp(0.6875rem,0.66rem+0.13vw,0.76rem)', { lineHeight: '1.5' }],
        tiny: ['clamp(0.75rem,0.72rem+0.16vw,0.84rem)', { lineHeight: '1.55' }],
        sm: ['clamp(0.83rem,0.8rem+0.17vw,0.93rem)', { lineHeight: '1.6' }],
        base: ['clamp(0.95rem,0.91rem+0.22vw,1.06rem)', { lineHeight: '1.68' }],
        lg: ['clamp(1.08rem,1rem+0.45vw,1.32rem)', { lineHeight: '1.5' }],
        xl: ['clamp(1.3rem,1.12rem+0.9vw,1.85rem)', { lineHeight: '1.3' }],
        '2xl': ['clamp(1.7rem,1.32rem+1.7vw,2.7rem)', { lineHeight: '1.1' }],
        '3xl': ['clamp(2.2rem,1.5rem+3.2vw,4.2rem)', { lineHeight: '1.0' }],
        hero: ['clamp(2.6rem,1.3rem+6.6vw,7rem)', { lineHeight: '0.94' }],
      },

      borderRadius: {
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '22px',
        xl: '28px',
        '2xl': '36px',
        '3xl': '44px',
      },

      boxShadow: {
        inset: '0 1px 0 rgba(255,255,255,.06) inset',
        panel: '0 1px 0 rgba(255,255,255,.05) inset, 0 24px 60px -34px rgba(0,0,0,.95)',
        glass: '0 1px 0 rgba(255,255,255,.07) inset, 0 40px 90px -46px rgba(0,0,0,1)',
        lift: '0 1px 0 rgba(255,255,255,.09) inset, 0 60px 130px -60px rgba(0,0,0,1)',
        paper: '0 44px 110px -56px rgba(0,0,0,1), 0 0 0 1px rgba(255,255,255,.07)',
        heat: '0 0 0 1px rgba(107,162,255,.32), 0 24px 56px -30px rgba(107,162,255,.45)',
        'heat-lg': '0 0 0 1px rgba(107,162,255,.45), 0 34px 80px -28px rgba(107,162,255,.55)',
        cryo: '0 0 0 1px rgba(232,211,164,.3), 0 24px 56px -30px rgba(232,211,164,.4)',
        glow: '0 0 40px -10px rgba(107,162,255,.45)',
      },

      backdropBlur: { xs: '4px', glass: '20px', heavy: '30px' },

      transitionTimingFunction: {
        ht: 'cubic-bezier(.22,1,.36,1)',
        heat: 'cubic-bezier(.16,1,.3,1)',
        springy: 'cubic-bezier(.34,1.4,.5,1)',
      },

      keyframes: {
        'atmos-drift': {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2%,-1.5%,0) scale(1.05)' },
        },
        'float-slow': {
          '0%,100%': { transform: 'translate3d(0,0,0) rotate(0deg)' },
          '50%': { transform: 'translate3d(0,-6px,0) rotate(1.5deg)' },
        },
        'badge-drift': {
          '0%,100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(0,-4px,0)' },
        },
        breath: {
          '0%,100%': { opacity: '.5', transform: 'scale(1)' },
          '50%': { opacity: '.9', transform: 'scale(1.04)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(.92)', opacity: '.7' },
          '70%': { transform: 'scale(1.35)', opacity: '0' },
          '100%': { transform: 'scale(1.4)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        sheen: {
          '0%': { transform: 'translateX(-120%) skewX(-18deg)' },
          '100%': { transform: 'translateX(220%) skewX(-18deg)' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        rise: {
          from: { opacity: '0', transform: 'translate3d(0,14px,0)' },
          to: { opacity: '1', transform: 'translate3d(0,0,0)' },
        },
        'blur-in': {
          from: { opacity: '0', filter: 'blur(14px)' },
          to: { opacity: '1', filter: 'blur(0)' },
        },
        scan: {
          '0%': { transform: 'translateY(-110%)', opacity: '0' },
          '30%': { opacity: '.8' },
          '100%': { transform: 'translateY(900%)', opacity: '0' },
        },
        marquee: { to: { transform: 'translateX(-50%)' } },
      },

      animation: {
        'atmos-drift': 'atmos-drift 52s ease-in-out infinite',
        'float-slow': 'float-slow 9s ease-in-out infinite',
        'badge-drift': 'badge-drift 7s ease-in-out infinite',
        breath: 'breath 6.5s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.8s cubic-bezier(.22,1,.36,1) infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        sheen: 'sheen 5.5s cubic-bezier(.22,1,.36,1) infinite',
        'spin-slow': 'spin-slow 28s linear infinite',
        rise: 'rise .7s cubic-bezier(.22,1,.36,1) both',
        'blur-in': 'blur-in 1s cubic-bezier(.22,1,.36,1) both',
        scan: 'scan 7s cubic-bezier(.22,1,.36,1) infinite',
        marquee: 'marquee 44s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
