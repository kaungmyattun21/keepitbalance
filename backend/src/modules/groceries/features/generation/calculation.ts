type Requirement = {
  ingredientId: string;
  quantity: string;
  recipeServings: number;
  plannedServings: number;
};
export function cents(value: string): bigint {
  return BigInt(value.replace(".", ""));
}
export function quantity(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, "0")}`;
}
function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return a;
}

// Sum rational quantities before rounding upward once. Decimal division alone
// can introduce rounding errors when portions such as thirds are combined.
export function requiredQuantities(rows: Requirement[]): Map<string, string> {
  const totals = new Map<string, { n: bigint; d: bigint }>();
  for (const row of rows) {
    const previous = totals.get(row.ingredientId) ?? { n: 0n, d: 1n };
    const denominator = BigInt(row.recipeServings);
    const n = previous.n * denominator + cents(row.quantity) * BigInt(row.plannedServings) * previous.d;
    const d = previous.d * denominator;
    const divisor = gcd(n, d);
    totals.set(row.ingredientId, { n: n / divisor, d: d / divisor });
  }
  return new Map(
    [...totals].map(([id, { n, d }]) => {
      const rounded = (n + d - 1n) / d;
      if (rounded > 9999999999n)
        throw new RangeError("A generated quantity is too large. Reduce planned servings.");
      return [id, quantity(rounded)];
    }),
  );
}
