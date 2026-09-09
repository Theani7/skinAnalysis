import { useState, useRef, useCallback, useEffect } from 'react';

export interface CameraDevice {
  deviceId: string;
  label: string;
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  devices: CameraDevice[];
  selectedDeviceId: string | null;
  startCamera: (deviceIdOrFacingMode?: string) => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<Blob | null>;
  switchCamera: (deviceId: string) => Promise<void>;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const updateDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices
        .filter(d => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
        }));
      setDevices(videoInputs);
    } catch (e) {
      console.error('Failed to enumerate video devices:', e);
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

  const startCamera = useCallback(async (deviceIdOrFacingMode?: string) => {
    try {
      setError(null);
      let videoConstraint: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };

      if (deviceIdOrFacingMode === 'environment') {
        videoConstraint.facingMode = 'environment';
      } else if (deviceIdOrFacingMode === 'user') {
        videoConstraint.facingMode = 'user';
      } else if (deviceIdOrFacingMode) {
        videoConstraint.deviceId = { exact: deviceIdOrFacingMode };
      } else if (selectedDeviceId) {
        videoConstraint.deviceId = { exact: selectedDeviceId };
      } else {
        videoConstraint.facingMode = 'user';
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraint,
        audio: false,
      });

      setStream(mediaStream);
      setIsActive(true);

      const videoTrack = mediaStream.getVideoTracks()[0];
      const activeDeviceId = videoTrack?.getSettings()?.deviceId;
      if (activeDeviceId) {
        setSelectedDeviceId(activeDeviceId);
      }

      // Enumerate devices now that permission is granted (labels are now visible)
      await updateDevices();

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;

        const startPlayback = () => {
          video.play().catch(() => {});
        };

        if (video.readyState >= 1) {
          startPlayback();
        } else {
          video.onloadedmetadata = startPlayback;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to access camera';
      setError(message);
    }
  }, [selectedDeviceId, updateDevices]);

  const switchCamera = useCallback(async (newDeviceId: string) => {
    stopCamera();
    setSelectedDeviceId(newDeviceId);
    await startCamera(newDeviceId);
  }, [stopCamera, startCamera]);

  useEffect(() => {
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices.addEventListener('devicechange', updateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', updateDevices);
    };
  }, [updateDevices]);

  const capturePhoto = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!videoRef.current || !canvasRef.current) {
        resolve(null);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        resolve(null);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      canvas.toBlob(
        (b) => {
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
    devices,
    selectedDeviceId,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
  };
}
