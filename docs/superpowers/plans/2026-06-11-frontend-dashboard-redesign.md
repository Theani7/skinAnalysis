# Frontend Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the SkinAI frontend into a modern, full-screen dashboard with a Glassmorphism aesthetic and sidebar navigation.

**Architecture:** We will implement a `DashboardShell` that wraps the application. On desktop, it features a fixed sidebar; on mobile, it uses a toggleable overlay sidebar. Main content areas will be refactored to use responsive CSS Grid/Flexbox instead of fixed-width containers.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons.

---

### Task 1: Global Aesthetic & Layout Constants

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/tailwind.config.js`

- [ ] **Step 1: Update Tailwind config for glassmorphism and animations**

```javascript
// frontend/src/tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0f1a',
          800: '#111827',
          700: '#1f2937',
        },
        emerald: {
          500: '#10b981',
          600: '#059669',
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Update global CSS for glassmorphism defaults**

```css
/* frontend/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-dark-900 text-gray-100 antialiased;
  }
}

@layer components {
  .glass-card {
    @apply bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl;
  }
  
  .glass-sidebar {
    @apply bg-dark-800/50 backdrop-blur-2xl border-r border-white/5;
  }

  .btn-primary {
    @apply bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css frontend/src/tailwind.config.js
git commit -m "style: add glassmorphism base styles and tailwind config"
```

---

### Task 2: Create Sidebar & DashboardShell

**Files:**
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/DashboardShell.tsx`

- [ ] **Step 1: Implement Sidebar Component**

```tsx
// frontend/src/components/layout/Sidebar.tsx
import { Scan, Camera, Zap, LayoutDashboard, Settings, Info } from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: Scan, label: 'Deep Analysis' },
    { icon: Camera, label: 'Quick Scan' },
    { icon: Zap, label: 'Preprocessing' },
  ];

  return (
    <aside className="w-64 h-full glass-sidebar flex flex-col p-6">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
          <Scan className="text-white w-6 h-6" />
        </div>
        <span className="text-xl font-bold tracking-tight">SkinAI</span>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              item.active ? 'bg-emerald-600/10 text-emerald-500 font-semibold' : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="flex items-center gap-3 px-4 py-2 text-gray-500 text-xs font-semibold uppercase tracking-wider">
          System Status
        </div>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-gray-400">AI Model Loaded</span>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Implement DashboardShell Component**

```tsx
// frontend/src/components/layout/DashboardShell.tsx
import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, X } from 'lucide-react';

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-dark-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 shadow-2xl animate-in slide-in-from-left duration-300">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center justify-between px-6 border-b border-white/5 bg-dark-900/50 backdrop-blur-xl">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Scan className="text-white w-5 h-5" />
            </div>
            <span className="font-bold">SkinAI</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-400">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/Sidebar.tsx frontend/src/components/layout/DashboardShell.tsx
git commit -m "feat: add Sidebar and DashboardShell components"
```

---

### Task 3: Refactor App.tsx for Dashboard Architecture

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Wrap pages in DashboardShell**

```tsx
// frontend/src/App.tsx (Update imports and return statement)
import { DashboardShell } from './components/layout/DashboardShell';

// ... inside App component ...
  return (
    <DashboardShell>
      <AnimatePresence mode="wait">
        {/* ... existing route logic, remove the outer wrapping div and styles ... */}
      </AnimatePresence>
    </DashboardShell>
  );
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "refactor: integrated DashboardShell into App.tsx"
```

---

### Task 4: Modernize LandingPage

**Files:**
- Modify: `frontend/src/pages/LandingPage.tsx`

- [ ] **Step 1: Implement Dashboard Hero and Grid**

```tsx
// frontend/src/pages/LandingPage.tsx
import { ArrowRight, Camera, Scan, Shield, Zap } from 'lucide-react';
import { Button } from '../components/ui/Button';

// ... keep features array ...

export function LandingPage({ onStartAnalysis, onPreprocess, onStartAiDetection }: LandingPageProps) {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Dermatology AI v3.0
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight">
            Detect acne with <span className="text-emerald-500">precision.</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl leading-relaxed">
            Harnessing computer vision and YOLOv8 deep learning to identify lesion types, assess severity, and track your skin health in real-time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" className="h-14 px-8 text-lg" onClick={onStartAiDetection}>
              Start AI Detection
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button variant="secondary" size="lg" className="h-14 px-8 text-lg" onClick={onStartAnalysis}>
              <Camera className="mr-2 w-5 h-5" />
              Quick Scan
            </Button>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="glass-card aspect-square relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Scan className="w-32 h-32 text-emerald-500/20 group-hover:scale-110 transition-transform duration-500" />
            </div>
            {/* Visual Scan Effect */}
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-scan" />
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-[0.2em] mb-8">Core Capabilities</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="glass-card p-8 hover:bg-white/[0.08] transition-all group cursor-default">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <feature.icon className="text-emerald-500 w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Add Scan animation to index.css**

```css
/* frontend/src/index.css */
@keyframes scan {
  0% { transform: translateY(0); }
  50% { transform: translateY(400px); }
  100% { transform: translateY(0); }
}
.animate-scan {
  animation: scan 4s linear infinite;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/LandingPage.tsx frontend/src/index.css
git commit -m "feat: modernized LandingPage with responsive grid and hero"
```

---

### Task 5: Clean up and Validation

**Files:**
- Modify: `frontend/src/components/layout/Navbar.tsx`
- Delete: unused inline styles in components

- [ ] **Step 1: Refactor Navbar for context-specific use (back button only)**

```tsx
// frontend/src/components/layout/Navbar.tsx
// (Simplify to only show back button and title, remove logo as Sidebar has it)
export function Navbar({ showBack = false, onBack, title }: NavbarProps) {
  if (!showBack && !title) return null;
  return (
    <div className="flex items-center gap-4 mb-8">
      {showBack && (
        <button onClick={onBack} className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
      )}
      {title && <h1 className="text-2xl font-bold text-white">{title}</h1>}
    </div>
  );
}
```

- [ ] **Step 2: Final verification**
1. Open terminal in `frontend/`
2. Run `npm run dev`
3. Verify layout on:
   - Desktop (Sidebar visible, 2-column hero)
   - Mobile (Hamburger menu, vertical stack)
   - Tablet (Grid adapts)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/Navbar.tsx
git commit -m "cleanup: simplified Navbar and validated responsive layout"
```
