import { ArrowRight, Activity, Users, Star } from 'lucide-react';

export default function DashboardHome({ onStartScan }: { onStartScan: () => void }) {
  return (
    <div className="space-y-12">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-sm font-bold text-blue-600 uppercase tracking-[0.2em] mb-3">Medical Intelligence</h2>
          <h1 className="text-5xl font-extrabold tracking-tight">Welcome, <br/>Dr. Johnson</h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-[#64748B] text-sm font-bold uppercase tracking-widest">Vision Engine</p>
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">Neural Terminal Active</span>
          </div>
        </div>
      </header>

      {/* Main Analysis Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[32px] p-10 border border-[#E2E8F0] shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
            <Activity className="w-64 h-64" />
          </div>
          
          <div className="relative z-10">
            <h3 className="text-[#64748B] font-bold uppercase tracking-widest text-xs mb-8">Clinical Overview</h3>
            
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="relative w-56 h-56 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="112" cy="112" r="100" stroke="#F1F5F9" strokeWidth="16" fill="transparent" />
                  <circle cx="112" cy="112" r="100" stroke="#1E3A8A" strokeWidth="16" fill="transparent" strokeDasharray="628" strokeDashoffset={628 - (628 * 82) / 100} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-black tracking-tighter text-[#0F172A]">82</span>
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mt-1">Skin Index</span>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-2xl font-bold tracking-tight mb-2">Patient is performing well.</h4>
                  <p className="text-[#64748B] leading-relaxed">Analysis suggests a 14% improvement in surface hydration compared to last month. Sebaceous activity remains within optimal parameters.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={onStartScan} className="bg-[#1E3A8A] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#112D75] transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/10">
                    Execute New Analysis
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button onClick={onStartScan} className="bg-white border border-[#E2E8F0] text-[#0F172A] px-8 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-3">
                    Upload for Analysis
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-[32px] p-8 border border-[#E2E8F0] shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#1E3A8A]">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-lg">Patient Data</h4>
                <p className="text-xs text-[#64748B] font-medium">Syncing live history</p>
              </div>
            </div>
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-2 bg-gray-50 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.random() * 100}%` }}></div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1E3A8A] rounded-[32px] p-8 shadow-xl shadow-blue-900/20 text-white relative overflow-hidden">
            <Star className="absolute -top-4 -right-4 w-32 h-32 text-blue-400 opacity-20 rotate-12" />
            <h4 className="text-xl font-bold mb-3 relative z-10">Premium Plan</h4>
            <p className="text-blue-100 text-sm leading-relaxed mb-6 relative z-10">You have access to high-resolution multi-spectral analysis.</p>
            <button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-3 rounded-xl text-sm font-bold transition-all relative z-10">
              Manage License
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
