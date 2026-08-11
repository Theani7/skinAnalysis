import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ChevronRight, Shield, Clock, Zap, SunMoon, Camera, ScanFace, Activity, FileText, Check, Sun, Moon, Droplets } from 'lucide-react';
import { ProgressRing } from '../components/ui/ProgressRing';

const DELAY = (i: number) => ({ ['--reveal-delay' as string]: `${i * 60}ms` });

function ScanPreview() {
  return (
    <div className="relative">
      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-[0_1px_3px_0_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.12)]">
        <img
          src="/hero-scan.png"
          alt="Skin analysis scan in progress"
          className="w-full h-auto block"
          width={1122}
          height={1402}
          loading="eager"
          fetchPriority="high"
        />
      </div>
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto rounded-lg border border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_4px_16px_-4px_rgb(0_0_0/0.12)]">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-600" aria-hidden="true" />
            <span className="text-sm font-medium text-gray-900">Analysis preview</span>
          </div>
          <span className="font-mono text-xs text-gray-500">1.4s</span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-700/[0.06] border border-primary-700/15 text-primary-700">Acne · 12</span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-700/[0.06] border border-primary-700/15 text-primary-700">Pigmentation · 3</span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-600">Texture · Normal</span>
          <div className="flex items-center gap-2.5 ml-auto">
            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full w-[62%] rounded-full bg-primary-700" />
            </div>
            <span className="text-xs font-medium text-gray-600">Moderate</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const steps = [
    { slug: 'upload', icon: Camera, title: 'Upload', desc: 'Take or upload a clear, well-lit photo of your face or affected area.' },
    { slug: 'analyze', icon: ScanFace, title: 'Analyze', desc: 'Computer-vision models map lesions, tone, and texture in under two seconds.' },
    { slug: 'score', icon: Activity, title: 'Score', desc: 'Acne, pigmentation, and hydration are scored against a clinical severity scale.' },
    { slug: 'report', icon: FileText, title: 'Report', desc: 'Get an AM/PM skincare routine with product matches tailored to your skin type.' },
  ];

  const routine = [
    { time: 'AM', label: 'Gentle cleanser, azelaic acid, SPF 50+' },
    { time: 'PM', label: 'Salicylic acid 2% spot treatment, ceramide moisturizer' },
  ];

  return (
    <div className="min-h-screen t-bg t-text font-sans overflow-hidden relative transition-colors duration-300">
      <div ref={sentinelRef} className="absolute top-0 h-px" aria-hidden="true" />

      {/* Navbar */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white/85 backdrop-blur-md border-b border-gray-100 shadow-[0_1px_3px_0_rgb(0_0_0/0.03)]' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight text-gray-900">SkinAI</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Log in
            </button>
            <button
              onClick={onSignup}
              className="px-4 py-2 h-9 text-sm font-medium bg-primary-700 hover:bg-primary-600 text-white rounded-lg transition-colors active:translate-y-px"
            >
              Start free analysis
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-20 pb-16 md:pt-24 md:pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <div className="lg:col-span-6">
            <div className="t-reveal" style={DELAY(0)}>
              <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-primary-700">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-600" aria-hidden="true" />
                AI-powered dermatology
              </span>
            </div>
            <h1 className="t-reveal font-sans mt-6 text-5xl md:text-6xl font-bold tracking-tighter leading-[1.05] text-gray-900" style={DELAY(1)}>
              Your skin,
              <br />
              <span className="text-primary-700">quantified.</span>
            </h1>
            <p className="t-reveal mt-6 text-lg leading-relaxed text-gray-600 max-w-xl" style={DELAY(2)}>
              Upload a photo. Get a precise analysis of acne, pigmentation, texture, and hydration in seconds.
            </p>
            <div className="t-reveal mt-9 flex flex-col sm:flex-row gap-3.5" style={DELAY(3)}>
              <button
                onClick={onSignup}
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 h-12 rounded-lg bg-primary-700 hover:bg-primary-600 text-white font-semibold text-base transition-colors active:translate-y-px"
              >
                Start free analysis
                <ChevronRight className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center px-6 py-3.5 h-12 rounded-lg bg-white border border-gray-300 hover:border-gray-400 text-gray-900 font-semibold text-base transition-colors active:translate-y-px"
              >
                See how it works
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 t-scroll-reveal">
            <ScanPreview />
          </div>
        </div>
      </section>

      {/* Trust indicators */}
      <section className="px-6 max-w-7xl mx-auto pb-16 md:pb-20 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary-700" />
          <span>Private &amp; secure</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary-700" />
          <span>Results in &lt;2s</span>
        </div>
        <div className="flex items-center gap-2">
          <SunMoon className="w-4 h-4 text-primary-700" />
          <span>AM &amp; PM routines</span>
        </div>
      </section>

      {/* Stats */}
      <section className="t-bg-raised border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
          {[
            { value: '<2s', label: 'Average analysis time' },
            { value: '99%', label: 'Service uptime' },
            { value: '5+', label: 'Skin metrics tracked' },
            { value: '24/7', label: 'Always available' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-1.5">
              <span className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">{stat.value}</span>
              <span className="text-sm text-gray-500">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 max-w-7xl mx-auto py-24 md:py-28">
        <div className="max-w-2xl">
          <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight text-gray-900">From photo to plan in four steps</h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-600">
            No appointment, no waiting room, no guesswork.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <div key={i} className="t-scroll-reveal rounded-xl border border-gray-200 bg-white overflow-hidden transition-shadow hover:shadow-[0_8px_24px_-8px_rgb(0_0_0/0.12)]">
              <div className="aspect-square bg-gray-100">
                <img
                  src={`/step-${step.slug}.png`}
                  alt={`${step.title} step illustration`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={1254}
                  height={1254}
                />
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <step.icon className="w-4.5 h-4.5 text-primary-700" />
                    <h3 className="text-base font-semibold text-gray-900">{step.title}</h3>
                  </div>
                  <span className="font-mono text-xs text-primary-700 tabular-nums" aria-hidden="true">0{i + 1}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AM/PM routine */}
      <section className="px-6 max-w-7xl mx-auto pb-24 md:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="t-scroll-reveal rounded-xl border border-gray-200 overflow-hidden">
            <img
              src="/lifestyle-ampm.png"
              alt="Skincare routine in soft morning light"
              className="w-full h-full object-cover"
              loading="lazy"
              width={1672}
              height={941}
            />
          </div>
          <div className="t-scroll-reveal">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary-700">AM &amp; PM routines</span>
            <h2 className="mt-3 font-sans text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Recommendations that fit how you live
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">
              Every scan produces a morning and night routine, with product matches chosen for your skin type — not a one-size-fits-all list.
            </p>
            <div className="mt-7 space-y-3">
              <div className="flex items-center gap-3.5 rounded-lg border border-gray-200 bg-white px-4 py-3.5">
                <div className="w-9 h-9 rounded-lg bg-primary-700/[0.06] flex items-center justify-center">
                  <Sun className="w-4.5 h-4.5 text-primary-700" />
                </div>
                <span className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">Morning:</span> cleanse, actives, SPF — matched to your skin type
                </span>
              </div>
              <div className="flex items-center gap-3.5 rounded-lg border border-gray-200 bg-white px-4 py-3.5">
                <div className="w-9 h-9 rounded-lg bg-primary-700/[0.06] flex items-center justify-center">
                  <Moon className="w-4.5 h-4.5 text-primary-700" />
                </div>
                <span className="text-sm text-gray-700">
                  <span className="font-semibold text-gray-900">Night:</span> repair, spot treatment, moisturizer — based on scan severity
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="px-6 max-w-7xl mx-auto pb-24 md:pb-28">
        <div className="max-w-2xl">
          <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight text-gray-900">Everything a skin exam measures</h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-600">
            The same indicators a dermatologist checks, quantified by computer vision.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Acne detection */}
          <div className="lg:col-span-7 t-scroll-reveal rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="aspect-[4/3] bg-gray-100">
              <img
                src="/cap-detection.jpg"
                alt="Acne lesion detection with bounding-box markers"
                className="w-full h-full object-cover"
                loading="lazy"
                width={836}
                height={627}
              />
            </div>
            <div className="p-7 md:p-8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                  <ScanFace className="w-4.5 h-4.5 text-primary-700" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Acne detection</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 max-w-lg">
                Identifies papules, pustules, blackheads, and comedones with bounding-box precision on a clinical severity scale.
              </p>
            </div>
          </div>

          {/* Severity scoring */}
          <div className="lg:col-span-5 t-scroll-reveal rounded-xl border border-gray-200 bg-white p-7 md:p-8 flex flex-col">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                <Activity className="w-4.5 h-4.5 text-primary-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Severity scoring</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Lesion counts and types aggregate into a mild-to-severe score you can track between scans.
            </p>
            <div className="mt-auto pt-6 flex items-center gap-6">
              <div className="w-28 h-28">
                <ProgressRing value={62} size={110} strokeWidth={8} color="#880d1e" bgColor="rgba(136,13,30,0.12)" label="Moderate" />
              </div>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-8">
                  <span className="text-gray-600">Active lesions</span>
                  <span className="font-semibold text-gray-900 tabular-nums">12</span>
                </div>
                <div className="flex items-center justify-between gap-8">
                  <span className="text-gray-600">Zones affected</span>
                  <span className="font-semibold text-gray-900 tabular-nums">3</span>
                </div>
                <div className="flex items-center justify-between gap-8">
                  <span className="text-gray-600">Trend vs last scan</span>
                  <span className="font-semibold text-gray-900 tabular-nums">-18%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Texture & hydration */}
          <div className="lg:col-span-5 t-scroll-reveal rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="aspect-[4/3] bg-gray-100">
              <img
                src="/cap-texture.png"
                alt="Macro view of skin texture and hydration"
                className="w-full h-full object-cover"
                loading="lazy"
                width={900}
                height={675}
              />
            </div>
            <div className="p-7 md:p-8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Droplets className="w-4.5 h-4.5 text-primary-700" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Texture &amp; hydration</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-gray-600">
                Surface roughness and barrier health estimated from texture gradients across your skin map.
              </p>
            </div>
          </div>

          {/* Personalized routine */}
          <div className="lg:col-span-7 t-scroll-reveal rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="aspect-[4/3] md:aspect-auto md:h-full bg-gray-100">
                <img
                  src="/cap-routine.png"
                  alt="Skincare products flat lay"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={900}
                  height={675}
                />
              </div>
              <div className="p-7 md:p-8 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                    <Sparkles className="w-4.5 h-4.5 text-primary-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Personalized routine</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  Recommendations adapt to your scan history and severity trend, with product matches for your skin type. Example:
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Skin type:</span>
                  {['Dry', 'Oily', 'Combination', 'Sensitive'].map((t) => (
                    <span
                      key={t}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                        t === 'Oily'
                          ? 'bg-white border-primary-700/25 text-primary-700'
                          : 'bg-white border-gray-200 text-gray-500'
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-2.5">
                  {routine.map((r) => (
                    <div key={r.time} className="flex items-center gap-3.5 rounded-lg bg-white border border-gray-200 px-4 py-3">
                      {r.time === 'AM' ? <Sun className="w-4 h-4 text-gray-400 shrink-0" /> : <Moon className="w-4 h-4 text-gray-400 shrink-0" />}
                      <span className="font-mono text-xs text-gray-500 w-7 shrink-0">{r.time}</span>
                      <span className="text-sm text-gray-700">{r.label}</span>
                      <Check className="w-4 h-4 text-primary-700 ml-auto shrink-0" />
                    </div>
                  ))}
                  <div className="flex items-center gap-3.5 rounded-lg bg-white border border-gray-200 px-4 py-3">
                    <Sparkles className="w-4 h-4 text-primary-700 shrink-0" />
                    <span className="text-sm text-gray-700">
                      Recommended for <span className="font-medium text-gray-900">oily, acne-prone skin</span>:
                      niacinamide serum, salicylic acid cleanser
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 max-w-7xl mx-auto pb-24 md:pb-28">
        <div className="rounded-3xl overflow-hidden bg-zinc-900 text-center px-8 py-16 md:py-20 border-t-4 border-primary-600">
          <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight text-white">Your next analysis is seconds away</h2>
          <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto">
            No appointments. No guesswork. Just measurements.
          </p>
          <button
            onClick={onSignup}
            className="mt-9 inline-flex items-center justify-center gap-2 px-7 py-3.5 h-12 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-semibold text-base transition-colors active:translate-y-px"
          >
            Start free analysis
            <ChevronRight className="w-4.5 h-4.5" />
          </button>
          <p className="mt-5 text-sm text-white/60">Free to use · No subscriptions, no fees</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-700 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight text-gray-900">SkinAI</span>
          </div>
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} SkinAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
