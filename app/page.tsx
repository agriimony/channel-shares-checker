"use client";
import { FormEvent, useState } from "react";

type Row = { channelId: string; shares: string; sellPriceEth: string; pendingFeesEth: string };
declare global { interface Window { ethereum?: { request(args: { method: string }): Promise<string[]> } } }

export default function Home() {
  const [address, setAddress] = useState(""); const [rows, setRows] = useState<Row[]>([]); const [status, setStatus] = useState("");
  async function check(value = address) {
    setStatus("Checking Base…"); setRows([]);
    const res = await fetch(`/api/check?address=${encodeURIComponent(value)}`); const data = await res.json();
    if (!res.ok) return setStatus(data.error || "Lookup failed");
    setRows(data.channels); setStatus(data.channels.length ? `Found ${data.channels.length} channel${data.channels.length === 1 ? "" : "s"}.` : "No active shares found in this wallet’s direct trade history.");
  }
  async function connect() { if (!window.ethereum) return setStatus("No injected wallet found."); const [account] = await window.ethereum.request({ method: "eth_requestAccounts" }); setAddress(account); await check(account); }
  return <main><section className="hero"><div className="eyebrow">BASE · ONCHAIN</div><h1>Channel Shares<br/><em>Checker</em></h1><p>See every channel share a wallet holds, its current sell quote, and fees waiting to be claimed.</p><form onSubmit={(e:FormEvent)=>{e.preventDefault();check();}}><input aria-label="Wallet address" placeholder="0x…" value={address} onChange={e=>setAddress(e.target.value)} required/><button>Check wallet</button></form><button className="connect" onClick={connect}>Connect wallet</button><div className="status">{status}</div></section>{rows.length > 0 && <section className="results">{rows.map(r=><article key={r.channelId}><div><span>CHANNEL</span><strong>#{r.channelId}</strong></div><dl><dt>Shares</dt><dd>{r.shares}</dd><dt>Expected sell</dt><dd>{r.sellPriceEth} ETH</dd><dt>Pending fees</dt><dd>{r.pendingFeesEth} ETH</dd></dl></article>)}</section>}<footer>Quotes are live and can change before a transaction lands.</footer></main>;
}
