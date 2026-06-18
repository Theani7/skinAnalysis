import { useState, useRef, useCallback, useEffect } from 'react';

interface FaceDetection {
  box: { x: number; y: number; width: number; height: number };
  landmarks?: any;
  detection: any;
}

interface UseFaceDetectionReturn {
  isModelLoaded: boolean;
  modelError: string | null;
  detection: FaceDetection | null;
  faceMetrics: {
    centeredness: number;
    size: number;
    angle: number;
    lighting: number;
    overall: number;
  };
  startDetection: (videoElement: HTMLVideoElement) => void;
  stopDetection: () => void;
}

export function useFaceDetection(): UseFaceDetectionReturn {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [detection, setDetection] = useState<FaceDetection | null>(null);
  const [faceMetrics, setFaceMetrics] = useState({
    centeredness: 0,
    size: 0,
    angle: 0,
    lighting: 0,
    overall: 0,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isDetectingRef = useRef(false);
  const faceapiRef = useRef<any>(null);

  const calculateMetrics = useCallback((
    box: { x: number; y: number; width: number; height: number },
    videoWidth: number,
    videoHeight: number,
    landmarks?: any
  ) => {
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const videoCenterX = videoWidth / 2;
    const videoCenterY = videoHeight / 2;

    const distFromCenter = Math.sqrt(
      Math.pow((centerX - videoCenterX) / videoWidth, 2) +
      Math.pow((centerY - videoCenterY) / videoHeight, 2)
    );
    const centeredness = Math.max(0, Math.min(100, Math.round((1 - distFromCenter * 2) * 100)));

    const faceArea = box.width * box.height;
    const videoArea = videoWidth * videoHeight;
    const sizeRatio = faceArea / videoArea;
    let size: number;
    if (sizeRatio >= 0.08 && sizeRatio <= 0.35) {
      size = 100;
    } else if (sizeRatio < 0.08) {
      size = Math.round((sizeRatio / 0.08) * 100);
    } else {
      size = Math.round(Math.max(0, 100 - (sizeRatio - 0.35) * 200));
    }

    let angle = 70;
    if (landmarks) {
      const jaw = landmarks.getJawOutline();
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();

      if (jaw.length > 0 && leftEye.length > 0 && rightEye.length > 0) {
        const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
        const eyeCenterY = (leftEye[0].y + rightEye[3].y) / 2;
        const jawCenter = jaw[Math.floor(jaw.length / 2)];

        const tiltAngle = Math.abs(
          Math.atan2(eyeCenterY - jawCenter.y, eyeCenterX - jawCenter.x) * (180 / Math.PI)
        );

        if (tiltAngle < 10) {
          angle = 100;
        } else if (tiltAngle < 20) {
          angle = 80;
        } else if (tiltAngle < 30) {
          angle = 60;
        } else {
          angle = Math.max(20, 60 - tiltAngle);
        }
      }
    }

    const lighting = 70;
    const overall = Math.round(centeredness * 0.35 + size * 0.3 + angle * 0.2 + lighting * 0.15);

    return { centeredness, size, angle, lighting, overall };
  }, []);

  const detect = useCallback(async () => {
    if (!videoRef.current || !isDetectingRef.current || !faceapiRef.current) return;

    const video = videoRef.current;
    const faceapi = faceapiRef.current;

    if (video.readyState !== 4) {
      animFrameRef.current = requestAnimationFrame(detect);
      return;
    }

    try {
      const result = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 }))
        .withFaceLandmarks();

      if (result) {
        const box = result.detection.box;
        const metrics = calculateMetrics(
          { x: box.x, y: box.y, width: box.width, height: box.height },
          video.videoWidth,
          video.videoHeight,
          result.landmarks
        );

        setDetection({
          box: { x: box.x, y: box.y, width: box.width, height: box.height },
          landmarks: result.landmarks,
          detection: result.detection,
        });
        setFaceMetrics(metrics);
      } else {
        setDetection(null);
        setFaceMetrics({ centeredness: 0, size: 0, angle: 0, lighting: 0, overall: 0 });
      }
    } catch {
      // Detection error, continue
    }

    if (isDetectingRef.current) {
      animFrameRef.current = requestAnimationFrame(detect);
    }
  }, [calculateMetrics]);

  const startDetection = useCallback((videoElement: HTMLVideoElement) => {
    videoRef.current = videoElement;
    isDetectingRef.current = true;
    detect();
  }, [detect]);

  const stopDetection = useCallback(() => {
    isDetectingRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setDetection(null);
  }, []);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const faceapi = await import('face-api.js');
        faceapiRef.current = faceapi;
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        setIsModelLoaded(true);
        setModelError(null);
      } catch (err) {
        console.error('Failed to load face detection models:', err);
        setModelError('Face detection models failed to load. You can still upload images for analysis.');
      }
    };

    loadModels();

    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    isModelLoaded,
    modelError,
    detection,
    faceMetrics,
    startDetection,
    stopDetection,
  };
}
