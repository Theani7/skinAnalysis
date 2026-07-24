import { useState, useEffect } from 'react';
import { Camera, UploadCloud, CheckCircle2, SwitchCamera, Loader2 } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function MobileCaptureView() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [status, setStatus] = useState<'init' | 'camera' | 'uploading' | 'success' | 'error'>('init');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const { videoRef, canvasRef, isActive, error: cameraError, startCamera, stopCamera, capturePhoto } = useCamera();

  useEffect(() => {
    // Get session ID from URL query parameters
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    
    if (session) {
      setSessionId(session);
      setStatus('camera');
      startCamera(facingMode);
    } else {
      setStatus('error');
      setErrorMsg('Invalid session link. Please scan the QR code from your laptop again.');
    }

    return () => {
      stopCamera();
    };
  }, [facingMode]); // Re-run startCamera if facingMode changes

  const toggleCamera = () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleCapture = async () => {
    try {
      setStatus('uploading');
      const blob = await capturePhoto();
      
      if (!blob) {
        throw new Error('Camera capture failed.');
      }

      const formData = new FormData();
      formData.append('file', blob, 'mobile_capture.jpg');

      const response = await fetch(`${API_URL}/remote/upload/${sessionId}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image to server');
      }

      setStatus('success');
      stopCamera();
      
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Failed to capture or upload photo.');
      stopCamera();
    }
  };

  if (status === 'error' || cameraError) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-16 h-16 bg-danger-500/20 text-danger-500 rounded-full flex items-center justify-center mb-6">
          <span className="text-2xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-display font-bold mb-3">Camera Error</h2>
        <p className="text-surface-400 mb-8 max-w-sm">{errorMsg || cameraError}</p>
        <button 
          onClick={() => { setStatus('camera'); startCamera(facingMode); }}
          className="px-6 py-3 bg-white text-surface-900 rounded-xl font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-20 h-20 bg-success-500/20 text-success-500 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-3">Photo Sent!</h2>
        <p className="text-surface-400 max-w-sm text-lg">
          You can put your phone down now.<br/>
          Check your laptop screen for the results.
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black flex flex-col relative overflow-hidden">
      {/* Camera View */}
      <div className="flex-1 relative">
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Overlay when uploading */}
        {status === 'uploading' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
            <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
            <p className="text-white font-medium">Sending to laptop...</p>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="h-32 bg-black flex items-center justify-between px-8 pb-safe pt-4 border-t border-surface-800 z-10">
        <div className="w-12">
          {/* Empty spacer for flex layout */}
        </div>
        
        {/* Shutter Button */}
        <button 
          onClick={handleCapture}
          disabled={!isActive || status === 'uploading'}
          className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
        >
          <div className="w-16 h-16 bg-white rounded-full"></div>
        </button>

        {/* Toggle Camera Button */}
        <button 
          onClick={toggleCamera}
          disabled={!isActive || status === 'uploading'}
          className="w-12 h-12 bg-surface-900 rounded-full flex items-center justify-center text-white active:bg-surface-800 transition-colors disabled:opacity-50"
        >
          <SwitchCamera className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
