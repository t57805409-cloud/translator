import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  Eye,
  Columns,
  Table as TableIcon,
  FolderTree,
  FileCode,
  ArrowRight,
  Edit2,
  Save,
  Search,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ChapterFile } from '../types/translation';

interface JsonDiffViewerProps {
  file: ChapterFile | null;
  targetLanguage: string;
  sourceLanguage: string;
  onUpdateFileTranslation: (fileId: string, updatedMap: Record<number, string>) => void;
  onRetranslateSpecificItems?: (fileId: string, itemIds: number[]) => Promise<void>;
  onDownloadFile: (file: ChapterFile) => void;
}

export const JsonDiffViewer: React.FC<JsonDiffViewerProps> = ({
  file,
  targetLanguage,
  sourceLanguage,
  onUpdateFileTranslation,
  onRetranslateSpecificItems,
  onDownloadFile,
}) => {
  const [activeTab, setActiveTab] = useState<'diff' | 'table'>('diff');
  const [copied, setCopied] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'untranslated' | 'translated'>('all');
  const [isRetranslating, setIsRetranslating] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');

  if (!file) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs h-full flex flex-col items-center justify-center p-12 text-center text-slate-400">
        <FileCode className="w-12 h-12 mb-3 text-slate-300 stroke-[1.5]" />
        <h4 className="font-semibold text-slate-700 text-sm mb-1">No Chapter Selected</h4>
        <p className="text-xs max-w-sm text-slate-400">
          Upload a chapter folder or click on any chapter from the list to view its structure and translation diff.
        </p>
      </div>
    );
  }

  const untranslatedItems = file.extractedItems.filter(
    (item) => !file.translatedItemsMap?.[item.id] || file.translatedItemsMap[item.id] === item.text
  );

  const handleRetranslateMissing = async () => {
    if (!onRetranslateSpecificItems || untranslatedItems.length === 0) return;
    setIsRetranslating(true);
    try {
      await onRetranslateSpecificItems(file.id, untranslatedItems.map((i) => i.id));
    } finally {
      setIsRetranslating(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = file.translatedRaw || file.rawSource;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = (itemId: number, currentText: string) => {
    setEditingItemId(itemId);
    setEditingValue(currentText);
  };

  const handleSaveEdit = (itemId: number) => {
    if (!file.translatedItemsMap) return;
    const newMap = { ...file.translatedItemsMap, [itemId]: editingValue };
    onUpdateFileTranslation(file.id, newMap);
    setEditingItemId(null);
  };

  // Font class helper based on language
  const getLanguageFontClass = (lang: string) => {
    const l = lang.toLowerCase();
    if (l.includes('arab')) return 'font-arabic text-base leading-relaxed';
    if (l.includes('tamil')) return 'font-tamil';
    if (l.includes('malayalam')) return 'font-malayalam';
    return '';
  };

  const filteredItems = file.extractedItems.filter((item) => {
    const translatedVal = file.translatedItemsMap?.[item.id];
    const isUntranslated = !translatedVal || translatedVal === item.text;

    if (filterMode === 'untranslated' && !isUntranslated) return false;
    if (filterMode === 'translated' && isUntranslated) return false;

    if (!tableSearch) return true;
    const orig = item.text.toLowerCase();
    const trans = (translatedVal || '').toLowerCase();
    const p = item.path.join('.').toLowerCase();
    const s = tableSearch.toLowerCase();
    return orig.includes(s) || trans.includes(s) || p.includes(s);
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col h-full overflow-hidden">
      {/* Top Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-indigo-600 shrink-0" />
          <div className="min-w-0">
            <span className="font-bold text-slate-800 text-sm truncate block">
              {file.name}
            </span>
            <span className="text-[11px] font-mono text-slate-400 block truncate">
              {file.relativePath}
            </span>
          </div>
        </div>

        {/* View mode toggle & Action buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('diff')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'diff'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side JSON</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'table'
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>String Map ({file.extractedItems.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
            title="Copy translated JSON to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy JSON</span>
              </>
            )}
          </button>

          {file.translatedRaw && (
            <button
              type="button"
              onClick={() => onDownloadFile(file)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
              title="Download this translated JSON file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert banner if there are untranslated items */}
      {untranslatedItems.length > 0 && file.translatedRaw && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>{untranslatedItems.length}</strong> of {file.extractedItems.length} strings in this chapter are untranslated or kept as original.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'diff' && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('table');
                  setFilterMode('untranslated');
                }}
                className="text-amber-900 underline hover:text-amber-950 font-medium text-xs"
              >
                Inspect Untranslated
              </button>
            )}
            {onRetranslateSpecificItems && (
              <button
                type="button"
                onClick={handleRetranslateMissing}
                disabled={isRetranslating}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded shadow-2xs transition-colors"
              >
                {isRetranslating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Re-translating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Force Re-translate Missing</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 overflow-hidden min-h-[420px]">
        {activeTab === 'diff' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 h-full divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {/* Left: Original JSON */}
            <div className="flex flex-col h-full overflow-hidden bg-slate-900/95 text-slate-200">
              <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Original JSON ({sourceLanguage})
                </span>
                <span className="text-[10px] font-mono text-slate-400">Read-Only</span>
              </div>
              <div className="flex-1 overflow-auto p-4 font-code text-xs leading-relaxed select-text">
                <pre className={`whitespace-pre-wrap ${getLanguageFontClass(sourceLanguage)}`}>
                  {file.rawSource}
                </pre>
              </div>
            </div>

            {/* Right: Translated JSON */}
            <div className="flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
              <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-semibold">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Translated JSON ({targetLanguage})
                </span>
                <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                  Exact Hierarchy Locked
                </span>
              </div>
              <div className="flex-1 overflow-auto p-4 font-code text-xs leading-relaxed select-text">
                {file.translatedRaw ? (
                  <pre
                    className={`whitespace-pre-wrap text-emerald-300 ${getLanguageFontClass(
                      targetLanguage
                    )}`}
                  >
                    {file.translatedRaw}
                  </pre>
                ) : file.status === 'translating' ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs">Translating strings into {targetLanguage}...</p>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                    <p className="text-xs">
                      Click "Translate" above to generate the translated file.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Table View: Line-by-Line Path and Translation with In-Place Editing */
          <div className="flex flex-col h-full">
            {/* Table Search & Status Filter */}
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-sm">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Filter extracted strings or path..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Status Filter Tabs & Re-translate Button */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      filterMode === 'all'
                        ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({file.extractedItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('untranslated')}
                    className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                      filterMode === 'untranslated'
                        ? 'bg-white text-amber-800 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-amber-800'
                    }`}
                  >
                    <span>Untranslated</span>
                    {untranslatedItems.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                        {untranslatedItems.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('translated')}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      filterMode === 'translated'
                        ? 'bg-white text-emerald-800 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-emerald-800'
                    }`}
                  >
                    Translated ({file.extractedItems.length - untranslatedItems.length})
                  </button>
                </div>

                {onRetranslateSpecificItems && untranslatedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRetranslateMissing}
                    disabled={isRetranslating}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-2xs transition-colors"
                    title="Send only untranslated items to translation engine"
                  >
                    {isRetranslating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Re-translating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Force Re-translate ({untranslatedItems.length})</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold w-16">#</th>
                    <th className="py-2.5 px-3 font-semibold w-48">JSON Path</th>
                    <th className="py-2.5 px-3 font-semibold w-1/3">Original Text</th>
                    <th className="py-2.5 px-3 font-semibold">
                      Translated ({targetLanguage})
                    </th>
                    <th className="py-2.5 px-3 font-semibold w-16 text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    const translatedVal = file.translatedItemsMap?.[item.id] || '';
                    const isEditing = editingItemId === item.id;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{item.id}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-600 truncate max-w-[200px]" title={item.path.join('.')}>
                          {item.path.join('.')}
                        </td>
                        <td className={`py-2.5 px-3 text-slate-800 ${getLanguageFontClass(sourceLanguage)}`}>
                          {item.text}
                        </td>
                        <td className={`py-2.5 px-3 ${getLanguageFontClass(targetLanguage)}`}>
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <textarea
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                rows={2}
                                className="w-full p-1.5 text-xs bg-white border border-indigo-400 rounded-md focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(item.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Save edit"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                            </div>
                          ) : translatedVal ? (
                            <span className="text-slate-900 font-medium">
                              {translatedVal}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic">Not yet translated</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {file.translatedItemsMap && !isEditing && (
                            <button
                              type="button"
                              onClick={() =>
                                handleStartEdit(
                                  item.id,
                                  translatedVal || item.text
                                )
                              }
                              className="text-slate-400 hover:text-indigo-600 p-1"
                              title="Tweak translation manually"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
