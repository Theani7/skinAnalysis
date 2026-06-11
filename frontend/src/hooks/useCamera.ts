import { useState, useRef, useCallback, useEffect } from 'react';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<Blob | null>;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      
      setStream(mediaStream);
      setIsActive(true);
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        
        const startPlayback = () => {
          console.log('Starting video playback. Dimensions:', video.videoWidth, 'x', video.videoHeight);
          video.play().catch(e => console.error('Error playing video:', e));
        };

        if (video.readyState >= 1) { // HAVE_METADATA
          startPlayback();
        } else {
          video.onloadedmetadata = startPlayback;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to access camera';
      setError(message);
      console.error('Camera error:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    setStream(prevStream => {
      if (prevStream) {
        prevStream.getTracks().forEach(track => track.stop());
      }
      return null;
    });
    setIsActive(false);
  }, []);

  const capturePhoto = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      console.log('Capture requested...');
      if (!videoRef.current || !canvasRef.current) {
        console.error('Refs missing:', { video: !!videoRef.current, canvas: !!canvasRef.current });
        resolve(null);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.error('Video dimensions are zero');
        resolve(null);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Could not get canvas context');
        resolve(null);
        return;
      }

      console.log('Drawing video to canvas...', video.videoWidth, 'x', video.videoHeight);
      // Mirror the image
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      canvas.toBlob(
        (b) => {
          if (b) {
            console.log('Blob created successfully, size:', b.size);
          } else {
            console.error('toBlob returned null');
          }
          resolve(b);
        },
        'image/jpeg',
        0.9
      );
    });
  }, []);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return {
    videoRef,
    canvasRef,
    stream,
    isActive,
    error,
    startCamera,
    stopCamera,
    capturePhoto,
  };
}