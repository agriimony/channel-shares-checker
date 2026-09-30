import { parseAbi } from "viem";

export const CONTRACT = "0xbc98176dc471cb67dc19fa4558104f034d8965fa" as const;
export const ABI = parseAbi([
  "function userBalance(uint256,address) view returns (uint256)",
  "function getSellPriceAfterFee(uint256,uint256) view returns (uint256)",
  "function pendingFees(uint256,address) view returns (uint256)",
]);

export function channelIdFromInput(input: string): bigint | null {
  if (!input?.startsWith("0x") || input.length < 74) return null;
  try { return BigInt(`0x${input.slice(10, 74)}`); } catch { return null; }
}
