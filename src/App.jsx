import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart, Line, Legend, Customized,
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
@keyframes navShimmer{0%{opacity:0;transform:translateX(-160%) skewX(-10deg)}30%{opacity:1}70%{opacity:1}100%{opacity:0;transform:translateX(260%) skewX(-10deg)}}
.nav-shimmer::after{content:"";position:absolute;inset:-10px;background:linear-gradient(105deg,transparent 5%,rgba(200,215,255,0.75) 30%,rgba(235,240,255,0.97) 50%,rgba(200,215,255,0.75) 70%,transparent 95%);animation:navShimmer 0.76s cubic-bezier(0.4,0,0.6,1) forwards;pointer-events:none;z-index:999}
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


// Renders legend text directly inside the SVG plot area (top-left of data area)
function InPlotLegend({ items, xOffset=6, lineLen=18 }) {
  return ({ xAxisMap, yAxisMap, width, height, margin }) => {
    const plotLeft = (margin?.left||0) + (Object.values(xAxisMap||{})[0]?.x || 86);
    const plotTop  = (margin?.top||0) + 8;
    return (
      <g>
        {items.map((item, i) => (
          <g key={i} transform={`translate(${plotLeft + xOffset}, ${plotTop + i*18})`}>
            <line x1={0} y1={5} x2={lineLen} y2={5} stroke={item.color} strokeWidth={2}
              strokeDasharray={item.dash||"none"}/>
            <text x={lineLen+5} y={9} fill="rgba(255,255,255,0.75)" fontSize={10}
              fontFamily="DM Mono,monospace">{item.label}</text>
          </g>
        ))}
      </g>
    );
  };
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
  const [chartRange, setChartRange] = useState(100);
  const [showSetup,  setShowSetup]  = useState(true); // % of data to show (100 = full range)
  const [activeYear, setActiveYear] = useState(null);
  const [eventForm,  setEventForm]  = useState({ type: "promotion", pct: "", salary: "", role: "", company: "", k401Pct: null, homePrice:"", downPct:"20", mortgageRate:"", mortgageTerm:30, investTicker:"", investPct:null, investReturn:7, sellHome:false, useEquity:false, useInvestments:false, lifeLabel:"", lifeAmount:"", lifeType:"expense" });
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
    setShowSetup(false);
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
    setEventForm({ type: "promotion", pct: "", salary: "", role: "", company: "", k401Pct: null, homePrice:"", downPct:"20", mortgageRate:"", mortgageTerm:30, investTicker:"", investPct:null, investReturn:7, sellHome:false, useEquity:false, useInvestments:false, lifeLabel:"", lifeAmount:"", lifeType:"expense" });
  };

  const removeEntry = (year) => {
    if (year === startYear) { setEntries([]); setShowSetup(true); return; }
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


  // ── SETUP MODAL JSX (inline variable, NOT a component, to avoid remount on re-render) ──
  const setupModalJSX = showSetup && (
    <div style={{
      position:"absolute",inset:0,zIndex:50,
      display:"flex",alignItems:"center",justifyContent:"center",
      background:"rgba(0,0,0,0.72)",backdropFilter:"blur(4px)",
    }}
      onClick={e=>e.stopPropagation()}>
      <div style={{
        background:T.bg2,border:`1px solid ${T.borderHi}`,borderRadius:16,
        padding:"2rem",maxWidth:480,width:"calc(100% - 3rem)",
        boxShadow:"0 24px 80px rgba(0,0,0,0.8)",
      }}>
        <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
          <div style={{fontSize:28,marginBottom:8}}>🗺️</div>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:"#fff",letterSpacing:"-0.02em",marginBottom:6}}>
            Your Starting Point
          </h2>
          <p style={{color:"rgba(255,255,255,0.4)",fontSize:12,lineHeight:1.5}}>Tell us where your career began and we'll build your full roadmap from there.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
          <div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>START YEAR</div>
            <input type="number" placeholder={String(currentYear)} value={setupForm.year}
              onChange={e=>setSetupForm(f=>({...f,year:e.target.value}))}
              onKeyDown={e=>e.key==="Enter"&&commitStart()}/>
          </div>
          <div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>YOUR AGE</div>
            <input type="number" placeholder="22" value={setupForm.age||""}
              onChange={e=>setSetupForm(f=>({...f,age:e.target.value}))}
              onKeyDown={e=>e.key==="Enter"&&commitStart()}/>
          </div>
          <div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>STARTING SALARY ($)</div>
            <input type="number" placeholder="60000" value={setupForm.salary}
              onChange={e=>setSetupForm(f=>({...f,salary:e.target.value}))}
              onKeyDown={e=>e.key==="Enter"&&commitStart()}/>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>ROLE / TITLE</div>
            <input type="text" placeholder="Software Engineer" value={setupForm.role}
              onChange={e=>setSetupForm(f=>({...f,role:e.target.value}))}
              onKeyDown={e=>e.key==="Enter"&&commitStart()}/>
          </div>
          <div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>COMPANY</div>
            <input type="text" placeholder="Acme Corp" value={setupForm.company}
              onChange={e=>setSetupForm(f=>({...f,company:e.target.value}))}
              onKeyDown={e=>e.key==="Enter"&&commitStart()}/>
          </div>
        </div>
        {setupError && <div style={{fontSize:12,color:T.red,marginBottom:10}}>{setupError}</div>}
        <button onClick={commitStart} style={{
          width:"100%",padding:"12px",background:T.accent,border:"none",borderRadius:10,
          color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer",letterSpacing:"0.02em",
          boxShadow:"0 0 24px rgba(129,140,248,0.4)",
        }}>Build My Roadmap →</button>
      </div>
    </div>
  );

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
  // Dynamic tick interval: always show at least 5 ticks
  const xInterval = Math.max(0, Math.floor(sliceEnd / 5) - 1);
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
      {/* Block all clicks until setup is done — sits below the modal (z:50) but above content (z:1) */}
      {!hasStart && <div style={{position:"absolute",inset:0,zIndex:49,pointerEvents:"all",background:"transparent"}}
        onClick={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()}/>}
      {/* Setup modal — rendered at panel root so z:50 beats the z:49 blocker */}
      {setupModalJSX}
      {/* Frozen top section */}
      <div style={{position:"relative",zIndex:1,flexShrink:0,padding:"0.6rem 2rem 0.5rem",overflowY:"visible"}}>

        {/* Top bar: starting point summary + edit + reset */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.4rem",gap:8}}>
          {hasStart && firstEntry && (
            <div style={{fontSize:11,color:T.text2,display:"flex",alignItems:"center",gap:10}}>
              <span style={{color:T.gold,fontWeight:600}}>{firstEntry.role||"Career"}</span>
              <span>started {firstEntry.year}{startAge?` · Age ${startAge}`:""}</span>
              <span>·</span>
              <span style={{color:T.text1}}>{fmt(firstEntry.salary)}</span>
            </div>
          )}
          <div style={{display:"flex",gap:6,marginLeft:"auto"}}>
            {hasStart && <button onClick={()=>setShowSetup(true)} style={{
              fontSize:11,color:T.accent,background:T.accentDim,border:`1px solid ${T.accent}`,
              borderRadius:6,padding:"4px 10px",cursor:"pointer",
            }}>✏️ Edit Start</button>}
            <button onClick={()=>{setEntries([]);setShowSetup(true);}} style={{
              fontSize:11,color:T.text2,background:"transparent",border:`1px solid ${T.border}`,
              borderRadius:6,padding:"4px 10px",cursor:"pointer",
            }}>↺ Reset</button>
          </div>
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
            <div style={{marginBottom:"0.6rem",textAlign:"center"}}>
              <span style={{fontSize:13,color:"rgba(255,255,255,0.6)",letterSpacing:"0.04em",textTransform:"uppercase"}}>401k, Investments & Net Worth</span>
            </div>
            <ResponsiveContainer width="100%" height={490}>
              <LineChart data={chartDataSliced} margin={{top:8,right:8,left:0,bottom:20}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={true} horizontal={true}/>
                <XAxis dataKey="age" tick={xT} {...axP} interval={xInterval}
                  tickFormatter={v => v != null ? `${v}` : ""}
                  label={{value:"Age",position:"insideBottom",offset:-2,fill:T.text2,fontSize:12}}/>
                <YAxis tickFormatter={fmtK} tick={yT} {...axP} width={86} tickCount={10}/>
                <Tooltip content={<SalTip/>}/>
                <Customized component={InPlotLegend({items:[
                  {color:T.green,  label:"401k"},
                  {color:T.gold,   label:"Investments"},
                  {color:"#a78bfa",label:"Net Worth",dash:"6 3"},
                ]})}/>
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
            <div style={{marginBottom:"0.6rem",textAlign:"center"}}>
              <span style={{fontSize:13,color:"rgba(255,255,255,0.6)",letterSpacing:"0.04em",textTransform:"uppercase"}}>Home Ownership</span>
              {mortgages.length > 0 && <span style={{marginLeft:8,fontSize:10,color:T.accent,background:T.accentDim,padding:"2px 7px",borderRadius:3}}>{mortgages[mortgages.length-1]?.rate}% rate</span>}
            </div>

            {mortgages.length === 0 ? (
              <div style={{height:490,display:"flex",alignItems:"center",justifyContent:"center",border:"1px dashed rgba(255,255,255,0.08)",borderRadius:8,flexDirection:"column",gap:12}}>
                <span style={{fontSize:32}}>🏠</span>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:13,color:T.text1,fontWeight:600,marginBottom:4}}>No home added yet</div>
                  <div style={{fontSize:11,color:T.text2,marginBottom:12}}>Click <strong style={{color:T.accent}}>+ Add Event</strong> on any year in the</div>
                  <div style={{fontSize:11,color:T.text2}}>Financial Roadmap Table below to add</div>
                  <div style={{fontSize:11,color:T.text2}}>a home purchase with rate &amp; term.</div>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={490}>
                <LineChart data={mortgageDataSliced} margin={{top:8,right:8,left:0,bottom:20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={true} horizontal={true}/>
                  <XAxis dataKey="age" tick={xT} {...axP} interval={xInterval}
                    tickFormatter={v => v != null ? `${v}` : ""}
                    label={{value:"Age",position:"insideBottom",offset:-2,fill:T.text2,fontSize:12}}/>
                  <YAxis tickFormatter={fmtK} tick={yT} {...axP} width={86} tickCount={10}/>
                  <Tooltip content={<MortgageTip/>}/>
                  <Customized component={InPlotLegend({items:[
                    {color:T.gold,    label:"Balance"},
                    {color:T.red,     label:"Interest owed"},
                    {color:"#a78bfa", label:"Market value"},
                    {color:T.green,   label:"Equity"},
                  ]})}/>
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

        {/* Year outlook bubbles */}
        {hasStart && chartData.length > 1 && (() => {
          const maxYrs = startAge ? Math.ceil((70 - startAge) / 5) * 5 : 40;
          const opts = [];
          for (let y = 5; y <= maxYrs; y += 5) opts.push(y);
          const currentYrs = Math.round(chartData.length * chartRange / 100);
          return (
            <div style={{padding:"4px 0",display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
              <span style={{fontSize:10,color:T.text2,marginRight:2,flexShrink:0}}>View:</span>
              {opts.map(y => {
                const pct = Math.round(y / chartData.length * 100);
                const active = Math.abs(currentYrs - y) < 3;
                return (
                  <button key={y} onClick={()=>setChartRange(Math.min(100, Math.round(y/chartData.length*100)))}
                    style={{padding:"3px 10px",fontSize:11,borderRadius:5,cursor:"pointer",
                      border:`1px solid ${active?T.accent:T.border}`,
                      background:active?T.accentDim:"transparent",
                      color:active?T.accent:T.text2,transition:"all 0.12s"}}>
                    {y}yr
                  </button>
                );
              })}
              <button onClick={()=>setChartRange(100)} style={{padding:"3px 10px",fontSize:11,borderRadius:5,cursor:"pointer",
                border:`1px solid ${chartRange===100?T.gold:T.border}`,
                background:chartRange===100?T.goldDim:"transparent",
                color:chartRange===100?T.gold:T.text2,transition:"all 0.12s"}}>All</button>
            </div>
          );
        })()}

      </div>

      {/* Scrollable timeline */}
      <div style={{position:"relative",zIndex:1,flex:1,overflowY:"auto",padding:"0 2rem 0"}}>

        {/* Sticky header — outside any overflow:hidden so it can actually stick */}
        <div style={{
          position:"sticky",top:0,zIndex:10,
          background:"rgb(14,14,22)",
          borderRadius:"12px 12px 0 0",
          border:"1px solid rgba(255,255,255,0.1)",
          borderBottom:"1px solid rgba(255,255,255,0.08)",
          boxShadow:"0 4px 0 0 rgb(14,14,22)",
        }}>
          <div style={{padding:"7px 16px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
            <span style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>
              🗺️ <strong style={{color:T.text0}}>Build your Financial Roadmap year by year</strong> — click <strong style={{color:T.accent}}>+ Add Event</strong> on any row below
            </span>
            <span style={{fontSize:11,color:T.gold,background:T.goldDim,padding:"3px 10px",borderRadius:5,whiteSpace:"nowrap",flexShrink:0}}>+{rate}% / yr baseline</span>
          </div>
          {/* Column headers */}
          <div style={{display:"flex",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,0.08)",background:"rgba(22,22,35,0.97)",justifyContent:"center"}}>
            <div style={{width:72,flexShrink:0,padding:"7px 0 7px 20px",fontSize:9,color:T.text2,letterSpacing:"0.1em",textTransform:"uppercase"}}>Year</div>
            <div style={{width:1,height:28,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
            {firstEntry?.startAge && <>
              <div style={{width:56,flexShrink:0,padding:"7px 10px",fontSize:9,color:T.text2,letterSpacing:"0.1em",textTransform:"uppercase",textAlign:"center"}}>Age</div>
              <div style={{width:1,height:28,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
            </>}
            <div style={{width:120,flexShrink:0,padding:"7px 16px",fontSize:9,color:T.text2,letterSpacing:"0.1em",textTransform:"uppercase",textAlign:"right"}}>Salary</div>
            <div style={{width:1,height:28,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
            <div style={{width:130,flexShrink:0,padding:"7px 16px",fontSize:9,color:T.text2,letterSpacing:"0.1em",textTransform:"uppercase",textAlign:"right"}}>401k / yr</div>
            <div style={{width:1,height:28,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
            <div style={{width:160,flexShrink:0,padding:"7px 16px",fontSize:9,color:T.text2,letterSpacing:"0.1em",textTransform:"uppercase"}}>Home / Mortgage</div>
            <div style={{width:1,height:28,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
            <div style={{width:150,flexShrink:0,padding:"7px 16px",fontSize:9,color:T.text2,letterSpacing:"0.1em",textTransform:"uppercase"}}>Investments</div>
            <div style={{width:1,height:28,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>
            <div style={{width:190,flexShrink:0,padding:"7px 16px",fontSize:9,color:T.text2,letterSpacing:"0.1em",textTransform:"uppercase"}}>Other Events</div>
            <div style={{flex:1}}/>
          </div>
        </div>{/* end sticky header */}

        {/* Rows wrapper — rounded bottom, connects visually to sticky header above */}
        <div style={{
          border:"1px solid rgba(255,255,255,0.1)",
          borderTop:"none",
          borderRadius:"0 0 12px 12px",
          overflow:"hidden",
          marginBottom:"2rem",
          background:"rgba(255,255,255,0.04)",
        }}>
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
              // True if ANY event has been logged for this year (not just salary)
              const hasAnyEvent = !isFirst && (
                !!anchor ||
                contrib401k.some(e => e.year === year) ||
                investments.some(e => e.year === year) ||
                mortgages.some(m => m.year === year) ||
                lifeEvents.some(e => e.year === year)
              );

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
                      background: isOpen ? "rgba(129,140,248,0.1)" : activeYear && !isOpen ? "rgba(0,0,0,0.55)" : anchor ? "rgba(255,255,255,0.03)" : "transparent",
                      opacity: activeYear && !isOpen ? 0.35 : 1,
                      transition:"background 0.15s, opacity 0.15s",
                      pointerEvents: activeYear && !isOpen ? "none" : "auto",
                    }}
                    onMouseEnter={e=>{ if(!isOpen && !activeYear) e.currentTarget.style.background="rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e=>{ if(!isOpen && !activeYear) e.currentTarget.style.background= anchor ? "rgba(255,255,255,0.03)" : "transparent"; }}
                  >
                    {/* Year label + indicator */}
                    <div style={{width:72,flexShrink:0,padding:"12px 0 12px 20px",display:"flex",alignItems:"center",gap:8}}>
                      <div style={{
                        width:8, height:8, borderRadius:"50%", flexShrink:0,
                        background: (isFirst||isOpen||hasAnyEvent) ? T.gold : T.border,
                        boxShadow: (isFirst||isOpen||hasAnyEvent) ? `0 0 6px ${T.gold}88` : "none",
                      }}/>
                      <span style={{fontSize:12,fontWeight:(isFirst||isOpen||hasAnyEvent)?600:400, color:(isFirst||isOpen||hasAnyEvent)?"#fff":T.text2, fontFamily:"'Syne',sans-serif"}}>{year}</span>
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
                      {(() => {
                        const salChanged = anchor && anchor.type !== "start";
                        const prevSalary = prevSal;
                        const salArrow = salChanged && prevSalary && anchor.salary
                          ? (anchor.salary > prevSalary ? "▲" : anchor.salary < prevSalary ? "▼" : null)
                          : null;
                        const salArrowCol = salArrow === "▲" ? T.green : T.red;
                        return (
                          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:1}}>
                            <div style={{display:"flex",alignItems:"center",gap:3}}>
                              <span style={{fontSize:13,fontWeight:salChanged?600:500,color:salChanged?"#fff":anchor?T.text1:T.text2,fontFamily:"'Syne',sans-serif"}}>
                                {proj ? fmtK(proj) : "—"}
                              </span>
                              {salArrow && <span style={{fontSize:10,color:salArrowCol}}>{salArrow}</span>}
                            </div>
                            {salChanged && anchor?.raisePct && (
                              <span style={{fontSize:9,color:anchor.raisePct>=0?T.green:T.red}}>{anchor.raisePct>=0?"+":""}{anchor.raisePct.toFixed(1)}%</span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Vertical line */}
                    <div style={{width:1,height:44,background:"rgba(255,255,255,0.06)",flexShrink:0}}/>

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
                        // Compare to previous year's pct
                        const prevC = [...contrib401k].reverse().find(c => c.year < year);
                        const prevPct = prevC ? prevC.pct : 0;
                        const changed = isNew401k && pct !== prevPct;
                        const arrow = changed ? (pct > prevPct ? "▲" : "▼") : null;
                        const arrowColor = pct > prevPct ? T.green : T.red;
                        return pct > 0 ? (
                          <div>
                            <div style={{fontSize:12,color:changed?"#fff":T.text2,fontWeight:changed?600:400,display:"flex",alignItems:"center",gap:4}}>
                              {pct}% {matchAmt>0?<span style={{fontSize:9,color:changed?T.green:T.text2}}>+match</span>:null}
                              {arrow && <span style={{fontSize:9,color:arrowColor}}>{arrow}</span>}
                            </div>
                            <div style={{fontSize:10,color:T.text2}}>{changed?fmtK(total):`${fmtK(total)}`}</div>
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
                        const prevInv = [...investments].reverse().find(i => i.year < year);
                        const prevPct = prevInv ? prevInv.pct : 0;
                        const changed = isNew && inv.pct !== prevPct;
                        const arrow = changed ? (inv.pct > prevPct ? "▲" : "▼") : null;
                        const arrowCol = inv.pct > prevPct ? T.green : T.red;
                        return (
                          <div>
                            <div style={{fontSize:11,color:changed?"#fff":T.text2,fontWeight:changed?600:400,display:"flex",alignItems:"center",gap:4}}>
                              {inv.pct}% of salary
                              {arrow && <span style={{fontSize:9,color:arrowCol}}>{arrow}</span>}
                            </div>
                            <div style={{fontSize:10,color:T.text2}}>{snap ? fmtK(snap.investBalance) : "—"}</div>
                          </div>
                        );
                      })()}
                    </div>
                    {/* Other Events column */}
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
                        <span className={hasAnyEvent ? "" : "pulse-add"} style={{
                          fontSize:12, fontWeight:700, color:"#fff",
                          background: hasAnyEvent ? "rgba(255,255,255,0.1)" : T.accent,
                          border:`1px solid ${hasAnyEvent ? "rgba(255,255,255,0.2)" : T.accent}`,
                          borderRadius:6, padding:"4px 10px", transition:"background 0.2s",
                          fontFamily:"'Syne',sans-serif", letterSpacing:"0.02em",
                          whiteSpace:"nowrap",
                        }}>{hasAnyEvent ? "✏️ Edit" : "+ Add Event"}</span>
                      )}
                    </div>
                  </div>

                  {/* Expanded event form */}
                  {isOpen && (
                    <div style={{
                      background:"rgba(129,140,248,0.06)",
                      borderBottom:"1px solid rgba(129,140,248,0.2)",
                      padding:"6px 16px 10px 24px",
                      display:"flex",flexDirection:"column",gap:5,
                    }}>
                      {/* Year header */}
                      <div style={{fontSize:10,color:T.gold,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:2,paddingLeft:0}}>
                        {year}{startAge ? ` · Age ${startAge+(year-startYear)}` : ""} {proj ? `· ${fmt(proj)}/yr` : ""}
                      </div>
                      {/* ── 401k row ── */}
                      {(() => {
                        const cur401k = [...contrib401k].reverse().find(c=>c.year<=year);
                        const curPct = cur401k?cur401k.pct:0;
                        const sel = eventForm.k401Pct!==null?eventForm.k401Pct:curPct;
                        return (
                          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            <span style={{fontSize:11,color:"#fff",fontWeight:600,flexShrink:0,width:96}}>💼 401k{curPct>0?` (${curPct}%)`:""}</span>
                            {[0,1,2,3,4,5,6,7,8,9,10,12,15].map(p=>{
                              const on=sel===p;
                              return <button key={p} onClick={()=>setEventForm(f=>({...f,k401Pct:p}))} style={{padding:"3px 8px",fontSize:11,borderRadius:4,border:`1px solid ${on?(p===0?T.red:T.green):T.border}`,background:on?(p===0?T.redDim:T.greenDim):"transparent",color:on?(p===0?T.red:T.green):T.text2,cursor:"pointer"}}>{p===0?"None":`${p}%`}</button>;
                            })}
                            {/* Switch-style employer match toggle */}
                            <div style={{display:"flex",alignItems:"center",gap:5,marginLeft:8,flexShrink:0}}>
                              <button onClick={()=>setMatch401k(m=>({...m,enabled:!m.enabled}))} style={{
                                width:32,height:17,borderRadius:9,border:"none",cursor:"pointer",flexShrink:0,
                                background:match401k.enabled?T.green:"rgba(255,255,255,0.15)",
                                position:"relative",transition:"background 0.2s",padding:0,
                              }}>
                                <span style={{position:"absolute",top:2,left:match401k.enabled?17:2,width:13,height:13,borderRadius:"50%",background:"#fff",transition:"left 0.2s",display:"block"}}/>
                              </button>
                              <span style={{fontSize:10,color:match401k.enabled?T.green:T.text2,whiteSpace:"nowrap"}}>Match</span>
                            </div>
                            {match401k.enabled && [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(p=>{const on=match401k.upToPct===p;return <button key={p} onClick={()=>setMatch401k(m=>({...m,upToPct:p}))} style={{padding:"3px 6px",fontSize:10,borderRadius:4,border:`1px solid ${on?T.green:T.border}`,background:on?T.greenDim:"transparent",color:on?T.green:T.text2,cursor:"pointer"}}>{p}%</button>;})}
                          </div>
                        );
                      })()}

                      {/* ── Investments row ── */}
                      {(() => {
                        const curInv=[...investments].reverse().find(i=>i.year<=year);
                        const curPctInv=curInv?curInv.pct:0;
                        const sel=eventForm.investPct!==null?eventForm.investPct:curPctInv;
                        return (
                          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            <span style={{fontSize:11,color:"#fff",fontWeight:600,flexShrink:0,width:96}}>📈 Invest{curPctInv>0?` (${curPctInv}%)`:""}</span>
                            {[0,1,2,3,4,5,6,7,8,9,10,12,15].map(p=>{
                              const on=sel===p;
                              return <button key={p} onClick={()=>setEventForm(f=>({...f,investPct:p}))} style={{padding:"3px 8px",fontSize:11,borderRadius:4,border:`1px solid ${on?(p===0?T.red:T.gold):T.border}`,background:on?(p===0?T.redDim:T.goldDim):"transparent",color:on?(p===0?T.red:T.gold):T.text2,cursor:"pointer"}}>{p===0?"None":`${p}%`}</button>;
                            })}
                            <span style={{fontSize:10,color:"rgba(255,255,255,0.2)",flexShrink:0,margin:"0 2px"}}>|</span>
                            <span style={{fontSize:10,color:T.text2,flexShrink:0}}>Return:</span>
                            {[5,6,7,8,9,10,11,12,13,14,15].map(r=>{
                              const on=(eventForm.investReturn||7)===r;
                              return <button key={r} onClick={()=>setEventForm(f=>({...f,investReturn:r}))} style={{padding:"3px 6px",fontSize:10,borderRadius:4,border:`1px solid ${on?T.gold:T.border}`,background:on?T.goldDim:"transparent",color:on?T.gold:T.text2,cursor:"pointer"}}>{r}%</button>;
                            })}
                          </div>
                        );
                      })()}

                      {/* ── Home purchase row ── */}
                      {(() => {
                        const em=mortgages.find(m=>m.year===year);
                        const price=parseFloat(eventForm.homePrice);
                        const rate2=parseFloat(eventForm.mortgageRate);
                        let preview=null;
                        if(price>0&&rate2>0){const dpv=eventForm.downPct!==''&&!isNaN(parseFloat(eventForm.downPct))?parseFloat(eventForm.downPct):20;const loan=price*(1-dpv/100);const mr=rate2/100/12;const n=eventForm.mortgageTerm*12;const pmt=mr===0?loan/n:loan*mr*Math.pow(1+mr,n)/(Math.pow(1+mr,n)-1);preview=<span style={{fontSize:11,color:T.accent}}>Loan {fmtK(loan)} · {fmt(pmt)}/mo</span>;}
                        return (
                          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            <span style={{fontSize:11,color:"#fff",fontWeight:600,flexShrink:0,width:96}}>🏠 Home{em?` (${fmtK(em.price)})`:""}</span>
                            <input type="number" placeholder="Home price e.g. 450000" value={eventForm.homePrice} onChange={e=>setEventForm(f=>({...f,homePrice:e.target.value}))} style={{width:180}}/>
                            <input type="number" placeholder="% Down e.g. 20" value={eventForm.downPct} onChange={e=>setEventForm(f=>({...f,downPct:e.target.value}))} style={{width:120}}/>
                            <input type="number" placeholder="Interest rate e.g. 6.5" step="0.1" value={eventForm.mortgageRate} onChange={e=>setEventForm(f=>({...f,mortgageRate:e.target.value}))} style={{width:150}}/>
                            {[15,30].map(t=>{const on=eventForm.mortgageTerm===t;return <button key={t} onClick={()=>setEventForm(f=>({...f,mortgageTerm:t}))} style={{padding:"3px 8px",fontSize:10,borderRadius:4,border:`1px solid ${on?T.accent:T.border}`,background:on?T.accentDim:"transparent",color:on?T.accent:T.text2,cursor:"pointer"}}>{t}yr</button>;})}
                            {preview}
                            {em&&!eventForm.homePrice&&<button onClick={()=>setMortgages(p=>p.filter(m=>m.year!==year))} style={{fontSize:10,color:T.red,background:"transparent",border:`1px solid ${T.red}`,borderRadius:4,padding:"2px 6px",cursor:"pointer"}}>Remove</button>}
                            {/* Selling prev home */}
                            {price>0&&mortgages.some(m=>m.year<year)&&(()=>{
                              const snap=mortgageData.find(d=>d.year===year);
                              const eq=snap?snap.equity:0;
                              const invSnap=chartData.find(d=>d.year===year);
                              const iv=invSnap?invSnap.investBalance:0;
                              return <span style={{fontSize:10,color:"#a78bfa",flexShrink:0}}>
                                🏡 Equity {fmtK(eq)}
                                <label style={{marginLeft:6,cursor:"pointer"}}><input type="checkbox" checked={eventForm.useEquity} onChange={e=>setEventForm(f=>({...f,useEquity:e.target.checked}))} style={{accentColor:T.green,marginRight:3}}/>use</label>
                                {iv>0&&<label style={{marginLeft:6,cursor:"pointer"}}><input type="checkbox" checked={eventForm.useInvestments} onChange={e=>setEventForm(f=>({...f,useInvestments:e.target.checked}))} style={{accentColor:T.gold,marginRight:3}}/>invest {fmtK(iv)}</label>}
                              </span>;
                            })()}
                          </div>
                        );
                      })()}

                      {/* ── Life event row ── */}
                      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        <span style={{fontSize:11,color:"#fff",fontWeight:600,flexShrink:0,width:96}}>🎯 Life event</span>
                        {[["expense","💸",T.red,"Big Expense"],["extra-mortgage","🏠",T.accent,"Extra Mortgage"],["extra-invest","📈",T.gold,"Extra Investment"]].map(([val,icon,col,lbl])=>{
                          const on=eventForm.lifeType===val;
                          return <button key={val} onClick={()=>setEventForm(f=>({...f,lifeType:val}))} title={lbl} style={{padding:"3px 8px",fontSize:11,borderRadius:4,border:`1px solid ${on?col:T.border}`,background:on?col+"22":"transparent",color:on?col:T.text2,cursor:"pointer"}}>{icon} {on?lbl:""}</button>;
                        })}
                        <input type="text" placeholder="Description…" value={eventForm.lifeLabel} onChange={e=>setEventForm(f=>({...f,lifeLabel:e.target.value}))} style={{flex:1,minWidth:120}}/>
                        <input type="number" placeholder="Amount" value={eventForm.lifeAmount} onChange={e=>setEventForm(f=>({...f,lifeAmount:e.target.value}))} style={{width:90}}/>
                        {lifeEvents.filter(e=>e.year===year).map((ev,i)=>(
                          <span key={i} style={{fontSize:10,color:T.text2,display:"flex",alignItems:"center",gap:3}}>
                            {ev.type==="expense"?"💸":ev.type==="extra-mortgage"?"🏠":"📈"}{ev.label.slice(0,12)}
                            <button onClick={()=>{const t=ev;setLifeEvents(p=>{const idx=p.findIndex(e=>e===t);return idx>=0?[...p.slice(0,idx),...p.slice(idx+1)]:p;});}} style={{background:"transparent",border:"none",color:T.red,cursor:"pointer",fontSize:11}}>✕</button>
                          </span>
                        ))}
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
          </div>{/* end rows padding */}
        </div>{/* end rows wrapper */}
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

  const allRaw = [
    ...entries.filter(e => e.type !== "start").map(e => ({
      year:e.year, icon:e.type==="promotion"?"🏅":"🏢",
      label:e.type==="promotion"?`Promotion${e.role?" — "+e.role:""}`:`Job Change${e.role?" — "+e.role:""}${e.company?" @ "+e.company:""}`,
      color:T.accent,
    })),
    ...mortgages.map(m => ({ year:m.year, icon:"🏠", label:`Home — ${fmt(m.price)} at ${m.rate}%`, color:"#60a5fa" })),
    ...contrib401k.filter(e=>e.pct>0).map((e,i,arr) => {
      const prev = arr.slice(0,i).reverse().find(p=>p.year<e.year) || contrib401k.filter(x=>x.year<e.year).slice(-1)[0];
      const prevPct = prev ? prev.pct : 0;
      const arrow = e.pct > prevPct ? " ▲" : e.pct < prevPct ? " ▼" : "";
      const arrowColor = e.pct > prevPct ? "#4ade80" : "#f87171";
      return { year:e.year, icon:"💼", label:`401k ${e.pct}%${arrow}`, labelArrow:arrow, arrowColor, prevPct, color:T.green };
    }),
    ...investments.filter(e=>e.pct>0).map((e,i,arr) => {
      const prev = investments.filter(x=>x.year<e.year).slice(-1)[0];
      const prevPct = prev ? prev.pct : 0;
      const arrow = e.pct > prevPct ? " ▲" : e.pct < prevPct ? " ▼" : "";
      const arrowColor = e.pct > prevPct ? "#4ade80" : "#f87171";
      return { year:e.year, icon:"📈", label:`Invest ${e.pct}%${arrow}`, labelArrow:arrow, arrowColor, prevPct, color:T.gold };
    }),
    ...lifeEvents.map(e => ({
      year:e.year,
      icon:e.type==="expense"?"💸":e.type==="extra-mortgage"?"🏠":"📈",
      label:`${e.label}: ${e.type==="expense"?"-":"+"}$${e.amount.toLocaleString()}`,
      color:e.type==="expense"?T.red:e.type==="extra-mortgage"?"#60a5fa":T.gold,
    })),
  ];

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

  const byYear = {};
  for (const ev of allRaw) {
    if (!byYear[ev.year]) byYear[ev.year] = [];
    byYear[ev.year].push(ev);
  }
  const groups = Object.keys(byYear).map(y=>({ year:+y, events:byYear[y] })).sort((a,b)=>a.year-b.year);
  if (!groups.length) return null;

  const BUBBLE = 34, OVERLAP = 14;
  const getAge = year => startAge ? startAge+(year-startYear) : null;
  const getLabel = year => { const a=getAge(year); return a?`Age ${a}`:String(year); };

  // Proportional positioning based on year
  const firstYear = startYear;
  const lastYear  = groups[groups.length-1].year;
  const span = Math.max(lastYear - firstYear, 1);
  const toPct = year => ((year - firstYear) / span) * 100;

  return (
    <div style={{padding:"6px 8px 2px",position:"relative",width:"100%"}}>
      {/* Winding SVG path connecting events */}
      {/* Straight dashed line */}
      <div style={{
        position:"absolute",
        top: BUBBLE/2 + 6,
        left:8, right:8,
        borderTop:"2px dashed rgba(255,255,255,0.15)",
        pointerEvents:"none",
      }}/>

      {/* Events positioned proportionally */}
      <div style={{position:"relative",height: BUBBLE + (Math.max(...groups.map(g=>g.events.length))-1)*OVERLAP + 36, minHeight:80}}>
        {groups.map((g, gi) => {
          const isHov = hovered===gi;
          const multi = g.events.length > 1;
          const stackH = BUBBLE + (g.events.length-1)*OVERLAP;
          const domColor = g.events[0].color;
          const leftPct = toPct(g.year);

          return (
            <div key={gi}
              onMouseEnter={()=>setHovered(gi)}
              onMouseLeave={()=>setHovered(null)}
              style={{
                position:"absolute",
                left:`${leftPct}%`,
                transform:"translateX(-50%)",
                top:0,
                display:"flex",flexDirection:"column",alignItems:"center",gap:3,
                cursor:"default",zIndex:isHov?10:1,
                width:90,
              }}>
              {/* Stacked bubbles */}
              <div style={{position:"relative",width:BUBBLE,height:stackH,flexShrink:0}}>
                {g.events.map((ev,ei) => (
                  <div key={ei} style={{
                    position:"absolute",top:ei*OVERLAP,left:0,
                    width:BUBBLE,height:BUBBLE,borderRadius:"50%",
                    background:isHov?ev.color+"44":"rgba(0,0,0,0.6)",
                    border:`2px solid ${isHov?ev.color:ev.color+"99"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:14,transition:"all 0.15s",
                    zIndex:g.events.length-ei,
                    boxShadow:isHov?`0 0 10px ${ev.color}55`:"none",
                  }}>{ev.icon}</div>
                ))}
                {multi && (
                  <div style={{
                    position:"absolute",top:-4,right:-4,
                    width:16,height:16,borderRadius:"50%",
                    background:domColor,border:"1px solid rgba(0,0,0,0.5)",
                    fontSize:9,color:"#000",fontWeight:700,
                    display:"flex",alignItems:"center",justifyContent:"center",zIndex:20,
                  }}>{g.events.length}</div>
                )}
              </div>

              {/* Age label */}
              <div style={{fontSize:9,color:isHov?"rgba(255,255,255,0.6)":"rgba(255,255,255,0.28)",textAlign:"center",whiteSpace:"nowrap"}}>
                {getLabel(g.year)}
              </div>

              {/* Hover: show all event labels */}
              {isHov && (
                <div style={{
                  position:"absolute",top:"100%",
                  ...(gi===0 ? {left:0,transform:"none"} : gi===groups.length-1 ? {right:0,left:"auto",transform:"none"} : {left:"50%",transform:"translateX(-50%)"}),
                  background:T.bg2,border:`1px solid ${domColor}`,borderRadius:8,
                  padding:"6px 10px",zIndex:20,minWidth:140,maxWidth:220,
                  boxShadow:"0 4px 20px rgba(0,0,0,0.8)",
                }}>
                  {g.events.map((ev,ei)=>(
                    <div key={ei} style={{fontSize:10,lineHeight:1.4,whiteSpace:"normal",wordBreak:"break-word",padding:"1px 0",display:"flex",alignItems:"center",gap:3}}>
                      {ev.labelArrow ? (
                        <>
                          <span style={{color:ev.color}}>{ev.label.replace(ev.labelArrow,"")}</span>
                          <span style={{color:ev.arrowColor,fontWeight:700}}>{ev.labelArrow.trim()}</span>
                        </>
                      ) : (
                        <span style={{color:ev.color}}>{ev.label}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
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
  const [navExpanded, setNavExpanded] = useState(false);
  const [navShimmer, setNavShimmer] = useState(false);
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
      <div style={{display:"flex",height:"100vh",overflow:"hidden",position:"relative"}}>


        {/* Sidebar — collapses to icon-only when mouse leaves */}
        <aside
          onMouseEnter={()=>{ setNavExpanded(true); setNavShimmer(true); setTimeout(()=>setNavShimmer(false), 800); }}
          onMouseLeave={()=>setNavExpanded(false)}
          style={{
            width: navExpanded ? 220 : 52,
            minWidth: navExpanded ? 220 : 52,
            background:T.sidebar,
            borderRight:`1px solid ${T.border}`,
            display:"flex",flexDirection:"column",flexShrink:0,
            transition:"width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)",
            overflow:"hidden",
            position:"relative",
          }}
          className={navShimmer ? "nav-shimmer" : ""}>

          {/* Header */}
          <div style={{padding:"1.2rem 0",borderBottom:`1px solid ${T.border}`,display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,minHeight:72}}>
            {navExpanded ? (
              <div style={{padding:"0 1rem",width:"100%"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:800,color:T.text0,lineHeight:1.25}}>My Financial</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:800,color:T.text0,lineHeight:1.25}}>Roadmap</div>
                <div style={{fontSize:10,color:T.text2,marginTop:3}}>By Dallin Stout</div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:0}}>
                {["M","F","R"].map((letter,i) => (
                  <div key={i} style={{fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:800,color:T.text0,lineHeight:1.15}}>{letter}</div>
                ))}
                <div style={{fontSize:9,color:T.text2,marginTop:3,letterSpacing:"0.04em"}}>By DS</div>
              </div>
            )}
          </div>

          {/* Nav items */}
          <nav style={{padding:"0.5rem 0",flex:1,overflowY:"auto",overflowX:"hidden"}}>
            {NAV_SECTIONS.map(sec => (
              <div key={sec.label||"top"} style={{marginBottom:"0.25rem"}}>
                {sec.label && navExpanded && (
                  <div style={{fontSize:9,color:T.text2,letterSpacing:"0.14em",textTransform:"uppercase",padding:"0 0.75rem",marginBottom:4,marginTop:8,whiteSpace:"nowrap"}}>{sec.label}</div>
                )}
                {sec.items.map(item => {
                  const on = active===item.id;
                  return (
                    <button key={item.id} onClick={()=>setActive(item.id)} title={item.label} style={{
                      display:"flex",alignItems:"center",
                      justifyContent: navExpanded ? "flex-start" : "center",
                      gap:10,width:"100%",
                      padding: navExpanded ? "8px 14px" : "10px 0",
                      borderRadius:0,border:"none",fontSize:13,textAlign:"left",
                      transition:"all 0.15s",marginBottom:1,position:"relative",
                      background:on?T.accentDim:"transparent",
                      color:on?T.accent:T.text1,fontWeight:on?500:400,
                    }}
                      onMouseEnter={e=>{if(!on)e.currentTarget.style.background=T.bg3;}}
                      onMouseLeave={e=>{if(!on)e.currentTarget.style.background="transparent";}}>
                      {on && navExpanded && <span style={{position:"absolute",left:0,top:"20%",bottom:"20%",width:3,borderRadius:"0 2px 2px 0",background:T.accent}}/>}
                      {on && !navExpanded && <span style={{position:"absolute",left:0,top:"20%",bottom:"20%",width:3,borderRadius:"0 2px 2px 0",background:T.accent}}/>}
                      <span style={{fontSize:navExpanded?15:18,opacity:on?1:0.6,flexShrink:0}}>{item.icon}</span>
                      {navExpanded && <span style={{whiteSpace:"nowrap"}}>{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {navExpanded && (
            <div style={{padding:"0.9rem 1rem",borderTop:`1px solid ${T.border}`,fontSize:10,color:T.text2,whiteSpace:"nowrap"}}>v0.2 · in progress</div>
          )}
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
