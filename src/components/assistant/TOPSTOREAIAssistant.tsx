import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  HelpCircle,
  RefreshCw,
  CheckCircle,
  Layers
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { AIAnalyticsService, AssistantAnswer } from '../../services/aiAnalyticsService';

interface TOPSTOREAIAssistantProps {
  onNavigateTab?: (tab: string) => void;
}

export const TOPSTOREAIAssistant: React.FC<TOPSTOREAIAssistantProps> = ({ onNavigateTab }) => {
  const store = useStore();
  const { data, addAssistantLog } = store;

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string; answer?: AssistantAnswer }>>([
    {
      sender: 'assistant',
      text: 'مرحباً بك! أنا المحلل والمساعد الذكي لنظام TOP STORE. يمكنك سؤالي عن الأرباح، ديون العملاء، حركة المبيعات، تحليل المصروفات، أو الكشف عن أي عمليات غير اعتيادية.'
    }
  ]);

  const service = useMemo(() => new AIAnalyticsService(), []);

  const handleSend = async (queryText?: string) => {
    const text = queryText || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg = text.trim();
    setInputMessage('');
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const answer = await service.processUserQuery(userMsg, data);
      setMessages(prev => [...prev, { sender: 'assistant', text: answer.reply, answer }]);

      if (addAssistantLog) {
        addAssistantLog({
          userMessage: userMsg,
          intent: answer.intent,
          status: 'success',
          result: answer.reply
        });
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { sender: 'assistant', text: 'عذراً، حدث خطأ أثناء تحليل البيانات. يرجى المحاولة مرة أخرى.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    'كم إجمالي المبيعات والأرباح هذا الشهر؟',
    'من هم أكثر 5 عملاء عليهم مديونيات متأخرة؟',
    'ما هي أعلى بنود المصروفات استهلاكاً للسيولة؟',
    'هل توجد أي قيود أو عمليات مشبوهة أو غير متطابقة؟'
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-slate-900 text-white p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h2 className="text-base font-black flex items-center gap-2">
              <span>المحلل المالي والمساعد الذكي</span>
              <span className="text-[10px] bg-purple-500/40 text-purple-200 px-2 py-0.5 rounded-full border border-purple-400/30">
                TOP STORE AI
              </span>
            </h2>
            <p className="text-xs text-purple-200">تحليل فوري دقيق لبيانات المتجر والتدفقات النقدية والديون</p>
          </div>
        </div>
      </div>

      {/* Suggested Quick Questions */}
      <div className="bg-purple-50/50 p-3 border-b border-purple-100 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-bold text-purple-900 shrink-0 flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>أسئلة شائعة:</span>
        </span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="text-[11px] bg-white border border-purple-200 text-purple-800 hover:bg-purple-100/70 hover:border-purple-300 px-3 py-1.5 rounded-xl shrink-0 transition-colors cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="p-4 sm:p-6 space-y-4 max-h-[500px] overflow-y-auto">
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
              className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-amber-500 text-white font-medium rounded-tr-none'
                  : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-none space-y-3'
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>

              {msg.answer?.summaryMetrics && msg.answer.summaryMetrics.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                  {msg.answer.summaryMetrics.map((met, mIdx) => (
                    <div key={mIdx} className="bg-white p-2.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">{met.label}</span>
                      <span className="text-sm font-bold font-mono text-slate-900">{met.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {msg.answer?.suggestedActions && msg.answer.suggestedActions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                  {msg.answer.suggestedActions.map((act, aIdx) => (
                    <button
                      key={aIdx}
                      onClick={() => onNavigateTab && onNavigateTab(act.targetTab)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      <span>{act.label}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  ))}
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
              <span>جاري تحليل البيانات المحاسبية وإعداد الإجابة...</span>
            </div>
          </div>
        )}
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
            placeholder="اسأل المحلل الذكي عن أي رقم أو تقرير مالي أو استفسار محاسبي..."
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
  );
};
