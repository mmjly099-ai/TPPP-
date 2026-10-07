import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { TOPSTOREAIAssistant } from './assistant/TOPSTOREAIAssistant';

interface AssistantViewProps {
  onNavigate?: (tab: string) => void;
}

export const AssistantView: React.FC<AssistantViewProps> = ({ onNavigate }) => {
  const { assistantLogs } = useStore();
  const [showLogs, setShowLogs] = useState(false);

  return (
    <div className="space-y-6 font-sans">
      {/* Main AI Analyst Component */}
      <TOPSTOREAIAssistant onNavigateTab={onNavigate} />

      {/* Collapsible History of Prior Operations & Audit Logs */}
      {assistantLogs && assistantLogs.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              <span>سجل الاستعلامات والأوامر السابقة ({assistantLogs.length})</span>
            </div>
            {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showLogs && (
            <div className="mt-4 space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {assistantLogs.map(log => (
                <div
                  key={log.id}
                  className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">« {log.userMessage} »</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleDateString('ar-YE')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="bg-white border border-slate-200 px-2 py-0.5 rounded-md font-medium text-slate-700">
                      الإجراء: {log.action || log.intent}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium">
                      {log.status}
                    </span>
                  </div>

                  {log.result && (
                    <p className="text-slate-600 text-[11px] bg-white p-2.5 rounded-xl border border-slate-100 whitespace-pre-line leading-relaxed">
                      {log.result}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
