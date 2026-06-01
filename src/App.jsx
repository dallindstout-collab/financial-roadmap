import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ─────────────────────────────────────────────────────────────
   TOKENS
───────────────────────────────────────────────────────────── */
const T = {
  bg0:"#0a0a0b", bg1:"#111113", bg2:"#18181c", bg3:"#222228",
  sidebar:"#0d0d0f", border:"#2a2a32", borderHi:"#3a3a46",
  text0:"#f0f0f2", text1:"#9090a0", text2:"#55556a",
  green:"#4ade80", greenDim:"#1a3d28",
  red:"#f87171",   redDim:"#3d1a1a",
  accent:"#818cf8", accentDim:"#1e2048",
  gold:"#fbbf24",   goldDim:"#332b10",
};

/* ─────────────────────────────────────────────────────────────
   BACKGROUND IMAGES  (Unsplash — loads fine in a real browser)
───────────────────────────────────────────────────────────── */
const BG = {
  home:         "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80",
  // Majestic winding mountain road at sunrise — perfect roadmap metaphor
  salary:       "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1920&q=80",
  emergencyfund:"https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1920&q=80",
  realestate:   "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80",
  investments:  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920&q=80",
  retirement:   "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80",
  futureevents: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80",
  networth:     "https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?w=1920&q=80",
};

/* ─────────────────────────────────────────────────────────────
   FINNHUB
───────────────────────────────────────────────────────────── */
const FINNHUB_KEY = "d8do22pr01qhm4ag8c30d8do22pr01qhm4ag8c3g";
const TICKERS = ["MU","VOO","QQQ","DIA","VTI","VXUS","VT"];

/* ─────────────────────────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%}
body{font-family:'DM Mono',monospace;background:${T.bg0};color:${T.text0};-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:${T.bg0}}
::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
input[type="month"],input[type="number"],input[type="text"]{
  background:${T.bg3};border:1px solid ${T.border};border-radius:6px;
  color:${T.text0};font-family:'DM Mono',monospace;font-size:13px;
  padding:9px 12px;width:100%;outline:none;transition:border-color 0.15s}
input:focus{border-color:${T.accent}}
input::placeholder{color:${T.text2}}
input[type="month"]::-webkit-calendar-picker-indicator{filter:invert(0.5);cursor:pointer}
input[type="range"]{-webkit-appearance:none;appearance:none;width:100%;height:4px;
  border-radius:2px;background:${T.border};outline:none;cursor:pointer;padding:0;border:none}
input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
  width:16px;height:16px;border-radius:50%;background:${T.gold};cursor:pointer;
  border:2px solid ${T.bg0};transition:transform 0.1s}
input[type="range"]::-webkit-slider-thumb:hover{transform:scale(1.2)}
button{cursor:pointer;font-family:'DM Mono',monospace}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.fu{animation:fadeUp 0.35s ease both}
.fu1{animation-delay:0.04s}.fu2{animation-delay:0.08s}.fu3{animation-delay:0.12s}
.fu4{animation-delay:0.16s}.fu5{animation-delay:0.20s}.fu6{animation-delay:0.24s}
@keyframes pulseGlow{0%,100%{box-shadow:0 0 8px rgba(129,140,248,0.3)}50%{box-shadow:0 0 18px rgba(129,140,248,0.7)}}
.pulse-add{animation:pulseGlow 2.5s ease-in-out infinite}
`;

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const fmt     = v => "$" + Math.round(v).toLocaleString();
const fmtK    = v => v >= 1e6 ? "$"+(v/1e6).toFixed(1)+"M" : v >= 1000 ? "$"+(v/1000).toFixed(0)+"k" : "$"+v;
const toFrac  = d => { const [y,m]=d.split("-").map(Number); return y+(m-1)/12; };
const fromFrac= f => { const y=Math.floor(f),m=Math.round((f-y)*12)+1; return `${y}-${String(m).padStart(2,"0")}`; };
const lblOf   = d => { const [y,m]=d.split("-"); return new Date(+y,+m-1).toLocaleDateString("en-US",{month:"short",year:"2-digit"}); };
const fullLbl = d => { const [y,m]=d.split("-"); return new Date(+y,+m-1).toLocaleDateString("en-US",{month:"long",year:"numeric"}); };

function buildChartData(entries, rate) {
  if (!entries.length) return [];
  const mo = rate/100/12;
  const pts = [];
  for (let i=0; i<entries.length; i++) {
    const e = entries[i];
    pts.push({ date:e.date, salary:e.salary, label:lblOf(e.date), fullLabel:fullLbl(e.date), role:e.role, company:e.company, projected:false });
    if (i < entries.length-1 && rate > 0) {
      const sf=toFrac(e.date), ef=toFrac(entries[i+1].date), gap=Math.round((ef-sf)*12);
      for (let m=1; m<gap; m++) {
        const pd = fromFrac(sf+m/12);
        pts.push({ date:pd, salary:e.salary*Math.pow(1+mo,m), label:lblOf(pd), fullLabel:fullLbl(pd), projected:true });
      }
    }
  }
  let prev = null;
  return pts.map(p => {
    let change=null, changePct=null;
    if (!p.projected && prev!==null) { change=p.salary-prev; changePct=change/prev*100; }
    if (!p.projected) prev=p.salary;
    return {...p, change, changePct};
  });
}

/* ─────────────────────────────────────────────────────────────
   SHARED COMPONENTS
───────────────────────────────────────────────────────────── */

// Full-bleed background panel
function BgPanel({ id, children, scroll=false }) {
  return (
    <div style={{
      height:"100%", position:"relative",
      overflow: scroll ? "auto" : "hidden",
      backgroundImage:`url(${BG[id]})`,
      backgroundSize:"cover", backgroundPosition:"center",
    }}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.78)",zIndex:0,pointerEvents:"none"}} />
      <div style={{position:"relative",zIndex:1,minHeight:"100%"}}>
        {children}
      </div>
    </div>
  );
}

// Metric card
function Metric({ label, value, sub, subColor, delay=1 }) {
  return (
    <div className={`fu fu${delay}`} style={{
      background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
      borderRadius:8, padding:"0.45rem 0.8rem",
    }}>
      <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:3}}>{label}</div>
      <div style={{fontSize:14,fontWeight:600,color:"#fff",letterSpacing:"-0.01em",fontFamily:"'Syne',sans-serif"}}>{value}</div>
      {sub && <div style={{fontSize:9,color:subColor||"rgba(255,255,255,0.4)",marginTop:2}}>{sub}</div>}
    </div>
  );
}

// Glass card
function Card({ children, style={}, className="" }) {
  return (
    <div className={className} style={{
      background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
      borderRadius:12, padding:"1.25rem", marginBottom:"1.5rem",
      overflow:"visible", ...style,
    }}>
      {children}
    </div>
  );
}

// Mortgage tooltip
function MortgageTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  if (d.noLoan) return null;
  const rows = d.paidOff ? [
    { color:T.green,   label:"Status",       val:"🎉 Paid off!" },
    { color:"#a78bfa", label:"Market value",  val:fmt(d.marketValue) },
    { color:T.green,   label:"Equity",        val:fmt(d.equity) },
  ] : [
    { color:T.gold,    label:"Balance",       val:fmt(d.balance) },
    { color:T.red,     label:"Interest owed", val:fmt(d.interestOwed) },
    { color:"#a78bfa", label:"Market value",  val:fmt(d.marketValue) },
    { color:T.green,   label:"Equity",        val:fmt(d.equity) },
  ];
  return (
    <div style={{background:T.bg2,border:`1px solid ${T.borderHi}`,borderRadius:10,padding:"14px 18px",boxShadow:"0 8px 32px rgba(0,0,0,0.7)",minWidth:220}}>
      <div style={{color:T.text1,marginBottom:10,fontSize:13,fontWeight:600,fontFamily:"'Syne',sans-serif",display:"flex",alignItems:"center",gap:8}}>
        <span>{d.age != null ? `Age ${d.age}` : d.year}</span>
        {d.isEvent && <span style={{fontSize:10,color:T.accent,background:T.accentDim,padding:"2px 7px",borderRadius:4}}>EVENT</span>}
      </div>
      {rows.map(r=>(
        <div key={r.label} style={{display:"flex",justifyContent:"space-between",gap:24,marginBottom:6,fontSize:13}}>
          <span style={{color:T.text2}}>{r.label}</span>
          <span style={{color:r.color,fontWeight:600,fontFamily:"'Syne',sans-serif"}}>{r.val}</span>
        </div>
      ))}
      {d.eventNote && (
        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.border}`,fontSize:12,color:T.accent}}>{d.eventNote}</div>
      )}
    </div>
  );
}

// Chart tooltip for 401k/investments chart
function SalTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rows = [
    d.k401        > 0 ? { color:T.green,   label:"401k Balance",   val:fmt(d.k401) }        : null,
    d.investBalance>0 ? { color:T.gold,    label:"Investments",    val:fmt(d.investBalance)} : null,
    d.netWorth    > 0 ? { color:"#a78bfa", label:"Net Worth",      val:fmt(d.netWorth) }     : null,
  ].filter(Boolean);
  return (
    <div style={{background:T.bg2,border:`1px solid ${T.borderHi}`,borderRadius:10,padding:"14px 18px",boxShadow:"0 8px 32px rgba(0,0,0,0.7)",minWidth:200}}>
      <div style={{color:T.text1,marginBottom:10,fontSize:13,fontWeight:600,fontFamily:"'Syne',sans-serif",display:"flex",alignItems:"center",gap:8}}>
        <span>{d.age != null ? `Age ${d.age}` : d.year}</span>
        {d.isEvent && <span style={{fontSize:10,color:T.accent,background:T.accentDim,padding:"2px 7px",borderRadius:4}}>EVENT</span>}
      </div>
      {rows.map(r=>(
        <div key={r.label} style={{display:"flex",justifyContent:"space-between",gap:24,marginBottom:6,fontSize:13}}>
          <span style={{color:T.text2}}>{r.label}</span>
          <span style={{color:r.color,fontWeight:600,fontFamily:"'Syne',sans-serif"}}>{r.val}</span>
        </div>
      ))}
      {d.eventNote && (
        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.border}`,fontSize:12,color:T.accent}}>{d.eventNote}</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TICKER BAR
