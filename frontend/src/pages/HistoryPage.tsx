import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
        <p className="text-sm text-gray-500">Loading scan history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 border border-red-100">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-display font-semibold text-gray-900 mb-2">Failed to load history</h3>
        <p className="text-sm text-gray-500 max-w-sm mb-6">{error}</p>
        {onBack && (
          <button onClick={onBack} className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors">
            Go to Dashboard
          </button>
        )}
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center mt-8">
        <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
          <Calendar className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-display font-bold text-gray-900 mb-2">No History Yet</h3>
        <p className="text-sm text-gray-500 max-w-sm mb-8 leading-relaxed">Start your first analysis to see your progress and track your skin journey over time.</p>
        {onBack && (
          <button onClick={onBack} className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-all shadow-sm active:scale-95">
            Start New Scan
          </button>
        )}
      </div>
    );
  }

  const severityScores: Record<string, number> = { Clear: 100, Mild: 75, Moderate: 50, Severe: 25 };

  const progressData = scans.map((s) => {
    const rawDate = new Date(s.created_at).toISOString().split('T')[0];
    const saved = localStorage.getItem(`lifestyle_log_${rawDate}`);
    let water = null;
    let sleep = null;
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (typeof p.water === 'number') water = p.water * 10; // Scale 0-10 up to 0-100 for visibility
        if (typeof p.sleep === 'number') sleep = p.sleep * 10; // Scale 0-10 up to 0-100
      } catch (e) {}
    }
    return {
      date: new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: severityScores[s.severity] ?? 50,
      water,
      sleep
    };
  }).reverse();

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
            <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-900 text-xs mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
            </button>
          )}
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-gray-900">History</h1>
          <p className="text-gray-500 text-sm mt-1">Track your SkinAI improvements over time</p>
        </div>
        {historyList.length >= 2 && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${scoreChange >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
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
          <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">{stat.label}</span>
            </div>
            <div className="text-xl font-display font-bold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-gray-900">Progress</h3>
          <span className="text-xs text-gray-500">{progressData.length} scans</span>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} dy={10} fontWeight={500} />
              <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} fontWeight={500} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
                itemStyle={{ color: '#111827', fontWeight: '600', fontSize: '13px' }}
                labelStyle={{ color: '#6b7280', fontWeight: '500', marginBottom: '2px', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#d6335a"
                strokeWidth={2}
                dot={{ fill: '#d6335a', strokeWidth: 2, r: 3, stroke: '#ffffff' }}
                activeDot={{ r: 5, strokeWidth: 0, fill: '#d6335a' }}
                name="Clarity Score"
              />
              <Line
                type="monotone"
                dataKey="water"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
                name="Water Intake"
              />
              <Line
                type="monotone"
                dataKey="sleep"
                stroke="#818cf8"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
                name="Sleep Hours"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4 px-1">All Scans</h3>
        <div className="space-y-2">
          {historyList.map((item, idx) => {
            const change = idx < historyList.length - 1 ? item.score - historyList[idx + 1].score : 0;
            return (
              <div key={item.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex items-center gap-4 hover:border-primary-100 hover:shadow-md transition-all cursor-default">
                <div className="w-11 h-11 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 text-sm truncate">{item.date}</h4>
                    {idx === 0 && (
                      <span className="px-2 py-0.5 bg-primary-50 text-primary-600 border border-primary-100 rounded-full text-xs font-medium">Latest</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.time}
                    </span>
                    <span className={`text-xs font-medium ${item.severity === 'Clear' ? 'text-emerald-500' : item.severity === 'Mild' ? 'text-amber-500' : 'text-rose-500'}`}>
                      {item.severity}
                    </span>
                    <span className="text-xs text-gray-500">{item.acne} spots</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-display font-bold text-gray-900">{item.score}</div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {change !== 0 && (
                      <span className={`text-xs font-medium ${change > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {change > 0 ? '+' : ''}{change}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">Score</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
