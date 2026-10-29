import React, { useState } from 'react';
import { X, BookOpenCheck, Plus, Trash2, Check } from 'lucide-react';

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  glossary: Record<string, string>;
  onUpdateGlossary: (updated: Record<string, string>) => void;
  targetLanguage: string;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({
  isOpen,
  onClose,
  glossary,
  onUpdateGlossary,
  targetLanguage,
}) => {
  const [sourceTerm, setSourceTerm] = useState('');
  const [targetTerm, setTargetTerm] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!sourceTerm.trim() || !targetTerm.trim()) return;
    const updated = {
      ...glossary,
      [sourceTerm.trim()]: targetTerm.trim(),
    };
    onUpdateGlossary(updated);
    setSourceTerm('');
    setTargetTerm('');
  };

  const handleRemove = (key: string) => {
    const updated = { ...glossary };
    delete updated[key];
    onUpdateGlossary(updated);
  };

  const entries = Object.entries(glossary);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Custom Translation Glossary
              </h3>
              <p className="text-[11px] text-slate-500">
                Enforce exact vocabulary translations for specialized, religious, or literary names in {targetLanguage}.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto text-xs">
          {/* Add input row */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <span className="font-semibold text-slate-700">Add New Term Rule</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={sourceTerm}
                onChange={(e) => setSourceTerm(e.target.value)}
                placeholder="Source Term (e.g. Sustainer / الرحمن)"
                className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="self-center font-bold text-slate-300">→</span>
              <input
                type="text"
                value={targetTerm}
                onChange={(e) => setTargetTerm(e.target.value)}
                placeholder={`Target in ${targetLanguage}`}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <button
                type="button"
                onClick={handleAdd}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* List of active terms */}
          <div className="space-y-1.5">
            <div className="text-slate-500 font-medium">Active Terms ({entries.length})</div>
            {entries.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No glossary terms added yet. Words will be translated with natural contextual intelligence.
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {entries.map(([src, tgt]) => (
                  <div
                    key={src}
                    className="flex items-center justify-between p-2.5 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{src}</span>
                      <span className="text-slate-300">→</span>
                      <span className="font-semibold text-indigo-700">{tgt}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(src)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Remove term"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
