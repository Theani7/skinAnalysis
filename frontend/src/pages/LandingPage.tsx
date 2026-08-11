import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ChevronRight, Shield, Clock, SunMoon, Camera, ScanFace, Activity, FileText, Sun, Moon, Check, Zap, Eye, TrendingUp } from 'lucide-react';

/* ── Animated counter ──────────────────────────────────────────────── */
function CountUp({ target, suffix = '' }: { target: number | string; suffix?: string }) {
  const [display, setDisplay] = useState('0');
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (typeof target !== 'number') { setDisplay(String(target)); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const duration = 1200;
      const step = (timestamp: number, startTime: number) => {
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * target).toString());
        if (progress < 1) requestAnimationFrame(ts => step(ts, startTime));
      };
      requestAnimationFrame(ts => step(ts, ts));
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{display}{suffix}</span>;
}

/* ── Intersection observer hook ────────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold });
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ── Animated section wrapper ──────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '', direction = 'up' }:
  { children: React.ReactNode; delay?: number; className?: string; direction?: 'up' | 'left' | 'right' }) {
  const { ref, visible } = useReveal();
  const translateMap = { up: 'translateY(32px)', left: 'translateX(-32px)', right: 'translateX(32px)' };
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : translateMap[direction],
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Scan preview card ─────────────────────────────────────────────── */
function ScanPreview() {
  return (
    <div className="relative max-w-[440px] mx-auto">
      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-[0_1px_3px_0_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.12)] aspect-[4/5]">
        <img
          src="/hero-scan.png"
          alt="Skin analysis scan in progress"
          className="w-full h-full object-cover object-top block"
          width={1122} height={1402}
          loading="eager"
        />
      </div>
      <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_4px_16px_-4px_rgb(0_0_0/0.12)]">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-pulse" aria-hidden="true" />
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

/* ── Floating orb background ───────────────────────────────────────── */
function HeroOrbs() {
  return (
    <>
      <div className="pointer-events-none absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary-100/40 blur-[100px] animate-[float_8s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute top-20 -left-32 w-[400px] h-[400px] rounded-full bg-primary-50/60 blur-[80px] animate-[float_10s_ease-in-out_infinite_2s]" />
    </>
  );
}

/* ── Hero badge ────────────────────────────────────────────────────── */
function HeroBadge() {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 100); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      opacity: show ? 1 : 0,
      transform: show ? 'none' : 'translateY(16px)',
      transition: 'opacity 0.6s ease, transform 0.6s ease',
    }}>
      <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
        <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-pulse" aria-hidden="true" />
        AI-powered dermatology
      </span>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────── */
