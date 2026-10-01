"use client";
import { FormEvent, useState } from "react";
import { encodeFunctionData } from "viem";
import { ABI, CONTRACT } from "../lib/contract";

type Row = { channelId: string; shares: string; totalSupply: string; sellableShares: string; canSell: boolean; sellPriceEth: string; pendingFeesWei: string; pendingFeesEth: string };
type EthereumProvider = { request(args: { method: string; params?: unknown[] }): Promise<unknown> };
declare global { interface Window { ethereum?: EthereumProvider } }

export default function Home() {
  const [address, setAddress] = useState(""); const [rows, setRows] = useState<Row[]>([]); const [status, setStatus] = useState("");
  async function check(value = address) {
    setStatus("Checking Base…"); setRows([]);
    const res = await fetch(`/api/check?address=${encodeURIComponent(value)}`); const data = await res.json();
    if (!res.ok) return setStatus(data.error || "Lookup failed");
    setRows(data.channels); setStatus(data.channels.length ? `Found ${data.channels.length} channel${data.channels.length === 1 ? "" : "s"}.` : "No active shares found in this wallet’s direct trade history.");
  }
  async function connect() { if (!window.ethereum) return setStatus("No injected wallet found."); const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[]; const account = accounts[0]; setAddress(account); await check(account); }
  async function transact(row: Row, action: "sell" | "claim") {
    if (!window.ethereum) return setStatus("No injected wallet found.");
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
      const account = accounts[0];
      if (account.toLowerCase() !== address.toLowerCase()) return setStatus("Connect the wallet shown in these results before transacting.");
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x2105" }] });
      const data = action === "sell"
        ? encodeFunctionData({ abi: ABI, functionName: "sellShares", args: [BigInt(row.channelId), BigInt(row.sellableShares)] })
        : encodeFunctionData({ abi: ABI, functionName: "withdrawChannelFees", args: [BigInt(row.channelId)] });
      const hash = await window.ethereum.request({ method: "eth_sendTransaction", params: [{ from: account, to: CONTRACT, data }] }) as string;
      setStatus(`${action === "sell" ? "Sell" : "Claim"} submitted: ${hash.slice(0, 10)}…`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Transaction cancelled or failed."); }
  }
  return <main><section className="hero"><div className="eyebrow">BASE · ONCHAIN</div><h1><em>ChainCheck</em></h1><p>See every channel share a wallet holds, its current sell quote, and fees waiting to be claimed.</p><form onSubmit={(e:FormEvent)=>{e.preventDefault();check();}}><input aria-label="Wallet address" placeholder="0x…" value={address} onChange={e=>setAddress(e.target.value)} required/><button>Check wallet</button></form><button className="connect" onClick={connect}>Connect wallet</button><div className="status">{status}</div></section>{rows.length > 0 && <section className="results">{rows.map(r=><article key={r.channelId}><div><span>CHANNEL</span><strong>#{r.channelId}</strong></div><div className="details"><dl><dt>Shares</dt><dd>{r.shares}</dd><dt>Expected sell{r.canSell ? ` (${r.sellableShares})` : ""}</dt><dd>{r.canSell ? `${r.sellPriceEth} ETH` : "Locked — last share"}</dd><dt>Pending fees</dt><dd>{r.pendingFeesEth} ETH</dd></dl><div className="actions"><button disabled={!r.canSell} onClick={()=>transact(r,"sell")}>{r.canSell ? `Sell ${r.sellableShares} share${r.sellableShares === "1" ? "" : "s"}` : "Cannot sell last share"}</button><button className="secondary" disabled={BigInt(r.pendingFeesWei) === 0n} onClick={()=>transact(r,"claim")}>Claim fees</button></div></div></article>)}</section>}<footer><span>Quotes are live and can change before a transaction lands.</span><a href="ethereum:agrimony.eth">Donate to agrimony.eth</a></footer></main>;
}
