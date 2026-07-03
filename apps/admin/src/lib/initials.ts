/** First letters of up to two name words, uppercased — avatar fallback. */
export function initialsOf(name: string | null): string {
  return (
    (name ?? '?')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  );
}
