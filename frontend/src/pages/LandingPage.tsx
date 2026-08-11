import React, { useEffect, useState } from 'react';
import { Camera, ScanFace, Activity, FileText, Droplets, Sun, Sparkles, ChevronRight, Zap, Shield, Clock } from 'lucide-react';

export default function LandingPage({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen t-bg t-text font-sans overflow-hidden relative transition-colors duration-300">
      {/* Background gradient orbs */}
      <div className="fixed top-[-15%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ background: 'rgba(113, 127, 145, 0.08)', animationDuration: '8s' }} />
      <div className="fixed bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ background: 'rgba(148, 163, 184, 0.07)', animationDuration: '10s', animationDelay: '2s' }} />

      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 't-bg/80 backdrop-blur-xl border-b t-divider py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-700 to-primary-500 flex items-center justify-center shadow-glow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight t-text">SkinAI</span>
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={onLogin}
              className="px-5 py-2.5 text-sm font-medium t-text-secondary hover:t-text transition-colors"
            >
              Log in
            </button>
            <button
              onClick={onSignup}
              className="px-5 py-2.5 text-sm font-semibold bg-primary-700 hover:bg-primary-600 text-white rounded-xl transition-all shadow-glow-sm hover:shadow-glow"
            >
              Sign up free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-24 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-primary-700 text-sm font-medium mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
            <span>AI-powered dermatology in seconds</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] mb-8 max-w-5xl">
            <span className="t-text">Understand your</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-700 via-primary-500 to-primary-700">skin like never before</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl t-text-secondary max-w-2xl mb-12 leading-relaxed">
            Upload a photo and get instant AI analysis of acne, pigmentation, hydration levels, and personalized skincare recommendations.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <button
              onClick={onSignup}
              className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-600 text-white font-semibold text-lg overflow-hidden shadow-glow hover:shadow-glow-lg transition-all hover:scale-[1.02]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative flex items-center justify-center gap-2">
                Start Free Analysis <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>

            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 rounded-2xl bg-white border border-gray-300 t-text font-semibold text-lg hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2"
            >
              See how it works
            </button>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center gap-6 mt-12 text-sm t-text-muted">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-trust-600" />
              <span>Private &amp; secure</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-trust-600" />
              <span>Results in &lt;2s</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-trust-600" />
              <span>No credit card</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y t-divider t-bg-raised/50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '<2s', label: 'Analysis Time' },
            { value: '99%', label: 'Uptime' },
            { value: '5+', label: 'Skin Metrics' },
            { value: 'AI', label: 'Powered' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center text-center space-y-2">
              <span className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-primary-700 to-primary-500">{stat.value}</span>
              <span className="text-sm t-text-muted font-medium tracking-wide uppercase">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-28 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold t-text mb-4">How it works</h2>
          <p className="t-text-secondary text-lg max-w-xl mx-auto">Four simple steps to understand your skin health.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Camera, title: 'Upload', desc: 'Take or upload a clear, well-lit photo of your face or affected area.' },
            { icon: ScanFace, title: 'Analyze', desc: 'Our AI scans the image using advanced computer vision models.' },
            { icon: Activity, title: 'Classify', desc: 'We identify conditions, concerns, and skin types instantly.' },
            { icon: FileText, title: 'Report', desc: 'Get a detailed breakdown with actionable, personalized recommendations.' }
          ].map((step, i) => (
            <div key={i} className="relative p-7 rounded-3xl t-card group overflow-hidden hover:border-primary-700/30 transition-all">
              <div className="absolute top-4 right-4 text-6xl font-bold text-primary-700/[0.07] group-hover:text-primary-700/[0.12] transition-colors pointer-events-none">
                0{i + 1}
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mb-6 group-hover:scale-110 transition-all">
                <step.icon className="w-7 h-7 text-primary-700" />
              </div>
              <h3 className="text-xl font-semibold t-text mb-3">{step.title}</h3>
              <p className="t-text-secondary leading-relaxed text-[0.925rem]">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-28 px-6 t-bg-raised/50 border-y t-divider relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="md:w-1/3">
              <h2 className="text-3xl md:text-5xl font-bold t-text mb-6">Advanced <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-700 to-primary-500">capabilities</span></h2>
              <p className="t-text-secondary mb-8 leading-relaxed">
                Discover what's beneath the surface. Our diagnostic suite provides comprehensive insights into your dermatological health.
              </p>
              <button
                onClick={onSignup}
                className="px-6 py-3 rounded-xl bg-primary-700 hover:bg-primary-600 text-white font-medium transition-all"
              >
                Explore features →
              </button>
            </div>

            <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { icon: Zap, title: 'AI Detection', desc: 'Identify acne, rosacea, eczema, and more with high precision.' },
                { icon: Sun, title: 'Pigmentation Analysis', desc: 'Detect dark spots, hyperpigmentation, and uneven tone.' },
                { icon: Droplets, title: 'Hydration Mapping', desc: 'Assess skin moisture levels and barrier health visually.' },
                { icon: Shield, title: 'Smart Recommendations', desc: 'Receive tailored product suggestions and care routines.' }
              ].map((feat, i) => (
                <div key={i} className="p-7 rounded-3xl t-card hover:border-primary-700/30 transition-all group">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-5 group-hover:bg-gray-200 transition-colors">
                    <feat.icon className="w-6 h-6 text-primary-700" />
                  </div>
                  <h3 className="text-lg font-semibold t-text mb-2">{feat.title}</h3>
                  <p className="t-text-secondary text-sm leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-900/[0.02] to-gray-900/[0.05]"></div>
        <div className="max-w-3xl mx-auto relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold t-text mb-6">Ready to transform your skin journey?</h2>
          <p className="t-text-secondary text-lg mb-10 max-w-xl mx-auto">Join thousands who've discovered clearer, healthier skin with AI-powered insights.</p>
          <button
            onClick={onSignup}
            className="px-10 py-5 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-600 text-white font-bold text-xl hover:scale-[1.02] transition-all shadow-glow-lg hover:shadow-glow-xl"
          >
            Start Your Free Analysis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t t-divider t-bg">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-700 to-primary-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight t-text">SkinAI</span>
          </div>
          <p className="t-text-muted text-sm">
            &copy; {new Date().getFullYear()} SkinAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
