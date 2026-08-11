import { useState, useEffect } from 'react';
import {
  Download, ArrowLeft, AlertTriangle, ImageOff, Star, ShoppingBag, Heart,
  FileText, Sun, Moon
} from 'lucide-react';
import { AnalysisResponse, getResultImageUrl, getScanHistory, getScanDetail, saveProduct, removeSavedProduct, getSavedProducts } from '../services/api';
import { getStoredUser } from '../services/auth';
import { generateClinicalReportPDF } from '../utils/generatePDF';

interface ReportViewProps {
  result: AnalysisResponse | null;
  onBack: () => void;
  onScanNow?: () => void;
}

function MetricCard({
  label, value, score, maxLabel, color, barWidth,
}: {
  label: string; value: string; score: number | string;
  maxLabel: string; color: 'danger' | 'warning' | 'success'; barWidth: number;
}) {
  const textColor = color === 'danger' ? 'text-red-700' : color === 'warning' ? 'text-amber-700' : 'text-gray-900';
  const barColor = color === 'danger' ? 'bg-red-500' : color === 'warning' ? 'bg-amber-500' : 'bg-[#880d1e]';

  return (
    <div className="bg-white border border-gray-200 p-5 flex flex-col gap-3 transition-shadow hover:shadow-sm">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl font-light text-gray-900 tracking-tight">{score}</span>
        <span className="text-xs text-gray-400 font-medium">{maxLabel}</span>
      </div>
      <div className="w-full h-1 bg-gray-100">
        <div className={`h-full ${barColor} transition-all duration-1000`} style={{ width: `${barWidth}%` }} />
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
  const [savedProductUrls, setSavedProductUrls] = useState<Set<string>>(new Set());

  useEffect(() => {
    getSavedProducts().then(res => {
      setSavedProductUrls(new Set(res.products.map(p => p.url)));
    }).catch(console.error);
  }, []);

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
        <div className="w-8 h-8 border-2 border-gray-200 border-t-[#880d1e] rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-gray-500 font-medium tracking-wide">Retrieving analysis...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FileText className="w-12 h-12 text-gray-300 mb-6" />
        <h3 className="text-xl font-light text-gray-900 mb-2 tracking-tight">No Analysis Found</h3>
        <p className="text-sm text-gray-500 max-w-sm mb-8">
          Perform a skin scan to view your detailed clinical report and recommendations.
        </p>
        {onScanNow && (
          <button
            onClick={onScanNow}
            className="px-6 py-2.5 bg-[#880d1e] hover:bg-[#6a0a17] text-white text-sm font-medium transition-colors"
          >
            Start Scan
          </button>
        )}
      </div>
    );
  }

  const clarity = result.pigmentation_data?.clarity_score ?? 100;
  const hydration = result.dryness_data?.hydration_score ?? 100;
  const roughness = result.dryness_data?.roughness_score ?? 0;

  let fallbackScore = 100;
  fallbackScore -= Math.min(30, (result.acne_count || 0) * 2);
  fallbackScore -= Math.max(0, 100 - clarity) * 0.3;
  fallbackScore -= Math.max(0, 100 - hydration) * 0.2;
  fallbackScore -= Math.min(20, roughness * 2);
  const calculatedFallback = Math.max(0, Math.round(fallbackScore));
  const overallScore = result.health_score ?? calculatedFallback;

  const metrics = [
    {
      label: 'Acne Severity', value: result.severity, score: result.acne_count,
      maxLabel: 'lesions', color: result.severity === 'Severe' ? 'danger' as const : result.severity === 'Moderate' ? 'warning' as const : 'success' as const,
      barWidth: Math.min(100, (result.acne_count / 20) * 100),
    },
    {
      label: 'Pigmentation', value: result.pigmentation_data?.intensity || 'Low', score: clarity,
      maxLabel: '/ 100 clarity', color: clarity < 85 ? 'warning' as const : 'success' as const,
      barWidth: clarity,
    },
    {
      label: 'Hydration Level', value: hydration < 60 ? 'Suboptimal' : 'Optimal', score: hydration,
      maxLabel: '/ 100', color: hydration < 60 ? 'danger' as const : 'success' as const,
      barWidth: hydration,
    },
    {
      label: 'Skin Texture', value: roughness > 5 ? 'Elevated Roughness' : 'Smooth', score: roughness,
      maxLabel: 'index', color: roughness > 5 ? 'warning' as const : 'success' as const,
      barWidth: Math.min(100, roughness * 10),
    },
  ];

  const findings = [
    { label: 'Sebaceous activity', value: result.acne_count > 5 ? 'Elevated' : 'Normal', status: result.acne_count > 5 ? 'danger' : 'good' },
    { label: 'Melanin clarity', value: `${clarity}%`, status: clarity < 70 ? 'danger' : clarity < 85 ? 'warning' : 'good' },
    { label: 'Surface hydration', value: `${hydration}%`, status: hydration < 60 ? 'danger' : 'good' },
    { label: 'Texture variation', value: roughness > 5 ? 'Irregular' : 'Smooth', status: roughness > 5 ? 'warning' : 'good' },
    { label: 'Pigment pattern', value: result.pigmentation_data?.spatial_pattern || 'N/A', status: 'good' },
  ];

  const tabs = [
    { id: 'acne' as const, label: 'Acne Map', img: getResultImageUrl(result.result_image) },
    { id: 'pigment' as const, label: 'Pigmentation', img: result.pigmentation_data?.heatmap_image ? getResultImageUrl(result.pigmentation_data.heatmap_image) : null },
    { id: 'moisture' as const, label: 'Texture', img: result.dryness_data?.texture_map_image ? getResultImageUrl(result.dryness_data.texture_map_image) : null },
  ];

  const handleDownloadPDF = async () => {
    try {
      setPdfError(null);
      const user = getStoredUser();
      await generateClinicalReportPDF(result, { name: user?.name, email: user?.email });
    } catch (err) {
      console.error('PDF generation failed:', err);
      setPdfError('Report generation failed. Please try again.');
      setTimeout(() => setPdfError(null), 5000);
    }
  };

  const toggleSaveProduct = async (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isSaved = savedProductUrls.has(product.url);
    try {
      if (isSaved) {
        await removeSavedProduct(product.url);
        setSavedProductUrls(prev => {
          const next = new Set(prev);
          next.delete(product.url);
          return next;
        });
      } else {
        await saveProduct({
          name: product.name,
          price_show: product.price_show,
          url: product.url,
          discount: product.discount || null,
          image: product.image || null,
          rating: product.rating || 0,
          reviews: product.reviews || 0,
          sold: product.sold || null,
        });
        setSavedProductUrls(prev => new Set(prev).add(product.url));
      }
    } catch (err) {
      console.error('Failed to toggle save product', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 font-sans text-gray-800">
      {/* Premium Header */}
      <div className="border-b border-gray-200 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 pt-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-[#880d1e] transition-colors mb-4 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium tracking-wide">Return</span>
          </button>
          <h1 className="text-3xl font-light text-gray-900 tracking-tight">Clinical Analysis Report</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span className="font-mono tracking-wider text-xs">
              ID: {result.result_image.split('_')[1]?.substring(0, 8).toUpperCase() || result.id?.split('-')[0].toUpperCase()}
            </span>
            <span>&bull;</span>
            <span>{new Date(result.created_at || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="bg-[#880d1e] text-white px-5 py-2.5 text-sm font-medium hover:bg-[#6a0a17] transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>

      {result.conflicts && result.conflicts.length > 0 && (
        <div className="mb-8 border-l-2 border-amber-500 bg-amber-50 p-4">
          {result.conflicts.map((conflict: any, idx: number) => (
            <div key={idx} className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{conflict.message}</p>
            </div>
          ))}
        </div>
      )}

      {pdfError && (
        <div className="mb-8 border-l-2 border-red-500 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{pdfError}</p>
        </div>
      )}

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        <div className="lg:col-span-4 bg-white border border-gray-200 p-8 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-6">Overall Skin Health</span>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-7xl font-light text-gray-900 tracking-tighter">{overallScore}</span>
            <span className="text-xl text-gray-400">/ 100</span>
          </div>
          <div className="h-px w-16 bg-gray-200 mb-6" />
          <p className="text-sm text-gray-600 leading-relaxed">
            {overallScore >= 70 ? 'Healthy skin profile detected. Focus on maintenance.' : overallScore >= 40 ? 'Moderate attention required. See targeted recommendations.' : 'Professional consultation advised for treatment.'}
          </p>
        </div>

        <div className="lg:col-span-8 bg-white border border-gray-200 flex flex-col">
          <div className="flex gap-4 border-b border-gray-200 px-6 pt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-medium tracking-wide transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-[#880d1e]'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#880d1e]" />
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 bg-gray-50 relative overflow-hidden min-h-[400px]">
            {tabs.find(t => t.id === activeTab)?.img && !imageErrors[activeTab] ? (
              <img
                src={tabs.find(t => t.id === activeTab)!.img!}
                alt={tabs.find(t => t.id === activeTab)!.label}
                className="w-full h-full object-contain"
                onError={() => setImageErrors(prev => ({ ...prev, [activeTab]: true }))}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-3">
                <ImageOff className="w-10 h-10" />
                <span className="text-sm">Scan image unavailable</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Clinical Findings & Routine */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Findings */}
        <div className="bg-white border border-gray-200 p-8">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-widest mb-6">Diagnostic Findings</h3>
          <div className="space-y-4">
            {findings.map((f, idx) => (
              <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{f.label}</span>
                <span className={`text-sm font-medium ${f.status === 'danger' ? 'text-red-600' : f.status === 'warning' ? 'text-amber-600' : 'text-gray-900'}`}>
                  {f.value}
                </span>
              </div>
            ))}
            {result.pigmentation_data?.type_distribution && Object.keys(result.pigmentation_data.type_distribution).length > 0 && (
              <div className="pt-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-3">Detected Conditions</span>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.pigmentation_data.type_distribution).map(([type, count]) => (
                    <span key={type} className="px-3 py-1 bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700 capitalize">
                      {type.replace('_', ' ')} ({(count as number)})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Routine */}
        {result.routine && (
          <div className="bg-white border border-gray-200 p-8">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-widest mb-6">Prescribed Routine</h3>
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-2 mb-4 text-[#880d1e]">
                  <Sun className="w-4 h-4" />
                  <span className="text-sm font-semibold tracking-wide">AM Regimen</span>
                </div>
                <div className="space-y-3">
                  {result.routine.morning.map((step: any, idx: number) => (
                    <div key={idx} className="flex gap-4">
                      <div className="w-6 text-xs font-semibold text-gray-400 pt-0.5">{step.step}.</div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{step.product}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="h-px w-full bg-gray-100" />
              
              <div>
                <div className="flex items-center gap-2 mb-4 text-[#880d1e]">
                  <Moon className="w-4 h-4" />
                  <span className="text-sm font-semibold tracking-wide">PM Regimen</span>
                </div>
                <div className="space-y-3">
                  {result.routine.evening.map((step: any, idx: number) => (
                    <div key={idx} className="flex gap-4">
                      <div className="w-6 text-xs font-semibold text-gray-400 pt-0.5">{step.step}.</div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{step.product}</h4>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Recommendations */}
      {result.recommendations && result.recommendations.length > 0 && (
        <div className="space-y-8">
          <h3 className="text-2xl font-light text-gray-900 tracking-tight border-b border-gray-200 pb-4">Targeted Interventions</h3>
          
          <div className="space-y-12">
            {result.recommendations.map((rec: any) => (
              <div key={rec.id} className="bg-white border border-gray-200">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-medium text-gray-900">{rec.title}</h4>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] uppercase tracking-wider font-semibold">
                      {rec.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                  {rec.why && <p className="text-sm text-gray-500 italic">"{rec.why}"</p>}
                </div>

                {rec.products && rec.products.length > 0 && (
                  <div className="p-6 bg-gray-50">
                    <div className="flex items-center gap-2 mb-6 text-[#880d1e]">
                      <ShoppingBag className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase tracking-widest">Recommended Products</span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {rec.products.map((product: any, idx: number) => (
                        <a
                          key={idx}
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex flex-col bg-white border border-gray-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                        >
                          <div className="relative aspect-square bg-white border-b border-gray-100 overflow-hidden p-4 flex items-center justify-center">
                            {product.image ? (
                              <img src={product.image} alt={product.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-700" />
                            ) : (
                              <ShoppingBag className="w-12 h-12 text-gray-200" />
                            )}
                            
                            <button
                              onClick={(e) => toggleSaveProduct(e, product)}
                              className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur border border-gray-100 rounded-full shadow-sm hover:scale-110 transition-transform"
                            >
                              <Heart className={`w-4 h-4 ${savedProductUrls.has(product.url) ? 'fill-[#880d1e] text-[#880d1e]' : 'text-gray-400'}`} />
                            </button>
                            
                            {product.discount && (
                              <div className="absolute top-3 left-3 bg-[#880d1e] text-white text-[10px] font-bold px-2.5 py-1 uppercase tracking-widest shadow-sm">
                                {product.discount} OFF
                              </div>
                            )}
                          </div>
                          
                          <div className="p-5 flex flex-col flex-1">
                            <h5 className="text-sm font-medium text-gray-900 line-clamp-2 leading-relaxed mb-4 group-hover:text-[#880d1e] transition-colors">
                              {product.name}
                            </h5>
                            
                            <div className="mt-auto pt-4 border-t border-gray-100 flex items-end justify-between">
                              <span className="text-xl font-light text-gray-900 tracking-tight">
                                {product.price_show}
                              </span>
                              
                              <div className="flex flex-col items-end gap-1.5">
                                {product.rating > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    <span className="text-xs font-semibold text-gray-700">{product.rating}</span>
                                  </div>
                                )}
                                {product.sold && (
                                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                                    {product.sold}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
