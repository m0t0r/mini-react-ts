export const isEvent = (key: string) => key.startsWith('on')
export const isProperty = (key: string) => key !== 'children' && !isEvent(key)
export const isNew =
  (prev: Record<string, unknown>, next: Record<string, unknown>) => (key: string) =>
    prev[key] !== next[key]
export const isGone =
  (prev: Record<string, unknown>, next: Record<string, unknown>) => (key: string) =>
    !(key in next)
