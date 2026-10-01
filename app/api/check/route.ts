import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, formatEther, getAddress, http } from "viem";
import { base } from "viem/chains";
import { ABI, CONTRACT, channelIdFromInput } from "../../../lib/contract";

const client = createPublicClient({ chain: base, transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org") });

async function discover(address: string) {
  const ids = new Set<bigint>();
  let params = new URLSearchParams({ filter: "from" });
  for (let page = 0; page < 30; page++) {
    const url = `https://base.blockscout.com/api/v2/addresses/${address}/transactions?${params}`;
    const res = await fetch(url, { headers: { accept: "application/json" }, next: { revalidate: 60 } });
    if (!res.ok) throw new Error("Blockscout history lookup failed");
    const data = await res.json();
    for (const tx of data.items || []) {
      if (tx.to?.hash?.toLowerCase() !== CONTRACT) continue;
      const id = channelIdFromInput(tx.raw_input);
      if (id !== null) ids.add(id);
    }
    if (!data.next_page_params) break;
    params = new URLSearchParams(Object.entries(data.next_page_params).map(([k, v]) => [k, String(v)]));
  }
  return [...ids];
}

export async function GET(req: NextRequest) {
  try {
    const address = getAddress(req.nextUrl.searchParams.get("address") || "");
    const ids = await discover(address);
    const rows = await Promise.all(ids.map(async channelId => {
      const shares = await client.readContract({ address: CONTRACT, abi: ABI, functionName: "userBalance", args: [channelId, address] });
      if (shares === 0n) return null;
      const [totalSupply, pendingFees] = await Promise.all([
        client.readContract({ address: CONTRACT, abi: ABI, functionName: "channelTotalSupply", args: [channelId] }),
        client.readContract({ address: CONTRACT, abi: ABI, functionName: "pendingFees", args: [channelId, address] }),
      ]);
      const sellableShares = totalSupply > 1n ? (shares < totalSupply - 1n ? shares : totalSupply - 1n) : 0n;
      const sellPrice = sellableShares > 0n
        ? await client.readContract({ address: CONTRACT, abi: ABI, functionName: "getSellPriceAfterFee", args: [channelId, sellableShares] })
        : 0n;
      return { channelId: channelId.toString(), shares: shares.toString(), totalSupply: totalSupply.toString(), sellableShares: sellableShares.toString(), canSell: sellableShares > 0n, sellPriceWei: sellPrice.toString(), sellPriceEth: formatEther(sellPrice), pendingFeesWei: pendingFees.toString(), pendingFeesEth: formatEther(pendingFees) };
    }));
    return NextResponse.json({ address, channels: rows.filter(Boolean) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Lookup failed" }, { status: 400 });
  }
}
