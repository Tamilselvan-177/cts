import { useEffect, useState } from "react";
import {
  DollarSign, TrendingUp, ShoppingBag, Users, AlertTriangle, Award, TrendingDown, Activity,
} from "lucide-react";
import { getExecutiveDashboard } from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

function StatCard({ icon: Icon, label, value, sub, color = "brand", badge }) {
  const colorMap = {
    brand: "text-brand-400 bg-brand-500/10",
    green: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    red: "text-red-400 bg-red-500/10",
    purple: "text-purple-400 bg-purple-500/10",
  };
  return (
    <div className="stat-card animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
        {badge && <span className="badge-green">{badge}</span>}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function Skeleton({ h = "h-8", w = "w-full" }) {
  return <div className={`skeleton ${h} ${w}`} />;
}

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

export default function ExecutiveDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getExecutiveDashboard()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="glass rounded-2xl p-8 text-center">
          <AlertTriangle className="text-red-400 mx-auto mb-3" size={32} />
          <p className="text-red-400 font-semibold">Failed to load data</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Executive Dashboard</h1>
        <p className="text-slate-400 text-sm">
          Real-time business overview · ML-powered predictions
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={loading ? "—" : `$${data?.total_revenue?.toLocaleString()}`}
          sub="All-time cumulative"
          color="green"
          badge="Live"
        />
        <StatCard
          icon={TrendingUp}
          label="Tomorrow Forecast"
          value={loading ? "—" : `$${data?.predicted_tomorrow_revenue?.toLocaleString()}`}
          sub="ML-predicted"
          color="brand"
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={loading ? "—" : data?.total_orders?.toLocaleString()}
          sub="All-time orders"
          color="purple"
        />
        <StatCard
          icon={Activity}
          label="Revenue Growth"
          value={loading ? "—" : `${data?.revenue_growth_pct > 0 ? "+" : ""}${data?.revenue_growth_pct}%`}
          sub="Month-over-month"
          color={data?.revenue_growth_pct >= 0 ? "green" : "red"}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award size={16} className="text-brand-400" />
            <h2 className="text-sm font-semibold text-white">Top Selling Products</h2>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} h="h-6" />)}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={data?.top_products?.map((p) => ({
                  name: p.product_name.length > 18 ? p.product_name.slice(0, 18) + "…" : p.product_name,
                  units: p.units_sold,
                }))}
                layout="vertical"
              >
                <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} width={130} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1e1e36", border: "1px solid #4338ca", borderRadius: 8 }}
                  labelStyle={{ color: "#e2e8f0" }}
                  itemStyle={{ color: "#818cf8" }}
                />
                <Bar dataKey="units" radius={[0, 6, 6, 0]}>
                  {data?.top_products?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Worst Performing Stores */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={16} className="text-red-400" />
            <h2 className="text-sm font-semibold text-white">Worst Performing Stores</h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} h="h-10" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {data?.worst_stores?.map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                  <div>
                    <p className="text-xs font-medium text-white">
                      {s.store_name.length > 30 ? s.store_name.slice(0, 30) + "…" : s.store_name}
                    </p>
                    <p className="text-xs text-slate-500">{s.orders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-400">${s.revenue?.toFixed(0)}</p>
                    <span className="badge-red">{s.performance_label}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ML Metrics */}
      {!loading && data?.ml_metrics && (
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">ML Model Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(data.ml_metrics)
              .filter(([k]) => k !== "customer_segmentation")
              .map(([key, val]) => (
                <div key={key} className="glass rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-2 capitalize">{key.replace(/_/g, " ")}</p>
                  <p className="text-lg font-bold text-brand-300">{val.r2?.toFixed(3)}</p>
                  <p className="text-xs text-slate-500">R² Score</p>
                  <p className="text-xs text-slate-500 mt-1">MAE: {val.mae}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
