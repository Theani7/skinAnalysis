import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCcw, Upload, Eye, Focus, Sun } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { analyzeImage, validateFile, AnalysisResponse } from '../services/api';

export default function ScanView({ onComplete }: { onComplete: (result: AnalysisResponse) => void }) {
  const { videoRef, canvasRef, isActive, error: cameraError, startCamera, stopCamera, capturePhoto } = useCamera();
  const { isModelLoaded, modelError, detection, faceMetrics, startDetection, stopDetection } = useFaceDetection();
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelsReady, setModelsReady] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      stopDetection();
    };
  }, [startCamera, stopCamera, stopDetection]);

  useEffect(() => {
    if (isModelLoaded) {
      setModelsReady(true);
    }
  }, [isModelLoaded]);

  useEffect(() => {
    if (isActive && videoRef.current && modelsReady) {
      startDetection(videoRef.current);
    }
  }, [isActive, modelsReady, startDetection, videoRef]);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    const container = videoContainerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;

    const drawOverlay = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detection) {
        const { box } = detection;
        const scaleX = canvas.width / (videoRef.current?.videoWidth || 1);
        const scaleY = canvas.height / (videoRef.current?.videoHeight || 1);

        const mirroredX = canvas.width - (box.x + box.width) * scaleX;
        const drawX = mirroredX;
        const drawY = box.y * scaleY;
        const drawW = box.width * scaleX;
        const drawH = box.height * scaleY;

        const radius = 12;
        ctx.beginPath();
        ctx.moveTo(drawX + radius, drawY);
        ctx.lineTo(drawX + drawW - radius, drawY);
        ctx.quadraticCurveTo(drawX + drawW, drawY, drawX + drawW, drawY + radius);
        ctx.lineTo(drawX + drawW, drawY + drawH - radius);
        ctx.quadraticCurveTo(drawX + drawW, drawY + drawH, drawX + drawW - radius, drawY + drawH);
        ctx.lineTo(drawX + radius, drawY + drawH);
        ctx.quadraticCurveTo(drawX, drawY + drawH, drawX, drawY + drawH - radius);
        ctx.lineTo(drawX, drawY + radius);
        ctx.quadraticCurveTo(drawX, drawY, drawX + radius, drawY);
        ctx.closePath();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animFrame = requestAnimationFrame(drawOverlay);
    };

    animFrame = requestAnimationFrame(drawOverlay);
    return () => cancelAnimationFrame(animFrame);
  }, [detection, faceMetrics, videoRef]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';

    try {
      setError(null);
      setIsAnalyzing(true);

      validateFile(file);

      const result = await analyzeImage(file);

      if (result.status === 'success') {
        onComplete(result);
      } else {
        throw new Error('Analysis returned an error. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during analysis.');
      setIsAnalyzing(false);
    }
  };

  const handleCapture = async () => {
    try {
      if (faceMetrics.overall < 50) {
        setError('Position your face properly before capturing. Ensure good lighting and center your face in the frame.');
        return;
      }

      setError(null);
      const blob = await capturePhoto();

      if (!blob) {
        throw new Error('Camera capture failed. Please check camera permissions and try again.');
      }

      if (blob.size === 0) {
        throw new Error('Captured image is empty. Please try again.');
      }

      setIsAnalyzing(true);
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });

      const result = await analyzeImage(file);

      if (result.status === 'success') {
        onComplete(result);
      } else {
        throw new Error('Analysis returned an error. Please try again with better lighting.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during analysis.');
      setIsAnalyzing(false);
    }
  };

  const getStatusMessage = () => {
    if (!modelsReady) return 'Loading face detection model...';
    if (faceMetrics.overall < 30) return 'No face detected — center your face';
    if (faceMetrics.centeredness < 40) return 'Move face to center of frame';
    if (faceMetrics.size < 30) return 'Move closer to the camera';
    if (faceMetrics.size > 90) return 'Move further from the camera';
    if (faceMetrics.angle < 50) return 'Keep your head level';
    return 'Ready to capture';
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start gap-3">
        <div>
          <h2 className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-1">Scan</h2>
          <h1 className="text-3xl font-display font-bold tracking-tight text-surface-950">New Analysis</h1>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
            aria-label="Upload image file"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="bg-white border border-surface-200 px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 hover:bg-surface-50 transition-colors text-sm"
            aria-label="Upload image for analysis"
          >
            <Upload className="w-4 h-4 text-surface-500" />
            Upload Image
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center">
        <div
          ref={videoContainerRef}
          className="w-full max-w-4xl aspect-[4/3] bg-surface-950 rounded-2xl border border-surface-200 relative overflow-hidden flex flex-col items-center justify-center"
          role="img"
          aria-label="Camera view for face capture"
        >
          {cameraError || error || modelError ? (
            <div className="p-12 text-center space-y-5 text-white">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                modelError && !cameraError && !error ? 'bg-surface-800' : 'bg-surface-800'
              }`}>
                <AlertCircle className="w-8 h-8 text-surface-400" />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold mb-2">
                  {modelError && !cameraError && !error ? 'Model Unavailable' : 'Camera Error'}
                </h3>
                <p className="text-surface-400 max-w-xs mx-auto text-sm">{cameraError || error || modelError}</p>
              </div>
              <button
                onClick={() => { setError(null); startCamera(); }}
                className="inline-flex items-center gap-2 text-surface-300 font-medium hover:text-white text-sm transition-colors"
                aria-label="Retry camera connection"
              >
                <RefreshCcw className="w-4 h-4" /> Retry
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                aria-hidden="true"
              />

              {/* Status Badge */}
              {isActive && !isAnalyzing && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-surface-900/80 backdrop-blur-sm px-5 py-2.5 rounded-xl text-center">
                    <p className="text-white text-xs font-medium">
                      {getStatusMessage()}
                    </p>
                  </div>
                </div>
              )}

              {/* Analyzing Overlay */}
              <div className="z-20 w-full h-full flex flex-col items-center justify-center">
                {isAnalyzing ? (
                  <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-4 shadow-lg">
                    <Loader2 className="w-12 h-12 text-surface-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-surface-900 font-display font-bold text-sm">Analyzing</p>
                      <p className="text-surface-400 text-xs mt-1">Processing your image...</p>
                    </div>
                  </div>
                ) : !isActive ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-white/30 animate-spin" />
                    <p className="text-white/50 font-medium text-xs">Starting camera...</p>
                  </div>
                ) : (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
                    <button
                      onClick={handleCapture}
                      disabled={faceMetrics.overall < 50}
                      className="group relative w-18 h-18 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={faceMetrics.overall > 70 ? 'Capture photo' : 'Align face first'}
                    >
                      <div className={`absolute inset-0 border-2 rounded-full transition-opacity ${
                        faceMetrics.overall > 70 ? 'border-white/60' : 'border-white/30'
                      }`}></div>
                      <div className={`w-14 h-14 rounded-full border-[5px] transition-all ${
                        faceMetrics.overall > 70 ? 'bg-white border-white/80' :
                        faceMetrics.overall > 40 ? 'bg-white/80 border-white/50' : 'bg-white/40 border-white/30'
                      }`}></div>
                    </button>
                    <span className="text-white/50 text-xs font-medium">
                      {faceMetrics.overall > 70 ? 'Tap to capture' : 'Align face'}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Face Metrics */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-2 z-20 max-w-[95vw]">
            {[
              { icon: Eye, label: 'Center', value: faceMetrics.centeredness },
              { icon: Focus, label: 'Size', value: faceMetrics.size },
              { icon: Sun, label: 'Angle', value: faceMetrics.angle },
            ].map((m) => (
              <div key={m.label} className="bg-surface-900/70 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <m.icon className="w-3 h-3 text-surface-400" />
                <span className="text-xs text-surface-400 hidden sm:inline">{m.label}:</span>
                <span className={`text-xs font-medium ${
                  m.value > 70 ? 'text-white' :
                  m.value > 40 ? 'text-surface-300' : 'text-surface-500'
                }`}>
                  {m.value}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-5 text-sm text-surface-500 text-center max-w-md px-4">
          Position your face within the frame. The system will validate image quality before analysis.
        </p>
      </div>
    </div>
  );
}
