import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Smartphone, Loader2, CheckCircle2 } from 'lucide-react';
import { analyzeImage, AnalysisResponse } from '../services/api';

const host = window.location.hostname;
const API_URL = import.meta.env.VITE_API_URL || `http://${host}:8000`;

interface RemoteScanViewProps {
  onComplete: (result: AnalysisResponse) => void;
  onBack: () => void;
}

export default function RemoteScanView({ onComplete, onBack }: RemoteScanViewProps) {
  const [sessionId] = useState<string>(uuidv4());
  const [status, setStatus] = useState<'waiting' | 'downloading' | 'analyzing' | 'error'>('waiting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);

  // The URL to open on the mobile device
  const mobileUrl = `${window.location.origin}/mobile-capture?session=${sessionId}`;

  useEffect(() => {
    // Poll the backend to check if the mobile device has uploaded an image
    pollingRef.current = window.setInterval(async () => {
      if (status !== 'waiting') return; // Stop polling if we've moved on

      try {
        const response = await fetch(`${API_URL}/remote/status/${sessionId}`);
        if (!response.ok) return;
        const data = await response.json();

        if (data.status === 'ready') {
          // Image was uploaded!
          setStatus('downloading');
          if (pollingRef.current) clearInterval(pollingRef.current);
          
          // Download the image
          const downloadRes = await fetch(`${API_URL}/remote/download/${sessionId}`);
          if (!downloadRes.ok) throw new Error('Failed to download image from server');
          
          const blob = await downloadRes.blob();
          const file = new File([blob], 'remote_capture.jpg', { type: 'image/jpeg' });
          
          setStatus('analyzing');
          
          // Analyze it
          const result = await analyzeImage(file);
          if (result.status === 'success') {
            onComplete(result);
          } else {
            throw new Error('Analysis failed');
          }
        }
      } catch (err: any) {
        console.error('Remote scan error:', err);
        setStatus('error');
        setErrorMsg(err.message || 'An error occurred during remote capture.');
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [sessionId, status, onComplete]);

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto space-y-6">
      <header className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="w-10 h-10 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Remote Scan</h2>
          <h1 className="text-3xl font-display font-bold tracking-tight text-white">Use Your Phone</h1>
        </div>
      </header>

      <div className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-8 flex flex-col items-center justify-center text-center">
        {status === 'error' ? (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold font-display text-white">Oops!</h3>
            <p className="text-gray-400 max-w-sm">{errorMsg}</p>
            <button 
              onClick={() => { setStatus('waiting'); setErrorMsg(null); }}
              className="mt-4 px-6 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
            >
              Try Again
            </button>
          </div>
        ) : status === 'waiting' ? (
          <div className="space-y-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-teal-500/10 text-teal-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <Smartphone className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold font-display text-white">Scan QR with your Phone</h3>
            <p className="text-gray-400 max-w-md">
              Point your phone's camera at this QR code. It will open a secure link where you can take a photo of your skin, which will instantly appear here for analysis.
            </p>
            
            <div className="p-4 bg-white rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] inline-block">
              <QRCodeSVG value={mobileUrl} size={200} level="H" includeMargin={false} />
            </div>
            
            <div className="flex items-center gap-3 text-sm text-gray-500 pt-4">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              Waiting for you to take a photo on your phone...
            </div>
          </div>
        ) : (
          <div className="space-y-6 flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold font-display text-white">
              {status === 'downloading' ? 'Photo Received!' : 'Analyzing...'}
            </h3>
            <p className="text-gray-400 max-w-md">
              {status === 'downloading' 
                ? 'Downloading the high-quality image from your phone...' 
                : 'Running AI skin analysis. This will just take a moment.'}
            </p>
            <Loader2 className="w-8 h-8 text-teal-400 animate-spin mt-4" />
          </div>
        )}
      </div>
    </div>
  );
}
