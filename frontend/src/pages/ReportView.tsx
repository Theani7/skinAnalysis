import { useState, useEffect } from 'react';
import {
  Download, ArrowLeft, ShieldAlert, Droplets, Activity, Maximize,
  CheckCircle2, AlertTriangle, Sun, Moon, Lightbulb, Clock, Zap,
  ImageOff, CircleDot, Sparkles, ExternalLink, Star, ShoppingBag,
} from 'lucide-react';
import { AnalysisResponse, getResultImageUrl, getScanHistory, getScanDetail } from '../services/api';
import { generateClinicalReportPDF } from '../utils/generatePDF';

interface ReportViewProps {
  result: AnalysisResponse | null;
  onBack: () => void;
  onScanNow?: () => void;
}

function ScoreRing({ score, size = 140, stroke = 10 }: { score: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#14b8a6' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border-default)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200 leading-none">{score}</span>
        <span className="text-[10px] font-medium t-text-muted mt-1">/ 100</span>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: 'good' | 'warning' | 'danger' }) {
  const color = status === 'danger' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : status === 'warning' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]';
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />;
}

function MetricCard({
  icon: Icon, label, value, score, maxLabel, color, barWidth,
}: {
  icon: React.ElementType; label: string; value: string; score: number;
  maxLabel: string; color: 'danger' | 'warning' | 'success'; barWidth: number;
}) {
  const bg = color === 'danger' ? 'bg-red-50 text-red-600' : color === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-primary-50 text-primary-600';
  const bar = color === 'danger' ? 'bg-red-500' : color === 'warning' ? 'bg-amber-500' : 'bg-primary-500';
  const textColor = color === 'danger' ? 'text-red-600' : color === 'warning' ? 'text-amber-600' : 'text-primary-600';

  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 transition-all duration-300 hover:border-primary-200">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-2.5">
        <span className="text-2xl font-display font-bold text-gray-900">{score}</span>
        <span className="text-xs text-gray-500">{maxLabel}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full transition-all duration-700 ${bar}`} style={{ width: `${barWidth}%` }} />
      </div>
      <span className={`text-xs font-medium ${textColor}`}>{value}</span>
    </div>
  );
}

export default function ReportView({ result: initialResult, onBack, onScanNow }: ReportViewProps) {
  const [activeTab, setActiveTab] = useState<'acne' | 'pigment' | 'moisture'>('acne');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  const [result, setResult] = useState<any>(initialResult);
  const [isLoading, setIsLoading] = useState(!initialResult);

  useEffect(() => {
    if (!initialResult) {
      const loadRecent = async () => {
        try {
          setIsLoading(true);
          const history = await getScanHistory(1, 0);
          if (history.scans.length > 0) {
            const detail = await getScanDetail(history.scans[0].id);
            setResult({ ...detail, status: 'success' });
          }
        } catch (err) {
          console.error('Failed to load recent analysis.', err);
        } finally {
          setIsLoading(false);
        }
      };
      loadRecent();
    } else {
      setResult(initialResult);
    }
  }, [initialResult]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">Loading recent analysis...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mb-6">
          <Sparkles className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900 mb-3">No Analysis Yet</h2>
        <p className="text-gray-500 mb-8">
          You haven't performed a skin analysis yet. Scan your face now to get personalized insights and recommendations.
        </p>
        {onScanNow && (
          <button
            onClick={onScanNow}
            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3.5 rounded-xl font-semibold shadow-sm shadow-primary-500/30 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Scan Now
          </button>
        )}
      </div>
    );
  }

  const overallScore = Math.round(result.confidence * 100);
  const clarity = result.pigmentation_data?.clarity_score ?? 100;
  const hydration = result.dryness_data?.hydration_score ?? 100;
  const roughness = result.dryness_data?.roughness_score ?? 0;

  const metrics = [
    {
      icon: ShieldAlert, label: 'Acne', value: result.severity, score: result.acne_count,
      maxLabel: 'spots', color: result.severity === 'Severe' ? 'danger' as const : result.severity === 'Moderate' ? 'warning' as const : 'success' as const,
      barWidth: Math.min(100, (result.acne_count / 20) * 100),
    },
    {
      icon: Maximize, label: 'Pigmentation', value: result.pigmentation_data?.intensity || 'Low', score: clarity,
      maxLabel: 'clarity', color: clarity < 85 ? 'warning' as const : 'success' as const,
      barWidth: clarity,
    },
    {
      icon: Droplets, label: 'Hydration', value: hydration < 60 ? 'Low' : 'Healthy', score: hydration,
      maxLabel: 'score', color: hydration < 60 ? 'danger' as const : 'success' as const,
      barWidth: hydration,
    },
    {
      icon: Activity, label: 'Texture', value: roughness > 5 ? 'Rough' : 'Smooth', score: roughness,
      maxLabel: 'roughness', color: roughness > 5 ? 'warning' as const : 'success' as const,
      barWidth: Math.min(100, roughness * 10),
    },
  ];

  const findings = [
    { label: 'Sebaceous activity', value: result.acne_count > 5 ? 'Elevated' : 'Optimal', status: result.acne_count > 5 ? 'danger' as const : 'good' as const },
    { label: 'Melanin clarity', value: `${clarity}%`, status: clarity < 70 ? 'danger' as const : clarity < 85 ? 'warning' as const : 'good' as const },
    { label: 'Skin hydration', value: `${hydration}%`, status: hydration < 60 ? 'danger' as const : 'good' as const },
    { label: 'Surface texture', value: roughness > 5 ? 'Rough' : 'Smooth', status: roughness > 5 ? 'warning' as const : 'good' as const },
    { label: 'Pigment pattern', value: result.pigmentation_data?.spatial_pattern || 'N/A', status: 'good' as const },
    { label: 'Pigment coverage', value: `${result.pigmentation_data?.normalized_coverage || 0}%`, status: (result.pigmentation_data?.normalized_coverage || 0) > 3 ? 'warning' as const : 'good' as const },
  ];
  if (result.face_quality) {
    findings.push({ label: 'Image quality', value: `${result.face_quality.overall}%`, status: result.face_quality.overall < 60 ? 'warning' as const : 'good' as const });
  }

  const tabs = [
    { id: 'acne' as const, label: 'Acne', img: getResultImageUrl(result.result_image) },
    { id: 'pigment' as const, label: 'Pigmentation', img: result.pigmentation_data?.heatmap_image ? getResultImageUrl(result.pigmentation_data.heatmap_image) : null },
    { id: 'moisture' as const, label: 'Moisture', img: result.dryness_data?.texture_map_image ? getResultImageUrl(result.dryness_data.texture_map_image) : null },
  ];

  const typeColors: Record<string, string> = {
    freckle: 'bg-teal-400', melasma: 'bg-amber-500', pih: 'bg-red-400',
    sun_spot: 'bg-yellow-500', unknown: 'bg-gray-500',
  };
  const typeDist = result.pigmentation_data?.type_distribution || {};
  const totalTypes = Object.values(typeDist).reduce((a: number, b: any) => a + (b as number), 0) as number;

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

  const getPriorityDot = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
      case 'medium': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      default: return 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]';
    }
  };

  return (
    <div className="min-h-full space-y-6 pb-16 text-gray-600">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-4 py-2 rounded-xl transition-all flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Back</span>
        </button>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="text-xs text-gray-400 font-mono hidden sm:inline truncate">
            #{result.result_image.split('_')[1]?.substring(0, 8).toUpperCase() || result.id?.split('-')[0].toUpperCase()}
          </span>
          <button
            onClick={handleDownloadPDF}
            className="bg-primary-600 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 flex-shrink-0 text-sm hover:bg-primary-700 transition-all shadow-sm shadow-primary-500/30"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Conflicts */}
      {result.conflicts && result.conflicts.length > 0 && (
        <div className="space-y-2">
          {result.conflicts.map((conflict: any, idx: number) => (
            <div key={idx} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-700">{conflict.message}</p>
            </div>
          ))}
        </div>
      )}

      {pdfError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{pdfError}</p>
        </div>
      )}

      {/* Hero: Score Ring + Image */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-100 shadow-sm rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center">
          <div className="mb-4">
            <ScoreRing score={overallScore} />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-primary-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Analysis Complete</span>
          </div>
          <h2 className="text-xl font-display font-bold text-gray-900 mb-1">Skin Health Score</h2>
          <p className="text-sm text-gray-500">
            {overallScore >= 70 ? 'Healthy skin profile detected.' : overallScore >= 40 ? 'Some attention recommended.' : 'Consult a dermatologist.'}
          </p>
        </div>

        <div className="lg:col-span-3 bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex gap-1 bg-gray-50 rounded-lg p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary-500 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="aspect-[4/3] bg-gray-900/50 relative overflow-hidden">
            {tabs.find(t => t.id === activeTab)?.img && !imageErrors[activeTab] ? (
              <img
                src={tabs.find(t => t.id === activeTab)!.img!}
                alt={tabs.find(t => t.id === activeTab)!.label}
                className="w-full h-full object-cover"
                onError={() => setImageErrors(prev => ({ ...prev, [activeTab]: true }))}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center t-text-muted gap-2">
                <ImageOff className="w-8 h-8" />
                <span className="text-sm">No image available</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Key Findings + Pigmentation Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-100 shadow-sm rounded-2xl p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <Zap className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-display font-bold text-gray-900">Key Findings</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {findings.map((f) => (
              <div key={f.label} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <StatusDot status={f.status} />
                <span className="text-sm text-gray-600 flex-1">{f.label}</span>
                <span className="text-sm font-medium text-gray-900">{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <CircleDot className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-display font-bold text-gray-900">Pigmentation Types</h3>
          </div>
          {totalTypes > 0 ? (
            <div className="space-y-4">
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
                {Object.entries(typeDist).map(([type, count]) => (
                  <div
                    key={type}
                    className={`h-full ${typeColors[type] || 'bg-gray-500'} transition-all duration-500`}
                    style={{ width: `${((count as number) / totalTypes) * 100}%` }}
                    title={`${type}: ${count}`}
                  />
                ))}
              </div>
              <div className="space-y-2">
                {Object.entries(typeDist).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2.5">
                    <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${typeColors[type] || 'bg-gray-500'}`} />
                    <span className="text-sm t-text-secondary flex-1 capitalize">{type.replace('_', ' ')}</span>
                    <span className="text-sm font-medium t-text">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm t-text-muted">No spots detected</p>
          )}
        </div>
      </div>

      {/* Daily Routine */}
      {result.routine && (
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary-500" />
              <h3 className="text-lg font-display font-bold text-gray-900">Daily Routine</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-200">
                    <Sun className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Morning</span>
                </div>
                <div className="space-y-0">
                  {result.routine.morning.map((step: any, idx: number, arr: any[]) => (
                    <div key={step.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 z-10 shadow-sm">
                          {step.step}
                        </div>
                        {idx < arr.length - 1 && <div className="w-px flex-1 bg-gray-200 border-r border-gray-200 my-1" />}
                      </div>
                      <div className="flex-1 pb-5">
                        <h4 className="font-semibold text-gray-900 text-sm">{step.product}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{step.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-200">
                    <Moon className="w-4 h-4 text-indigo-500" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Evening</span>
                </div>
                <div className="space-y-0">
                  {result.routine.evening.map((step: any, idx: number, arr: any[]) => (
                    <div key={step.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 z-10 shadow-sm">
                          {step.step}
                        </div>
                        {idx < arr.length - 1 && <div className="w-px flex-1 bg-gray-200 border-r border-gray-200 my-1" />}
                      </div>
                      <div className="flex-1 pb-5">
                        <h4 className="font-semibold text-gray-900 text-sm">{step.product}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{step.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {result.routine.tips.length > 0 && (
              <div className="mt-6 p-5 bg-gray-50 border border-gray-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-primary-500" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tips</span>
                </div>
                <ul className="space-y-2">
                  {result.routine.tips.map((tip: string, idx: number) => (
                    <li key={idx} className="text-xs text-gray-500 flex items-start gap-2">
                      <span className="text-teal-500 mt-0.5">&#8226;</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <Sparkles className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-display font-bold text-gray-900">Recommendations</h3>
        </div>
        <div className="space-y-4">
          {result.recommendations?.map((rec: any) => (
            <div key={rec.id} className={`bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden transition-all duration-300 hover:border-primary-200 border-l-4 ${rec.category === 'skincare' ? 'border-l-primary-500' : 'border-l-amber-500'}`}>
              {/* Recommendation info */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getPriorityDot(rec.priority)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 text-sm">{rec.title}</h4>
                      {rec.category === 'skincare' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary-50 text-primary-600 border border-primary-200 rounded">Shop</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{rec.description}</p>
                    {rec.why && (
                      <p className="text-xs text-gray-500 font-medium mt-1">{rec.why}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Daraz products */}
              {rec.products && rec.products.length > 0 && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShoppingBag className="w-3 h-3 text-primary-500" />
                    <span className="text-[10px] font-medium text-primary-600 uppercase tracking-wider">Available on Daraz</span>
                  </div>
                  <div className="space-y-2">
                    {rec.products.map((product: any, idx: number) => (
                      <a
                        key={idx}
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2.5 bg-white border border-gray-100 hover:bg-gray-50 hover:border-primary-200 transition-all group rounded-xl shadow-sm"
                      >
                        <div className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-600 line-clamp-2 group-hover:text-primary-600 transition-colors">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold text-gray-900">{product.price_show}</span>
                            {product.discount && (
                              <span className="text-[10px] font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                                {product.discount}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {product.rating > 0 && (
                              <div className="flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span className="text-[10px] text-gray-500">{product.rating}</span>
                              </div>
                            )}
                            {product.reviews > 0 && (
                              <span className="text-[10px] text-gray-500">({product.reviews})</span>
                            )}
                            {product.sold && (
                              <span className="text-[10px] text-gray-500">{product.sold}</span>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-500 flex-shrink-0 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleDownloadPDF}
          className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-primary-700 transition-all shadow-sm shadow-primary-500/30 mt-6"
        >
          <Download className="w-4 h-4" /> Save Report
        </button>
      </div>
    </div>
  );
}
