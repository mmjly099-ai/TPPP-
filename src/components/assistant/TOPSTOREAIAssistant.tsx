import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Wallet,
  Users,
  ShoppingBag,
  Layers,
  ArrowRight,
  Calculator,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { useStore } from '../../context/StoreContext';
import { AIAnalyticsService, AssistantAnswer, InsightItem, AnomalyItem } from '../../services/aiAnalyticsService';
import { ProactiveInsightsBar } from './ProactiveInsightsBar';
import { InteractiveActionModal } from './InteractiveActionModal';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  summaryMetrics?: Array<{ label: string; value: string; color?: string; change?: string }>;
  calculation?: {
    metricName: string;
    formula: string;
    steps: string[];
    finalResult: string;
    timeframe: string;
  };
  chartData?: Array<{ name: string; value: number }>;
  chartType?: 'bar' | 'pie' | 'line';
  chartTitle?: string;
  suggestedActions?: Array<{ label: string; targetTab: string; param?: any }>;
  pendingOperation?: {
    type: 'expense' | 'payment' | 'transfer';
    details: Record<string, any>;
    summaryText: string;
  };
  anomalies?: AnomalyItem[];
}

interface TOPSTOREAIAssistantProps {
  onNavigateTab?: (tab: string) => void;
}

export const TOPSTOREAIAssistant: React.FC<TOPSTOREAIAssistantProps> = ({ onNavigateTab }) => {
  const store = useStore();
  const { data, addExpense } = store;

  // Real-time calculated insights & anomalies
  const proactiveInsights = useMemo(() => AIAnalyticsService.getProactiveInsights(data), [data]);
  const anomalies = useMemo(() => AIAnalyticsService.detectAccountingAnomalies(data), [data]);

  // Initial greeting message
  const initialGreeting = useMemo<ChatMessage>(() => {
    const defaultBrief = AIAnalyticsService.processNaturalQuery('ملخص اليوم', data);
    return {
      id: 'msg-welcome',
      sender: 'assistant',
      text: `مرحباً بك! أنا **TOP STORE AI — المحلل المالي والتجاري** لمتجرك.\n\nأنا متصل مباشرة بقاعدة بياناتك المعتمدة، وأحلل كافة المبيعات والسيولة والطلبات والديون لحظة بلحظة دون أي بيانات وهمية.\n\nإليك ملخص اليوم السريع، ويمكنك سؤالي بأي عبارة طبيعية ترغب بها.`,
      timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
      summaryMetrics: defaultBrief.summaryMetrics,
      suggestedActions: [
        { label: '📊 ملخص اليوم', targetTab: 'assistant', param: 'ملخص اليوم' },
        { label: '💰 كم ربحي؟', targetTab: 'assistant', param: 'كم ربحي؟' },
        { label: '💳 كم معي في المحافظ؟', targetTab: 'assistant', param: 'كم معي؟' },
        { label: '👥 من عليه فلوس؟', targetTab: 'assistant', param: 'من عليه فلوس؟' },
        { label: '⚠️ فحص النظام ماليًا', targetTab: 'assistant', param: 'فحص النظام' },
        { label: '💸 أين تذهب الفلوس؟', targetTab: 'assistant', param: 'أين تذهب الفلوس؟' }
      ]
    };
  }, [data]);

  // Messages state
  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Expanded "How was it calculated" toggles per message
  const [expandedCalcs, setExpandedCalcs] = useState<Record<string, boolean>>({});

  // Active operation pending confirmation modal
  const [pendingOp, setPendingOp] = useState<{
    type: 'expense' | 'payment' | 'transfer';
    details: Record<string, any>;
    summaryText: string;
  } | null>(null);

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Process user message
  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsProcessing(true);

    // Context from previous assistant messages
    const lastAssistantMsg = [...messages].reverse().find(m => m.sender === 'assistant')?.text;

    // Simulate natural analysis time
    setTimeout(() => {
      const answer = AIAnalyticsService.processNaturalQuery(query, data, lastAssistantMsg);

      const botMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: answer.reply,
        timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }),
        summaryMetrics: answer.summaryMetrics,
        calculation: answer.calculation,
        chartData: answer.chartData,
        chartType: answer.chartType,
        chartTitle: answer.chartTitle,
        suggestedActions: answer.suggestedActions,
        pendingOperation: answer.pendingOperation,
        anomalies: answer.anomalies
      };

      setMessages(prev => [...prev, botMsg]);
      setIsProcessing(false);
    }, 350);
  };

  // Confirm pending operation
  const handleConfirmOperation = () => {
    if (!pendingOp) return;
    if (pendingOp.type === 'expense') {
      addExpense({
        category: pendingOp.details.category || 'مصاريف تشغيل',
        amount: pendingOp.details.amount || 0,
        paymentMethod: 'تحويل',
        accountId: pendingOp.details.accountId || 1,
        description: pendingOp.details.description || 'مصروف مسجل عبر TOP STORE AI',
        vendorName: 'معتمد عبر المساعد الذكي'
      });

      // Add bot confirmation message
      const successMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: `✅ **تم تأكيد وتسجيل العملية بنجاح!**\n\nتم خصم مبلغ **${AIAnalyticsService.fmt(pendingOp.details.amount)}** من حساب **${pendingOp.details.accountName}** وتحديث قيود اليومية وميزانية التشغيل فوراً.`,
        timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, successMsg]);
    }
    setPendingOp(null);
  };

  // Helper colors for charts
  const CHART_COLORS = ['#1A3668', '#C5A059', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'];

  return (
    <div className="space-y-5 font-sans" dir="rtl">
      {/* ======================================================== */}
      {/* 1. ASSISTANT TOP HEADER BAR                              */}
      {/* ======================================================== */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1A3668] to-slate-800 text-white flex items-center justify-center shadow-md border border-[#C5A059]/40 shrink-0">
            <Bot className="w-6 h-6 text-[#C5A059]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                TOP STORE AI
              </h1>
              <span className="text-xs font-bold text-[#C5A059] bg-[#1A3668]/5 border border-[#C5A059]/30 px-2 py-0.5 rounded-md">
                المحلل الذكي
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              محلل بيانات مالي وتجاري يقرأ بيانات متجرك الأصلية ويقدم تحليلات دقيقة بدون افتراضات
            </p>
          </div>
        </div>

        {/* Live connection badge and reset chat */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-800">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>متصل ببيانات النظام الحقيقية</span>
          </div>

          <button
            onClick={() => setMessages([initialGreeting])}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="إعادة ضبط المحادثة"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. PROACTIVE INSIGHTS CAROUSEL ("ماذا يحدث في المتجر؟")    */}
      {/* ======================================================== */}
      <ProactiveInsightsBar
        insights={proactiveInsights}
        onNavigateTab={tab => onNavigateTab && onNavigateTab(tab)}
      />

      {/* ======================================================== */}
      {/* 3. AUDIT ANOMALIES WARNING IF ANY ARE PRESENT           */}
      {/* ======================================================== */}
      {anomalies.length > 0 && (
        <div className="bg-rose-50 border border-rose-200/90 rounded-2xl p-3.5 flex items-center justify-between text-xs text-rose-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span className="font-black">تنبيه تدقيق محاسبي:</span>
              <span className="mr-1">
                اكتشف المحلل الذكي {anomalies.length} ملاحظات تحتاج إلى مراجعة توازنها في النظام.
              </span>
            </div>
          </div>
          <button
            onClick={() => handleSendMessage('فحص النظام')}
            className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-colors shrink-0"
          >
            استعراض الملاحظات
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. CHAT MESSAGES FEED CONTAINER                          */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 min-h-[480px] max-h-[620px] flex flex-col justify-between overflow-hidden">
        {/* Scrollable messages container */}
        <div className="overflow-y-auto space-y-4 pr-1 pl-2 mb-4 flex-1">
          {messages.map(msg => {
            const isUser = msg.sender === 'user';
            const isCalcExpanded = expandedCalcs[msg.id];

            return (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed animate-in fade-in duration-200 ${
                  isUser ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    isUser
                      ? 'bg-slate-800 text-white'
                      : 'bg-[#1A3668] text-[#C5A059] border border-[#C5A059]/30'
                  }`}
                >
                  {isUser ? <Users className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                </div>

                {/* Message Bubble Content */}
                <div className={`max-w-[85%] sm:max-w-[78%] space-y-2.5`}>
                  <div
                    className={`p-4 rounded-3xl shadow-xs space-y-3 ${
                      isUser
                        ? 'bg-[#1A3668] text-white rounded-tr-none'
                        : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-none'
                    }`}
                  >
                    {/* Text Body */}
                    <div className="whitespace-pre-line leading-relaxed font-medium">
                      {msg.text}
                    </div>

                    {/* Metric Highlights Cards (if present) */}
                    {msg.summaryMetrics && msg.summaryMetrics.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/60">
                        {msg.summaryMetrics.map((m, idx) => (
                          <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                            <span className="text-[10px] text-slate-500 block font-medium">{m.label}</span>
                            <span className={`text-xs sm:text-sm font-black font-mono block mt-0.5 ${m.color || 'text-slate-900'}`}>
                              {m.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Interactive Charts (if present) */}
                    {msg.chartData && msg.chartData.length > 0 && (
                      <div className="bg-white p-3 rounded-2xl border border-slate-200 mt-2 space-y-2">
                        {msg.chartTitle && (
                          <div className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5 text-[#C5A059]" />
                            <span>{msg.chartTitle}</span>
                          </div>
                        )}
                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            {msg.chartType === 'pie' ? (
                              <PieChart>
                                <Tooltip
                                  formatter={(val: any) => [AIAnalyticsService.fmt(Number(val)), 'القيمة']}
                                  contentStyle={{ direction: 'rtl', borderRadius: '12px', fontSize: '11px' }}
                                />
                                <Pie
                                  data={msg.chartData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={65}
                                  innerRadius={30}
                                  paddingAngle={4}
                                >
                                  {msg.chartData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                              </PieChart>
                            ) : (
                              <BarChart data={msg.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip
                                  formatter={(val: any) => [AIAnalyticsService.fmt(Number(val)), 'المبلغ']}
                                  contentStyle={{ direction: 'rtl', borderRadius: '12px', fontSize: '11px' }}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                  {msg.chartData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* "كيف حسبته؟" Equation Drawer */}
                    {msg.calculation && (
                      <div className="pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCalcs(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))
                          }
                          className="text-[11px] font-bold text-[#1A3668] hover:text-[#C5A059] flex items-center gap-1.5 transition-colors cursor-pointer select-none"
                        >
                          <Calculator className="w-3.5 h-3.5 text-[#C5A059]" />
                          <span>كيف تم حساب هذا الرقم؟ ({msg.calculation.metricName})</span>
                          {isCalcExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isCalcExpanded && (
                          <div className="mt-2 p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 text-[11px] text-slate-700 animate-in fade-in duration-150">
                            <div>
                              <span className="font-bold text-slate-900">المعادلة المحاسبية المعتمدة:</span>
                              <div className="font-mono text-[10px] bg-slate-50 p-1.5 rounded-lg border border-slate-200 mt-0.5 text-slate-800">
                                {msg.calculation.formula}
                              </div>
                            </div>
                            <div className="space-y-0.5 pt-1">
                              <span className="font-bold text-slate-900">خطوات الحساب من قاعدة البيانات:</span>
                              {msg.calculation.steps.map((st, i) => (
                                <div key={i} className="text-slate-600 font-mono text-[10px]">
                                  • {st}
                                </div>
                              ))}
                            </div>
                            <div className="pt-1 font-black text-emerald-800">
                              النتيجة المعتمدة: {msg.calculation.finalResult} ({msg.calculation.timeframe})
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pending Operation Action Confirmation Box */}
                    {msg.pendingOperation && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-2 mt-2">
                        <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span>هل تريد اعتماد وحفظ هذه العملية في دفاتر النظام الآن؟</span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setPendingOp(msg.pendingOperation!)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تأكيد العملية</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const cancelMsg: ChatMessage = {
                                id: `assistant-${Date.now()}`,
                                sender: 'assistant',
                                text: 'تم إلغاء الأمر دون إجراء أي تعديل على الحسابات.',
                                timestamp: new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })
                              };
                              setMessages(prev => [...prev, cancelMsg]);
                            }}
                            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suggested Navigation Actions below bubble */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggestedActions.map((act, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (act.targetTab === 'assistant' && act.param) {
                              handleSendMessage(act.param);
                            } else if (onNavigateTab) {
                              onNavigateTab(act.targetTab);
                            }
                          }}
                          className="text-[11px] font-bold bg-white hover:bg-slate-100 text-[#1A3668] border border-slate-300/80 px-2.5 py-1 rounded-xl shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>{act.label}</span>
                          <ArrowRight className="w-3 h-3 text-[#C5A059]" />
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 block px-1">{msg.timestamp}</span>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isProcessing && (
            <div className="flex gap-3 text-xs animate-in fade-in duration-150">
              <div className="w-9 h-9 rounded-2xl bg-[#1A3668] text-[#C5A059] flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-5 h-5 animate-spin" />
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl rounded-tl-none text-slate-500 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1A3668] animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] mr-1">المحلل الذكي يقرأ ويدقق بيانات المتجر...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ======================================================== */}
        {/* 5. QUICK SHORTCUT CHIPS                                  */}
        {/* ======================================================== */}
        <div className="pt-2 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] text-slate-400 font-bold shrink-0 ml-1">استفسارات شائعة:</span>
            {[
              { label: '📊 ملخص اليوم', query: 'ملخص اليوم' },
              { label: '💰 كم ربحي؟', query: 'كم ربحي هذا الشهر؟' },
              { label: '💳 كم معي في المحافظ؟', query: 'كم معي الآن؟' },
              { label: '👥 من عليه فلوس؟', query: 'من عليه فلوس؟' },
              { label: '📦 تحليل الطلبات', query: 'تحليل الطلبات' },
              { label: '⚠️ فحص النظام ماليًا', query: 'فحص النظام' },
              { label: '💸 أين تذهب الفلوس؟', query: 'أين تذهب الفلوس؟' },
              { label: '👥 أكبر العملاء', query: 'أكبر العملاء' }
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip.query)}
                className="whitespace-nowrap px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-[#1A3668] hover:text-white text-slate-700 text-[11px] font-bold transition-all shrink-0 cursor-pointer shadow-2xs"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* ======================================================== */}
          {/* 6. INPUT TEXTAREA & SEND ACTION                          */}
          {/* ======================================================== */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="اسألني عن مبيعاتك، أرباحك، مصروفاتك، أرصدة المحافظ، أو اكتب أمراً كـ (أضف مصروف)..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#1A3668] focus:bg-white focus:outline-none transition-all"
              />
              <Sparkles className="w-4 h-4 text-[#C5A059] absolute left-3 top-3.5 pointer-events-none" />
            </div>

            <button
              type="submit"
              disabled={!inputValue.trim() || isProcessing}
              className="px-5 py-3 bg-[#1A3668] hover:bg-[#112952] disabled:opacity-50 text-white rounded-2xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <span>إرسال</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Confirmation Modal for interactive actions */}
      <InteractiveActionModal
        isOpen={!!pendingOp}
        operation={pendingOp}
        onClose={() => setPendingOp(null)}
        onConfirm={handleConfirmOperation}
      />
    </div>
  );
};
