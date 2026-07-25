import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCcw, Upload, Eye, Focus, Sun, Smartphone } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { analyzeImage, validateFile, AnalysisResponse } from '../services/api';

export default function ScanView({ onComplete, onStartRemoteScan }: { onComplete: (result: AnalysisResponse) => void, onStartRemoteScan?: () => void }) {
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

        ctx.strokeStyle = 'rgba(45, 212, 191, 0.85)';
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
          <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Scan</h2>
          <h1 className="text-3xl font-display font-bold tracking-tight text-white">New Analysis</h1>
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
            className="bg-surface-900 border border-white/10 text-gray-300 px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 hover:border-teal-500 hover:bg-surface-800 transition-colors text-sm"
            aria-label="Upload image for analysis"
          >
            <Upload className="w-4 h-4 text-gray-400" />
            Upload Image
          </button>
          {onStartRemoteScan && (
            <button
              onClick={onStartRemoteScan}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 hover:from-teal-400 hover:to-cyan-400 transition-all text-sm shadow-[0_0_15px_rgba(20,184,166,0.3)] hover:shadow-[0_0_20px_rgba(20,184,166,0.6)]"
              aria-label="Scan using mobile phone"
            >
              <Smartphone className="w-4 h-4 text-white/90" />
              Use Phone
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center">
        <div
          ref={videoContainerRef}
          className="w-full max-w-4xl aspect-[4/3] bg-surface-900/50 backdrop-blur-md rounded-2xl border border-white/10 relative overflow-hidden flex flex-col items-center justify-center transition-colors hover:border-teal-500/50 hover:shadow-[0_0_30px_rgba(20,184,166,0.1)]"
          role="img"
          aria-label="Camera view for face capture"
        >
          {cameraError || error || modelError ? (
            <div className="bg-surface-900/80 backdrop-blur-md rounded-xl p-12 text-center space-y-5 text-white border border-white/5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto bg-surface-800 border border-white/10">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold mb-2">
                  {modelError && !cameraError && !error ? 'Model Unavailable' : 'Camera Error'}
                </h3>
                <p className="text-gray-400 max-w-xs mx-auto text-sm">{cameraError || error || modelError}</p>
              </div>
              <button
                onClick={() => { setError(null); startCamera(); }}
                className="inline-flex items-center gap-2 text-teal-400 font-medium hover:text-teal-300 text-sm transition-colors"
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
                  <div className="bg-surface-900/80 backdrop-blur-md border border-teal-500/30 px-5 py-2.5 rounded-xl text-center shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                    <p className="text-teal-400 text-xs font-medium tracking-wide">
                      {getStatusMessage()}
                    </p>
                  </div>
                </div>
              )}

              {/* Analyzing Overlay */}
              <div className="z-20 w-full h-full flex flex-col items-center justify-center">
                {isAnalyzing ? (
                  <div className="bg-surface-900/90 backdrop-blur-md rounded-2xl p-10 flex flex-col items-center gap-4 shadow-[0_0_30px_rgba(20,184,166,0.2)] border border-teal-500/30">
                    <Loader2 className="w-12 h-12 text-teal-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-white font-display font-bold text-sm">Analyzing</p>
                      <p className="text-gray-400 text-xs mt-1">Processing your image...</p>
                    </div>
                  </div>
                ) : !isActive ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-teal-500/50 animate-spin" />
                    <p className="text-teal-500/50 font-medium text-xs">Starting camera...</p>
                  </div>
                ) : (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3">
                    <button
                      onClick={handleCapture}
                      disabled={faceMetrics.overall < 50}
                      className="group relative w-18 h-18 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={faceMetrics.overall > 70 ? 'Capture photo' : 'Align face first'}
                    >
                      <div className={`absolute inset-0 border-2 rounded-full transition-all duration-300 ${
                        faceMetrics.overall > 70 ? 'border-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.5)]' : 'border-white/30'
                      }`}></div>
                      <div className={`w-14 h-14 rounded-full border-[5px] transition-all duration-300 ${
                        faceMetrics.overall > 70 ? 'bg-gradient-to-tr from-teal-400 to-cyan-400 border-teal-200 shadow-[0_0_20px_rgba(45,212,191,0.6)] animate-pulse' :
                        faceMetrics.overall > 40 ? 'bg-white/60 border-white/40' : 'bg-white/20 border-white/20'
                      }`}></div>
                    </button>
                    <span className="text-gray-400 text-xs font-medium">
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
               <div key={m.label} className="bg-surface-900/70 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                 <m.icon className="w-3 h-3 text-teal-500/70" />
                 <span className="text-xs text-gray-400 hidden sm:inline">{m.label}:</span>
                 <span className={`text-xs font-medium ${
                   m.value > 70 ? 'text-teal-400' :
                   m.value > 40 ? 'text-teal-400/70' : 'text-gray-500'
                 }`}>
                   {m.value}%
                 </span>
               </div>
            ))}
          </div>
        </div>

        <p className="mt-5 text-sm text-gray-400 text-center max-w-md px-4">
          Position your face within the frame. The system will validate image quality before analysis.
        </p>
      </div>
    </div>
  );
}
