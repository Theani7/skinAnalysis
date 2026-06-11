import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Share2, AlertTriangle, CheckCircle2, LayoutGrid, Sparkles, Droplets } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressRing } from '../components/ui/ProgressRing';
import { AnalysisResult } from '../types';
import { getResultImageUrl } from '../services/api';
import { formatDate } from '../utils/helpers';

interface ResultsPageProps {
  result: AnalysisResult;
  imageUrl: string;
  onBack: () => void;
  onNewAnalysis: () => void;
}

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

export function ResultsPage({ result, imageUrl, onBack, onNewAnalysis }: ResultsPageProps) {
  const [activeTab, setActiveTab] = useState<'acne' | 'pigment' | 'moisture'>('acne');
  const [showHeatmap, setShowHeatmap] = useState(false);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'clear':
      case 'mild':
        return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', ring: '#10b981' };
      case 'moderate':
        return { color: 'text-amber-500', bg: 'bg-amber-500/10', ring: '#f59e0b' };
      case 'severe':
        return { color: 'text-red-500', bg: 'bg-red-500/10', ring: '#ef4444' };
      default:
        return { color: 'text-gray-400', bg: 'bg-gray-400/10', ring: '#9ca3af' };
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'clear':
        return 'Clear Skin';
      case 'mild':
        return 'Mild Acne';
      case 'moderate':
        return 'Moderate Acne';
      case 'severe':
        return 'Severe Acne';
      default:
        return severity.charAt(0).toUpperCase() + severity.slice(1);
    }
  };

  const riskColor = result.riskLevel === 'low' ? '#10b981' : result.riskLevel === 'medium' ? '#f59e0b' : '#ef4444';
  const severityStyle = getSeverityStyle(result.severity);

  return (
    <div className="flex flex-col">
      <Navbar showBack onBack={onBack} title="Results" />
      
      <div className="w-full pb-8 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="pt-6 flex flex-col gap-6"
          >
            {/* Tab Switcher */}
            <motion.div variants={fadeUp} className="flex flex-col gap-4">
              <div className="flex bg-gray-900/50 p-1 rounded-2xl border border-gray-800">
                <button
                  onClick={() => {
                    setActiveTab('acne');
                    setShowHeatmap(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                    activeTab === 'acne' ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-sm font-semibold">Acne Analysis</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('pigment');
                    if (result.pigmentationData?.heatmapImage) setShowHeatmap(true);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                    activeTab === 'pigment' ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-semibold">Pigmentation</span>
                  </button>
                  <button
                  onClick={() => {
                    setActiveTab('moisture');
                    if (result.drynessData?.textureMapImage) setShowHeatmap(true);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                    activeTab === 'moisture' ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-400 hover:text-gray-200'
                  }`}
                  >
                  <Droplets className="w-4 h-4" />
                  <span className="text-sm font-semibold">Moisture</span>
                  </button>
                  </div>
              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 uppercase tracking-widest font-bold">
                <LayoutGrid className="w-3 h-3" />
                <span>Analysis Date: {formatDate(result.timestamp)}</span>
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {activeTab === 'acne' ? (
                <motion.div
                  key="acne-tab"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col gap-6"
                >
                  <div className="text-center">
                    <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold ${severityStyle.bg} ${severityStyle.color}`}>
                      {result.severity === 'severe' ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>{getSeverityLabel(result.severity)}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Card padding="md">
                      <div className="text-center">
                        <ProgressRing
                          value={result.confidence || 0}
                          size={52}
                          strokeWidth={4}
                          color={riskColor}
                          showValue={false}
                        />
                        <p className="text-base font-bold text-gray-50 mt-2">
                          {(result.confidence || 0).toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-400">Confidence</p>
                      </div>
                    </Card>

                    <Card padding="md">
                      <div className="text-center">
                        <div className="w-[52px] h-[52px] mx-auto rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center">
                          <span className="text-2xl font-bold text-gray-50">
                            {result.acneCount || 0}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Spots</p>
                      </div>
                    </Card>

                    <Card padding="md">
                      <div className="text-center">
                        <div
                          className="w-[52px] h-[52px] mx-auto rounded-full border-2 flex items-center justify-center"
                          style={{ borderColor: riskColor }}
                        >
                          <span
                            className="text-sm font-bold capitalize"
                            style={{ color: riskColor }}
                          >
                            {result.riskLevel}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Risk</p>
                      </div>
                    </Card>
                  </div>
                </motion.div>
              ) : activeTab === 'pigment' ? (
                <motion.div
                  key="pigment-tab"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-6"
                >
                  <div className="text-center">
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-indigo-500/10 text-indigo-400">
                      <Sparkles className="w-4 h-4" />
                      <span>Clarity Analysis</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Card padding="md">
                      <div className="text-center">
                        <ProgressRing
                          value={result.pigmentationData?.clarityScore || 0}
                          size={52}
                          strokeWidth={4}
                          color="#818cf8"
                          showValue={false}
                        />
                        <p className="text-base font-bold text-gray-50 mt-2">
                          {(result.pigmentationData?.clarityScore || 0).toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-400">Clarity</p>
                      </div>
                    </Card>

                    <Card padding="md">
                      <div className="text-center">
                        <div className="w-[52px] h-[52px] mx-auto rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center">
                          <span className="text-2xl font-bold text-gray-50">
                            {result.pigmentationData?.spotsCount || 0}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Pigment Spots</p>
                      </div>
                    </Card>

                    <Card padding="md">
                      <div className="text-center">
                        <div className="w-[52px] h-[52px] mx-auto rounded-full border-2 border-indigo-500/30 flex items-center justify-center">
                          <span className="text-sm font-bold text-indigo-400">Uniform</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Tone</p>
                      </div>
                    </Card>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="moisture-tab"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col gap-6"
                >
                  <div className="text-center">
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-emerald-500/10 text-emerald-400">
                      <Droplets className="w-4 h-4" />
                      <span>Moisture & Texture</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Card padding="md">
                      <div className="text-center">
                        <ProgressRing
                          value={result.drynessData?.hydrationScore || 0}
                          size={52}
                          strokeWidth={4}
                          color="#10b981"
                          showValue={false}
                        />
                        <p className="text-base font-bold text-gray-50 mt-2">
                          {(result.drynessData?.hydrationScore || 0).toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-400">Hydration</p>
                      </div>
                    </Card>

                    <Card padding="md">
                      <div className="text-center">
                        <div className="w-[52px] h-[52px] mx-auto rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center">
                          <span className="text-2xl font-bold text-gray-50">
                            {result.drynessData?.roughnessScore || 0}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Roughness</p>
                      </div>
                    </Card>

                    <Card padding="md">
                      <div className="text-center">
                        <div className="w-[52px] h-[52px] mx-auto rounded-full border-2 border-emerald-500/30 flex items-center justify-center">
                          <span className="text-sm font-bold text-emerald-400">
                            {result.drynessData?.flakesCount || 0}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Flaky Patches</p>
                      </div>
                    </Card>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div variants={fadeUp} className="w-full relative group">
              <Card padding="none" className="rounded-2xl overflow-hidden border-gray-800 relative">
                <div className="aspect-[4/3] bg-gray-900 relative">
                  <AnimatePresence mode="wait">
                    {showHeatmap && activeTab === 'pigment' && result.pigmentationData?.heatmapImage ? (
                      <motion.img
                        key="heatmap-pigment"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        src={getResultImageUrl(result.pigmentationData.heatmapImage)}
                        alt="Pigmentation Heatmap"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : showHeatmap && activeTab === 'moisture' && result.drynessData?.textureMapImage ? (
                      <motion.img
                        key="heatmap-texture"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        src={getResultImageUrl(result.drynessData.textureMapImage)}
                        alt="Texture Heatmap"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <motion.img
                        key="acne"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        src={result.resultImage ? getResultImageUrl(result.resultImage) : imageUrl}
                        alt="Skin Analysis"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}
                  </AnimatePresence>

                  {(result.pigmentationData?.heatmapImage || result.drynessData?.textureMapImage) && (
                    <button
                      onClick={() => setShowHeatmap(!showHeatmap)}
                      className={`absolute bottom-4 right-4 px-4 py-2.5 rounded-full backdrop-blur-md border transition-all duration-300 shadow-xl flex items-center gap-2 z-10 ${
                        showHeatmap 
                          ? 'bg-indigo-500/90 border-indigo-400 text-white' 
                          : 'bg-gray-900/80 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-900/95'
                      }`}
                    >
                      <Sparkles className={`w-4 h-4 ${showHeatmap ? 'animate-pulse' : ''}`} />
                      <span className="text-xs font-bold">
                        {showHeatmap ? 'Heatmap On' : 'View Heatmap'}
                      </span>
                    </button>
                  )}
                </div>
              </Card>
            </motion.div>

            {result.recommendations && result.recommendations.length > 0 && (
              <motion.div variants={fadeUp} className="flex flex-col gap-6">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-50">Personalized Routine</h3>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Categorized Sections */}
                  {(['medical', 'skincare', 'lifestyle'] as const).map((cat) => {
                    const catRecs = result.recommendations.filter(r => r.category === cat);
                    if (catRecs.length === 0) return null;
                    
                    const catLabel = cat === 'medical' ? 'Professional Advice' : cat === 'skincare' ? 'Daily Essentials' : 'Lifestyle Habits';
                    
                    return (
                      <div key={cat} className="space-y-3">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] px-2">
                          {catLabel}
                        </p>
                        <div className="flex flex-col gap-2">
                          {catRecs.map((rec) => (
                            <Card key={rec.id} padding="md" className="border-white/5 bg-gray-900/40">
                              <div className="flex items-start gap-4">
                                <div
                                  className={`w-1 min-h-[40px] rounded-full flex-shrink-0 ${
                                    rec.priority === 'high'
                                      ? 'bg-red-500'
                                      : rec.priority === 'medium'
                                      ? 'bg-amber-500'
                                      : 'bg-indigo-500'
                                  }`}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <p className="text-sm font-bold text-gray-100">{rec.title}</p>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                                      rec.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                                      rec.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                                      'bg-indigo-500/10 text-indigo-400'
                                    }`}>
                                      {rec.priority}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-400 leading-relaxed">{rec.description}</p>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            <motion.div variants={fadeUp} className="flex flex-col gap-3">
              <Button fullWidth onClick={onNewAnalysis} icon={<ArrowLeft className="w-4 h-4" />}>
                New Analysis
              </Button>
              <Button
                fullWidth
                variant="secondary"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'SkinAI Results',
                      text: `Skin Analysis Results: ${activeTab === 'acne' ? result.severity : 'Clarity ' + (result.pigmentationData?.clarityScore || 0) + '%' }`,
                    });
                  }
                }}
                icon={<Share2 className="w-4 h-4" />}
              >
                Share Results
              </Button>
            </motion.div>

            <motion.p variants={fadeUp} className="text-xs text-gray-500 text-center">
              For informational purposes only. Consult a dermatologist for professional diagnosis.
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

