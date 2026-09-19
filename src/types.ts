/* Shared product types used across App and components. */

export type ThemeId = 'ember' | 'midnight' | 'ink'

export type Preferences = {
  topics: string[]
  styles: string[]
  intent: string
  languages: string[]
  tuned: string[]
  excludedIds: string[]
}

/** Map any legacy theme id onto the current trio. */
export function normalizeTheme(value: unknown): ThemeId {
  if (value === 'midnight') return 'midnight'
  if (value === 'ink' || value === 'paper') return 'ink'
  return 'ember'
}
