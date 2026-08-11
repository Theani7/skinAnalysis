import { useEffect, useState } from 'react';
import { Activity, ScanLine, TrendingUp, Droplets, Shield, Sun, Calendar, Clock, ChevronRight, Lightbulb, Heart, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ProgressRing } from '../components/ui/ProgressRing';
import { AuthUser } from '../services/auth';
import { getProgressData, ProgressDataPoint, RecentScanItem } from '../services/api';

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
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
          {loadError}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-gray-500 text-sm mb-1">{dateStr}</p>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-gray-900">{greeting}, {firstName}</h1>
          <p className="text-gray-500 text-sm mt-1">Your skin health overview</p>
        </div>
        <div className="flex items-center gap-2">
          {onStartRemoteScan && (
            <button
              onClick={onStartRemoteScan}
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-sm transition-all w-fit shadow-sm"
            >
              <ScanLine className="w-4 h-4" />
              Remote Scan
            </button>
          )}
          <button
            onClick={onStartScan}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 text-sm transition-all w-fit shadow-sm shadow-primary-500/20"
          >
            <ScanLine className="w-4 h-4" />
            New Scan
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${modelOnline ? 'bg-primary-500 shadow-[0_0_8px_rgba(214,51,90,0.4)]' : 'bg-gray-300'}`}></div>
            <span className="text-xs text-gray-500 font-medium">Model {modelOnline ? 'Online' : 'Offline'}</span>
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-xs text-gray-500">
            {recentScans.length > 0 ? `Last scan: ${recentScans[0].date}` : 'No scans yet'}
          </span>
        </div>
      </div>

      {/* Health Index + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-gray-100 rounded-2xl shadow-sm p-7">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">Health Index</span>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex-shrink-0">
              <ProgressRing value={healthScore} size={80} strokeWidth={6} color="#d6335a" bgColor="rgba(214, 51, 90, 0.1)" />
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-display font-bold text-gray-900">
                {progress.length > 0 ? healthScore : '--'}
              </div>
              <div className="flex items-center gap-2">
                {scoreTrend >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                )}
                <span className={`text-sm font-medium ${scoreTrend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {scoreTrend >= 0 ? '+' : ''}{scoreTrend}%
                </span>
              </div>
              <p className="text-gray-500 text-xs">
                {progress.length === 0
                  ? 'Complete your first scan'
                  : 'Based on latest analysis'}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Acne', value: String(acneCount), subtext: 'spots detected', icon: Shield, bg: 'bg-rose-50', iconColor: 'text-rose-600' },
            { label: 'Severity', value: severity, subtext: 'level', icon: AlertCircle, bg: 'bg-amber-50', iconColor: 'text-amber-600' },
            { label: 'Scans', value: String(progress.length), subtext: 'total', icon: ScanLine, bg: 'bg-primary-50', iconColor: 'text-primary-600' },
            { label: 'Score', value: progress.length > 0 ? `${healthScore}` : '--', subtext: 'health index', icon: TrendingUp, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
              </div>
              <div className="text-xl font-display font-bold text-gray-900 truncate">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5 truncate">{stat.subtext}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm p-5 md:p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-bold text-gray-900">Progress</h3>
              <p className="text-xs text-gray-500 mt-0.5">{progress.length === 0 ? 'No data yet' : `Last ${progress.length} scans`}</p>
            </div>
            {progress.length >= 2 && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${scoreTrend >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {scoreTrend >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-600" />
                )}
                <span className={`text-xs font-medium ${scoreTrend >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {scoreTrend >= 0 ? '+' : ''}{scoreTrend}%
                </span>
              </div>
            )}
          </div>
          <div className="h-48 md:h-56">
            {progress.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                Complete your first scan to see your progress.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progress} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} dy={10} fontWeight={500} />
                  <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} fontWeight={500} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
                    itemStyle={{ color: '#111827', fontWeight: '600', fontSize: '13px' }}
                    labelStyle={{ color: '#6b7280', fontWeight: '500', marginBottom: '2px', fontSize: '11px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#d6335a"
                    strokeWidth={2}
                    dot={{ fill: '#d6335a', strokeWidth: 2, r: 3, stroke: '#ffffff' }}
                    activeDot={{ r: 5, strokeWidth: 0, fill: '#d6335a' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 md:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-gray-900">Recent Scans</h3>
            {onViewHistory && (
              <button onClick={onViewHistory} className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors">
                View All
              </button>
            )}
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {recentScans.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                No scans yet.
              </div>
            ) : (
              recentScans.map((scan) => (
                <div key={scan.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer">
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Calendar className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{scan.date}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {scan.time}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold text-gray-900">{scan.score}</div>
                    <div className="text-xs text-gray-500">{scan.severity}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions + Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 md:p-6">
          <h3 className="font-display font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={onStartScan}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 border border-transparent rounded-xl hover:bg-primary-50 hover:border-primary-100 transition-all text-left group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-primary-500/30">
                <ScanLine className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-sm group-hover:text-primary-800 transition-colors">Start New Scan</div>
                <div className="text-xs text-gray-500 mt-0.5">Capture or upload an image for analysis</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
            </button>
            
            {onStartRemoteScan && (
              <button
                onClick={onStartRemoteScan}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 flex-shrink-0 shadow-sm">
                  <ScanLine className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">Remote Scan via Mobile</div>
                  <div className="text-xs text-gray-500 mt-0.5">Scan a QR code to use your phone's camera</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>
            )}

            {onViewHistory && (
              <button
                onClick={onViewHistory}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-all text-left group"
              >
                <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 flex-shrink-0 shadow-sm">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">View Progress</div>
                  <div className="text-xs text-gray-500 mt-0.5">Track your skin health improvements</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="font-display font-bold text-gray-900">Daily Tips</h3>
          </div>
          <div className="space-y-3">
            {quickTips.map((tip) => (
              <div key={tip.id} className="flex items-start gap-3 p-4 bg-amber-50/50 border border-amber-100/50 rounded-xl">
                <tip.icon className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700 leading-relaxed font-medium">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
