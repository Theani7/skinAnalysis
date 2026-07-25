import React, { useEffect, useState } from 'react';
import { Camera, ScanFace, Activity, FileText, Droplets, Sun, Moon, Sparkles, ChevronRight, Zap, Shield, Clock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function LandingPage({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen t-bg t-text font-sans selection:bg-teal-500/30 overflow-hidden relative transition-colors duration-300">
      {/* Background aurora effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-teal-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
      
      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 't-bg/80 backdrop-blur-md border-b t-divider py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tighter t-text">SkinAI</span>
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full t-text-secondary hover:t-text transition-colors"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={onLogin}
              className="px-5 py-2 text-sm font-medium t-text-secondary hover:t-text transition-colors"
            >
              Log in
            </button>
            <button 
              onClick={onSignup}
              className="px-5 py-2 text-sm font-medium border t-divider rounded-full t-text t-bg-raised hover:t-bg-hover backdrop-blur-sm transition-all"
            >
              Sign up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-500 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          <span>Next-generation skin intelligence</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-purple-400 leading-tight mb-6 max-w-4xl">
          AI-Powered <br className="hidden md:block" />
          Skin Analysis
        </h1>
        
        <p className="text-lg md:text-xl t-text-secondary max-w-2xl mb-10">
          Upload a clear photo of your skin and let our advanced neural networks detect, classify, and recommend targeted treatments in seconds.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <button 
            onClick={onSignup}
            className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold text-lg overflow-hidden shadow-[0_0_40px_rgba(20,184,166,0.3)] hover:shadow-[0_0_60px_rgba(20,184,166,0.5)] transition-shadow"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <span className="relative flex items-center justify-center gap-2">
              Get Started <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
          
          <button 
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 rounded-full t-bg-raised border t-divider t-text font-semibold text-lg hover:t-bg-hover backdrop-blur-sm transition-all flex items-center justify-center gap-2"
          >
            Learn More
          </button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-10 border-y t-divider t-bg-raised">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '<2s', label: 'Analysis Time' },
            { value: '99%', label: 'Uptime' },
            { value: '5+', label: 'Skin Metrics' },
            { value: 'AI', label: 'Powered' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center text-center space-y-2">
              <span className={`text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b ${isDark ? 'from-white to-white/50' : 'from-slate-900 to-slate-500'}`}>{stat.value}</span>
              <span className="text-sm t-text-muted font-medium tracking-wide uppercase">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-32 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold t-text mb-6">How it Works</h2>
          <p className="t-text-secondary max-w-2xl mx-auto">Four simple steps to understand your skin health.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Camera, title: 'Upload', desc: 'Take or upload a clear, well-lit photo of your face or affected area.' },
            { icon: ScanFace, title: 'Analyze', desc: 'Our AI scans the image using advanced computer vision models.' },
            { icon: Activity, title: 'Classify', desc: 'We identify conditions, concerns, and skin types instantly.' },
            { icon: FileText, title: 'Report', desc: 'Get a detailed breakdown with actionable, personalized recommendations.' }
          ].map((step, i) => (
            <div key={i} className="relative p-6 rounded-3xl t-card hover:t-bg-hover transition-all group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 text-7xl font-bold t-text-muted opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                0{i + 1}
              </div>
              <div className="w-14 h-14 rounded-2xl bg-teal-500/20 flex items-center justify-center mb-6 border border-teal-500/30 group-hover:scale-110 transition-transform">
                <step.icon className="w-7 h-7 text-teal-500" />
              </div>
              <h3 className="text-xl font-semibold t-text mb-3">{step.title}</h3>
              <p className="t-text-secondary leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-6 t-bg-raised border-y t-divider relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="md:w-1/3">
              <h2 className="text-3xl md:text-5xl font-bold t-text mb-6">Advanced <br/><span className="text-teal-500">Capabilities</span></h2>
              <p className="t-text-secondary mb-8 leading-relaxed">
                Discover what's beneath the surface. Our diagnostic suite provides comprehensive insights into various aspects of your dermatological health.
              </p>
            </div>
            
            <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { icon: Zap, title: 'AI Detection', desc: 'Identify acne, rosacea, eczema, and more with high precision.' },
                { icon: Sun, title: 'Pigmentation Analysis', desc: 'Detect dark spots, hyperpigmentation, and uneven tone.' },
                { icon: Droplets, title: 'Hydration Mapping', desc: 'Assess skin moisture levels and barrier health visually.' },
                { icon: Shield, title: 'Smart Recommendations', desc: 'Receive tailored product suggestions and care routines.' }
              ].map((feat, i) => (
                <div key={i} className="p-8 rounded-3xl t-card hover:border-teal-500/30 transition-colors">
                  <feat.icon className="w-8 h-8 text-teal-500 mb-6" />
                  <h3 className="text-xl font-semibold t-text mb-3">{feat.title}</h3>
                  <p className="t-text-secondary">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-teal-900/10"></div>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-bold t-text mb-8">Ready to transform your skin journey?</h2>
          <button 
            onClick={onSignup}
            className="px-10 py-5 rounded-full btn-premium text-white font-bold text-xl hover:scale-105 transition-all shadow-[0_0_50px_rgba(6,182,212,0.3)]"
          >
            Start Your Free Analysis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t t-divider t-bg">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tighter t-text">SkinAI</span>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
          </div>
          <p className="t-text-muted text-sm">
            &copy; {new Date().getFullYear()} SkinAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
