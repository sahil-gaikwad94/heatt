const pairs = [
  ['Ember body', '#391f19', '#fbf1e9'],
  ['Ember selected pill', '#fffaf5', '#bd4328'],
  ['Ember primary button', '#fffaf5', '#bd4328'],
  ['Ember daily moment', '#32150f', '#ed7249'],
  ['Paper body', '#20211f', '#f9f8f4'],
  ['Paper accent action', '#ffffff', '#bd4f35'],
  ['Midnight body', '#f5f4ed', '#0d0f0f'],
  ['Midnight secondary copy', '#b3b7b1', '#0d0f0f'],
  ['Midnight accent action', '#17100d', '#ff6941'],
  ['Landing body', '#f7f5ef', '#101313'],
  ['Landing accent action', '#1d110e', '#ff744e'],
] as const

function luminance(hex: string) {
  const values = [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2]
}
function contrast(foreground: string, background: string) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}
for (const [name, foreground, background] of pairs) {
  const ratio = contrast(foreground, background)
  if (ratio < 4.5) throw new Error(`${name} fails WCAG AA: ${ratio.toFixed(2)}:1`)
  console.log(`${name}: ${ratio.toFixed(2)}:1`)
}
console.log(`Theme contrast checks passed (${pairs.length} semantic color pairs).`)
