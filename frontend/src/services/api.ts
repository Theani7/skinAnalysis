import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,  // Increased timeout for AI analysis
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

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
  severity: 'Mild' | 'Moderate' | 'Severe';
  confidence: number;
  result_image: string;
  original_path: string;
  result_path: string;
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
  }>;
}

export const processImage = async (file: File): Promise<ProcessResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<ProcessResponse>('/process', formData);
  return response.data;
};

export const uploadImage = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<UploadResponse>('/upload', formData);
  return response.data;
};

export const analyzeImage = async (file: File): Promise<AnalysisResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<AnalysisResponse>('/analyze', formData);
  return response.data;
};

export const getOriginalImageUrl = (filename: string): string => {
  return `${API_BASE_URL}/images/original/${filename}`;
};

export const getProcessedImageUrl = (filename: string): string => {
  return `${API_BASE_URL}/images/processed/${filename}`;
};

export const getResultImageUrl = (filename: string): string => {
  return `${API_BASE_URL}/results/${filename}`;
};

export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get('/');
    return response.data.status === 'healthy';
  } catch {
    return false;
  }
};

export const checkModelStatus = async (): Promise<boolean> => {
  try {
    const response = await api.get('/model/status');
    return response.data.model_loaded;
  } catch {
    return false;
  }
};

export default api;