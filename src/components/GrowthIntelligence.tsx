import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Utensils,
  Clock,
  AlertTriangle,
  Star,
  Crown,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Info,
  BarChart3,
  PieChart as LucidePieChart,
  Activity,
  Brain,
  Sparkles,
  RefreshCw,
  HelpCircle,
  X,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/pie-chart";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL || "http://localhost:5000";

// ════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════
interface GrowthScoreData {
  growthScore: number;
  grade: string;
  computedAt: string;
  components: {
    revenueVelocity: ComponentData;
    customerHealth: CustomerHealthData;
    menuEfficiency: MenuEfficiencyData;
    operationalTiming: OperationalData;
  };
  recommendations: Recommendation[];
  summary: string;
}

interface ComponentData {
  weight: string;
  score: number;
  [key: string]: any;
}

interface CustomerHealthData extends ComponentData {
  totalCustomers: number;
  activeInLast30Days: number;
  retentionRate: number;
  churnRate: number;
  repeatRate: number;
  segments: {
    champions: number;
    loyal: number;
    atRisk: number;
    newCustomers: number;
    lost: number;
  };
  topChampions: Array<{ name: string; phone: string; monetary: number; frequency: number; recency: number }>;
  topAtRisk: Array<{ name: string; phone: string; monetary: number; frequency: number; recency: number }>;
}

interface MenuEfficiencyData extends ComponentData {
  matrix: {
    stars: MenuMatrixItem[];
    cashCows: MenuMatrixItem[];
    puzzles: MenuMatrixItem[];
    dogs: MenuMatrixItem[];
  };
  counts: { stars: number; cashCows: number; puzzles: number; dogs: number };
  deadStock: Array<{ name: string; price: number }>;
  deadStockCount: number;
  concentrationRatio: number;
  top3Items: Array<{ name: string; revenue: number; sharePercent: number }>;
}

interface MenuMatrixItem {
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
}

interface OperationalData extends ComponentData {
  peakHours: Array<{ hour: string; orders: number; revenue: number }>;
  slowHours: Array<{ hour: string; orders: number; revenue: number }>;
  completionRate: number;
  cancellationRate: number;
  totalOrdersAnalyzed: number;
  dailyBreakdown: Array<{ day: string; orders: number; revenue: number }>;
  hourlyBreakdown: Array<{ hour: number; orders: number; revenue: number }>;
}

interface Recommendation {
  priority: "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  message: string;
}

// ════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ════════════════════════════════════════════════════════

