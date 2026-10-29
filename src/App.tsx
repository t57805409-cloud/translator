import React, { useState, useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { Header } from './components/Header';
import { FolderDropzone } from './components/FolderDropzone';
import { TranslationControls } from './components/TranslationControls';
import { ChapterList } from './components/ChapterList';
import { JsonDiffViewer } from './components/JsonDiffViewer';
import { PasteModal } from './components/PasteModal';
import { GlossaryModal } from './components/GlossaryModal';
import { GitHubModal } from './components/GitHubModal';
import {
  ChapterFile,
  TranslationSettings,
  TranslationStat,
} from './types/translation';
import {
  detectIndentation,
  extractTranslatableStrings,
  rebuildTranslatedJson,
  chunkArray,
  createSmartChunks,
} from './utils/jsonProcessor';
import { SAMPLE_FOLDERS } from './utils/sampleDatasets';

function validateTranslationResponse(
  translations: Array<{ id: string | number; translated: string }> | undefined,
  expectedItems: Array<{ id: number }>
): Record<number, string> {
  if (!Array.isArray(translations)) {
    throw new Error('Translation service returned an invalid response.');
  }

  const expectedIds = new Set(expectedItems.map((item) => item.id));
  const result: Record<number, string> = {};

  for (const translation of translations) {
    if (!translation || typeof translation !== 'object') {
      throw new Error('Translation service returned an invalid item.');
    }
    const id = Number(translation.id);
    if (
      !Number.isInteger(id) ||
      !expectedIds.has(id) ||
      typeof translation.translated !== 'string' ||
      !translation.translated.trim() ||
      result[id] !== undefined
    ) {
      throw new Error('Translation service returned invalid or duplicate items.');
    }
    result[id] = translation.translated;
  }

  if (Object.keys(result).length !== expectedIds.size) {
    throw new Error('Translation service did not translate every item in the batch.');
  }

  return result;
}

const DEFAULT_SETTINGS: TranslationSettings = {
  sourceLanguage: 'Auto-detect',
  targetLanguage: 'Tamil',
  contextTone: 'Scripture & Religious Texts',
  excludedKeys: [
    'id',
    '_id',
    'url',
    'audio_url',
    'slug',
  ],
  preserveNumbersAndDates: true,
  concurrencyLimit: 2,
  batchChunkSize: 40,
  customGlossary: {},
};

export default function App() {
  const [files, setFiles] = useState<ChapterFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [settings, setSettings] = useState<TranslationSettings>(DEFAULT_SETTINGS);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isGlossaryModalOpen, setIsGlossaryModalOpen] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);

  // Cancellation ref for cleanly halting in-flight operations
  const stopRequestedRef = useRef(false);

  // Auto-select first file if none selected
  useEffect(() => {
    if (files.length > 0 && !selectedFileId) {
      setSelectedFileId(files[0].id);
    }
  }, [files, selectedFileId]);

  // Compute statistics
  const stats: TranslationStat = {
    totalFiles: files.length,
    completedFiles: files.filter((f) => f.status === 'completed').length,
    inProgressFiles: files.filter((f) => f.status === 'translating').length,
    failedFiles: files.filter((f) => f.status === 'error').length,
    totalStrings: files.reduce((acc, f) => acc + f.extractedItems.length, 0),
    translatedStrings: files.reduce((acc, f) => {
      if (f.status === 'completed') return acc + f.extractedItems.length;
      if (f.translatedItemsMap) {
        return acc + Object.keys(f.translatedItemsMap).length;
      }
      return acc;
    }, 0),
  };

  /**
   * Parses and registers raw JSON files into state
   */
  const processIncomingFiles = useCallback(
    (newFilesList: Array<{ name: string; relativePath: string; content: string }>) => {
      const parsedFiles: ChapterFile[] = [];

      for (const item of newFilesList) {
        try {
          const parsed = JSON.parse(item.content);
          const indent = detectIndentation(item.content);
          const { items } = extractTranslatableStrings(parsed, {
            excludedKeys: settings.excludedKeys,
            preserveNumbersAndDates: settings.preserveNumbersAndDates,
          });

          parsedFiles.push({
            id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            name: item.name,
            relativePath: item.relativePath || item.name,
            sizeBytes: new Blob([item.content]).size,
            rawSource: item.content,
            parsedSource: parsed,
            indentation: indent,
            extractedItems: items,
            status: 'pending',
            progressPercent: 0,
            translatedItemsMap: {},
          });
        } catch (err: any) {
          console.error(`Failed to parse ${item.name}:`, err);
        }
      }

      if (parsedFiles.length > 0) {
        setFiles((prev) => {
          // Merge avoiding exact duplicates by relativePath
          const existingPaths = new Set(prev.map((f) => f.relativePath));
          const filteredNew = parsedFiles.filter((f) => !existingPaths.has(f.relativePath));
          return [...prev, ...filteredNew];
        });

        if (!selectedFileId && parsedFiles.length > 0) {
          setSelectedFileId(parsedFiles[0].id);
        }
      }
    },
    [settings.excludedKeys, settings.preserveNumbersAndDates, selectedFileId]
  );

  /**
   * Handles File[] from dropzone or inputs
   */
  const handleFilesSelected = async (fileList: File[]) => {
    const loaded: Array<{ name: string; relativePath: string; content: string }> = [];

    for (const f of fileList) {
      try {
        const text = await f.text();
        const relPath =
          // @ts-ignore
          f.webkitRelativePath || f.relativePath || f.name;
        loaded.push({
          name: f.name,
          relativePath: relPath,
          content: text,
        });
      } catch (err) {
        console.error(`Error reading file ${f.name}:`, err);
      }
    }

    processIncomingFiles(loaded);
  };

  /**
   * Load Sample Chapter Folders
   */
  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_FOLDERS.find((s) => s.id === sampleId);
    if (!sample) return;

    setSettings((prev) => ({
      ...prev,
      sourceLanguage: sample.defaultSourceLang,
      targetLanguage: sample.defaultTargetLang,
      contextTone: sample.defaultContext,
    }));

    const sampleFiles = sample.files.map((f) => ({
      name: f.name,
      relativePath: f.relativePath,
      content: f.content,
    }));

    // Replace or add sample files
    setFiles([]);
    processIncomingFiles(sampleFiles);
  };

  /**
   * Handle pasting JSON
   */
  const handleAddJson = (fileName: string, jsonContent: string) => {
    processIncomingFiles([
      {
        name: fileName,
        relativePath: fileName,
        content: jsonContent,
      },
    ]);
  };

  /**
   * Translates a single chapter file with chunking
   */
  const translateSingleFile = async (
    fileToTranslate: ChapterFile,
    currentSettings: TranslationSettings
  ): Promise<boolean> => {
    if (fileToTranslate.extractedItems.length === 0) {
      // No translatable strings, mark completed directly
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileToTranslate.id
            ? {
                ...f,
                translatedRaw: f.rawSource,
                translatedParsed: f.parsedSource,
                status: 'completed',
                progressPercent: 100,
              }
            : f
        )
      );
      return true;
    }

    // Set status to translating
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileToTranslate.id
          ? { ...f, status: 'translating', progressPercent: 0, errorMessage: undefined }
          : f
      )
    );

    // Use smart chunking (limits item count and character size to prevent token truncation)
    const chunkSizeLimit = Math.min(20, currentSettings.batchChunkSize || 20);
    const chunks = createSmartChunks(fileToTranslate.extractedItems, chunkSizeLimit, 1600);
    const translationsMap: Record<number, string> = {
      ...(fileToTranslate.translatedItemsMap || {}),
    };

    let processedCount = 0;

    for (let c = 0; c < chunks.length; c++) {
      if (stopRequestedRef.current) {
        return false;
      }

      const chunk = chunks[c];
      let chunkSuccess = false;
      let chunkError = 'Translation request failed.';

      // Attempt up to 2 times on client side
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await fetch('/api/translate-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: chunk.map((i) => ({ id: i.id, path: i.path.join('.'), text: i.text })),
              sourceLanguage: currentSettings.sourceLanguage,
              targetLanguage: currentSettings.targetLanguage,
              context: currentSettings.contextTone,
              glossary: currentSettings.customGlossary,
            }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();
          if (data.success !== true) {
            throw new Error(data.error || 'Translation service reported a failure.');
          }
          Object.assign(
            translationsMap,
            validateTranslationResponse(data.translations, chunk)
          );

          chunkSuccess = true;
          break;
        } catch (err: any) {
          chunkError = err instanceof Error ? err.message : String(err);
          console.warn(`Chunk ${c + 1}/${chunks.length} attempt ${attempt} warning:`, err);
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }

      if (!chunkSuccess) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileToTranslate.id
              ? {
                  ...f,
                  status: 'error',
                  translatedItemsMap: { ...translationsMap },
                  errorMessage: `Translation failed for batch ${c + 1}/${chunks.length}: ${chunkError}`,
                }
              : f
          )
        );
        return false;
      }

      processedCount += chunk.length;
      const progress = Math.min(
        99,
        Math.round((processedCount / fileToTranslate.extractedItems.length) * 100)
      );

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileToTranslate.id
            ? {
                ...f,
                progressPercent: progress,
                translatedItemsMap: { ...translationsMap },
              }
            : f
        )
      );

      // Gentle throttle between chunks
      await new Promise((r) => setTimeout(r, 120));
    }

    // All chunks succeeded! Rebuild exact cloned JSON hierarchy
    try {
      const { translatedObj, formattedJson } = rebuildTranslatedJson(
        fileToTranslate.parsedSource,
        translationsMap,
        fileToTranslate.extractedItems,
        fileToTranslate.indentation
      );

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileToTranslate.id
            ? {
                ...f,
                translatedRaw: formattedJson,
                translatedParsed: translatedObj,
                status: 'completed',
                progressPercent: 100,
                translatedItemsMap: translationsMap,
              }
            : f
        )
      );
      return true;
    } catch (rebuildErr: any) {
      console.error(`Rebuild error for ${fileToTranslate.name}:`, rebuildErr);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileToTranslate.id
            ? {
                ...f,
                status: 'error',
                errorMessage: 'Failed to rebuild JSON hierarchy',
              }
            : f
        )
      );
      return false;
    }
  };

  /**
   * Start batch translation of all pending / error files
   */
  const handleStartTranslation = async () => {
    if (files.length === 0 || isTranslating) return;

    stopRequestedRef.current = false;
    setIsTranslating(true);

    const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'error');
    const queue = [...pendingFiles];

    // Concurrency pool
    const concurrency = Math.max(1, Math.min(settings.concurrencyLimit, 3));
    const activeWorkers: Promise<void>[] = [];

    const worker = async () => {
      while (queue.length > 0 && !stopRequestedRef.current) {
        const nextFile = queue.shift();
        if (!nextFile) break;
        await translateSingleFile(nextFile, settings);
      }
    };

    for (let i = 0; i < concurrency; i++) {
      activeWorkers.push(worker());
    }

    await Promise.all(activeWorkers);
    setIsTranslating(false);
  };

  /**
   * Translate single file from list
   */
  const handleTranslateSingleFile = async (fileId: string) => {
    const targetFile = files.find((f) => f.id === fileId);
    if (!targetFile || isTranslating) return;

    setIsTranslating(true);
    stopRequestedRef.current = false;
    await translateSingleFile(targetFile, settings);
    setIsTranslating(false);
  };

  /**
   * Stop translation
   */
  const handleStopTranslation = () => {
    stopRequestedRef.current = true;
    setIsTranslating(false);
    setFiles((prev) =>
      prev.map((f) => (f.status === 'translating' ? { ...f, status: 'pending' } : f))
    );
  };

  /**
   * Retry failed files
   */
  const handleRetryFailed = () => {
    setFiles((prev) =>
      prev.map((f) => (f.status === 'error' ? { ...f, status: 'pending' } : f))
    );
    setTimeout(() => handleStartTranslation(), 100);
  };

  /**
   * In-place edit of translated item
   */
  const handleUpdateFileTranslation = (
    fileId: string,
    updatedMap: Record<number, string>
  ) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== fileId) return f;
        const { translatedObj, formattedJson } = rebuildTranslatedJson(
          f.parsedSource,
          updatedMap,
          f.extractedItems,
          f.indentation
        );
        return {
          ...f,
          translatedItemsMap: updatedMap,
          translatedParsed: translatedObj,
          translatedRaw: formattedJson,
        };
      })
    );
  };

  /**
   * Re-translate specific items in a file (targeted retry for missing / untranslated items)
   */
  const handleRetranslateSpecificItems = async (fileId: string, itemIds: number[]) => {
    const targetFile = files.find((f) => f.id === fileId);
    if (!targetFile) return;

    const itemsToTranslate = targetFile.extractedItems.filter((i) => itemIds.includes(i.id));
    if (itemsToTranslate.length === 0) return;

    const chunks = createSmartChunks(itemsToTranslate, 20, 1600);
    const updatedMap = { ...(targetFile.translatedItemsMap || {}) };

    for (const chunk of chunks) {
      try {
        const response = await fetch('/api/translate-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: chunk.map((i) => ({ id: i.id, path: i.path.join('.'), text: i.text })),
            sourceLanguage: settings.sourceLanguage,
            targetLanguage: settings.targetLanguage,
            context: settings.contextTone,
            glossary: settings.customGlossary,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.success !== true) {
          throw new Error(data.error || 'Translation service reported a failure.');
        }
        Object.assign(
          updatedMap,
          validateTranslationResponse(data.translations, chunk)
        );
      } catch (err) {
        console.error('Failed to re-translate chunk:', err);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'error',
                  translatedItemsMap: updatedMap,
                  errorMessage:
                    err instanceof Error
                      ? err.message
                      : 'Translation service failed while retrying these items.',
                }
              : f
          )
        );
        return;
      }
    }

    // Rebuild translated JSON
    try {
      const { translatedObj, formattedJson } = rebuildTranslatedJson(
        targetFile.parsedSource,
        updatedMap,
        targetFile.extractedItems,
        targetFile.indentation
      );
      const allItemsTranslated = targetFile.extractedItems.every(
        (item) => typeof updatedMap[item.id] === 'string'
      );

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                translatedItemsMap: updatedMap,
                translatedParsed: translatedObj,
                translatedRaw: formattedJson,
                status: allItemsTranslated ? 'completed' : 'error',
                errorMessage: allItemsTranslated
                  ? undefined
                  : 'Some strings are still untranslated. Retry the missing items before downloading.',
              }
            : f
        )
      );
    } catch (e) {
      console.error('Error rebuilding JSON after specific retranslation:', e);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                status: 'error',
                errorMessage: 'Failed to rebuild JSON hierarchy after re-translation.',
              }
            : f
        )
      );
    }
  };

  /**
   * Download single JSON file
   */
  const handleDownloadFile = (file: ChapterFile) => {
    const content = file.translatedRaw || file.rawSource;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Download ALL translated chapters as a structured ZIP file
   * Preserves exact relative paths and folder hierarchy
   */
  const handleDownloadAllZip = async () => {
    const completedFiles = files.filter((f) => f.status === 'completed' && f.translatedRaw);
    if (completedFiles.length === 0) return;

    const zip = new JSZip();

    for (const file of completedFiles) {
      // Normalize relative path (clean leading slashes)
      const cleanPath = file.relativePath.replace(/^[/\\]+/, '');
      zip.file(cleanPath, file.translatedRaw!);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated_chapters_${settings.targetLanguage.toLowerCase()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Remove a file from workspace
   */
  const handleRemoveFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (selectedFileId === fileId) {
      const remaining = files.filter((f) => f.id !== fileId);
      setSelectedFileId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  /**
   * Clear all files
   */
  const handleClearAll = () => {
    setFiles([]);
    setSelectedFileId(null);
  };

  const selectedFile = files.find((f) => f.id === selectedFileId) || null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Navigation */}
      <Header
        totalFiles={stats.totalFiles}
        completedFiles={stats.completedFiles}
        isTranslating={isTranslating}
        onOpenPasteModal={() => setIsPasteModalOpen(true)}
        onOpenGlossaryModal={() => setIsGlossaryModalOpen(true)}
        onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
        onClearAll={handleClearAll}
        onDownloadAllZip={handleDownloadAllZip}
        onSelectSample={handleSelectSample}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* If no files, show prominent Dropzone */}
        {files.length === 0 ? (
          <div className="max-w-4xl mx-auto py-8">
            <FolderDropzone
              onFilesSelected={handleFilesSelected}
              onSelectSample={handleSelectSample}
              onOpenPasteModal={() => setIsPasteModalOpen(true)}
              onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
            />
          </div>
        ) : (
          <>
            {/* Translation Settings & Execution Controls */}
            <TranslationControls
              settings={settings}
              onUpdateSettings={(newVals) =>
                setSettings((prev) => ({ ...prev, ...newVals }))
              }
              stats={stats}
              isTranslating={isTranslating}
              onStartTranslation={handleStartTranslation}
              onStopTranslation={handleStopTranslation}
              onRetryFailed={handleRetryFailed}
            />

            {/* Compact Folder Dropzone to add more chapters */}
            <FolderDropzone
              compact
              onFilesSelected={handleFilesSelected}
              onSelectSample={handleSelectSample}
              onOpenPasteModal={() => setIsPasteModalOpen(true)}
              onOpenGitHubModal={() => setIsGitHubModalOpen(true)}
            />

            {/* Split Chapter Workspace: Left List & Right Diff Viewer */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Chapter List (4 cols) */}
              <div className="lg:col-span-4 h-[650px]">
                <ChapterList
                  files={files}
                  selectedFileId={selectedFileId}
                  onSelectFile={(id) => setSelectedFileId(id)}
                  onTranslateFile={handleTranslateSingleFile}
                  onDownloadFile={handleDownloadFile}
                  onRemoveFile={handleRemoveFile}
                  isTranslating={isTranslating}
                />
              </div>

              {/* Right Column: Diff / Tree Viewer (8 cols) */}
              <div className="lg:col-span-8 h-[650px]">
                <JsonDiffViewer
                  file={selectedFile}
                  targetLanguage={settings.targetLanguage}
                  sourceLanguage={settings.sourceLanguage}
                  onUpdateFileTranslation={handleUpdateFileTranslation}
                  onRetranslateSpecificItems={handleRetranslateSpecificItems}
                  onDownloadFile={handleDownloadFile}
                />
              </div>
            </div>
          </>
        )}
      </main>

      {/* Modals */}
      <PasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onAddJson={handleAddJson}
      />

      <GlossaryModal
        isOpen={isGlossaryModalOpen}
        onClose={() => setIsGlossaryModalOpen(false)}
        glossary={settings.customGlossary}
        onUpdateGlossary={(updated) =>
          setSettings((prev) => ({ ...prev, customGlossary: updated }))
        }
        targetLanguage={settings.targetLanguage}
      />

      <GitHubModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        onImportFiles={(incomingFiles, autoStart) => {
          processIncomingFiles(incomingFiles);
          if (autoStart) {
            setTimeout(() => {
              handleStartTranslation();
            }, 350);
          }
        }}
        completedFiles={files}
        targetLanguage={settings.targetLanguage}
      />
    </div>
  );
}
