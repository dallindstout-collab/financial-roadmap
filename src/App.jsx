import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
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
  home:         "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80",
  salary:       "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80",
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
const FINNHUB_KEY = "d8dnuvhr01qhm4ag7qe0d8dnuvhr01qhm4ag7qeg";
const TICKERS = ["VOO","QQQ","DIA","VTI","VXUS","VT"];

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
      borderRadius:10, padding:"1rem 1.25rem", backdropFilter:"blur(8px)",
    }}>
      <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>{label}</div>
      <div style={{fontSize:20,fontWeight:500,color:"#fff",letterSpacing:"-0.02em",fontFamily:"'Syne',sans-serif"}}>{value}</div>
      {sub && <div style={{fontSize:11,color:subColor||"rgba(255,255,255,0.4)",marginTop:4}}>{sub}</div>}
    </div>
  );
}

// Glass card
function Card({ children, style={}, className="" }) {
  return (
    <div className={className} style={{
      background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
      borderRadius:12, padding:"1.25rem", marginBottom:"1.5rem",
      backdropFilter:"blur(10px)", ...style,
    }}>
      {children}
    </div>
  );
}

// Chart tooltip
function SalTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{background:T.bg2,border:`1px solid ${T.borderHi}`,borderRadius:8,padding:"12px 16px",fontSize:12,boxShadow:"0 8px 32px rgba(0,0,0,0.6)",minWidth:160}}>
      <div style={{color:T.text1,marginBottom:6,fontSize:11}}>
        {d.fullLabel}
        {d.projected && <span style={{marginLeft:8,color:T.gold,fontSize:10,background:T.goldDim,padding:"1px 6px",borderRadius:3}}>PROJ</span>}
      </div>
      <div style={{color:d.projected?T.gold:"#fff",fontSize:18,fontWeight:500}}>{fmt(d.salary)}</div>
      {d.role && d.role!=="Role not specified" && <div style={{color:T.accent,fontSize:11,marginTop:4}}>{d.role}</div>}
      {d.company && <div style={{color:T.text2,fontSize:11}}>{d.company}</div>}
      {d.change !== null && (
        <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.border}`,color:d.change>=0?T.green:T.red,fontSize:12}}>
          {d.change>=0?"▲ +":"▼ "}{fmt(Math.abs(d.change))}
          <span style={{color:T.text1,marginLeft:6}}>({d.change>=0?"+":""}{d.changePct.toFixed(1)}%)</span>
        </div>
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
   SALARY PANEL
───────────────────────────────────────────────────────────── */
function SalaryPanel() {
  const today = new Date().toISOString().slice(0,7);
  const [entries,  setEntries]  = useState([]);
  const [view,     setView]     = useState("area");
  const [rate,     setRate]     = useState(3);
  const [form,     setForm]     = useState({ date:today, salary:"", role:"", company:"" });
  const [error,    setError]    = useState("");

  const cd   = buildChartData(entries, rate);
  const last  = entries.length ? entries[entries.length-1] : null;
  const first = entries.length ? entries[0] : null;
  const growth = entries.length>1 ? (last.salary-first.salary)/first.salary*100 : null;
  const proj   = last ? last.salary*(1+rate/100) : null;
  const peak   = entries.length ? Math.max(...entries.map(e=>e.salary)) : null;

  const addEntry = () => {
    if (!form.date || !form.salary || isNaN(+form.salary) || +form.salary<=0) { setError("Date and a valid salary are required."); return; }
    setError("");
    setEntries(p => [...p, { date:form.date, salary:+form.salary, role:form.role.trim()||"Role not specified", company:form.company.trim() }]
      .sort((a,b)=>a.date.localeCompare(b.date)));
    setForm({ date:today, salary:"", role:"", company:"" });
  };
  const del = i => setEntries(p => p.filter((_,j)=>j!==i));

  const CDot = ({cx,cy,payload}) => payload.projected
    ? <circle cx={cx} cy={cy} r={2} fill={T.gold} opacity={0.5}/>
    : <circle cx={cx} cy={cy} r={5} fill={T.accent} stroke={T.bg0} strokeWidth={2}/>;
  const ADot = ({cx,cy,payload}) => payload.projected
    ? <circle cx={cx} cy={cy} r={4} fill={T.gold} stroke={T.bg0} strokeWidth={2}/>
    : <circle cx={cx} cy={cy} r={7} fill={T.accent} stroke={T.bg0} strokeWidth={2}/>;

  const tfmt = (_,i) => { const p=cd[i]; return p&&!p.projected?p.label:""; };
  const axP  = { tickLine:false, axisLine:false };
  const xT   = { fill:T.text2, fontSize:11, fontFamily:"DM Mono" };
  const yT   = { fill:T.text2, fontSize:11, fontFamily:"DM Mono" };

  const vBtn = v => ({
    padding:"4px 12px", fontSize:11, borderRadius:6, letterSpacing:"0.06em", textTransform:"uppercase",
    background:view===v?T.bg3:"transparent", border:`1px solid ${view===v?T.borderHi:T.border}`,
    color:view===v?T.text0:T.text2, transition:"all 0.15s",
  });

  const emptyChart = (
    <div style={{height:260,display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.2)",fontSize:12,letterSpacing:"0.06em",border:"1px dashed rgba(255,255,255,0.1)",borderRadius:8}}>
      ADD ENTRIES TO VISUALIZE YOUR TRAJECTORY
    </div>
  );

  return (
    <BgPanel id="salary" scroll>
      <div style={{padding:"2rem 2.5rem 4rem"}}>

        {/* Header */}
        <div className="fu" style={{marginBottom:"2rem"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:4}}>
            <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,color:"#fff",letterSpacing:"-0.03em"}}>
              Salary<span style={{color:T.accent}}>.</span>
            </h1>
            {last && <span style={{fontSize:13,color:"rgba(255,255,255,0.4)",borderLeft:"2px solid rgba(255,255,255,0.15)",paddingLeft:12}}>{fmt(last.salary)} / yr</span>}
          </div>
          <p style={{color:"rgba(255,255,255,0.3)",fontSize:11,letterSpacing:"0.06em"}}>COMPENSATION HISTORY TRACKER</p>
        </div>

        {/* Metrics */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:"1.5rem"}}>
          <Metric delay={1} label="Current"      value={last?fmt(last.salary):"—"} sub={last?.role!=="Role not specified"?last?.role:null} subColor={T.accent}/>
          <Metric delay={2} label="Starting"     value={first?fmt(first.salary):"—"}/>
          <Metric delay={3} label="Total Growth" value={growth!==null?(growth>=0?"+":"")+growth.toFixed(1)+"%":"—"} subColor={growth>=0?T.green:T.red} sub={growth!==null?(growth>=0?"▲ up":"▼ down"):null}/>
          <Metric delay={4} label="Peak"         value={peak?fmt(peak):"—"}/>
          <Metric delay={5} label={`Next yr @${rate}%`} value={proj?fmt(proj):"—"} subColor={T.gold} sub={proj&&last?"+"+fmt(proj-last.salary):null}/>
        </div>

        {/* Raise Rate */}
        <Card className="fu fu3">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
            <div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:3}}>Annual Raise Rate</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.35)"}}>Compounds monthly between data points</div>
            </div>
            <div style={{fontSize:26,fontWeight:700,fontFamily:"'Syne',sans-serif",color:rate===0?T.text2:T.gold,letterSpacing:"-0.02em"}}>{rate.toFixed(1)}%</div>
          </div>
          <input type="range" min={0} max={25} step={0.5} value={rate} onChange={e=>setRate(+e.target.value)}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:8,alignItems:"center"}}>
            <span style={{fontSize:10,color:T.text2}}>0%</span>
            <div style={{display:"flex",gap:6}}>
              {[3,5,7,10,15].map(v=>(
                <button key={v} onClick={()=>setRate(v)} style={{background:rate===v?T.goldDim:"transparent",border:`1px solid ${rate===v?T.gold:T.border}`,color:rate===v?T.gold:T.text2,borderRadius:4,padding:"2px 8px",fontSize:11,transition:"all 0.15s"}}>{v}%</button>
              ))}
            </div>
            <span style={{fontSize:10,color:T.text2}}>25%</span>
          </div>
        </Card>

        {/* Chart */}
        <Card className="fu fu4">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.25rem"}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase"}}>Compensation Over Time</span>
            <div style={{display:"flex",gap:4}}>
              {["area","line","bar"].map(v=><button key={v} onClick={()=>setView(v)} style={vBtn(v)}>{v}</button>)}
            </div>
          </div>
          {cd.length===0 ? emptyChart : (
            <ResponsiveContainer width="100%" height={260}>
              {view==="bar" ? (
                <BarChart data={cd} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false}/>
                  <XAxis dataKey="label" tickFormatter={tfmt} tick={xT} {...axP} interval={0}/>
                  <YAxis tickFormatter={fmtK} tick={yT} {...axP} width={60}/>
                  <Tooltip content={<SalTip/>} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
                  <Bar dataKey="salary" radius={[3,3,0,0]} shape={({x,y,width,height,payload})=>(
                    <rect x={x} y={y} width={width} height={height} rx={3} fill={payload.projected?T.gold:T.accent} opacity={payload.projected?0.45:1}/>
                  )}/>
                </BarChart>
              ) : view==="line" ? (
                <LineChart data={cd}>
                  <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false}/>
                  <XAxis dataKey="label" tickFormatter={tfmt} tick={xT} {...axP} interval={0}/>
                  <YAxis tickFormatter={fmtK} tick={yT} {...axP} width={60}/>
                  <Tooltip content={<SalTip/>}/>
                  <Line type="monotone" dataKey="salary" stroke={T.accent} strokeWidth={2} dot={<CDot/>} activeDot={<ADot/>}/>
                </LineChart>
              ) : (
                <AreaChart data={cd}>
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={T.accent} stopOpacity={0.25}/>
                      <stop offset="100%" stopColor={T.accent} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={T.border} vertical={false}/>
                  <XAxis dataKey="label" tickFormatter={tfmt} tick={xT} {...axP} interval={0}/>
                  <YAxis tickFormatter={fmtK} tick={yT} {...axP} width={60}/>
                  <Tooltip content={<SalTip/>}/>
                  <Area type="monotone" dataKey="salary" stroke={T.accent} strokeWidth={2} fill="url(#sg)" dot={<CDot/>} activeDot={<ADot/>}/>
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </Card>

        {/* Add Entry */}
        <Card className="fu fu5">
          <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"1rem"}}>Add Entry</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 2fr auto",gap:10,marginBottom:10,alignItems:"end"}}>
            <div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>DATE</div>
              <input type="month" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/>
            </div>
            <div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>ANNUAL ($)</div>
              <input type="number" placeholder="95000" value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})} onKeyDown={e=>e.key==="Enter"&&addEntry()}/>
            </div>
            <div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>ROLE / TITLE</div>
              <input type="text" placeholder="Senior Engineer" value={form.role} onChange={e=>setForm({...form,role:e.target.value})} onKeyDown={e=>e.key==="Enter"&&addEntry()}/>
            </div>
            <button onClick={addEntry} style={{padding:"9px 20px",background:T.accent,border:"none",borderRadius:6,color:"#fff",fontSize:13,fontWeight:500,letterSpacing:"0.04em",transition:"opacity 0.15s",whiteSpace:"nowrap"}}
              onMouseOver={e=>e.currentTarget.style.opacity=0.8}
              onMouseOut={e=>e.currentTarget.style.opacity=1}>
              + ADD
            </button>
          </div>
          <div style={{maxWidth:260}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.35)",marginBottom:5,letterSpacing:"0.08em"}}>COMPANY (optional)</div>
            <input type="text" placeholder="Acme Corp" value={form.company} onChange={e=>setForm({...form,company:e.target.value})} onKeyDown={e=>e.key==="Enter"&&addEntry()}/>
          </div>
          {error && <div style={{marginTop:10,fontSize:12,color:T.red}}>{error}</div>}
        </Card>

        {/* History */}
        <Card className="fu fu6" style={{padding:0,overflow:"hidden",marginBottom:0}}>
          <div style={{padding:"1rem 1.25rem",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",textTransform:"uppercase"}}>
              History — {entries.length} {entries.length===1?"entry":"entries"}
            </span>
            {rate>0 && <span style={{fontSize:11,color:T.gold,background:T.goldDim,padding:"3px 10px",borderRadius:4}}>+{rate}% / yr compounding</span>}
          </div>
          {entries.length===0 ? (
            <div style={{padding:"3rem",textAlign:"center",color:"rgba(255,255,255,0.2)",fontSize:12,letterSpacing:"0.06em"}}>NO ENTRIES YET</div>
          ) : (
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
                  {["Date","Role","Company","Salary","Change",""].map(h=>(
                    <th key={h} style={{padding:"10px 16px",textAlign:"left",fontSize:10,color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:400}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e,i)=>{
                  const prev = i>0?entries[i-1].salary:null;
                  const ch   = prev!==null?e.salary-prev:null;
                  const cp   = ch!==null?ch/prev*100:null;
                  return (
                    <tr key={i} style={{borderBottom:i<entries.length-1?"1px solid rgba(255,255,255,0.06)":"none",transition:"background 0.1s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.04)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{padding:"12px 16px",fontSize:12,color:"rgba(255,255,255,0.5)",whiteSpace:"nowrap"}}>{fullLbl(e.date)}</td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#fff"}}>{e.role!=="Role not specified"?e.role:<span style={{color:T.text2}}>—</span>}</td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"rgba(255,255,255,0.5)"}}>{e.company||<span style={{color:T.text2}}>—</span>}</td>
                      <td style={{padding:"12px 16px",fontSize:13,color:"#fff",fontWeight:500,whiteSpace:"nowrap"}}>{fmt(e.salary)}</td>
                      <td style={{padding:"12px 16px",whiteSpace:"nowrap"}}>
                        {ch!==null
                          ? <span style={{fontSize:12,color:ch>=0?T.green:T.red,background:ch>=0?T.greenDim:T.redDim,padding:"3px 8px",borderRadius:4}}>{ch>=0?"+":""}{cp.toFixed(1)}%</span>
                          : <span style={{color:T.text2,fontSize:12}}>baseline</span>}
                      </td>
                      <td style={{padding:"12px 16px",textAlign:"right"}}>
                        <button onClick={()=>del(i)} style={{background:"transparent",border:`1px solid ${T.border}`,borderRadius:4,color:T.text2,fontSize:12,padding:"3px 8px",transition:"all 0.15s"}}
                          onMouseOver={e=>{e.currentTarget.style.borderColor=T.red;e.currentTarget.style.color=T.red;}}
                          onMouseOut={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text2;}}>del</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

      </div>
    </BgPanel>
  );
}

/* ─────────────────────────────────────────────────────────────
   NAV
───────────────────────────────────────────────────────────── */
const NAV_SECTIONS = [
  { label: null, items: [
    { id:"home", label:"Home", icon:"🏔" },
  ]},
  { label: "Modules", items: [
    { id:"salary",       label:"Salary",        icon:"💵" },
    { id:"emergencyfund",label:"Emergency Fund", icon:"🛡️" },
    { id:"realestate",   label:"Real Estate",    icon:"🏠" },
    { id:"investments",  label:"Investments",    icon:"📈" },
    { id:"retirement",   label:"Retirement",     icon:"⏳" },
    { id:"futureevents", label:"Future Events",  icon:"📅" },
    { id:"networth",     label:"Net Worth",      icon:"💼" },
  ]},
];

/* ─────────────────────────────────────────────────────────────
   APP
───────────────────────────────────────────────────────────── */
export default function App() {
  const [active, setActive] = useState("home");

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
          <main style={{flex:1,overflow:"hidden"}}>
            {active==="home"          && <HomePanel/>}
            {active==="salary"        && <SalaryPanel/>}
            {active==="emergencyfund" && <PlaceholderPanel id="emergencyfund" title="Emergency Fund" desc="Track your emergency fund balance, target months of expenses, and progress toward your safety net goal."/>}
            {active==="realestate"    && <PlaceholderPanel id="realestate"    title="Real Estate"    desc="Track properties, mortgage balances, equity, and rental income over time."/>}
            {active==="investments"   && <PlaceholderPanel id="investments"   title="Investments"    desc="Monitor your portfolio — stocks, ETFs, crypto, and other assets."/>}
            {active==="retirement"    && <PlaceholderPanel id="retirement"    title="Retirement"     desc="Project your 401(k), IRA, and retirement timeline."/>}
            {active==="futureevents"  && <PlaceholderPanel id="futureevents"  title="Future Events"  desc="Plan for big purchases, education costs, travel, and life milestones."/>}
            {active==="networth"      && <PlaceholderPanel id="networth"      title="Net Worth"      desc="A unified view of all your assets minus liabilities."/>}
          </main>
        </div>
      </div>
    </>
  );
}
