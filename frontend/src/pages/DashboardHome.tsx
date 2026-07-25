import { useEffect, useState } from 'react';
import { Activity, ScanLine, TrendingUp, Droplets, Shield, Sun, Calendar, Clock, ChevronRight, Lightbulb, Heart, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ProgressRing } from '../components/ui/ProgressRing';
import { AuthUser } from '../services/auth';
import { getProgressData, ProgressDataPoint, RecentScanItem } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

interface DashboardHomeProps {
  onStartScan: () => void;
  onStartRemoteScan?: () => void;
  onViewHistory?: () => void;
  user?: AuthUser | null;
}

const quickTips = [
  { id: 1, icon: Droplets, text: 'Apply hyaluronic acid to damp skin for maximum absorption' },
  { id: 2, icon: Sun, text: 'Reapply SPF 50+ every 2 hours when outdoors' },
  { id: 3, icon: Heart, text: 'Get 7-9 hours of sleep for optimal skin repair' },
];

export default function DashboardHome({ onStartScan, onStartRemoteScan, onViewHistory, user }: DashboardHomeProps) {
  const [progress, setProgress] = useState<ProgressDataPoint[]>([]);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const [latestStats, setLatestStats] = useState<{ acne_count: number; severity: string; confidence: number } | null>(null);
  const [modelOnline, setModelOnline] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    let cancelled = false;
    getProgressData()
      .then((data) => {
        if (cancelled) return;
        setProgress(data.progress);
        setRecentScans(data.recent_scans);
        setLatestStats(data.latest_stats);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Failed to load dashboard data.');
      });

    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/model/status`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setModelOnline(data.model_loaded); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const firstName = user?.name?.split(' ')[0] || 'there';

  const healthScore = progress.length > 0 ? progress[progress.length - 1].score : 0;
  const prevScore = progress.length > 1 ? progress[progress.length - 2].score : healthScore;
  const scoreTrend = healthScore - prevScore;

  const acneCount = latestStats?.acne_count ?? 0;
  const severity = latestStats?.severity ?? 'No scans yet';

  return (
    <div className="space-y-8 font-sans">
      {loadError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-500">
          {loadError}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="t-text-muted text-sm mb-1">{dateStr}</p>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight t-text">{greeting}, {firstName}</h1>
          <p className="t-text-muted text-sm mt-1">Your skin health overview</p>
        </div>
        <div className="flex items-center gap-2">
          {onStartRemoteScan && (
            <button
              onClick={onStartRemoteScan}
              className="t-btn-secondary px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-sm transition-all w-fit"
            >
              <ScanLine className="w-4 h-4" />
              Remote Scan
            </button>
          )}
          <button
            onClick={onStartScan}
            className="btn-premium px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-sm transition-all w-fit text-white"
          >
            <ScanLine className="w-4 h-4" />
            New Scan
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="t-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${modelOnline ? 'bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]' : 'bg-gray-500'}`}></div>
            <span className="text-xs t-text-muted">Model {modelOnline ? 'Online' : 'Offline'}</span>
          </div>
          <div className="w-px h-4 t-divider border-l" />
          <span className="text-xs t-text-muted">
            {recentScans.length > 0 ? `Last scan: ${recentScans[0].date}` : 'No scans yet'}
          </span>
        </div>
      </div>

      {/* Health Index + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 t-card p-7">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 t-tint-info rounded-xl flex items-center justify-center">
              <Activity className="w-4 h-4 text-cyan-500" />
            </div>
            <span className="text-sm font-medium t-text">Health Index</span>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex-shrink-0">
              <ProgressRing value={healthScore} size={80} strokeWidth={6} color="#06b6d4" bgColor="rgba(6, 182, 212, 0.15)" />
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-display font-bold t-text">
                {progress.length > 0 ? healthScore : '--'}
              </div>
              <div className="flex items-center gap-2">
                {scoreTrend >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                )}
                <span className={`text-sm font-medium ${scoreTrend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {scoreTrend >= 0 ? '+' : ''}{scoreTrend}%
                </span>
              </div>
              <p className="t-text-muted text-xs">
                {progress.length === 0
                  ? 'Complete your first scan'
                  : 'Based on latest analysis'}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Acne', value: String(acneCount), subtext: 'spots detected', icon: Shield, bg: 't-tint-purple', iconColor: 'text-purple-500' },
            { label: 'Severity', value: severity, subtext: 'level', icon: AlertCircle, bg: 't-tint-warning', iconColor: 'text-amber-500' },
            { label: 'Scans', value: String(progress.length), subtext: 'total', icon: ScanLine, bg: 't-tint-info', iconColor: 'text-cyan-500' },
            { label: 'Score', value: progress.length > 0 ? `${healthScore}` : '--', subtext: 'health index', icon: TrendingUp, bg: 't-tint-success', iconColor: 'text-emerald-500' },
          ].map((stat) => (
            <div key={stat.label} className="t-card p-4">
              <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
              <div className="text-xl font-display font-bold t-text truncate">{stat.value}</div>
              <div className="text-xs t-text-muted mt-0.5 truncate">{stat.subtext}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 t-card p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-bold t-text">Progress</h3>
              <p className="text-xs t-text-muted mt-0.5">{progress.length === 0 ? 'No data yet' : `Last ${progress.length} scans`}</p>
            </div>
            {progress.length >= 2 && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${scoreTrend >= 0 ? 't-tint-success' : 't-tint-danger'}`}>
                {scoreTrend >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-xs font-medium ${scoreTrend >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {scoreTrend >= 0 ? '+' : ''}{scoreTrend}%
                </span>
              </div>
            )}
          </div>
          <div className="h-48 md:h-56">
            {progress.length === 0 ? (
              <div className="h-full flex items-center justify-center t-text-muted text-sm">
                Complete your first scan to see your progress.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progress} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} dy={10} fontWeight={500} />
                  <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} fontWeight={500} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-modal)', backdropFilter: 'blur(8px)', borderRadius: '12px', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)', padding: '8px 12px' }}
                    itemStyle={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px' }}
                    labelStyle={{ color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '2px', fontSize: '11px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ fill: '#06b6d4', strokeWidth: 2, r: 3, stroke: isDark ? '#0f1424' : '#ffffff' }}
                    activeDot={{ r: 5, strokeWidth: 0, fill: '#06b6d4' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="t-card p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold t-text">Recent Scans</h3>
            {onViewHistory && (
              <button onClick={onViewHistory} className="text-xs font-medium text-cyan-500 hover:text-cyan-400 transition-colors">
                View All
              </button>
            )}
          </div>
          <div className="space-y-2">
            {recentScans.length === 0 ? (
              <div className="text-center py-8 t-text-muted text-sm">
                No scans yet.
              </div>
            ) : (
              recentScans.map((scan) => (
                <div key={scan.id} className="flex items-center gap-3 p-3 rounded-xl t-bg-raised hover:t-bg-hover border border-transparent hover:border-cyan-500/30 transition-all cursor-pointer">
                  <div className="w-10 h-10 border t-divider rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 t-text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium t-text truncate">{scan.date}</div>
                    <div className="text-xs t-text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {scan.time}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold t-text">{scan.score}</div>
                    <div className="text-xs t-text-secondary">{scan.severity}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions + Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="t-card p-5 md:p-6">
          <h3 className="font-display font-bold t-text mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={onStartScan}
              className="w-full flex items-center gap-4 p-4 t-bg-raised border t-divider rounded-xl hover:t-bg-hover transition-all text-left group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-400 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                <ScanLine className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-medium t-text text-sm">Start New Scan</div>
                <div className="text-xs t-text-muted">Capture or upload an image for analysis</div>
              </div>
              <ChevronRight className="w-4 h-4 t-text-muted group-hover:text-cyan-500 transition-colors" />
            </button>
            
            {onStartRemoteScan && (
              <button
                onClick={onStartRemoteScan}
                className="w-full flex items-center gap-4 p-4 t-bg-raised border t-divider rounded-xl hover:t-bg-hover transition-all text-left group"
              >
                <div className="w-10 h-10 border t-divider rounded-xl flex items-center justify-center t-text-secondary flex-shrink-0">
                  <ScanLine className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium t-text text-sm">Remote Scan via Mobile</div>
                  <div className="text-xs t-text-muted">Scan a QR code to use your phone's camera</div>
                </div>
                <ChevronRight className="w-4 h-4 t-text-muted group-hover:t-text transition-colors" />
              </button>
            )}

            {onViewHistory && (
              <button
                onClick={onViewHistory}
                className="w-full flex items-center gap-4 p-4 t-bg-raised border t-divider rounded-xl hover:t-bg-hover transition-all text-left group"
              >
                <div className="w-10 h-10 border t-divider rounded-xl flex items-center justify-center t-text-secondary flex-shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium t-text text-sm">View Progress</div>
                  <div className="text-xs t-text-muted">Track your skin health improvements</div>
                </div>
                <ChevronRight className="w-4 h-4 t-text-muted group-hover:t-text transition-colors" />
              </button>
            )}
          </div>
        </div>

        <div className="t-card p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <h3 className="font-display font-bold t-text">Daily Tips</h3>
          </div>
          <div className="space-y-2">
            {quickTips.map((tip) => (
              <div key={tip.id} className="flex items-start gap-3 p-3 t-bg-raised border t-divider rounded-xl">
                <tip.icon className="w-4 h-4 text-cyan-500/80 mt-0.5 flex-shrink-0" />
                <p className="text-sm t-text-secondary leading-relaxed">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
