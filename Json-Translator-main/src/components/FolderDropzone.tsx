import React, { useRef, useState } from 'react';
import {
  FolderUp,
  FileJson,
  UploadCloud,
  Sparkles,
  ClipboardPaste,
  ShieldCheck,
  CheckCircle,
  FolderTree,
  Github,
} from 'lucide-react';

interface FolderDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  onSelectSample: (sampleId: string) => void;
  onOpenPasteModal: () => void;
  onOpenGitHubModal: () => void;
  compact?: boolean;
}

export const FolderDropzone: React.FC<FolderDropzoneProps> = ({
  onFilesSelected,
  onSelectSample,
  onOpenPasteModal,
  onOpenGitHubModal,
  compact = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    const filesList: File[] = [];

    // Helper to read directory recursively via FileSystemEntry
    async function traverseFileTree(item: any, path = ''): Promise<void> {
      if (item.isFile) {
        return new Promise<void>((resolve) => {
          item.file((file: File) => {
            if (file.name.endsWith('.json')) {
              // Inject relativePath property if missing
              Object.defineProperty(file, 'webkitRelativePath', {
                value: path ? `${path}/${file.name}` : file.name,
                writable: true,
              });
              filesList.push(file);
            }
            resolve();
          });
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        const readEntries = async (): Promise<any[]> => {
          return new Promise((resolve) => {
            dirReader.readEntries((entries: any[]) => resolve(entries));
          });
        };

        let entries = await readEntries();
        while (entries.length > 0) {
          for (const entry of entries) {
            await traverseFileTree(entry, path ? `${path}/${item.name}` : item.name);
          }
          entries = await readEntries();
        }
      }
    }

    const promises: Promise<void>[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) {
        promises.push(traverseFileTree(entry));
      } else {
        const file = items[i].getAsFile();
        if (file && file.name.endsWith('.json')) {
          filesList.push(file);
        }
      }
    }

    await Promise.all(promises);

    if (filesList.length > 0) {
      onFilesSelected(filesList);
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).filter((f) => f.name.endsWith('.json'));
      onFilesSelected(filesArray);
      e.target.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).filter((f) => f.name.endsWith('.json'));
      onFilesSelected(filesArray);
      e.target.value = '';
    }
  };

  if (compact) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-3 rounded-xl border border-dashed transition-all duration-200 flex items-center justify-between gap-3 ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-slate-400 bg-white/70'
        }`}
      >
        {/* Hidden inputs */}
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={handleFolderChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex items-center gap-2 text-xs text-slate-600">
          <FolderTree className="w-4 h-4 text-indigo-600" />
          <span>Add more chapters or nested folders</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenGitHubModal}
            className="px-2.5 py-1 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-2xs flex items-center gap-1.5"
          >
            <Github className="w-3.5 h-3.5 text-slate-800" />
            <span>GitHub Link</span>
          </button>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-1.5"
          >
            <FolderUp className="w-3.5 h-3.5 text-indigo-600" />
            <span>Folder</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs flex items-center gap-1.5"
          >
            <FileJson className="w-3.5 h-3.5 text-sky-600" />
            <span>Files</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ backgroundColor: '#e7ffe9' }}
      className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 p-8 sm:p-12 text-center shadow-sm ${
        isDragOver
          ? 'border-indigo-600 ring-4 ring-indigo-50'
          : 'border-slate-300 hover:border-indigo-400'
      }`}
    >
      {/* Hidden inputs */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={handleFolderChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hero Icon */}
      <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-50 to-sky-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
        <FolderUp className="w-8 h-8" />
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
        Drop your Chapter Folder or JSON Files here
      </h2>
      <p className="text-sm text-slate-500 max-w-xl mx-auto mb-6">
        Drop an entire folder with multiple chapters or standalone <code className="text-indigo-600 font-mono text-xs bg-indigo-50 px-1.5 py-0.5 rounded">.json</code> files.
        Exact nested hierarchies, keys, data types, and formatting will be preserved 100%.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <button
          type="button"
          onClick={onOpenGitHubModal}
          style={{ backgroundColor: '#205931', color: '#afffd5' }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all hover:scale-[1.02] hover:opacity-95"
        >
          <Github className="w-4 h-4 text-[#afffd5]" />
          <span>Import from GitHub Link</span>
        </button>

        <button
          type="button"
          onClick={() => folderInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-100 transition-all hover:scale-[1.02]"
        >
          <FolderUp className="w-4 h-4" />
          <span>Upload Chapter Folder</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-300 shadow-xs transition-all hover:border-slate-400"
        >
          <FileJson className="w-4 h-4 text-sky-600" />
          <span>Select JSONs</span>
        </button>

        <button
          type="button"
          onClick={onOpenPasteModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all"
        >
          <ClipboardPaste className="w-4 h-4 text-slate-500" />
          <span>Paste Raw JSON</span>
        </button>
      </div>

      {/* Feature highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-6 border-t border-slate-100 text-left">
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-slate-800">100% Hierarchy Lock</div>
            <div className="text-[11px] text-slate-500">Every key name and object depth is untampered</div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-slate-800">English & Arabic Native</div>
            <div className="text-[11px] text-slate-500">Handles RTL, classical Arabic, verses & novels</div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-slate-800">Tamil & Malayalam Focused</div>
            <div className="text-[11px] text-slate-500">Authentic regional grammar, tone & script</div>
          </div>
        </div>
      </div>

      {/* Quick sample prompt */}
      <div className="mt-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100/80 text-xs text-indigo-700">
        <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
        <span>Don't have files ready? Try the sample:</span>
        <button
          onClick={() => onSelectSample('quran_arabic')}
          className="font-bold underline hover:text-indigo-900"
        >
          Quran (Arabic)
        </button>
        <span>or</span>
        <button
          onClick={() => onSelectSample('novel_english')}
          className="font-bold underline hover:text-indigo-900"
        >
          Novel (English)
        </button>
      </div>
    </div>
  );
};
