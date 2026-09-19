import type { ThemeId } from '../types'

/* ============================================================
   HEATT · THE THREE ATMOSPHERES
   Complete app-wide themes — feed, reader, profile, landing,
   and every room in between. Shared by Settings and Landing.
   ============================================================ */

export type ThemeCatalogEntry = {
  id: ThemeId
  name: string
  note: string
  description: string
  swatches: [string, string, string]
}

export const themeCatalog: ThemeCatalogEntry[] = [
  {
    id: 'ember',
    name: 'Ember',
    note: 'Golden hour, every hour',
    description: 'Warm porcelain daylight, heat-orange energy, soft gold. The default Heatt — bright, warm, quietly confident.',
    swatches: ['#f8f2ea', '#c2410c', '#b89030'],
  },
  {
    id: 'midnight',
    name: 'Midnight',
    note: 'Deep focus after dark',
    description: 'True black, a quiet lime glow, soft cream text. For late reading and long attention.',
    swatches: ['#07080a', '#d8f25b', '#f2f4ee'],
  },
  {
    id: 'ink',
    name: 'Ink',
    note: 'Paper minimalism',
    description: 'Warm white, black ink, a whisper of khaki. Nothing louder than the words themselves.',
    swatches: ['#f7f6f3', '#1b1b18', '#8e825c'],
  },
]
