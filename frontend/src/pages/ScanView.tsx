import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCcw, Upload, Eye, Focus, Sun, Scan } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { useFaceDetection } from '../hooks/useFaceDetection';
import { analyzeImage, AnalysisResponse } from '../services/api';

export default function ScanView({ onComplete }: { onComplete: (result: AnalysisResponse) => void }) {
  const { videoRef, canvasRef, isActive, error: cameraError, startCamera, stopCamera, capturePhoto } = useCamera();
  const { isModelLoaded, detection, faceMetrics, startDetection, stopDetection } = useFaceDetection();
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

        ctx.beginPath();
        ctx.ellipse(drawX + drawW / 2, drawY + drawH / 2, drawW / 2, drawH / 2, 0, 0, 2 * Math.PI);

        const overallScore = faceMetrics.overall;
        if (overallScore > 70) {
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
          ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
        } else if (overallScore > 40) {
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.8)';
          ctx.fillStyle = 'rgba(234, 179, 8, 0.1)';
        } else {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.fillStyle = 'rgba(239, 68, 68, 0.1)';
        }

        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        const bracketSize = 20;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(drawX, drawY + bracketSize);
        ctx.lineTo(drawX, drawY);
        ctx.lineTo(drawX + bracketSize, drawY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(drawX + drawW - bracketSize, drawY);
        ctx.lineTo(drawX + drawW, drawY);
        ctx.lineTo(drawX + drawW, drawY + bracketSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(drawX, drawY + drawH - bracketSize);
        ctx.lineTo(drawX, drawY + drawH);
        ctx.lineTo(drawX + bracketSize, drawY + drawH);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(drawX + drawW - bracketSize, drawY + drawH);
        ctx.lineTo(drawX + drawW, drawY + drawH);
        ctx.lineTo(drawX + drawW, drawY + drawH - bracketSize);
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

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      const allowedExts = ['jpg', 'jpeg', 'png'];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
        throw new Error('Invalid file type. Please upload a JPG or PNG image.');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`);
      }
      if (file.size === 0) {
        throw new Error('File is empty. Please select a valid image.');
      }

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
    if (!modelsReady) return 'Loading AI models...';
    if (faceMetrics.overall < 30) return 'No face detected — center your face';
    if (faceMetrics.centeredness < 40) return 'Move face to center of frame';
    if (faceMetrics.size < 30) return 'Move closer to the camera';
    if (faceMetrics.size > 90) return 'Move further from the camera';
    if (faceMetrics.angle < 50) return 'Keep your head level';
    return 'Optimal capture state';
  };

  return (
    <div className="h-full flex flex-col space-y-4 md:space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start gap-3">
        <div>
          <h2 className="text-xs font-bold text-primary-600 uppercase tracking-[0.2em] mb-2">Clinical Diagnostic Terminal</h2>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-surface-900">AI Scan</h1>
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
            className="px-4 md:px-6 py-2.5 md:py-3 bg-white border border-surface-200 text-surface-900 rounded-2xl font-bold text-sm hover:bg-surface-50 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
            aria-label="Upload image for analysis"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            Upload Image
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center">
        <div
          ref={videoContainerRef}
          className="w-full max-w-4xl aspect-[4/3] bg-black rounded-3xl md:rounded-[40px] border-4 md:border-8 border-white relative overflow-hidden shadow-2xl flex flex-col items-center justify-center"
          role="img"
          aria-label="Camera view for face capture"
        >
          {cameraError || error ? (
            <div className="p-6 md:p-12 text-center space-y-4 md:space-y-6 text-white">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-danger-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-danger-500" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-bold mb-2">Camera Error</h3>
                <p className="text-surface-400 max-w-xs mx-auto text-sm">{cameraError || error}</p>
              </div>
              <button
                onClick={() => { setError(null); startCamera(); }}
                className="inline-flex items-center gap-2 text-white font-bold hover:underline text-sm"
                aria-label="Retry camera connection"
              >
                <RefreshCcw className="w-4 h-4" aria-hidden="true" /> Retry Connection
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                aria-hidden="true"
              />

              {isActive && !isAnalyzing && (
                <div className="absolute bottom-16 md:bottom-20 left-1/2 -translate-x-1/2 z-20">
                  <div className="bg-black/60 backdrop-blur-xl border border-white/10 px-4 md:px-6 py-2.5 md:py-3 rounded-2xl text-center shadow-2xl">
                    <p className="text-white text-xs font-bold tracking-tight leading-tight">
                      {getStatusMessage()}
                    </p>
                  </div>
                </div>
              )}

              <div className="z-20 w-full h-full flex flex-col items-center justify-center">
                {isAnalyzing ? (
                  <div className="bg-white/95 backdrop-blur-md p-8 md:p-12 rounded-3xl md:rounded-[40px] shadow-2xl flex flex-col items-center gap-4 md:gap-6">
                    <Loader2 className="w-12 h-12 md:w-16 md:h-16 text-primary-600 animate-spin" />
                    <p className="text-primary-600 font-black uppercase tracking-widest text-xs md:text-sm">Processing Neural Data...</p>
                  </div>
                ) : !isActive ? (
                  <div className="flex flex-col items-center gap-4 md:gap-6">
                    <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-white/20 animate-spin" />
                    <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Initializing Optics...</p>
                  </div>
                ) : (
                  <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 md:gap-4">
                    <button
                      onClick={handleCapture}
                      disabled={faceMetrics.overall < 50}
                      className="group relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label={faceMetrics.overall > 70 ? 'Capture photo' : 'Align face first'}
                    >
                      <div className={`absolute inset-0 border-2 rounded-full opacity-40 group-hover:opacity-100 transition-opacity ${
                        faceMetrics.overall > 70 ? 'border-emerald-400' :
                        faceMetrics.overall > 40 ? 'border-amber-400' : 'border-white'
                      }`}></div>
                      <div className={`w-14 h-14 md:w-[68px] md:h-[68px] rounded-full border-[5px] md:border-[6px] transition-all group-hover:scale-90 group-active:bg-surface-200 ${
                        faceMetrics.overall > 70 ? 'bg-emerald-400 border-emerald-300' :
                        faceMetrics.overall > 40 ? 'bg-amber-400 border-amber-300' : 'bg-white border-transparent'
                      }`}></div>
                    </button>
                    <span className="text-white/50 text-2xs md:text-[9px] font-black uppercase tracking-[0.3em]">
                      {faceMetrics.overall > 70 ? 'Ready to Capture' : 'Align Face First'}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Clinical Info Bar */}
          <div className="absolute top-4 md:top-6 left-1/2 -translate-x-1/2 flex gap-3 md:gap-6 z-20">
             <div className="flex items-center gap-1.5 md:gap-2 bg-black/30 backdrop-blur-sm px-2 md:px-3 py-1 md:py-1.5 rounded-full">
                <Eye className="w-3 h-3 text-white/60" aria-hidden="true" />
                <span className="text-2xs md:text-[10px] font-bold text-white/60 uppercase tracking-widest hidden sm:inline">Center:</span>
                <span className={`text-2xs md:text-[10px] font-bold uppercase tracking-widest ${
                  faceMetrics.centeredness > 70 ? 'text-emerald-400' :
                  faceMetrics.centeredness > 40 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {faceMetrics.centeredness}%
                </span>
             </div>
             <div className="flex items-center gap-1.5 md:gap-2 bg-black/30 backdrop-blur-sm px-2 md:px-3 py-1 md:py-1.5 rounded-full">
                <Focus className="w-3 h-3 text-white/60" aria-hidden="true" />
                <span className="text-2xs md:text-[10px] font-bold text-white/60 uppercase tracking-widest hidden sm:inline">Size:</span>
                <span className={`text-2xs md:text-[10px] font-bold uppercase tracking-widest ${
                  faceMetrics.size > 70 ? 'text-emerald-400' :
                  faceMetrics.size > 40 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {faceMetrics.size}%
                </span>
             </div>
             <div className="flex items-center gap-1.5 md:gap-2 bg-black/30 backdrop-blur-sm px-2 md:px-3 py-1 md:py-1.5 rounded-full">
                <Sun className="w-3 h-3 text-white/60" aria-hidden="true" />
                <span className="text-2xs md:text-[10px] font-bold text-white/60 uppercase tracking-widest hidden sm:inline">Angle:</span>
                <span className={`text-2xs md:text-[10px] font-bold uppercase tracking-widest ${
                  faceMetrics.angle > 70 ? 'text-emerald-400' :
                  faceMetrics.angle > 40 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {faceMetrics.angle}%
                </span>
             </div>
             <div className="flex items-center gap-1.5 md:gap-2 bg-black/30 backdrop-blur-sm px-2 md:px-3 py-1 md:py-1.5 rounded-full">
                <Scan className="w-3 h-3 text-white/60" aria-hidden="true" />
                <span className={`text-2xs md:text-[10px] font-bold uppercase tracking-widest ${
                  faceMetrics.overall > 70 ? 'text-emerald-400' :
                  faceMetrics.overall > 40 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {faceMetrics.overall}%
                </span>
             </div>
          </div>
        </div>

        <p className="mt-4 md:mt-6 text-xs md:text-sm text-surface-500 font-medium text-center max-w-md px-4">
          AI face detection ensures optimal image quality. Position your face in the frame with good lighting for best results.
        </p>
      </div>
    </div>
  );
}
