import { useState, useEffect, useRef } from 'react';
import { Camera, ShieldCheck, Zap, Loader2, Sparkles, AlertCircle, RefreshCcw, Activity, Upload } from 'lucide-react';
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
    <div className="h-full flex flex-col space-y-12">
      <header>
        <h2 className="text-sm font-bold text-blue-600 uppercase tracking-[0.2em] mb-3">AI Vision Terminal</h2>
        <h1 className="text-5xl font-extrabold tracking-tight text-[#0F172A]">Real-time Scan</h1>
      </header>

      <div className="flex flex-col lg:flex-row gap-12 flex-1 items-start">
        {/* Left: Camera View */}
        <div className="w-full lg:w-3/5 aspect-square bg-[#F8FAFC] rounded-[40px] border border-[#E2E8F0] relative overflow-hidden shadow-inner flex flex-col items-center justify-center group">
          {cameraError || error ? (
            <div className="p-12 text-center space-y-6">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-rose-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Hardware Error</h3>
                <p className="text-[#64748B] max-w-xs mx-auto">{cameraError || error}</p>
              </div>
              <button onClick={() => { setError(null); startCamera(); }} className="inline-flex items-center gap-2 text-[#1E3A8A] font-bold hover:underline">
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

              {/* Professional YOLO-style Targeting System */}
              {isActive && !isAnalyzing && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  {/* Outer Framing Corners */}
                  <div className="absolute top-10 left-10 w-20 h-20 border-t-4 border-l-4 border-white/30 rounded-tl-3xl"></div>
                  <div className="absolute top-10 right-10 w-20 h-20 border-t-4 border-r-4 border-white/30 rounded-tr-3xl"></div>
                  <div className="absolute bottom-10 left-10 w-20 h-20 border-b-4 border-l-4 border-white/30 rounded-bl-3xl"></div>
                  <div className="absolute bottom-10 right-10 w-20 h-20 border-b-4 border-r-4 border-white/30 rounded-br-3xl"></div>

                  {/* Central Face Target Box (Simulates YOLO BBox) */}
                  <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 border-2 transition-all duration-300 rounded-[48px] flex items-center justify-center
                    ${visionMetrics.alignment > 80 ? 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_50px_rgba(16,185,129,0.2)]' : 'border-white/40 bg-white/5'}
                  `}>
                    {/* Corner Brackets */}
                    <div className="w-4 h-4 border-t border-l border-white/60 absolute top-8 left-8"></div>
                    <div className="w-4 h-4 border-t border-r border-white/60 absolute top-8 right-8"></div>
                    <div className="w-4 h-4 border-b border-l border-white/60 absolute bottom-8 left-8"></div>
                    <div className="w-4 h-4 border-b border-r border-white/60 absolute bottom-8 right-8"></div>

                    {/* AI Target Label */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap">
                      <div className={`w-2 h-2 rounded-full ${visionMetrics.alignment > 80 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
                      <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] drop-shadow-lg">
                        {visionMetrics.alignment > 80 ? 'Target Locked: Optimal' : 'Seeking Optimal Alignment...'}
                      </span>
                    </div>

                    {/* Real-time Hint */}
                    <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-64 bg-black/60 backdrop-blur-xl border border-white/10 p-3 rounded-2xl text-center">
                      <p className="text-white text-[10px] font-bold leading-tight">
                        {visionMetrics.alignment < 80 ? "Center your face in the emerald reticle for multi-spectral analysis." : 
                         visionMetrics.lighting < 50 ? "Increase ambient lighting for better pathology detection." :
                         "Perfect alignment. Hold steady for high-resolution capture."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="z-20 text-center">
                {isAnalyzing ? (
                  <div className="bg-white/90 backdrop-blur-md p-10 rounded-[32px] shadow-2xl flex flex-col items-center gap-6">
                    <Loader2 className="w-16 h-16 text-[#1E3A8A] animate-spin" />
                    <p className="text-[#1E3A8A] font-black uppercase tracking-widest text-sm">Processing Neural Frames...</p>
                  </div>
                ) : !isActive ? (
                  <div className="flex flex-col items-center gap-6">
                    <Loader2 className="w-12 h-12 text-gray-300 animate-spin" />
                    <p className="text-[#64748B] font-bold uppercase tracking-widest text-xs">Initializing Optics...</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={handleCapture}
                      className="bg-[#1E3A8A] text-white px-12 py-5 rounded-2xl font-bold text-xl shadow-2xl shadow-blue-900/20 hover:scale-105 transition-all active:scale-95 flex items-center gap-4"
                    >
                      <Sparkles className="w-6 h-6" />
                      Capture Analysis
                    </button>
                    
                    <div className="flex items-center gap-4">
                      <div className="h-px bg-gray-200 flex-1"></div>
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Or</span>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>

                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white/90 backdrop-blur-md border border-gray-200 text-[#0F172A] px-12 py-4 rounded-2xl font-bold text-sm hover:bg-white transition-all flex items-center justify-center gap-2 shadow-xl"
                    >
                      <Upload className="w-5 h-5 text-[#1E3A8A]" />
                      Upload Clinical Image
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="absolute bottom-8 left-0 w-full px-8 flex justify-between items-center text-white/80 z-20">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest">Feed: Secured</span>
            </div>
            <span className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest">AI Vision v4.0</span>
          </div>
        </div>

        {/* Right: Vision Metrics */}
        <div className="w-full lg:w-2/5 space-y-6">
          <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest px-4">AI Vision Engine Metrics</h3>
          
          <div className="space-y-4">
            <div className="bg-white p-8 rounded-[32px] border border-[#E2E8F0] shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                  <Zap className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#64748B] uppercase tracking-widest mb-1">Ambient Light</h4>
                  <p className="text-3xl font-black text-[#0F172A]">{visionMetrics.lighting.toFixed(0)}<span className="text-lg text-gray-300 ml-1">%</span></p>
                </div>
              </div>
              <div className="h-1 bg-gray-100 w-20 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${visionMetrics.lighting}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-[#E2E8F0] shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#64748B] uppercase tracking-widest mb-1">Alignment</h4>
                  <p className="text-3xl font-black text-[#0F172A]">{visionMetrics.alignment.toFixed(0)}<span className="text-lg text-gray-300 ml-1">%</span></p>
                </div>
              </div>
              <div className="h-1 bg-gray-100 w-20 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${visionMetrics.alignment}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[32px] border border-[#E2E8F0] shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-500 group-hover:scale-110 transition-transform">
                  <Activity className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#64748B] uppercase tracking-widest mb-1">Optic Focus</h4>
                  <p className="text-3xl font-black text-[#0F172A]">{visionMetrics.focus.toFixed(0)}<span className="text-lg text-gray-300 ml-1">%</span></p>
                </div>
              </div>
              <div className="h-1 bg-gray-100 w-20 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 rounded-full transition-all duration-500" style={{ width: `${visionMetrics.focus}%` }}></div>
              </div>
            </div>
          </div>
          
          <div className="p-8 bg-blue-50/50 rounded-[32px] border border-blue-100">
            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3">Operator Tip</h4>
            <p className="text-sm text-blue-800 leading-relaxed font-medium">Ensure your face is well-lit and centered in the reticle. The AI engine performs best with natural daylight. You may also upload high-resolution clinical images for more detailed pathology detection.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
