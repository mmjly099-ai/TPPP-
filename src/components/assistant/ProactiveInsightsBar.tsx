import React from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ChevronLeft
} from 'lucide-react';
import { InsightItem } from '../../services/aiAnalyticsService';

interface ProactiveInsightsBarProps {
  insights: InsightItem[];
  onNavigateTab: (tab: string) => void;
}

export const ProactiveInsightsBar: React.FC<ProactiveInsightsBarProps> = ({
  insights,
  onNavigateTab
}) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="bg-gradient-to-l from-slate-900 to-[#1A3668] text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-slate-700/60 font-sans">
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <span>ماذا يحدث في TOP STORE؟</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                نبض المتجر الفوري
              </span>
            </h3>
            <p className="text-[11px] text-slate-300 font-medium">
              ملاحظات تحليلية استباقية مبنية على قراءة بيانات المبيعات والسيولة والعملاء
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Proactive Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map(item => {
          let badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
          let icon = <Info className="w-4 h-4 text-blue-400 shrink-0" />;

          if (item.type === 'positive') {
            badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
            icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
          } else if (item.type === 'warning') {
            badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
          } else if (item.type === 'critical') {
            badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
            icon = <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />;
          }

          return (
            <div
              key={item.id}
              className="bg-white/5 hover:bg-white/10 transition-colors p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  {icon}
                  <span className="text-xs font-black text-white">{item.title}</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {item.text}
                </p>
              </div>

              {item.actionLabel && item.actionTab && (
                <div className="pt-2.5 mt-2 border-t border-white/10 flex justify-end">
                  <button
                    onClick={() => onNavigateTab(item.actionTab!)}
                    className="text-[11px] font-bold text-[#C5A059] hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <span>{item.actionLabel}</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
