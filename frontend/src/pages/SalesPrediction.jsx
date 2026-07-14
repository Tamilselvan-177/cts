import { useEffect, useState } from "react";
import { TrendingUp, Calendar, BarChart2, AlertTriangle } from "lucide-react";
import { getSalesDashboard } from "../services/api";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#34d399", "#f59e0b", "#ef4444", "#06b6d4"];

function ForecastCard({ icon: Icon, label, value, sub, color }) {
  const glow = { brand: "glow-brand", green: "glow-green", amber: "glow-amber" }[color] || "glow-brand";
  return (
    <div className={`stat-card ${glow}`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-brand-400" />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="text-3xl font-bold gradient-text">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function SalesPrediction() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSalesDashboard()
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
        <h1 className="text-2xl font-bold text-white mb-1">Sales Prediction</h1>
        <p className="text-slate-400 text-sm">ML-powered revenue forecasts and trend analysis</p>
      </div>

      {/* Forecast Cards */}
      <div className="grid grid-cols-3 gap-4">
        <ForecastCard
          icon={Calendar}
          label="Tomorrow Revenue"
          value={loading ? "—" : `$${data?.tomorrow_revenue?.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub="Predicted by ML model"
          color="brand"
        />
        <ForecastCard
          icon={TrendingUp}
          label="7-Day Forecast"
          value={loading ? "—" : `$${data?.weekly_forecast?.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub="Rolling weekly projection"
          color="green"
        />
        <ForecastCard
          icon={BarChart2}
          label="Monthly Forecast"
          value={loading ? "—" : `$${data?.monthly_forecast?.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub="Based on daily prediction"
          color="amber"
        />
      </div>

      {/* Revenue Trend Line Chart */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Daily Revenue Trend (Last 90 Days)</h2>
        {loading ? (
          <div className="skeleton h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data?.daily_chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252542" />
              <XAxis
                dataKey="order_date"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                tickFormatter={(v) => v.slice(5)}
                interval={14}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "#1e1e36", border: "1px solid #4338ca", borderRadius: 8 }}
                labelStyle={{ color: "#e2e8f0" }}
                formatter={(v) => [`$${v?.toFixed(2)}`, "Revenue"]}
              />
              <Line
                type="monotone"
                dataKey="actual_revenue"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                name="Actual Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monthly + Category */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Monthly Bar */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Monthly Revenue</h2>
          {loading ? (
            <div className="skeleton h-52" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={data?.monthly_chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252542" />
                <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "#1e1e36", border: "1px solid #4338ca", borderRadius: 8 }}
                  formatter={(v) => [`$${v?.toFixed(2)}`, "Revenue"]}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {data?.monthly_chart?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Trends */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Category Trends</h2>
          {loading ? (
            <div className="space-y-2">{[...Array(7)].map((_, i) => <div key={i} className="skeleton h-8" />)}</div>
          ) : (
            <div className="space-y-3">
              {data?.category_trends?.map((cat, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-white">{cat.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">${cat.revenue_last_30d?.toFixed(0)}</span>
                    <span className={`badge-${cat.trend === "Growing" ? "green" : cat.trend === "Declining" ? "red" : "blue"}`}>
                      {cat.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tomorrow Top Products */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Tomorrow's Top Predicted Products</h2>
        {loading ? (
          <div className="skeleton h-48" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.tomorrow_top_products?.map((p) => ({
              name: p.product_name.length > 22 ? p.product_name.slice(0, 22) + "…" : p.product_name,
              qty: parseFloat(p.predicted_quantity?.toFixed(1)),
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252542" />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#1e1e36", border: "1px solid #4338ca", borderRadius: 8 }}
                formatter={(v) => [v, "Predicted Units"]}
              />
              <Bar dataKey="qty" radius={[6, 6, 0, 0]}>
                {data?.tomorrow_top_products?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
