import { useEffect, useState } from 'react';
import { Activity, ScanLine, TrendingUp, Droplets, Shield, Sun, Calendar, Clock, ChevronRight, Sparkles, Heart, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ProgressRing } from '../components/ui/ProgressRing';
import { AuthUser } from '../services/auth';
import { getProgressData, ProgressDataPoint, RecentScanItem } from '../services/api';

interface DashboardHomeProps {
  onStartScan: () => void;
  onViewHistory?: () => void;
  user?: AuthUser | null;
}

const quickTips = [
  { id: 1, icon: Droplets, text: 'Apply hyaluronic acid to damp skin for maximum absorption', color: 'text-blue-500' },
  { id: 2, icon: Sun, text: 'Reapply SPF 50+ every 2 hours when outdoors', color: 'text-amber-500' },
  { id: 3, icon: Heart, text: 'Get 7-9 hours of sleep for optimal skin repair', color: 'text-rose-500' },
];

export default function DashboardHome({ onStartScan, onViewHistory, user }: DashboardHomeProps) {
  const [progress, setProgress] = useState<ProgressDataPoint[]>([]);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const [latestStats, setLatestStats] = useState<{ acne_count: number; severity: string; confidence: number } | null>(null);
  const [modelOnline, setModelOnline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProgressData()
      .then((data) => {
        if (cancelled) return;
        setProgress(data.progress);
        setRecentScans(data.recent_scans);
        setLatestStats(data.latest_stats);
      })
      .catch(() => {});

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
    <div className="space-y-5 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-surface-500 text-sm font-medium mb-1">{dateStr}</p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-surface-900">{greeting}, {firstName}</h1>
          <p className="text-surface-500 text-sm mt-1">Here's your skin health overview</p>
        </div>
        <button 
          onClick={onStartScan}
          className="bg-primary-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-primary-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-600/10 text-sm w-fit"
        >
          <ScanLine className="w-4 h-4" aria-hidden="true" />
          New Analysis
        </button>
      </div>

      {/* Health Score + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Health Score */}
        <div className="lg:col-span-1 bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-10 -mt-10" aria-hidden="true"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-10 -mb-10" aria-hidden="true"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4" aria-hidden="true" />
              </div>
              <span className="text-sm font-bold uppercase tracking-wider text-primary-200">Skin Health Index</span>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
              <div className="flex-shrink-0">
                <ProgressRing value={healthScore} size={90} strokeWidth={6} color="#ffffff" bgColor="rgba(255,255,255,0.2)" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {scoreTrend >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-300" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-300" aria-hidden="true" />
                  )}
                  <span className={`text-sm font-bold ${scoreTrend >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {scoreTrend >= 0 ? '+' : ''}{scoreTrend}% this scan
                  </span>
                </div>
                <p className="text-primary-200 text-sm leading-relaxed">
                  {progress.length === 0
                    ? 'Complete your first scan to see your health trend.'
                    : 'Your skin health score based on your latest analysis.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Acne', value: String(acneCount), subtext: 'spots detected', icon: Shield, color: 'bg-rose-50 text-rose-600' },
            { label: 'Severity', value: severity, subtext: 'current level', icon: AlertCircle, color: 'bg-amber-50 text-amber-600' },
            { label: 'Scans', value: String(progress.length), subtext: 'total analyses', icon: ScanLine, color: 'bg-blue-50 text-blue-600' },
            { label: 'Score', value: progress.length > 0 ? `${healthScore}` : '--', subtext: 'health index', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 border border-surface-200 hover:border-primary-200 transition-all group cursor-pointer">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 ${stat.color} rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-4 h-4" aria-hidden="true" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-surface-900 truncate">{stat.value}</div>
              <div className="text-[10px] sm:text-2xs text-surface-500 font-medium mt-0.5 truncate">{stat.subtext}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Chart + Recent Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 border border-surface-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-surface-900">Progress Over Time</h3>
              <p className="text-xs text-surface-500 mt-0.5">{progress.length === 0 ? 'No data yet' : `Last ${progress.length} scans`}</p>
            </div>
            {progress.length >= 2 && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${scoreTrend >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                {scoreTrend >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-rose-600" aria-hidden="true" />
                )}
                <span className={`text-2xs font-bold ${scoreTrend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {scoreTrend >= 0 ? '+' : ''}{scoreTrend}%
                </span>
              </div>
            )}
          </div>
          <div className="h-48 md:h-56">
            {progress.length === 0 ? (
              <div className="h-full flex items-center justify-center text-surface-400 text-sm">
                Complete your first scan to see your progress chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progress} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} dy={10} fontWeight={600} />
                  <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} fontWeight={600} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
                    itemStyle={{ color: '#1E3A8A', fontWeight: '800', fontSize: '14px' }}
                    labelStyle={{ color: '#64748B', fontWeight: '600', marginBottom: '2px', fontSize: '11px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#1E3A8A" 
                    strokeWidth={3} 
                    dot={{ fill: '#1E3A8A', strokeWidth: 2, r: 4, stroke: '#fff' }} 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#1E3A8A' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Scans */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 border border-surface-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-surface-900">Recent Scans</h3>
            {onViewHistory && (
              <button onClick={onViewHistory} className="text-2xs font-bold text-primary-600 hover:text-primary-800 transition-colors">
                View All
              </button>
            )}
          </div>
          <div className="space-y-3">
            {recentScans.length === 0 ? (
              <div className="text-center py-8 text-surface-400 text-sm">
                No scans yet. Start your first analysis!
              </div>
            ) : (
              recentScans.map((scan) => (
                <div key={scan.id} className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-surface-200 group-hover:border-primary-200 transition-colors flex-shrink-0">
                    <Calendar className="w-4 h-4 text-surface-400" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-surface-900 truncate">{scan.date}</div>
                    <div className="text-2xs text-surface-500 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                      {scan.time}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-black text-primary-600">{scan.score}</div>
                    <div className={`text-2xs font-bold ${scan.severity === 'Clear' ? 'text-emerald-600' : scan.severity === 'Mild' ? 'text-amber-600' : 'text-rose-600'}`}>
                      {scan.severity}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions + Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 border border-surface-200">
          <h3 className="font-bold text-surface-900 mb-3 sm:mb-4">Quick Actions</h3>
          <div className="space-y-2.5 sm:space-y-3">
            <button 
              onClick={onStartScan}
              className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-primary-50 rounded-xl sm:rounded-2xl hover:bg-primary-100 transition-colors text-left group"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white group-hover:scale-105 transition-transform flex-shrink-0">
                <ScanLine className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-surface-900">Start New Scan</div>
                <div className="text-xs text-surface-500">Capture or upload an image for analysis</div>
              </div>
              <ChevronRight className="w-5 h-5 text-surface-400 group-hover:text-primary-600 transition-colors" aria-hidden="true" />
            </button>

            {onViewHistory && (
              <button 
                onClick={onViewHistory}
                className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-surface-50 rounded-xl sm:rounded-2xl hover:bg-surface-100 transition-colors text-left group"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-surface-200 rounded-xl flex items-center justify-center text-surface-600 group-hover:scale-105 transition-transform flex-shrink-0">
                  <TrendingUp className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-surface-900">View Progress</div>
                  <div className="text-xs text-surface-500">Track your skin health improvements</div>
                </div>
                <ChevronRight className="w-5 h-5 text-surface-400 group-hover:text-surface-600 transition-colors" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Daily Tips */}
        <div className="bg-gradient-to-br from-surface-50 to-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 md:p-6 border border-surface-200">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Sparkles className="w-4 h-4 text-primary-600" aria-hidden="true" />
            <h3 className="font-bold text-surface-900">Daily Skincare Tips</h3>
          </div>
          <div className="space-y-2.5 sm:space-y-3">
            {quickTips.map((tip) => (
              <div key={tip.id} className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-white rounded-xl border border-surface-100">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${tip.color.replace('text-', 'bg-').replace('-50', '-50')}`}>
                  <tip.icon className={`w-4 h-4 ${tip.color}`} aria-hidden="true" />
                </div>
                <p className="text-sm text-surface-600 leading-relaxed">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-surface-200">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${modelOnline ? 'bg-emerald-500 animate-pulse' : 'bg-surface-300'}`} aria-hidden="true"></div>
            <span className="text-2xs font-bold text-surface-500 uppercase tracking-widest">AI Engine {modelOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        <span className="text-2xs text-surface-400">
          {recentScans.length > 0 ? `Last scan: ${recentScans[0].date}` : 'No scans yet'}
        </span>
      </div>
    </div>
  );
}
