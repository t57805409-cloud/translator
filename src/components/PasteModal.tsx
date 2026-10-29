import React, { useState } from 'react';
import { X, ClipboardPaste, Check, AlertCircle, FileCode } from 'lucide-react';

interface PasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddJson: (fileName: string, jsonContent: string) => void;
}

export const PasteModal: React.FC<PasteModalProps> = ({
  isOpen,
  onClose,
  onAddJson,
}) => {
  const [fileName, setFileName] = useState('chapter_pasted.json');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleValidateAndAdd = () => {
    setError(null);
    if (!content.trim()) {
      setError('Please enter or paste JSON content.');
      return;
    }

    try {
      JSON.parse(content);
    } catch (e: any) {
      setError(`Invalid JSON syntax: ${e.message}`);
      return;
    }

    let finalName = fileName.trim();
    if (!finalName.endsWith('.json')) {
      finalName += '.json';
    }

    onAddJson(finalName, content);
    setContent('');
    setFileName('chapter_pasted.json');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              Paste JSON Chapter Content
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              File Name / Path
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g. chapters/chapter_01.json"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">
                JSON Code
              </label>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setContent(text);
                  } catch (e) {
                    // Clipboard read may require permission
                  }
                }}
                className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium"
              >
                Paste from Clipboard
              </button>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              placeholder='{\n  "chapter": 1,\n  "title": "...",\n  "verses": [...]\n}'
              className="w-full p-3 font-code text-xs bg-slate-900 text-slate-100 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleValidateAndAdd}
            className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Add Chapter to Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