───────────────────────────────────────────────────────────── */
function TickerBar() {
  const [quotes, setQuotes]     = useState({});
  const [status, setStatus]     = useState("loading");
  const [errMsg, setErrMsg]     = useState("");
  const [ts, setTs]             = useState(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const next = {};
      for (const t of TICKERS) {
        const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${t}&token=${FINNHUB_KEY}`);
        if (!r.ok) { setErrMsg(`HTTP ${r.status}`); setStatus("error"); return; }
        const d = await r.json();
        if (d.c != null) next[t] = { price: d.c, pct: d.dp ?? 0 };
      }
      if (!Object.keys(next).length) { setErrMsg("No data returned"); setStatus("error"); return; }
      setQuotes(next);
      setTs(new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}));
      setStatus("ok");
    } catch(e) { setErrMsg(e.message); setStatus("error"); }
  }, []);

  useEffect(() => { load(); const id=setInterval(load,60000); return ()=>clearInterval(id); }, [load]);

  const row = { display:"flex", alignItems:"center", height:"100%", paddingLeft:4, overflowX:"auto", flex:1 };

  if (status==="loading") return <div style={{...row,paddingLeft:20}}><span style={{fontSize:11,color:T.text2}}>Fetching market data…</span></div>;
  if (status==="error")   return (
    <div style={{...row,paddingLeft:20,gap:12}}>
      <span style={{fontSize:11,color:T.red}}>⚠ {errMsg}</span>
      <button onClick={load} style={{fontSize:10,color:T.accent,background:"transparent",border:`1px solid ${T.border}`,borderRadius:4,padding:"2px 8px"}}>retry</button>
    </div>
  );

  return (
    <div style={row}>
      {TICKERS.map((t,i) => {
        const q = quotes[t]; if (!q) return null;
        const up = q.pct >= 0;
        return (
          <div key={t} style={{display:"flex",alignItems:"center",gap:7,padding:"0 16px",borderRight:i<TICKERS.length-1?`1px solid ${T.border}`:"none",whiteSpace:"nowrap"}}>
            <span style={{fontSize:11,fontWeight:500,color:T.text1,letterSpacing:"0.05em"}}>{t}</span>
            <span style={{fontSize:13,fontWeight:500,color:T.text0,fontFamily:"'Syne',sans-serif"}}>${q.price.toFixed(2)}</span>
            <span style={{fontSize:10,color:up?T.green:T.red,background:up?T.greenDim:T.redDim,padding:"2px 6px",borderRadius:4}}>
              {up?"▲":"▼"} {Math.abs(q.pct).toFixed(2)}%
            </span>
          </div>
        );
      })}
      {ts && <div style={{marginLeft:"auto",paddingRight:16,fontSize:10,color:T.text2,whiteSpace:"nowrap"}}>{ts}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   HOME PANEL
───────────────────────────────────────────────────────────── */
function HomePanel() {
  return (
    <BgPanel id="home">
      <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:20}}>My Financial Roadmap</div>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:56,fontWeight:800,color:"#fff",letterSpacing:"-0.03em",marginBottom:16,lineHeight:1.1}}>
            Your future<br/>starts here<span style={{color:T.accent}}>.</span>
          </h1>
          <p style={{color:"rgba(255,255,255,0.5)",fontSize:15,maxWidth:380,lineHeight:1.8,margin:"0 auto 32px"}}>
            Track your salary, investments, real estate, and more — all in one place.
          </p>
          <div style={{display:"inline-block",fontSize:11,color:"rgba(255,255,255,0.35)",border:"1px solid rgba(255,255,255,0.15)",padding:"8px 20px",borderRadius:20,letterSpacing:"0.1em"}}>
            SELECT A MODULE TO GET STARTED
          </div>
        </div>
      </div>
    </BgPanel>
  );
}

/* ─────────────────────────────────────────────────────────────
   PLACEHOLDER PANEL
───────────────────────────────────────────────────────────── */
function PlaceholderPanel({ id, title, desc }) {
  return (
    <BgPanel id={id}>
      <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
        <div style={{textAlign:"center",maxWidth:500}}>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:52,fontWeight:800,color:"#fff",letterSpacing:"-0.03em",marginBottom:16,lineHeight:1.1}}>
            {title}<span style={{color:T.accent}}>.</span>
          </h2>
          <p style={{color:"rgba(255,255,255,0.55)",fontSize:15,lineHeight:1.8,marginBottom:32}}>{desc}</p>
          <div style={{display:"inline-block",fontSize:11,color:"rgba(255,255,255,0.35)",border:"1px solid rgba(255,255,255,0.15)",padding:"8px 20px",borderRadius:20,letterSpacing:"0.12em"}}>
            COMING SOON
          </div>
        </div>
      </div>
    </BgPanel>
  );
}

/* ─────────────────────────────────────────────────────────────
   CUSTOM MONTH PICKER
───────────────────────────────────────────────────────────── */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function MonthPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [py, setPy] = useState(() => value ? +value.split("-")[0] : new Date().getFullYear());
  const selY = value ? +value.split("-")[0] : null;
  const selM = value ? +value.split("-")[1] : null;

  const pick = (m) => {
    const ms = String(m).padStart(2,"0");
    onChange(`${py}-${ms}`);
    setOpen(false);
  };

  const displayVal = value ? (() => {
    const [y,m] = value.split("-");
    return `${MONTHS[+m-1]} ${y}`;
  })() : "Select date";

  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        width:"100%", padding:"9px 12px", background:T.bg3,
        border:`1px solid ${open?T.accent:T.border}`, borderRadius:6,
        color: value ? T.text0 : T.text2, fontFamily:"'DM Mono',monospace",
        fontSize:13, textAlign:"left", cursor:"pointer", transition:"border-color 0.15s",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <span>{displayVal}</span>
        <span style={{color:T.text2, fontSize:10}}>{open?"▲":"▼"}</span>
      </button>

      {open && (
        <div style={{
          position:"absolute", bottom:"calc(100% + 6px)", left:0, zIndex:9999,
          background:T.bg2, border:`1px solid ${T.borderHi}`, borderRadius:10,
          padding:"16px", minWidth:240, boxShadow:"0 16px 48px rgba(0,0,0,0.7)",
        }}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <button onClick={()=>setPy(y=>y-1)} style={{
              background:T.bg3, border:`1px solid ${T.border}`, borderRadius:6,
              color:T.text0, fontSize:16, width:36, height:36, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>{"<"}</button>
            <span style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:700,color:T.text0}}>{py}</span>
            <button onClick={()=>setPy(y=>y+1)} style={{
              background:T.bg3, border:`1px solid ${T.border}`, borderRadius:6,
              color:T.text0, fontSize:16, width:36, height:36, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>{">"}</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
            {MONTHS.map((mo,i)=>{
              const mn = i+1;
              const active = selY===py && selM===mn;
              return (
                <button key={mo} onClick={()=>pick(mn)} style={{
                  padding:"10px 0", fontSize:12, fontFamily:"'DM Mono',monospace",
                  borderRadius:6, border:`1px solid ${active?T.accent:T.border}`,
                  background:active?T.accentDim:"transparent",
                  color:active?T.accent:T.text1,
                  cursor:"pointer", transition:"all 0.12s",
                }}
                  onMouseEnter={e=>{if(!active){e.currentTarget.style.background=T.bg3;e.currentTarget.style.borderColor=T.borderHi;}}}
                  onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=T.border;}}}>
                  {mo}
                </button>
              );
            })}
          </div>
          <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${T.border}`,display:"flex",gap:6,flexWrap:"wrap"}}>
            {[2020,2021,2022,2023,2024,2025,2026].map(y=>(
              <button key={y} onClick={()=>setPy(y)} style={{
                padding:"4px 8px",fontSize:10,borderRadius:4,fontFamily:"'DM Mono',monospace",
                border:`1px solid ${py===y?T.accent:T.border}`,
                background:py===y?T.accentDim:"transparent",
                color:py===y?T.accent:T.text2, cursor:"pointer",
              }}>{y}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Compute mortgage schedule with home appreciation (3%/yr) and equity
function buildMortgageData(mortgages, startYear, maxYear, lifeEvents) {
  if (!mortgages.length) return [];
  const m = mortgages[mortgages.length - 1];
  const principal = m.price * (1 - m.downPct / 100);
  const downPayment = m.price * m.downPct / 100;
  const monthlyRate = m.rate / 100 / 12;
  const nPayments = m.termYears * 12;
  const monthlyPayment = monthlyRate === 0 ? principal / nPayments
    : principal * monthlyRate * Math.pow(1 + monthlyRate, nPayments)
      / (Math.pow(1 + monthlyRate, nPayments) - 1);

  const pts = [];
  let balance = principal;

  // Show one year before purchase with zero values so lines start together
  const plotStart = Math.max(startYear - 1, m.year - 1);
  for (let y = plotStart; y <= maxYear; y++) {
    if (y < m.year) {
      pts.push({ year: y, label: String(y), balance: 0, principalPaid: 0, interestOwed: 0, marketValue: 0, equity: 0, noLoan: true });
      continue;
    }
    const yearsIntoLoan = y - m.year;
    const marketValue = Math.round(m.price * Math.pow(1.03, yearsIntoLoan));
    if (yearsIntoLoan >= m.termYears) {
      pts.push({ year: y, label: String(y), balance: 0, principalPaid: principal, interestOwed: 0, marketValue, equity: marketValue, paidOff: true });
      continue;
    }
    let bal = balance;
    for (let mo = 0; mo < 12; mo++) {
      const intCharge = bal * monthlyRate;
      bal -= (monthlyPayment - intCharge);
    }
    // Apply any extra principal payments logged as life events this year
    const extraPrincipal = (lifeEvents||[])
      .filter(e => e.year === y && e.type === "extra-mortgage")
      .reduce((s, e) => s + e.amount, 0);
    bal = Math.max(0, bal - extraPrincipal);
    balance = bal;
    const isMortEvent = mortgages.some(m => m.year === y) || extraPrincipal > 0;
    if (balance === 0) {
      // Paid off early due to extra payments
      pts.push({ year: y, label: String(y), balance: 0, principalPaid: principal, interestOwed: 0, marketValue, equity: marketValue, paidOff: true, isEvent: isMortEvent });
      continue;
    }
    const paymentsRemaining = Math.max(0, nPayments - (yearsIntoLoan + 1) * 12);
    const interestRemaining = Math.max(0, monthlyPayment * paymentsRemaining - balance);
    const equity = marketValue - balance;
    pts.push({
      year: y, label: String(y),
      balance: Math.round(balance),
      principalPaid: Math.round(principal - balance),
      interestOwed: Math.round(interestRemaining),
      marketValue,
      equity: Math.round(equity),
      isEvent: isMortEvent,
    });
  }
  return pts;
}

/* ─────────────────────────────────────────────────────────────
   SALARY PANEL
───────────────────────────────────────────────────────────── */

// Given a list of anchor entries (sorted by year) and a rate,
// compute the projected salary at any given year using compounding
// from the most recent anchor at or before that year.
function projectedSalaryAtYear(entries, rate, year) {
  if (!entries.length) return null;
  // find last anchor at or before this year
  const anchors = entries.filter(e => e.year <= year);
  if (!anchors.length) return null;
  const base = anchors[anchors.length - 1];
  const yearsElapsed = year - base.year;
  return base.salary * Math.pow(1 + rate / 100, yearsElapsed);
}

// Build chart data: one point per year
// Accumulates 401k and investment balances with 7% annual growth
function buildTimelineChartData(entries, rate, startYear, contrib401k, match401k, investments, lifeEvents) {
  if (!entries.length) return [];
  const pts = [];
  let k401Balance = 0;
  let investBalance = 0;
  for (let y = startYear; y <= startYear + 39; y++) {
    const anchor = [...entries].reverse().find(e => e.year <= y);
    if (!anchor) continue;
    const sal = anchor.salary * Math.pow(1 + rate / 100, y - anchor.year);
    const isAnchor = entries.some(e => e.year === y);
    // 401k: annual contribution this year, then grow
    const c401 = [...contrib401k].reverse().find(c => c.year <= y);
    const empPct = c401 ? c401.pct : 0;
    const k401emp = empPct > 0 ? sal * empPct / 100 : 0;
    const matchAmt = (match401k?.enabled && c401 && empPct > 0)
      ? sal * Math.min(empPct, match401k.upToPct) / 100 * match401k.matchPct / 100
      : 0;
    const annualK401 = k401emp + matchAmt;
    k401Balance = (k401Balance + annualK401) * 1.07;
    // Investments: annual contribution this year, then grow
    const invEntry = [...investments].reverse().find(i => i.year <= y);
    const annualInvest = (invEntry && invEntry.pct > 0) ? sal * invEntry.pct / 100 : 0;
    // Life events for this year: extra-invest adds to investBalance, extra-mortgage handled in mortgage calc
    const yearLifeEvents = (lifeEvents||[]).filter(e => e.year === y);
    const extraInvest = yearLifeEvents.filter(e => e.type === "extra-invest").reduce((s,e) => s + e.amount, 0);
    const extraExpense = yearLifeEvents.filter(e => e.type === "expense").reduce((s,e) => s + e.amount, 0);
    // Add regular + extra contributions, then grow; subtract expenses from invest balance
    investBalance = (investBalance + annualInvest + extraInvest - extraExpense) * 1.07;
    if (investBalance < 0) investBalance = 0;
    // Mark event years and build a note for the tooltip
    const is401kEvent   = contrib401k.some(e => e.year === y);
    const isInvestEvent = investments.some(e => e.year === y);
    const isLifeEvent   = yearLifeEvents.length > 0;
    const isEvent = isAnchor || is401kEvent || isInvestEvent || isLifeEvent;
    let eventNote = null;
    if (isLifeEvent) {
      const notes = yearLifeEvents.map(e => `${e.type==="expense"?"💸":"📈"} ${e.label}: ${e.type==="expense"?"-":"+"}$${e.amount.toLocaleString()}`);
      eventNote = notes.join(" · ");
    } else if (isAnchor) {
      const entry = entries.find(e => e.year === y);
      if (entry?.type === "promotion") eventNote = `Promotion: +${entry.raisePct?.toFixed(1)||"?"}%`;
      else if (entry?.type === "jobchange") eventNote = `Job change: ${entry.role||""}${entry.company?" @ "+entry.company:""}`;
      else if (entry?.type === "start") eventNote = `Started: ${entry.role||""} ${entry.company?"@ "+entry.company:""}`;
    } else if (is401kEvent) {
      const ev = contrib401k.find(e => e.year === y);
      eventNote = `401k changed to ${ev?.pct||0}%`;
    } else if (isInvestEvent) {
      const ev = investments.find(e => e.year === y);
      eventNote = `Investments: ${ev?.pct||0}% of salary into ${ev?.ticker||"VOO"}`;
    }
    pts.push({
      year: y, salary: sal,
      k401: Math.round(k401Balance),
      k401Annual: Math.round(annualK401),
      investBalance: Math.round(investBalance),
      label: String(y), projected: !isAnchor,
      isEvent, eventNote,
    });
  }
  return pts;
}

function SalaryPanel({ salaryState, setSalaryState }) {
  const currentYear = new Date().getFullYear();

  const entries     = salaryState.entries;
  const rate        = salaryState.rate;
  const startYear   = salaryState.startYear;
  const setupForm   = salaryState.setupForm;
  const contrib401k = salaryState.contrib401k || [];
  const match401k   = salaryState.match401k   || { enabled: false, matchPct: 100, upToPct: 3 };
  const setMatch401k = v => setSalaryState(s => ({...s, match401k: typeof v==="function" ? v(s.match401k) : v}));

  const setEntries     = v => setSalaryState(s => ({...s, entries:     typeof v==="function" ? v(s.entries)   : v }));
  const setRate        = v => setSalaryState(s => ({...s, rate:        v}));
  const setStartYear   = v => setSalaryState(s => ({...s, startYear:   v}));
  const setSetupForm   = v => setSalaryState(s => ({...s, setupForm:   typeof v==="function" ? v(s.setupForm) : v}));
  const setContrib401k = v => setSalaryState(s => ({...s, contrib401k: typeof v==="function" ? v(s.contrib401k||[]) : v}));
  const mortgages    = salaryState.mortgages || [];
  const setMortgages   = v => setSalaryState(s => ({...s, mortgages:   typeof v==="function" ? v(s.mortgages||[])   : v}));
  const investments    = salaryState.investments  || [];
  const setInvestments = v => setSalaryState(s => ({...s, investments: typeof v==="function" ? v(s.investments||[]) : v}));
  const lifeEvents    = salaryState.lifeEvents  || [];
  const setLifeEvents = v => setSalaryState(s => ({...s, lifeEvents: typeof v==="function" ? v(s.lifeEvents||[]) : v}));

  // view state removed - all charts are line only
  const [chartRange, setChartRange] = useState(100); // % of data to show (100 = full range)
  const [activeYear, setActiveYear] = useState(null);
  const [eventForm,  setEventForm]  = useState({ type: "promotion", pct: "", salary: "", role: "", company: "", k401Pct: null, homePrice:"", downPct:"20", mortgageRate:"", mortgageTerm:30, investTicker:"", investPct:null, sellHome:false, useEquity:false, useInvestments:false, lifeLabel:"", lifeAmount:"", lifeType:"expense" });
  const [setupError, setSetupError] = useState("");

  const hasStart = entries.length > 0;
  const lastEntry = hasStart ? entries[entries.length - 1] : null;
  const firstEntry = hasStart ? entries[0] : null;
  // chartData derived after mortgageData (see below)

  // 401k balance at 65: accumulate annual contributions with 7% average market return
  const balance401kAt65 = (() => {
    if (!hasStart || !firstEntry?.startAge) return null;
    const retireYear = startYear + (65 - firstEntry.startAge);
    if (retireYear <= startYear) return null;
    let balance = 0;
    const annualReturn = 0.07;
    for (let y = startYear; y < retireYear; y++) {
      const c = [...contrib401k].reverse().find(c => c.year <= y);
      const empPct = c ? c.pct : 0;
      if (empPct === 0) { balance *= (1 + annualReturn); continue; }
      const sal = projectedSalaryAtYear(entries, rate, y);
      const myContrib = sal * empPct / 100;
      const matchContrib = (match401k.enabled)
        ? sal * Math.min(empPct, match401k.upToPct) / 100
        : 0;
      balance = (balance + myContrib + matchContrib) * (1 + annualReturn);
    }
    return balance;
  })();

  // Commit starting salary
  const commitStart = () => {
    const y = parseInt(setupForm.year);
    const s = parseFloat(setupForm.salary);
    if (isNaN(y) || isNaN(s) || s <= 0) { setSetupError("Enter a valid year and salary."); return; }
    setSetupError("");
    setStartYear(y);
    const startAge = parseInt(setupForm.age) || null;
    setEntries([{ year: y, salary: s, role: setupForm.role.trim() || "Starting role", company: setupForm.company.trim(), type: "start", startAge }]);
  };

  // Get the projected salary for a given year (used when opening a year row)
  const projForYear = (year) => projectedSalaryAtYear(entries, rate, year);

  // Commit an event (promotion or job change) for activeYear
  // Salary change is optional — user may only want to update 401k
  const commitEvent = () => {
    const proj = projForYear(activeYear);
    let newSal = null;
    if (eventForm.type === "promotion" && eventForm.pct !== "") {
      const pct = parseFloat(eventForm.pct);
      if (!isNaN(pct) && pct > 0) newSal = proj * (1 + pct / 100);
    } else if (eventForm.type === "jobchange" && eventForm.salary !== "") {
      const s = parseFloat(eventForm.salary);
      if (!isNaN(s) && s > 0) newSal = s;
    }
    if (newSal !== null) {
      const newEntry = {
        year: activeYear,
        salary: newSal,
        role: eventForm.role.trim() || (eventForm.type === "promotion" ? "Promoted" : "New Role"),
        company: eventForm.company.trim() || (lastEntry?.company || ""),
        type: eventForm.type,
        raisePct: eventForm.type === "promotion" ? parseFloat(eventForm.pct) : null,
      };
      setEntries(prev => {
        const filtered = prev.filter(e => e.year !== activeYear);
        return [...filtered, newEntry].sort((a, b) => a.year - b.year);
      });
    }
    // Save 401k change if user selected one
    if (eventForm.k401Pct !== null) {
      setContrib401k(prev => {
        const filtered = prev.filter(c => c.year !== activeYear);
        return [...filtered, { year: activeYear, pct: eventForm.k401Pct }].sort((a,b) => a.year - b.year);
      });
    }
    // Save investment if entered
    if (eventForm.investPct !== null && eventForm.investPct >= 0) {
      setInvestments(prev => {
        const filtered = prev.filter(i => i.year !== activeYear);
        if (eventForm.investPct === 0) return [...filtered, { year: activeYear, ticker: eventForm.investTicker.trim().toUpperCase() || "VOO", pct: 0 }].sort((a,b) => a.year - b.year);
        return [...filtered, { year: activeYear, ticker: eventForm.investTicker.trim().toUpperCase() || "VOO", pct: eventForm.investPct }].sort((a,b) => a.year - b.year);
      });
    }
    // Save mortgage if entered
    if (eventForm.homePrice && parseFloat(eventForm.homePrice) > 0 && eventForm.mortgageRate && parseFloat(eventForm.mortgageRate) > 0) {
      setMortgages(prev => {
        const filtered = prev.filter(m => m.year !== activeYear);
        return [...filtered, {
          year: activeYear,
          price: parseFloat(eventForm.homePrice),
          downPct: eventForm.downPct !== '' && !isNaN(parseFloat(eventForm.downPct)) ? parseFloat(eventForm.downPct) : 20,
          rate: parseFloat(eventForm.mortgageRate),
          termYears: eventForm.mortgageTerm,
        }].sort((a,b) => a.year - b.year);
      });
    }
    // Save life event if entered
    if (eventForm.lifeLabel.trim() && eventForm.lifeAmount && parseFloat(eventForm.lifeAmount) > 0) {
      setLifeEvents(prev => {
        const filtered = prev.filter(e => !(e.year === activeYear && e.label === eventForm.lifeLabel.trim()));
        return [...filtered, { year: activeYear, label: eventForm.lifeLabel.trim(), amount: parseFloat(eventForm.lifeAmount), type: eventForm.lifeType }].sort((a,b) => a.year - b.year);
      });
    }
    setActiveYear(null);
    setEventForm({ type: "promotion", pct: "", salary: "", role: "", company: "", k401Pct: null, homePrice:"", downPct:"20", mortgageRate:"", mortgageTerm:30, investTicker:"", investPct:null, sellHome:false, useEquity:false, useInvestments:false, lifeLabel:"", lifeAmount:"", lifeType:"expense" });
  };

  const removeEntry = (year) => {
    if (year === startYear) { setEntries([]); return; }
    setEntries(prev => prev.filter(e => e.year !== year));
  };

  const CDot = ({cx,cy,payload}) => payload.projected
    ? null
    : <circle cx={cx} cy={cy} r={5} fill={T.accent} stroke={T.bg0} strokeWidth={2}/>;
  const ADot = ({cx,cy,payload}) => payload.projected
    ? <circle cx={cx} cy={cy} r={4} fill={T.gold} stroke={T.bg0} strokeWidth={2}/>
    : <circle cx={cx} cy={cy} r={7} fill={T.accent} stroke={T.bg0} strokeWidth={2}/>;

  const axP = { tickLine:false, axisLine:false };
  const xT  = { fill:T.text1, fontSize:12, fontFamily:"DM Mono" };
  const yT  = { fill:T.text1, fontSize:12, fontFamily:"DM Mono" };


  // ── SETUP SCREEN ──────────────────────────────────────────
  if (!hasStart) {
    return (
      <BgPanel id="salary" scroll>
        <div style={{minHeight:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"3rem 2rem"}}>
          <div className="fu" style={{textAlign:"center",marginBottom:"2rem"}}>
            <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:32,fontWeight:800,color:"#fff",letterSpacing:"-0.03em",marginBottom:8}}>
              Your Roadmap<span style={{color:T.accent}}>.</span>
            </h1>
            <p style={{color:"rgba(255,255,255,0.45)",fontSize:13,letterSpacing:"0.04em"}}>Every great journey starts with a first step. Tell us where you are today.</p>
          </div>
          <Card className="fu fu2" style={{maxWidth:520,width:"100%"}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"1.25rem"}}>Your Starting Point</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
              <div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>START YEAR</div>
                <input type="number" placeholder={String(currentYear)} value={setupForm.year}
                  onChange={e=>setSetupForm(f=>({...f,year:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&commitStart()}/>
              </div>
              <div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>YOUR AGE</div>
                <input type="number" placeholder="28" value={setupForm.age||""}
                  onChange={e=>setSetupForm(f=>({...f,age:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&commitStart()}/>
              </div>
              <div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>STARTING SALARY ($)</div>
                <input type="number" placeholder="75000" value={setupForm.salary}
                  onChange={e=>setSetupForm(f=>({...f,salary:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&commitStart()}/>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              <div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>ROLE / TITLE</div>
                <input type="text" placeholder="Software Engineer" value={setupForm.role}
                  onChange={e=>setSetupForm(f=>({...f,role:e.target.value}))}/>
              </div>
              <div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>COMPANY</div>
                <input type="text" placeholder="Acme Corp" value={setupForm.company}
                  onChange={e=>setSetupForm(f=>({...f,company:e.target.value}))}/>
              </div>
            </div>
            {setupError && <div style={{fontSize:12,color:T.red,marginBottom:10}}>{setupError}</div>}
            <button onClick={commitStart} style={{
              width:"100%",padding:"11px",background:T.accent,border:"none",borderRadius:8,
              color:"#fff",fontSize:13,fontWeight:500,letterSpacing:"0.04em",cursor:"pointer",
            }}>Build My Roadmap →</button>
          </Card>
        </div>
      </BgPanel>
    );
  }

  // ── MAIN TIMELINE VIEW ────────────────────────────────────
  const startAge = firstEntry?.startAge || null;
  const maxYear = startAge ? startYear + Math.max(0, 70 - startAge) : startYear + 39;
  const years = Array.from({length: maxYear - startYear + 1}, (_,i) => startYear + i);
  const mortgageData = buildMortgageData(mortgages, startYear, maxYear, lifeEvents).map(pt => {
    const age = startAge ? startAge + (pt.year - startYear) : null;
    const yearLife = lifeEvents.filter(e => e.year === pt.year);
    const mortNotes = yearLife.filter(e => e.type === "extra-mortgage")
      .map(e => `🏠 ${e.label}: +$${e.amount.toLocaleString()} extra principal`);
    const otherNotes = yearLife.filter(e => e.type !== "extra-mortgage")
      .map(e => `${e.type==="expense"?"💸":"📈"} ${e.label}: ${e.type==="expense"?"-":"+"}$${e.amount.toLocaleString()}`);
    const allNotes = [...mortNotes, ...otherNotes];
    const eventNote = allNotes.length > 0 ? allNotes.join(" · ") : null;
    const isEvent = pt.isEvent || yearLife.length > 0;
    return { ...pt, age, eventNote, isEvent };
  });
  const chartDataRaw = hasStart ? buildTimelineChartData(entries, rate, startYear, contrib401k, match401k, investments, lifeEvents) : [];
  const chartData = chartDataRaw.map(pt => {
    const mSnap = mortgageData.find(d => d.year === pt.year);
    const equity = mSnap && !mSnap.noLoan ? (mSnap.equity || 0) : 0;
    const age = startAge ? startAge + (pt.year - startYear) : null;
    return { ...pt, homeEquity: equity, netWorth: pt.k401 + pt.investBalance + equity, age };
  });
  // Slice datasets to the selected range for both charts
  const sliceEnd = Math.max(1, Math.round(chartData.length * chartRange / 100));
  const chartDataSliced = chartData.slice(0, sliceEnd);
  const mortgageDataSliced = mortgageData.slice(0, sliceEnd);
  // Age range labels for slider display
  const minAgeLabel = chartData[0]?.age ?? (startAge ?? startYear);
  const maxAgeLabel = chartData[sliceEnd-1]?.age ?? (startAge ? startAge + sliceEnd - 1 : startYear + sliceEnd - 1);

  // Background image url for the salary/roadmap panel
  const bgUrl = BG.salary;
  return (
    <div style={{
      position:"absolute", inset:0,
      backgroundImage:`url(${bgUrl})`,
      backgroundSize:"cover", backgroundPosition:"center",
      display:"flex", flexDirection:"column",
      overflow:"hidden",
    }}>
      {/* Dark overlay */}
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.82)",pointerEvents:"none",zIndex:0}}/>
      {/* Frozen top section */}
      <div style={{position:"relative",zIndex:1,flexShrink:0,padding:"0.6rem 2rem 0.5rem",overflowY:"visible"}}>

        {/* Reset button — minimal, top right */}
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"0.4rem"}}>
          <button onClick={()=>setEntries([])} style={{
            fontSize:11,color:T.text2,background:"transparent",border:`1px solid ${T.border}`,
            borderRadius:6,padding:"4px 10px",cursor:"pointer",
          }}>↺ Reset</button>
        </div>

        {/* Roadmap Timeline Visual */}
        {hasStart && (
          <div style={{background:"rgba(0,0,0,0.25)",borderRadius:10,marginBottom:"0.6rem",border:"1px solid rgba(255,255,255,0.07)"}}>
            <RoadmapTimeline
              entries={entries} mortgages={mortgages}
              contrib401k={contrib401k} investments={investments}
              lifeEvents={lifeEvents} chartData={chartData}
              mortgageData={mortgageData}
              startAge={startAge} startYear={startYear}/>
          </div>
        )}

        {/* Charts side by side */}
        <div className="fu fu4" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"0.8rem"}}>

          {/* 401k + Investments chart */}
          <div style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"0.75rem",overflow:"visible"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.6rem"}}>
              <div>
                <span style={{fontSize:15,color:"rgba(255,255,255,0.6)",letterSpacing:"0.04em",textTransform:"uppercase"}}>401k, Investments & Net Worth</span>

              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <span style={{display:"flex",alignItems:"center",gap:6,fontSize:16,color:T.text1}}>
                  <span style={{width:18,height:3,background:T.green,display:"inline-block",borderRadius:1}}/>401k
                </span>
                <span style={{display:"flex",alignItems:"center",gap:6,fontSize:16,color:T.text1}}>
                  <span style={{width:18,height:3,background:T.gold,display:"inline-block",borderRadius:1}}/>Investments
                </span>
                <span style={{display:"flex",alignItems:"center",gap:6,fontSize:16,color:T.text1}}>
                  <span style={{width:18,height:3,background:"#a78bfa",display:"inline-block",borderRadius:1}}/>Net Worth
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={735}>
              <LineChart data={chartDataSliced}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={true} horizontal={true}/>
                <XAxis dataKey="age" tick={xT} {...axP} interval={4}
                  tickFormatter={v => v != null ? `${v}` : ""}
                  label={{value:"Age",position:"insideBottom",offset:-2,fill:T.text2,fontSize:12}}/>
                <YAxis tickFormatter={fmtK} tick={yT} {...axP} width={86} tickCount={10}/>
                <Tooltip content={<SalTip/>}/>
                <Line type="monotone" dataKey="netWorth" stroke="#a78bfa" strokeWidth={2} strokeDasharray="6 3"
                  dot={({cx,cy,payload})=>payload.isEvent?<circle key={cx} cx={cx} cy={cy} r={5} fill="#a78bfa" stroke={T.bg0} strokeWidth={2}/>:<g key={cx}/>}
                  activeDot={{r:7,fill:"#a78bfa",stroke:T.bg0,strokeWidth:2}}/>
                <Line type="monotone" dataKey="investBalance" stroke={T.gold} strokeWidth={2.5}
                  dot={({cx,cy,payload})=>payload.isEvent?<circle key={cx} cx={cx} cy={cy} r={5} fill={T.gold} stroke={T.bg0} strokeWidth={2}/>:<g key={cx}/>}
                  activeDot={{r:7,fill:T.gold,stroke:T.bg0,strokeWidth:2}}/>
                <Line type="monotone" dataKey="k401" stroke={T.green} strokeWidth={2.5}
                  dot={({cx,cy,payload})=>payload.isEvent?<circle key={cx} cx={cx} cy={cy} r={5} fill={T.green} stroke={T.bg0} strokeWidth={2}/>:<g key={cx}/>}
                  activeDot={{r:7,fill:T.green,stroke:T.bg0,strokeWidth:2}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Mortgage chart */}
          <div style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"0.75rem",overflow:"visible"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.6rem"}}>
              <div>
                <span style={{fontSize:15,color:"rgba(255,255,255,0.6)",letterSpacing:"0.04em",textTransform:"uppercase"}}>Home Ownership</span>
                {mortgages.length > 0 ? <span style={{marginLeft:8,fontSize:10,color:T.accent,background:T.accentDim,padding:"2px 7px",borderRadius:3}}>{mortgages[mortgages.length-1]?.rate}% rate</span> : null}
              </div>
              {mortgages.length > 0 ? (
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{display:"flex",alignItems:"center",gap:6,fontSize:16,color:T.text1}}><span style={{width:18,height:3,background:T.gold,borderRadius:1,display:"inline-block"}}/>Balance</span>
                  <span style={{display:"flex",alignItems:"center",gap:6,fontSize:16,color:T.text1}}><span style={{width:18,height:3,background:T.red,borderRadius:1,display:"inline-block"}}/>Interest owed</span>
                  <span style={{display:"flex",alignItems:"center",gap:6,fontSize:16,color:T.text1}}><span style={{width:18,height:3,background:"#a78bfa",borderRadius:1,display:"inline-block"}}/>Market value</span>
                  <span style={{display:"flex",alignItems:"center",gap:6,fontSize:16,color:T.text1}}><span style={{width:18,height:3,background:T.green,borderRadius:1,display:"inline-block"}}/>Equity</span>
                </div>
              ) : null}
            </div>
            {mortgages.length === 0 ? (
              <div style={{height:735,display:"flex",alignItems:"center",justifyContent:"center",color:T.text2,fontSize:12,letterSpacing:"0.06em",border:"1px dashed rgba(255,255,255,0.08)",borderRadius:8,flexDirection:"column",gap:8}}>
                <span style={{fontSize:18}}>🏠</span>
                <span>ADD A HOME PURCHASE IN THE TIMELINE</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={735}>
                <LineChart data={mortgageDataSliced}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={true} horizontal={true}/>
                  <XAxis dataKey="age" tick={xT} {...axP} interval={4}
                    tickFormatter={v => v != null ? `${v}` : ""}
                    label={{value:"Age",position:"insideBottom",offset:-2,fill:T.text2,fontSize:12}}/>
                  <YAxis tickFormatter={fmtK} tick={yT} {...axP} width={86} tickCount={10}/>
                  <Tooltip content={<MortgageTip/>}/>
                  <Line type="monotone" dataKey="balance" stroke={T.gold} strokeWidth={2}
                    dot={({cx,cy,payload})=>payload.isEvent?<circle key={cx} cx={cx} cy={cy} r={5} fill={T.gold} stroke={T.bg0} strokeWidth={2}/>:<g key={cx}/>}
                    activeDot={{r:7,fill:T.gold,stroke:T.bg0,strokeWidth:2}}/>
                  <Line type="monotone" dataKey="interestOwed" stroke={T.red} strokeWidth={2}
                    dot={({cx,cy,payload})=>payload.isEvent?<circle key={cx} cx={cx} cy={cy} r={5} fill={T.red} stroke={T.bg0} strokeWidth={2}/>:<g key={cx}/>}
                    activeDot={{r:7,fill:T.red,stroke:T.bg0,strokeWidth:2}}/>
                  <Line type="monotone" dataKey="marketValue" stroke="#a78bfa" strokeWidth={2}
                    dot={({cx,cy,payload})=>payload.isEvent?<circle key={cx} cx={cx} cy={cy} r={5} fill="#a78bfa" stroke={T.bg0} strokeWidth={2}/>:<g key={cx}/>}
                    activeDot={{r:7,fill:"#a78bfa",stroke:T.bg0,strokeWidth:2}}/>
                  <Line type="monotone" dataKey="equity" stroke={T.green} strokeWidth={2}
                    dot={({cx,cy,payload})=>payload.isEvent?<circle key={cx} cx={cx} cy={cy} r={5} fill={T.green} stroke={T.bg0} strokeWidth={2}/>:<g key={cx}/>}
                    activeDot={{r:7,fill:T.green,stroke:T.bg0,strokeWidth:2}}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Age range slider — shared for both charts */}
        {hasStart && chartData.length > 1 && (
          <div style={{padding:"6px 4px 4px",display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:11,color:T.text2,whiteSpace:"nowrap",flexShrink:0}}>
              Age {minAgeLabel}
            </span>
            <input type="range" min={10} max={100} step={5} value={chartRange}
              onChange={e=>setChartRange(+e.target.value)}
              style={{flex:1,accentColor:T.accent,height:4,cursor:"pointer"}}/>
            <span style={{fontSize:11,color:T.text2,whiteSpace:"nowrap",flexShrink:0}}>
              Age {maxAgeLabel}
            </span>
            <span style={{fontSize:11,color:T.accent,background:T.accentDim,padding:"3px 10px",borderRadius:5,whiteSpace:"nowrap",flexShrink:0}}>
              {chartRange}% range
            </span>
          </div>
        )}

      </div>

      {/* Scrollable timeline - flex:1 works here because parent is position:absolute flex-column */}
      <div style={{position:"relative",zIndex:1,flex:1,overflowY:"auto",padding:"0 2rem 2rem"}}>
        <Card className="fu fu5" style={{padding:0}}>
          {/* Invitation banner */}
          <div style={{padding:"1.25rem 1.5rem",borderBottom:"1px solid rgba(255,255,255,0.08)",background:"linear-gradient(135deg,rgba(129,140,248,0.08),rgba(251,191,36,0.05))"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <span style={{fontSize:18}}>🗺️</span>
                  <span style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:T.text0,letterSpacing:"-0.02em"}}>Build Your Financial Roadmap</span>
                </div>
                <p style={{fontSize:12,color:"rgba(255,255,255,0.5)",lineHeight:1.6,maxWidth:560}}>
                  Every great journey starts with a plan. Click the <strong style={{color:T.accent}}>+ Add Event</strong> button on any year below to record a promotion, job change, home purchase, 401k contribution, or investment. Your charts update instantly as you build out your future.
                </p>
                <div style={{display:"flex",gap:16,marginTop:10}}>
                  {[["🏅","Promotions & raises"],["🏢","Job changes"],["🏠","Home purchases"],["💼","401k & investments"],["🎯","Life events"]].map(([icon,lbl])=>(
                    <span key={lbl} style={{fontSize:11,color:"rgba(255,255,255,0.4)",display:"flex",alignItems:"center",gap:5}}>
                      <span>{icon}</span>{lbl}
                    </span>
                  ))}
                </div>
              </div>
              <span style={{fontSize:11,color:T.gold,background:T.goldDim,padding:"4px 12px",borderRadius:6,whiteSpace:"nowrap",flexShrink:0}}>+{rate}% / yr baseline</span>
            </div>
          </div>
          {/* Column headers */}
          <div style={{display:"flex",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,0.06)",background:"rgba(255,255,255,0.02)",justifyContent:"center"}}>
            <div style={{width:72,flexShrink:0,padding:"7px 0 7px 20px",fontSize:9,color:T.text2,letterSpacing:"0.1em",textTransform:"uppercase"}}>Year</div>
            <div style={{width:1,height:28,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
            {firstEntry?.startAge && <>
              <div style={{width:56,flexShrink:0,padding:"7px 10px",fontSize:9,color:T.text2,letterSpacing:"0.1em",textTransform:"uppercase",textAlign:"center"}}>Age</div>
              <div style={{width:1,height:28,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
            </>}
            <div style={{width:120,flexShrink:0,padding:"7px 16px",fontSize:9,color:T.text2,letterSpacing:"0.1em",textTransform:"uppercase",textAlign:"right"}}>Salary</div>
            <div style={{width:1,height:28,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
            <div style={{width:160,flexShrink:0,padding:"7px 16px",fontSize:9,color:T.text2,letterSpacing:"0.1em",textTransform:"uppercase"}}>Event / Role</div>
            <div style={{width:1,height:28,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
            <div style={{width:130,flexShrink:0,padding:"7px 16px",fontSize:9,color:T.text2,letterSpacing:"0.1em",textTransform:"uppercase",textAlign:"right"}}>401k / yr</div>
            <div style={{width:1,height:28,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
            <div style={{width:160,flexShrink:0,padding:"7px 16px",fontSize:9,color:T.text2,letterSpacing:"0.1em",textTransform:"uppercase"}}>Home / Mortgage</div>
            <div style={{width:1,height:28,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
            <div style={{width:150,flexShrink:0,padding:"7px 16px",fontSize:9,color:T.text2,letterSpacing:"0.1em",textTransform:"uppercase"}}>Investments</div>
            <div style={{width:1,height:28,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
            <div style={{width:190,flexShrink:0,padding:"7px 16px",fontSize:9,color:T.text2,letterSpacing:"0.1em",textTransform:"uppercase"}}>Life Events</div>
            <div style={{flex:1}}/>
          </div>

          <div style={{padding:"0.5rem 0"}}>
            {years.map(year => {
              const anchor = entries.find(e => e.year === year);
              const proj   = projForYear(year);
              const isOpen = activeYear === year;
              const isFirst = year === startYear;
              const prevAnchor = [...entries].reverse().find(e => e.year < year);
              const prevSal = prevAnchor ? projectedSalaryAtYear(entries, rate, year - 1) : null;
              const anchorChange = anchor?.raisePct != null
                ? anchor.raisePct
                : (anchor && prevSal ? (anchor.salary - prevSal) / prevSal * 100 : null);
              const typeColor = anchor?.type === "jobchange" ? T.green : T.accent;
              const typeLabel = anchor?.type === "start" ? "START" : anchor?.type === "promotion" ? "PROMO" : anchor?.type === "jobchange" ? "NEW JOB" : null;

              return (
                <div key={year}>
                  {/* Year row */}
                  <div
                    onClick={() => { setActiveYear(isOpen ? null : year); setEventForm(f => {
                        const c = [...contrib401k].reverse().find(c => c.year <= year);
                        const existInvest = [...investments].reverse().find(i => i.year <= year);
                        return {type:"promotion",pct:"",salary:String(Math.round(proj||0)),role:"",company:anchor?.company||lastEntry?.company||"",k401Pct:c?c.pct:0, homePrice:"", downPct:"20", mortgageRate:"", mortgageTerm:30, investTicker: existInvest?.ticker||"", investPct: existInvest?.pct ?? null, sellHome:false, useEquity:false, useInvestments:false, lifeLabel:"", lifeAmount:"", lifeType:"expense"};
                      }); }}
                    style={{
                      display:"flex", alignItems:"center", gap:0,
                      padding:"0 0", cursor:"pointer",
                      borderBottom:"1px solid rgba(255,255,255,0.04)",
                      background: isOpen ? "rgba(129,140,248,0.08)" : anchor ? "rgba(255,255,255,0.03)" : "transparent",
                      transition:"background 0.1s",
                    }}
                    onMouseEnter={e=>{ if(!isOpen) e.currentTarget.style.background="rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e=>{ if(!isOpen) e.currentTarget.style.background= anchor ? "rgba(255,255,255,0.03)" : "transparent"; }}
                  >
                    {/* Year label + indicator */}
                    <div style={{width:72,flexShrink:0,padding:"12px 0 12px 20px",display:"flex",alignItems:"center",gap:8}}>
                      <div style={{
                        width:8, height:8, borderRadius:"50%", flexShrink:0,
                        background: isFirst ? T.gold : anchor ? typeColor : T.border,
                        boxShadow: (isFirst||anchor) ? `0 0 6px ${isFirst?T.gold:typeColor}88` : "none",
                      }}/>
                      <span style={{fontSize:12,fontWeight: (isFirst||anchor)?600:400, color: (isFirst||anchor)?T.text0:T.text2, fontFamily:"'Syne',sans-serif"}}>{year}</span>
                    </div>

                    {/* Vertical line */}
                    <div style={{width:1,height:44,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>

                    {/* Age */}
                    {firstEntry?.startAge && (
                      <>
                        <div style={{width:56,flexShrink:0,padding:"0 10px",textAlign:"center"}}>
                          <span style={{fontSize:12,color:T.text2,fontFamily:"'DM Mono',monospace"}}>
                            {firstEntry.startAge + (year - startYear)}
                          </span>
                        </div>
                        <div style={{width:1,height:44,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
                      </>
                    )}

                    {/* Salary */}
                    <div style={{width:120,flexShrink:0,padding:"0 16px",textAlign:"right"}}>
                      <span style={{fontSize:13,fontWeight:500,color: anchor ? "#fff" : T.text2, fontFamily:"'Syne',sans-serif"}}>
                        {proj ? fmtK(proj) : "—"}
                      </span>
                    </div>

                    {/* Vertical line */}
                    <div style={{width:1,height:44,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>

                    {/* Event badge / change */}
                    <div style={{width:160,flexShrink:0,padding:"0 16px",display:"flex",alignItems:"center",gap:8,overflow:"hidden"}}>
                      {typeLabel && (
                        <span style={{fontSize:10,color:isFirst?T.gold:typeColor,background:isFirst?T.goldDim:typeColor+"22",padding:"3px 8px",borderRadius:4,letterSpacing:"0.08em",fontWeight:600,flexShrink:0}}>
                          {typeLabel}
                        </span>
                      )}
                      {anchor && <span style={{fontSize:12,color:T.text1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{anchor.role}{anchor.company ? ` · ${anchor.company}` : ""}</span>}
                      {anchorChange !== null && !typeLabel && (
                        <span style={{fontSize:11,color:anchorChange>=0?T.green:T.red,background:anchorChange>=0?T.greenDim:T.redDim,padding:"2px 7px",borderRadius:4,flexShrink:0}}>
                          {anchorChange>=0?"+":""}{anchorChange.toFixed(1)}%
                        </span>
                      )}
                    </div>

                    {/* 401k column */}
                    <div style={{width:1,height:44,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
                    <div style={{width:130,flexShrink:0,padding:"0 16px",textAlign:"right"}}>
                      {(() => {
                        const c = [...contrib401k].reverse().find(c => c.year <= year);
                        const pct = c ? c.pct : 0;
                        const myAmt = proj ? proj * pct / 100 : 0;
                        const matchAmt = (match401k.enabled && pct > 0 && proj)
                          ? proj * Math.min(pct, match401k.upToPct) / 100 * match401k.matchPct / 100 : 0;
                        const total = myAmt + matchAmt;
                        const isNew401k = contrib401k.some(c => c.year === year);
                        return pct > 0 ? (
                          <div>
                            <div style={{fontSize:12,color:isNew401k?T.green:T.text1,fontWeight:isNew401k?600:400}}>
                              {fmtK(total)}
                              {matchAmt > 0 && <span style={{fontSize:9,color:T.green,marginLeft:4}}>+match</span>}
                            </div>
                            <div style={{fontSize:10,color:T.text2}}>{pct}% {matchAmt>0?`+${match401k.matchPct}% match`:""}</div>
                          </div>
                        ) : <span style={{fontSize:12,color:T.text2}}>—</span>;
                      })()}
                    </div>
                    {/* Mortgage column */}
                    <div style={{width:1,height:44,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
                    <div style={{width:160,flexShrink:0,padding:"0 16px"}}>
                      {(() => {
                        const m = mortgages.find(m => m.year === year);
                        const active = [...mortgages].reverse().find(m => m.year <= year);
                        if (m) {
                          const loan = m.price * (1 - m.downPct/100);
                          return (
                            <div>
                              <div style={{fontSize:11,color:T.accent,fontWeight:600}}>🏠 {fmtK(m.price)}</div>
                              <div style={{fontSize:10,color:T.text2}}>{m.downPct}% down · {m.rate}% · {m.termYears}yr</div>
                            </div>
                          );
                        } else if (active) {
                          const snap = mortgageData.find(d => d.year === year);
                          if (snap && !snap.noLoan) return snap.paidOff
                            ? <span style={{fontSize:11,color:T.green}}>🎉 Paid off</span>
                            : <div>
                                <div style={{fontSize:11,color:T.text1}}>Bal: {fmtK(snap.balance)}</div>
                                <div style={{fontSize:10,color:T.text2}}>Int. owed: {fmtK(snap.interestOwed)}</div>
                              </div>;
                        }
                        return <span style={{fontSize:12,color:T.text2}}>—</span>;
                      })()}
                    </div>
                    {/* Investments column */}
                    <div style={{width:1,height:44,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
                    <div style={{width:150,flexShrink:0,padding:"0 16px"}}>
                      {(() => {
                        const inv = [...investments].reverse().find(i => i.year <= year);
                        const isNew = investments.some(i => i.year === year);
                        if (!inv) return <span style={{fontSize:12,color:T.text2}}>—</span>;
                        const snap = chartData.find(d => d.year === year);
                        return (
                          <div>
                            <div style={{fontSize:11,color:isNew?T.gold:T.text1,fontWeight:isNew?600:400}}>
                              {snap ? fmtK(snap.investBalance) : "—"}
                            </div>
                            <div style={{fontSize:10,color:T.text2}}>{inv.ticker} · {inv.pct}% of salary</div>
                          </div>
                        );
                      })()}
                    </div>
                    {/* Life Events column */}
                    <div style={{width:1,height:44,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
                    <div style={{width:190,flexShrink:0,padding:"0 16px"}}>
                      {(() => {
                        const yearEvents = lifeEvents.filter(e => e.year === year);
                        if (!yearEvents.length) return <span style={{fontSize:12,color:T.text2}}>—</span>;
                        const typeIcon = { expense:"💸", "extra-mortgage":"🏠", "extra-invest":"📈" };
                        const typeColor = { expense:T.red, "extra-mortgage":T.accent, "extra-invest":T.gold };
                        return (
                          <div style={{display:"flex",flexDirection:"column",gap:2}}>
                            {yearEvents.slice(0,2).map((ev,i) => (
                              <div key={i} style={{fontSize:10,color:typeColor[ev.type]||T.text1,display:"flex",alignItems:"center",gap:4}}>
                                <span>{typeIcon[ev.type]||"📌"}</span>
                                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:110}}>{ev.label}</span>
                                <span style={{flexShrink:0,fontWeight:600}}>{ev.type==="expense"?"-":"+"}${Math.round(ev.amount).toLocaleString()}</span>
                              </div>
                            ))}
                            {yearEvents.length > 2 && <div style={{fontSize:9,color:T.text2}}>+{yearEvents.length-2} more</div>}
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{flex:1}}/>

                    {/* Actions */}
                    <div style={{padding:"0 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      {anchor && !isFirst && (
                        <button onClick={ev=>{ev.stopPropagation();removeEntry(year);}} style={{
                          background:"transparent",border:`1px solid ${T.border}`,borderRadius:4,
                          color:T.text2,fontSize:11,padding:"2px 7px",transition:"all 0.15s",
                        }}
                          onMouseOver={e=>{e.currentTarget.style.borderColor=T.red;e.currentTarget.style.color=T.red;}}
                          onMouseOut={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text2;}}>
                          ✕
                        </button>
                      )}
                      {isOpen ? (
                        <span style={{
                          fontSize:13, fontWeight:700, color:T.accent,
                          background:T.accentDim, border:`1px solid ${T.accent}`,
                          borderRadius:6, padding:"4px 10px", transition:"all 0.15s",
                          fontFamily:"'Syne',sans-serif", letterSpacing:"-0.01em",
                        }}>−</span>
                      ) : (
                        <span className={anchor ? "" : "pulse-add"} style={{
                          fontSize:12, fontWeight:700, color:"#fff",
                          background: anchor ? "rgba(129,140,248,0.25)" : T.accent,
                          border:`1px solid ${T.accent}`,
                          borderRadius:6, padding:"4px 10px", transition:"background 0.2s",
                          fontFamily:"'Syne',sans-serif", letterSpacing:"0.02em",
                          whiteSpace:"nowrap",
                        }}>+ Add Event</span>
                      )}
                    </div>
                  </div>

                  {/* Expanded event form */}
                  {isOpen && (
                    <div style={{
                      background:"rgba(129,140,248,0.06)",
                      borderBottom:"1px solid rgba(129,140,248,0.2)",
                      padding:"16px 20px 20px",
                    }}>
                      {/* Pre-filled projected salary callout — hidden on start year */}
                      {!isFirst && <div style={{fontSize:12,color:T.text1,marginBottom:14,padding:"8px 12px",background:"rgba(255,255,255,0.04)",borderRadius:6,borderLeft:`3px solid ${T.gold}`}}>
                        Projected salary entering {year} at {rate}% annual raises:
                        <span style={{color:T.gold,fontWeight:600,marginLeft:8,fontFamily:"'Syne',sans-serif"}}>{fmt(proj)}</span>
                      </div>}

                      {/* Promotion or Job Change toggle — hidden on start year */}
                      {!isFirst && <div style={{display:"flex",gap:8,marginBottom:14}}>
                        {[["promotion","🏅 Promotion"],["jobchange","🏢 Job Change"]].map(([val,lbl])=>{
                          const on = eventForm.type===val;
                          return (
                            <button key={val} onClick={()=>setEventForm(f=>({...f,type:val}))} style={{
                              flex:1,padding:"10px",fontSize:12,borderRadius:8,
                              border:`1px solid ${on?(val==="promotion"?T.accent:T.green):T.border}`,
                              background:on?(val==="promotion"?T.accentDim:T.greenDim):"transparent",
                              color:on?(val==="promotion"?T.accent:T.green):T.text2,
                              cursor:"pointer",transition:"all 0.15s",
                            }}>{lbl}</button>
                          );
                        })}
                      </div>}

                      {!isFirst && (eventForm.type === "promotion" ? (
                        <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:10,marginBottom:12}}>
                          <div>
                            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>RAISE %</div>
                            <input type="number" placeholder="10" value={eventForm.pct}
                              onChange={e=>setEventForm(f=>({...f,pct:e.target.value}))}
                              onKeyDown={e=>e.key==="Enter"&&commitEvent()}/>
                          </div>
                          <div>
                            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>NEW TITLE</div>
                            <input type="text" placeholder="Senior Engineer" value={eventForm.role}
                              onChange={e=>setEventForm(f=>({...f,role:e.target.value}))}
                              onKeyDown={e=>e.key==="Enter"&&commitEvent()}/>
                          </div>
                          {eventForm.pct && !isNaN(parseFloat(eventForm.pct)) && proj && (
                            <div style={{gridColumn:"1/-1",fontSize:12,color:T.green,padding:"8px 12px",background:T.greenDim,borderRadius:6}}>
                              New salary: <strong>{fmt(proj * (1 + parseFloat(eventForm.pct)/100))}</strong>
                              <span style={{color:T.text1,marginLeft:8}}>({eventForm.pct}% raise on {fmt(proj)})</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
                          <div>
                            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>NEW SALARY ($)</div>
                            <input type="number" placeholder={String(Math.round(proj||0))} value={eventForm.salary}
                              onChange={e=>setEventForm(f=>({...f,salary:e.target.value}))}
                              onKeyDown={e=>e.key==="Enter"&&commitEvent()}/>
                          </div>
                          <div>
                            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>NEW ROLE</div>
                            <input type="text" placeholder="Staff Engineer" value={eventForm.role}
                              onChange={e=>setEventForm(f=>({...f,role:e.target.value}))}
                              onKeyDown={e=>e.key==="Enter"&&commitEvent()}/>
                          </div>
                          <div>
                            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>NEW COMPANY</div>
                            <input type="text" placeholder="New Corp" value={eventForm.company}
                              onChange={e=>setEventForm(f=>({...f,company:e.target.value}))}
                              onKeyDown={e=>e.key==="Enter"&&commitEvent()}/>
                          </div>
                        </div>
                      ))}

                      {/* 401k section */}
                      {(() => {
                        const cur401k = [...contrib401k].reverse().find(c => c.year <= year);
                        const curPct = cur401k ? cur401k.pct : 0;
                        return (
                          <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid rgba(255,255,255,0.08)`}}>
                            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>
                              💼 401k Contribution
                              {curPct > 0 && <span style={{color:T.text2,fontWeight:400,marginLeft:8,textTransform:"none",letterSpacing:0}}>currently {curPct}%</span>}
                            </div>
                            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                              {[0,1,2,3,4,5,6,7,8,9,10,12,15].map(pct => {
                                const selected = eventForm.k401Pct !== null ? eventForm.k401Pct : curPct;
                                const on = selected === pct;
                                const isZero = pct === 0;
                                return (
                                  <button key={pct} onClick={() => setEventForm(f=>({...f, k401Pct: pct}))} style={{
                                    padding:"8px 14px", fontSize:12, borderRadius:6, cursor:"pointer",
                                    border:`1px solid ${on ? (isZero ? T.red : T.green) : T.border}`,
                                    background: on ? (isZero ? T.redDim : T.greenDim) : "transparent",
                                    color: on ? (isZero ? T.red : T.green) : T.text2,
                                    transition:"all 0.12s",
                                  }}>{pct === 0 ? "None" : `${pct}%`}</button>
                                );
                              })}
                            </div>
                            {proj > 0 && (() => {
                              const activePct = eventForm.k401Pct !== null ? eventForm.k401Pct : curPct;
                              const myAmt = proj * activePct / 100;
                              const matchAmt = (match401k.enabled && activePct > 0)
                                ? proj * Math.min(activePct, match401k.upToPct) / 100 * match401k.matchPct / 100
                                : 0;
                              return activePct > 0 ? (
                                <div style={{marginTop:10,fontSize:12,color:T.green,padding:"10px 12px",background:T.greenDim,borderRadius:6}}>
                                  <div>You contribute: <strong>{fmtK(myAmt)}</strong> / yr ({activePct}% of {fmtK(proj)})</div>
                                  {matchAmt > 0 && <div style={{color:"#86efac",marginTop:3}}>Employer match: <strong>+{fmtK(matchAmt)}</strong> / yr → Total: <strong>{fmtK(myAmt+matchAmt)}</strong></div>}
                                </div>
                              ) : null;
                            })()}

                            {/* Company match settings */}
                            <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid rgba(255,255,255,0.06)`}}>
                              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                                <button onClick={()=>setMatch401k(m=>({...m,enabled:!m.enabled}))} style={{
                                  width:36,height:20,borderRadius:10,border:"none",cursor:"pointer",
                                  background:match401k.enabled?T.green:T.border,
                                  position:"relative",transition:"background 0.2s",flexShrink:0,
                                }}>
                                  <span style={{
                                    position:"absolute",top:2,left:match401k.enabled?18:2,
                                    width:16,height:16,borderRadius:"50%",background:"#fff",
                                    transition:"left 0.2s",
                                  }}/>
                                </button>
                                <span style={{fontSize:12,color:match401k.enabled?T.text0:T.text2}}>Employer match</span>
                              </div>
                              {match401k.enabled && (
                                <div>
                                  <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:6,letterSpacing:"0.08em"}}>EMPLOYER MATCHES UP TO % OF YOUR SALARY</div>
                                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                                    {[1,2,3,4,5,6,7,8,9,10].map(p=>{
                                      const on = match401k.upToPct===p;
                                      return <button key={p} onClick={()=>setMatch401k(m=>({...m,upToPct:p}))} style={{
                                        padding:"7px 13px",fontSize:12,borderRadius:6,cursor:"pointer",
                                        border:`1px solid ${on?T.green:T.border}`,
                                        background:on?T.greenDim:"transparent",
                                        color:on?T.green:T.text2,transition:"all 0.12s",
                                      }}>{p}%</button>;
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Investments section */}
                      {(() => {
                        const curInv = [...investments].reverse().find(i => i.year <= year);
                        const curPctInv = curInv ? curInv.pct : 0;
                        const selectedPct = eventForm.investPct !== null ? eventForm.investPct : curPctInv;
                        return (
                          <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid rgba(255,255,255,0.08)`}}>
                            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>
                              📈 Annual Investments
                              {curPctInv > 0 && <span style={{color:T.text2,fontWeight:400,marginLeft:8,textTransform:"none",letterSpacing:0}}>currently {curPctInv}%</span>}
                            </div>
                            <div style={{marginBottom:8}}>
                              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>TICKER (e.g. VOO)</div>
                              <input type="text" placeholder="VOO" value={eventForm.investTicker}
                                onChange={e=>setEventForm(f=>({...f,investTicker:e.target.value.toUpperCase()}))}
                                style={{maxWidth:120}}/>
                            </div>
                            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:6,letterSpacing:"0.08em"}}>% OF SALARY TO INVEST</div>
                            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                              {[0,1,2,3,4,5,6,7,8,9,10,12,15].map(pct => {
                                const on = selectedPct === pct;
                                const isZero = pct === 0;
                                return (
                                  <button key={pct} onClick={()=>setEventForm(f=>({...f,investPct:pct}))} style={{
                                    padding:"8px 14px",fontSize:12,borderRadius:6,cursor:"pointer",
                                    border:`1px solid ${on?(isZero?T.red:T.gold):T.border}`,
                                    background:on?(isZero?T.redDim:T.goldDim):"transparent",
                                    color:on?(isZero?T.red:T.gold):T.text2,
                                    transition:"all 0.12s",
                                  }}>{pct===0?"None":`${pct}%`}</button>
                                );
                              })}
                            </div>
                            {proj > 0 && selectedPct > 0 && (() => {
                              const annualAmt = proj * selectedPct / 100;
                              const snap = chartData.find(d => d.year === year);
                              return (
                                <div style={{marginTop:10,fontSize:12,color:T.gold,padding:"10px 12px",background:T.goldDim,borderRadius:6}}>
                                  <div>Investing: <strong>{fmtK(annualAmt)}</strong>/yr ({selectedPct}% of {fmtK(proj)}) into {eventForm.investTicker||"VOO"} · 7% growth</div>
                                  {snap && snap.investBalance > 0 && <div style={{color:T.text1,marginTop:3}}>Projected balance this year: <strong style={{color:T.gold}}>{fmtK(snap.investBalance)}</strong></div>}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}

                      {/* Home purchase section */}
                      {(() => {
                        const existingMortgage = mortgages.find(m => m.year === year);
                        return (
                          <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid rgba(255,255,255,0.08)`}}>
                            <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>🏠 Home Purchase</div>
                            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
                              <div>
                                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>HOME PRICE ($)</div>
                                <input type="number" placeholder={existingMortgage?String(existingMortgage.price):"400000"} value={eventForm.homePrice}
                                  onChange={e=>setEventForm(f=>({...f,homePrice:e.target.value}))}/>
                              </div>
                              <div>
                                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>DOWN %</div>
                                <input type="number" placeholder="20" value={eventForm.downPct}
                                  onChange={e=>setEventForm(f=>({...f,downPct:e.target.value}))}/>
                              </div>
                              <div>
                                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>RATE %</div>
                                <input type="number" placeholder={existingMortgage?String(existingMortgage.rate):"6.5"} step="0.1" value={eventForm.mortgageRate}
                                  onChange={e=>setEventForm(f=>({...f,mortgageRate:e.target.value}))}/>
                              </div>
                              <div>
                                <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>TERM</div>
                                <div style={{display:"flex",gap:4}}>
                                  {[15,30].map(t=>{
                                    const on = eventForm.mortgageTerm===t;
                                    return <button key={t} onClick={()=>setEventForm(f=>({...f,mortgageTerm:t}))} style={{
                                      flex:1,padding:"8px 0",fontSize:11,borderRadius:5,cursor:"pointer",
                                      border:`1px solid ${on?T.accent:T.border}`,
                                      background:on?T.accentDim:"transparent",
                                      color:on?T.accent:T.text2,transition:"all 0.12s",
                                    }}>{t}yr</button>;
                                  })}
                                </div>
                              </div>
                            </div>
                            {eventForm.homePrice && eventForm.mortgageRate && parseFloat(eventForm.homePrice)>0 && parseFloat(eventForm.mortgageRate)>0 && (() => {
                              const price = parseFloat(eventForm.homePrice);
                              const downPctVal = eventForm.downPct !== '' && !isNaN(parseFloat(eventForm.downPct)) ? parseFloat(eventForm.downPct) : 20;
                              const down = price * downPctVal / 100;
                              const loan = price - down;
                              const mr = parseFloat(eventForm.mortgageRate)/100/12;
                              const n = eventForm.mortgageTerm * 12;
                              const pmt = mr===0 ? loan/n : loan*mr*Math.pow(1+mr,n)/(Math.pow(1+mr,n)-1);
                              const totalPaid = pmt * n;
                              return (
                                <div style={{fontSize:12,color:T.accent,padding:"10px 12px",background:T.accentDim,borderRadius:6}}>
                                  <div>Loan: <strong>{fmt(loan)}</strong> · Down: <strong>{fmt(down)}</strong></div>
                                  <div style={{color:T.text1,marginTop:3}}>Monthly payment: <strong style={{color:T.accent}}>{fmt(pmt)}</strong> · Total interest: <strong style={{color:T.red}}>{fmt(totalPaid-loan)}</strong></div>
                                </div>
                              );
                            })()}
                            {existingMortgage && !eventForm.homePrice && (
                              <div style={{fontSize:11,color:T.text2,padding:"6px 10px",background:"rgba(255,255,255,0.03)",borderRadius:5}}>
                                Current: {fmtK(existingMortgage.price)} at {existingMortgage.rate}% — leave blank to keep unchanged
                                <button onClick={()=>setMortgages(p=>p.filter(m=>m.year!==year))} style={{marginLeft:12,fontSize:10,color:T.red,background:"transparent",border:`1px solid ${T.red}`,borderRadius:4,padding:"2px 7px",cursor:"pointer"}}>Remove</button>
                              </div>
                            )}
                            {/* Selling first home to buy new one — show equity/investment options */}
                            {eventForm.homePrice && parseFloat(eventForm.homePrice)>0 && mortgages.some(m=>m.year<year) && (() => {
                              const prevMort = [...mortgages].reverse().find(m=>m.year<year);
                              const snap = prevMort ? mortgageData.find(d=>d.year===year) : null;
                              const availEquity = snap ? snap.equity : 0;
                              const invSnap = chartData.find(d=>d.year===year);
                              const availInvest = invSnap ? invSnap.investBalance : 0;
                              if (!prevMort) return null;
                              return (
                                <div style={{marginTop:10,padding:"12px",background:"rgba(167,139,250,0.08)",borderRadius:8,border:"1px solid rgba(167,139,250,0.2)"}}>
                                  <div style={{fontSize:11,color:"#a78bfa",fontWeight:600,marginBottom:8}}>🏡 Selling previous home?</div>
                                  <div style={{fontSize:11,color:T.text1,marginBottom:10}}>
                                    Est. equity from prior home in {year}: <strong style={{color:T.green}}>{fmt(availEquity)}</strong>
                                    {availInvest>0 && <span style={{marginLeft:10}}>Investment portfolio: <strong style={{color:T.gold}}>{fmt(availInvest)}</strong></span>}
                                  </div>
                                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                                    <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:T.text1,cursor:"pointer"}}>
                                      <input type="checkbox" checked={eventForm.useEquity} onChange={e=>setEventForm(f=>({...f,useEquity:e.target.checked}))} style={{accentColor:T.green}}/>
                                      Apply home equity ({fmtK(availEquity)}) to down payment
                                    </label>
                                    {availInvest>0 && (
                                      <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:T.text1,cursor:"pointer"}}>
                                        <input type="checkbox" checked={eventForm.useInvestments} onChange={e=>setEventForm(f=>({...f,useInvestments:e.target.checked}))} style={{accentColor:T.gold}}/>
                                        Use investments ({fmtK(availInvest)}) for down payment
                                      </label>
                                    )}
                                  </div>
                                  {(eventForm.useEquity || eventForm.useInvestments) && (() => {
                                    const price2 = parseFloat(eventForm.homePrice);
                                    const extra = (eventForm.useEquity?availEquity:0)+(eventForm.useInvestments?availInvest:0);
                                    const downPctVal2 = eventForm.downPct!==''&&!isNaN(parseFloat(eventForm.downPct))?parseFloat(eventForm.downPct):20;
                                    const baseDown = price2*downPctVal2/100;
                                    const totalDown = Math.min(price2, baseDown+extra);
                                    const newLoan = Math.max(0, price2-totalDown);
                                    return (
                                      <div style={{marginTop:8,fontSize:12,color:T.green,padding:"8px 10px",background:T.greenDim,borderRadius:6}}>
                                        Total down: {fmt(totalDown)} ({((totalDown/price2)*100).toFixed(1)}%) · New loan: {fmt(newLoan)}
                                      </div>
                                    );
                                  })()}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}

                      {/* Life Events section */}
                      <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid rgba(255,255,255,0.08)`}}>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>
                          🎯 Life Event
                        </div>
                        {/* Type selector */}
                        <div style={{display:"flex",gap:6,marginBottom:10}}>
                          {[
                            ["expense",       "💸 Big Expense",      T.red,    T.redDim],
                            ["extra-mortgage","🏠 Extra Mortgage",   T.accent, T.accentDim],
                            ["extra-invest",  "📈 Extra Investment", T.gold,   T.goldDim],
                          ].map(([val,lbl,col,bg])=>{
                            const on = eventForm.lifeType===val;
                            return (
                              <button key={val} onClick={()=>setEventForm(f=>({...f,lifeType:val}))} style={{
                                flex:1,padding:"8px",fontSize:11,borderRadius:7,cursor:"pointer",
                                border:`1px solid ${on?col:T.border}`,
                                background:on?bg:"transparent",
                                color:on?col:T.text2,transition:"all 0.15s",
                              }}>{lbl}</button>
                            );
                          })}
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:8}}>
                          <div>
                            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>DESCRIPTION</div>
                            <input type="text"
                              placeholder={eventForm.lifeType==="expense"?"New car, wedding, vacation…":eventForm.lifeType==="extra-mortgage"?"Extra principal payment…":"Extra contribution…"}
                              value={eventForm.lifeLabel}
                              onChange={e=>setEventForm(f=>({...f,lifeLabel:e.target.value}))}/>
                          </div>
                          <div>
                            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>AMOUNT ($)</div>
                            <input type="number" placeholder="10000" value={eventForm.lifeAmount}
                              onChange={e=>setEventForm(f=>({...f,lifeAmount:e.target.value}))}/>
                          </div>
                        </div>
                        {/* Preview */}
                        {eventForm.lifeLabel.trim() && eventForm.lifeAmount && parseFloat(eventForm.lifeAmount)>0 && (() => {
                          const typeColors = { expense:T.red, "extra-mortgage":T.accent, "extra-invest":T.gold };
                          const typeBgs    = { expense:T.redDim, "extra-mortgage":T.accentDim, "extra-invest":T.goldDim };
                          const typeDesc   = { expense:"one-time expense", "extra-mortgage":"extra toward principal", "extra-invest":"extra deployed into investments" };
                          const col = typeColors[eventForm.lifeType]||T.text1;
                          const bg  = typeBgs[eventForm.lifeType]||T.bg3;
                          return (
                            <div style={{fontSize:12,color:col,padding:"8px 12px",background:bg,borderRadius:6}}>
                              {eventForm.lifeType==="expense"?"−":"+"}<strong>${parseFloat(eventForm.lifeAmount).toLocaleString()}</strong> · {eventForm.lifeLabel.trim()} <span style={{color:T.text2}}>({typeDesc[eventForm.lifeType]})</span>
                            </div>
                          );
                        })()}
                        {/* Existing life events for this year */}
                        {lifeEvents.filter(e=>e.year===year).length > 0 && (
                          <div style={{marginTop:10}}>
                            <div style={{fontSize:10,color:T.text2,marginBottom:6}}>Events logged this year:</div>
                            {lifeEvents.filter(e=>e.year===year).map((ev,i)=>(
                              <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11,color:T.text1,padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                                <span>{ev.type==="expense"?"💸":ev.type==="extra-mortgage"?"🏠":"📈"} {ev.label} — {ev.type==="expense"?"-":"+"}${ev.amount.toLocaleString()}</span>
                                <button onClick={()=>{ const target=ev; setLifeEvents(p=>{ const idx=p.findIndex(e=>e===target); return idx>=0?[...p.slice(0,idx),...p.slice(idx+1)]:p; }); }} style={{
                                  background:"transparent",border:"none",color:T.red,fontSize:12,cursor:"pointer",padding:"0 4px",
                                }}>✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{display:"flex",gap:8,marginTop:14}}>
                        <button onClick={commitEvent} style={{
                          padding:"9px 24px",background:T.accent,border:"none",borderRadius:6,
                          color:"#fff",fontSize:13,fontWeight:500,cursor:"pointer",
                        }}>Save Event</button>
                        <button onClick={()=>setActiveYear(null)} style={{
                          padding:"9px 16px",background:"transparent",border:`1px solid ${T.border}`,
                          borderRadius:6,color:T.text2,fontSize:13,cursor:"pointer",
                        }}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PROFILE PANEL
───────────────────────────────────────────────────────────── */
function ProfilePanel() {
  const [form, setForm] = useState({
    name:"", age:"", location:"", email:"",
    occupation:"", employer:"", yearsExp:"",
    goal:"", riskTolerance:"moderate", retireAge:"65",
    notes:"",
  });
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(()=>setSaved(false), 2000); };

  const Field = ({label, children}) => (
    <div>
      <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</div>
      {children}
    </div>
  );

  const riskOptions = [
    {val:"conservative", label:"Conservative", desc:"Capital preservation first"},
    {val:"moderate",     label:"Moderate",     desc:"Balanced growth & safety"},
    {val:"aggressive",   label:"Aggressive",   desc:"Maximum long-term growth"},
  ];

  return (
    <BgPanel id="home" scroll>
      <div style={{padding:"2rem 2.5rem 4rem",maxWidth:700}}>

        <div className="fu" style={{marginBottom:"2rem"}}>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:800,color:"#fff",letterSpacing:"-0.02em"}}>
            Profile<span style={{color:T.accent}}>.</span>
          </h1>
          <p style={{color:"rgba(255,255,255,0.3)",fontSize:9,letterSpacing:"0.06em",marginTop:4}}>YOUR FINANCIAL IDENTITY</p>
        </div>

        {/* Personal */}
        <Card className="fu fu2">
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"1.1rem"}}>Personal</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:10}}>
            <Field label="Full Name">
              <input type="text" placeholder="Dallin Stout" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
            </Field>
            <Field label="Age">
              <input type="number" placeholder="28" value={form.age} onChange={e=>setForm(f=>({...f,age:e.target.value}))}/>
            </Field>
            <Field label="Location">
              <input type="text" placeholder="Boise, ID" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))}/>
            </Field>
          </div>
          <Field label="Email">
            <input type="text" placeholder="you@example.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
          </Field>
        </Card>

        {/* Career */}
        <Card className="fu fu3">
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"1.1rem"}}>Career</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 2fr 1fr",gap:10}}>
            <Field label="Occupation / Title">
              <input type="text" placeholder="Software Engineer" value={form.occupation} onChange={e=>setForm(f=>({...f,occupation:e.target.value}))}/>
            </Field>
            <Field label="Employer">
              <input type="text" placeholder="Acme Corp" value={form.employer} onChange={e=>setForm(f=>({...f,employer:e.target.value}))}/>
            </Field>
            <Field label="Years Experience">
              <input type="number" placeholder="5" value={form.yearsExp} onChange={e=>setForm(f=>({...f,yearsExp:e.target.value}))}/>
            </Field>
          </div>
        </Card>

        {/* Financial Goals */}
        <Card className="fu fu4">
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"1.1rem"}}>Financial Goals</div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:14}}>
            <Field label="Primary Goal">
              <input type="text" placeholder="Retire by 55, pay off house by 40…" value={form.goal} onChange={e=>setForm(f=>({...f,goal:e.target.value}))}/>
            </Field>
            <Field label="Target Retirement Age">
              <input type="number" placeholder="65" value={form.retireAge} onChange={e=>setForm(f=>({...f,retireAge:e.target.value}))}/>
            </Field>
          </div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Risk Tolerance</div>
          <div style={{display:"flex",gap:8}}>
            {riskOptions.map(({val,label,desc})=>{
              const on = form.riskTolerance===val;
              const col = val==="conservative"?T.accent:val==="moderate"?T.gold:T.green;
              return (
                <button key={val} onClick={()=>setForm(f=>({...f,riskTolerance:val}))} style={{
                  flex:1,padding:"12px 10px",borderRadius:8,cursor:"pointer",textAlign:"left",
                  border:`1px solid ${on?col:T.border}`,
                  background:on?col+"18":"transparent",
                  transition:"all 0.15s",
                }}>
                  <div style={{fontSize:12,fontWeight:600,color:on?col:T.text1,marginBottom:3}}>{label}</div>
                  <div style={{fontSize:10,color:T.text2,lineHeight:1.4}}>{desc}</div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Notes */}
        <Card className="fu fu5">
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"0.75rem"}}>Notes</div>
          <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
            placeholder="Any additional context about your financial situation, goals, or constraints…"
            style={{
              width:"100%",minHeight:80,background:T.bg3,border:`1px solid ${T.border}`,borderRadius:6,
              color:T.text0,fontFamily:"'DM Mono',monospace",fontSize:13,padding:"9px 12px",
              outline:"none",resize:"vertical",lineHeight:1.6,
            }}/>
        </Card>

        <button onClick={save} style={{
          padding:"11px 32px",background:saved?T.green:T.accent,border:"none",borderRadius:8,
          color:"#fff",fontSize:13,fontWeight:500,letterSpacing:"0.04em",cursor:"pointer",
          transition:"background 0.3s",
        }}>{saved ? "✓ Saved" : "Save Profile"}</button>

      </div>
    </BgPanel>
  );
}

/* ─────────────────────────────────────────────────────────────
   BUDGET PANEL
───────────────────────────────────────────────────────────── */
function BudgetPanel() {
  const CATS = [
    { id:"housing",      label:"Housing",        icon:"🏠", color:"#818cf8" },
    { id:"transport",    label:"Transportation",  icon:"🚗", color:"#fbbf24" },
    { id:"food",         label:"Food & Dining",   icon:"🍽️", color:"#4ade80" },
    { id:"utilities",    label:"Utilities",       icon:"⚡", color:"#60a5fa" },
    { id:"healthcare",   label:"Healthcare",      icon:"🏥", color:"#f472b6" },
    { id:"savings",      label:"Savings",         icon:"💰", color:"#34d399" },
    { id:"entertainment",label:"Entertainment",   icon:"🎬", color:"#a78bfa" },
    { id:"clothing",     label:"Clothing",        icon:"👕", color:"#fb923c" },
    { id:"education",    label:"Education",       icon:"📚", color:"#38bdf8" },
    { id:"other",        label:"Other",           icon:"📦", color:"#94a3b8" },
  ];
  const [income, setIncome] = useState("");
  const [budget, setBudget] = useState(() => Object.fromEntries(CATS.map(c => [c.id, ""])));

  const monthlyIncome = parseFloat(income) || 0;
  const total = Object.values(budget).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const remaining = monthlyIncome - total;
  const pct = monthlyIncome > 0 ? (total / monthlyIncome * 100) : 0;

  return (
    <BgPanel id="home" scroll>
      <div style={{padding:"2rem 2.5rem 4rem",maxWidth:700}}>
        <div className="fu" style={{marginBottom:"2rem"}}>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:"#fff",letterSpacing:"-0.03em"}}>
            Budget<span style={{color:T.accent}}>.</span>
          </h1>
          <p style={{color:"rgba(255,255,255,0.3)",fontSize:11,letterSpacing:"0.06em",marginTop:4}}>MONTHLY BUDGET PLANNER</p>
        </div>

        {/* Monthly income */}
        <Card className="fu fu2">
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"0.75rem"}}>Monthly Take-Home Income</div>
          <input type="number" placeholder="5000" value={income} onChange={e=>setIncome(e.target.value)}
            style={{fontSize:20,fontWeight:600,fontFamily:"'Syne',sans-serif"}}/>
        </Card>

        {/* Summary bar */}
        {monthlyIncome > 0 && (
          <Card className="fu fu3" style={{marginBottom:"1.5rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:12,color:T.text2}}>Budgeted: <strong style={{color:pct>100?T.red:T.text0}}>${Math.round(total).toLocaleString()}</strong></span>
              <span style={{fontSize:12,color:T.text2}}>Remaining: <strong style={{color:remaining<0?T.red:T.green}}>${Math.round(remaining).toLocaleString()}</strong></span>
              <span style={{fontSize:12,color:T.text2}}>Used: <strong style={{color:pct>100?T.red:pct>90?T.gold:T.green}}>{pct.toFixed(1)}%</strong></span>
            </div>
            <div style={{height:8,borderRadius:4,background:T.bg3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.min(100,pct)}%`,background:pct>100?T.red:pct>90?T.gold:T.green,borderRadius:4,transition:"width 0.3s"}}/>
            </div>
          </Card>
        )}

        {/* Category inputs */}
        <Card className="fu fu4">
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"1rem"}}>Monthly Expenses</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {CATS.map(cat => {
              const val = parseFloat(budget[cat.id]) || 0;
              const catPct = monthlyIncome > 0 ? val/monthlyIncome*100 : 0;
              return (
                <div key={cat.id}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:11,color:T.text1,display:"flex",alignItems:"center",gap:6}}>
                      <span style={{width:3,height:12,borderRadius:2,background:cat.color,display:"inline-block",flexShrink:0}}/>
                      {cat.icon} {cat.label}
                    </span>
                    {val > 0 && <span style={{fontSize:10,color:T.text2}}>{catPct.toFixed(1)}%</span>}
                  </div>
                  <input type="number" placeholder="0" value={budget[cat.id]}
                    onChange={e=>setBudget(b=>({...b,[cat.id]:e.target.value}))}
                    style={{borderColor: parseFloat(budget[cat.id])>0 ? cat.color+"88" : undefined}}/>
                </div>
              );
            })}
          </div>
        </Card>

        {/* 50/30/20 reference */}
        <Card className="fu fu5" style={{background:"rgba(129,140,248,0.06)",border:"1px solid rgba(129,140,248,0.15)"}}>
          <div style={{fontSize:11,color:T.accent,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"0.75rem"}}>💡 50/30/20 Guideline</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,fontSize:12}}>
            {[["50%","Needs","Housing, food, transport, utilities"],["30%","Wants","Entertainment, dining, clothing"],["20%","Savings","Emergency fund, retirement, investments"]].map(([p,l,d])=>(
              <div key={l} style={{padding:"10px 12px",borderRadius:8,background:"rgba(255,255,255,0.04)"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,color:T.accent,marginBottom:3}}>{p}</div>
                <div style={{color:T.text0,fontWeight:600,marginBottom:3}}>{l}</div>
                <div style={{color:T.text2,fontSize:11,lineHeight:1.5}}>{d}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </BgPanel>
  );
}

/* ─────────────────────────────────────────────────────────────
   FAQ PANEL
───────────────────────────────────────────────────────────── */
function FAQPanel() {
  const [open, setOpen] = useState(null);
  const faqs = [
    { q:"How does the 401k projection work?",
      a:"Your annual 401k contribution is calculated as the percentage of your projected salary you set in each year's event. That amount, plus any employer match, is added to your running balance at the start of each year and the entire balance grows at a 7% annual rate — a common long-term market average. The balance compounds every year until age 65." },
    { q:"How is home equity calculated?",
      a:"Equity is the market value of your home minus the remaining loan balance. Your home's market value appreciates at 3% per year from the purchase price. The loan balance decreases each year as you make monthly amortized payments. Equity = Market Value − Remaining Balance." },
    { q:"What does the Annual Raise Rate mean?",
      a:"The raise rate (1–5%) is applied to your salary every year between salary events. So if you start at $80,000 with a 3% raise rate, next year projects $82,400, the year after $84,872, and so on. When you add a promotion or job change event, that overrides the projection from that year forward." },
    { q:"How are investments tracked?",
      a:"Each year you can set a percentage of your projected salary to invest (e.g. 5% into VOO). That dollar amount is added to your investment balance at the start of the year and the entire balance grows at 7% annually — the same assumption as the 401k. You can change the percentage in any future year." },
    { q:"What is Net Worth on the chart?",
      a:"Net Worth = 401k Balance + Investment Portfolio + Home Equity. It is plotted as the dashed purple line on the left chart. It does not currently include other assets or liabilities like car loans or credit card debt." },
    { q:"Can I model buying a second home?",
      a:"Yes — click the + Add Event button on any future year and enter a new home purchase. If a prior mortgage exists, the app will show your estimated equity and investment balance and let you apply either toward the down payment on the new home." },
    { q:"What does the 50/30/20 rule mean?",
      a:"The 50/30/20 guideline suggests allocating 50% of take-home pay to needs (housing, food, transport), 30% to wants (entertainment, dining out, clothing), and 20% to savings and debt repayment. It is a starting point — not a strict rule — and your numbers may vary based on your city, family size, and goals." },
    { q:"How do I reset my roadmap?",
      a:"Click the ↺ Reset button in the top-right corner of the Roadmap module. This clears all entries, mortgages, 401k contributions, and investments and returns you to the setup screen. Your Profile data is not affected." },
  ];

  return (
    <BgPanel id="home" scroll>
      <div style={{padding:"2rem 2.5rem 4rem",maxWidth:680}}>
        <div className="fu" style={{marginBottom:"2rem"}}>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:"#fff",letterSpacing:"-0.03em"}}>
            FAQ<span style={{color:T.accent}}>.</span>
          </h1>
          <p style={{color:"rgba(255,255,255,0.3)",fontSize:11,letterSpacing:"0.06em",marginTop:4}}>FREQUENTLY ASKED QUESTIONS</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {faqs.map((f,i)=>(
            <div key={i} className="fu" style={{animationDelay:`${i*0.04}s`,
              background:"rgba(255,255,255,0.04)",border:`1px solid ${open===i?"rgba(129,140,248,0.4)":"rgba(255,255,255,0.08)"}`,
              borderRadius:10,overflow:"hidden",transition:"border-color 0.2s"}}>
              <button onClick={()=>setOpen(open===i?null:i)} style={{
                width:"100%",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",
                background:"transparent",border:"none",color:T.text0,textAlign:"left",
                fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:600,gap:12,
              }}>
                <span>{f.q}</span>
                <span style={{flexShrink:0,fontSize:18,color:open===i?T.accent:T.text2,transition:"color 0.2s"}}>{open===i?"−":"+"}</span>
              </button>
              {open===i && (
                <div style={{padding:"0 18px 16px",fontSize:13,color:T.text1,lineHeight:1.7,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
                  <div style={{marginTop:12}}>{f.a}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </BgPanel>
  );
}

/* ─────────────────────────────────────────────────────────────
   RESOURCES PANEL
───────────────────────────────────────────────────────────── */
function ResourcesPanel() {
  const sections = [
    { title:"📈 Investing Fundamentals", color:T.green, items:[
      { name:"Bogleheads Wiki", desc:"The definitive guide to low-cost index fund investing, asset allocation, and tax-efficient strategies.", url:"https://www.bogleheads.org/wiki/Main_Page" },
      { name:"Investopedia", desc:"Clear explanations of financial terms, concepts, and how markets work.", url:"https://www.investopedia.com" },
      { name:"JL Collins — Stock Series", desc:"A plain-English case for owning index funds and building wealth simply.", url:"https://jlcollinsnh.com/stock-series/" },
    ]},
    { title:"🏠 Home Buying", color:T.accent, items:[
      { name:"Consumer Financial Protection Bureau", desc:"Government resource on mortgages, closing costs, and your rights as a buyer.", url:"https://www.consumerfinance.gov/owning-a-home/" },
      { name:"Bankrate Mortgage Calculator", desc:"Calculate monthly payments, total interest, and compare loan terms.", url:"https://www.bankrate.com/mortgages/mortgage-calculator/" },
      { name:"r/personalfinance — Home Buying Wiki", desc:"Community-sourced guide to the home purchase process from offer to close.", url:"https://www.reddit.com/r/personalfinance/wiki/housing" },
    ]},
    { title:"💼 Retirement Planning", color:T.gold, items:[
      { name:"IRS 401(k) Contribution Limits", desc:"Official IRS page with current annual contribution limits for 401(k) and IRA accounts.", url:"https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-401k-and-profit-sharing-plan-contribution-limits" },
      { name:"NerdWallet Retirement Calculator", desc:"Project your retirement savings based on current balance, contributions, and timeline.", url:"https://www.nerdwallet.com/calculator/retirement-calculator" },
      { name:"Social Security Administration", desc:"Estimate your future Social Security benefits and understand how they're calculated.", url:"https://www.ssa.gov/benefits/calculators/" },
    ]},
    { title:"💰 Budgeting & Debt", color:"#f472b6", items:[
      { name:"You Need A Budget (YNAB)", desc:"Zero-based budgeting app that gives every dollar a job. Free for 34 days.", url:"https://www.ynab.com" },
      { name:"r/personalfinance — Prime Directive", desc:"The community's step-by-step flowchart for what to do with your money.", url:"https://www.reddit.com/r/personalfinance/wiki/commontopics" },
      { name:"Annual Credit Report", desc:"Free official source for your credit reports from all three bureaus.", url:"https://www.annualcreditreport.com" },
    ]},
    { title:"📚 Books Worth Reading", color:"#a78bfa", items:[
      { name:"The Millionaire Next Door — Thomas Stanley", desc:"Research-backed look at how ordinary people build real wealth over time." },
      { name:"The Little Book of Common Sense Investing — John Bogle", desc:"The founder of Vanguard makes the case for index funds in plain language." },
      { name:"I Will Teach You To Be Rich — Ramit Sethi", desc:"Practical, no-guilt personal finance for people in their 20s and 30s." },
      { name:"A Random Walk Down Wall Street — Burton Malkiel", desc:"Classic argument that markets are efficient and passive investing beats active." },
    ]},
  ];

  return (
    <BgPanel id="home" scroll>
      <div style={{padding:"2rem 2.5rem 4rem",maxWidth:720}}>
        <div className="fu" style={{marginBottom:"2rem"}}>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:"#fff",letterSpacing:"-0.03em"}}>
            Resources<span style={{color:T.accent}}>.</span>
          </h1>
          <p style={{color:"rgba(255,255,255,0.3)",fontSize:11,letterSpacing:"0.06em",marginTop:4}}>CURATED FINANCIAL LEARNING</p>
        </div>
        {sections.map((sec,si)=>(
          <Card key={si} className="fu" style={{animationDelay:`${si*0.06}s`,marginBottom:"1.5rem"}}>
            <div style={{fontSize:13,fontWeight:700,color:sec.color,marginBottom:"1rem",fontFamily:"'Syne',sans-serif"}}>{sec.title}</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {sec.items.map((item,ii)=>(
                <div key={ii} style={{paddingBottom:ii<sec.items.length-1?12:0,borderBottom:ii<sec.items.length-1?"1px solid rgba(255,255,255,0.06)":"none"}}>
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
                      fontSize:13,fontWeight:600,color:sec.color,textDecoration:"none",display:"block",marginBottom:3,
                    }}
                      onMouseOver={e=>e.currentTarget.style.textDecoration="underline"}
                      onMouseOut={e=>e.currentTarget.style.textDecoration="none"}>
                      {item.name} ↗
                    </a>
                  ) : (
                    <div style={{fontSize:13,fontWeight:600,color:sec.color,marginBottom:3}}>{item.name}</div>
                  )}
                  <div style={{fontSize:12,color:T.text2,lineHeight:1.6}}>{item.desc}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </BgPanel>
  );
}


// ─── ROADMAP TIMELINE VISUAL ──────────────────────────────────────────────────

function RoadmapTimeline({ entries, mortgages, contrib401k, investments, lifeEvents, chartData, mortgageData, startAge, startYear }) {
  const [hovered, setHovered] = useState(null);
  const scrollRef = useRef(null);

  // Gather all individual events
  const allRaw = [
    ...entries.filter(e => e.type !== "start").map(e => ({
      year:e.year, icon:e.type==="promotion"?"🏅":"🏢",
      label:e.type==="promotion"?`Promotion${e.role?" — "+e.role:""}`:`Job Change${e.role?" — "+e.role:""}${e.company?" @ "+e.company:""}`,
      color:T.accent,
    })),
    ...mortgages.map(m => ({ year:m.year, icon:"🏠", label:`Home — ${fmt(m.price)} at ${m.rate}%`, color:"#60a5fa" })),
    ...contrib401k.filter(e=>e.pct>0).map(e => ({ year:e.year, icon:"💼", label:`401k → ${e.pct}%`, color:T.green })),
    ...investments.filter(e=>e.pct>0).map(e => ({ year:e.year, icon:"📈", label:`${e.pct}% → ${e.ticker||"VOO"}`, color:T.gold })),
    ...lifeEvents.map(e => ({
      year:e.year,
      icon:e.type==="expense"?"💸":e.type==="extra-mortgage"?"🏠":"📈",
      label:`${e.label}: ${e.type==="expense"?"-":"+"}$${e.amount.toLocaleString()}`,
      color:e.type==="expense"?T.red:e.type==="extra-mortgage"?"#60a5fa":T.gold,
    })),
  ];

  // Milestones
  const seenNW = new Set();
  for (const pt of chartData) {
    for (const th of [100000,250000,500000,1000000]) {
      if (!seenNW.has(th) && pt.netWorth >= th) {
        seenNW.add(th);
        allRaw.push({ year:pt.year, icon:"🏆", label:`Net Worth: ${th>=1000000?"$"+(th/1000000)+"M":"$"+(th/1000)+"k"}`, color:"#f9a8d4" });
      }
    }
  }
  if (mortgages.length) {
    const m = mortgages[mortgages.length-1];
    const principal = m.price*(1-m.downPct/100);
    let h=false,p=false;
    for (const pt of mortgageData) {
      if (!h && !pt.noLoan && pt.principalPaid>=principal/2) { h=true; allRaw.push({year:pt.year,icon:"🎯",label:"Mortgage 50% paid",color:"#34d399"}); }
      if (!p && pt.paidOff) { p=true; allRaw.push({year:pt.year,icon:"🎉",label:"Mortgage paid off!",color:"#4ade80"}); }
    }
  }

  // Group by year → sorted array of { year, events[] }
  const byYear = {};
  for (const ev of allRaw) {
    if (!byYear[ev.year]) byYear[ev.year] = [];
    byYear[ev.year].push(ev);
  }
  const groups = Object.keys(byYear).map(y=>({ year:+y, events:byYear[y] })).sort((a,b)=>a.year-b.year);
  if (!groups.length) return null;

  const getAge = year => startAge ? startAge+(year-startYear) : null;
  const getLabel = year => { const a=getAge(year); return a?`Age ${a}`:String(year); };

  const CARD_W = 110, GAP = 20;
  const BUBBLE = 34, OVERLAP = 14; // px each bubble stacks under previous

  const scroll = dir => scrollRef.current?.scrollBy({left:dir*(CARD_W+GAP)*3,behavior:"smooth"});

  return (
    <div style={{padding:"6px 0 2px",position:"relative"}}>
      <button onClick={()=>scroll(-1)} style={{
        position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",zIndex:5,
        width:26,height:26,borderRadius:"50%",background:"rgba(0,0,0,0.65)",
        border:"1px solid rgba(255,255,255,0.15)",color:"#fff",fontSize:14,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
      }}>‹</button>

      <div ref={scrollRef} style={{overflowX:"auto",scrollBehavior:"smooth",padding:"4px 34px",scrollbarWidth:"none",msOverflowStyle:"none"}}>
        <div style={{display:"flex",alignItems:"flex-start",gap:GAP,position:"relative",paddingBottom:4}}>
          {/* Dashed connecting line through centre of bubbles */}
          <div style={{position:"absolute",top:BUBBLE/2,left:0,right:0,borderTop:"2px dashed rgba(255,255,255,0.1)",pointerEvents:"none"}}/>

          {groups.map((g, gi) => {
            const isHov = hovered===gi;
            const multi = g.events.length > 1;
            // Stack height: first bubble + (n-1)*overlap
            const stackH = BUBBLE + (g.events.length-1)*OVERLAP;
            // dominant color = first event's color
            const domColor = g.events[0].color;

            return (
              <div key={gi}
                onMouseEnter={()=>setHovered(gi)}
                onMouseLeave={()=>setHovered(null)}
                style={{flexShrink:0,width:CARD_W,display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"default",position:"relative",zIndex:isHov?10:1}}>

                {/* Stacked bubbles */}
                <div style={{position:"relative",width:BUBBLE,height:stackH,flexShrink:0}}>
                  {g.events.map((ev,ei) => {
                    const offset = ei*OVERLAP;
                    const isTop  = ei===g.events.length-1;
                    return (
                      <div key={ei} style={{
                        position:"absolute",top:offset,left:0,
                        width:BUBBLE,height:BUBBLE,borderRadius:"50%",
                        background:isHov ? ev.color+"44" : "rgba(0,0,0,0.6)",
                        border:`2px solid ${isHov?ev.color:ev.color+"99"}`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:15,transition:"all 0.15s",
                        zIndex:g.events.length-ei,
                        boxShadow:isHov?`0 0 10px ${ev.color}55`:"none",
                      }}>{ev.icon}</div>
                    );
                  })}
                  {/* Count badge if multiple */}
                  {multi && (
                    <div style={{
                      position:"absolute",top:-4,right:-6,
                      width:16,height:16,borderRadius:"50%",
                      background:domColor,border:"1px solid rgba(0,0,0,0.4)",
                      fontSize:9,color:"#000",fontWeight:700,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      zIndex:20,
                    }}>{g.events.length}</div>
                  )}
                </div>

                {/* Age label */}
                <div style={{fontSize:9,color:isHov?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.28)",letterSpacing:"0.06em",textAlign:"center",marginTop:2}}>
                  {getLabel(g.year)}
                </div>

                {/* On hover: show all event labels stacked */}
                {isHov ? (
                  <div style={{display:"flex",flexDirection:"column",gap:3,width:"100%"}}>
                    {g.events.map((ev,ei)=>(
                      <div key={ei} style={{fontSize:10,color:ev.color,textAlign:"center",lineHeight:1.3,wordBreak:"break-word"}}>
                        {ev.label}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{fontSize:10,color:T.text2,textAlign:"center",lineHeight:1.3,
                    overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",
                    wordBreak:"break-word",maxWidth:CARD_W}}>
                    {g.events[0].label}{multi?` +${g.events.length-1} more`:""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button onClick={()=>scroll(1)} style={{
        position:"absolute",right:0,top:"50%",transform:"translateY(-50%)",zIndex:5,
        width:26,height:26,borderRadius:"50%",background:"rgba(0,0,0,0.65)",
        border:"1px solid rgba(255,255,255,0.15)",color:"#fff",fontSize:14,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",
      }}>›</button>
    </div>
  );
}





/* ─────────────────────────────────────────────────────────────
   NAV
───────────────────────────────────────────────────────────── */
const NAV_SECTIONS = [
  { label: "Modules", items: [
    { id:"salary",    label:"Roadmap",   icon:"🗺️" },
    { id:"budget",    label:"Budget",    icon:"💰" },
    { id:"profile",   label:"Profile",   icon:"👤" },
    { id:"faq",       label:"FAQ",       icon:"❓" },
    { id:"resources", label:"Resources", icon:"📚" },
  ]},
];

/* ─────────────────────────────────────────────────────────────
   APP
───────────────────────────────────────────────────────────── */
export default function App() {
  const [active, setActive] = useState("salary");
  const [salaryState, setSalaryState] = useState({
    entries: [],
    rate: 3,
    startYear: new Date().getFullYear(),
    setupForm: { year: String(new Date().getFullYear()), salary: "", role: "", company: "", age: "" },
    contrib401k: [], // [{ year, pct }] sorted by year
    match401k: { enabled: false, matchPct: 100, upToPct: 3 }, // employer matches matchPct% of up to upToPct% of salary
    mortgages: [], // [{ year, price, downPct, rate, termYears }]
    investments: [], // [{ year, ticker, amountPerYear }] annual contributions
    lifeEvents: [],  // [{ year, label, amount, type }] type: 'expense'|'extra-mortgage'|'extra-invest'
  });

  return (
    <>
      <style>{CSS}</style>
      <div style={{display:"flex",height:"100vh",overflow:"hidden"}}>

        {/* Sidebar */}
        <aside style={{width:234,minWidth:234,background:T.sidebar,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"1.4rem 1.25rem 1.1rem",borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:800,color:T.text0,lineHeight:1.25}}>My Financial Roadmap</div>
            <div style={{fontSize:11,color:T.text2,marginTop:4}}>By Dallin Stout</div>
          </div>

          <nav style={{padding:"0.75rem",flex:1,overflowY:"auto"}}>
            {NAV_SECTIONS.map(sec => (
              <div key={sec.label||"top"} style={{marginBottom:"0.5rem"}}>
                {sec.label && <div style={{fontSize:9,color:T.text2,letterSpacing:"0.14em",textTransform:"uppercase",padding:"0 0.5rem",marginBottom:4,marginTop:8}}>{sec.label}</div>}
                {sec.items.map(item => {
                  const on = active===item.id;
                  return (
                    <button key={item.id} onClick={()=>setActive(item.id)} style={{
                      display:"flex",alignItems:"center",gap:10,width:"100%",padding:"8px 12px",
                      borderRadius:8,border:"none",fontSize:13,textAlign:"left",
                      transition:"all 0.15s",marginBottom:1,position:"relative",
                      background:on?T.accentDim:"transparent",color:on?T.accent:T.text1,fontWeight:on?500:400,
                    }}
                      onMouseEnter={e=>{if(!on)e.currentTarget.style.background=T.bg3;}}
                      onMouseLeave={e=>{if(!on)e.currentTarget.style.background="transparent";}}>
                      {on && <span style={{position:"absolute",left:0,top:"20%",bottom:"20%",width:3,borderRadius:"0 2px 2px 0",background:T.accent}}/>}
                      <span style={{fontSize:15,opacity:on?1:0.55}}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div style={{padding:"0.9rem 1.25rem",borderTop:`1px solid ${T.border}`,fontSize:10,color:T.text2}}>v0.2 · in progress</div>
        </aside>

        {/* Right */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* Ticker */}
          <div style={{height:52,flexShrink:0,background:T.sidebar,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center"}}>
            <TickerBar/>
          </div>

          {/* Main */}
          <main style={{flex:1,overflow:"hidden",position:"relative"}}>
            {active==="salary"    && <SalaryPanel salaryState={salaryState} setSalaryState={setSalaryState}/>}
            {active==="budget"    && <BudgetPanel/>}
            {active==="profile"   && <ProfilePanel/>}
            {active==="faq"       && <FAQPanel/>}
            {active==="resources" && <ResourcesPanel/>}

          </main>
        </div>
      </div>
    </>
  );
}
