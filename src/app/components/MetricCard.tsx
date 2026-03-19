import { useEffect, useMemo, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend: number[];
  color: string;
  animationIndex?: number;
}

const metricToneByColor: Record<string, {
  glowClass: string;
  iconClass: string;
  orbitClass: string;
}> = {
  '#0C4DA2': {
    glowClass: 'metric-glow-blue',
    iconClass: 'metric-icon-blue',
    orbitClass: 'metric-orbit-blue',
  },
  '#10b981': {
    glowClass: 'metric-glow-emerald',
    iconClass: 'metric-icon-emerald',
    orbitClass: 'metric-orbit-emerald',
  },
  '#f59e0b': {
    glowClass: 'metric-glow-amber',
    iconClass: 'metric-icon-amber',
    orbitClass: 'metric-orbit-amber',
  },
  '#8b5cf6': {
    glowClass: 'metric-glow-violet',
    iconClass: 'metric-icon-violet',
    orbitClass: 'metric-orbit-violet',
  },
  '#ec4899': {
    glowClass: 'metric-glow-pink',
    iconClass: 'metric-icon-pink',
    orbitClass: 'metric-orbit-pink',
  },
};

export function MetricCard({ title, value, icon: Icon, trend, color, animationIndex = 0 }: MetricCardProps) {
  const numericValue = useMemo(() => {
    if (typeof value === 'number') {
      return value;
    }
    const parsed = Number(String(value).replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }, [value]);
  const [animatedValue, setAnimatedValue] = useState<number>(numericValue ?? 0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [animationProgress, setAnimationProgress] = useState<number>(prefersReducedMotion ? 1 : 0);
  const [wavePhase, setWavePhase] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(media.matches);
    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (numericValue === null) {
      return;
    }

    if (prefersReducedMotion) {
      setAnimatedValue(numericValue);
      setAnimationProgress(1);
      return;
    }

    let rafId = 0;
    const start = performance.now();
    const duration = 950 + (animationIndex * 120);

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out cubic for smoother finish.
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(Math.round(numericValue * eased));
      setAnimationProgress(eased);

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    setAnimatedValue(0);
    setAnimationProgress(0);
    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [numericValue, animationIndex, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setWavePhase(0);
      return;
    }

    let rafId = 0;
    const startedAt = performance.now();

    const animateWave = (now: number) => {
      const elapsed = now - startedAt;
      setWavePhase((elapsed / 1000) * 2.6);
      rafId = requestAnimationFrame(animateWave);
    };

    rafId = requestAnimationFrame(animateWave);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [prefersReducedMotion]);

  const chartData = useMemo(() => {
    if (trend.length === 0) {
      return [];
    }

    const minValue = Math.min(...trend);
    const maxValue = Math.max(...trend);
    const range = Math.max(1, maxValue - minValue);
    const amplitude = range * 0.08;
    const visibleIndex = animationProgress * (trend.length - 1);

    return trend.map((point, index) => {
      const isVisible = index <= visibleIndex;
      if (!isVisible) {
        return { value: null, index };
      }

      const waveOffset = Math.sin((index * 0.9) + wavePhase) * amplitude;
      const drift = Math.sin(wavePhase * 0.55 + index * 0.25) * amplitude * 0.4;
      const animatedPoint = prefersReducedMotion ? point : point + waveOffset + drift;

      return { value: animatedPoint, index };
    });
  }, [trend, animationProgress, wavePhase, prefersReducedMotion]);

  const displayValue = numericValue === null
    ? value
    : new Intl.NumberFormat('en-US').format(animatedValue);
  const delayClass = `metric-delay-${Math.max(0, Math.min(7, animationIndex))}`;
  const tone = metricToneByColor[color] ?? metricToneByColor['#0C4DA2'];

  return (
    <div className={`relative group metric-card-reveal ${delayClass}`}>
      {/* 3D Background Layer */}
      <div className={`absolute inset-0 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity ${tone.glowClass}`} />
      
      {/* Glass Card */}
      <div className="relative h-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <div className="metric-card-sheen" />

        {/* Icon */}
        <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg ${tone.iconClass}`}>
          <div className={`metric-card-orbit ${tone.orbitClass}`} />
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Title */}
        <div className="text-slate-400 text-sm mb-2">{title}</div>

        {/* Value */}
        <div className="text-3xl font-bold text-white mb-4">{displayValue}</div>

        {/* Sparkline */}
        <div className="h-12 -mx-2">
          <ResponsiveContainer width="100%" height={48}>
            <LineChart data={chartData}>
              <Line 
                type="basis" 
                dataKey="value" 
                stroke={color}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}