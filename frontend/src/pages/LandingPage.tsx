import { useState } from 'react';
import { ArrowRight, Activity, Camera, BarChart3, FileText, Sparkles, Shield, Menu, X } from 'lucide-react';

export default function LandingPage({ onStart }: { onStart: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-surface-900 selection:bg-primary-100">
      <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg md:text-xl font-extrabold tracking-tight text-surface-900">SkinAI</span>
          </div>

          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            <a href="#how-it-works" className="text-sm font-semibold text-surface-500 hover:text-primary-600 transition-colors">How It Works</a>
            <a href="#features" className="text-sm font-semibold text-surface-500 hover:text-primary-600 transition-colors">Features</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={onStart} className="hidden sm:block text-sm font-bold text-surface-600 hover:text-primary-600 px-3 py-2 transition-colors">Log In</button>
            <button onClick={onStart} className="bg-primary-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/15">
              Get Started
            </button>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-surface-500 hover:text-surface-900 rounded-xl hover:bg-surface-100 transition-colors"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-surface-200 bg-white/95 backdrop-blur-md">
            <nav className="max-w-7xl mx-auto px-4 py-4 space-y-1" aria-label="Mobile navigation">
              <a
                href="#how-it-works"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 rounded-xl text-sm font-bold text-surface-600 hover:bg-surface-50 hover:text-primary-600 transition-colors"
              >
                How It Works
              </a>
              <a
                href="#features"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 rounded-xl text-sm font-bold text-surface-600 hover:bg-surface-50 hover:text-primary-600 transition-colors"
              >
                Features
              </a>
              <button
                onClick={() => { setMenuOpen(false); onStart(); }}
                className="block w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-surface-600 hover:bg-surface-50 hover:text-primary-600 transition-colors sm:hidden"
              >
                Log In
              </button>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="pt-24 md:pt-44 pb-16 md:pb-32 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-5 md:mb-6">
                  AI Skin Analysis
                  <br />
                  <span className="text-primary-600">You Can Trust.</span>
                </h1>

                <p className="text-sm md:text-lg text-surface-500 leading-relaxed mb-6 md:mb-8 max-w-lg">
                  Upload a photo, get instant acne detection with severity scoring, personalized skincare routines, and clinical PDF reports.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={onStart} className="group bg-primary-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-primary-600/15">
                    Start Analysis
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <a href="#how-it-works" className="bg-white border border-surface-200 text-surface-700 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl font-bold hover:bg-surface-50 hover:border-surface-300 transition-all text-center">
                    See How It Works
                  </a>
                </div>
              </div>

              {/* Hero Visual — App Screenshot Mockup */}
              <div className="relative hidden sm:block">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-100/60 to-primary-50/30 rounded-3xl blur-3xl"></div>
                <div className="relative bg-white rounded-3xl border border-surface-200 shadow-2xl shadow-surface-200/50 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-4 py-3 bg-surface-50 border-b border-surface-200">
                    <div className="w-2.5 h-2.5 rounded-full bg-surface-300"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-surface-300"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-surface-300"></div>
                    <span className="ml-2 text-xs font-medium text-surface-400">skinai.app</span>
                  </div>
                  <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-surface-900">Capture or Upload</div>
                        <div className="text-[10px] sm:text-xs text-surface-400">Take a selfie or choose a photo</div>
                      </div>
                    </div>
                    <div className="h-px bg-surface-100"></div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-surface-900">AI Analysis</div>
                        <div className="text-[10px] sm:text-xs text-surface-400">YOLOv8 detects and counts acne</div>
                      </div>
                    </div>
                    <div className="h-px bg-surface-100"></div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-surface-900">Clinical Report</div>
                        <div className="text-[10px] sm:text-xs text-surface-400">PDF export with routine &amp; score</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-14 md:py-28 bg-surface-50 border-y border-surface-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 md:mb-14">
              <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">How It Works</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mt-3">Three Steps to Better Skin</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
              {[
                {
                  step: '01',
                  icon: Camera,
                  title: 'Capture',
                  desc: 'Take a selfie or upload a photo of your face. Our face detection guides you to the optimal position.',
                },
                {
                  step: '02',
                  icon: BarChart3,
                  title: 'Analyze',
                  desc: 'YOLOv8 detects acne, pigmentation, and dryness. You get severity scoring and detailed metrics.',
                },
                {
                  step: '03',
                  icon: FileText,
                  title: 'Report',
                  desc: 'Get a personalized AM/PM routine, product conflict warnings, and a clinical PDF report.',
                },
              ].map((item) => (
                <div key={item.step} className="relative">
                  <div className="text-5xl sm:text-6xl font-extrabold text-surface-100 absolute -top-3 -left-1 select-none">{item.step}</div>
                  <div className="relative pt-10">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white rounded-2xl border border-surface-200 flex items-center justify-center mb-4 sm:mb-5 shadow-sm">
                      <item.icon className="w-5 h-5 text-primary-600" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-sm text-surface-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-14 md:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 md:mb-14">
              <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">Features</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mt-3">Built for Real Results</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {[
                {
                  icon: BarChart3,
                  title: 'Multi-Signal Detection',
                  desc: 'Combines color analysis (HSV/LAB/YCrCb), texture analysis (Laplacian), and morphological detection for accurate lesion classification.',
                },
                {
                  icon: Sparkles,
                  title: 'Personalized Routines',
                  desc: 'AM/PM skincare routines built from your results. Includes product recommendations and application order.',
                },
                {
                  icon: Shield,
                  title: 'Conflict Detection',
                  desc: 'Warns when recommended products conflict with each other (e.g., retinol + AHA/BHA) to prevent irritation.',
                },
                {
                  icon: FileText,
                  title: 'Clinical PDF Reports',
                  desc: 'Export detailed reports with severity scores, face quality metrics, pigmentation analysis, and progress tracking.',
                },
                {
                  icon: Activity,
                  title: 'Face Quality Assessment',
                  desc: 'Real-time feedback on face positioning, lighting, and angle to ensure optimal capture quality.',
                },
                {
                  icon: Camera,
                  title: 'Progress Tracking',
                  desc: 'Scan history with charts showing your skin health score over time. See trends and improvements.',
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl border border-surface-200 hover:border-primary-200 hover:bg-surface-50/50 transition-all group">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
                    <item.icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-surface-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-surface-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="py-14 md:py-28 bg-surface-900 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 md:mb-14">
              <span className="text-xs font-bold text-primary-400 uppercase tracking-widest">Tech Stack</span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mt-3">Under the Hood</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-6">
              {[
                { label: 'YOLOv8', sub: 'Object Detection' },
                { label: 'OpenCV', sub: 'Image Processing' },
                { label: 'FastAPI', sub: 'Backend API' },
                { label: 'React', sub: 'Frontend UI' },
              ].map((item) => (
                <div key={item.label} className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-white/10 text-center">
                  <div className="text-base sm:text-lg font-bold">{item.label}</div>
                  <div className="text-[10px] sm:text-xs text-surface-400 mt-1">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-14 md:py-28">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Ready to Analyze Your Skin?</h2>
            <p className="text-surface-500 text-sm md:text-lg mb-6 md:mb-8 max-w-lg mx-auto">
              Upload a photo and get results in seconds.
            </p>
            <button onClick={onStart} className="group bg-primary-600 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-2xl font-bold hover:bg-primary-700 transition-all inline-flex items-center gap-2.5 shadow-lg shadow-primary-600/15">
              Start Analysis
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-surface-200 py-8 md:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded-lg flex items-center justify-center">
              <Activity className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-surface-900">SkinAI</span>
          </div>
          <p className="text-xs text-surface-400">&copy; 2026 SkinAI. AI-powered skin analysis.</p>
        </div>
      </footer>
    </div>
  );
}
