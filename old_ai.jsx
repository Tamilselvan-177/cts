import { useState, useRef, useEffect } from "react";
import {
  Send, Bot, User, Zap, Loader2, ChevronDown,
  BarChart2, X, RefreshCw, Sparkles,
} from "lucide-react";
import { askAssistant } from "../services/api";
import DynamicChart from "../components/DynamicChart";

const SUGGESTIONS = [
  "Why are tomorrow's sales expected to increase?",
  "Which products should I reorder?",
  "Show revenue by store as a bar chart",
  "Give me a pie chart of category revenue",
  "Which store has the highest expected revenue?",
  "Give me today's executive summary",
  "Show product demand forecast as a chart",
  "Which stores are underperforming?",
];

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, onVizClick }) {
  const isUser = msg.role === "user";
  const [agentOpen, setAgentOpen] = useState(false);

  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center ${
        isUser ? "bg-brand-600" : "bg-gradient-to-br from-purple-600 to-brand-600"
      }`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? "bg-brand-600 text-white rounded-tr-sm"
          : "glass text-slate-200 rounded-tl-sm"
      }`}>
        <div className="whitespace-pre-wrap">{msg.content}</div>

        {/* Viz button — shown on assistant messages when viz data exists */}
        {msg.visualization && (
          <button
            onClick={() => onVizClick(msg.visualization)}
            className="mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-brand-600/20 text-brand-300 hover:bg-brand-600/40 transition-colors border border-brand-600/30"
          >
            <BarChart2 size={12} />
            View Chart
          </button>
        )}

        {/* Agent Data Accordion */}
        {msg.agentData && (
          <div className="mt-3 border-t border-white/10 pt-2">
            <button
              onClick={() => setAgentOpen(!agentOpen)}
              className="flex items-center gap-1 text-xs text-brand-300 hover:text-brand-200 transition-colors"
            >
              <Zap size={12} />
              Agent Data
              <ChevronDown size={12} className={`transition-transform ${agentOpen ? "rotate-180" : ""}`} />
            </button>
            {agentOpen && (
              <div className="mt-2 space-y-2">
                <div className="glass rounded-xl p-3">
                  <p className="text-xs font-semibold text-brand-300 mb-1">💹 Sales Agent</p>
                  <p className="text-xs text-slate-400">
                    Revenue: <span className="text-white">${msg.agentData.sales?.total_actual_revenue?.toLocaleString()}</span>
                    {" · "}Tomorrow: <span className="text-emerald-400">${msg.agentData.sales?.predicted_tomorrow_total?.toLocaleString()}</span>
                  </p>
                </div>
                <div className="glass rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-300 mb-1">📦 Inventory Agent</p>
                  <p className="text-xs text-slate-400">
                    Low Stock: <span className="text-red-400">{msg.agentData.inventory?.low_stock_count}</span>
                    {" · "}Units Tomorrow: <span className="text-white">{msg.agentData.inventory?.total_predicted_units_tomorrow}</span>
                  </p>
                </div>
                <div className="glass rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-300 mb-1">📈 Trend Agent</p>
                  <p className="text-xs text-slate-400">{msg.agentData.trends?.summary}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Viz Panel ────────────────────────────────────────────────────────────────
function VizPanel({ charts, onClose }) {
  if (!charts || charts.length === 0) return null;
  return (
    <div className="w-96 shrink-0 flex flex-col glass border-l border-brand-600/20 rounded-2xl overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-brand-400" />
          <span className="text-sm font-semibold text-white">AI Charts</span>
          <span className="badge-blue">{charts.length}</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Charts list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {charts.map((spec, i) => (
          <div key={i}>
            <p className="text-xs text-slate-500 mb-2">Query: <span className="text-slate-300 italic">"{spec.query}"</span></p>
            <DynamicChart spec={spec} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI Business Assistant powered by Gemini 2.5 Flash.\n\n" +
        "I can analyse your live sales data, inventory, and ML predictions.\n\n" +
        "💡 Toggle the **Chart** button (top-right) to enable AI-generated charts alongside my answers!\n\n" +
        "Try asking:\n• Why are tomorrow's sales expected to increase?\n• Show revenue by store as a bar chart\n• Give me a pie chart of category revenue",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [vizEnabled, setVizEnabled] = useState(false);   // top-right toggle
  const [vizPanelOpen, setVizPanelOpen] = useState(false);
  const [charts, setCharts] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-open viz panel when first chart arrives
  useEffect(() => {
    if (charts.length > 0) setVizPanelOpen(true);
  }, [charts]);

  const sendMessage = async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: query }]);
    setLoading(true);

    try {
      const res = await askAssistant(query, vizEnabled);

      const assistantMsg = {
        role: "assistant",
        content: res.answer,
        agentData: res.agent_data,
        visualization: res.visualization || null,
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Collect charts
      if (res.visualization) {
        setCharts(prev => [res.visualization, ...prev].slice(0, 10)); // keep last 10
      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Error: ${e.message}\n\nMake sure the backend is running at http://localhost:8000`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-3rem)]">
      {/* ── Main chat column ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">AI Business Assistant</h1>
            <p className="text-slate-400 text-sm">Multi-agent · Gemini 2.5 Flash · Live ML data</p>
          </div>

          {/* ── TOP-RIGHT CONTROLS ── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Viz toggle button */}
            <button
              onClick={() => setVizEnabled(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                vizEnabled
                  ? "bg-brand-600 border-brand-500 text-white glow-brand"
                  : "glass border-white/10 text-slate-400 hover:text-white"
              }`}
              title={vizEnabled ? "Chart generation ON — answers will include charts" : "Enable AI chart generation"}
            >
              <BarChart2 size={14} />
              {vizEnabled ? "Charts ON" : "Charts OFF"}
            </button>

            {/* Open/close viz panel */}
            {charts.length > 0 && (
              <button
                onClick={() => setVizPanelOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold glass border border-brand-600/30 text-brand-300 hover:text-white transition-colors"
              >
                <Sparkles size={14} />
                {vizPanelOpen ? "Hide" : "View"} Charts ({charts.length})
              </button>
            )}
          </div>
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full glass glass-hover text-slate-300 hover:text-white transition-all disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              msg={msg}
              onVizClick={(viz) => {
                setCharts(prev => {
                  const exists = prev.find(c => c.query === viz.query);
                  return exists ? prev : [viz, ...prev].slice(0, 10);
                });
                setVizPanelOpen(true);
              }}
            />
          ))}

          {loading && (
            <div className="flex gap-3 animate-slide-up">
              <div className="w-8 h-8 shrink-0 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-600 to-brand-600">
                <Bot size={14} className="text-white" />
              </div>
              <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 size={12} className="animate-spin text-brand-400" />
                  {vizEnabled ? "Agents thinking + generating chart…" : "Agents thinking…"}
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {["Sales", "Inventory", "Trend", vizEnabled ? "Viz Agent" : null, "Gemini"].filter(Boolean).map((a, i) => (
                    <span key={i} className="badge-blue animate-pulse-glow" style={{ animationDelay: `${i * 0.25}s` }}>
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="glass rounded-2xl p-3 flex items-center gap-3">
          {vizEnabled && (
            <div className="shrink-0">
              <BarChart2 size={14} className="text-brand-400 animate-pulse-glow" />
            </div>
          )}
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder={vizEnabled
              ? "Ask anything — a chart will be generated too…"
              : "Ask anything about your business…"
            }
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder-slate-500"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-brand-600 hover:bg-brand-500 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed glow-brand"
          >
            {loading
              ? <Loader2 size={15} className="animate-spin text-white" />
              : <Send size={15} className="text-white" />
            }
          </button>
        </div>
      </div>

      {/* ── Right viz panel (slides in) ── */}
      {vizPanelOpen && (
        <VizPanel
          charts={charts}
          onClose={() => setVizPanelOpen(false)}
        />
      )}
    </div>
  );
}
