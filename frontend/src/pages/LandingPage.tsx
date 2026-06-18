import { useState } from 'react';
import { ArrowRight, Radio, Wifi, Cpu, BarChart3, Menu, X, Layers, Activity } from 'lucide-react';

export default function LandingPage({ onStart }: { onStart: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-surface-900">
      <header className="fixed top-0 left-0 w-full z-50">
        <div className="mx-4 mt-4 lg:mx-8 lg:mt-6">
          <div className="max-w-6xl mx-auto bg-white/80 backdrop-blur-xl border border-surface-200/60 rounded-2xl px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-surface-900 rounded-xl flex items-center justify-center">
                <Radio className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-display font-bold tracking-tight">SkinSense</span>
            </div>

            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              <a href="#how-it-works" className="text-sm text-surface-500 hover:text-surface-900 px-4 py-2 rounded-lg transition-colors">How It Works</a>
              <a href="#features" className="text-sm text-surface-500 hover:text-surface-900 px-4 py-2 rounded-lg transition-colors">Features</a>
              <a href="#technology" className="text-sm text-surface-500 hover:text-surface-900 px-4 py-2 rounded-lg transition-colors">Technology</a>
            </nav>

            <div className="flex items-center gap-2">
              <button onClick={onStart} className="hidden sm:block text-sm text-surface-600 hover:text-surface-900 px-4 py-2 rounded-lg transition-colors">
                Log In
              </button>
              <button onClick={onStart} className="bg-surface-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-surface-800 transition-colors">
                Get Started
              </button>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 text-surface-400 hover:text-surface-900 rounded-lg transition-colors"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden mx-4 mt-2 bg-white/95 backdrop-blur-xl border border-surface-200/60 rounded-2xl p-2">
            <nav className="space-y-0.5" aria-label="Mobile navigation">
              <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-xl text-sm text-surface-600 hover:bg-surface-50 transition-colors">
                How It Works
              </a>
              <a href="#features" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-xl text-sm text-surface-600 hover:bg-surface-50 transition-colors">
                Features
              </a>
              <a href="#technology" onClick={() => setMenuOpen(false)} className="block px-4 py-3 rounded-xl text-sm text-surface-600 hover:bg-surface-50 transition-colors">
                Technology
              </a>
              <button onClick={() => { setMenuOpen(false); onStart(); }} className="block w-full text-left px-4 py-3 rounded-xl text-sm text-surface-600 hover:bg-surface-50 transition-colors sm:hidden">
                Log In
              </button>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="pt-32 lg:pt-44 pb-20 lg:pb-32 px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-50 border border-surface-200 text-xs font-medium text-surface-500 mb-8">
              <span className="w-1.5 h-1.5 bg-success-500 rounded-full animate-pulse" />
              Sensor-driven skin monitoring
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-surface-950 leading-[1.1]">
              Real-time skin health
              <span className="block text-surface-400 mt-1">powered by IoT sensors</span>
            </h1>

            <p className="text-lg text-surface-500 mt-6 max-w-xl mx-auto leading-relaxed">
              ESP32-powered sensor hardware captures multi-spectral skin data. On-device processing analyzes surface conditions instantly — delivering clinical-grade insights to your dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-10 justify-center">
              <button onClick={onStart} className="group bg-surface-900 text-white px-7 py-3.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-surface-800 transition-colors">
                Start Monitoring
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <a href="#features" className="border border-surface-200 text-surface-700 px-7 py-3.5 rounded-xl text-sm font-medium hover:bg-surface-50 hover:border-surface-300 transition-all text-center">
                Explore Hardware
              </a>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 lg:py-28 border-t border-surface-100">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="mb-14">
              <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">Pipeline</span>
              <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mt-2">From sensor to screen</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                {
                  step: '01',
                  icon: Radio,
                  title: 'Sense',
                  desc: 'IoT camera sensor captures multi-spectral skin data at the hardware level.',
                },
                {
                  step: '02',
                  icon: Cpu,
                  title: 'Process',
                  desc: 'ESP32 runs detection algorithms at the edge — no cloud round-trip for core analysis.',
                },
                {
                  step: '03',
                  icon: Wifi,
                  title: 'Transmit',
                  desc: 'Processed data streams securely to the cloud dashboard via MQTT protocol.',
                },
                {
                  step: '04',
                  icon: BarChart3,
                  title: 'Insight',
                  desc: 'Your skin health dashboard shows real-time scores, trends, and product routines.',
                },
              ].map((item) => (
                <div key={item.step} className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-surface-50 border border-surface-200 rounded-xl flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-surface-600" />
                    </div>
                    <span className="text-xs font-mono text-surface-300">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-display font-bold text-surface-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-surface-500 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 lg:py-28 bg-surface-950 text-white">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="mb-14">
              <span className="text-xs font-medium text-surface-500 uppercase tracking-wider">Hardware Capabilities</span>
              <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mt-2">Built for the edge</h2>
              <p className="text-surface-400 mt-3 max-w-lg">Every component is designed to work together — from sensor to dashboard.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-surface-800 rounded-2xl overflow-hidden">
              {[
                {
                  icon: Radio,
                  title: 'Multi-spectral sensors',
                  desc: 'Captures visible, UV, and infrared light to detect conditions invisible to the naked eye.',
                },
                {
                  icon: Cpu,
                  title: 'On-device processing',
                  desc: 'Edge computing runs detection algorithms locally — no cloud dependency for core analysis.',
                },
                {
                  icon: Layers,
                  title: 'Modular hardware',
                  desc: 'Swap sensor modules for different skin types and environmental conditions.',
                },
                {
                  icon: Activity,
                  title: 'Continuous monitoring',
                  desc: 'Scheduled scans track skin changes over time with automated trend analysis.',
                },
              ].map((item) => (
                <div key={item.title} className="bg-surface-950 p-7 group hover:bg-surface-900/50 transition-colors">
                  <div className="w-10 h-10 bg-surface-800 rounded-xl flex items-center justify-center mb-4 group-hover:bg-surface-800/80">
                    <item.icon className="w-5 h-5 text-surface-300" />
                  </div>
                  <h3 className="font-display font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-surface-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-20 lg:py-28 border-t border-surface-100">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: '<50ms', label: 'Sensor response time' },
                { value: '94%', label: 'Detection accuracy' },
                { value: '3', label: 'Spectral bands' },
                { value: '24/7', label: 'Continuous monitoring' },
              ].map((stat) => (
                <div key={stat.label} className="text-center md:text-left">
                  <div className="text-3xl md:text-4xl font-display font-bold text-surface-900">{stat.value}</div>
                  <div className="text-sm text-surface-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Technology */}
        <section id="technology" className="py-20 lg:py-28 border-t border-surface-100">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            <div className="mb-14">
              <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">Stack</span>
              <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mt-2">Under the hood</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'ESP32', desc: 'Low-power microcontroller that orchestrates sensor capture, edge processing, and WiFi connectivity.' },
                { label: 'MQTT', desc: 'Lightweight IoT protocol for real-time sensor-to-dashboard communication over WiFi.' },
                { label: 'Edge Computing', desc: 'On-device preprocessing on the ESP32 reduces latency — analysis runs where data is born.' },
                { label: 'FastAPI', desc: 'High-performance Python backend with async processing for sensor data ingestion and storage.' },
              ].map((item) => (
                <div key={item.label} className="flex gap-4 p-5 rounded-2xl border border-surface-100 hover:border-surface-200 transition-colors">
                  <div className="w-10 h-10 bg-surface-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-mono font-bold text-surface-400">{item.label.slice(0, 2)}</span>
                  </div>
                  <div>
                    <div className="font-display font-bold text-surface-900">{item.label}</div>
                    <p className="text-sm text-surface-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 lg:py-28 bg-surface-50 border-t border-surface-100">
          <div className="max-w-2xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-surface-900">
              Start monitoring your skin
            </h2>
            <p className="text-surface-500 mt-4 mb-8">
              Connect your sensor device, capture skin data, and see real-time insights on your dashboard.
            </p>
            <button onClick={onStart} className="bg-surface-900 text-white px-8 py-3.5 rounded-xl text-sm font-medium hover:bg-surface-800 transition-colors">
              Get Started
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-surface-100 py-10">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-surface-900 rounded-lg flex items-center justify-center">
              <Radio className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-display font-bold">SkinSense</span>
          </div>
          <p className="text-xs text-surface-400">&copy; 2026 SkinSense. IoT-powered skin monitoring.</p>
        </div>
      </footer>
    </div>
  );
}
