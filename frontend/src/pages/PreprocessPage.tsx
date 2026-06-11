import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, RotateCcw, CheckCircle2, AlertCircle, Loader2, ImageIcon, X } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { processImage, getOriginalImageUrl, getProcessedImageUrl } from '../services/api';

interface PreprocessPageProps {
  onBack: () => void;
}

const pipelineSteps = ['CLAHE Enhancement', 'Noise Reduction', 'Resize to 224x224', 'Normalize Pixels'];

export function PreprocessPage({ onBack }: PreprocessPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedResult, setProcessedResult] = useState<{
    originalFilename: string;
    processedFilename: string;
    originalUrl: string;
    processedUrl: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);

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
    setProcessedResult(null);
    setError(null);
    setCurrentStep(-1);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const stepPromise = (async () => {
        for (let i = 0; i < pipelineSteps.length; i++) {
          setCurrentStep(i);
          await new Promise((resolve) => setTimeout(resolve, 500 + i * 300));
        }
      })();

      const [_, result] = await Promise.all([stepPromise, processImage(selectedFile)]);
      
      setProcessedResult({
        originalFilename: result.original_image,
        processedFilename: result.processed_image,
        originalUrl: getOriginalImageUrl(result.original_image),
        processedUrl: getProcessedImageUrl(result.processed_image),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setIsProcessing(false);
      setCurrentStep(-1);
    }
  }, [selectedFile]);

  const handleReset = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setProcessedResult(null);
    setError(null);
    setCurrentStep(-1);
  }, [previewUrl]);

  return (
    <div className="flex flex-col">
      <Navbar showBack onBack={onBack} title="Preprocess" />
      
      <div className="w-full pb-8">
        <div className="w-full">
          <div className="pt-6">
            {!previewUrl && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="text-center mb-8 pt-4">
                  <h1 className="text-3xl font-bold text-gray-50 mb-1">Preprocess</h1>
                  <p className="text-base text-gray-400">Enhance and normalize images for AI analysis</p>
                </div>
                
                <Card padding="lg">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-700 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-500/50 transition-colors"
                  >
                    <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-900 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-50 mb-0.5">Upload Image</p>
                    <p className="text-xs text-gray-400">JPG, PNG up to 10MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </Card>
              </motion.div>
            )}

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

            {previewUrl && !processedResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card padding="md">
                  <div className="rounded-xl overflow-hidden bg-gray-900 aspect-square">
                    <img src={previewUrl} alt="Original" className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="mt-3 flex gap-3">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={handleReset}
                      icon={<RotateCcw className="w-4 h-4" />}
                    >
                      Reset
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleProcess}
                      isLoading={isProcessing}
                      icon={<Upload className="w-4 h-4" />}
                    >
                      Process
                    </Button>
                  </div>
                </Card>
                
                {isProcessing && (
                  <Card padding="lg" className="mt-3">
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Pipeline
                    </p>
                    <div className="flex flex-col gap-3">
                      {pipelineSteps.map((step, i) => (
                        <div key={step} className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                              i < currentStep
                                ? 'bg-emerald-500 text-white'
                                : i === currentStep
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-800 text-gray-500'
                            }`}
                          >
                            {i < currentStep ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : i === currentStep ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <span className="text-[10px] font-mono font-bold">{i + 1}</span>
                            )}
                          </div>
                          <span
                            className={`text-[13px] transition-colors ${
                              i <= currentStep ? 'text-emerald-500 font-semibold' : 'text-gray-500'
                            }`}
                          >
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </motion.div>
            )}

            {processedResult && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card padding="md">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold text-gray-50">Processing Complete</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">Original</p>
                      <div className="aspect-square rounded-xl overflow-hidden bg-gray-900 border border-gray-700">
                        <img
                          src={processedResult.originalUrl}
                          alt="Original"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">Processed</p>
                      <div className="aspect-square rounded-xl overflow-hidden bg-gray-900 border border-emerald-500/25">
                        <img
                          src={processedResult.processedUrl}
                          alt="Processed"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-gray-800">
                      <span className="text-gray-400">Size</span>
                      <span className="font-medium text-gray-50">224 x 224</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-800">
                      <span className="text-gray-400">Normalized</span>
                      <span className="font-medium text-emerald-500">Yes</span>
                    </div>
                  </div>
                  
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={handleReset}
                    icon={<RotateCcw className="w-4 h-4" />}
                    className="mt-4"
                  >
                    Process Another
                  </Button>
                </Card>
              </motion.div>
            )}

            {!previewUrl && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-4"
              >
                <Card padding="md">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Pipeline Steps
                  </p>
                  <div className="flex flex-col gap-2">
                    {pipelineSteps.map((step) => (
                      <div key={step} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-emerald-600" />
                        <span className="text-xs text-gray-400">{step}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

