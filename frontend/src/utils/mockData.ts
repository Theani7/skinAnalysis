import { AnalysisResult, Recommendation } from '../types';

export const mockRecommendations: Recommendation[] = [
  {
    id: '1',
    title: 'Use Salicylic Acid Cleanser',
    description: 'Incorporate a gentle salicylic acid cleanser into your daily routine to help unclog pores and reduce breakouts.',
    priority: 'high',
    category: 'skincare',
  },
  {
    id: '2',
    title: 'Apply Non-Comedogenic Moisturizer',
    description: 'Keep your skin hydrated with a lightweight, oil-free moisturizer that won\'t clog pores.',
    priority: 'high',
    category: 'skincare',
  },
  {
    id: '3',
    title: 'Avoid Touching Your Face',
    description: 'Reduce bacterial transfer by minimizing face touching throughout the day.',
    priority: 'medium',
    category: 'lifestyle',
  },
  {
    id: '4',
    title: 'Change Pillowcase Regularly',
    description: 'Replace your pillowcase every 2-3 days to reduce oil and bacteria buildup.',
    priority: 'medium',
    category: 'lifestyle',
  },
  {
    id: '5',
    title: 'Consider Topical Retinoid',
    description: 'Consult a dermatologist about adding a retinoid to your nighttime routine for cell turnover.',
    priority: 'high',
    category: 'medical',
  },
];

export const mockAnalysisResult: AnalysisResult = {
  id: '1',
  imageUrl: '',
  severity: 'mild',
  severityScore: 35,
  confidence: 87.5,
  acneType: 'papules',
  affectedAreas: ['Forehead', 'Left Cheek', 'Chin'],
  recommendations: mockRecommendations,
  riskLevel: 'low',
  timestamp: new Date().toISOString(),
  acneCount: 12,
  pigmentationData: {
    clarityScore: 82,
    spotsCount: 5,
    heatmapImage: '',
    typeDistribution: {
      localized: 2,
      diffuse: 3,
    },
  },
};

export const analysisSteps = [
  { id: 1, label: 'Uploading image', status: 'pending' as const },
  { id: 2, label: 'Processing face detection', status: 'pending' as const },
  { id: 3, label: 'Running AI analysis', status: 'pending' as const },
  { id: 4, label: 'Generating report', status: 'pending' as const },
];