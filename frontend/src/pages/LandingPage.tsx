import { ArrowRight, Activity, ShieldCheck, Zap, Menu } from 'lucide-react';

export default function LandingPage({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-white text-[#0F172A] selection:bg-blue-100">
      {/* Premium Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1E3A8A] rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tighter text-[#0F172A]">SkinAI<span className="text-[#1E3A8A]">.</span></span>
          </div>
          
          <nav className="hidden md:flex items-center gap-10">
            <a href="#" className="text-sm font-semibold text-[#64748B] hover:text-[#1E3A8A] transition-colors">Technology</a>
            <a href="#" className="text-sm font-semibold text-[#64748B] hover:text-[#1E3A8A] transition-colors">Clinical Studies</a>
            <a href="#" className="text-sm font-semibold text-[#64748B] hover:text-[#1E3A8A] transition-colors">Enterprise</a>
          </nav>

          <div className="flex items-center gap-4">
            <button onClick={onStart} className="text-sm font-bold text-[#0F172A] hover:text-[#1E3A8A] px-4">Log In</button>
            <button onClick={onStart} className="bg-[#1E3A8A] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-[#112D75] transition-all shadow-lg shadow-blue-900/10">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-40 pb-32 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-8">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em]">Next-Gen Dermatology</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-[#0F172A] mb-8 leading-[0.95]">
            Clinical-Grade AI Skin Analysis. <br/>
            <span className="text-[#1E3A8A]">Powered by IoT.</span>
          </h1>
          
          <p className="text-xl text-[#64748B] max-w-2xl mx-auto mb-12 leading-relaxed">
            The world's first integrated skin health ecosystem combining real-time hardware sensors with clinical-grade artificial intelligence. 
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <button onClick={onStart} className="group w-full md:w-auto bg-[#1E3A8A] text-white px-10 py-5 rounded-2xl text-lg font-bold hover:bg-[#112D75] transition-all flex items-center justify-center gap-3">
              Start Free Analysis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full md:w-auto bg-white border border-gray-200 text-[#0F172A] px-10 py-5 rounded-2xl text-lg font-bold hover:bg-gray-50 transition-all">
              Watch Demo
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="max-w-7xl mx-auto mt-40 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="p-10 rounded-3xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:shadow-2xl hover:shadow-gray-200/50 transition-all group">
            <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 flex items-center justify-center mb-8 shadow-sm group-hover:border-blue-200 transition-colors">
              <Zap className="w-6 h-6 text-[#1E3A8A]" />
            </div>
            <h3 className="text-2xl font-bold mb-4 tracking-tight">Multi-Spectral AI</h3>
            <p className="text-[#64748B] leading-relaxed">Advanced computer vision models trained on millions of clinical images for unmatched detection accuracy.</p>
          </div>

          <div className="p-10 rounded-3xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:shadow-2xl hover:shadow-gray-200/50 transition-all group">
            <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 flex items-center justify-center mb-8 shadow-sm group-hover:border-blue-200 transition-colors">
              <Activity className="w-6 h-6 text-[#1E3A8A]" />
            </div>
            <h3 className="text-2xl font-bold mb-4 tracking-tight">ESP32 Sensor Integration</h3>
            <p className="text-[#64748B] leading-relaxed">Live biometric data streams for temperature, moisture, and sebum levels directly into your clinical dashboard.</p>
          </div>

          <div className="p-10 rounded-3xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:shadow-2xl hover:shadow-gray-200/50 transition-all group">
            <div className="w-14 h-14 bg-white rounded-2xl border border-gray-100 flex items-center justify-center mb-8 shadow-sm group-hover:border-blue-200 transition-colors">
              <ShieldCheck className="w-6 h-6 text-[#1E3A8A]" />
            </div>
            <h3 className="text-2xl font-bold mb-4 tracking-tight">HIPAA Compliant</h3>
            <p className="text-[#64748B] leading-relaxed">Your data is encrypted with enterprise-grade protocols, ensuring your clinical history remains private and secure.</p>
          </div>
        </div>
      </main>

      <footer className="py-20 border-t border-gray-100 text-center">
        <p className="text-[#64748B] text-sm font-medium">© 2026 SkinAI Clinical Systems. All rights reserved.</p>
      </footer>
    </div>
  );
}
