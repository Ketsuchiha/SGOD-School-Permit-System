import { LucideIcon } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend: number[];
  color: string;
}

export function MetricCard({ title, value, icon: Icon, trend, color }: MetricCardProps) {
  const chartData = trend.map((value, index) => ({ value, index }));

  return (
    <div className="relative group">
      {/* 3D Background Layer */}
      <div 
        className="absolute inset-0 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"
        style={{ background: `linear-gradient(135deg, ${color}, transparent)` }}
      />
      
      {/* Glass Card */}
      <div className="relative h-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
        {/* Icon */}
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg"
          style={{ 
            background: `linear-gradient(135deg, ${color}, ${color}80)`,
            boxShadow: `0 8px 24px ${color}40`
          }}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Title */}
        <div className="text-slate-400 text-sm mb-2">{title}</div>

        {/* Value */}
        <div className="text-3xl font-bold text-white mb-4">{value}</div>

        {/* Sparkline */}
        <div className="h-12 -mx-2">
          <ResponsiveContainer width="100%" height={48}>
            <LineChart data={chartData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}