export default function LandingPage({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 50);
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener('scroll', handleScroll); };
  }, []);

  const steps = [
    { slug: 'upload', icon: Camera, title: 'Upload', desc: 'Take or upload a clear, well-lit photo of your face or affected area.' },
    { slug: 'analyze', icon: ScanFace, title: 'Analyze', desc: 'Computer-vision models map lesions, tone, and texture in under two seconds.' },
    { slug: 'score', icon: Activity, title: 'Score', desc: 'Acne, pigmentation, and hydration are scored against a clinical severity scale.' },
    { slug: 'report', icon: FileText, title: 'Report', desc: 'Get an AM/PM skincare routine with product matches tailored to your skin type.' },
  ];

  const heroItem = (delay: number): React.CSSProperties => ({
    opacity: heroVisible ? 1 : 0,
    transform: heroVisible ? 'none' : 'translateY(24px)',
    transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans overflow-hidden relative">

      {/* Navbar */}
      <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-bold tracking-tight text-gray-900">Skin<span className="text-primary-700">AI</span></span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onLogin} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Log in
            </button>
            <button onClick={onSignup} className="px-4 py-2 h-9 text-sm font-medium bg-primary-700 hover:bg-primary-600 text-white rounded-lg transition-all hover:shadow-md hover:shadow-primary-200/50 active:scale-[0.98]">
              Start free analysis
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-20 pb-16 md:pt-24 md:pb-20 px-6 max-w-7xl mx-auto overflow-hidden">
        <HeroOrbs />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left: text */}
          <div className="lg:col-span-7 relative z-10">
            <HeroBadge />

            <h1 className="font-sans mt-6 text-5xl md:text-6xl font-bold tracking-tighter leading-[1.05] text-gray-900" style={heroItem(150)}>
              Your skin,<br />
              <span className="text-primary-700">quantified.</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-gray-600 max-w-xl" style={heroItem(250)}>
              Upload a photo. Get a precise analysis of acne, pigmentation, texture, and hydration in seconds. Stop guessing with your skincare and let our clinical-grade AI reveal exactly what your skin needs to thrive.
            </p>

            <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3" style={heroItem(320)}>
              {[
                'Acne detection & severity scoring',
                'Pigmentation & redness mapping',
                'Texture & hydration assessment',
                'AM/PM routine + product matches',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-primary-700/[0.08] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary-700" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-col sm:flex-row gap-3.5" style={heroItem(400)}>
              <button
                onClick={onSignup}
                className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 h-12 rounded-lg bg-primary-700 hover:bg-primary-600 text-white font-semibold text-base transition-all hover:shadow-lg hover:shadow-primary-200/60 hover:-translate-y-0.5 active:translate-y-0"
              >
                Start free analysis
                <ChevronRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center justify-center px-6 py-3.5 h-12 rounded-lg bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-900 font-semibold text-base transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                See how it works
              </button>
            </div>
          </div>

          {/* Right: image */}
          <div
            className="lg:col-span-5 relative z-10"
            style={{
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'none' : 'translateY(40px) scale(0.97)',
              transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1) 300ms, transform 0.9s cubic-bezier(0.16,1,0.3,1) 300ms',
            }}
          >
            <ScanPreview />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
          {[
            { value: 2, suffix: 's', label: 'Average analysis time', prefix: '<' },
            { value: 99, suffix: '%', label: 'Service uptime' },
            { value: 5, suffix: '+', label: 'Skin metrics tracked' },
            { value: '24/7', label: 'Always available' },
          ].map((stat, i) => (
            <Reveal key={i} delay={i * 80} className="flex flex-col items-center text-center gap-1.5">
              <span className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">
                {stat.prefix && stat.prefix}
                {typeof stat.value === 'number'
                  ? <CountUp target={stat.value} suffix={stat.suffix} />
                  : stat.value}
              </span>
              <span className="text-sm text-gray-500">{stat.label}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 max-w-7xl mx-auto py-24 md:py-28">
        <Reveal className="max-w-2xl">
          <h2 className="font-sans text-3xl md:text-4xl font-bold tracking-tight text-gray-900">From photo to plan in four steps</h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-600">No appointment, no waiting room, no guesswork.</p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <Reveal key={i} delay={i * 100} direction="up">
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden transition-all duration-300 hover:shadow-[0_8px_24px_-8px_rgb(0_0_0/0.12)] hover:-translate-y-1 group cursor-default">
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={`/step-${step.slug}.png`}
                    alt={`${step.title} step illustration`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    width={1254} height={1254}
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
            </Reveal>
          ))}
        </div>
      </section>

      {/* AM/PM routine */}
      <section className="px-6 max-w-7xl mx-auto pb-24 md:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <Reveal direction="left" className="rounded-xl border border-gray-200 overflow-hidden">
            <video
              src="/lifestyle-ampm.mp4"
              poster="/lifestyle-ampm.png"
              className="w-full h-full object-cover"
              autoPlay muted loop playsInline preload="metadata"
              width={1280} height={720}
            />
          </Reveal>
          <Reveal direction="right">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary-700">AM &amp; PM routines</span>
            <h2 className="mt-3 font-sans text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Recommendations that fit how you live
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-gray-600">
              Every scan produces a morning and night routine, with product matches chosen for your skin type — not a one-size-fits-all list.
            </p>
            <div className="mt-7 space-y-3">
              {[
                { icon: Sun, title: 'Morning:', desc: 'cleanse, actives, SPF — matched to your skin type' },
                { icon: Moon, title: 'Night:', desc: 'repair, spot treatment, moisturizer — based on scan severity' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3.5 rounded-lg border border-gray-200 bg-white px-4 py-3.5 hover:border-primary-200 hover:bg-primary-50/30 transition-all duration-200">
                  <div className="w-9 h-9 rounded-lg bg-primary-700/[0.06] flex items-center justify-center shrink-0">
                    <item.icon className="w-4.5 h-4.5 text-primary-700" />
                  </div>
                  <span className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">{item.title}</span>{' '}{item.desc}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 max-w-7xl mx-auto pb-24 md:pb-28">
        <Reveal>
          <div className="rounded-3xl overflow-hidden bg-zinc-900 text-center px-8 py-16 md:py-20 border-t-4 border-primary-600 relative">
            {/* background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(79,70,229,0.15)_0%,_transparent_70%)] pointer-events-none" />
            <h2 className="relative font-sans text-3xl md:text-4xl font-bold tracking-tight text-white">
              Your next analysis is seconds away
            </h2>
            <p className="relative mt-4 text-lg text-white/70 max-w-xl mx-auto">
              No appointments. No guesswork. Just measurements.
            </p>
            <button
              onClick={onSignup}
              className="relative mt-9 inline-flex items-center justify-center gap-2 px-7 py-3.5 h-12 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-semibold text-base transition-all hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              Start free analysis
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-xl font-bold tracking-tight text-gray-900">Skin<span className="text-primary-700">AI</span></span>
              </div>
              <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                Advanced AI-powered dermatology, making clinical-grade skin analysis accessible to everyone. Your journey to healthier skin starts here.
              </p>
            </div>

            {[
              { title: 'Product', links: ['How it works', 'Technology', 'Security'] },
              { title: 'Company', links: ['About Us', 'Careers', 'Contact'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service'] },
            ].map(col => (
              <div key={col.title}>
                <h3 className="font-semibold text-gray-900 mb-4 text-sm">{col.title}</h3>
                <ul className="space-y-3">
                  {col.links.map(link => (
                    <li key={link}><a href="#" className="text-sm text-gray-500 hover:text-primary-700 transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} SkinAI. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-primary-700 transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-700 transition-colors">
                <span className="sr-only">GitHub</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Global keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}
