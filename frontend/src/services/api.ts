import axios from 'axios';
import { getStoredToken, clearAuth } from './auth';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject(new ApiError('Cannot connect to server. Please ensure the backend is running.', 0));
    }

    const { status, data } = error.response;

    if (status === 401) {
      clearAuth();
      window.location.href = '/';
      return Promise.reject(new ApiError('Session expired. Please log in again.', 401));
    }

    let message = 'An unexpected error occurred.';
    if (data?.detail) {
      message = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } else {
      switch (status) {
        case 400:
          message = 'Invalid request. Please check your input and try again.';
          break;
        case 404:
          message = 'Resource not found.';
          break;
        case 413:
          message = 'File is too large. Maximum size is 10MB.';
          break;
        case 415:
          message = 'Unsupported file type. Please upload a JPG or PNG image.';
          break;
        case 429:
          message = 'Too many requests. Please wait a moment and try again.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
        case 503:
          message = 'AI model is loading. Please wait a moment and try again.';
          break;
      }
    }

    return Promise.reject(new ApiError(message, status, error));
  }
);

export class ApiError extends Error {
  status: number;
  originalError?: unknown;

  constructor(message: string, status: number, originalError?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.originalError = originalError;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export interface ProcessResponse {
  status: 'success' | 'error';
  original_image: string;
  processed_image: string;
  original_path: string;
  processed_path: string;
  dimensions: {
    width: number;
    height: number;
  };
  normalized: boolean;
}

export interface UploadResponse {
  status: 'success' | 'error';
  message: string;
  filename: string;
  path: string;
  size: number;
}

export interface AnalysisResponse {
  status: 'success' | 'error';
  original_image: string;
  acne_count: number;
  severity: 'Clear' | 'Mild' | 'Moderate' | 'Severe';
  confidence: number;
  result_image: string;
  original_path: string;
  result_path: string;
  spot_types?: Record<string, number>;
  pigmentation_data?: {
    clarity_score: number;
    spots_count: number;
    heatmap_image: string;
    type_distribution: {
      localized: number;
      diffuse: number;
    };
  };
  dryness_data?: {
    hydration_score: number;
    roughness_score: number;
    flakes_count: number;
    texture_map_image: string;
  };
  recommendations?: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: 'skincare' | 'lifestyle' | 'medical';
    why?: string;
    conflictsWith?: string[];
  }>;
  conflicts?: Array<{
    message: string;
    severity: 'warning' | 'info';
  }>;
  routine?: {
    morning: Array<{ step: number; product: string; action: string; id: string }>;
    evening: Array<{ step: number; product: string; action: string; id: string }>;
    tips: string[];
  };
  face_quality?: {
    blur_score: number;
    angle_score: number;
    size_score: number;
    lighting_score: number;
    overall: number;
  };
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const MAX_SIZE = 10 * 1024 * 1024;

export function validateFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['jpg', 'jpeg', 'png'].includes(ext)) {
      throw new ApiError('Invalid file type. Please upload a JPG or PNG image.', 415);
    }
  }
  if (file.size > MAX_SIZE) {
    throw new ApiError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`, 413);
  }
  if (file.size === 0) {
    throw new ApiError('File is empty. Please select a valid image.', 400);
  }
}

export const processImage = async (file: File): Promise<ProcessResponse> => {
  validateFile(file);
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<ProcessResponse>('/process', formData);
  return response.data;
};

export const uploadImage = async (file: File): Promise<UploadResponse> => {
  validateFile(file);
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<UploadResponse>('/upload', formData);
  return response.data;
};

export const analyzeImage = async (file: File): Promise<AnalysisResponse> => {
  validateFile(file);
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<AnalysisResponse>('/analyze', formData);
  return response.data;
};

export const getResultImageUrl = (filename: string): string => {
  return `${API_BASE_URL}/results/${filename}`;
};

export interface ScanListItem {
  id: string;
  created_at: string;
  original_image: string;
  result_image: string;
  acne_count: number;
  severity: string;
  confidence: number;
  original_path: string;
  result_path: string;
}

export interface ScanListResponse {
  scans: ScanListItem[];
  total: number;
}

export interface ProgressDataPoint {
  date: string;
  score: number;
  acne_count: number;
  severity: string;
  id: string;
}

export interface RecentScanItem {
  id: string;
  date: string;
  time: string;
  score: number;
  severity: string;
  acne: number;
}

export interface ProgressResponse {
  progress: ProgressDataPoint[];
  recent_scans: RecentScanItem[];
  latest_stats: { acne_count: number; severity: string; confidence: number } | null;
}

export interface ScanDetailResponse {
  id: string;
  created_at: string;
  original_image: string;
  result_image: string;
  acne_count: number;
  severity: string;
  confidence: number;
  spot_types: Record<string, number>;
  pigmentation_data: AnalysisResponse['pigmentation_data'];
  dryness_data: AnalysisResponse['dryness_data'];
  recommendations: AnalysisResponse['recommendations'];
  conflicts: AnalysisResponse['conflicts'];
  routine: AnalysisResponse['routine'];
  face_quality: AnalysisResponse['face_quality'];
  original_path: string;
  result_path: string;
}

export const getScanHistory = async (limit = 20, offset = 0): Promise<ScanListResponse> => {
  const response = await api.get('/scans', { params: { limit, offset } });
  return response.data;
};

export const getScanDetail = async (scanId: string): Promise<ScanDetailResponse> => {
  const response = await api.get(`/scans/${scanId}`);
  return response.data;
};

export const getProgressData = async (): Promise<ProgressResponse> => {
  const response = await api.get('/scans/history/progress');
  return response.data;
};

export default api;
