import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, RotateCcw, Upload, Image, X, SwitchCamera } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';

interface CameraPageProps {
  onBack: () => void;
  onCapture: (imageBlob: Blob) => void;
}

export function CameraPage({ onBack, onCapture }: CameraPageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to access camera');
    }
  }, [facingMode, stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) return;

    if (facingMode === 'user') {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(video, 0, 0);
    context.setTransform(1, 0, 0, 1, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setCapturedImage(URL.createObjectURL(blob));
          stopCamera();
        }
      },
      'image/jpeg',
      0.9
    );
  }, [facingMode, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="flex flex-col">
      <Navbar showBack onBack={onBack} title="Capture" />
      
      <div className="w-full pb-8">
        <div className="w-full">
          <div className="pt-4">
            <div className="rounded-2xl overflow-hidden bg-black aspect-square relative max-w-[480px] mx-auto">
              <canvas ref={canvasRef} className="hidden" />
              
              {!capturedImage && (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${
                      facingMode === 'user' ? 'scale-x-[-1]' : ''
                    }`}
                  />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-5 left-5 w-10 h-10 border-l-2 border-t-2 border-white/20" />
                    <div className="absolute top-5 right-5 w-10 h-10 border-r-2 border-t-2 border-white/20" />
                    <div className="absolute bottom-5 left-5 w-10 h-10 border-l-2 border-b-2 border-white/20" />
                    <div className="absolute bottom-5 right-5 w-10 h-10 border-r-2 border-b-2 border-white/20" />
                  </div>
                  
                  {!stream && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2">
                      <Camera className="w-9 h-9 opacity-40" />
                      <p className="text-sm opacity-60">Initializing camera</p>
                    </div>
                  )}
                  
                  {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
                      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-3">
                        <X className="w-5 h-5 text-red-500" />
                      </div>
                      <p className="text-base font-medium mb-1">Camera Error</p>
                      <p className="text-xs opacity-60 mb-4 text-center">{error}</p>
                      <Button variant="secondary" size="sm" onClick={startCamera}>
                        Retry
                      </Button>
                    </div>
                  )}
                </>
              )}
              
              {capturedImage && (
                <motion.img
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  src={capturedImage}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 max-w-[480px] mx-auto">
            {!capturedImage ? (
              <div className="flex justify-center">
                <button
                  onClick={capturePhoto}
                  disabled={!stream}
                  className={`w-[72px] h-[72px] rounded-full bg-emerald-600 flex items-center justify-center border-none cursor-pointer shadow-[0_0_30px_rgba(5,150,105,0.3)] transition-opacity ${
                    stream ? 'opacity-100' : 'opacity-40'
                  }`}
                >
                  <div className="w-14 h-14 rounded-full border-[2.5px] border-white" />
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setCapturedImage(null);
                    setCapturedBlob(null);
                    startCamera();
                  }}
                  icon={<RotateCcw className="w-4 h-4" />}
                >
                  Retake
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => capturedBlob && onCapture(capturedBlob)}
                  icon={<Upload className="w-4 h-4" />}
                >
                  Analyze
                </Button>
              </div>
            )}
            
            {!capturedImage && (
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    stopCamera();
                    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
                  }}
                  className="w-11 h-11 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 cursor-pointer"
                >
                  <SwitchCamera className="w-5 h-5" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-11 h-11 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 cursor-pointer"
                >
                  <Image className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCapturedBlob(file);
                      setCapturedImage(URL.createObjectURL(file));
                    }
                  }}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

