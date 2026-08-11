import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ChevronRight, Shield, Clock, Zap, Camera, ScanFace, Activity, FileText, Check, Sun, Moon, Droplets } from 'lucide-react';
import { ProgressRing } from '../components/ui/ProgressRing';

const DELAY = (i: number) => ({ ['--reveal-delay' as string]: `${i * 60}ms` });

function FaceMap() {
  return (
    <svg viewBox="0 0 420 440" className="w-full h-auto" role="img" aria-label="Example skin scan map showing detected lesions with confidence scores">
      {/* Head */}
      <ellipse cx="210" cy="200" rx="120" ry="145" fill="#f6f6f7" stroke="#e4e4e7" strokeWidth="1.5" />
      <path d="M180 330 h60 v72 a10 10 0 0 1 -10 10 h-40 a10 10 0 0 1 -10 -10 z" fill="#f6f6f7" stroke="#e4e4e7" strokeWidth="1.5" />
      <ellipse cx="92" cy="195" rx="14" ry="24" fill="#f6f6f7" stroke="#e4e4e7" strokeWidth="1.5" />
      <ellipse cx="328" cy="195" rx="14" ry="24" fill="#f6f6f7" stroke="#e4e4e7" strokeWidth="1.5" />
      {/* Features */}
      <path d="M160 148 Q 175 138 192 146" stroke="#c4c4cc" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M228 146 Q 245 138 260 148" stroke="#c4c4cc" strokeWidth="5" fill="none" strokeLinecap="round" />
      <ellipse cx="176" cy="176" rx="13" ry="6.5" fill="none" stroke="#a1a1aa" strokeWidth="3" />
      <ellipse cx="244" cy="176" rx="13" ry="6.5" fill="none" stroke="#a1a1aa" strokeWidth="3" />
      <path d="M210 185 L210 226 Q210 236 201 239" stroke="#c4c4cc" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M182 264 Q210 274 238 264" stroke="#c4c4cc" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M182 264 Q210 284 238 264" stroke="#c4c4cc" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {/* Detection boxes — example preview data */}
      <rect x="104" y="130" width="58" height="48" rx="6" fill="rgba(136,13,30,0.07)" stroke="#880d1e" strokeWidth="2" />
      <circle cx="133" cy="154" r="4" fill="#ad1639" />
      <path d="M133 126 v6" stroke="#880d1e" strokeWidth="2" />
      <g transform="translate(104,104)">
        <rect width="56" height="18" rx="4" fill="#880d1e" />
        <text x="28" y="13" textAnchor="middle" fontSize="10" fontWeight="600" fill="#ffffff" fontFamily="Inter, sans-serif">94%</text>
      </g>
      <rect x="248" y="178" width="62" height="52" rx="6" fill="rgba(136,13,30,0.07)" stroke="#880d1e" strokeWidth="2" />
      <circle cx="279" cy="204" r="4" fill="#ad1639" />
      <path d="M279 174 v6" stroke="#880d1e" strokeWidth="2" />
      <g transform="translate(248,152)">
        <rect width="54" height="18" rx="4" fill="#880d1e" />
        <text x="27" y="13" textAnchor="middle" fontSize="10" fontWeight="600" fill="#ffffff" fontFamily="Inter, sans-serif">89%</text>
      </g>
      <rect x="158" y="96" width="52" height="44" rx="6" fill="rgba(136,13,30,0.07)" stroke="#880d1e" strokeWidth="2" />
      <circle cx="184" cy="118" r="4" fill="#ad1639" />
      <path d="M184 92 v6" stroke="#880d1e" strokeWidth="2" />
      <g transform="translate(158,70)">
        <rect width="54" height="18" rx="4" fill="#880d1e" />
        <text x="27" y="13" textAnchor="middle" fontSize="10" fontWeight="600" fill="#ffffff" fontFamily="Inter, sans-serif">97%</text>
      </g>
      <rect x="250" y="238" width="52" height="44" rx="6" fill="rgba(136,13,30,0.07)" stroke="#880d1e" strokeWidth="2" />
      <circle cx="276" cy="260" r="4" fill="#ad1639" />
      <path d="M276 234 v6" stroke="#880d1e" strokeWidth="2" />
      <g transform="translate(250,212)">
        <rect width="54" height="18" rx="4" fill="#880d1e" />
        <text x="27" y="13" textAnchor="middle" fontSize="10" fontWeight="600" fill="#ffffff" fontFamily="Inter, sans-serif">91%</text>
      </g>
    </svg>
  );
}

