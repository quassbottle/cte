export function timestampToDate(timestamp: number | string | bigint) {
  return new Date(Number(timestamp.toString()) * 1000);
}
