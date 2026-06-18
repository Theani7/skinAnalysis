import { useState } from 'react';
import {
  Download, ArrowLeft, ShieldAlert, Droplets, Activity, Maximize,
  CheckCircle2, AlertTriangle, Sun, Moon, Lightbulb, Clock, Zap,
  ImageOff, CircleDot, Sparkles, ExternalLink, Star, ShoppingBag,
} from 'lucide-react';
import { AnalysisResponse, getResultImageUrl } from '../services/api';
import { generateClinicalReportPDF } from '../utils/generatePDF';

interface ReportViewProps {
  result: AnalysisResponse | null;
  onBack: () => void;
}

function ScoreRing({ score, size = 140, stroke = 10 }: { score: number; size?: number; stroke?: number }) {
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
        <span className="text-4xl font-display font-bold text-surface-900 leading-none">{score}</span>
        <span className="text-[10px] font-medium text-surface-400 mt-1">/ 100</span>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: 'good' | 'warning' | 'danger' }) {
  const color = status === 'danger' ? 'bg-danger-500' : status === 'warning' ? 'bg-warning-500' : 'bg-success-500';
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />;
}

function MetricCard({
  icon: Icon, label, value, score, maxLabel, color, barWidth,
}: {
  icon: React.ElementType; label: string; value: string; score: number;
  maxLabel: string; color: 'danger' | 'warning' | 'success'; barWidth: number;
}) {
  const bg = color === 'danger' ? 'bg-danger-50 text-danger-500' : color === 'warning' ? 'bg-warning-50 text-warning-500' : 'bg-success-50 text-success-500';
  const bar = color === 'danger' ? 'bg-danger-500' : color === 'warning' ? 'bg-warning-500' : 'bg-success-500';
  const textColor = color === 'danger' ? 'text-danger-500' : color === 'warning' ? 'text-warning-500' : 'text-success-500';

  return (
    <div className="bg-white border border-surface-200 rounded-2xl p-5 transition-all duration-300 hover:shadow-premium-sm">
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-2.5">
        <span className="text-2xl font-display font-bold text-surface-900">{score}</span>
        <span className="text-xs text-surface-400">{maxLabel}</span>
      </div>
      <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full transition-all duration-700 ${bar}`} style={{ width: `${barWidth}%` }} />
      </div>
      <span className={`text-xs font-medium ${textColor}`}>{value}</span>
    </div>
  );
}

export default function ReportView({ result, onBack }: ReportViewProps) {
  const [activeTab, setActiveTab] = useState<'acne' | 'pigment' | 'moisture'>('acne');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  if (!result) return null;

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
    freckle: 'bg-primary-400', melasma: 'bg-warning-500', pih: 'bg-danger-400',
    sun_spot: 'bg-gold-500', unknown: 'bg-surface-300',
  };
  const typeDist = result.pigmentation_data?.type_distribution || {};
  const totalTypes = Object.values(typeDist).reduce((a, b) => a + (b as number), 0) as number;

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
      case 'high': return 'bg-danger-500';
      case 'medium': return 'bg-warning-500';
      default: return 'bg-surface-400';
    }
  };

  return (
    <div className="min-h-full space-y-6 pb-16">
      {/* Header */}
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

      {/* Conflicts */}
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

      {/* Hero: Score Ring + Image */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white border border-surface-200 rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center">
          <div className="mb-4">
            <ScoreRing score={overallScore} />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-surface-900" />
            <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Analysis Complete</span>
          </div>
          <h2 className="text-xl font-display font-bold text-surface-900 mb-1">Skin Health Score</h2>
          <p className="text-sm text-surface-500">
            {overallScore >= 70 ? 'Healthy skin profile detected.' : overallScore >= 40 ? 'Some attention recommended.' : 'Consult a dermatologist.'}
          </p>
        </div>

        <div className="lg:col-span-3 bg-white border border-surface-200 rounded-2xl overflow-hidden">
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
          <div className="aspect-[4/3] bg-surface-50 relative">
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
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Key Findings + Pigmentation Types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-surface-200 rounded-2xl p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <Zap className="w-5 h-5 text-surface-400" />
            <h3 className="text-lg font-display font-bold text-surface-900">Key Findings</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {findings.map((f) => (
              <div key={f.label} className="flex items-center gap-3 py-2 border-b border-surface-100 last:border-0">
                <StatusDot status={f.status} />
                <span className="text-sm text-surface-500 flex-1">{f.label}</span>
                <span className="text-sm font-medium text-surface-900">{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-surface-200 rounded-2xl p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <CircleDot className="w-5 h-5 text-surface-400" />
            <h3 className="text-lg font-display font-bold text-surface-900">Pigmentation Types</h3>
          </div>
          {totalTypes > 0 ? (
            <div className="space-y-4">
              <div className="w-full h-3 bg-surface-100 rounded-full overflow-hidden flex">
                {Object.entries(typeDist).map(([type, count]) => (
                  <div
                    key={type}
                    className={`h-full ${typeColors[type] || 'bg-surface-300'} transition-all duration-500`}
                    style={{ width: `${((count as number) / totalTypes) * 100}%` }}
                    title={`${type}: ${count}`}
                  />
                ))}
              </div>
              <div className="space-y-2">
                {Object.entries(typeDist).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2.5">
                    <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${typeColors[type] || 'bg-surface-300'}`} />
                    <span className="text-sm text-surface-600 flex-1 capitalize">{type.replace('_', ' ')}</span>
                    <span className="text-sm font-medium text-surface-900">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-surface-400">No spots detected</p>
          )}
        </div>
      </div>

      {/* Daily Routine */}
      {result.routine && (
        <div className="bg-white border border-surface-200 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-surface-100">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-surface-400" />
              <h3 className="text-lg font-display font-bold text-surface-900">Daily Routine</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-warning-50 rounded-xl flex items-center justify-center">
                    <Sun className="w-4 h-4 text-warning-500" />
                  </div>
                  <span className="text-sm font-semibold text-surface-900">Morning</span>
                </div>
                <div className="space-y-0">
                  {result.routine.morning.map((step, idx, arr) => (
                    <div key={step.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 bg-surface-900 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 z-10">
                          {step.step}
                        </div>
                        {idx < arr.length - 1 && <div className="w-px flex-1 bg-surface-200 my-1" />}
                      </div>
                      <div className="flex-1 pb-5">
                        <h4 className="font-semibold text-surface-900 text-sm">{step.product}</h4>
                        <p className="text-xs text-surface-400 mt-0.5">{step.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-primary-50 rounded-xl flex items-center justify-center">
                    <Moon className="w-4 h-4 text-primary-500" />
                  </div>
                  <span className="text-sm font-semibold text-surface-900">Evening</span>
                </div>
                <div className="space-y-0">
                  {result.routine.evening.map((step, idx, arr) => (
                    <div key={step.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 bg-surface-900 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 z-10">
                          {step.step}
                        </div>
                        {idx < arr.length - 1 && <div className="w-px flex-1 bg-surface-200 my-1" />}
                      </div>
                      <div className="flex-1 pb-5">
                        <h4 className="font-semibold text-surface-900 text-sm">{step.product}</h4>
                        <p className="text-xs text-surface-400 mt-0.5">{step.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {result.routine.tips.length > 0 && (
              <div className="mt-6 p-5 bg-surface-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-surface-500" />
                  <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Tips</span>
                </div>
                <ul className="space-y-2">
                  {result.routine.tips.map((tip, idx) => (
                    <li key={idx} className="text-xs text-surface-600 flex items-start gap-2">
                      <span className="text-surface-300 mt-0.5">&#8226;</span>
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
          <Sparkles className="w-5 h-5 text-surface-400" />
          <h3 className="text-lg font-display font-bold text-surface-900">Recommendations</h3>
        </div>
        <div className="space-y-4">
          {result.recommendations?.map((rec) => (
            <div key={rec.id} className="bg-white border border-surface-200 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-premium-sm">
              {/* Recommendation info */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getPriorityDot(rec.priority)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-surface-900 text-sm">{rec.title}</h4>
                      {rec.category === 'skincare' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-accent-50 text-accent-600 rounded">Shop</span>
                      )}
                    </div>
                    <p className="text-xs text-surface-400 leading-relaxed mt-0.5">{rec.description}</p>
                    {rec.why && (
                      <p className="text-xs text-surface-500 font-medium mt-1">{rec.why}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Daraz products */}
              {rec.products && rec.products.length > 0 && (
                <div className="border-t border-surface-100 bg-surface-50/50 px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ShoppingBag className="w-3 h-3 text-surface-400" />
                    <span className="text-[10px] font-medium text-surface-400 uppercase tracking-wider">Available on Daraz</span>
                  </div>
                  <div className="space-y-2">
                    {rec.products.map((product, idx) => (
                      <a
                        key={idx}
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2.5 bg-white border border-surface-200 rounded-xl hover:border-accent-300 hover:shadow-sm transition-all group"
                      >
                        <div className="w-12 h-12 rounded-lg bg-surface-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {product.image ? (
                            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag className="w-5 h-5 text-surface-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-surface-800 line-clamp-2 group-hover:text-accent-600 transition-colors">
                            {product.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold text-surface-900">{product.price_show}</span>
                            {product.discount && (
                              <span className="text-[10px] font-medium text-success-600 bg-success-50 px-1.5 py-0.5 rounded">
                                {product.discount}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {product.rating > 0 && (
                              <div className="flex items-center gap-0.5">
                                <Star className="w-3 h-3 fill-warning-400 text-warning-400" />
                                <span className="text-[10px] text-surface-500">{product.rating}</span>
                              </div>
                            )}
                            {product.reviews > 0 && (
                              <span className="text-[10px] text-surface-400">({product.reviews})</span>
                            )}
                            {product.sold && (
                              <span className="text-[10px] text-surface-400">{product.sold}</span>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-surface-300 group-hover:text-accent-500 flex-shrink-0 transition-colors" />
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
          className="w-full bg-surface-900 text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-surface-800 transition-colors"
        >
          <Download className="w-4 h-4" /> Save Report
        </button>
      </div>
    </div>
  );
}
