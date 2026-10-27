export function sizeMovedEnough(
  size: bigint,
  sizeBefore: bigint,
  isBid: boolean,
  quantity: bigint,
  lot: bigint,
): boolean {
  if (quantity <= 0n) return false;
  const need = quantity > lot ? quantity - lot : 1n;
  const delta = isBid ? size - sizeBefore : sizeBefore - size;
  if (delta < need) return false;
  return isBid ? size > 0n : size < 0n;
}
