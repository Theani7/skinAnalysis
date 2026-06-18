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
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-surface-400 animate-spin mb-4" />
        <p className="text-sm text-surface-500">Loading scan history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-danger-50 rounded-2xl flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-danger-500" />
        </div>
        <h3 className="text-lg font-display font-semibold text-surface-900 mb-2">Failed to load history</h3>
        <p className="text-sm text-surface-500 max-w-sm mb-6">{error}</p>
        {onBack && (
          <button onClick={onBack} className="text-sm font-medium text-surface-900 hover:underline">
            Go to Dashboard
          </button>
        )}
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-6">
          <Inbox className="w-8 h-8 text-surface-400" />
        </div>
        <h3 className="text-lg font-display font-semibold text-surface-900 mb-2">No scans yet</h3>
        <p className="text-sm text-surface-500 max-w-sm mb-6">Start your first analysis to see your progress over time.</p>
        {onBack && (
          <button onClick={onBack} className="text-sm font-medium text-surface-900 hover:underline">
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
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          {onBack && (
            <button onClick={onBack} className="flex items-center text-surface-400 hover:text-surface-900 text-xs mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </button>
          )}
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-surface-950">History</h1>
          <p className="text-surface-500 text-sm mt-1">Track your skin health improvements over time</p>
        </div>
        {historyList.length >= 2 && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${scoreChange >= 0 ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
            <TrendingUp className="w-3 h-3" />
            {scoreChange >= 0 ? '+' : ''}{scoreChange}% from last scan
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Scans', value: historyList.length, icon: Calendar },
          { label: 'Latest Score', value: latestScan.score, icon: TrendingUp },
          { label: 'Best Score', value: Math.max(...historyList.map(s => s.score)), icon: TrendingUp },
          { label: 'Avg. Score', value: Math.round(historyList.reduce((a, s) => a + s.score, 0) / historyList.length), icon: TrendingUp },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-surface-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-surface-400" />
              <span className="text-xs text-surface-400">{stat.label}</span>
            </div>
            <div className="text-xl font-display font-bold text-surface-900">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-surface-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-surface-900">Progress</h3>
          <span className="text-xs text-surface-400">{progressData.length} scans</span>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} fontWeight={500} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} fontWeight={500} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgb(0 0 0 / 0.06)', padding: '8px 12px' }}
                itemStyle={{ color: '#0f172a', fontWeight: '600', fontSize: '13px' }}
                labelStyle={{ color: '#64748b', fontWeight: '500', marginBottom: '2px', fontSize: '11px' }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#0f172a"
                strokeWidth={2}
                dot={{ fill: '#0f172a', strokeWidth: 2, r: 3, stroke: '#fff' }}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#0f172a' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-4 px-1">All Scans</h3>
        <div className="space-y-2">
          {historyList.map((item, idx) => {
            const change = idx < historyList.length - 1 ? item.score - historyList[idx + 1].score : 0;
            return (
              <div key={item.id} className="bg-white border border-surface-200 rounded-2xl p-4 flex items-center gap-4 hover:border-surface-300 transition-colors">
                <div className="w-11 h-11 bg-surface-50 border border-surface-200 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-surface-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-surface-900 text-sm truncate">{item.date}</h4>
                    {idx === 0 && (
                      <span className="px-2 py-0.5 bg-surface-900 text-white rounded-full text-xs font-medium">Latest</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-surface-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.time}
                    </span>
                    <span className={`text-xs font-medium ${item.severity === 'Clear' ? 'text-success-600' : item.severity === 'Mild' ? 'text-warning-600' : 'text-danger-600'}`}>
                      {item.severity}
                    </span>
                    <span className="text-xs text-surface-400">{item.acne} spots</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-display font-bold text-surface-900">{item.score}</div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {change !== 0 && (
                      <span className={`text-xs font-medium ${change > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {change > 0 ? '+' : ''}{change}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-surface-400">Score</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
