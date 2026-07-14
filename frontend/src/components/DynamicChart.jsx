/**
 * DynamicChart — renders any Recharts chart from a Gemini-generated spec.
 * Supports: bar, line, area, pie, scatter
 */
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

const DEFAULT_COLORS = [
  "#6366f1", "#8b5cf6", "#34d399", "#f59e0b",
  "#ef4444", "#06b6d4", "#a78bfa", "#fb923c",
];

const TOOLTIP_STYLE = {
  contentStyle: { background: "#1e1e36", border: "1px solid #4338ca", borderRadius: 8 },
  labelStyle: { color: "#e2e8f0" },
  itemStyle: { color: "#818cf8" },
};

export default function DynamicChart({ spec }) {
  if (!spec || !spec.data || spec.data.length === 0) return null;

  const { chart_type, data, x_key = "name", y_keys = [], title, insight } = spec;
  const colors = y_keys.map((y, i) => y.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]);

  const axisProps = {
    tick: { fill: "#94a3b8", fontSize: 10 },
    axisLine: false,
    tickLine: false,
  };

  const renderChart = () => {
    switch (chart_type) {
      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252542" />
            <XAxis dataKey={x_key} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
            {y_keys.map((y, i) => (
              <Line key={y.key} type="monotone" dataKey={y.key} name={y.label || y.key}
                stroke={colors[i]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        );

      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252542" />
            <XAxis dataKey={x_key} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
            {y_keys.map((y, i) => (
              <Area key={y.key} type="monotone" dataKey={y.key} name={y.label || y.key}
                stroke={colors[i]} fill={colors[i] + "33"} strokeWidth={2} />
            ))}
          </AreaChart>
        );

      case "pie":
        return (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%"
              outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}>
              {data.map((_, i) => <Cell key={i} fill={DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />)}
            </Pie>
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
          </PieChart>
        );

      default: // bar
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#252542" />
            <XAxis dataKey={x_key} {...axisProps} angle={-15} textAnchor="end" height={50} />
            <YAxis {...axisProps} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
            {y_keys.map((y, i) => (
              <Bar key={y.key} dataKey={y.key} name={y.label || y.key}
                fill={colors[i]} radius={[6, 6, 0, 0]} />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="glass rounded-2xl p-4 animate-slide-up">
      <p className="text-sm font-semibold text-white mb-1">{title}</p>
      {spec.description && <p className="text-xs text-slate-400 mb-3">{spec.description}</p>}
      <ResponsiveContainer width="100%" height={220}>
        {renderChart()}
      </ResponsiveContainer>
      {insight && (
        <div className="mt-3 p-3 rounded-xl bg-brand-600/10 border border-brand-600/20">
          <p className="text-xs text-brand-300">💡 {insight}</p>
        </div>
      )}
    </div>
  );
}
