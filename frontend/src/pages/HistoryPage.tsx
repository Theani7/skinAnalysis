import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Inbox, ArrowLeft, TrendingUp, Clock, Loader2, AlertCircle } from 'lucide-react';
import { getScanHistory, ScanListItem } from '../services/api';

interface HistoryPageProps {
  onBack?: () => void;
}

export default function HistoryPage({ onBack }: HistoryPageProps) {
  const [scans, setScans] = useState<ScanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getScanHistory(50)
      .then((data) => setScans(data.scans))
      .catch((err) => setError(err.message || 'Failed to load scan history.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 md:py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-4" />
        <p className="text-sm text-surface-500">Loading scan history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 md:py-20 text-center">
        <div className="w-16 h-16 bg-danger-50 rounded-2xl flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-danger-500" />
        </div>
        <h3 className="text-lg font-bold text-surface-900 mb-2">Failed to load history</h3>
        <p className="text-sm text-surface-500 max-w-sm mb-6">{error}</p>
        {onBack && (
          <button onClick={onBack} className="text-sm font-bold text-primary-600 hover:text-primary-800">
            Go to Dashboard
          </button>
        )}
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 md:py-20 text-center">
        <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-6">
          <Inbox className="w-8 h-8 text-surface-400" />
        </div>
        <h3 className="text-lg font-bold text-surface-900 mb-2">No scans yet</h3>
        <p className="text-sm text-surface-500 max-w-sm mb-6">Start your first AI skin analysis to see your progress over time.</p>
        {onBack && (
          <button onClick={onBack} className="text-sm font-bold text-primary-600 hover:text-primary-800">
            Go to Dashboard
          </button>
        )}
      </div>
    );
  }

  const severityScores: Record<string, number> = { Clear: 100, Mild: 75, Moderate: 50, Severe: 25 };

  const progressData = scans.map((s) => ({
    date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: severityScores[s.severity] ?? 50,
  })).reverse();

  const historyList = scans.map((s) => ({
    id: s.id,
    date: new Date(s.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    time: new Date(s.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    score: severityScores[s.severity] ?? 50,
    severity: s.severity,
    acne: s.acne_count,
  }));

  const latestScan = historyList[0];
  const scoreChange = historyList.length > 1 ? latestScan.score - historyList[1].score : 0;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          {onBack && (
            <button onClick={onBack} className="flex items-center text-surface-500 hover:text-surface-900 font-bold text-xs uppercase tracking-widest mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" /> Dashboard
            </button>
          )}
          <h1 className="text-2xl md:text-3xl font-extrabold text-surface-900 tracking-tight">Clinical History</h1>
          <p className="text-surface-500 text-sm mt-1">Track your skin health improvements over time</p>
        </div>
        {historyList.length >= 2 && (
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${scoreChange >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
              <TrendingUp className={`w-3.5 h-3.5 ${scoreChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} aria-hidden="true" />
              <span className={`text-xs font-bold ${scoreChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {scoreChange >= 0 ? '+' : ''}{scoreChange}% from last scan
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Scans', value: historyList.length, icon: Calendar },
          { label: 'Latest Score', value: latestScan.score, icon: TrendingUp },
          { label: 'Best Score', value: Math.max(...historyList.map(s => s.score)), icon: TrendingUp },
          { label: 'Avg. Score', value: Math.round(historyList.reduce((a, s) => a + s.score, 0) / historyList.length), icon: TrendingUp },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-4 rounded-2xl border border-surface-200">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-surface-400" aria-hidden="true" />
              <span className="text-2xs font-bold text-surface-500 uppercase tracking-widest">{stat.label}</span>
            </div>
            <div className="text-2xl font-black text-surface-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Progress Chart */}
      <div className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-surface-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-surface-900">Progress Over Time</h3>
          <span className="text-2xs font-bold text-surface-400 uppercase tracking-widest">{progressData.length} Scans</span>
        </div>
        <div className="h-48 md:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} dy={10} fontWeight={600} />
              <YAxis domain={[0, 100]} stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} fontWeight={600} />
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
        </div>
      </div>

      {/* Scan History List */}
      <div>
        <h3 className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-4 px-1">All Scans</h3>
        <div className="space-y-3">
          {historyList.map((item, idx) => {
            const change = idx < historyList.length - 1 ? item.score - historyList[idx + 1].score : 0;
            return (
              <div key={item.id} className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-surface-200 flex items-center gap-4 cursor-pointer hover:border-primary-200 transition-all group">
                <div className="w-12 h-12 bg-surface-50 rounded-xl flex items-center justify-center text-surface-400 border border-surface-200 group-hover:border-primary-200 transition-colors flex-shrink-0">
                  <Calendar className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-surface-900 text-base">{item.date}</h4>
                    {idx === 0 && (
                      <span className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full text-2xs font-bold">Latest</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-surface-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {item.time}
                    </span>
                    <span className={`text-xs font-bold ${item.severity === 'Clear' ? 'text-emerald-600' : item.severity === 'Mild' ? 'text-amber-600' : 'text-rose-600'}`}>
                      {item.severity}
                    </span>
                    <span className="text-2xs text-surface-400">{item.acne} spots</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-extrabold text-primary-600">{item.score}</div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {change !== 0 && (
                      <span className={`text-2xs font-bold ${change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {change > 0 ? '+' : ''}{change}
                      </span>
                    )}
                  </div>
                  <div className="text-2xs text-surface-400 font-bold uppercase tracking-widest">Score</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
