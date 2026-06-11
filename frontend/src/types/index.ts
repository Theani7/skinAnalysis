export interface AnalysisResult {
  id: string;
  imageUrl: string;
  severity: SeverityLevel;
  severityScore: number;
  confidence: number;
  acneType: AcneType;
  affectedAreas: string[];
  recommendations: Recommendation[];
  riskLevel: RiskLevel;
  timestamp: string;
  acneCount?: number;
  resultImage?: string;
  pigmentationData?: PigmentationData;
  drynessData?: DrynessData;
  }

  export interface PigmentationData {
  clarityScore: number;
  spotsCount: number;
  heatmapImage: string;
  typeDistribution: {
    localized: number;
    diffuse: number;
  };
  }

  export interface DrynessData {
  hydrationScore: number;
  roughnessScore: number;
  flakesCount: number;
  textureMapImage: string;
  }


export type SeverityLevel = 'clear' | 'mild' | 'moderate' | 'severe';
export type RiskLevel = 'low' | 'medium' | 'high';
export type AcneType = 'none' | 'blackheads' | 'whiteheads' | 'papules' | 'pustules' | 'nodules' | 'cysts' | 'mixed';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'skincare' | 'lifestyle' | 'medical';
}

export interface AnalysisStep {
  id: number;
  label: string;
  status: 'pending' | 'active' | 'completed';
}

export type Page = 'landing' | 'camera' | 'analyzing' | 'results' | 'preprocess' | 'analyze';