function ScanPreview() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-[0_1px_3px_0_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.12)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-600" aria-hidden="true" />
          <span className="text-sm font-medium text-gray-900">Analysis preview</span>
        </div>
        <span className="font-mono text-xs text-gray-500">1.4s</span>
      </div>
      <div className="px-6 pt-4">
        <FaceMap />
      </div>
      <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-700/[0.06] border border-primary-700/15 text-primary-700">Acne · 12</span>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary-700/[0.06] border border-primary-700/15 text-primary-700">Pigmentation · 3</span>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-600">Texture · Normal</span>
        <div className="ml-auto flex items-center gap-2.5">
          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-[62%] rounded-full bg-primary-700" />
          </div>
          <span className="text-xs font-medium text-gray-600">Moderate</span>
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
    { icon: Camera, title: 'Upload', desc: 'Take or upload a clear, well-lit photo of your face or affected area.' },
    { icon: ScanFace, title: 'Analyze', desc: 'Computer-vision models map lesions, tone, and texture in under two seconds.' },
    { icon: Activity, title: 'Score', desc: 'Acne, pigmentation, and hydration are scored against a clinical severity scale.' },
    { icon: FileText, title: 'Report', desc: 'Get a detailed breakdown with actionable, personalized skincare recommendations.' },
  ];

  const routine = [
    { time: 'AM', label: 'Gentle cleanser, azelaic acid, SPF 50+' },
    { time: 'PM', label: 'Salicylic acid 2% spot treatment, ceramide moisturizer' },
  ];

  const metrics = [
    { value: '72', label: 'Hydration', active: true },
    { value: '81', label: 'Smoothness', active: false },
    { value: '46', label: 'Oiliness', active: false },
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
          <Zap className="w-4 h-4 text-primary-700" />
          <span>No credit card</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight text-gray-900">How it works</h2>
              <p className="mt-4 text-lg leading-relaxed text-gray-600 max-w-md">
                Four steps from photo to plan. No appointment, no waiting room, no guesswork.
              </p>
            </div>
          </div>
          <div className="lg:col-span-7">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`flex items-start gap-6 py-7 group rounded-xl -mx-4 px-4 transition-colors hover:bg-white ${i === steps.length - 1 ? '' : 'border-b border-gray-200'}`}
              >
                <span className="font-mono text-sm text-primary-700 pt-1 tabular-nums w-9 shrink-0">0{i + 1}</span>
                <div className="w-11 h-11 shrink-0 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                  <step.icon className="w-5 h-5 text-primary-700" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600 max-w-xl">{step.desc}</p>
                </div>
              </div>
            ))}
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
          <div className="lg:col-span-7 t-scroll-reveal rounded-xl border border-gray-200 bg-white p-7 md:p-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                <ScanFace className="w-4.5 h-4.5 text-primary-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Acne detection</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 max-w-md">
              Identifies papules, pustules, blackheads, and comedones with bounding-box precision on a clinical severity scale.
            </p>
            <div className="mt-6 rounded-lg border border-gray-100 bg-gray-50/60 px-4 pt-2">
              <FaceMap />
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
          <div className="lg:col-span-5 t-scroll-reveal rounded-xl border border-gray-200 bg-white p-7 md:p-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                <Droplets className="w-4.5 h-4.5 text-primary-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Texture &amp; hydration</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Surface roughness and barrier health estimated from texture gradients. Example metrics:
            </p>
            <div className="mt-8 flex items-end gap-10">
              {metrics.map((m) => (
                <div key={m.label} className="flex flex-col items-center gap-3">
                  <span className="font-mono text-xs text-gray-600 tabular-nums">{m.value}%</span>
                  <div className="w-10 h-24 rounded-md bg-gray-100 flex items-end overflow-hidden">
                    <div className={`w-full rounded-md ${m.active ? 'bg-primary-700' : 'bg-gray-300'}`} style={{ height: `${m.value}%` }} />
                  </div>
                  <span className="text-[11px] text-gray-500">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Personalized routine */}
          <div className="lg:col-span-7 t-scroll-reveal rounded-xl border border-gray-200 bg-gray-50 p-7 md:p-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5 text-primary-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Personalized routine</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 max-w-md">
              Recommendations adapt to your scan history, skin type, and severity trend. Example:
            </p>
            <div className="mt-6 space-y-2.5">
              {routine.map((r) => (
                <div key={r.time} className="flex items-center gap-3.5 rounded-lg bg-white border border-gray-200 px-4 py-3">
                  {r.time === 'AM' ? <Sun className="w-4 h-4 text-gray-400 shrink-0" /> : <Moon className="w-4 h-4 text-gray-400 shrink-0" />}
                  <span className="font-mono text-xs text-gray-500 w-7 shrink-0">{r.time}</span>
                  <span className="text-sm text-gray-700">{r.label}</span>
                  <Check className="w-4 h-4 text-primary-700 ml-auto shrink-0" />
                </div>
              ))}
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
          <p className="mt-5 text-sm text-white/60">Free to start · No credit card required</p>
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
