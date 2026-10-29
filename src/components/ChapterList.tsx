import React, { useState } from 'react';
import {
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Play,
  Download,
  Trash2,
  Search,
  Eye,
  FileCheck,
} from 'lucide-react';
import { ChapterFile } from '../types/translation';

interface ChapterListProps {
  files: ChapterFile[];
  selectedFileId: string | null;
  onSelectFile: (id: string) => void;
  onTranslateFile: (id: string) => void;
  onDownloadFile: (file: ChapterFile) => void;
  onRemoveFile: (id: string) => void;
  isTranslating: boolean;
}

export const ChapterList: React.FC<ChapterListProps> = ({
  files,
  selectedFileId,
  onSelectFile,
  onTranslateFile,
  onDownloadFile,
  onRemoveFile,
  isTranslating,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'error'>('all');

  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.relativePath.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    return f.status === filter;
  });

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col h-full overflow-hidden">
      {/* Header & Filter */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">Loaded Chapters</h3>
            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
              {files.length}
            </span>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 text-[11px] font-medium bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                filter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                filter === 'completed' ? 'bg-white text-emerald-700 shadow-2xs font-semibold' : 'text-slate-500'
              }`}
            >
              Done
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                filter === 'pending' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500'
              }`}
            >
              Pending
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chapters or path..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* File List Scroll Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-[300px] max-h-[550px]">
        {filteredFiles.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No chapter files match your filter.
          </div>
        ) : (
          filteredFiles.map((file) => {
            const isSelected = file.id === selectedFileId;
            return (
              <div
                key={file.id}
                onClick={() => onSelectFile(file.id)}
                className={`p-3 text-xs transition-all cursor-pointer group flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-indigo-50/70 border-l-4 border-indigo-600'
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* Left Info */}
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {/* Status Icon */}
                  <div className="shrink-0 mt-0.5">
                    {file.status === 'completed' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    {file.status === 'translating' && (
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    )}
                    {file.status === 'pending' && (
                      <Clock className="w-4 h-4 text-slate-300" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800 truncate flex items-center gap-1.5">
                      <span className="truncate">{file.name}</span>
                      {file.status === 'completed' && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-mono font-medium">
                          translated
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate font-mono">
                      {file.relativePath !== file.name ? file.relativePath : ''}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{file.extractedItems.length} text items</span>
                      <span>•</span>
                      <span>{formatBytes(file.sizeBytes)}</span>
                      {file.status === 'translating' && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-600 font-medium">
                            {file.progressPercent}%
                          </span>
                        </>
                      )}
                    </div>
                    {file.status === 'error' && file.errorMessage && (
                      <div className="mt-1 text-[10px] text-rose-600" role="alert">
                        {file.errorMessage}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Item Actions */}
                <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                  {file.status === 'completed' ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadFile(file);
                      }}
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                      title="Download translated JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTranslateFile(file.id);
                      }}
                      disabled={isTranslating}
                      className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
                      title="Translate this single file"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(file.id);
                    }}
                    disabled={isTranslating}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    title="Remove from workspace"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