// Animated circular score gauge
const ScoreGauge = ({ score, grade, size = 200 }: { score: number; grade: string; size?: number }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  useEffect(() => {
    let frame: number;
    let start = 0;
    const duration = 1500;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(score * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const getColor = (s: number) => {
    if (s >= 80) return "#22c55e";
    if (s >= 60) return "#eab308";
    if (s >= 40) return "#f97316";
    return "#ef4444";
  };

  const color = getColor(animatedScore);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        {/* Score arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 0.1s ease-out", filter: `drop-shadow(0 0 8px ${color}50)` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-5xl font-bold font-headline" style={{ color }}>{animatedScore}</span>
        <span className="text-lg font-bold font-label tracking-wider mt-0.5" style={{ color }}>{grade}</span>
        <span className="text-[10px] uppercase tracking-widest text-white/40 mt-1">Growth Score</span>
      </div>
    </div>
  );
};

// Mini score bar
const MiniScoreBar = ({ score, label, weight, icon: Icon, color }: { score: number; label: string; weight: string; icon: any; color: string }) => (
  <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all group">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div>
          <p className="text-xs font-bold text-white/90 font-label">{label}</p>
          <p className="text-[10px] text-white/40 font-label uppercase tracking-wider">{weight} weight</p>
        </div>
      </div>
      <span className="text-lg font-bold font-headline" style={{ color }}>{score}</span>
    </div>
    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-1000 ease-out"
        style={{ width: `${score}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}40` }}
      />
    </div>
  </div>
);

// Recommendation card
const RecommendationCard = ({ rec }: { rec: Recommendation; key?: React.Key }) => {
  const priorityStyles: Record<string, { border: string; bg: string; badge: string; text: string }> = {
    high: { border: "border-red-500/30", bg: "bg-red-500/5", badge: "bg-red-500/20 text-red-400", text: "URGENT" },
    medium: { border: "border-yellow-500/30", bg: "bg-yellow-500/5", badge: "bg-yellow-500/20 text-yellow-400", text: "IMPORTANT" },
    low: { border: "border-blue-500/30", bg: "bg-blue-500/5", badge: "bg-blue-500/20 text-blue-400", text: "SUGGESTION" },
    info: { border: "border-green-500/30", bg: "bg-green-500/5", badge: "bg-green-500/20 text-green-400", text: "INSIGHT" },
  };
  const style = priorityStyles[rec.priority] || priorityStyles.info;

  return (
    <div className={`rounded-xl p-4 border ${style.border} ${style.bg} hover:scale-[1.01] transition-transform`}>
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${style.badge}`}>
              {style.text}
            </span>
            <span className="text-[9px] text-white/30 uppercase tracking-wider">{rec.category}</span>
          </div>
          <h4 className="text-sm font-bold text-white mb-1">{rec.title}</h4>
          <p className="text-xs text-white/60 leading-relaxed">{rec.message}</p>
        </div>
      </div>
    </div>
  );
};

// BCG Matrix Item
const MatrixItem = ({ item, type }: { item: MenuMatrixItem; type: string; key?: React.Key }) => {
  const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
    star: { icon: Star, color: "#eab308", label: "Star" },
    cashCow: { icon: Target, color: "#22c55e", label: "Cash Cow" },
    puzzle: { icon: HelpCircle, color: "#8b5cf6", label: "Puzzle" },
    dog: { icon: AlertTriangle, color: "#ef4444", label: "Dog" },
  };
  const config = typeConfig[type] || typeConfig.star;
  const TypeIcon = config.icon;

  return (
    <div className="flex items-center justify-between py-2.5 px-3 bg-[#1a1a1a] rounded-lg border border-white/5 hover:border-white/10 transition-all">
      <div className="flex items-center gap-2.5">
        <TypeIcon size={14} style={{ color: config.color }} />
        <span className="text-xs text-white/80 font-medium">{item.name}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-[10px] text-white/40 font-label">{item.totalQuantity} sold</span>
        <span className="text-xs font-bold font-label" style={{ color: config.color }}>₹{item.totalRevenue.toLocaleString()}</span>
      </div>
    </div>
  );
};

// Segment Badge
const SegmentBadge = ({ label, count, color, icon: Icon }: { label: string; count: number; color: string; icon: any }) => (
  <div className="flex flex-col items-center gap-2 p-4 bg-[#1a1a1a] rounded-xl border border-white/5 min-w-[100px]">
    <div className="p-2.5 rounded-full" style={{ backgroundColor: `${color}15` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <span className="text-2xl font-bold font-headline" style={{ color }}>{count}</span>
    <span className="text-[10px] font-label uppercase tracking-wider text-white/50">{label}</span>
  </div>
);

// Bar chart component (horizontal)
const HorizontalBar = ({ data, maxVal, color }: { data: Array<{ label: string; value: number; subtitle?: string }>; maxVal: number; color: string }) => (
  <div className="space-y-2">
    {data.map((item, i) => (
      <div key={i} className="flex items-center gap-3">
        <span className="text-[10px] text-white/50 font-label w-10 text-right shrink-0">{item.label}</span>
        <div className="flex-1 h-6 bg-white/5 rounded-md overflow-hidden relative">
          <div
            className="h-full rounded-md transition-all duration-700 ease-out flex items-center pl-2"
            style={{ width: `${maxVal > 0 ? (item.value / maxVal) * 100 : 0}%`, backgroundColor: color, minWidth: item.value > 0 ? '20px' : '0' }}
          >
            {item.value > 0 && <span className="text-[10px] font-bold text-white/90">{item.value}</span>}
          </div>
        </div>
        {item.subtitle && <span className="text-[10px] text-white/30 w-16 shrink-0">{item.subtitle}</span>}
      </div>
    ))}
  </div>
);

// ════════════════════════════════════════════════════════
// USER GUIDE MODAL
// ════════════════════════════════════════════════════════
const UserGuide = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div
      className="bg-[#1c1c1c] rounded-2xl border border-white/10 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="sticky top-0 bg-[#1c1c1c] border-b border-white/5 p-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <BookOpen size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-headline text-white">Growth Intelligence — User Guide</h2>
            <p className="text-xs text-white/40">Mathematical formulas & methodology</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <X size={18} className="text-white/40" />
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* Overview */}
        <section>
          <h3 className="text-sm font-bold font-label uppercase tracking-wider text-purple-400 mb-3">📊 How the Growth Score Works</h3>
          <p className="text-xs text-white/60 leading-relaxed mb-4">
            The Growth Intelligence engine computes a <strong className="text-white">composite score from 0–100</strong> by analyzing 4 key dimensions
            of your restaurant's performance. Each component uses statistical models running entirely on your order, menu, and customer data.
          </p>
          <div className="bg-[#131313] rounded-xl p-4 border border-purple-500/20 font-mono text-xs text-purple-300">
            <p className="mb-1 text-white/40">// Master Formula</p>
            <p>GrowthScore = (0.30 × RevenueVelocity)</p>
            <p className="pl-14">+ (0.25 × CustomerHealth)</p>
            <p className="pl-14">+ (0.25 × MenuEfficiency)</p>
            <p className="pl-14">+ (0.20 × OperationalTiming)</p>
          </div>
        </section>

        {/* Component 1 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-bold font-label uppercase tracking-wider text-emerald-400">1. Revenue Velocity Index (30% weight)</h3>
          </div>
          <p className="text-xs text-white/60 leading-relaxed mb-3">
            Measures how fast your revenue is growing compared to your historical average. It detects both growth rate and acceleration
            (is growth speeding up or slowing down?).
          </p>
          <div className="bg-[#131313] rounded-xl p-4 border border-emerald-500/20 font-mono text-xs text-emerald-300 space-y-2">
            <p className="text-white/40">// Growth Rate</p>
            <p>GrowthRate = ((CurrentWeekRevenue - MovingAvg) / MovingAvg) × 100</p>
            <p className="mt-3 text-white/40">// Acceleration (change in growth rate)</p>
            <p>Acceleration = CurrentGrowthRate - PreviousGrowthRate</p>
            <p className="mt-3 text-white/40">// Final Score</p>
            <p>Score = 50 + (GrowthRate × 0.5) + (Acceleration × 0.1)</p>
            <p>Score = clamp(Score, 0, 100)</p>
          </div>
          <p className="text-[10px] text-white/30 mt-2 italic">
            Score 50 = stable (matching average). {">"} 50 = growing. {"<"} 50 = declining.
            MovingAvg uses a 4-week window.
          </p>
        </section>

        {/* Component 2 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <h3 className="text-sm font-bold font-label uppercase tracking-wider text-blue-400">2. Customer Health Score (25% weight)</h3>
          </div>
          <p className="text-xs text-white/60 leading-relaxed mb-3">
            Uses <strong className="text-white">RFM Analysis</strong> (Recency, Frequency, Monetary) to segment every customer into 5 tiers.
            Also computes churn risk and retention rates.
          </p>

          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-white/60 font-label uppercase text-[10px] tracking-wider">Segment</th>
                  <th className="text-left py-2 px-3 text-white/60 font-label uppercase text-[10px] tracking-wider">Recency</th>
                  <th className="text-left py-2 px-3 text-white/60 font-label uppercase text-[10px] tracking-wider">Frequency</th>
                  <th className="text-left py-2 px-3 text-white/60 font-label uppercase text-[10px] tracking-wider">Monetary</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                <tr className="border-b border-white/5"><td className="py-2 px-3">👑 Champions</td><td className="py-2 px-3 text-green-400">High</td><td className="py-2 px-3 text-green-400">High</td><td className="py-2 px-3 text-green-400">High</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-3">💎 Loyal</td><td className="py-2 px-3 text-green-400">High</td><td className="py-2 px-3 text-green-400">High</td><td className="py-2 px-3 text-white/40">Any</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-3">⚠️ At Risk</td><td className="py-2 px-3 text-red-400">Low</td><td className="py-2 px-3 text-green-400">High</td><td className="py-2 px-3 text-white/40">Any</td></tr>
                <tr className="border-b border-white/5"><td className="py-2 px-3">🌱 New</td><td className="py-2 px-3 text-green-400">High</td><td className="py-2 px-3 text-red-400">Low</td><td className="py-2 px-3 text-white/40">Any</td></tr>
                <tr><td className="py-2 px-3">💀 Lost</td><td className="py-2 px-3 text-red-400">Low</td><td className="py-2 px-3 text-red-400">Low</td><td className="py-2 px-3 text-white/40">Any</td></tr>
              </tbody>
            </table>
          </div>

          <div className="bg-[#131313] rounded-xl p-4 border border-blue-500/20 font-mono text-xs text-blue-300 space-y-2">
            <p className="text-white/40">// Health Score Composite</p>
            <p>RetentionComponent = normalize(RetentionRate, 0, 100) × 0.4</p>
            <p>ChurnComponent = (100 - normalize(ChurnRate, 0, 100)) × 0.3</p>
            <p>RepeatComponent = normalize(RepeatRate, 0, 80) × 0.3</p>
            <p className="mt-2">Score = RetentionComponent + ChurnComponent + RepeatComponent</p>
          </div>
        </section>

        {/* Component 3 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <h3 className="text-sm font-bold font-label uppercase tracking-wider text-amber-400">3. Menu Efficiency Score (25% weight)</h3>
          </div>
          <p className="text-xs text-white/60 leading-relaxed mb-3">
            Applies the <strong className="text-white">BCG Growth-Share Matrix</strong> to classify every menu item.
            Also detects dead stock and revenue concentration risk.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-[#131313] rounded-lg p-3 border border-yellow-500/20">
              <p className="text-xs font-bold text-yellow-400">⭐ Stars</p>
              <p className="text-[10px] text-white/40">High Popularity + High Revenue</p>
            </div>
            <div className="bg-[#131313] rounded-lg p-3 border border-green-500/20">
              <p className="text-xs font-bold text-green-400">🎯 Cash Cows</p>
              <p className="text-[10px] text-white/40">Low Popularity + High Revenue</p>
            </div>
            <div className="bg-[#131313] rounded-lg p-3 border border-purple-500/20">
              <p className="text-xs font-bold text-purple-400">🧩 Puzzles</p>
              <p className="text-[10px] text-white/40">High Popularity + Low Revenue</p>
            </div>
            <div className="bg-[#131313] rounded-lg p-3 border border-red-500/20">
              <p className="text-xs font-bold text-red-400">🐕 Dogs</p>
              <p className="text-[10px] text-white/40">Low Popularity + Low Revenue</p>
            </div>
          </div>

          <div className="bg-[#131313] rounded-xl p-4 border border-amber-500/20 font-mono text-xs text-amber-300 space-y-2">
            <p className="text-white/40">// Performance Ratio</p>
            <p>PerformerRatio = ((Stars + CashCows) / TotalItems) × 100</p>
            <p className="mt-2 text-white/40">// Penalties</p>
            <p>DeadStockPenalty = (DeadItems / TotalMenuItems) × 30</p>
            <p>ConcentrationPenalty = max(0, (Top3RevenueShare - 60) × 0.5)</p>
            <p className="mt-2">Score = PerformerRatio - DeadStockPenalty - ConcentrationPenalty</p>
          </div>
        </section>

        {/* Component 4 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-cyan-500" />
            <h3 className="text-sm font-bold font-label uppercase tracking-wider text-cyan-400">4. Operational Timing Score (20% weight)</h3>
          </div>
          <p className="text-xs text-white/60 leading-relaxed mb-3">
            Evaluates order distribution across hours and days using the <strong className="text-white">Coefficient of Variation</strong>
            (lower = more consistent = better). Also tracks completion vs cancellation rates.
          </p>

          <div className="bg-[#131313] rounded-xl p-4 border border-cyan-500/20 font-mono text-xs text-cyan-300 space-y-2">
            <p className="text-white/40">// Hour Distribution (Coefficient of Variation)</p>
            <p>CV = StandardDeviation(hourlyOrders) / Mean(hourlyOrders)</p>
            <p>DistributionScore = normalize(1 - min(CV, 2), 0, 1)</p>
            <p className="mt-2 text-white/40">// Completion Rate</p>
            <p>CompletionRate = (Completed + Served) / TotalOrders × 100</p>
            <p>CompletionScore = normalize(CompletionRate, 50, 95)</p>
            <p className="mt-2 text-white/40">// Composite</p>
            <p>Score = Distribution × 0.3 + Consistency × 0.3 + Completion × 0.4</p>
          </div>
        </section>

        {/* Grade Scale */}
        <section>
          <h3 className="text-sm font-bold font-label uppercase tracking-wider text-white/80 mb-3">📏 Grade Scale</h3>
          <div className="grid grid-cols-5 gap-1">
            {[
              { grade: "A+", range: "90-100", color: "#22c55e" },
              { grade: "A", range: "80-89", color: "#22c55e" },
              { grade: "B+", range: "70-79", color: "#eab308" },
              { grade: "B", range: "60-69", color: "#eab308" },
              { grade: "C+", range: "50-59", color: "#f97316" },
            ].map((g) => (
              <div key={g.grade} className="bg-[#131313] rounded-lg p-2 text-center border border-white/5">
                <span className="text-lg font-bold font-headline" style={{ color: g.color }}>{g.grade}</span>
                <p className="text-[9px] text-white/30">{g.range}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════
export default function GrowthIntelligence({ token }: { token: string }) {
  const [data, setData] = useState<GrowthScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [activeSection, setActiveSection] = useState<"overview" | "customers" | "menu" | "operations" | "recommendations">("overview");
  const [refreshing, setRefreshing] = useState(false);

  // Date range filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const headers = {
    Authorization: `Bearer ${token}`,
    "x-tenant-slug": "stomach-oriental",
  };

  const fetchData = async (isRefresh = false, sDate = startDate, eDate = endDate) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const queryParams = new URLSearchParams();
      if (sDate) queryParams.append("startDate", sDate);
      if (eDate) queryParams.append("endDate", eDate);

      const queryString = queryParams.toString();
      const url = `${BACKEND_URL}/api/intelligence/growth-score${queryString ? `?${queryString}` : ""}`;

      const res = await fetch(url, { headers });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load intelligence data");
      }
    } catch (e) {
      setError("Cannot connect to server. Ensure backend is running.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApplyFilters = () => {
    fetchData(false, startDate, endDate);
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    fetchData(false, "", "");
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-2 border-purple-500/20 rounded-full" />
            <div className="absolute inset-0 border-2 border-t-purple-500 rounded-full animate-spin" />
            <Brain size={28} className="absolute inset-0 m-auto text-purple-400" />
          </div>
          <p className="text-sm text-white/60 font-label">Analyzing your restaurant data...</p>
          <p className="text-[10px] text-white/30 mt-1">Computing RFM segments, BCG matrix, and velocity metrics</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
          <p className="text-sm text-red-400 font-bold">{error || "No data available"}</p>
          <button onClick={() => fetchData()} className="mt-4 text-xs text-purple-400 hover:text-purple-300 underline">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const rv = data.components.revenueVelocity;
  const ch = data.components.customerHealth as CustomerHealthData;
  const me = data.components.menuEfficiency as MenuEfficiencyData;
  const ot = data.components.operationalTiming as OperationalData;

  const sectionTabs = [
    { id: "overview", label: "Overview", icon: LucidePieChart },
    { id: "customers", label: "Customers", icon: Users },
    { id: "menu", label: "Menu Matrix", icon: Utensils },
    { id: "operations", label: "Operations", icon: Clock },
    { id: "recommendations", label: "Actions", icon: Zap },
  ] as const;

  return (
    <div className="flex-1 overflow-y-auto">
      {showGuide && <UserGuide onClose={() => setShowGuide(false)} />}

      {/* Header */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#131313]/95 backdrop-blur-lg z-20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-600/20 to-fuchsia-600/20 rounded-xl border border-purple-500/20">
            <Brain size={22} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-headline text-white tracking-tight">Growth Intelligence</h1>
            <p className="text-[10px] text-white/40 font-label uppercase tracking-wider">
              Computed {new Date(data.computedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-label uppercase tracking-wider font-bold transition-all border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/5 text-white/60 hover:text-purple-400 ${refreshing ? "animate-pulse" : ""}`}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-label uppercase tracking-wider font-bold bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all"
          >
            <BookOpen size={14} />
            User Guide
          </button>
        </div>
      </div>

      {/* Date Filters Panel */}
      <div className="mx-6 mt-4 p-4 bg-[#1a1a1a]/80 rounded-2xl border border-white/5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Activity size={16} className="text-purple-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-white font-label">Filter Growth Metrics</p>
            <p className="text-[10px] text-white/40">Select a custom date range to recalculate RFM segments and performance</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2 bg-[#131313] border border-white/10 rounded-xl px-3 py-2">
            <span className="text-[10px] text-white/40 uppercase font-semibold font-label">Start</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none [color-scheme:dark]"
            />
          </div>

          <div className="flex items-center gap-2 bg-[#131313] border border-white/10 rounded-xl px-3 py-2">
            <span className="text-[10px] text-white/40 uppercase font-semibold font-label">End</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none [color-scheme:dark]"
            />
          </div>

          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-label font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            Apply Filters
          </button>

          {(startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 border border-white/10 hover:border-white/20 text-white/60 hover:text-white font-label font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Section Tabs */}
      <div className="px-6 pt-4 flex gap-1 overflow-x-auto">
        {sectionTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-label uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
              activeSection === tab.id
                ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                : "text-white/50 hover:bg-white/5 hover:text-white"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.id === "recommendations" && data.recommendations.length > 0 && (
              <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                {data.recommendations.filter((r) => r.priority === "high").length || data.recommendations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* ═══ OVERVIEW ═══ */}
        {activeSection === "overview" && (() => {
          const radarData = [
            { subject: "Revenue Velocity", score: rv.score },
            { subject: "Customer Health", score: ch.score },
            { subject: "Menu Efficiency", score: me.score },
            { subject: "Operational Timing", score: ot.score },
          ];

          return (
            <div className="space-y-6 animate-blur-fade-up">
              {/* Score + Summary + Radar Chart + Component Scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Circular Gauge Card */}
                <Card className="bg-[#1a1a1a]/70 border-white/5 shadow-2xl glass-card p-6 flex flex-col items-center justify-center min-h-[320px]">
                  <ScoreGauge score={data.growthScore} grade={data.grade} />
                  <p className="text-xs text-white/50 text-center mt-4 leading-relaxed max-w-[250px]">{data.summary}</p>
                </Card>

                {/* Radar Chart Card */}
                <Card className="bg-[#1a1a1a]/70 border-white/5 shadow-2xl glass-card p-5 flex flex-col justify-between min-h-[320px]">
                  <div>
                    <h3 className="text-xs font-bold font-label uppercase tracking-wider text-purple-400 mb-1 flex items-center gap-1.5">
                      <Activity size={14} className="text-purple-400" />
                      Growth AI Dimensions
                    </h3>
                    <p className="text-[9px] text-white/40 font-label">Visualizing overall balance across the 4 key metrics.</p>
                  </div>
                  <div className="h-48 w-full flex items-center justify-center mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                        <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
                        <PolarAngleAxis dataKey="subject" stroke="rgba(255, 255, 255, 0.5)" fontSize={9} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255, 255, 255, 0.1)" tick={false} />
                        <Radar
                          name="Score"
                          dataKey="score"
                          stroke="#ffb4a9"
                          fill="rgba(211, 18, 18, 0.25)"
                          fillOpacity={0.6}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Component Scores Card */}
                <Card className="bg-[#1a1a1a]/70 border-white/5 shadow-2xl glass-card p-5 flex flex-col justify-between min-h-[320px]">
                  <h3 className="text-xs font-bold font-label uppercase tracking-wider text-white/50 mb-3">
                    Score Breakdown
                  </h3>
                  <div className="space-y-2 flex-1 flex flex-col justify-around">
                    <MiniScoreBar score={rv.score} label="Revenue Velocity" weight="30%" icon={TrendingUp} color="#22c55e" />
                    <MiniScoreBar score={ch.score} label="Customer Health" weight="25%" icon={Users} color="#3b82f6" />
                    <MiniScoreBar score={me.score} label="Menu Efficiency" weight="25%" icon={Utensils} color="#eab308" />
                    <MiniScoreBar score={ot.score} label="Operational Timing" weight="20%" icon={Clock} color="#06b6d4" />
                  </div>
                </Card>
              </div>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-[#1a1a1a]/70 p-4 border border-white/5 shadow-md glass-card">
                  <p className="text-[10px] text-white/40 font-label uppercase tracking-wider">Revenue Trend</p>
                  <div className="flex items-center gap-1 mt-1">
                    {rv.trend === "growing" ? <ArrowUpRight size={16} className="text-green-400" /> : rv.trend === "declining" ? <ArrowDownRight size={16} className="text-red-400" /> : <Activity size={14} className="text-yellow-400" />}
                    <span className={`text-lg font-bold font-headline ${rv.trend === "growing" ? "text-green-400" : rv.trend === "declining" ? "text-red-400" : "text-yellow-400"}`}>
                      {rv.growthRate !== undefined ? `${rv.growthRate > 0 ? "+" : ""}${rv.growthRate}%` : "—"}
                    </span>
                  </div>
                </Card>
                <Card className="bg-[#1a1a1a]/70 p-4 border border-white/5 shadow-md glass-card">
                  <p className="text-[10px] text-white/40 font-label uppercase tracking-wider">Retention Rate</p>
                  <p className="text-lg font-bold font-headline text-blue-400 mt-1">{ch.retentionRate}%</p>
                </Card>
                <Card className="bg-[#1a1a1a]/70 p-4 border border-white/5 shadow-md glass-card">
                  <p className="text-[10px] text-white/40 font-label uppercase tracking-wider">Star Items</p>
                  <p className="text-lg font-bold font-headline text-yellow-400 mt-1">{me.counts?.stars ?? 0}</p>
                </Card>
                <Card className="bg-[#1a1a1a]/70 p-4 border border-white/5 shadow-md glass-card">
                  <p className="text-[10px] text-white/40 font-label uppercase tracking-wider">Completion Rate</p>
                  <p className="text-lg font-bold font-headline text-cyan-400 mt-1">{ot.completionRate}%</p>
                </Card>
              </div>
              {/* Top Recommendations Preview */}
              {data.recommendations.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold font-label uppercase tracking-wider text-white/60">Top Recommendations</h3>
                    <button onClick={() => setActiveSection("recommendations")} className="text-[10px] text-purple-400 hover:text-purple-300 font-bold font-label uppercase tracking-wider">
                      View All →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.recommendations.slice(0, 4).map((rec, i) => (
                      <RecommendationCard key={i} rec={rec} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ═══ CUSTOMERS ═══ */}
        {activeSection === "customers" && (() => {
          // Prepare Sized Pie Chart Data for Customer Health Segments
          const customerChartData = [
            { segment: "lost", label: "Lost", value: ch.segments?.lost ?? 0, fill: "var(--color-lost)" },
            { segment: "atRisk", label: "At Risk", value: ch.segments?.atRisk ?? 0, fill: "var(--color-atRisk)" },
            { segment: "new", label: "New", value: ch.segments?.newCustomers ?? 0, fill: "var(--color-new)" },
            { segment: "loyal", label: "Loyal", value: ch.segments?.loyal ?? 0, fill: "var(--color-loyal)" },
            { segment: "champions", label: "Champions", value: ch.segments?.champions ?? 0, fill: "var(--color-champions)" },
          ].filter(d => d.value > 0);

          const sortedCustomerData = [...customerChartData].sort((a, b) => a.value - b.value);
          const totalCustomersVal = sortedCustomerData.reduce((sum, d) => sum + d.value, 0) || 1;

          const BASE_RADIUS = 40;
          const SIZE_INCREMENT = 12;

          const customerChartConfig = {
            value: { label: "Customers" },
            champions: { label: "Champions", color: "#eab308" },
            loyal: { label: "Loyal", color: "#22c55e" },
            atRisk: { label: "At Risk", color: "#f97316" },
            new: { label: "New", color: "#3b82f6" },
            lost: { label: "Lost", color: "#ef4444" },
          } satisfies ChartConfig;

          return (
            <div className="space-y-6 animate-blur-fade-up">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-blue-400" />
                <h2 className="text-base font-bold font-headline text-white">Customer Health & RFM Segmentation</h2>
              </div>

              {/* Top Layout Grid: Spiral Chart + Segment Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Spiral Chart Card */}
                <Card className="lg:col-span-6 bg-[#1a1a1a]/70 border-white/5 shadow-2xl glass-card flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold font-headline text-white flex items-center gap-2">
                      <LucidePieChart size={16} className="text-purple-400" />
                      Sized RFM Segmentation Spiral
                    </CardTitle>
                    <CardDescription className="text-[10px] text-white/40">
                      Rings grow outward proportionally by volume to represent customer concentration.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex items-center justify-center p-6 relative">
                    {sortedCustomerData.length > 0 ? (
                      <ChartContainer
                        config={customerChartConfig}
                        className="mx-auto w-full max-w-[280px] aspect-square [&_.recharts-text]:fill-white"
                      >
                        <PieChart>
                          <ChartTooltip
                            content={<ChartTooltipContent nameKey="value" hideLabel />}
                          />
                          {sortedCustomerData.map((entry, index) => (
                            <Pie
                              key={`customer-pie-${index}`}
                              data={[entry]}
                              innerRadius={20}
                              outerRadius={BASE_RADIUS + index * SIZE_INCREMENT}
                              dataKey="value"
                              cornerRadius={6}
                              stroke="rgba(0,0,0,0.3)"
                              strokeWidth={1}
                              startAngle={
                                (sortedCustomerData
                                  .slice(0, index)
                                  .reduce((sum, d) => sum + d.value, 0) /
                                  totalCustomersVal) *
                                360
                              }
                              endAngle={
                                (sortedCustomerData
                                  .slice(0, index + 1)
                                  .reduce((sum, d) => sum + d.value, 0) /
                                  totalCustomersVal) *
                                360
                              }
                            >
                              <Cell fill={(customerChartConfig as any)[entry.segment]?.color} />
                              <LabelList
                                dataKey="value"
                                stroke="none"
                                fontSize={9}
                                fontWeight={600}
                                fill="#ffffff"
                                formatter={(value: number) => value.toString()}
                              />
                            </Pie>
                          ))}
                        </PieChart>
                      </ChartContainer>
                    ) : (
                      <div className="text-center py-12 text-white/30 text-xs italic">
                        No customer segment records to render.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Segment List and Details */}
                <div className="lg:col-span-6 flex flex-col justify-between gap-4">
                  {/* Detailed segment breakdown */}
                  <Card className="bg-[#1a1a1a]/70 border-white/5 shadow-2xl glass-card flex-1 p-5">
                    <h3 className="text-xs font-bold font-label uppercase tracking-wider text-white/50 mb-4">
                      Segment Breakdown
                    </h3>
                    <div className="space-y-3">
                      {[
                        { key: "champions", label: "Champions", count: ch.segments?.champions ?? 0, color: "#eab308", desc: "Top spending, frequent, and active", icon: Crown },
                        { key: "loyal", label: "Loyal Customers", count: ch.segments?.loyal ?? 0, color: "#22c55e", desc: "High frequency, recent orders", icon: Star },
                        { key: "newCustomers", label: "New Customers", count: ch.segments?.newCustomers ?? 0, color: "#3b82f6", desc: "Recent first-time orders", icon: Sparkles },
                        { key: "atRisk", label: "At Risk", count: ch.segments?.atRisk ?? 0, color: "#f97316", desc: "Frequent in past, inactive recently", icon: AlertTriangle },
                        { key: "lost", label: "Lost Customers", count: ch.segments?.lost ?? 0, color: "#ef4444", desc: "Inactive for over 60 days", icon: X },
                      ].map((seg) => {
                        const pct = ch.totalCustomers > 0 ? Math.round((seg.count / ch.totalCustomers) * 100) : 0;
                        const SegmentIcon = seg.icon;
                        return (
                          <div key={seg.key} className="flex items-center gap-3 justify-between">
                            <div className="flex items-center gap-2.5 min-w-[130px]">
                              <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${seg.color}15` }}>
                                <SegmentIcon size={12} style={{ color: seg.color }} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white leading-none">{seg.label}</p>
                                <p className="text-[9px] text-white/40 mt-0.5">{seg.desc}</p>
                              </div>
                            </div>
                            <div className="flex-1 max-w-[120px] h-1.5 bg-white/5 rounded-full overflow-hidden mx-3">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, backgroundColor: seg.color }}
                              />
                            </div>
                            <div className="text-right min-w-[50px]">
                              <span className="text-xs font-bold text-white">{seg.count}</span>
                              <span className="text-[9px] text-white/40 ml-1">({pct}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              </div>

              {/* Health Metrics Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#1a1a1a]/70 rounded-xl p-4 border border-white/5 shadow-md glass-card">
                  <p className="text-[10px] text-white/40 font-label uppercase tracking-wider">Total Customers</p>
                  <p className="text-2xl font-bold font-headline text-white mt-1">{ch.totalCustomers}</p>
                </div>
                <div className="bg-[#1a1a1a]/70 rounded-xl p-4 border border-white/5 shadow-md glass-card">
                  <p className="text-[10px] text-white/40 font-label uppercase tracking-wider">Active (30d)</p>
                  <p className="text-2xl font-bold font-headline text-green-400 mt-1">{ch.activeInLast30Days}</p>
                </div>
                <div className="bg-[#1a1a1a]/70 rounded-xl p-4 border border-white/5 shadow-md glass-card">
                  <p className="text-[10px] text-white/40 font-label uppercase tracking-wider">Repeat Rate</p>
                  <p className="text-2xl font-bold font-headline text-blue-400 mt-1">{ch.repeatRate}%</p>
                </div>
                <div className="bg-[#1a1a1a]/70 rounded-xl p-4 border border-white/5 shadow-md glass-card">
                  <p className="text-[10px] text-white/40 font-label uppercase tracking-wider">Churn Rate</p>
                  <p className={`text-2xl font-bold font-headline mt-1 ${ch.churnRate > 20 ? "text-red-400" : "text-green-400"}`}>{ch.churnRate}%</p>
                </div>
              </div>

              {/* Champion & At-Risk lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Champion Customers */}
                {ch.topChampions && ch.topChampions.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold font-label uppercase tracking-wider text-yellow-400/80 mb-3 flex items-center gap-1.5">
                      <Crown size={12} /> Top Customer Advocates
                    </h3>
                    <div className="space-y-2">
                      {ch.topChampions.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-[#1a1a1a]/50 rounded-xl border border-yellow-500/10 hover:border-yellow-500/20 shadow-sm glass-card transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-400 font-bold text-xs">
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{c.name}</p>
                              <p className="text-[10px] text-white/40">{c.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <p className="text-xs font-bold text-yellow-400">₹{c.monetary.toLocaleString()}</p>
                              <p className="text-[10px] text-white/30">{c.frequency} orders</p>
                            </div>
                            <div className="text-[10px] text-white/30 bg-white/5 px-2 py-1 rounded">
                              {c.recency === 0 ? "Today" : `${c.recency}d ago`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* At Risk Customers */}
                {ch.topAtRisk && ch.topAtRisk.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold font-label uppercase tracking-wider text-orange-400/80 mb-3 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> High Risk of Churn
                    </h3>
                    <div className="space-y-2">
                      {ch.topAtRisk.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-[#1a1a1a]/50 rounded-xl border border-orange-500/10 hover:border-orange-500/20 shadow-sm glass-card transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400">
                              <AlertTriangle size={12} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white">{c.name}</p>
                              <p className="text-[10px] text-white/40">{c.phone}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-orange-400">₹{c.monetary.toLocaleString()} spent</p>
                            <p className="text-[10px] text-red-400">Last order: {c.recency}d ago</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ═══ MENU MATRIX ═══ */}
        {activeSection === "menu" && (() => {
          // Prepare BCG Menu Matrix Donut Chart Data
          const menuChartData = [
            { category: "stars", label: "Stars", count: me.counts?.stars ?? 0, fill: "#eab308" },
            { category: "cashCows", label: "Cash Cows", count: me.counts?.cashCows ?? 0, fill: "#22c55e" },
            { category: "puzzles", label: "Puzzles", count: me.counts?.puzzles ?? 0, fill: "#8b5cf6" },
            { category: "dogs", label: "Dogs", count: me.counts?.dogs ?? 0, fill: "#ef4444" },
          ].filter(d => d.count > 0);

          const totalMenuItemsCount = menuChartData.reduce((sum, d) => sum + d.count, 0);

          const menuChartConfig = {
            count: { label: "Items" },
            stars: { label: "Stars", color: "#eab308" },
            cashCows: { label: "Cash Cows", color: "#22c55e" },
            puzzles: { label: "Puzzles", color: "#8b5cf6" },
            dogs: { label: "Dogs", color: "#ef4444" },
          } satisfies ChartConfig;

          return (
            <div className="space-y-6 animate-blur-fade-up">
              <div className="flex items-center gap-3">
                <Utensils size={20} className="text-yellow-400" />
                <h2 className="text-base font-bold font-headline text-white">BCG Menu Matrix</h2>
              </div>

              {/* Concentration Warning */}
              {me.concentrationRatio > 60 && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 flex items-start gap-3 glass-card">
                  <AlertTriangle size={18} className="text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-orange-400">Revenue Concentration Risk</p>
                    <p className="text-[10px] text-white/50 mt-0.5">
                      Your top 3 items generate {me.concentrationRatio}% of total revenue. Diversify to reduce dependency risk.
                    </p>
                  </div>
                </div>
              )}

              {/* Matrix Layout Grid: Donut + Revenue Share */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* BCG Distribution Donut */}
                <Card className="lg:col-span-5 bg-[#1a1a1a]/70 border-white/5 shadow-2xl glass-card flex flex-col justify-between">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold font-headline text-white flex items-center gap-2">
                      <LucidePieChart size={16} className="text-yellow-400" />
                      BCG Matrix Distribution
                    </CardTitle>
                    <CardDescription className="text-[10px] text-white/40">
                      Breakdown of all dishes across popularity and margin levels.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex items-center justify-center p-6 relative">
                    {menuChartData.length > 0 ? (
                      <div className="relative w-full max-w-[220px] aspect-square mx-auto">
                        <ChartContainer
                          config={menuChartConfig}
                          className="w-full h-full [&_.recharts-text]:fill-white"
                        >
                          <PieChart>
                            <ChartTooltip
                              content={<ChartTooltipContent nameKey="count" hideLabel />}
                            />
                            <Pie
                              data={menuChartData}
                              dataKey="count"
                              nameKey="category"
                              innerRadius={55}
                              outerRadius={75}
                              paddingAngle={4}
                              stroke="rgba(0,0,0,0.4)"
                              strokeWidth={2}
                            >
                              {menuChartData.map((entry, index) => (
                                <Cell key={`menu-cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ChartContainer>
                        {/* Center count label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-2xl font-bold font-headline text-white">{totalMenuItemsCount}</span>
                          <span className="text-[8px] uppercase tracking-wider text-white/40 font-label">Analyzed Items</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-white/30 text-xs italic">
                        No menu items cataloged.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top 3 Revenue Share */}
                <Card className="lg:col-span-7 bg-[#1a1a1a]/70 border-white/5 shadow-2xl glass-card p-5">
                  <h3 className="text-xs font-bold font-label uppercase tracking-wider text-white/60 mb-4">
                    Revenue Share — Top 3 Items
                  </h3>
                  {me.top3Items && me.top3Items.length > 0 ? (
                    <div className="space-y-4">
                      <HorizontalBar
                        data={me.top3Items.map((i) => ({ label: `${i.sharePercent}%`, value: i.revenue, subtitle: i.name }))}
                        maxVal={Math.max(...me.top3Items.map((i) => i.revenue))}
                        color="#eab308"
                      />
                      <div className="pt-2 border-t border-white/5 flex justify-between text-[10px] text-white/40 font-label">
                        <span>Concentration Index: {me.concentrationRatio}%</span>
                        <span>Total Revenue Share: {me.top3Items.reduce((sum, i) => sum + i.sharePercent, 0)}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-white/30 text-xs italic">
                      No sales records for revenue share comparison.
                    </div>
                  )}
                </Card>
              </div>

              {/* BCG Categories Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Stars */}
                <div>
                  <h3 className="text-xs font-bold font-label uppercase tracking-wider text-yellow-400/80 mb-2.5 flex items-center gap-2">
                    <Star size={14} /> Stars ({me.counts?.stars ?? 0})
                  </h3>
                  <div className="space-y-1.5">
                    {me.matrix?.stars?.map((item, i) => <MatrixItem key={i} item={item} type="star" />)}
                    {(me.matrix?.stars?.length ?? 0) === 0 && <p className="text-[10px] text-white/30 italic pl-1">No star items found</p>}
                  </div>
                </div>

                {/* Cash Cows */}
                <div>
                  <h3 className="text-xs font-bold font-label uppercase tracking-wider text-green-400/80 mb-2.5 flex items-center gap-2">
                    <Target size={14} /> Cash Cows ({me.counts?.cashCows ?? 0})
                  </h3>
                  <div className="space-y-1.5">
                    {me.matrix?.cashCows?.map((item, i) => <MatrixItem key={i} item={item} type="cashCow" />)}
                    {(me.matrix?.cashCows?.length ?? 0) === 0 && <p className="text-[10px] text-white/30 italic pl-1">No cash cow items found</p>}
                  </div>
                </div>

                {/* Puzzles */}
                <div>
                  <h3 className="text-xs font-bold font-label uppercase tracking-wider text-purple-400/80 mb-2.5 flex items-center gap-2">
                    <HelpCircle size={14} /> Puzzles ({me.counts?.puzzles ?? 0})
                  </h3>
                  <div className="space-y-1.5">
                    {me.matrix?.puzzles?.map((item, i) => <MatrixItem key={i} item={item} type="puzzle" />)}
                    {(me.matrix?.puzzles?.length ?? 0) === 0 && <p className="text-[10px] text-white/30 italic pl-1">No puzzle items found</p>}
                  </div>
                </div>

                {/* Dogs */}
                <div>
                  <h3 className="text-xs font-bold font-label uppercase tracking-wider text-red-400/80 mb-2.5 flex items-center gap-2">
                    <AlertTriangle size={14} /> Dogs ({me.counts?.dogs ?? 0})
                  </h3>
                  <div className="space-y-1.5">
                    {me.matrix?.dogs?.map((item, i) => <MatrixItem key={i} item={item} type="dog" />)}
                    {(me.matrix?.dogs?.length ?? 0) === 0 && <p className="text-[10px] text-white/30 italic pl-1">No dog items found</p>}
                  </div>
                </div>
              </div>

              {/* Dead Stock */}
              {me.deadStockCount > 0 && (
                <Card className="bg-[#1a1a1a]/40 border-red-500/10 p-5 glass-card shadow-lg">
                  <h3 className="text-xs font-bold font-label uppercase tracking-wider text-red-400/80 mb-3 flex items-center gap-2">
                    💀 Dead Stock ({me.deadStockCount} items — 0 orders in last 14 days)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {me.deadStock.map((item, i) => (
                      <span key={i} className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-300 px-3 py-1.5 rounded-lg font-medium">
                        {item.name} <span className="text-red-400/60 ml-1">₹{item.price}</span>
                      </span>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          );
        })()}

        {/* ═══ OPERATIONS ═══ */}
        {activeSection === "operations" && (
          <div className="space-y-6 animate-blur-fade-up">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-cyan-400" />
              <h2 className="text-base font-bold font-headline text-white">Operational Timing Analysis</h2>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#1a1a1a]/70 rounded-xl p-4 border border-white/5 shadow-md glass-card">
                <p className="text-[10px] text-white/40 font-label uppercase tracking-wider">Orders Analyzed</p>
                <p className="text-2xl font-bold font-headline text-white mt-1">{ot.totalOrdersAnalyzed}</p>
              </div>
              <div className="bg-[#1a1a1a]/70 rounded-xl p-4 border border-white/5 shadow-md glass-card">
                <p className="text-[10px] text-white/40 font-label uppercase tracking-wider">Completion Rate</p>
                <p className={`text-2xl font-bold font-headline mt-1 ${ot.completionRate >= 80 ? "text-green-400" : ot.completionRate >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                  {ot.completionRate}%
                </p>
              </div>
              <div className="bg-[#1a1a1a]/70 rounded-xl p-4 border border-white/5 shadow-md glass-card">
                <p className="text-[10px] text-white/40 font-label uppercase tracking-wider">Cancellation Rate</p>
                <p className={`text-2xl font-bold font-headline mt-1 ${ot.cancellationRate <= 5 ? "text-green-400" : ot.cancellationRate <= 15 ? "text-yellow-400" : "text-red-400"}`}>
                  {ot.cancellationRate}%
                </p>
              </div>
              <div className="bg-[#1a1a1a]/70 rounded-xl p-4 border border-white/5 shadow-md glass-card">
                <p className="text-[10px] text-white/40 font-label uppercase tracking-wider">Operational Score</p>
                <p className="text-2xl font-bold font-headline text-cyan-400 mt-1">{ot.score}/100</p>
              </div>
            </div>

            {/* Peak Hours */}
            {ot.peakHours && ot.peakHours.length > 0 && (
              <div>
                <h3 className="text-xs font-bold font-label uppercase tracking-wider text-white/60 mb-3 flex items-center gap-1">
                  🔥 Peak Performance Hours
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {ot.peakHours.map((h, i) => (
                    <div key={i} className="bg-[#1a1a1a]/60 rounded-xl p-4 border border-cyan-500/10 glass-card">
                      <p className="text-sm font-bold text-cyan-400">{h.hour}</p>
                      <div className="flex items-center justify-between mt-2 text-[10px] text-white/40 font-label">
                        <span>{h.orders} orders</span>
                        <span className="text-white/60 font-semibold">₹{h.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hourly Distribution and Daily Breakdown Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hourly Distribution Chart */}
              {ot.hourlyBreakdown && ot.hourlyBreakdown.length > 0 && (
                <Card className="bg-[#1a1a1a]/70 border-white/5 shadow-2xl glass-card p-5">
                  <h3 className="text-xs font-bold font-label uppercase tracking-wider text-cyan-400/85 mb-4 flex items-center gap-2">
                    <span>📊 Hourly Order Distribution</span>
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={ot.hourlyBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="hour" stroke="rgba(255,255,255,0.4)" fontSize={9} tickFormatter={(h) => `${h}:00`} />
                        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} />
                        <ChartTooltip 
                          contentStyle={{ backgroundColor: "#1c1c1c", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                          labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                          itemStyle={{ color: "#06b6d4" }}
                          formatter={(value: any) => [`${value} Orders`, "Volume"]}
                          labelFormatter={(label) => `Hour: ${label}:00`}
                        />
                        <Area type="monotone" dataKey="orders" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              {/* Daily Breakdown Chart */}
              {ot.dailyBreakdown && ot.dailyBreakdown.length > 0 && (
                <Card className="bg-[#1a1a1a]/70 border-white/5 shadow-2xl glass-card p-5">
                  <h3 className="text-xs font-bold font-label uppercase tracking-wider text-purple-400/85 mb-4 flex items-center gap-2">
                    <span>📅 Daily Revenue Breakdown</span>
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ot.dailyBreakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="day" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={9} tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`} />
                        <ChartTooltip 
                          contentStyle={{ backgroundColor: "#1c1c1c", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                          labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                          itemStyle={{ color: "#8b5cf6" }}
                          formatter={(value: any) => [`₹${value.toLocaleString()}`, "Revenue"]}
                        />
                        <Bar dataKey="revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                          {ot.dailyBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#8b5cf6" : "#a855f7"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ═══ RECOMMENDATIONS ═══ */}
        {activeSection === "recommendations" && (
          <div className="space-y-4 animate-blur-fade-up">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Zap size={20} className="text-yellow-400" />
                <h2 className="text-base font-bold font-headline text-white">Actionable Recommendations</h2>
              </div>
              <span className="text-xs text-white/40 font-label">
                {data.recommendations.length} recommendations • {data.recommendations.filter((r) => r.priority === "high").length} urgent
              </span>
            </div>

            {data.recommendations.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles size={40} className="text-green-400 mx-auto mb-4" />
                <p className="text-sm text-green-400 font-bold">All Clear! 🎉</p>
                <p className="text-xs text-white/40 mt-1">Your restaurant is performing well. No urgent actions needed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.recommendations.map((rec, i) => (
                  <RecommendationCard key={i} rec={rec} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
