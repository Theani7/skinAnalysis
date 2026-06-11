import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Brain,
  Activity,
  SwitchCamera,
  X,
  ImageIcon,
} from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { analyzeImage } from '../services/api';
import { AnalysisResult, SeverityLevel, RiskLevel } from '../types';

interface AnalyzePageProps {
  onBack: () => void;
  onResult: (result: AnalysisResult, imageUrl: string) => void;
}

type InputMode = 'select' | 'camera' | 'preview';

const analysisSteps = [
  { id: 1, label: 'Uploading image', icon: Upload },
  { id: 2, label: 'Running AI detection', icon: Brain },
  { id: 3, label: 'Processing results', icon: Activity },
];

export function AnalyzePage({ onBack, onResult }: AnalyzePageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inputMode, setInputMode] = useState<InputMode>('select');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      setStream(mediaStream);
      setInputMode('camera');
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to access camera');
    }
  }, [facingMode, stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) return;

    if (facingMode === 'user') {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(video, 0, 0);
    context.setTransform(1, 0, 0, 1, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(blob));
          stopCamera();
          setInputMode('preview');
        }
      },
      'image/jpeg',
      0.9
    );
  }, [facingMode, stopCamera]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setInputMode('preview');
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const stepPromise = (async () => {
        for (let i = 0; i < analysisSteps.length; i++) {
          setCurrentStep(i);
          await new Promise((resolve) => setTimeout(resolve, 800 + i * 400));
        }
      })();

      const [_, analysisResult] = await Promise.all([
        stepPromise,
        analyzeImage(selectedFile),
      ]);

      const severityMap: Record<string, SeverityLevel> = {
        'clear': 'clear',
        'mild': 'mild',
        'moderate': 'moderate',
        'severe': 'severe'
      };

      const riskMap: Record<string, RiskLevel> = {
        'clear': 'low',
        'mild': 'low',
        'moderate': 'medium',
        'severe': 'high'
      };

      const rawSeverity = analysisResult.severity.toLowerCase();

      onResult({
        id: Date.now().toString(),
        imageUrl: previewUrl || '',
        severity: (severityMap[rawSeverity] || 'mild') as SeverityLevel,
        severityScore: analysisResult.confidence * 100,
        confidence: analysisResult.confidence * 100,
        acneType: 'mixed',
        affectedAreas: [],
        recommendations: analysisResult.recommendations || [],
        riskLevel: (riskMap[rawSeverity] || 'low') as RiskLevel,
        timestamp: new Date().toISOString(),
        acneCount: analysisResult.acne_count,
        resultImage: analysisResult.result_image,
        pigmentationData: analysisResult.pigmentation_data ? {
          clarityScore: analysisResult.pigmentation_data.clarity_score,
          spotsCount: analysisResult.pigmentation_data.spots_count,
          heatmapImage: analysisResult.pigmentation_data.heatmap_image,
          typeDistribution: {
            localized: analysisResult.pigmentation_data.type_distribution.localized,
            diffuse: analysisResult.pigmentation_data.type_distribution.diffuse,
          }
        } : undefined,
        drynessData: analysisResult.dryness_data ? {
          hydrationScore: analysisResult.dryness_data.hydration_score,
          roughnessScore: analysisResult.dryness_data.roughness_score,
          flakesCount: analysisResult.dryness_data.flakes_count,
          textureMapImage: analysisResult.dryness_data.texture_map_image,
        } : undefined,
      }, previewUrl || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
      setCurrentStep(0);
    }
  }, [selectedFile, previewUrl, onResult]);

  const handleReset = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    stopCamera();
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setCurrentStep(0);
    setInputMode('select');
  }, [previewUrl, stopCamera]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="flex flex-col">
      <Navbar showBack onBack={handleReset} title="Detection" />
      
      <div className="w-full pb-8">
        <div className="w-full">
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="pt-6">
            {inputMode === 'select' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="text-center mb-8 pt-4">
                  <h1 className="text-3xl font-bold text-gray-50 mb-1">Acne Detection</h1>
                  <p className="text-base text-gray-400">Choose an input method</p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Card variant="interactive" padding="lg" onClick={startCamera}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <Camera className="w-[22px] h-[22px] text-emerald-500" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-50 mb-0.5">Take Photo</h3>
                        <p className="text-[13px] text-gray-400">Capture with your camera</p>
                      </div>
                    </div>
                  </Card>
                  
                  <Card variant="interactive" padding="lg" onClick={() => fileInputRef.current?.click()}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-[22px] h-[22px] text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-50 mb-0.5">Upload Image</h3>
                        <p className="text-[13px] text-gray-400">JPG, PNG up to 10MB</p>
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </Card>
                  
                  {error && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-500 flex-1">{error}</p>
                      <button
                        onClick={() => setError(null)}
                        className="text-gray-400 bg-none border-none cursor-pointer p-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {inputMode === 'camera' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="rounded-2xl overflow-hidden bg-black aspect-square relative max-w-[480px] mx-auto">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${
                      facingMode === 'user' ? 'scale-x-[-1]' : ''
                    }`}
                  />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-5 left-5 w-10 h-10 border-l-2 border-t-2 border-white/20" />
                    <div className="absolute top-5 right-5 w-10 h-10 border-r-2 border-t-2 border-white/20" />
                    <div className="absolute bottom-5 left-5 w-10 h-10 border-l-2 border-b-2 border-white/20" />
                    <div className="absolute bottom-5 right-5 w-10 h-10 border-r-2 border-b-2 border-white/20" />
                  </div>
                  {!stream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2">
                      <Camera className="w-9 h-9 opacity-40" />
                      <p className="text-sm opacity-60">Initializing camera</p>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center items-center gap-8 mt-6">
                  <button
                    onClick={() => {
                      stopCamera();
                      setInputMode('select');
                    }}
                    className="w-11 h-11 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={capturePhoto}
                    disabled={!stream}
                    className={`w-[72px] h-[72px] rounded-full bg-emerald-600 flex items-center justify-center border-none cursor-pointer shadow-[0_0_30px_rgba(5,150,105,0.3)] transition-opacity ${
                      stream ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full border-[2.5px] border-white" />
                  </button>
                  <button
                    onClick={() => {
                      stopCamera();
                      setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
                    }}
                    className="w-11 h-11 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 cursor-pointer"
                  >
                    <SwitchCamera className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {inputMode === 'preview' && previewUrl && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="rounded-2xl overflow-hidden bg-gray-900 aspect-square max-w-[480px] mx-auto">
                  <img src={previewUrl} alt="Selected" className="w-full h-full object-cover" />
                </div>
                
                <div className="flex gap-3 mt-4 max-w-[480px] mx-auto">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      handleReset();
                      startCamera();
                    }}
                    icon={<RotateCcw className="w-4 h-4" />}
                  >
                    Retake
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAnalyze}
                    isLoading={isAnalyzing}
                    icon={<Brain className="w-4 h-4" />}
                  >
                    Analyze
                  </Button>
                </div>
                
                {error && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25 mt-4">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-500 flex-1">{error}</p>
                    <button
                      onClick={() => setError(null)}
                      className="text-gray-400 bg-none border-none cursor-pointer p-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            <AnimatePresence>
              {isAnalyzing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Card padding="lg" className="mt-4">
                    <div className="text-center mb-6">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-emerald-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-50 mb-0.5">Analyzing</h3>
                      <p className="text-[13px] text-gray-400">AI is processing your image</p>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      {analysisSteps.map((step, i) => (
                        <div key={step.id} className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                              i < currentStep
                                ? 'bg-emerald-500 text-white'
                                : i === currentStep
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-800 text-gray-500'
                            }`}
                          >
                            {i < currentStep ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <step.icon className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <span
                            className={`text-sm transition-colors ${
                              i <= currentStep ? 'text-emerald-500 font-semibold' : 'text-gray-500'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
