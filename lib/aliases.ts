const ADJECTIVES = ['Amber', 'Blue', 'Coral', 'Dusk', 'Ember', 'Fern', 'Gold', 'Haze', 'Iris', 'Jade']
const NOUNS = ['Falcon', 'Heron', 'Ibis', 'Kite', 'Lark', 'Merlin', 'Nuthatch', 'Osprey', 'Plover', 'Raven']

export function generateAlias(index: number): string {
  const adj = ADJECTIVES[index % ADJECTIVES.length]
  const noun = NOUNS[Math.floor(index / ADJECTIVES.length) % NOUNS.length]
  return `${adj} ${noun}`
}

export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
