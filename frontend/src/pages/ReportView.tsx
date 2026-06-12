import { useState } from 'react';
import { Download, ArrowLeft, ShieldAlert, Droplets, Activity, Maximize, CheckCircle2, AlertTriangle, Sun, Moon, Lightbulb, Clock, Zap } from 'lucide-react';
import { AnalysisResponse, getResultImageUrl } from '../services/api';
import { generateClinicalReportPDF } from '../utils/generatePDF';

interface ReportViewProps {
  result: AnalysisResponse | null;
  onBack: () => void;
}

function ScoreRing({ score, size = 120, stroke = 8 }: { score: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-surface-900 leading-none">{score}</span>
        <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest mt-1">/ 100</span>
      </div>
    </div>
  );
}

export default function ReportView({ result, onBack }: ReportViewProps) {
  const [activeTab, setActiveTab] = useState<'acne' | 'pigment' | 'moisture'>('acne');
  const [activeRoutineTab, setActiveRoutineTab] = useState<'morning' | 'evening'>('morning');

  if (!result) return null;

  const overallScore = Math.round(result.confidence * 100);

  const metrics = [
    {
      label: 'Acne',
      value: result.severity,
      score: result.acne_count,
      maxLabel: 'spots',
      icon: ShieldAlert,
      color: result.severity === 'Severe' ? 'rose' : result.severity === 'Moderate' ? 'amber' : 'emerald',
      barColor: result.severity === 'Severe' ? 'bg-rose-500' : result.severity === 'Moderate' ? 'bg-amber-500' : 'bg-emerald-500',
      barWidth: Math.min(100, (result.acne_count / 20) * 100),
    },
    {
      label: 'Pigmentation',
      value: (result.pigmentation_data?.clarity_score || 100) < 85 ? 'Moderate' : 'Low',
      score: result.pigmentation_data?.clarity_score || 100,
      maxLabel: 'clarity',
      icon: Maximize,
      color: (result.pigmentation_data?.clarity_score || 100) < 85 ? 'amber' : 'emerald',
      barColor: (result.pigmentation_data?.clarity_score || 100) < 85 ? 'bg-amber-500' : 'bg-emerald-500',
      barWidth: result.pigmentation_data?.clarity_score || 100,
    },
    {
      label: 'Hydration',
      value: (result.dryness_data?.hydration_score || 100) < 60 ? 'Low' : 'Healthy',
      score: result.dryness_data?.hydration_score || 100,
      maxLabel: 'score',
      icon: Droplets,
      color: (result.dryness_data?.hydration_score || 100) < 60 ? 'rose' : 'emerald',
      barColor: (result.dryness_data?.hydration_score || 100) < 60 ? 'bg-rose-500' : 'bg-emerald-500',
      barWidth: result.dryness_data?.hydration_score || 100,
    },
    {
      label: 'Texture',
      value: (result.dryness_data?.roughness_score || 0) > 5 ? 'Rough' : 'Smooth',
      score: result.dryness_data?.roughness_score || 0,
      maxLabel: 'roughness',
      icon: Activity,
      color: (result.dryness_data?.roughness_score || 0) > 5 ? 'amber' : 'emerald',
      barColor: (result.dryness_data?.roughness_score || 0) > 5 ? 'bg-amber-500' : 'bg-emerald-500',
      barWidth: Math.min(100, (result.dryness_data?.roughness_score || 0) * 10),
    },
  ];

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-500';
      case 'medium': return 'bg-amber-500';
      default: return 'bg-blue-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medical': return '🏥';
      case 'skincare': return '🧴';
      case 'lifestyle': return '🌿';
      default: return '✨';
    }
  };

  const tabs = [
    { id: 'acne' as const, label: 'Acne Detection', img: getResultImageUrl(result.result_image) },
    { id: 'pigment' as const, label: 'Pigmentation', img: result.pigmentation_data?.heatmap_image ? getResultImageUrl(result.pigmentation_data.heatmap_image) : null },
    { id: 'moisture' as const, label: 'Moisture Map', img: result.dryness_data?.texture_map_image ? getResultImageUrl(result.dryness_data.texture_map_image) : null },
  ];

  return (
    <div className="min-h-full space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-surface-400 hover:text-surface-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Back</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-surface-400 font-medium hidden sm:inline">
            Session #{result.result_image.split('_')[1].substring(0, 8).toUpperCase()}
          </span>
          <button
            onClick={() => generateClinicalReportPDF(result)}
            className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Conflict Warnings */}
      {result.conflicts && result.conflicts.length > 0 && (
        <div className="space-y-2">
          {result.conflicts.map((conflict, idx) => (
            <div key={idx} className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-sm font-medium text-amber-700">{conflict.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Hero: Score + Image */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Image Viewer */}
        <div className="bg-white rounded-2xl border border-surface-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-surface-100">
          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-surface-400 hover:bg-surface-50 hover:text-surface-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="aspect-square bg-surface-50 relative">
            {tabs.find(t => t.id === activeTab)?.img ? (
              <img
                src={tabs.find(t => t.id === activeTab)!.img!}
                alt={tabs.find(t => t.id === activeTab)!.label}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-surface-300">
                <span className="text-sm font-medium">No image available</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Score + Metrics */}
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-sm p-5 sm:p-8 flex items-center gap-4 sm:gap-8">
            <ScoreRing score={overallScore} size={130} stroke={10} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Analysis Complete</span>
              </div>
              <h2 className="text-2xl font-black text-surface-900 mb-1">Skin Health Score</h2>
              <p className="text-sm text-surface-400">
                {overallScore >= 70 ? 'Your skin shows healthy characteristics.' : overallScore >= 40 ? 'Some areas need attention.' : 'Consider consulting a dermatologist.'}
              </p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="bg-white rounded-2xl border border-surface-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    m.color === 'rose' ? 'bg-rose-50 text-rose-500' :
                    m.color === 'amber' ? 'bg-amber-50 text-amber-500' :
                    'bg-emerald-50 text-emerald-500'
                  }`}>
                    <m.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-surface-500 uppercase tracking-wider">{m.label}</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-xl font-black text-surface-900">{m.score}</span>
                  <span className="text-xs text-surface-400 font-medium">{m.maxLabel}</span>
                </div>
                <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${m.barColor}`} style={{ width: `${m.barWidth}%` }} />
                </div>
                <div className="mt-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    m.color === 'rose' ? 'text-rose-500' :
                    m.color === 'amber' ? 'text-amber-500' :
                    'text-emerald-500'
                  }`}>{m.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Routine */}
      {result.routine && (
        <div className="bg-white rounded-2xl border border-surface-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-surface-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary-600" />
                </div>
                <h3 className="text-lg font-black text-surface-900">Daily Routine</h3>
              </div>
              <div className="flex gap-1 bg-surface-50 rounded-lg p-1">
                <button
                  onClick={() => setActiveRoutineTab('morning')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold transition-all ${
                    activeRoutineTab === 'morning'
                      ? 'bg-white text-amber-600 shadow-sm'
                      : 'text-surface-400 hover:text-surface-600'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" /> Morning
                </button>
                <button
                  onClick={() => setActiveRoutineTab('evening')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold transition-all ${
                    activeRoutineTab === 'evening'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-surface-400 hover:text-surface-600'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" /> Evening
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Timeline steps */}
            <div className="space-y-0">
              {(activeRoutineTab === 'morning' ? result.routine.morning : result.routine.evening).map((step, idx, arr) => (
                <div key={step.id} className="flex gap-4">
                  {/* Timeline connector */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 z-10">
                      {step.step}
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="w-px h-full bg-surface-200 my-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <h4 className="font-bold text-surface-900 text-sm">{step.product}</h4>
                    <p className="text-xs text-surface-400 mt-0.5">{step.action}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tips */}
            {result.routine.tips.length > 0 && (
              <div className="mt-4 p-4 bg-primary-50 rounded-xl border border-primary-100">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-primary-600" />
                  <span className="text-xs font-bold text-primary-700 uppercase tracking-wider">Pro Tips</span>
                </div>
                <ul className="space-y-1.5">
                  {result.routine.tips.map((tip, idx) => (
                    <li key={idx} className="text-xs text-primary-600 flex items-start gap-2">
                      <span className="text-primary-300 mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom: Interpretation + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clinical Interpretation */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-surface-100 rounded-xl flex items-center justify-center">
              <Zap className="w-4 h-4 text-surface-600" />
            </div>
            <h3 className="text-lg font-black text-surface-900">Clinical Notes</h3>
          </div>

          <p className="text-sm text-surface-500 leading-relaxed mb-6 italic">
            "Primary findings indicate {result.severity.toLowerCase()} inflammatory activity and{' '}
            {result.dryness_data && result.dryness_data.hydration_score < 60
              ? 'significant trans-epidermal moisture loss'
              : 'stable barrier function'
            }. Multi-spectral analysis identifies {result.pigmentation_data?.spots_count || 0} localized pigment clusters."
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-surface-900">Key Findings</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-xs text-surface-500 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                  Sebaceous activity: {result.acne_count > 5 ? 'Elevated' : 'Optimal'}
                </li>
                <li className="flex items-start gap-2 text-xs text-surface-500 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                  Melanin clarity: {result.pigmentation_data?.clarity_score || 0}%
                </li>
                {result.face_quality && (
                  <li className="flex items-start gap-2 text-xs text-surface-500 font-medium">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                    Image quality: {result.face_quality.overall}%
                  </li>
                )}
              </ul>
            </div>
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-surface-900">Priority Action</h4>
              <div className="p-3 bg-surface-50 rounded-xl border border-surface-100">
                <p className="text-xs font-bold text-surface-700 leading-relaxed">
                  Focus on barrier restoration and UVA/UVB photoprotection.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-surface-400 px-1">Recommendations</h3>
          <div className="space-y-3">
            {result.recommendations?.map((rec) => (
              <div key={rec.id} className="bg-white rounded-2xl border border-surface-100 shadow-sm p-4 group hover:border-primary-200 transition-all">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getPriorityDot(rec.priority)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-surface-900 text-sm group-hover:text-primary-600 transition-colors">{rec.title}</h4>
                      <span className="text-xs" aria-hidden="true">{getCategoryIcon(rec.category)}</span>
                    </div>
                    <p className="text-xs text-surface-400 leading-relaxed mb-1.5">{rec.description}</p>
                    {rec.why && (
                      <p className="text-[10px] text-primary-500 font-medium">{rec.why}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => generateClinicalReportPDF(result)}
              className="w-full bg-surface-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-surface-800 transition-all flex items-center justify-center gap-2 mt-4"
            >
              <Download className="w-4 h-4" /> Save Full Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
