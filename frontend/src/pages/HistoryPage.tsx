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
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin mb-4" />
        <p className="text-sm text-gray-400">Loading scan history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-lg font-display font-semibold text-white mb-2">Failed to load history</h3>
        <p className="text-sm text-gray-400 max-w-sm mb-6">{error}</p>
        {onBack && (
          <button onClick={onBack} className="text-sm font-medium text-white hover:text-teal-400 transition-colors">
            Go to Dashboard
          </button>
        )}
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-2xl flex items-center justify-center mb-6">
          <Inbox className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-display font-semibold text-white mb-2">No scans yet</h3>
        <p className="text-sm text-gray-400 max-w-sm mb-6">Start your first analysis to see your progress over time.</p>
        {onBack && (
          <button onClick={onBack} className="text-sm font-medium text-white hover:text-teal-400 transition-colors">
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
            <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white text-xs mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </button>
          )}
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white">History</h1>
          <p className="text-gray-400 text-sm mt-1">Track your SkinAI improvements over time</p>
        </div>
        {historyList.length >= 2 && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${scoreChange >= 0 ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
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
          <div key={stat.label} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">{stat.label}</span>
            </div>
            <div className="text-xl font-display font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-white">Progress</h3>
          <span className="text-xs text-gray-400">{progressData.length} scans</span>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} dy={10} fontWeight={500} />
              <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} fontWeight={500} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', padding: '8px 12px', backdropFilter: 'blur(8px)' }}
                itemStyle={{ color: '#fff', fontWeight: '600', fontSize: '13px' }}
                labelStyle={{ color: '#9ca3af', fontWeight: '500', marginBottom: '2px', fontSize: '11px' }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#2dd4bf"
                strokeWidth={2}
                dot={{ fill: '#0f172a', strokeWidth: 2, r: 3, stroke: '#2dd4bf' }}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#2dd4bf' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4 px-1">All Scans</h3>
        <div className="space-y-2">
          {historyList.map((item, idx) => {
            const change = idx < historyList.length - 1 ? item.score - historyList[idx + 1].score : 0;
            return (
              <div key={item.id} className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 flex items-center gap-4 hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                <div className="w-11 h-11 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-white text-sm truncate">{item.date}</h4>
                    {idx === 0 && (
                      <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full text-xs font-medium">Latest</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.time}
                    </span>
                    <span className={`text-xs font-medium ${item.severity === 'Clear' ? 'text-teal-400' : item.severity === 'Mild' ? 'text-yellow-400' : 'text-red-400'}`}>
                      {item.severity}
                    </span>
                    <span className="text-xs text-gray-400">{item.acne} spots</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-display font-bold text-white">{item.score}</div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {change !== 0 && (
                      <span className={`text-xs font-medium ${change > 0 ? 'text-teal-400' : 'text-red-400'}`}>
                        {change > 0 ? '+' : ''}{change}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">Score</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
