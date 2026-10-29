const MONEY = /^\d+(\.\d{1,2})?$/;

// Adds decimal strings in whole cents, so the total never picks up float noise.
export function sumMoney(amounts: string[]): string {
  const totalCents = amounts
    .map((amount) => amount.trim())
    .filter((amount) => MONEY.test(amount))
    .reduce((sum, amount) => {
      const [whole = "0", fraction = ""] = amount.split(".");
      return sum + Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    }, 0);
  return `${Math.floor(totalCents / 100)}.${String(totalCents % 100).padStart(2, "0")}`;
}
