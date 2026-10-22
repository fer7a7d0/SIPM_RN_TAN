export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 20,
  }).format(value)
}

export function parseFormattedNumber(value: string): string {
  return value.replaceAll(",", "")
}
