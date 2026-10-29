import React from 'react';
import {
  Languages,
  FolderArchive,
  Sparkles,
  ClipboardPaste,
  Trash2,
  BookOpenCheck,
  CheckCircle2,
  Layers,
  Github,
  GitFork,
} from 'lucide-react';

interface HeaderProps {
  totalFiles: number;
  completedFiles: number;
  isTranslating: boolean;
  onOpenPasteModal: () => void;
  onOpenGlossaryModal: () => void;
  onOpenGitHubModal: () => void;
  onClearAll: () => void;
  onDownloadAllZip: () => void;
  onSelectSample: (sampleId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalFiles,
  completedFiles,
  isTranslating,
  onOpenPasteModal,
  onOpenGlossaryModal,
  onOpenGitHubModal,
  onClearAll,
  onDownloadAllZip,
  onSelectSample,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                JSON Chapter Translator
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Exact Hierarchy Preserved
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Multi-chapter folder translation • English & Arabic to Tamil, Malayalam & more
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Sample preset selector dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200/60"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sample Folders</span>
            </button>
            <div className="absolute right-0 mt-1 w-64 p-2 bg-white rounded-xl shadow-xl border border-slate-200 hidden group-hover:block hover:block z-40 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
                Try Pre-loaded Datasets
              </div>
              <button
                onClick={() => onSelectSample('quran_arabic')}
                className="w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between text-slate-700"
              >
                <div>
                  <div className="font-medium">Holy Quran (Arabic)</div>
                  <div className="text-[11px] text-slate-400">Chapters 1 & 112 → Tamil/Malayalam</div>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">2 files</span>
              </button>
              <button
                onClick={() => onSelectSample('novel_english')}
                className="w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between text-slate-700"
              >
                <div>
                  <div className="font-medium">Novel Book (English)</div>
                  <div className="text-[11px] text-slate-400">2 chapters with scenes & dialogues</div>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">2 files</span>
              </button>
              <button
                onClick={() => onSelectSample('hadith_bilingual')}
                className="w-full text-left px-2.5 py-2 text-xs rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between text-slate-700"
              >
                <div>
                  <div className="font-medium">Hadith Collection</div>
                  <div className="text-[11px] text-slate-400">Arabic & English chapter tradition</div>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">1 file</span>
              </button>
            </div>
          </div>

          <button
            onClick={onOpenGitHubModal}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300 shadow-2xs"
            title="Import or Fork from GitHub URL"
          >
            <Github className="w-3.5 h-3.5 text-slate-800" />
            <span className="font-medium">GitHub Link</span>
          </button>

          <button
            onClick={onOpenPasteModal}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-xs"
            title="Paste raw JSON or chapter contents"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Paste JSON</span>
          </button>

          <button
            onClick={onOpenGlossaryModal}
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-xs"
            title="Custom terms & translation dictionary"
          >
            <BookOpenCheck className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Glossary</span>
          </button>

          {totalFiles > 0 && (
            <>
              <button
                onClick={onDownloadAllZip}
                disabled={completedFiles === 0}
                type="button"
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
                  completedFiles > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
                title="Download all translated chapters in their original folder structure as a ZIP archive"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>
                  Download ZIP <span className="opacity-80">({completedFiles}/{totalFiles})</span>
                </span>
              </button>

              <button
                onClick={onClearAll}
                disabled={isTranslating}
                type="button"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Clear all files"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
