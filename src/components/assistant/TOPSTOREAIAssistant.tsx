import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Database,
  ChevronDown,
  ChevronUp,
  CheckCircle2
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { AIAnalyticsService, AssistantAnswer } from '../../services/aiAnalyticsService';
import { buildComprehensiveStoreSnapshot, LiveStoreInputs } from '../../services/systemSnapshotBuilder';
import { ProactiveInsightsBar } from './ProactiveInsightsBar';
import { InteractiveActionModal } from './InteractiveActionModal';

interface TOPSTOREAIAssistantProps {
  onNavigateTab?: (tab: string) => void;
}

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  answer?: AssistantAnswer;
}

const renderCleanFormattedText = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  return lines.map((line, lIdx) => {
    // Parse **bold** segments cleanly without leaving raw asterisks
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <React.Fragment key={lIdx}>
        {parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return (
              <strong key={pIdx} className="font-black text-slate-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <React.Fragment key={pIdx}>{part}</React.Fragment>;
        })}
        {lIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};

export const TOPSTOREAIAssistant: React.FC<TOPSTOREAIAssistantProps> = ({ onNavigateTab }) => {
  const store = useStore();
  const {
    data,
    accounts,
    customers,
    orders,
    payments,
    expenses,
    shipments,
    transactions,
    journalEntries,
    otherReceivables,
    owners,
    purchaseBatches,
    installmentPlans,
    couriers,
    deliveryOrders,
    courierSettlements,
    deliveryCashCollections,
    workers,
    marketingCampaigns,
    marketingChannels,
    discountCodes,
    marketingStats,
    fiscalPeriods,
    fiscalYears,
    auditLogs,
    settings,
    getAccountBalance,
    getCustomerBalance,
    totalCashAndBanks,
    totalCustomerDebts,
    totalReceivables,
    totalExpenses,
    lastSyncTime,
    realtimeStatus,
    addAssistantLog,
    addExpense,
    showNotification
  } = store;

  const liveInputs: LiveStoreInputs = useMemo(
    () => ({
      data,
      accounts,
      customers,
      orders,
      payments,
      expenses,
      shipments,
      transactions,
      journalEntries,
      otherReceivables,
      owners,
      purchaseBatches,
      installmentPlans,
      couriers,
      deliveryOrders,
      courierSettlements,
      deliveryCashCollections,
      workers,
      marketingCampaigns,
      marketingChannels,
      discountCodes,
      marketingStats,
      fiscalPeriods,
      fiscalYears,
      auditLogs,
      settings,
      getAccountBalance,
      getCustomerBalance,
      totalCashAndBanks,
      totalCustomerDebts,
      totalReceivables,
      totalExpenses,
      lastSyncTime,
      realtimeStatus
    }),
    [
      data,
      accounts,
      customers,
      orders,
      payments,
      expenses,
      shipments,
      transactions,
      journalEntries,
      otherReceivables,
      owners,
      purchaseBatches,
      installmentPlans,
      couriers,
      deliveryOrders,
      courierSettlements,
      deliveryCashCollections,
      workers,
      marketingCampaigns,
      marketingChannels,
      discountCodes,
      marketingStats,
      fiscalPeriods,
      fiscalYears,
      auditLogs,
      settings,
      getAccountBalance,
      getCustomerBalance,
      totalCashAndBanks,
      totalCustomerDebts,
      totalReceivables,
      totalExpenses,
      lastSyncTime,
      realtimeStatus
    ]
  );

  // Live synced insights recomputed automatically on any store mutation
  const liveInsights = useMemo(() => {
    const snap = buildComprehensiveStoreSnapshot(liveInputs);
    return AIAnalyticsService.getProactiveInsightsFromSnapshot(snap);
  }, [liveInputs]);

  const initialGreeting: ChatMessage = {
    sender: 'assistant',
    text:
      'مرحباً بك! أنا المحلل والمساعد الذكي الشامل لنظام TOP STORE.\n' +
      'أنا مربوط ومتزامن تلقائياً مع كافة بيانات النظام (الطلبات، العملاء والذمم، المحافظ والبنوك، المصروفات، الشحنات، الموصلين، العمال، دفعات الشراء، التسويق، والقيود المحاسبية) لتقديم أرقام دقيقة 100%.'
  };

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPulseBar, setShowPulseBar] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<AssistantAnswer['pendingOperation'] | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const service = useMemo(() => new AIAnalyticsService(), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, isLoading]);

  const handleSend = async (queryText?: string) => {
    const text = queryText ?? inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg = text.trim();
    if (!queryText) setInputMessage('');

    const historyForModel = messages.slice(-6).map(m => ({ sender: m.sender, text: m.text }));
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const answer = await service.processUserQuery(userMsg, liveInputs, historyForModel);
      setMessages(prev => [...prev, { sender: 'assistant', text: answer.reply, answer }]);

      if (answer.pendingOperation) {
        setPendingAction(answer.pendingOperation);
      }

      if (addAssistantLog) {
        addAssistantLog({
          userMessage: userMsg,
          intent: answer.intent,
          action: answer.engineSource === 'gemini' ? 'تحليل ذكي (Gemini)' : 'تحليل محاسبي مباشر',
          status: 'success',
          result: answer.reply
        });
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: 'تعذر إتمام الطلب مؤقتاً. يرجى المحاولة مرة أخرى أو اختيار أحد الأسئلة السريعة بالأسفل.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPendingAction = () => {
    if (!pendingAction) return;
    if (pendingAction.type === 'expense') {
      const d = pendingAction.details;
      addExpense({
        category: d.category || 'مصاريف تشغيل',
        amount: Number(d.amount) || 0,
        accountId: Number(d.accountId) || accounts[0]?.id || 1,
        description: d.description || 'مصروف مسجل عبر المساعد الذكي',
        vendorName: 'المساعد الذكي'
      });
      showNotification('تم تسجيل المصروف وترحيل قيده المحاسبي بنجاح', 'success');
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: `تم تنفيذ واعتماد العملية بنجاح: ${pendingAction.summaryText}، وتحديث أرصدة الحسابات ودفتر اليومية تلقائياً.`
        }
      ]);
    }
    setPendingAction(null);
  };

  const handleCopyText = (text: string, idx: number) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1800);
    }
  };

  const sampleQuestions = [
    'اعطني تقرير شامل 360 عن وضع المتجر بالكامل الآن',
    'كم إجمالي المبيعات وصافي الربح وهل الشهر هذا أفضل من الماضي؟',
    'كم عند العملاء لنا وكم لهم عندنا ومن هم أكبر المدينين؟',
    'كم السيولة المتاحة في كل الصناديق والمحافظ وبطاقات الفيزا؟',
    'حلل لي المصروفات بالكامل وأين تذهب الفلوس؟',
    'ما هو وضع الموصلين والعهد والشحنات ودفعات الشراء؟',
    'اعرض لي مصروفات العمال ومؤشرات التسويق',
    'افحص النظام محاسبياً بالكامل هل توجد أخطاء أو فروقات مطابقة؟'
  ];

  return (
    <div className="space-y-4">
      {/* Collapsible Live Proactive Store Pulse */}
      {liveInsights.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPulseBar(prev => !prev)}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
              <span>نبض المتجر المباشر (مؤشرات حية متزامنة تلقائياً)</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                {liveInsights.length} مؤشرات
              </span>
            </div>
            {showPulseBar ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          {showPulseBar && (
            <div className="p-3 pt-0">
              <ProactiveInsightsBar
                insights={liveInsights}
                onNavigateTab={tab => onNavigateTab && onNavigateTab(tab)}
              />
            </div>
          )}
        </div>
      )}

      {/* Main Chat Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-slate-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-black flex items-center gap-2 flex-wrap">
                <span>المحلل المالي والمساعد الذكي الشامل</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded-md border border-emerald-400/30 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  <span>متزامن 100%</span>
                </span>
              </h2>
              <p className="text-[11px] text-purple-200 mt-0.5">
                {customers.length} عميل • {orders.length} طلب • {expenses.length} مصروف • {accounts.length} حساب مالي
              </p>
            </div>
          </div>

          {messages.length > 1 && (
            <button
              type="button"
              onClick={() => setMessages([initialGreeting])}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/15 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>محادثة جديدة</span>
            </button>
          )}
        </div>

        {/* Quick Comprehensive Questions */}
        <div className="bg-purple-50/50 p-3 border-b border-purple-100 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-purple-900 shrink-0 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            <span>استعلامات سريعة:</span>
          </span>
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(q)}
              disabled={isLoading}
              className="text-[11px] bg-white border border-purple-200 text-purple-900 hover:bg-purple-100/70 hover:border-purple-300 disabled:opacity-50 px-3 py-1.5 rounded-xl shrink-0 transition-colors cursor-pointer font-medium"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[540px] overflow-y-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-amber-500 text-white'
                    : 'bg-purple-100 text-purple-700 border border-purple-200'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              <div
                className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-amber-500 text-white font-medium rounded-tr-none'
                    : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-none space-y-3'
                }`}
              >
                <div className="leading-relaxed">{renderCleanFormattedText(msg.text)}</div>

                {msg.answer?.summaryMetrics && msg.answer.summaryMetrics.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                    {msg.answer.summaryMetrics.map((met, mIdx) => (
                      <div key={mIdx} className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">{met.label}</span>
                        <span className={`text-xs sm:text-sm font-black font-mono ${met.color || 'text-slate-900'}`}>
                          {met.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {msg.answer?.suggestedActions && msg.answer.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                    {msg.answer.suggestedActions.map((act, aIdx) => (
                      <button
                        key={aIdx}
                        type="button"
                        onClick={() => onNavigateTab && onNavigateTab(act.targetTab)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        <span>{act.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                )}

                {msg.sender === 'assistant' && idx > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>
                        {msg.answer?.notice ||
                          (msg.answer?.engineSource === 'gemini'
                            ? 'تحليل ذكي مربوط ببيانات النظام اللحظية'
                            : 'بيانات محاسبية موثقة من النظام')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyText(msg.text, idx)}
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedIdx === idx ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center animate-pulse">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-slate-100 text-slate-600 rounded-2xl px-4 py-3 text-xs flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
                <span>جاري قراءة كافة سجلات النظام وتحليل الأرقام بدقة 100%...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              placeholder="اسأل عن أي عميل، طلب، ربح، مصروف، محفظة، موصّل، عامل، شحنة، أو اطلب فحصاً محاسبياً..."
              className="flex-1 px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-2xl focus:outline-hidden focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>إرسال</span>
              <Send className="w-3.5 h-3.5 rotate-180" />
            </button>
          </form>
        </div>
      </div>

      {/* Confirmation Modal for AI-assisted accounting operations */}
      <InteractiveActionModal
        isOpen={Boolean(pendingAction)}
        operation={pendingAction || null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirmPendingAction}
      />
    </div>
  );
};
