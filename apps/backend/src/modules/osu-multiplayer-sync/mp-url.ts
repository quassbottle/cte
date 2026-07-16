export function parseOsuMatchId(value: string): number | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'osu.ppy.sh' ||
      url.search ||
      url.hash
    )
      return null;

    const match = url.pathname.match(/^\/(?:community\/matches|mp)\/(\d+)$/);
    const id = match ? Number(match[1]) : NaN;
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
