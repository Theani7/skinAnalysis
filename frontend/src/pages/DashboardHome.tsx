import React, { useState, useEffect } from 'react';
import { Activity, ScanLine, TrendingUp, Calendar, Clock, ChevronRight, Lightbulb, Heart, AlertCircle, Sparkles, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { ProgressRing } from '../components/ui/ProgressRing';
import WeatherWidget from '../components/dashboard/WeatherWidget';
import LifestyleWidget from '../components/dashboard/LifestyleWidget';
import { AuthUser } from '../services/auth';
import { getProgressData, ProgressDataPoint, RecentScanItem } from '../services/api';

interface DashboardHomeProps {
  onStartScan: () => void;
  onStartRemoteScan?: () => void;
  onViewHistory?: () => void;
  user?: AuthUser | null;
}

const quickTips = [
  { id: 1, icon: Sparkles, text: 'Apply hyaluronic acid to damp skin for maximum absorption' },
  { id: 2, icon: Heart, text: 'Get 7-9 hours of sleep for optimal skin repair' },
];

export default function DashboardHome({ onStartScan, onStartRemoteScan, onViewHistory, user }: DashboardHomeProps) {
  const [progress, setProgress] = useState<ProgressDataPoint[]>([]);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const [latestStats, setLatestStats] = useState<{ acne_count: number; severity: string; confidence: number } | null>(null);
  const [modelOnline, setModelOnline] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lifestyle, setLifestyle] = useState<{ water: number; sleep: number; stress?: string } | null>(null);

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

    const rawDate = new Date().toISOString().split('T')[0];
    const saved = localStorage.getItem(`lifestyle_log_${rawDate}`);
    if (saved) {
      try {
        setLifestyle(JSON.parse(saved));
      } catch (e) {}
    }

    return () => { cancelled = true; };
  }, []);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const firstName = user?.name?.split(' ')[0] || 'there';

  const healthScore = progress.length > 0 ? progress[progress.length - 1].score : 0;
  const prevScore = progress.length > 1 ? progress[progress.length - 2].score : healthScore;
  const scoreTrend = healthScore - prevScore;

  const dynamicTips = [...quickTips];
  if (lifestyle) {
    if (typeof lifestyle.water === 'number' && lifestyle.water < 4) {
      dynamicTips.unshift({ id: -1, icon: AlertCircle, text: 'Dehydration Alert: Drink a glass of water right now to maintain skin elasticity.' });
    }
    if (typeof lifestyle.sleep === 'number' && lifestyle.sleep < 6) {
      dynamicTips.unshift({ id: -2, icon: AlertCircle, text: 'Sleep Deficit: Poor sleep affects skin repair. Try to rest earlier tonight.' });
    }
    if (lifestyle.stress === 'high') {
      dynamicTips.unshift({ id: -3, icon: AlertCircle, text: 'High Stress: Stress causes cortisol spikes leading to breakouts. Take 5 minutes to breathe.' });
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600 flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5" />
          {loadError}
        </div>
      )}

      {/* SUPER PREMIUM HERO SECTION */}
      <div className="relative overflow-hidden bg-white border border-gray-100 rounded-[2rem] shadow-sm p-8 md:p-10">
        {/* Decorative background blobs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-rose-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
          
          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-100 rounded-full text-xs font-medium text-gray-500 tracking-wide uppercase">
              {dateStr}
              <div className="w-1 h-1 rounded-full bg-gray-300"></div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${modelOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                AI {modelOnline ? 'Online' : 'Offline'}
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-gray-900 leading-tight">
              {greeting}, <br/><span className="text-primary-600">{firstName}</span>
            </h1>
            
            <p className="text-gray-500 text-lg max-w-md leading-relaxed">
              Ready for your daily skin check? Track your progress and maintain your healthy glow.
            </p>
            
            <div className="pt-4 flex flex-wrap gap-4">
              <button
                onClick={onStartScan}
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:-translate-y-0.5 active:translate-y-0"
              >
                <ScanLine className="w-5 h-5" />
                Analyze Skin Now
              </button>
              
              {onStartRemoteScan && (
                <button
                  onClick={onStartRemoteScan}
                  className="bg-white border-2 border-gray-100 hover:border-gray-200 text-gray-700 px-6 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-sm hover:shadow-md"
                >
                  Mobile Sync
                </button>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center gap-8 bg-white/50 backdrop-blur-xl border border-white p-6 rounded-3xl shadow-sm">
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-bold text-gray-900 uppercase tracking-widest">Health Index</span>
              </div>
              <div className="flex items-end gap-3">
                <div className="text-5xl font-display font-bold text-gray-900">
                  {progress.length > 0 ? healthScore : '--'}
                </div>
                {progress.length > 1 && (
                  <div className={`flex items-center gap-1 mb-1 font-bold text-sm px-2 py-1 rounded-lg ${scoreTrend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {scoreTrend >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5 rotate-180" />}
                    {scoreTrend >= 0 ? '+' : ''}{scoreTrend}%
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-2 font-medium">
                {recentScans.length > 0 ? `Last scan: ${recentScans[0].date}` : 'Awaiting first scan'}
              </div>
            </div>
            <div className="w-px h-24 bg-gradient-to-b from-transparent via-gray-200 to-transparent hidden sm:block"></div>
            <div className="hidden sm:flex items-center justify-center">
              <ProgressRing value={healthScore || 0} size={110} strokeWidth={8} color="#880d1e" bgColor="rgba(136, 13, 30, 0.05)" />
            </div>
          </div>

        </div>
      </div>

      {/* THREE COLUMN WIDGET GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WeatherWidget />
        <LifestyleWidget />
        
        {/* Premium Tips Widget */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-400 rounded-3xl shadow-sm p-6 text-white h-full flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-center gap-2 mb-6">
            <Lightbulb className="w-5 h-5 text-amber-100" />
            <h3 className="font-display font-bold text-lg tracking-tight">Daily Intel</h3>
          </div>
          
          <div className="space-y-3 mt-auto">
            {dynamicTips.slice(0, 2).map((tip, idx) => (
              <div key={tip.id} className="flex items-start gap-3 p-4 bg-white/10 border border-white/20 rounded-2xl backdrop-blur-md">
                <tip.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${tip.id < 0 ? 'text-red-200' : 'text-amber-100'}`} />
                <p className="text-sm leading-relaxed font-medium text-white shadow-sm">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WIDE CHART & HISTORY ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Beautiful Area Chart */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl shadow-sm p-6 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-display font-bold text-xl text-gray-900">Skin Progression</h3>
              <p className="text-sm text-gray-500 mt-1">Track your clarity score over time</p>
            </div>
            {onViewHistory && (
              <button onClick={onViewHistory} className="text-sm font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-4 py-2 rounded-xl transition-colors">
                Full Report
              </button>
            )}
          </div>
          
          <div className="h-64 w-full">
            {progress.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
                <Activity className="w-8 h-8 mb-2 opacity-50" />
                No data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progress} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#880d1e" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#880d1e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} dy={10} fontWeight={600} />
                  <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} fontWeight={600} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f3f4f6', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                    itemStyle={{ color: '#111827', fontWeight: '700', fontSize: '14px' }}
                    labelStyle={{ color: '#6b7280', fontWeight: '600', marginBottom: '4px', fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#880d1e"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorScore)"
                    activeDot={{ r: 6, strokeWidth: 4, stroke: '#ffffff', fill: '#880d1e' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Scans Side Panel */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 md:p-8 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-xl text-gray-900">Recent Scans</h3>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {recentScans.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <ScanLine className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-900">No scans yet</p>
                <p className="text-xs text-gray-500 mt-1">Scan your face to begin.</p>
              </div>
            ) : (
              recentScans.map((scan) => (
                <div key={scan.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-md hover:shadow-gray-200/50 border border-transparent hover:border-gray-100 transition-all cursor-pointer group">
                  <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Calendar className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">{scan.date}</div>
                    <div className="text-xs font-medium text-gray-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {scan.time}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 bg-white px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
                    <div className="text-base font-bold text-primary-600">{scan.score}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {recentScans.length > 0 && onViewHistory && (
            <button onClick={onViewHistory} className="mt-4 w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold transition-colors">
              View All History
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
