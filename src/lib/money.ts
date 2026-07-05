/** EGP formatting for integer piasters. */
export function egp(cents: number): string {
  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export const toCents = (pounds: number) => Math.round(pounds * 100);
