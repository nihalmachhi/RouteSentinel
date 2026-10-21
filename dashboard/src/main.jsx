import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const PATHS = { assets: "/api/v1/assets", replay: "/api/v1/replay" };
const examples = {
  invalid: { label: "Invalid origin", prefix: "203.0.113.0/24", origin: 64599, status: "Invalid", finding: "RPKI origin validation failed", severity: "High", path: [64501, 64599] },
  allowed: { label: "Expected origin", prefix: "203.0.113.0/24", origin: 64500, status: "Valid", finding: "No policy finding", severity: "Clear", path: [64501, 64500] },
  subprefix: { label: "Unexpected subprefix", prefix: "203.0.113.128/25", origin: 64550, status: "Unknown", finding: "More-specific route announced", severity: "Medium", path: [64501, 64550] },
};

function App() {
  const [kind, setKind] = useState("invalid");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [assets, setAssets] = useState([]);
  const route = examples[kind];

  async function replay() {
    setMessage("Connecting to local RouteSentinel API…");
    try {
      const response = await fetch(`http://127.0.0.1:8020${PATHS.replay}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ events: [{ timestamp: new Date().toISOString(), prefix: route.prefix, origin_as: route.origin, as_path: route.path, roa_status: route.status.toLowerCase(), feed: "dashboard-demo" }] }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || `API returned ${response.status}`);
      setMessage(`Live replay processed ${data.events_processed} event${data.events_processed === 1 ? "" : "s"}; ${data.alert_count} finding${data.alert_count === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(`${error.message}. The route finding shown is local example data.`);
    }
  }

  async function loadAssets() {
    try {
      const response = await fetch(`http://127.0.0.1:8020${PATHS.assets}`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || `API returned ${response.status}`);
      setAssets(body);
      setMessage(`${body.length} protected asset${body.length === 1 ? "" : "s"} loaded from local API.`);
    } catch (error) { setMessage(`${error.message}. Demo data remains available.`); }
  }

  return <main>
    <header><a className="brand" href="#top"><span className="mark">RS</span> RouteSentinel</a><span className="eyebrow">PASSIVE ROUTE INTEGRITY</span><a href="#method">Detection</a></header>
    <section className="hero" id="top"><p className="eyebrow">BGP EVENT REVIEW · OFFLINE REPLAY</p><h1>See the route.<br/><em>Understand the alert.</em></h1><p>Inspect route evidence against a protected prefix and known origins. Findings recommend review; they never change routing.</p></section>
    <section className="workspace" aria-label="Route event analysis">
      <div className="panel observation"><div className="panel-head"><div><p className="eyebrow">01 / OBSERVED ROUTE</p><h2>Choose a route event</h2></div><span className="pill">Demo fixture</span></div>
        <div className="scenarios" role="group" aria-label="Example route scenarios">{Object.entries(examples).map(([key, value]) => <button key={key} onClick={() => setKind(key)} aria-pressed={kind === key} className={kind === key ? "selected" : ""}>{value.label}</button>)}</div>
        <div className="route"><div><span>ANNOUNCED PREFIX</span><b>{route.prefix}</b></div><div><span>ORIGIN AS</span><b>AS{route.origin}</b></div><div><span>ROA STATUS</span><b className={`state ${route.status.toLowerCase()}`}>{route.status}</b></div></div>
        <p className="eyebrow path-label">AS PATH · OBSERVED</p><div className="path">{route.path.map((asn, index) => <span key={`${asn}-${index}`}><b>AS{asn}</b>{index < route.path.length - 1 && <i aria-hidden="true">→</i>}</span>)}</div>
        <button className="button" onClick={replay}>Replay through local API</button>{message && <p className="notice" role="status">{message}</p>}
      </div>
      <aside className={`panel finding ${route.severity.toLowerCase()}`} aria-live="polite"><p className="eyebrow">02 / POLICY REVIEW</p><div className="verdict"><span className="status-dot"/><h2>{route.finding}</h2></div><span className="severity">{route.severity} · Example finding</span><div className="evidence"><span>Evidence</span><b>{route.prefix} announced by AS{route.origin}</b><span>Origin validation</span><b>{route.status} against configured route policy</b></div><p className="footnote">Review the feed and configured asset baseline before acting. No BGP session, announce, or withdrawal is performed.</p></aside>
    </section>
    <section className="connection" id="method"><div><p className="eyebrow">HOW DETECTION WORKS</p><h2>Validate, compare, explain</h2><p>Offline replay checks origins, more-specific prefixes, and RPKI status. Live feeds and automatic mitigation are not connected.</p></div><div className="connect-controls"><label>Optional operator token<input type="password" value={token} onChange={event => setToken(event.target.value)} placeholder="local operator token" autoComplete="off"/></label><button className="button secondary" onClick={loadAssets}>Load protected assets</button><span className="subtle" role="status">{assets.length ? `${assets.length} assets loaded` : "Local demo mode"}</span></div></section>
    <footer>RouteSentinel <span>Passive review · No route changes</span></footer>
  </main>;
}

createRoot(document.getElementById("root")).render(<App/>);
