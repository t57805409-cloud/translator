import React, { useState } from 'react';
import {
  Play,
  Square,
  RotateCw,
  Settings2,
  ChevronDown,
  ChevronUp,
  Tag,
  BookOpen,
  Sliders,
  Check,
  Shield,
  Sparkles,
} from 'lucide-react';
import { TranslationSettings, TranslationStat } from '../types/translation';

interface TranslationControlsProps {
  settings: TranslationSettings;
  onUpdateSettings: (newSettings: Partial<TranslationSettings>) => void;
  stats: TranslationStat;
  isTranslating: boolean;
  onStartTranslation: () => void;
  onStopTranslation: () => void;
  onRetryFailed: () => void;
}

const COMMON_TARGETS = [
  { code: 'Tamil', label: 'Tamil', native: 'தமிழ்' },
  { code: 'Malayalam', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'Arabic', label: 'Arabic', native: 'العربية' },
  { code: 'English', label: 'English', native: 'English' },
  { code: 'Urdu', label: 'Urdu', native: 'اردو' },
  { code: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
];

const EXTENDED_LANGUAGES = [
  'Telugu (తెలుగు)',
  'Kannada (ಕನ್ನಡ)',
  'Bengali (বাংলা)',
  'Indonesian (Bahasa)',
  'Turkish (Türkçe)',
  'French (Français)',
  'Spanish (Español)',
  'German (Deutsch)',
  'Russian (Русский)',
  'Persian / Farsi (فارسی)',
  'Japanese (日本語)',
  'Chinese Simplified (简体中文)',
];

const CONTEXT_DOMAINS = [
  {
    id: 'scripture',
    label: 'Scripture & Religious Texts',
    desc: 'Quranic, Hadith, Biblical, spiritual prose with authentic respectful phrasing',
  },
  {
    id: 'literary',
    label: 'Literature & Novel Chapters',
    desc: 'Expressive fiction, storytelling, poetic dialogues and character voice',
  },
  {
    id: 'general',
    label: 'Standard & General Chapters',
    desc: 'Balanced, accurate modern prose',
  },
  {
    id: 'academic',
    label: 'Academic & Philosophical',
    desc: 'Strict terminology, scholarly citations, and educational precision',
  },
];

export const TranslationControls: React.FC<TranslationControlsProps> = ({
  settings,
  onUpdateSettings,
  stats,
  isTranslating,
  onStartTranslation,
  onStopTranslation,
  onRetryFailed,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newExcludedKey, setNewExcludedKey] = useState('');

  const handleAddExcludedKey = () => {
    if (!newExcludedKey.trim()) return;
    const key = newExcludedKey.trim().toLowerCase();
    if (!settings.excludedKeys.includes(key)) {
      onUpdateSettings({ excludedKeys: [...settings.excludedKeys, key] });
    }
    setNewExcludedKey('');
  };

  const handleRemoveExcludedKey = (keyToRemove: string) => {
    onUpdateSettings({
      excludedKeys: settings.excludedKeys.filter((k) => k !== keyToRemove),
    });
  };

  const percentComplete =
    stats.totalStrings > 0
      ? Math.round((stats.translatedStrings / stats.totalStrings) * 100)
      : stats.totalFiles > 0
      ? Math.round((stats.completedFiles / stats.totalFiles) * 100)
      : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Language Selection */}
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            {/* Source Language */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Source:
              </span>
              <select
                value={settings.sourceLanguage}
                onChange={(e) => onUpdateSettings({ sourceLanguage: e.target.value })}
                disabled={isTranslating}
                className="text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <option value="Auto-detect">Auto-detect Language</option>
                <option value="English">English</option>
                <option value="Arabic">Arabic (العربية)</option>
                <option value="Tamil">Tamil (தமிழ்)</option>
                <option value="Malayalam">Malayalam (മലയാളം)</option>
                <option value="Urdu">Urdu (اردو)</option>
                <option value="French">French</option>
                <option value="Spanish">Spanish</option>
              </select>
            </div>

            <span className="text-slate-300 font-bold hidden sm:inline">→</span>

            {/* Target Language Quick Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">
                Target:
              </span>
              {COMMON_TARGETS.map((t) => {
                const isSelected = settings.targetLanguage === t.code;
                return (
                  <button
                    key={t.code}
                    type="button"
                    onClick={() => onUpdateSettings({ targetLanguage: t.code })}
                    disabled={isTranslating}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{t.label}</span>
                    <span className="text-[10px] opacity-80 font-normal">({t.native})</span>
                    {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                  </button>
                );
              })}

              {/* Extended languages dropdown */}
              <select
                value={
                  COMMON_TARGETS.some((c) => c.code === settings.targetLanguage)
                    ? 'more'
                    : settings.targetLanguage
                }
                onChange={(e) => {
                  if (e.target.value !== 'more') {
                    // Extract language name before parenthesis if needed
                    const langName = e.target.value.split(' ')[0];
                    onUpdateSettings({ targetLanguage: langName });
                  }
                }}
                disabled={isTranslating}
                className="text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-transparent rounded-lg px-2.5 py-1 focus:outline-none"
              >
                <option value="more">More Languages...</option>
                {EXTENDED_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Context / Domain selection */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-500 font-medium">Text Style:</span>
            {CONTEXT_DOMAINS.map((c) => {
              const active = settings.contextTone === c.label;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onUpdateSettings({ contextTone: c.label })}
                  disabled={isTranslating}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    active
                      ? 'bg-sky-50 text-sky-800 border border-sky-300 font-semibold'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title={c.desc}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Controls & Progress */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Configure JSON Key Exclusion & Chunking"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {isTranslating ? (
            <button
              type="button"
              onClick={onStopTranslation}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm shadow-sm transition-all"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Pause / Stop</span>
            </button>
          ) : stats.failedFiles > 0 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRetryFailed}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-sm transition-all"
              >
                <RotateCw className="w-4 h-4" />
                <span>Retry Failed ({stats.failedFiles})</span>
              </button>
              <button
                type="button"
                onClick={onStartTranslation}
                disabled={stats.totalFiles === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm shadow-md shadow-indigo-100 transition-all hover:scale-[1.01]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Translate All</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onStartTranslation}
              disabled={stats.totalFiles === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm shadow-md shadow-indigo-100 transition-all hover:scale-[1.01]"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>
                Translate {stats.totalFiles > 0 ? `${stats.totalFiles} Chapters` : 'Chapters'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar (when active or completed) */}
      {stats.totalFiles > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <div className="flex items-center gap-2 font-medium">
              {isTranslating ? (
                <span className="flex items-center gap-1.5 text-indigo-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  Translating {stats.inProgressFiles > 0 ? 'chapters in parallel...' : '...'}
                </span>
              ) : stats.completedFiles === stats.totalFiles && stats.totalFiles > 0 ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> All {stats.totalFiles} chapters translated
                  successfully!
                </span>
              ) : (
                <span>Batch translation ready</span>
              )}
            </div>
            <div className="font-mono text-[11px] text-slate-600">
              {stats.translatedStrings} / {stats.totalStrings} strings ({percentComplete}%)
            </div>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                stats.failedFiles > 0
                  ? 'bg-gradient-to-r from-indigo-500 to-amber-500'
                  : stats.completedFiles === stats.totalFiles
                  ? 'bg-emerald-500'
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>
      )}

      {/* Advanced Settings Drawer */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-in fade-in duration-200">
          {/* Excluded Keys */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                Protected JSON Keys (Never Translated)
              </span>
              <span className="text-[10px] text-slate-400">Values under these keys stay intact</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2.5 max-h-24 overflow-y-auto">
              {settings.excludedKeys.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700 font-mono text-[11px]"
                >
                  {k}
                  <button
                    type="button"
                    onClick={() => handleRemoveExcludedKey(k)}
                    className="text-slate-400 hover:text-rose-600 text-[10px]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newExcludedKey}
                onChange={(e) => setNewExcludedKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddExcludedKey()}
                placeholder="Add key e.g. audio_url, verse_id"
                className="flex-1 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddExcludedKey}
                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 font-medium rounded-lg text-slate-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Processing Options */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Hierarchy & Data Type Safeguards
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={settings.preserveNumbersAndDates}
                onChange={(e) =>
                  onUpdateSettings({ preserveNumbersAndDates: e.target.checked })
                }
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Preserve URLs, UUIDs, ISO dates, hex colors & pure numeric strings</span>
            </label>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Strings per batch chunk:</span>
              <select
                value={settings.batchChunkSize}
                onChange={(e) =>
                  onUpdateSettings({ batchChunkSize: parseInt(e.target.value, 10) })
                }
                className="bg-white border border-slate-300 rounded-md px-2 py-0.5 text-xs font-mono"
              >
                <option value={15}>15 items (Ultra-safe)</option>
                <option value={30}>30 items (Balanced recommended)</option>
                <option value={50}>50 items (Fast)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Parallel chapter workers:</span>
              <select
                value={settings.concurrencyLimit}
                onChange={(e) =>
                  onUpdateSettings({ concurrencyLimit: parseInt(e.target.value, 10) })
                }
                className="bg-white border border-slate-300 rounded-md px-2 py-0.5 text-xs font-mono"
              >
                <option value={1}>1 chapter at a time</option>
                <option value={2}>2 chapters in parallel (Recommended)</option>
                <option value={3}>3 chapters in parallel</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
