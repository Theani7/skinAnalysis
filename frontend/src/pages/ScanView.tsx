import { useState, useEffect, useRef } from 'react';
import { Loader2, Sparkles, AlertCircle, RefreshCcw, Upload } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { analyzeImage, AnalysisResponse } from '../services/api';

export default function ScanView({ onComplete }: { onComplete: (result: AnalysisResponse) => void }) {
  const { videoRef, canvasRef, isActive, error: cameraError, startCamera, stopCamera, capturePhoto } = useCamera();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [visionMetrics, setVisionMetrics] = useState({ lighting: 0, alignment: 0, focus: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setIsAnalyzing(true);
      console.log('Uploading file for analysis:', file.name);
      const result = await analyzeImage(file);
      
      if (result.status === 'success') {
        onComplete(result);
      } else {
        throw new Error('Neural analysis failed on uploaded image.');
      }
    } catch (err) {
      console.error('File analysis error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during file analysis');
      setIsAnalyzing(false);
    }
  };

  // Real-time Clinical Vision Engine
  useEffect(() => {
    if (isAnalyzing || !isActive || !videoRef.current || !canvasRef.current) return;

    let animationFrame: number;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 100; // Small for performance
    canvas.height = 100;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let smoothedMetrics = { lighting: 0, alignment: 0, focus: 0 };

    const analyzeFrame = () => {
      if (!ctx || video.paused || video.ended) {
        animationFrame = requestAnimationFrame(analyzeFrame);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frame.data;
      
      let totalLum = 0;
      let centerLum = 0;
      let variance = 0;
      
      const centerStart = 30; // 30% to 70% is center
      const centerEnd = 70;

      for (let y = 0; y < canvas.height; y += 2) {
        for (let x = 0; x < canvas.width; x += 2) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          
          totalLum += lum;
          
          // Center Weighting
          if (x > centerStart && x < centerEnd && y > centerStart && y < centerEnd) {
            centerLum += lum;
          }

          // Laplacian Variance (Sharpness detection)
          // Simple check against previous pixel
          if (x > 0) {
            const prevLum = 0.299 * data[i-4] + 0.587 * data[i-3] + 0.114 * data[i-2];
            variance += Math.pow(lum - prevLum, 2);
          }
        }
      }

      const pixelCount = (canvas.width * canvas.height) / 4;
      const centerPixelCount = (40 * 40) / 4;
      
      const avgLum = (totalLum / pixelCount) / 255 * 100;
      const avgCenterLum = (centerLum / centerPixelCount) / 255 * 100;
      const sharpness = Math.sqrt(variance / pixelCount) * 2; // Normalized sharpness

      // Exponential smoothing for stable UI
      smoothedMetrics = {
        lighting: smoothedMetrics.lighting * 0.8 + avgLum * 0.2,
        focus: smoothedMetrics.focus * 0.8 + Math.min(100, sharpness * 5) * 0.2,
        alignment: smoothedMetrics.alignment * 0.8 + (avgCenterLum > 35 && avgCenterLum < 85 && sharpness > 8 ? 95 : 10) * 0.2
      };

      setVisionMetrics({
        lighting: smoothedMetrics.lighting,
        focus: smoothedMetrics.focus,
        alignment: smoothedMetrics.alignment
      });

      animationFrame = requestAnimationFrame(analyzeFrame);
    };

    analyzeFrame();
    return () => cancelAnimationFrame(animationFrame);
  }, [isAnalyzing, isActive, videoRef]);

  const handleCapture = async () => {
    try {
      if (visionMetrics.alignment < 50) {
        setError('Please align your face correctly before capturing.');
        return;
      }
      console.log('Starting capture process...');
      setError(null);
      const blob = await capturePhoto();
      
      if (!blob) {
        console.error('No blob returned from capturePhoto');
        throw new Error('Camera capture failed. Please check camera permissions.');
      }

      console.log('Capture successful, preparing for analysis...');
      setIsAnalyzing(true);
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      
      console.log('Sending to AI engine...');
      const result = await analyzeImage(file);
      
      console.log('Analysis response received:', result.status);
      if (result.status === 'success') {
        onComplete(result);
      } else {
        console.error('AI Analysis returned error status');
        throw new Error('Neural analysis failed. Please try again with better lighting.');
      }
    } catch (err) {
      console.error('Analysis flow error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em] mb-2">Clinical Diagnostic Terminal</h2>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">AI Scan</h1>
        </div>
        <div className="flex gap-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="px-6 py-3 bg-white border border-[#E2E8F0] text-[#0F172A] rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Upload Image
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center">
        {/* Main Camera Container */}
        <div className="w-full max-w-4xl aspect-[4/3] bg-black rounded-[40px] border-8 border-white relative overflow-hidden shadow-2xl flex flex-col items-center justify-center">
          {cameraError || error ? (
            <div className="p-12 text-center space-y-6 text-white">
              <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-rose-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Hardware Error</h3>
                <p className="text-gray-400 max-w-xs mx-auto">{cameraError || error}</p>
              </div>
              <button onClick={() => { setError(null); startCamera(); }} className="inline-flex items-center gap-2 text-white font-bold hover:underline">
                <RefreshCcw className="w-4 h-4" /> Retry Connection
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

              {/* Minimalist Clinical Interface Overlay */}
              {isActive && !isAnalyzing && (
                <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center">
                  {/* Framing Brackets */}
                  <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-white/40 rounded-tl-xl"></div>
                  <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-white/40 rounded-tr-xl"></div>
                  <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-white/40 rounded-bl-xl"></div>
                  <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-white/40 rounded-br-xl"></div>

                  {/* Central Reticle */}
                  <div className={`w-64 h-80 border-[1px] transition-all duration-700 rounded-[60px] flex items-center justify-center
                    ${visionMetrics.alignment > 80 ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/10'}
                  `}>
                    {/* Status Hint Overlaid on Image - Moved Up to avoid shutter */}
                    <div className="absolute -bottom-2 w-72">
                      <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl text-center shadow-2xl">
                        <p className="text-white text-xs font-bold tracking-tight leading-tight">
                          {visionMetrics.alignment < 50 ? "Center face in frame" : 
                           visionMetrics.focus < 30 ? "Hold steady for focus" :
                           visionMetrics.lighting < 30 ? "Increase ambient light" :
                           "Optimal Capture State"}
                        </p>
                      </div>
                    </div>

                    {/* AI Target State */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${visionMetrics.alignment > 80 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-white/20'}`}></div>
                      <span className="text-[9px] font-black text-white uppercase tracking-[0.3em] opacity-60">
                        {visionMetrics.alignment > 80 ? 'Ready' : 'Analyzing'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Interaction Controls */}
              <div className="z-20 w-full h-full flex flex-col items-center justify-center">
                {isAnalyzing ? (
                  <div className="bg-white/95 backdrop-blur-md p-12 rounded-[40px] shadow-2xl flex flex-col items-center gap-6">
                    <Loader2 className="w-16 h-16 text-[#1E3A8A] animate-spin" />
                    <p className="text-[#1E3A8A] font-black uppercase tracking-widest text-sm">Processing Neural Data...</p>
                  </div>
                ) : !isActive ? (
                  <div className="flex flex-col items-center gap-6">
                    <Loader2 className="w-12 h-12 text-white/20 animate-spin" />
                    <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Initializing Optics...</p>
                  </div>
                ) : (
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
                    {/* High-End Leica Style Shutter */}
                    <button 
                      onClick={handleCapture}
                      className="group relative w-20 h-20 flex items-center justify-center transition-transform active:scale-95"
                    >
                      <div className="absolute inset-0 border-2 border-white rounded-full opacity-40 group-hover:opacity-100 transition-opacity"></div>
                      <div className="w-[68px] h-[68px] bg-white rounded-full border-[6px] border-transparent transition-all group-hover:scale-90 group-active:bg-gray-200"></div>
                    </button>
                    <span className="text-white/40 text-[9px] font-black uppercase tracking-[0.3em]">Capture Frame</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Clinical Info Bar */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex gap-8 z-20">
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Lux:</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${visionMetrics.lighting > 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {visionMetrics.lighting.toFixed(0)}%
                </span>
             </div>
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Focus:</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${visionMetrics.focus > 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {visionMetrics.focus.toFixed(0)}%
                </span>
             </div>
          </div>
        </div>
        
        <p className="mt-8 text-sm text-[#64748B] font-medium text-center max-w-md">
          Diagnostic capture uses multi-spectral neural processing to detect pathology. Ensure natural daylight for best accuracy.
        </p>
      </div>
    </div>
  );
}
