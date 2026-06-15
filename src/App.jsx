import { useState, useCallback, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Customized } from "recharts";

const T = {
  bg:"#0d0d14", bg2:"#12121e", bg3:"#1a1a2a",
  border:"rgba(255,255,255,0.09)", border2:"rgba(255,255,255,0.15)",
  text:"#f0f0f2", text1:"#9090a0", text2:"#55556a",
  accent:"#818cf8", accentD:"rgba(129,140,248,0.15)",
  gold:"#fbbf24", goldD:"rgba(251,191,36,0.15)",
  green:"#4ade80", greenD:"rgba(74,222,128,0.15)",
  red:"#f87171",
};

const fmt  = v => "$" + Math.round(v).toLocaleString();
const fmtK    = v => v >= 1e6 ? "$"+(v/1e6).toFixed(1)+"M" : v >= 1000 ? "$"+(Math.round(v/1000))+"k" : "$"+Math.round(v);
const fmtFull = v => "$" + Math.round(v).toLocaleString();


const BG = {
  roadmap: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80",
  budget:  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1920&q=80",
  profile: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1920&q=80",
};
function InPlotLegend({ items }) {
  return ({ xAxisMap, margin }) => {
    const plotLeft = (margin?.left || 0) + (Object.values(xAxisMap || {})[0]?.x || 70) + 8;
    const plotTop  = (margin?.top  || 0) + 10;
    return (
      <g>
        {items.map((item, i) => (
          <g key={i} transform={`translate(${plotLeft}, ${plotTop + i * 17})`}>
            <rect x={0} y={-5} width={14} height={3} fill={item.color} rx={1} opacity={0.9}/>
            <text x={18} y={0} fill="rgba(255,255,255,0.75)" fontSize={10} fontFamily="monospace">{item.name}</text>
          </g>
        ))}
      </g>
    );
  };
}

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%}
body{background:#0d0d14;color:#f0f0f2;font-family:'DM Mono',monospace,system-ui;font-size:14px}
input[type=number],input[type=text]{background:#1a1a2a;border:1px solid rgba(255,255,255,0.12);border-radius:5px;color:#f0f0f2;font-family:inherit;font-size:13px;padding:7px 10px;width:100%;outline:none}
input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
input[type=number]{-moz-appearance:textfield}
input:focus{border-color:#818cf8}
input::placeholder{color:#55556a}
button{cursor:pointer;font-family:inherit}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2a2a3a;border-radius:2px}
@keyframes pulse{0%,100%{box-shadow:0 0 8px rgba(129,140,248,0.3)}50%{box-shadow:0 0 18px rgba(129,140,248,0.6)}}
@keyframes ticker-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.ticker-track{display:inline-flex;animation:ticker-scroll 120s linear infinite;white-space:nowrap}
.ticker-track:hover{animation-play-state:paused}
.pulse-btn{animation:pulse 2.5s ease-in-out infinite}
.dual-range-wrap{position:relative;height:24px;display:flex;align-items:center}
.dual-range-track{position:absolute;left:0;right:0;height:4px;border-radius:2px;background:rgba(255,255,255,0.12)}
.dual-range-fill{position:absolute;height:4px;border-radius:2px;background:#818cf8}
.dual-range-wrap input[type=range]{position:absolute;width:100%;height:24px;opacity:0;pointer-events:none;margin:0}
.dual-range-wrap input[type=range]::-webkit-slider-thumb{width:16px;height:16px;border-radius:50%;cursor:pointer;pointer-events:all;-webkit-appearance:none;background:#818cf8;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)}
.dual-range-wrap input[type=range]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;cursor:pointer;pointer-events:all;background:#818cf8;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)}
@keyframes shimmer{0%{left:-150%}100%{left:250%}}
.nav-shimmer{position:relative;overflow:hidden}
.nav-shimmer::after{content:"";position:absolute;top:0;left:-150%;width:120%;height:100%;background:linear-gradient(105deg,transparent 20%,rgba(255,255,255,0.18) 35%,rgba(255,255,255,0.85) 50%,rgba(255,255,255,0.18) 65%,transparent 80%);animation:shimmer 1.3s ease forwards;pointer-events:none}
`;

function projectedSalaryAtYear(entries, growthRate, year) {
  if (!entries.length) return null;
  const anchors = entries.filter(e => e.year <= year);
  if (!anchors.length) return null;
  const base = anchors[anchors.length - 1];
  const yrs = year - base.year;
  return base.salary * Math.pow(1 + growthRate / 100, yrs);
}

function buildChartData(entries, growthRate, investReturn, savingsReturn, withdrawalRate, startYear, contrib401k, match401k, investments, savingsList, lifeEvents, retireYear, retireEnabled) {
  if (!entries.length) return [];
  const pts = [];
  let k401 = 0, invest = 0, savBal = 0;
  const sa = entries[0]?.startAge || null; const careerEnd = sa ? startYear + Math.max(0, 100 - sa) : startYear + 99;
  for (let y = startYear; y <= careerEnd; y++) {
    const sal = projectedSalaryAtYear(entries, growthRate, y) || 0;
    const isRetired = retireEnabled && retireYear && y >= retireYear;
    const isRetireYear = retireEnabled && retireYear && y === retireYear;
    if (isRetireYear && invest > 0) { k401 += invest; invest = 0; }
    const k4 = isRetired ? 0 : (() => { const c = [...contrib401k].reverse().find(c => c.year <= y); return c ? c.pct : 0; })();
    const inv = isRetired ? 0 : (() => { const i = [...investments].reverse().find(i => i.year <= y); return i ? i.pct : 0; })();
    const matchAmt = (match401k.enabled && k4 > 0) ? sal * Math.min(k4, match401k.upToPct) / 100 : 0;
    const k4Annual = sal * k4 / 100 + matchAmt;
    const invAnnual = sal * inv / 100;
    const extraInvest = (lifeEvents || []).filter(e => e.year === y && e.type === "extra-invest").reduce((s, e) => s + e.amount, 0);
    const extraExpense = (lifeEvents || []).filter(e => e.year === y && e.type === "expense").reduce((s, e) => s + e.amount, 0);
    const drawdown = (isRetired && k401 > 0) ? k401 * (withdrawalRate / 100) : 0;
    const k401Growth = 1 + investReturn / 100;
    if (isRetired) {
      k401 = Math.max(0, (k401 - drawdown) * k401Growth);
    } else {
      k401 = (k401 + k4Annual) * k401Growth;
    }
    invest = (invest + invAnnual + extraInvest - extraExpense) * (1 + investReturn / 100);
    const savPct = (savingsList||[]).length ? ([...(savingsList||[])].reverse().find(s=>s.year<=y)?.pct||0) : 0;
    const savAnnual = isRetired ? 0 : sal * savPct / 100;
    savBal = (savBal + savAnnual) * (1 + savingsReturn / 100);
    const anchor = entries.find(e => e.year === y);
    pts.push({ year: y, salary: Math.round(sal), k401: Math.round(k401), k401Annual: Math.round(k4Annual), invest: Math.round(invest), investAnnual: Math.round(invAnnual), k401Pct: k4, investPct: inv, isRetired, drawdown: Math.round(drawdown), isEvent: !!anchor, savBal: Math.round(savBal), savAnnual: Math.round(savAnnual||0), savPct: savPct||0 });
  }
  return pts;
}

function buildMortgageData(mortgages, startYear, maxYear, lifeEvents, homeAppreciation) {
  if (!mortgages.length) return [];
  const sorted = [...mortgages].sort((a, b) => a.year - b.year);
  const pts = [];
  for (let y = startYear; y < sorted[0].year; y++) pts.push({ year: y, balance: 0, interest: 0, mktVal: 0, equity: 0, noLoan: true });
  for (let hi = 0; hi < sorted.length; hi++) {
    const m = sorted[hi];
    const nextHome = sorted[hi + 1] || null;
    const homeEnd = nextHome ? nextHome.year - 1 : maxYear;
    const principal = m.loanAmount ? m.loanAmount : Math.max(0, m.price * (1 - m.downPct / 100));
    const mr = m.rate / 100 / 12;
    const n = (m.termYears || 30) * 12;
    const pmt = mr === 0 ? principal / n : principal * mr * Math.pow(1 + mr, n) / (Math.pow(1 + mr, n) - 1);
    let bal = principal;
    for (let y = m.year; y <= homeEnd; y++) {
      const yrs = y - m.year;
      const mktVal = Math.round(m.price * Math.pow(1 + (homeAppreciation||3) / 100, yrs));
      // Purchase year: loan hasn't started yet — zero all lines so they all begin together at year+1
      if (y === m.year) {
        pts.push({ year: y, balance: 0, interest: 0, mktVal: 0, equity: 0, noLoan: true, isEvent: true });
        continue;
      }
      // Paid off or last year of term
      if (yrs >= (m.termYears || 30) || bal <= 0) {
        pts.push({ year: y, balance: 0, interest: 0, mktVal, equity: mktVal, paidOff: true });
        continue;
      }
      // Normal payment year
      let b = bal;
      for (let mo = 0; mo < 12; mo++) b = Math.max(0, b - (pmt - b * mr));
      const extra = (lifeEvents || []).filter(e => e.year === y && e.type === "extra-mortgage").reduce((s, e) => s + e.amount, 0);
      b = Math.max(0, b - extra);
      bal = b;
      const remaining = Math.max(0, pmt * Math.max(0, n - yrs * 12) - bal);
      pts.push({ year: y, balance: Math.round(bal), interest: Math.round(remaining), mktVal, equity: Math.round(mktVal - bal) });
    }
  }
  return pts;
}

const NAV = [
  { id: "roadmap", label: "Roadmap", icon: "🗺️" },
  { id: "budget",  label: "Budget",  icon: "💰" },
  { id: "profile", label: "Profile", icon: "👤" },
];

const INIT_STATE = {
  savedFhList: [],
  entries: [], startYear: new Date().getFullYear(),
  setupForm: { year: String(new Date().getFullYear()), age: "", salary: "" },
  contrib401k: [], match401k: { enabled: false, matchPct: 100, upToPct: 5 },
  mortgages: [], investments: [], savings: [], lifeEvents: [],
  retireYear: null, retireEnabled: false,
  assumptions: { salaryGrowth: 3, investReturn: 7, inflation: 3, homeAppreciation: 3, withdrawalRate: 4, mortgageTerm: 30, capGainsPct: 20, buySellPct: 10, savingsReturn: 4.5 },
};

function Tip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: T.gold, marginBottom: 4, fontWeight: 600 }}>Age {d.age ?? d.year}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {fmtK(p.value)}</div>)}
    </div>
  );
}

function PctTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: T.gold, marginBottom: 4, fontWeight: 600 }}>Age {d.age ?? d.year}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: {p.value}%</div>)}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: "rgba(6,6,16,0.72)", border: `1px solid ${T.border}`, borderRadius: 10, padding: "0.6rem", display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 11, color: T.text1, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6, textAlign: "center" }}>{title}</div>
      {children}
    </div>
  );
}

function RoadmapPanel({ state, setState }) {
  const [showSetup, setShowSetup]   = useState(true);
  const [setupErr, setSetupErr]     = useState("");
  const [activeYear, setActiveYear] = useState(null);
  const [showSpreadsheet, setShowSpreadsheet] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [draftAssumptions, setDraftAssumptions] = useState(null);
  const [showFutureHome, setShowFutureHome] = useState(false);
  const [fhForm, setFhForm] = useState({ rate: "", portPct: "", equityPct: "", dti: "", savingsPct: "", targetAge: "" });
  const savedFhList = state.savedFhList || [];
  const setSavedFhList = v => setState(s => ({ ...s, savedFhList: typeof v==='function' ? v(s.savedFhList||[]) : v }));
  const [activeFhIdx, setActiveFhIdx] = useState(null);
  const [editingFhIdx, setEditingFhIdx] = useState(null);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd,   setRangeEnd]   = useState(100);

  const [eventForm, setEventForm]   = useState({ pct: "", salary: "", k401Pct: "", matchPct: "", investPct: "", savingsPct: "", homePrice: "", mortgageRate: "", portPct: "", dtiPct: "", useEquity: false, lifeLabel: "", lifeAmount: "", lifeType: "expense", retireToggle: false });

  const { entries, startYear, setupForm, contrib401k, match401k, mortgages, investments, savings, lifeEvents, retireYear, retireEnabled, assumptions } = state;
  const set = (key, val) => setState(s => ({ ...s, [key]: val }));
  const setAssumptions = patch => setState(s => ({ ...s, assumptions: { ...s.assumptions, ...patch } }));
  const setSavings = v => setState(s => ({ ...s, savings: typeof v==="function" ? v(s.savings) : v }));

  const hasStart = entries.length > 0;
  const firstEntry = hasStart ? entries[0] : null;
  const startAge = firstEntry?.startAge || null;
  const maxYear = startAge ? startYear + Math.max(0, 100 - startAge) : startYear + 99;
  const years = Array.from({ length: maxYear - startYear + 1 }, (_, i) => startYear + i);

  const projForYear = y => projectedSalaryAtYear(entries, assumptions.salaryGrowth, y);

  const chartDataRaw = hasStart ? buildChartData(entries, assumptions.salaryGrowth, assumptions.investReturn, assumptions.savingsReturn||4, assumptions.withdrawalRate, startYear, contrib401k, match401k, investments, savings, lifeEvents, retireYear, retireEnabled) : [];
  const mortgageData = buildMortgageData(mortgages, startYear, maxYear, lifeEvents, assumptions.homeAppreciation).map(pt => ({
    ...pt,
    age: startAge ? startAge + (pt.year - startYear) : null
  }));
  const chartData = chartDataRaw.map(pt => {
    const ms = mortgageData.find(d => d.year === pt.year);
    const eq = ms && !ms.noLoan ? (ms.equity || 0) : 0;
    const age = startAge ? startAge + (pt.year - startYear) : null;
    return { ...pt, equity: eq, netWorth: pt.k401 + pt.invest + eq, age };
  });

  const sliceStart = Math.max(0, Math.min(chartData.length - 1, Math.round(chartData.length * rangeStart / 100)));
  const sliceEnd   = Math.max(sliceStart + 1, Math.min(chartData.length, Math.round(chartData.length * rangeEnd / 100)));
  const sliced = chartData.slice(sliceStart, sliceEnd);
  const mortSliced = mortgageData.filter(d => sliced.some(s => s.year === d.year));
  // Set right slider to startAge + 20 on first data load
  useEffect(() => {
    if (chartData.length > 0 && startAge) {
      const targetAge20 = startAge + 20;
      const i20 = chartData.findIndex(d => (d.age||0) >= targetAge20);
      if (i20 > 0) setRangeEnd(Math.round(i20 / chartData.length * 100));
    }
  }, [hasStart]); // eslint-disable-line
  const xInt = Math.max(0, Math.floor((sliceEnd - sliceStart) / 5) - 1);
  const xT = { fill: T.text1, fontSize: 11 };
  const axP = { tickLine: false, axisLine: false };

  const commitStart = () => {
    const y = parseInt(setupForm.year), s = parseFloat(setupForm.salary);
    if (isNaN(y) || isNaN(s) || s <= 0) { setSetupErr("Enter valid year and salary."); return; }
    const age = parseInt(setupForm.age) || null;
    set("startYear", y);
    set("entries", [{ year: y, salary: s, type: "start", startAge: age }]);
    setShowSetup(false); setSetupErr("");
  };

  const resetAll = () => { setState(INIT_STATE); setShowSetup(true); setActiveYear(null); setChartRange(30); setActiveFhIdx(null); setShowFutureHome(false); setRangeStart(0); setRangeEnd(100); };

  const commitEvent = () => {
    if (!activeYear) return;
    const proj = projForYear(activeYear) || 0;
    if (eventForm.pct || eventForm.salary) {
      const newSal = eventForm.pct ? proj * (1 + parseFloat(eventForm.pct) / 100) : parseFloat(eventForm.salary);
      if (!isNaN(newSal) && newSal > 0) {
        set("entries", [...entries.filter(e => e.year !== activeYear), { year: activeYear, salary: newSal, type: "promotion", startAge }].sort((a, b) => a.year - b.year));
      }
    }
    const k4Pct = parseFloat(eventForm.k401Pct);
    if (!isNaN(k4Pct) && k4Pct >= 0) set("contrib401k", [...contrib401k.filter(c => c.year !== activeYear), { year: activeYear, pct: k4Pct }].sort((a, b) => a.year - b.year));
    const mPct = parseFloat(eventForm.matchPct);
    if (!isNaN(mPct) && mPct >= 0) set("match401k", { ...match401k, upToPct: mPct, enabled: true });
    const iPct = parseFloat(eventForm.investPct);
    if (!isNaN(iPct) && iPct >= 0) set("investments", [...investments.filter(i => i.year !== activeYear), { year: activeYear, pct: iPct, ret: assumptions.investReturn }].sort((a, b) => a.year - b.year));
    const sPct = parseFloat(eventForm.savingsPct);
    if (!isNaN(sPct) && sPct >= 0) setSavings(prev => [...prev.filter(s => s.year !== activeYear), { year: activeYear, pct: sPct }].sort((a,b)=>a.year-b.year));
    const hp = parseFloat(eventForm.homePrice), hr = parseFloat(eventForm.mortgageRate);
    if (!isNaN(hp) && hp > 0 && !isNaN(hr) && hr > 0) {
      const isSecond = mortgages.some(m => m.year < activeYear);
      const invSnap = chartData.find(d => d.year === activeYear);
      const portAmt = invSnap ? Math.max(0, invSnap.invest) * (parseFloat(eventForm.portPct) || 0) / 100 : 0;
      const msSnap = mortgageData.find(d => d.year === activeYear);
      const eqAmt = (isSecond && eventForm.useEquity && msSnap?.equity > 0) ? msSnap.equity : 0;
      const totalDown = eqAmt + portAmt;
      const downPct = hp > 0 ? Math.min(100, Math.max(0, totalDown / hp * 100)) : 20;
      set("mortgages", [...mortgages.filter(m => m.year !== activeYear), { year: activeYear, price: hp, downPct, rate: hr, termYears: assumptions.mortgageTerm, isSecond }].sort((a, b) => a.year - b.year));
      if (portAmt > 0) set("lifeEvents", [...lifeEvents.filter(e => !(e.year === activeYear && e.label === "Down Payment")), { year: activeYear, label: "Down Payment", amount: portAmt, type: "expense" }]);
    }
    const la = parseFloat(eventForm.lifeAmount);
    if (!isNaN(la) && la > 0) {
      const lbl = eventForm.lifeLabel.trim() || (eventForm.lifeType === "extra-invest" ? "Extra Investment" : "Expense");
      set("lifeEvents", [...lifeEvents, { year: activeYear, label: lbl, amount: la, type: eventForm.lifeType }]);
    }
    if (eventForm.retireToggle) { set("retireEnabled", true); set("retireYear", activeYear); }
    setActiveYear(null);
    setEventForm({ pct: "", salary: "", k401Pct: "", matchPct: "", investPct: "", homePrice: "", mortgageRate: "", portPct: "", dtiPct: "", useEquity: false, lifeLabel: "", lifeAmount: "", lifeType: "expense", retireToggle: false });
  };

  const inputBase  = { flex: 1, minWidth: 0, fontSize: 12, padding: "7px 10px", background: "#1a1a2a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 5, color: "#f0f0f2", fontFamily: "inherit", outline: "none" };
  const inputStyle = inputBase;
  const inputWide  = inputBase;
  const labelStyle = { fontSize: 12, color: "#fff", fontWeight: 600, flexShrink: 0, width: 100, whiteSpace: "nowrap" };
  const rowStyle = { display: "flex", alignItems: "center", gap: 8 };
  const btnStyle = (on, color) => ({ padding: "5px 14px", fontSize: 12, borderRadius: 5, cursor: "pointer", border: `1px solid ${on ? color : T.border}`, background: on ? color + "22" : "transparent", color: on ? color : T.text1, fontWeight: 600, whiteSpace: "nowrap" });

  const hasAnyEvent = year => {
    const isFirst = year === startYear;
    const base = contrib401k.some(e => e.year === year) || investments.some(e => e.year === year) || mortgages.some(m => m.year === year) || lifeEvents.some(e => e.year === year) || (retireEnabled && retireYear === year);
    if (isFirst) return base;
    return base || !!entries.find(e => e.year === year && e.type !== "start");
  };

  if (!hasStart) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)" }}>
        <div style={{ background: T.bg2, border: `1px solid ${T.border2}`, borderRadius: 14, padding: "2rem", width: 360 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 4 }}>My Financial Roadmap</div>
          <div style={{ fontSize: 12, color: T.text2, marginBottom: 20 }}>by Dallin Stout</div>
          {[["Career Start Year", "year", String(new Date().getFullYear())], ["Your Age", "age", "30"], ["Starting Salary $", "salary", "75000"]].map(([lbl, key, ph]) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: T.text2, marginBottom: 4, letterSpacing: "0.06em" }}>{lbl.toUpperCase()}</div>
              <input type={key === "salary" || key === "age" ? "number" : "text"} placeholder={ph} value={state.setupForm[key] || ""} onChange={e => setState(s => ({ ...s, setupForm: { ...s.setupForm, [key]: e.target.value } }))} onKeyDown={e => e.key === "Enter" && commitStart()} />
            </div>
          ))}
          {setupErr && <div style={{ fontSize: 12, color: T.red, marginBottom: 10 }}>{setupErr}</div>}
          <button onClick={commitStart} style={{ width: "100%", padding: "10px", background: T.accent, border: "none", borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 700 }}>Build My Roadmap →</button>
        </div>
      </div>
    );
  }

  if (showSpreadsheet) {
    const rows = chartData.map(pt => ({ ...pt, ...(mortgageData.find(d => d.year === pt.year) || {}) }));
    const TH = ({ c, right }) => <th style={{ padding: "8px 10px", fontSize: 11, color: "rgba(255,255,255,0.7)", borderBottom: "2px solid rgba(255,255,255,0.1)", textAlign: right ? "right" : "left", whiteSpace: "nowrap", background: "#0d0d14", position: "sticky", top: 0, zIndex: 2 }}>{c}</th>;
    const TD = ({ v, color }) => <td style={{ padding: "6px 10px", fontSize: 12, color: color || "#fff", borderBottom: "1px solid rgba(255,255,255,0.05)", textAlign: "right", whiteSpace: "nowrap" }}>{v}</td>;
    return (
      <div style={{ position: "absolute", inset: 0, background: "#0d0d14", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "8px 16px", flexShrink: 0, display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setShowSpreadsheet(false)} style={{ padding: "5px 14px", background: T.goldD, border: `1px solid ${T.gold}`, borderRadius: 6, color: T.gold, fontSize: 12, fontWeight: 600 }}>← Back to Roadmap</button>
          <span style={{ fontSize: 13, color: T.text1 }}>All values — verify your roadmap numbers</span>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 1100 }}>
            <thead><tr>
              <TH c="Year" /><TH c="Age" right /><TH c="Salary" right /><TH c="401k/yr" right /><TH c="401k Bal" right /><TH c="Invest/yr" right /><TH c="Invest Bal" right /><TH c="Net Worth" right /><TH c="Savings" right /><TH c="Loan Bal" right /><TH c="Interest" right /><TH c="Mkt Value" right /><TH c="Equity" right /><TH c="Retired" right />
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.year} style={{ background: r.isRetired ? "rgba(251,191,36,0.04)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                  <td style={{ padding: "6px 10px", fontSize: 12, color: r.isEvent ? T.gold : "#fff", fontWeight: r.isEvent ? 700 : 400, whiteSpace: "nowrap", position: "sticky", left: 0, background: r.isRetired ? "rgba(14,14,22,0.95)" : "#0d0d14", zIndex: 1 }}>{r.year}</td>
                  <TD v={r.age || "—"} />
                  <TD v={r.salary ? fmt(r.salary) : "—"} />
                  <TD v={r.k401Annual > 0 ? fmt(r.k401Annual) : "—"} color={T.green} />
                  <TD v={r.k401 != null ? fmt(r.k401) : "—"} color={r.k401 < 0 ? T.red : T.green} />
                  <TD v={r.investAnnual > 0 ? fmt(r.investAnnual) : "—"} color={T.gold} />
                  <TD v={r.invest != null ? fmt(r.invest) : "—"} color={r.invest < 0 ? T.red : T.gold} />
                  <TD v={r.netWorth != null ? fmt(r.netWorth) : "—"} color="#a78bfa" />
                  <TD v={r.savBal > 0 ? fmt(r.savBal) : "—"} color="#34d399" />
                  <TD v={r.paidOff ? "Paid off" : r.balance > 0 ? fmt(r.balance) : "—"} color={r.paidOff ? T.green : T.gold} />
                  <TD v={r.interest > 0 ? fmt(r.interest) : "—"} color={T.red} />
                  <TD v={r.mktVal > 0 ? fmt(r.mktVal) : "—"} color="#a78bfa" />
                  <TD v={r.equity > 0 ? fmt(r.equity) : "—"} color="#7dd3fc" />
                  <TD v={r.isRetired ? "🏖️" : "—"} color={r.isRetired ? T.gold : T.text2} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "row", overflow: "hidden", background: "transparent" }}>
      {/* LEFT: charts */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "0.5rem", minWidth: 0, background: "rgba(6,6,14,0.82)" }}>
        {/* Top bar — left: spreadsheet+assumptions, right: edit+reset */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 6, flexShrink: 0 }}>
          <button onClick={() => setShowSpreadsheet(true)} style={{ ...btnStyle(false, T.gold), fontSize: 11 }}>📊 Spreadsheet</button>
          <button onClick={() => { setShowAssumptions(s => { if(!s) setDraftAssumptions({...assumptions}); return !s; }); }} style={{ ...btnStyle(showAssumptions, "#a78bfa"), fontSize: 11 }}>⚙️ Assumptions</button>
          <button onClick={() => setShowSetup(true)} style={{ ...btnStyle(false, T.accent), fontSize: 11 }}>✏️ Edit Start</button>
          <button onClick={resetAll} style={{ ...btnStyle(false, T.text1), fontSize: 11 }}>↺ Reset</button>
        </div>

        {/* Assumptions panel */}
        {showAssumptions && draftAssumptions && (
          <div style={{ position: "absolute", top: 40, left: 0, zIndex: 20, background: T.bg2, border: `1px solid rgba(167,139,250,0.4)`, borderRadius: 10, padding: "14px 18px", minWidth: 300, boxShadow: "0 8px 32px rgba(0,0,0,0.7)" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", marginBottom: 10 }}>⚙️ Model Assumptions</div>
            {[["salaryGrowth","Salary Growth","~3% is typical"],["investReturn","Investment Return","~7% S&P500 historical"],["savingsReturn","Savings Rate","~4.5% money market / HYSA"],["inflation","Inflation","~3% long-term avg"],["homeAppreciation","Home Appreciation","~3% historically"],["withdrawalRate","Retirement Withdrawal","~4% safe draw rate"]].map(([k,lbl,hint]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#fff" }}>{lbl}</div>
                  <div style={{ fontSize: 9, color: T.text2 }}>{hint}</div>
                </div>
                <input type="number" value={draftAssumptions[k] ?? 0} min={0} max={30} step={0.5} onChange={e => setDraftAssumptions(d => ({ ...d, [k]: parseFloat(e.target.value) || 0 }))} style={{ width: 55, textAlign: "right" }} />
                <span style={{ fontSize: 11, color: T.text2 }}>%</span>
              </div>
            ))}
            {[["capGainsPct","Capital Gains Tax","% applied to portfolio used for down payment"],["buySellPct","Buy/Sell Fees","% of total funds deducted for transaction costs"]].map(([k,lbl,hint]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#fff" }}>{lbl}</div>
                  <div style={{ fontSize: 9, color: T.text2 }}>{hint}</div>
                </div>
                <input type="number" value={draftAssumptions[k] ?? 0} min={0} max={50} step={1} onChange={e => setDraftAssumptions(d => ({ ...d, [k]: parseFloat(e.target.value) || 0 }))} style={{ width: 55, textAlign: "right" }} />
                <span style={{ fontSize: 11, color: T.text2 }}>%</span>
              </div>
            ))}
            <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8, marginTop: 4, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: "#fff", marginBottom: 6 }}>Mortgage Term</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[15, 30].map(t => <button key={t} onClick={() => setDraftAssumptions(d => ({ ...d, mortgageTerm: t }))} style={btnStyle(draftAssumptions.mortgageTerm === t, "#a78bfa")}>{t}yr</button>)}
              </div>
            </div>
            {/* Update button */}
            {(() => {
              const dirty = JSON.stringify(draftAssumptions) !== JSON.stringify(assumptions);
              return (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => { if(dirty){ setAssumptions(draftAssumptions); } }} style={{ padding: "6px 20px", fontSize: 12, fontWeight: 700, borderRadius: 6, cursor: dirty ? "pointer" : "default", border: `1px solid ${dirty ? "#a78bfa" : T.border}`, background: dirty ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.04)", color: dirty ? "#a78bfa" : T.text2, transition: "all 0.2s" }}>Update</button>
                </div>
              );
            })()}
          </div>
        )}



        {/* 2x2 chart grid */}
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 6, minHeight: 0 }}>
          <ChartCard title="401k, Investments & Net Worth">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sliced} margin={{ top: 4, right: 8, left: 0, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="age" tick={xT} {...axP} interval={xInt} label={{ value: "Age", position: "insideBottom", offset: -2, fill: T.text2, fontSize: 11 }} />
                <YAxis tickFormatter={fmtK} tick={xT} {...axP} width={70} />
                <Tooltip content={<Tip />} />
                <Line type="monotone" dataKey="netWorth" name="Net Worth" stroke="#a78bfa" strokeWidth={2} strokeDasharray="6 3" dot={false} />
                <Line type="monotone" dataKey="invest" name="Invest" stroke={T.gold} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="k401" name="401k" stroke={T.green} strokeWidth={2} dot={false} />
                <Customized component={InPlotLegend({items:[{name:"Net Worth",color:"#a78bfa"},{name:"Invest",color:"#fbbf24"},{name:"401k",color:"#4ade80"}]})}/>
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Home Ownership">
            {mortgages.length === 0 ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: T.text2, textAlign: "center", padding: "0 1.5rem" }}>
                <span style={{ fontSize: 28 }}>🏠</span>
                <span style={{ fontSize: 12, lineHeight: 1.6 }}>This graph will populate once a home purchase is added. Click <strong style={{ color: "rgba(255,255,255,0.5)" }}>+ Add</strong> on any year in the Build Your Roadmap window.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mortSliced} margin={{ top: 4, right: 8, left: 0, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="age" tick={xT} {...axP} interval={xInt} label={{ value: "Age", position: "insideBottom", offset: -2, fill: T.text2, fontSize: 11 }} />
                  <YAxis tickFormatter={fmtK} tick={xT} {...axP} width={70} />
                  <Tooltip content={<Tip />} />
                  <Line type="monotone" dataKey="balance" name="Loan Bal" stroke={T.gold} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="interest" name="Int Owed" stroke={T.red} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="mktVal" name="Mkt Value" stroke="#a78bfa" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="equity" name="Equity" stroke="#7dd3fc" strokeWidth={2} dot={false} />
                  <Customized component={InPlotLegend({items:[{name:"Loan Bal",color:"#fbbf24"},{name:"Int Owed",color:"#f87171"},{name:"Mkt Value",color:"#a78bfa"},{name:"Equity",color:"#7dd3fc"}]})}/>
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Bottom-left: Salary Trajectory */}
          <ChartCard title="Salary Trajectory">
            {hasStart && sliced.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sliced} margin={{ top: 4, right: 8, left: 0, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="age" tick={xT} {...axP} interval={xInt} label={{ value: "Age", position: "insideBottom", offset: -2, fill: T.text2, fontSize: 11 }} />
                  <YAxis tickFormatter={fmtK} tick={xT} {...axP} width={70} />
                  <Tooltip formatter={(v,n)=>[fmtK(v),n]} labelFormatter={v=>`Age ${v}`} contentStyle={{ background: "#0d0d14", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="salary" name="Salary" stroke={T.accent} strokeWidth={2} dot={({cx,cy,payload})=>payload.isEvent?<circle key={cx} cx={cx} cy={cy} r={4} fill={T.accent} stroke="#0d0d14" strokeWidth={2}/>:<g key={cx}/>} activeDot={{r:5}}/>
                  <Line type="monotone" dataKey="savBal" name="Savings" stroke="#34d399" strokeWidth={2} dot={false} activeDot={{r:4}}/>
                  <Customized component={InPlotLegend({items:[{name:"Salary",color:T.accent},{name:"Savings",color:"#34d399"}]})}/>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:T.text2,fontSize:12}}>
                Set your starting salary to see trajectory
              </div>
            )}
          </ChartCard>

          <div style={{ gridColumn: 2, gridRow: 2, background: "rgba(6,6,16,0.72)", border: `1px solid ${T.border}`, borderRadius: 10, padding: "0.6rem", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {!showFutureHome ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 2rem" }}>
                <span style={{ fontSize: 22 }}>🏠</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>Add a Home Purchase</span>
                <span style={{ fontSize: 12, color: T.text2, textAlign: "center", lineHeight: 1.6, maxWidth: 340 }}>
                  Click <strong style={{ color: "rgba(255,255,255,0.5)" }}>+ Add</strong> on any year in the Build Your Roadmap window, then tap <strong style={{ color: "#818cf8" }}>🏠 Add Home Purchase</strong> to get started.
                </span>
              </div>
            ) : (()=>{
              const currYr = new Date().getFullYear();
              const hasPriorHome = mortgages.length > 0;
              // If viewing a saved entry, use its locked data; otherwise use live fhForm
              const isLocked = activeFhIdx !== null && savedFhList[activeFhIdx];
              const displayForm = isLocked ? savedFhList[activeFhIdx] : fhForm;
              const lockedSnap = isLocked ? savedFhList[activeFhIdx] : null;
              const rate = parseFloat(displayForm.rate)||0;
              const portPct = Math.max(0, parseFloat(displayForm.portPct)||0);
              const equityPct = Math.max(0, parseFloat(displayForm.equityPct)||0);
              const dti = Math.max(0, parseFloat(displayForm.dti)||0);
              const targetAge = parseInt(displayForm.targetAge)||null;
              // Find target year from age
              const targetYrFromAge = targetAge && startAge ? startYear + (targetAge - startAge) : null;
              const targetYr = targetYrFromAge || (chartData.find(d => d.year > currYr)?.year);
              const snapAtTarget = targetYr ? chartData.find(d => d.year === targetYr) : null;
              const mortTerm = assumptions.mortgageTerm||30;
              // Compute max home price at target year
              const portBal = Math.max(0, snapAtTarget?.invest||0);
              const portAmt = portBal * portPct / 100;
              const capGains = portAmt * (assumptions.capGainsPct||20) / 100;
              const msSnap = targetYr ? mortgageData.find(d => d.year === targetYr) : null;
              const totalEq = (hasPriorHome && msSnap && !msSnap.noLoan) ? Math.max(0, msSnap.equity||0) : 0;
              const usedEq = totalEq * equityPct / 100;
              const unusedEq = totalEq - usedEq;
              const mr = rate / 100 / 12;
              const n = mortTerm * 12;
              const pmt = dti > 0 && (snapAtTarget?.salary||0) > 0 ? (snapAtTarget.salary) * dti / 100 / 12 : 0;
              const maxLoan = (mr > 0 && pmt > 0) ? pmt*(Math.pow(1+mr,n)-1)/(mr*Math.pow(1+mr,n)) : 0;
              const savBal2 = Math.max(0, snapAtTarget?.savBal||0);
              const savingsUsedPct = Math.max(0, parseFloat(displayForm.savingsPct)||0);
              const savAmt = savBal2 * savingsUsedPct / 100;
              const netPort = Math.max(0, portAmt - capGains);
              // Loan is in future dollars — deflate to today's purchasing power
              // Portfolio and equity are already in real/today's terms
              const yearsUntil = targetYr ? Math.max(0, targetYr - currYr) : 0;
              const inflFactor = Math.pow(1 + (assumptions.inflation||3) / 100, yearsUntil);
              const maxLoanToday = yearsUntil > 0 ? maxLoan / inflFactor : maxLoan;
              // Max price in today's dollars
              const grossToday = netPort + usedEq + savAmt + maxLoanToday;
              const buySellRate = (hasPriorHome ? 1 : 0.5) * (assumptions.buySellPct||10) / 100;
              const buySell = grossToday * buySellRate;
              const maxPrice = Math.max(0, Math.round(grossToday - buySell));
              // Nominal price for saving to roadmap (loan in future $)
              const grossNominal = netPort + usedEq + maxLoan;
              const buySellNominal = grossNominal * (assumptions.buySellPct||10) / 100;
              const maxPriceNominal = Math.max(0, Math.round(grossNominal - buySellNominal));
              const downAmt = netPort + usedEq;
              const downPct = maxPriceNominal > 0 ? Math.min(100, downAmt / maxPriceNominal * 100) : 20;
              const canShow = rate > 0 && !!targetYr;   // show breakdown as soon as rate + year entered
              const canSave = canShow && maxPrice > 0;    // save button needs a valid price
              const inp = { background:"#1a1a2a", border:"1px solid rgba(255,255,255,0.12)", borderRadius:5, color:"#f0f0f2", fontFamily:"inherit", fontSize:12, padding:"6px 8px", width:"100%", outline:"none" };
              // Pie chart data
              // When locked: use frozen snapshot so roadmap edits don't change the pie
              // When new/editing: compute live from current assumptions
              const pieNetPort   = isLocked ? (lockedSnap?.snapNetPort   ?? netPort)   : netPort;
              const pieUsedEq    = isLocked ? (lockedSnap?.snapUsedEq    ?? usedEq)    : usedEq;
              const pieLoanToday = isLocked ? (lockedSnap?.snapLoanToday ?? maxLoanToday) : maxLoanToday;
              const pieBuySell   = isLocked ? (lockedSnap?.snapBuySell   ?? buySell)   : buySell;
              const pieMaxPrice  = isLocked ? (lockedSnap?.savedMaxPrice ?? maxPrice)  : maxPrice;
              const pieSlices = (isLocked && lockedSnap?.savedPieSlices?.length > 0)
                ? lockedSnap.savedPieSlices
                : [
                    { val: netPort,      color: T.gold,    label: "Portfolio" },
                    { val: savAmt,       color: "#34d399", label: "Savings" },
                    { val: usedEq,       color: "#7dd3fc", label: "Equity" },
                    { val: maxLoanToday, color: T.accent,  label: "Loan (today $)" },
                    { val: buySell,      color: T.red,     label: "Fees" },
                  ].filter(s => s.val > 0);
              const pieTotal = pieSlices.reduce((s,p) => s+p.val, 0) || 1;
              const P = (cx,cy,r,deg) => { const rad=deg*Math.PI/180; return [cx+r*Math.cos(rad), cy+r*Math.sin(rad)]; };
              let cumAngle = -90;
              const slices = pieSlices.map(s => { const a=s.val/pieTotal*360; const start=cumAngle; cumAngle+=a; return {...s,a,start}; });
              const saveHome = () => {
                const newEvents = [...(state.lifeEvents||[]).filter(e=>!(e.year===targetYr&&(e.label==="Home down payment"||e.label==="Unused equity reinvested")))];
                if(portAmt>0) newEvents.push({year:targetYr,label:"Home down payment",amount:portAmt,type:"expense"});
                if(savAmt>0) newEvents.push({year:targetYr,label:"Savings used for home",amount:savAmt,type:"savings-used"});
                if(unusedEq>500) newEvents.push({year:targetYr,label:"Unused equity reinvested",amount:unusedEq,type:"extra-invest"});
                // Use maxLoan as the loan amount: downPct = (price - loan) / price
              const loanDownPct = maxPriceNominal > 0 ? Math.max(0, Math.min(100, (maxPriceNominal - maxLoan) / maxPriceNominal * 100)) : downPct;
              setState(s=>({...s,
                  mortgages:[...(s.mortgages||[]).filter(m=>m.year!==targetYr),{year:targetYr,price:maxPriceNominal,downPct:loanDownPct,rate,termYears:mortTerm,isSecond:hasPriorHome,loanAmount:maxLoan}].sort((a,b)=>a.year-b.year),
                  lifeEvents:newEvents,
                }));
                // Keep panel open, save to list, switch to saved view
                setSavedFhList(prev => {
                  const savedPieSlices=[{val:netPort,color:"#fbbf24",label:"Portfolio"},{val:usedEq,color:"#7dd3fc",label:"Equity"},{val:maxLoanToday,color:"#818cf8",label:"Loan (today $)"},{val:buySell,color:"#f87171",label:"Fees"}].filter(s=>s.val>0);
                  const entry = {...displayForm, savedMaxPrice:maxPrice, savedMaxNominal:maxPriceNominal, savedYear:targetYr, savedInflYears:yearsUntil, snapNetPort:netPort, snapUsedEq:usedEq, snapLoanToday:maxLoanToday, snapBuySell:buySell, savedPieSlices};
                  if(editingFhIdx!==null){const n=[...prev];n[editingFhIdx]=entry;setActiveFhIdx(editingFhIdx);setEditingFhIdx(null);return n;}
                  const existing = prev.findIndex(p=>p.targetAge===fhForm.targetAge);
                  if(existing >= 0) { const n=[...prev]; n[existing]=entry; setActiveFhIdx(existing); return n; }
                  const newList = [...prev, entry];
                  setActiveFhIdx(newList.length - 1);
                  return newList;
                });
                setFhForm({ rate: "", portPct: "", equityPct: "", dti: "", savingsPct: "", targetAge: "" });
              };
              return (<>
                {/* TABS ROW */}
                <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"nowrap",overflowX:"auto",flexShrink:0,marginBottom:6,paddingBottom:2}}>
                  {savedFhList.map((p,i)=>(
                    <button key={i} onClick={()=>{setActiveFhIdx(i);setFhForm(p);}}
                      style={{fontSize:10,fontWeight:activeFhIdx===i?700:400,padding:"3px 10px",borderRadius:5,cursor:"pointer",border:`1px solid ${activeFhIdx===i?"#818cf8":T.border}`,background:activeFhIdx===i?"rgba(129,140,248,0.2)":"transparent",color:activeFhIdx===i?"#818cf8":T.text2,whiteSpace:"nowrap",flexShrink:0}}>
                      🏠 Age {p.targetAge} — {fmtFull(p.savedMaxPrice||0)}
                    </button>
                  ))}
                  <div style={{flex:1}}/>
                  {isLocked && (
                    <button onClick={()=>{
                      const entry=savedFhList[activeFhIdx];
                      setEditingFhIdx(activeFhIdx);
                      setFhForm({rate:entry.rate||"",portPct:entry.portPct||"",equityPct:entry.equityPct||"",dti:entry.dti||"",savingsPct:entry.savingsPct||"",targetAge:entry.targetAge||""});
                      setActiveFhIdx(null);
                    }} style={{fontSize:10,color:T.gold,background:"rgba(251,191,36,0.1)",border:`1px solid ${T.gold}`,borderRadius:4,padding:"2px 9px",cursor:"pointer",flexShrink:0,marginRight:4}}>✏️ Edit</button>
                  )}
                  <button onClick={()=>setShowFutureHome(false)} style={{fontSize:10,color:T.text2,background:"transparent",border:`1px solid ${T.border}`,borderRadius:4,padding:"1px 7px",cursor:"pointer",flexShrink:0}}>✕</button>
                </div>

                {/* MAIN BODY */}
                <div style={{flex:1,display:"flex",flexDirection:"row",gap:14,minHeight:0,overflow:"hidden"}}>

                  {/* LEFT: inputs stacked */}
                  <div style={{width:155,flexShrink:0,display:"flex",flexDirection:"column",gap:8}}>
                    {[
                      {key:"rate",      label:"Interest Rate %",  ph:"e.g. 6.5", step:"0.1"},
                      {key:"portPct",   label:"% Portfolio",      ph:"0–100"},
                      {key:"equityPct", label:"% Prior Equity",   ph:"0–100", disabled:!hasPriorHome},
                      {key:"dti",       label:"DTI %",            ph:"e.g. 36"},
                      {key:"savingsPct",label:"% Savings",        ph:"0–100"},
                    ].map(({key,label,ph,step,disabled})=>(
                      <div key={key} style={{opacity:disabled?0.35:1}}>
                        <div style={{fontSize:9,color:T.text2,marginBottom:2}}>{label}{disabled?" (none)":""}</div>
                        <input type="number" placeholder={ph} step={step||"1"} min="0" max="100"
                          value={displayForm[key]||""}
                          readOnly={!!disabled||isLocked}
                          onChange={e=>{if(!disabled&&!isLocked)setFhForm(f=>({...f,[key]:e.target.value}));}}
                          style={{width:"100%",background:isLocked?"rgba(255,255,255,0.04)":"rgba(10,10,20,0.8)",border:`1px solid ${isLocked?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.15)"}`,borderRadius:5,color:isLocked?"rgba(255,255,255,0.45)":"#f0f0f2",fontFamily:"inherit",fontSize:12,padding:"6px 8px",outline:"none"}}/>
                      </div>
                    ))}
                    <div style={{flex:1}}/>
                    {canSave && !isLocked && (
                      <button onClick={saveHome} style={{padding:"8px 0",fontSize:12,fontWeight:700,color:"#fff",background:"rgba(129,140,248,0.25)",border:"1px solid #818cf8",borderRadius:6,cursor:"pointer",width:"100%",marginTop:"auto"}}>
                        ➕ Add Age {targetAge}
                      </button>
                    )}
                  </div>

                  {/* RIGHT: numbers + price + pie + legend */}
                  <div style={{flex:1,display:"flex",flexDirection:"column",gap:8,minWidth:0,overflow:"hidden"}}>
                    {(canShow || isLocked) ? (<>

                      {/* 5 component bubbles in a row */}
                      <div style={{display:"flex",gap:5,flexShrink:0}}>
                        {[
                          {lbl:"Portfolio",    val:pieNetPort,   color:T.gold},
                          {lbl:"Equity",       val:pieUsedEq,   color:"#7dd3fc", hide:!hasPriorHome},
                          {lbl:"Savings",      val:savAmt,       color:"#34d399"},
                          {lbl:"Loan",         val:pieLoanToday, color:T.accent},
                          {lbl:"Fees",         val:pieBuySell,  color:T.red},
                        ].filter(r=>!r.hide && r.val > 0).map((r,i)=>(
                          <div key={i} style={{flex:1,background:"rgba(6,6,16,0.75)",border:`1px solid rgba(255,255,255,0.08)`,borderRadius:7,padding:"5px 8px",minWidth:0}}>
                            <div style={{fontSize:9,color:T.text2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.lbl}</div>
                            <div style={{fontSize:13,fontWeight:800,color:r.color,whiteSpace:"nowrap"}}>{fmtK(r.val)}</div>
                          </div>
                        ))}
                      </div>

                      {/* Max Home Price full-width */}
                      <div style={{background:"rgba(129,140,248,0.12)",border:"1px solid rgba(129,140,248,0.3)",borderRadius:8,padding:"6px 12px",flexShrink:0}}>
                        <div style={{fontSize:10,color:T.text2}}>Max Home Price <span style={{fontSize:9,color:"#818cf8"}}>(today&apos;s $)</span></div>
                        <div style={{fontSize:26,fontWeight:800,color:"#fff"}}>{fmtFull(pieMaxPrice)}</div>
                        {(isLocked?lockedSnap?.savedInflYears:yearsUntil)>0&&<div style={{fontSize:8,color:"rgba(255,255,255,0.3)"}}>Loan discounted {isLocked?lockedSnap.savedInflYears:yearsUntil}yr @ {assumptions.inflation||3}% · nominal {fmtK(isLocked?lockedSnap.savedMaxNominal:maxPriceNominal)}</div>}
                      </div>

                      {/* Pie centered */}
                      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,minHeight:0}}>
                        <svg width={220} height={220} viewBox="0 0 110 110">
                          {slices.map((s,i)=>{
                            if(s.a<0.5) return null;
                            if(s.a>=359.9) return <circle key={i} cx={55} cy={55} r={44} fill={s.color} opacity={0.9}/>;
                            const [x1,y1]=P(55,55,44,s.start);
                            const [x2,y2]=P(55,55,44,s.start+s.a);
                            const lg=s.a>180?1:0;
                            return <path key={i} d={`M55 55 L${x1.toFixed(1)} ${y1.toFixed(1)} A44 44 0 ${lg} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`} fill={s.color} opacity={0.88}/>;
                          })}
                        </svg>
                        {/* Legend below pie */}
                        <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
                          {slices.map((s,i)=>(
                            <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
                              <span style={{fontSize:12,color:s.color}}>●</span>
                              <span style={{fontSize:10,color:T.text1}}>{s.label}</span>
                              <span style={{fontSize:10,color:s.color,fontWeight:700}}>{Math.round(s.val/pieTotal*100)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </>) : (
                      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:T.text2,fontSize:12,textAlign:"center"}}>
                        Enter interest rate and portfolio % to see your breakdown
                      </div>
                    )}
                  </div>
                </div>
              </>
              );
            })()}
          </div>
        </div>


        {/* Dual range slider — below plots */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: T.text2, minWidth: 44, textAlign: "right" }}>
            {sliced.length > 0 ? `Age ${sliced[0]?.age ?? (startAge||startYear)}` : (startAge||startYear)}
          </span>
          <div className="dual-range-wrap" style={{ flex: 1 }}>
            <div className="dual-range-track"/>
            <div className="dual-range-fill" style={{ left:`${rangeStart}%`, width:`${rangeEnd-rangeStart}%` }}/>
            <div style={{ position:"absolute", left:`calc(${rangeStart}% - 9px)`, top:"50%", transform:"translateY(-50%)", width:18, height:18, borderRadius:"50%", background:"#818cf8", border:"2.5px solid #fff", boxShadow:"0 1px 5px rgba(0,0,0,0.5)", pointerEvents:"none", zIndex:5, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:6, height:6, borderLeft:"1.5px solid rgba(255,255,255,0.7)", borderRight:"1.5px solid rgba(255,255,255,0.7)", borderRadius:1 }}/>
            </div>
            <div style={{ position:"absolute", left:`calc(${rangeEnd}% - 9px)`, top:"50%", transform:"translateY(-50%)", width:18, height:18, borderRadius:"50%", background:T.accent, border:"2.5px solid #fff", boxShadow:"0 1px 5px rgba(0,0,0,0.5)", pointerEvents:"none", zIndex:5, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ width:6, height:6, borderLeft:"1.5px solid rgba(255,255,255,0.7)", borderRight:"1.5px solid rgba(255,255,255,0.7)", borderRadius:1 }}/>
            </div>
            <input type="range" min={0} max={100} value={rangeStart}
              onChange={e => setRangeStart(Math.min(+e.target.value, rangeEnd - 2))}
              style={{ zIndex: rangeStart > 90 ? 4 : 3 }}/>
            <input type="range" min={0} max={100} value={rangeEnd}
              onChange={e => setRangeEnd(Math.max(+e.target.value, rangeStart + 2))}
              style={{ zIndex: rangeStart > 90 ? 3 : 4 }}/>
          </div>
          <span style={{ fontSize: 11, color: T.accent, minWidth: 44 }}>
            {sliced.length > 0 ? `Age ${sliced[sliced.length-1]?.age ?? ""}` : ""}
          </span>
        </div>
      </div>

      {/* RIGHT: table */}
      <div style={{ width: 323, flexShrink: 0, display: "flex", flexDirection: "column", borderLeft: `1px solid ${T.border}`, overflow: "hidden", background: "rgba(6,6,14,0.82)" }}>
        {/* Sticky header */}
        <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#0d0d14", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ padding: "7px 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2px 0" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>🗺️ Build Your Roadmap</span>
              <span style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>Click + Add Event on any year</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.02)", borderTop: `1px solid ${T.border}`, padding: "5px 14px", gap: 0 }}>
            {startAge && <span style={{ width: 52, fontSize: 10, color: T.text2, letterSpacing: "0.08em", textTransform: "uppercase" }}>Age</span>}
            <span style={{ width: 76, fontSize: 10, color: T.text2, letterSpacing: "0.08em", textTransform: "uppercase" }}>Year</span>
            <span style={{ flex: 1, fontSize: 10, color: T.text2, letterSpacing: "0.08em", textTransform: "uppercase" }}>Events</span>
          </div>
        </div>

        {/* Scrollable rows */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {years.map(year => {
            const anchor = entries.find(e => e.year === year);
            const isFirst = year === startYear;
            const isOpen = activeYear === year;
            const hasEvt = hasAnyEvent(year);
            const age = startAge ? startAge + (year - startYear) : null;

            const emojis = [];
                    const c4Changed = contrib401k.find(x => x.year === year);
                    if (c4Changed) emojis.push({ e: "💼", t: `401k ${c4Changed.pct}%` });
                    const ciChanged = investments.find(x => x.year === year);
                    if (ciChanged) emojis.push({ e: "📈", t: `Invest ${ciChanged.pct}%` });
                    const am = mortgages.find(m => m.year === year);
                    if (am) emojis.push({ e: "🏠", t: `Home ${fmtK(am.price)}` });
                    const ms2 = mortgageData.find(d => d.year === year);
                    if (!am && ms2 && ms2.paidOff) emojis.push({ e: "🎉", t: "Paid off!" });
                    lifeEvents.filter(e => e.year === year).forEach(ev => emojis.push({ e: ev.type === "expense" ? "💸" : ev.type === "extra-invest" ? "💰" : "➕", t: ev.label }));
                    if (retireEnabled && retireYear === year) emojis.push({ e: "🏖️", t: "Retire" });
                    if (anchor && anchor.type !== "start") emojis.push({ e: anchor.type === "promotion" ? "🏅" : "🏢", t: "Salary change" });

            return (
              <div key={year}>
                <div onClick={() => {
                    if (isOpen) { setActiveYear(null); return; }
                    setActiveYear(year);
                    // Pre-populate form with existing values for this year
                    const existingC4 = contrib401k.find(x => x.year === year);
                    const existingInv = investments.find(x => x.year === year);
                    const existingAnchor = entries.find(e => e.year === year && e.type !== "start");
                    setEventForm(f => ({
                      ...f,
                      k401Pct:   existingC4   ? String(existingC4.pct)    : "",
                      investPct: existingInv  ? String(existingInv.pct)   : "",
                      savingsPct: (() => { const s=[...savings].reverse().find(s=>s.year<=year); return s?String(s.pct):""; })(),
                      salary:    existingAnchor ? String(Math.round(existingAnchor.salary)) : "",
                      pct:       "",
                      retireToggle: !!(retireEnabled && retireYear === year),
                    }));
                  }}
                  style={{ display: "flex", alignItems: "center", padding: "0", cursor: "pointer", borderBottom: `1px solid rgba(255,255,255,0.04)`, background: isOpen ? "rgba(129,140,248,0.08)" : hasEvt ? "rgba(255,255,255,0.02)" : "transparent", transition: "background 0.1s", minHeight: 48 }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = hasEvt ? "rgba(255,255,255,0.02)" : "transparent"; }}>
                  {startAge && (
                    <div style={{ width: 52, padding: "0 0 0 14px", display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: (isFirst || hasEvt || isOpen) ? T.gold : T.border, boxShadow: (isFirst || hasEvt || isOpen) ? `0 0 5px ${T.gold}88` : "none" }} />
                      <span style={{ fontSize: 13, color: "#fff", fontWeight: (isFirst || hasEvt || isOpen) ? 600 : 400 }}>{age}</span>
                    </div>
                  )}
                  <div style={{ width: 76, padding: startAge ? "0 0 0 6px" : "0 0 0 14px", display: "flex", alignItems: "center", gap: 6 }}>
                    {!startAge && <div style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: (isFirst || hasEvt || isOpen) ? T.gold : T.border, boxShadow: (isFirst || hasEvt || isOpen) ? `0 0 5px ${T.gold}88` : "none" }} />}
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: 400 }}>{year}</span>
                  </div>
                  <div style={{ flex: 1, display: "flex", gap: 6, flexWrap: "nowrap", alignItems: "center", overflow: "hidden" }}>
                    {emojis.length > 0 ? emojis.map((em, i) => <span key={i} title={em.t} style={{ fontSize: 18 }}>{em.e}</span>) : <span style={{ fontSize: 14, color: "rgba(255,255,255,0.1)" }}>—</span>}
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ padding: "0 14px", flexShrink: 0 }}>
                    {isOpen ? (
                      <span style={{ fontSize: 13, color: T.accent, background: T.accentD, border: `1px solid ${T.accent}`, borderRadius: 6, padding: "4px 12px", fontWeight: 700 }}>−</span>
                    ) : (
                      <span className={hasEvt ? "" : "pulse-btn"} style={{ fontSize: 13, color: "#fff", background: hasEvt ? "rgba(255,255,255,0.08)" : T.accent, border: `1px solid ${hasEvt ? "rgba(255,255,255,0.2)" : T.accent}`, borderRadius: 6, padding: "4px 12px", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {hasEvt ? "✏️" : "+ Add"}
                      </span>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div style={{ background: "rgba(129,140,248,0.05)", borderBottom: `1px solid rgba(129,140,248,0.2)`, padding: "8px 14px 12px 14px", display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ fontSize: 11, color: T.gold, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 2 }}>
                      {year}{age ? ` · Age ${age}` : ""}{projForYear(year) ? ` · ${fmt(projForYear(year))}/yr` : ""}
                    </div>

                    {/* 🏠 Add Home shortcut — opens Future Home Purchase panel pre-filled with this age */}
                    <button onClick={() => {
                      setActiveYear(null);
                      setShowFutureHome(true);
                      setActiveFhIdx(null);
                      setFhForm(f => ({ ...f, targetAge: age ? String(age) : "" }));
                    }} style={{ display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 10px", marginBottom:4, background:"rgba(129,140,248,0.1)", border:"1px solid rgba(129,140,248,0.35)", borderRadius:6, color:"#818cf8", fontSize:12, fontWeight:600, cursor:"pointer", textAlign:"left", fontFamily:"inherit" }}>
                      🏠 Add Home Purchase{age ? ` at Age ${age}` : ""}
                    </button>

                    {!isFirst && (
                      <div style={rowStyle}>
                        <span style={labelStyle}>💵 Salary</span>
                        <input type="number" placeholder="% Raise" value={eventForm.pct} onChange={e => setEventForm(f => ({ ...f, pct: e.target.value, salary: "" }))} style={inputStyle} />
                        <span style={{ fontSize: 11, color: T.text2 }}>or</span>
                        <input type="number" placeholder="New salary $" value={eventForm.salary} onChange={e => setEventForm(f => ({ ...f, salary: e.target.value, pct: "" }))} style={inputStyle} />
                        {eventForm.pct && projForYear(year) ? <span style={{ fontSize: 11, color: T.green }}>→ {fmt(projForYear(year) * (1 + parseFloat(eventForm.pct) / 100))}</span> : null}
                      </div>
                    )}

                    <div style={rowStyle}>
                      <span style={labelStyle}>🏦 Savings</span>
                      <input type="number" placeholder="% of salary" value={eventForm.savingsPct||""} onChange={e=>setEventForm(f=>({...f,savingsPct:e.target.value}))} style={{...inputStyle,flex:1}} />
                    </div>
                    <div style={rowStyle}>
                      <span style={labelStyle}>💼 401k + Match</span>
                      <input type="number" placeholder="% of salary" value={eventForm.k401Pct} onChange={e => setEventForm(f => ({ ...f, k401Pct: e.target.value }))} style={inputStyle} />
                    </div>

                    <div style={rowStyle}>
                      <span style={labelStyle}>📈 Invest</span>
                      <input type="number" placeholder="% of salary" value={eventForm.investPct} onChange={e => setEventForm(f => ({ ...f, investPct: e.target.value }))} style={inputWide} />
                    </div>

                    <div style={rowStyle}>
                      <span style={labelStyle}>💸 Big Expense</span>
                      <input type="number" placeholder="Amount $" value={eventForm.lifeType === "expense" ? eventForm.lifeAmount : ""} onChange={e => setEventForm(f => ({ ...f, lifeAmount: e.target.value, lifeType: "expense" }))} style={inputWide} />
                    </div>

                    <div style={rowStyle}>
                      <span style={labelStyle}>💰 Lump Invest</span>
                      <input type="number" placeholder="Amount $" value={eventForm.lifeType === "extra-invest" ? eventForm.lifeAmount : ""} onChange={e => setEventForm(f => ({ ...f, lifeAmount: e.target.value, lifeType: "extra-invest" }))} style={inputWide} />
                    </div>



                    <div style={{ ...rowStyle, borderTop: `1px solid rgba(255,255,255,0.06)`, paddingTop: 6, marginTop: 2 }}>
                      <span style={labelStyle}>🏖️ Retire</span>
                      <button onClick={() => setEventForm(f => ({ ...f, retireToggle: !f.retireToggle }))} style={{ flex:1, minWidth:0, fontSize:12, padding:"7px 10px", background: eventForm.retireToggle ? "rgba(251,191,36,0.12)" : "#1a1a2a", border:`1px solid ${eventForm.retireToggle ? T.gold : "rgba(255,255,255,0.12)"}`, borderRadius:5, color: eventForm.retireToggle ? T.gold : T.text1, cursor:"pointer", textAlign:"left", fontFamily:"inherit", fontWeight: eventForm.retireToggle ? 600 : 400 }}>
                        {eventForm.retireToggle ? "✓ Retiring this year" : "Set retirement here"}
                      </button>
                      
                    </div>

                    <div style={{ ...rowStyle, marginTop: 6 }}>
                      <button onClick={commitEvent} style={{ padding: "7px 20px", background: T.accent, border: "none", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 700 }}>Save</button>
                      <button onClick={() => setActiveYear(null)} style={{ padding: "7px 16px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, color: T.text2, fontSize: 13 }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Setup modal */}
      {showSetup && (
        <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)" }}>
          <div style={{ background: T.bg2, border: `1px solid ${T.border2}`, borderRadius: 14, padding: "2rem", width: 360 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 16 }}>Your Starting Point</div>
            {[["Career Start Year", "year"], ["Your Age", "age"], ["Starting Salary $", "salary"]].map(([lbl, key]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: T.text2, marginBottom: 4, letterSpacing: "0.06em" }}>{lbl.toUpperCase()}</div>
                <input type="number" placeholder="" value={state.setupForm[key] || ""} onChange={e => setState(s => ({ ...s, setupForm: { ...s.setupForm, [key]: e.target.value } }))} onKeyDown={e => e.key === "Enter" && commitStart()} />
              </div>
            ))}
            {setupErr && <div style={{ fontSize: 12, color: T.red, marginBottom: 10 }}>{setupErr}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={commitStart} style={{ flex: 1, padding: "9px", background: T.accent, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700 }}>Update →</button>
              {hasStart && <button onClick={() => setShowSetup(false)} style={{ padding: "9px 16px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, color: T.text2, fontSize: 13 }}>Cancel</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const FINNHUB_KEY = "d8do22pr01qhm4ag8c30d8do22pr01qhm4ag8c3g";
const TICKERS = [
  "SPY","QQQ","DIA","IWM","VTI",
  "AAPL","MSFT","NVDA","GOOGL","META","AMZN","TSLA","AVGO","AMD","INTC",
  "CRM","ORCL","ADBE","NFLX","QCOM","MU","UBER",
  "JPM","BAC","WFC","GS","V","MA","BRK.B",
  "JNJ","UNH","PFE","ABBV","LLY","MRK",
  "XOM","CVX",
  "WMT","HD","MCD","NKE","COST","PG","KO","PEP",
  "BA","CAT","GE","TSM","IBIT","PLTR"
];

const MOCK_QUOTES = {
  SPY:{c:594.21,dp:0.42},QQQ:{c:512.87,dp:0.68},DIA:{c:439.15,dp:0.31},IWM:{c:211.34,dp:0.55},VTI:{c:287.63,dp:0.44},
  AAPL:{c:213.55,dp:1.12},MSFT:{c:447.23,dp:0.87},NVDA:{c:137.42,dp:2.31},GOOGL:{c:192.18,dp:0.76},META:{c:612.44,dp:1.43},
  AMZN:{c:224.87,dp:0.93},TSLA:{c:248.33,dp:-1.24},AVGO:{c:237.61,dp:1.08},AMD:{c:168.92,dp:-0.43},INTC:{c:21.87,dp:-0.88},
  CRM:{c:318.45,dp:0.62},ORCL:{c:192.76,dp:0.34},ADBE:{c:432.11,dp:-0.21},NFLX:{c:1124.55,dp:1.77},QCOM:{c:174.23,dp:0.55},
  MU:{c:107.44,dp:1.34},UBER:{c:88.12,dp:0.91},JPM:{c:268.34,dp:0.48},BAC:{c:46.22,dp:0.33},WFC:{c:78.91,dp:0.27},
  GS:{c:612.88,dp:0.82},V:{c:358.44,dp:0.59},MA:{c:547.21,dp:0.71},"BRK.B":{c:514.33,dp:0.38},JNJ:{c:155.22,dp:-0.14},
  UNH:{c:312.45,dp:-0.87},PFE:{c:24.11,dp:-0.33},ABBV:{c:187.63,dp:0.44},LLY:{c:798.44,dp:1.23},MRK:{c:97.88,dp:-0.21},
  XOM:{c:118.33,dp:0.76},CVX:{c:152.44,dp:0.52},WMT:{c:97.22,dp:0.38},HD:{c:387.61,dp:0.44},MCD:{c:312.88,dp:0.19},
  NKE:{c:76.44,dp:-0.62},COST:{c:1012.33,dp:0.87},PG:{c:172.44,dp:0.22},KO:{c:71.88,dp:0.17},PEP:{c:148.22,dp:-0.08},
  BA:{c:188.44,dp:-0.93},CAT:{c:387.21,dp:0.61},GE:{c:212.88,dp:0.77},TSM:{c:192.33,dp:1.44},IBIT:{c:57.22,dp:2.11},PLTR:{c:31.44,dp:3.22}
};

function TickerBar() {
  const [quotes, setQuotes] = useState(MOCK_QUOTES);
  const [live, setLive]     = useState(false);

  const load = useCallback(async () => {
    const fetchBatch = async (tickers) => {
      const results = await Promise.all(
        tickers.map(t =>
          fetch(`https://finnhub.io/api/v1/quote?symbol=${t}&token=${FINNHUB_KEY}`)
            .then(r => r.ok ? r.json() : null).catch(() => null)
        )
      );
      const out = {};
      results.forEach((d, i) => { if (d?.c) out[tickers[i]] = d; });
      return out;
    };
    try {
      const half = Math.ceil(TICKERS.length / 2);
      const [a, b] = await Promise.all([
        fetchBatch(TICKERS.slice(0, half)),
        new Promise(res => setTimeout(() => fetchBatch(TICKERS.slice(half)).then(res), 1100))
      ]);
      const next = {...a, ...b};
      if (Object.keys(next).length > 5) { setQuotes(next); setLive(true); }
    } catch(e) {}
  }, []);

  useEffect(() => { load(); const id = setInterval(load, 120000); return () => clearInterval(id); }, [load]);

  const barStyle = { height:30, background:"#08080f", borderBottom:"1px solid rgba(255,255,255,0.08)", overflow:"hidden", flexShrink:0, position:"relative" };

  const filled = TICKERS.filter(t => quotes[t]);
  const Item = ({t}) => {
    const q = quotes[t];
    const up = q.dp >= 0;
    return (
      <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"0 18px",borderRight:"1px solid rgba(255,255,255,0.06)",height:30}}>
        <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.9)",fontFamily:"monospace",letterSpacing:"0.04em"}}>{t}</span>
        <span style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontFamily:"monospace"}}>${Number(q.c).toFixed(2)}</span>
        <span style={{fontSize:10,fontWeight:700,color:up?"#4ade80":"#f87171",fontFamily:"monospace"}}>{up?"▲":"▼"}{Math.abs(q.dp).toFixed(2)}%</span>
      </div>
    );
  };

  return (
    <div style={barStyle} title="Hover to pause">
      {!live && <div style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",fontSize:9,color:"rgba(255,255,255,0.2)",zIndex:2,background:"#08080f",padding:"0 4px"}}>demo</div>}
      <div className="ticker-track">
        {filled.map(t => <Item key={t+"a"} t={t}/>)}
        {filled.map(t => <Item key={t+"b"} t={t}/>)}
      </div>
    </div>
  );
}

export default function App() {
  const [active, setActive]   = useState("roadmap");
  const [navExpanded, setNavExpanded] = useState(false);
  const [state, setState]     = useState(INIT_STATE);
  const [zoom, setZoom] = useState(() => Math.min(window.innerWidth / 1440, window.innerHeight / 900));
  useEffect(() => {
    const calc = () => setZoom(Math.min(window.innerWidth / 1440, window.innerHeight / 900));
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <div style={{ position:"fixed", top:0, left:0, width:`${100/zoom}vw`, height:`${100/zoom}vh`, transformOrigin:"top left", transform:`scale(${zoom})`, overflow:"hidden", display:"flex", flexDirection:"row" }}>
        {/* Sidebar — full height, left side */}
        <div onMouseEnter={e => { setNavExpanded(true); const el = e.currentTarget; el.classList.remove('nav-shimmer'); void el.offsetWidth; el.classList.add('nav-shimmer'); setTimeout(()=>el.classList.remove('nav-shimmer'),1400); }} onMouseLeave={() => setNavExpanded(false)}
          style={{ width: navExpanded ? 200 : 48, flexShrink: 0, background: "#0a0a10", borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", transition: "width 0.2s", overflow: "hidden" }}>
          <div style={{ padding: navExpanded ? "16px 14px 12px" : "16px 8px 12px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
            {navExpanded ? (
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>My Financial</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>Roadmap</div>
                <div style={{ fontSize: 10, color: T.text2, marginTop: 3 }}>By Dallin Stout</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {["M","F","R"].map((l,i) => <div key={i} style={{ fontSize: 11, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{l}</div>)}
                <div style={{ fontSize: 8, color: T.text2, marginTop: 2 }}>By DS</div>
              </div>
            )}
          </div>
          <nav style={{ flex: 1, padding: "6px 0" }}>
            {NAV.map(item => {
              const on = active === item.id;
              return (
                <button key={item.id} onClick={() => setActive(item.id)} title={item.label}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: navExpanded ? "9px 14px" : "10px 0", justifyContent: navExpanded ? "flex-start" : "center", border: "none", background: on ? T.accentD : "transparent", color: on ? T.accent : T.text1, fontSize: 13, position: "relative", transition: "all 0.1s" }}>
                  {on && <span style={{ position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3, borderRadius: "0 2px 2px 0", background: T.accent }} />}
                  <span style={{ fontSize: navExpanded ? 15 : 18 }}>{item.icon}</span>
                  {navExpanded && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>
        {/* Right column: ticker + content */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <TickerBar />
          <main style={{ flex: 1, overflow: "hidden", position: "relative", backgroundImage:`url(${BG[active]||BG.roadmap})`, backgroundSize:"cover", backgroundPosition:"center" }}>
          {active === "roadmap" && <RoadmapPanel state={state} setState={setState} />}
          {active !== "roadmap" && (
            <div style={{ padding: "2rem", color: T.text1, background: "rgba(10,10,18,0.72)", height: "100%", boxSizing: "border-box" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{NAV.find(n => n.id === active)?.label}</div>
              <p style={{ color: T.text2 }}>Coming soon. Build your roadmap in the Roadmap tab.</p>
            </div>
          )}
          </main>
        </div>{/* end right col */}
      </div>
    </>
  );
}
