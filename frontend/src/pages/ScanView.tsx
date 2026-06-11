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
    const canvas = document.createElement('canvas'); // Offscreen sampling
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const analyzeFrame = () => {
      if (!ctx || video.paused || video.ended) {
        animationFrame = requestAnimationFrame(analyzeFrame);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frame.data;
      
      let totalLuminance = 0;
      let totalContrast = 0;
      
      // Sample pixels for performance (step 4 for speed)
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        
        // Perceptual Luminance
        const lum = (0.299 * r + 0.587 * g + 0.114 * b);
        totalLuminance += lum;

        // Simple contrast check (difference from neighbors)
        if (i > 0) {
          totalContrast += Math.abs(lum - (0.299 * data[i-16] + 0.587 * data[i-15] + 0.114 * data[i-14]));
        }
      }

      const pixelCount = data.length / 16;
      const avgLum = (totalLuminance / pixelCount) / 255 * 100;
      const avgContrast = (totalContrast / pixelCount) / 100 * 100;

      setVisionMetrics({
        lighting: Math.min(100, avgLum * 1.5), 
        focus: Math.min(100, avgContrast * 4),
        alignment: avgLum > 20 && avgContrast > 15 ? 95 : 10
      });

      animationFrame = requestAnimationFrame(analyzeFrame);
    };

    analyzeFrame();
    return () => cancelAnimationFrame(animationFrame);
  }, [isAnalyzing, isActive, videoRef]);

  const handleCapture = async () => {
    try {
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
                  <div className={`w-64 h-80 border-2 transition-all duration-500 rounded-[48px] flex items-center justify-center
                    ${visionMetrics.alignment > 80 ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/20'}
                  `}>
                    {/* Status Hint Overlaid on Image */}
                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-72">
                      <div className="bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl text-center">
                        <p className="text-white text-sm font-bold tracking-tight leading-tight">
                          {visionMetrics.alignment < 80 ? "Position face in center" : 
                           visionMetrics.lighting < 50 ? "Increase ambient light" :
                           "Optimal capture ready"}
                        </p>
                      </div>
                    </div>

                    {/* AI Target State */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${visionMetrics.alignment > 80 ? 'bg-emerald-500' : 'bg-white/40'}`}></div>
                      <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">
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
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
                    <button 
                      onClick={handleCapture}
                      className="group relative w-20 h-20 bg-white rounded-full p-1.5 shadow-2xl transition-transform active:scale-90"
                    >
                      <div className="w-full h-full border-4 border-[#0F172A] rounded-full flex items-center justify-center">
                        <div className="w-12 h-12 bg-[#0F172A] rounded-full transition-all group-hover:scale-110"></div>
                      </div>
                      <span className="absolute -top-12 left-1/2 -translate-x-1/2 text-white font-bold text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Capture</span>
                    </button>
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
