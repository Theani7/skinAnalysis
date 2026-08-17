import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Smartphone, Loader2, CheckCircle2 } from 'lucide-react';
import { analyzeImage, AnalysisResponse, API_BASE_URL } from '../services/api';

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
        const response = await fetch(`${API_BASE_URL}/remote/status/${sessionId}`);
        if (!response.ok) return;
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) return;
        const data = await response.json();

        if (data.status === 'ready') {
          // Image was uploaded!
          setStatus('downloading');
          if (pollingRef.current) clearInterval(pollingRef.current);
          
          // Download the image
          const downloadRes = await fetch(`${API_BASE_URL}/remote/download/${sessionId}`);
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
        // Only set error if not a temporary polling fetch error while waiting
        if (status !== 'waiting') {
          console.error('Remote scan error:', err);
          setStatus('error');
          setErrorMsg(err.message || 'An error occurred during remote capture.');
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
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
          className="w-10 h-10 t-btn-secondary rounded-xl flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xs font-medium t-text-muted uppercase tracking-wider mb-1">Remote Scan</h2>
          <h1 className="text-3xl font-display font-bold tracking-tight t-text">Use Your Phone</h1>
        </div>
      </header>

      <div className="flex-1 t-card p-8 flex flex-col items-center justify-center text-center">
        {status === 'error' ? (
          <div className="space-y-4">
            <div className="w-16 h-16 t-tint-danger rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold font-display t-text">Oops!</h3>
            <p className="t-text-secondary max-w-sm">{errorMsg}</p>
            <button 
              onClick={() => { setStatus('waiting'); setErrorMsg(null); }}
              className="mt-4 px-6 py-2 btn-premium rounded-xl font-medium"
            >
              Try Again
            </button>
          </div>
        ) : status === 'waiting' ? (
          <div className="space-y-6 flex flex-col items-center">
            <div className="w-16 h-16 t-tint-info rounded-full flex items-center justify-center mx-auto mb-2">
              <Smartphone className="w-8 h-8 text-cyan-500" />
            </div>
            <h3 className="text-xl font-bold font-display t-text">Scan QR with your Phone</h3>
            <p className="t-text-secondary max-w-md">
              Point your phone's camera at this QR code. It will open a secure link where you can take a photo of your skin, which will instantly appear here for analysis.
            </p>
            
            <div className="p-4 rounded-2xl shadow-lg inline-block t-bg-raised border t-divider">
              <QRCodeSVG value={mobileUrl} size={200} level="H" includeMargin={false} bgColor="transparent" fgColor="var(--text-primary)" />
            </div>
            
            <div className="flex items-center gap-3 text-sm t-text-muted pt-4">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
              Waiting for you to take a photo on your phone...
            </div>
          </div>
        ) : (
          <div className="space-y-6 flex flex-col items-center">
            <div className="w-16 h-16 t-tint-success rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold font-display t-text">
              {status === 'downloading' ? 'Photo Received!' : 'Analyzing...'}
            </h3>
            <p className="t-text-secondary max-w-md">
              {status === 'downloading' 
                ? 'Downloading the high-quality image from your phone...' 
                : 'Running AI skin analysis. This will just take a moment.'}
            </p>
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mt-4" />
          </div>
        )}
      </div>
    </div>
  );
}
