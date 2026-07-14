import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, TrendingUp, Package, MessageSquareText,
  Zap, RefreshCw, Clock, CheckCircle2,
} from "lucide-react";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import SalesPrediction from "./pages/SalesPrediction";
import InventoryDashboard from "./pages/InventoryDashboard";
import AIAssistant from "./pages/AIAssistant";
import { getSyncStatus, triggerSync } from "./services/api";
import "./index.css";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Executive" },
  { to: "/sales", icon: TrendingUp, label: "Sales" },
  { to: "/inventory", icon: Package, label: "Inventory" },
  { to: "/assistant", icon: MessageSquareText, label: "AI Chat" },
];

function Sidebar({ syncInfo, onSync, syncing }) {
  const location = useLocation();

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 flex flex-col glass border-r border-brand-600/20 p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-8 mt-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center glow-brand">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">SalesAI</p>
          <p className="text-xs text-slate-500">Decision System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, icon: Icon, label }) => {
          const isActive = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
          return (
            <NavLink key={to} to={to}>
              <div className={`nav-item ${isActive ? "active" : ""}`}>
                <Icon size={18} />
                <span className="text-sm font-medium">{label}</span>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* Data Sync Card */}
      <div className="mt-6 glass rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={12} className="text-brand-400" />
          <p className="text-xs font-semibold text-white">Data Sync</p>
          {syncInfo?.sync_in_progress && (
            <RefreshCw size={10} className="text-amber-400 animate-spin ml-auto" />
          )}
        </div>
        <p className="text-xs text-slate-500 mb-3">
          {syncInfo?.sync_in_progress
            ? "Syncing ML pipeline…"
            : syncInfo?.last_sync
            ? `Last: ${new Date(syncInfo.last_sync).toLocaleTimeString()}`
            : "Auto-sync: every 12h"}
        </p>
        <button
          onClick={onSync}
          disabled={syncing || syncInfo?.sync_in_progress}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-brand-600/20 text-brand-300 hover:bg-brand-600/40 transition-colors disabled:opacity-40 border border-brand-600/20"
        >
          <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing…" : "Sync Now"}
        </button>
      </div>

      {/* Footer */}
      <div className="mt-auto px-0">
        <div className="glass rounded-xl p-3">
          <p className="text-xs text-slate-500 mb-1">Powered by</p>
          <p className="text-xs font-semibold text-brand-300">Sibi ✦</p>
          <p className="text-xs text-slate-500 mt-0.5">Multi-Agent Orchestrator</p>
          <div className="flex items-center gap-1 mt-2">
            <CheckCircle2 size={10} className="text-emerald-400" />
            <span className="text-xs text-emerald-400">Backend connected</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  const [syncInfo, setSyncInfo] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Poll sync status every 10s
  useEffect(() => {
    const fetchStatus = () =>
      getSyncStatus().then(setSyncInfo).catch(() => {});
    fetchStatus();
    const t = setInterval(fetchStatus, 10000);
    return () => clearInterval(t);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await triggerSync();
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      setTimeout(() => setSyncing(false), 2000);
    }
  };

  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar syncInfo={syncInfo} onSync={handleSync} syncing={syncing} />
        <main className="flex-1 overflow-auto p-6">
          <Routes>
            <Route path="/" element={<ExecutiveDashboard />} />
            <Route path="/sales" element={<SalesPrediction />} />
            <Route path="/inventory" element={<InventoryDashboard />} />
            <Route path="/assistant" element={<AIAssistant />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
