import { useEffect, useState } from "react";
import { Package, AlertTriangle, TrendingDown, CheckCircle, ArrowUpDown } from "lucide-react";
import { getInventoryDashboard } from "../services/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#34d399", "#f59e0b", "#ef4444", "#06b6d4"];

export default function InventoryDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getInventoryDashboard()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (error)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="glass rounded-2xl p-8 text-center">
          <AlertTriangle className="text-red-400 mx-auto mb-3" size={32} />
          <p className="text-red-400 font-semibold">Failed to load</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Inventory Dashboard</h1>
        <p className="text-slate-400 text-sm">Demand predictions, stock alerts, and reorder recommendations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="stat-card">
          <Package size={20} className="text-brand-400 mb-3" />
          <p className="text-2xl font-bold text-white">{loading ? "—" : data?.total_products}</p>
          <p className="text-xs text-slate-400">Total Products</p>
        </div>
        <div className="stat-card glow-red">
          <AlertTriangle size={20} className="text-red-400 mb-3" />
          <p className="text-2xl font-bold text-red-400">{loading ? "—" : data?.low_stock_count}</p>
          <p className="text-xs text-slate-400">Low Stock Alerts</p>
        </div>
        <div className="stat-card glow-green">
          <CheckCircle size={20} className="text-emerald-400 mb-3" />
          <p className="text-2xl font-bold text-emerald-400">
            {loading ? "—" : (data?.total_products ?? 0) - (data?.low_stock_count ?? 0)}
          </p>
          <p className="text-xs text-slate-400">Adequately Stocked</p>
        </div>
        <div className="stat-card">
          <ArrowUpDown size={20} className="text-amber-400 mb-3" />
          <p className="text-2xl font-bold text-amber-400">{loading ? "—" : data?.overstock_products?.length ?? 0}</p>
          <p className="text-xs text-slate-400">Overstock Items</p>
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-red-400 animate-pulse-glow" />
          <h2 className="text-sm font-semibold text-white">⚠ Low Stock Alerts — Top Demanded Products</h2>
        </div>
        {loading ? (
          <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-10" />)}</div>
        ) : (
          <div className="space-y-2">
            {data?.low_stock_alerts?.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                <div>
                  <p className="text-sm font-medium text-white">{p.product_name}</p>
                  <p className="text-xs text-slate-500">{p.category} · Avg daily: {p.avg_daily_demand?.toFixed(1)} units</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-400">{p.predicted_quantity?.toFixed(1)} units needed</p>
                  <span className="badge-red">Reorder Now</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demand Chart */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Tomorrow's Predicted Demand (Top 15)</h2>
        {loading ? (
          <div className="skeleton h-60" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={data?.product_demand
                ?.sort((a, b) => b.predicted_quantity - a.predicted_quantity)
                ?.slice(0, 15)
                ?.map((p) => ({
                  name: p.product_name.length > 18 ? p.product_name.slice(0, 18) + "…" : p.product_name,
                  predicted: parseFloat(p.predicted_quantity?.toFixed(1)),
                  actual: parseFloat(p.avg_daily_demand?.toFixed(1)),
                }))}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#252542" />
              <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} width={140} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#1e1e36", border: "1px solid #4338ca", borderRadius: 8 }}
                itemStyle={{ color: "#818cf8" }}
              />
              <Bar dataKey="predicted" name="Predicted Units" fill="#6366f1" radius={[0, 6, 6, 0]} />
              <Bar dataKey="actual" name="Avg Daily (30d)" fill="#34d399" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Store Performance Table */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Store Performance Overview</h2>
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-white/5">
                  <th className="text-left py-2 font-medium">Store</th>
                  <th className="text-left py-2 font-medium">Type</th>
                  <th className="text-right py-2 font-medium">Revenue</th>
                  <th className="text-right py-2 font-medium">Orders</th>
                  <th className="text-right py-2 font-medium">Customers</th>
                  <th className="text-right py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.store_performance?.map((s, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-2 text-white font-medium">
                      {s.store_name.length > 28 ? s.store_name.slice(0, 28) + "…" : s.store_name}
                    </td>
                    <td className="py-2 text-slate-400">{s.store_type}</td>
                    <td className="py-2 text-right text-emerald-400 font-semibold">${s.revenue?.toFixed(0)}</td>
                    <td className="py-2 text-right text-slate-300">{s.orders}</td>
                    <td className="py-2 text-right text-slate-300">{s.customers}</td>
                    <td className="py-2 text-right">
                      <span className={`badge-${s.performance_label === "Best-performing" ? "green" : s.performance_label === "Average" ? "blue" : "red"}`}>
                        {s.performance_label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
