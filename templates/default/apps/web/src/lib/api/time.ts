export function parseServerTime(value: string) {
  return new Date(`${value.replace(' ', 'T')}Z`);
}
