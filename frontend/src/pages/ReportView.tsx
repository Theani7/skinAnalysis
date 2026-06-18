import { useState } from 'react';
import { Download, ArrowLeft, ShieldAlert, Droplets, Activity, Maximize, CheckCircle2, AlertTriangle, Sun, Moon, Lightbulb, Clock, Zap, ImageOff } from 'lucide-react';
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
  const color = score >= 70 ? '#0f172a' : score >= 40 ? '#d4a853' : '#ef4444';

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
        <span className="text-3xl font-display font-bold text-surface-900 leading-none">{score}</span>
        <span className="text-[9px] font-medium text-surface-400 -mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

export default function ReportView({ result, onBack }: ReportViewProps) {
  const [activeTab, setActiveTab] = useState<'acne' | 'pigment' | 'moisture'>('acne');
  const [activeRoutineTab, setActiveRoutineTab] = useState<'morning' | 'evening'>('morning');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  if (!result) return null;

  const overallScore = Math.round(result.confidence * 100);

  const metrics = [
    {
      label: 'Acne',
      value: result.severity,
      score: result.acne_count,
      maxLabel: 'spots',
      icon: ShieldAlert,
      color: result.severity === 'Severe' ? 'danger' : result.severity === 'Moderate' ? 'warning' : 'success',
      barWidth: Math.min(100, (result.acne_count / 20) * 100),
    },
    {
      label: 'Pigmentation',
      value: (result.pigmentation_data?.clarity_score || 100) < 85 ? 'Moderate' : 'Low',
      score: result.pigmentation_data?.clarity_score || 100,
      maxLabel: 'clarity',
      icon: Maximize,
      color: (result.pigmentation_data?.clarity_score || 100) < 85 ? 'warning' : 'success',
      barWidth: result.pigmentation_data?.clarity_score || 100,
    },
    {
      label: 'Hydration',
      value: (result.dryness_data?.hydration_score || 100) < 60 ? 'Low' : 'Healthy',
      score: result.dryness_data?.hydration_score || 100,
      maxLabel: 'score',
      icon: Droplets,
      color: (result.dryness_data?.hydration_score || 100) < 60 ? 'danger' : 'success',
      barWidth: result.dryness_data?.hydration_score || 100,
    },
    {
      label: 'Texture',
      value: (result.dryness_data?.roughness_score || 0) > 5 ? 'Rough' : 'Smooth',
      score: result.dryness_data?.roughness_score || 0,
      maxLabel: 'roughness',
      icon: Activity,
      color: (result.dryness_data?.roughness_score || 0) > 5 ? 'warning' : 'success',
      barWidth: Math.min(100, (result.dryness_data?.roughness_score || 0) * 10),
    },
  ];

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-danger-500';
      case 'medium': return 'bg-warning-500';
      default: return 'bg-surface-400';
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setPdfError(null);
      await generateClinicalReportPDF(result);
    } catch (err) {
      console.error('PDF generation failed:', err);
      setPdfError('Failed to generate PDF. Please try again.');
      setTimeout(() => setPdfError(null), 5000);
    }
  };

  const tabs = [
    { id: 'acne' as const, label: 'Acne', img: getResultImageUrl(result.result_image) },
    { id: 'pigment' as const, label: 'Pigmentation', img: result.pigmentation_data?.heatmap_image ? getResultImageUrl(result.pigmentation_data.heatmap_image) : null },
    { id: 'moisture' as const, label: 'Moisture', img: result.dryness_data?.texture_map_image ? getResultImageUrl(result.dryness_data.texture_map_image) : null },
  ];

  return (
    <div className="min-h-full space-y-6 pb-16">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-surface-400 hover:text-surface-900 transition-colors flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Back</span>
        </button>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-xs text-surface-400 font-mono hidden sm:inline truncate">
            #{result.result_image.split('_')[1].substring(0, 8).toUpperCase()}
          </span>
          <button
            onClick={handleDownloadPDF}
            className="bg-surface-900 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 flex-shrink-0 text-sm hover:bg-surface-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {result.conflicts && result.conflicts.length > 0 && (
        <div className="space-y-2">
          {result.conflicts.map((conflict, idx) => (
            <div key={idx} className="bg-warning-50 border border-warning-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-warning-500 flex-shrink-0" />
              <p className="text-sm text-warning-700">{conflict.message}</p>
            </div>
          ))}
        </div>
      )}

      {pdfError && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-danger-500 flex-shrink-0" />
          <p className="text-sm text-danger-600">{pdfError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-surface-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-surface-100">
            <div className="flex gap-1 bg-surface-50 rounded-lg p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-surface-900 shadow-sm'
                      : 'text-surface-400 hover:text-surface-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="aspect-square bg-surface-50 relative">
            {tabs.find(t => t.id === activeTab)?.img && !imageErrors[activeTab] ? (
              <img
                src={tabs.find(t => t.id === activeTab)!.img!}
                alt={tabs.find(t => t.id === activeTab)!.label}
                className="w-full h-full object-cover"
                onError={() => setImageErrors(prev => ({ ...prev, [activeTab]: true }))}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-surface-300 gap-2">
                <ImageOff className="w-8 h-8" />
                <span className="text-sm">No image available</span>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-surface-200 rounded-2xl p-6 md:p-8 flex items-center gap-5">
            <div className="flex-shrink-0">
              <ScoreRing score={overallScore} size={100} stroke={8} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-surface-900" />
                <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Analysis Complete</span>
              </div>
              <h2 className="text-2xl font-display font-bold text-surface-900 mb-1">Skin Health Score</h2>
              <p className="text-sm text-surface-500">
                {overallScore >= 70 ? 'Healthy skin profile detected.' : overallScore >= 40 ? 'Some attention recommended.' : 'Consult a dermatologist.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {metrics.map((m) => (
              <div key={m.label} className="bg-white border border-surface-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    m.color === 'danger' ? 'bg-danger-50 text-danger-500' :
                    m.color === 'warning' ? 'bg-warning-50 text-warning-500' :
                    'bg-success-50 text-success-500'
                  }`}>
                    <m.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">{m.label}</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-xl font-display font-bold text-surface-900">{m.score}</span>
                  <span className="text-xs text-surface-400">{m.maxLabel}</span>
                </div>
                <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      m.color === 'danger' ? 'bg-danger-500' :
                      m.color === 'warning' ? 'bg-warning-500' :
                      'bg-success-500'
                    }`}
                    style={{ width: `${m.barWidth}%` }}
                  />
                </div>
                <div className="mt-2">
                  <span className={`text-xs font-medium ${
                    m.color === 'danger' ? 'text-danger-500' :
                    m.color === 'warning' ? 'text-warning-500' :
                    'text-success-500'
                  }`}>{m.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {result.routine && (
        <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-surface-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-surface-400" />
                <h3 className="text-lg font-display font-bold text-surface-900">Daily Routine</h3>
              </div>
              <div className="flex gap-1 bg-surface-50 rounded-lg p-1 self-start">
                <button
                  onClick={() => setActiveRoutineTab('morning')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeRoutineTab === 'morning'
                      ? 'bg-white text-surface-900 shadow-sm'
                      : 'text-surface-400 hover:text-surface-600'
                  }`}
                >
                  <Sun className="w-4 h-4" /> Morning
                </button>
                <button
                  onClick={() => setActiveRoutineTab('evening')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                    activeRoutineTab === 'evening'
                      ? 'bg-white text-surface-900 shadow-sm'
                      : 'text-surface-400 hover:text-surface-600'
                  }`}
                >
                  <Moon className="w-4 h-4" /> Evening
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-0">
              {(activeRoutineTab === 'morning' ? result.routine.morning : result.routine.evening).map((step, idx, arr) => (
                <div key={step.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 bg-surface-900 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 z-10">
                      {step.step}
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="w-px h-full bg-surface-200 my-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <h4 className="font-semibold text-surface-900 text-sm">{step.product}</h4>
                    <p className="text-xs text-surface-400 mt-0.5">{step.action}</p>
                  </div>
                </div>
              ))}
            </div>

            {result.routine.tips.length > 0 && (
              <div className="mt-5 p-5 bg-surface-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-surface-500" />
                  <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Tips</span>
                </div>
                <ul className="space-y-2">
                  {result.routine.tips.map((tip, idx) => (
                    <li key={idx} className="text-xs text-surface-600 flex items-start gap-2">
                      <span className="text-surface-300 mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-surface-200 rounded-2xl p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <Zap className="w-5 h-5 text-surface-400" />
            <h3 className="text-lg font-display font-bold text-surface-900">Clinical Notes</h3>
          </div>

          <p className="text-sm text-surface-500 leading-relaxed mb-6 italic">
            "Primary findings indicate {result.severity.toLowerCase()} inflammatory activity and{' '}
            {result.dryness_data && result.dryness_data.hydration_score < 60
              ? 'significant trans-epidermal moisture loss'
              : 'stable barrier function'
            }. Analysis identifies {result.pigmentation_data?.spots_count || 0} localized pigment clusters."
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wider">Key Findings</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-xs text-surface-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-surface-400 mt-1.5 flex-shrink-0" />
                  Sebaceous activity: {result.acne_count > 5 ? 'Elevated' : 'Optimal'}
                </li>
                <li className="flex items-start gap-2 text-xs text-surface-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-surface-400 mt-1.5 flex-shrink-0" />
                  Melanin clarity: {result.pigmentation_data?.clarity_score || 0}%
                </li>
                {result.face_quality && (
                  <li className="flex items-start gap-2 text-xs text-surface-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-surface-400 mt-1.5 flex-shrink-0" />
                    Image quality: {result.face_quality.overall}%
                  </li>
                )}
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wider">Priority Action</h4>
              <div className="p-4 bg-surface-50 rounded-xl">
                <p className="text-xs text-surface-600 leading-relaxed">
                  Focus on barrier restoration and photoprotection.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-medium text-surface-400 uppercase tracking-wider px-1">Recommendations</h3>
          <div className="space-y-2">
            {result.recommendations?.map((rec) => (
              <div key={rec.id} className="bg-white border border-surface-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getPriorityDot(rec.priority)}`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-surface-900 text-sm">{rec.title}</h4>
                    <p className="text-xs text-surface-400 leading-relaxed mt-0.5">{rec.description}</p>
                    {rec.why && (
                      <p className="text-xs text-surface-500 font-medium mt-1">{rec.why}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={handleDownloadPDF}
              className="w-full bg-surface-900 text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 mt-4 hover:bg-surface-800 transition-colors"
            >
              <Download className="w-4 h-4" /> Save Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
