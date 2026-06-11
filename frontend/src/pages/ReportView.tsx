import { useState } from 'react';
import { Download, FileText, ArrowLeft, ShieldAlert, Droplets, Activity, Maximize, CheckCircle2, Sparkles, LayoutGrid } from 'lucide-react';
import { AnalysisResponse, getResultImageUrl } from '../services/api';

interface ReportViewProps {
  result: AnalysisResponse | null;
  onBack: () => void;
}

export default function ReportView({ result, onBack }: ReportViewProps) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [activeTab, setActiveTab] = useState<'acne' | 'pigment' | 'moisture'>('acne');

  if (!result) return null;

  const metrics = [
    { 
      label: 'Acne', 
      value: result.severity, 
      score: result.acne_count, 
      icon: ShieldAlert, 
      color: result.severity === 'Severe' ? 'rose' : result.severity === 'Moderate' ? 'amber' : 'emerald',
      desc: `${result.acne_count} spots detected.`
    },
    { 
      label: 'Pigment', 
      value: result.pigmentation_data?.clarity_score && result.pigmentation_data.clarity_score < 85 ? 'Moderate' : 'Low', 
      score: result.pigmentation_data?.clarity_score || 0, 
      icon: Maximize, 
      color: result.pigmentation_data?.clarity_score && result.pigmentation_data.clarity_score < 85 ? 'amber' : 'emerald',
      desc: result.pigmentation_data?.spots_count ? `${result.pigmentation_data.spots_count} regions localized.` : 'Clear clarity detected.'
    },
    { 
      label: 'Hydration', 
      value: result.dryness_data?.hydration_score && result.dryness_data.hydration_score < 60 ? 'Low' : 'Healthy', 
      score: result.dryness_data?.hydration_score || 0, 
      icon: Droplets, 
      color: result.dryness_data?.hydration_score && result.dryness_data.hydration_score < 60 ? 'rose' : 'emerald',
      desc: 'Moisture retention levels.'
    },
    { 
      label: 'Texture', 
      value: result.dryness_data?.roughness_score && result.dryness_data.roughness_score > 5 ? 'Rough' : 'Smooth', 
      score: result.dryness_data?.roughness_score || 0, 
      icon: Activity, 
      color: result.dryness_data?.roughness_score && result.dryness_data.roughness_score > 5 ? 'amber' : 'emerald',
      desc: 'Surface smoothness index.'
    },
  ];

  const overallScore = Math.round(result.confidence * 100);

  return (
    <div className="h-full flex flex-col space-y-12 pb-20">
      <header className="flex justify-between items-start">
        <div>
          <button onClick={onBack} className="flex items-center text-[#64748B] hover:text-[#0F172A] font-bold text-xs uppercase tracking-widest mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Terminal
          </button>
          <h1 className="text-5xl font-extrabold tracking-tight text-[#0F172A]">Analysis Report</h1>
          <p className="text-[#64748B] font-medium mt-2">Analysis Session ID: #AI-{result.result_image.split('_')[1].substring(0,8).toUpperCase()}</p>
        </div>
        <button className="bg-white border border-[#E2E8F0] text-[#0F172A] px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-gray-50 transition-all shadow-sm">
          <Download className="w-5 h-5" />
          Export Clinical PDF
        </button>
      </header>

      {/* Main Split View: Image vs Metrics */}
      <div className="flex flex-col xl:flex-row gap-12">
        {/* Left: Interactive Result Image */}
        <div className="w-full xl:w-1/2 space-y-6">
          <div className="bg-white rounded-[40px] border border-[#E2E8F0] p-4 shadow-sm relative overflow-hidden aspect-square group">
            <div className="absolute top-8 left-8 z-20 flex gap-2">
               <button 
                onClick={() => { setActiveTab('acne'); setShowHeatmap(false); }}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'acne' ? 'bg-[#1E3A8A] text-white shadow-lg' : 'bg-white/80 backdrop-blur-md text-[#64748B] hover:text-[#0F172A]'}`}
               >
                 Acne
               </button>
               <button 
                onClick={() => { setActiveTab('pigment'); setShowHeatmap(true); }}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'pigment' ? 'bg-[#1E3A8A] text-white shadow-lg' : 'bg-white/80 backdrop-blur-md text-[#64748B] hover:text-[#0F172A]'}`}
               >
                 Pigment
               </button>
               <button 
                onClick={() => { setActiveTab('moisture'); setShowHeatmap(true); }}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'moisture' ? 'bg-[#1E3A8A] text-white shadow-lg' : 'bg-white/80 backdrop-blur-md text-[#64748B] hover:text-[#0F172A]'}`}
               >
                 Moisture
               </button>
            </div>

            <div className="w-full h-full rounded-[32px] overflow-hidden bg-gray-50 relative">
              <img 
                src={
                  showHeatmap && activeTab === 'pigment' && result.pigmentation_data?.heatmap_image
                    ? getResultImageUrl(result.pigmentation_data.heatmap_image)
                    : showHeatmap && activeTab === 'moisture' && result.dryness_data?.texture_map_image
                    ? getResultImageUrl(result.dryness_data.texture_map_image)
                    : getResultImageUrl(result.result_image)
                } 
                alt="Clinical Analysis"
                className="w-full h-full object-cover"
              />
              
              {showHeatmap && (
                <div className="absolute bottom-8 right-8 px-4 py-2 bg-blue-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  Heatmap Overlay Active
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between px-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#1E3A8A]"></div>
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Multi-spectral processing</span>
            </div>
            <button 
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="text-[10px] font-black text-[#1E3A8A] uppercase tracking-widest hover:underline"
            >
              Toggle Layer View
            </button>
          </div>
        </div>

        {/* Right: Key Metrics & Score */}
        <div className="w-full xl:w-1/2 space-y-8">
          <div className="bg-[#1E3A8A] rounded-[40px] p-10 text-white relative overflow-hidden flex items-center justify-between">
            <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
              <Activity className="w-64 h-64 -mr-20 -mt-10" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full mb-4 w-fit">
                <CheckCircle2 className="w-3 h-3 text-blue-300" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Clinical Index Score</span>
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight">Overall Health</h2>
            </div>
            <div className="relative z-10 text-center">
              <div className="text-8xl font-black tracking-tighter leading-none">{overallScore}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-300 mt-2">Scale: 0-100</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {metrics.map((m) => (
              <div key={m.label} className="bg-white p-8 rounded-[32px] border border-[#E2E8F0] shadow-sm group hover:border-blue-200 transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 bg-${m.color}-50 rounded-2xl flex items-center justify-center text-${m.color}-500 transition-transform group-hover:scale-110`}>
                    <m.icon className="w-6 h-6" />
                  </div>
                  <div className={`px-2.5 py-1 bg-${m.color}-50 text-${m.color}-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-${m.color}-100`}>
                    {m.value}
                  </div>
                </div>
                <h4 className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1">{m.label}</h4>
                <p className="text-3xl font-black text-[#0F172A]">{m.score}{m.label === 'Acne' ? '' : '%'}</p>
                <p className="text-[10px] font-medium text-[#64748B] mt-2">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actionable Insights & Treatment Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-gray-50 border border-[#E2E8F0] rounded-[40px] p-12 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
                <FileText className="w-48 h-48" />
             </div>
             
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <LayoutGrid className="w-6 h-6 text-[#1E3A8A]" />
                  <h3 className="text-2xl font-black tracking-tight text-[#0F172A]">Clinical Interpretation</h3>
                </div>
                
                <div className="prose prose-slate max-w-none">
                  <p className="text-[#64748B] text-lg leading-relaxed mb-6 font-medium italic">
                    "Primary findings indicate {result.severity.toLowerCase()} inflammatory activity and {result.dryness_data && result.dryness_data.hydration_score < 60 ? 'significant trans-epidermal moisture loss' : 'stable barrier function'}. Multi-spectral analysis identifies {result.pigmentation_data?.spots_count || 0} localized pigment clusters."
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                    <div className="space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-widest text-[#0F172A]">Pathology Overview</h4>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-2 text-sm text-[#64748B] font-medium leading-relaxed">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                          Sebaceous activity index: {result.acne_count > 5 ? 'Elevated' : 'Optimal'}
                        </li>
                        <li className="flex items-start gap-2 text-sm text-[#64748B] font-medium leading-relaxed">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                          Melanin distribution clarity: {result.pigmentation_data?.clarity_score || 0}%
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-black uppercase tracking-widest text-[#0F172A]">Clinical Priority</h4>
                      <div className="p-4 bg-white rounded-2xl border border-gray-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 font-black">!</div>
                        <p className="text-xs font-bold text-[#0F172A] leading-tight">Focus on barrier restoration and UVA/UVB photoprotection.</p>
                      </div>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Personalized Routine Sidebar */}
        <div className="space-y-6">
          <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest px-4">Personalized Routine</h3>
          <div className="space-y-4">
            {result.recommendations?.map((rec) => (
              <div key={rec.id} className="bg-white p-6 rounded-[32px] border border-[#E2E8F0] shadow-sm group hover:border-blue-200 transition-all">
                <div className="flex items-center justify-between mb-4">
                   <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${rec.category === 'medical' ? 'bg-rose-50 text-rose-600' : rec.category === 'skincare' ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-teal-600'}`}>
                      {rec.category}
                   </div>
                   <div className={`w-2 h-2 rounded-full ${rec.priority === 'high' ? 'bg-rose-500' : rec.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                </div>
                <h4 className="font-bold text-[#0F172A] mb-1 group-hover:text-[#1E3A8A] transition-colors">{rec.title}</h4>
                <p className="text-[10px] text-[#64748B] leading-relaxed font-medium">{rec.description}</p>
              </div>
            ))}
            
            <button className="w-full bg-[#1E3A8A] text-white py-4 rounded-2xl font-bold hover:bg-[#112D75] transition-all flex items-center justify-center gap-2 text-sm shadow-xl shadow-blue-900/10 mt-6">
              <Download className="w-4 h-4" /> Save Routine to Device
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
