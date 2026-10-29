import React, { useState } from 'react';
import {
  GitFork,
  GitBranch,
  Github,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  FolderTree,
  FileCode,
  ArrowRight,
  Sparkles,
  UploadCloud,
  Check,
  X,
  Key,
} from 'lucide-react';
import { ChapterFile } from '../types/translation';

interface GitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFiles: (
    files: Array<{ name: string; relativePath: string; content: string }>,
    autoStart?: boolean
  ) => void;
  completedFiles: ChapterFile[];
  targetLanguage: string;
}

interface InspectedRepo {
  owner: string;
  repo: string;
  branch: string;
  fullName: string;
  description: string;
  stars: number;
  htmlUrl: string;
  totalJsonFiles: number;
  detectedFolders?: Array<{ path: string; count: number; label: string }>;
  files: Array<{ path: string; name: string; size: number }>;
}

export const GitHubModal: React.FC<GitHubModalProps> = ({
  isOpen,
  onClose,
  onImportFiles,
  completedFiles,
  targetLanguage,
}) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState(
    () => localStorage.getItem('gh_pat_token') || ''
  );
  const [rememberToken, setRememberToken] = useState(true);

  // Inspection state
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [inspectedRepo, setInspectedRepo] = useState<InspectedRepo | null>(null);
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());

  const [activeFolderFilter, setActiveFolderFilter] = useState<string>('all');

  // Import state
  const [isImporting, setIsImporting] = useState(false);

  // Fork state
  const [isForking, setIsForking] = useState(false);
  const [forkedRepoInfo, setForkedRepoInfo] = useState<{
    forkedRepo: string;
    htmlUrl: string;
    owner: string;
  } | null>(null);
  const [forkError, setForkError] = useState<string | null>(null);

  // Push / Commit state
  const [isPushing, setIsPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{
    branchUrl: string;
    branchName: string;
    filesCommitted: number;
  } | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveToken = (val: string) => {
    setGithubToken(val);
    if (rememberToken) {
      localStorage.setItem('gh_pat_token', val);
    }
  };

  const handleInspect = async (urlToInspect?: string) => {
    const target = urlToInspect || repoUrl;
    if (!target.trim()) {
      setInspectError('Please enter a GitHub repository link.');
      return;
    }

    setIsInspecting(true);
    setInspectError(null);
    setInspectedRepo(null);
    setForkError(null);
    setPushResult(null);

    try {
      const res = await fetch('/api/github/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: target.trim(),
          token: githubToken.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to inspect GitHub repository');
      }

      setInspectedRepo(data);

      // If detectedFolders exist, select the top chapter folder by default
      if (data.detectedFolders && data.detectedFolders.length > 0) {
        const topFolder = data.detectedFolders[0].path;
        setActiveFolderFilter(topFolder);
        const folderFiles = data.files.filter((f: any) =>
          f.path.startsWith(topFolder + '/')
        );
        setSelectedFilePaths(new Set<string>(folderFiles.map((f: any) => f.path)));
      } else {
        setActiveFolderFilter('all');
        const allPaths = new Set<string>(
          data.files.slice(0, 150).map((f: any) => String(f.path))
        );
        setSelectedFilePaths(allPaths);
      }
    } catch (err: any) {
      setInspectError(err.message || 'Inspection failed');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleSelectFolder = (folderPath: string) => {
    setActiveFolderFilter(folderPath);
    if (!inspectedRepo) return;
    if (folderPath === 'all') {
      setSelectedFilePaths(new Set<string>(inspectedRepo.files.map((f) => f.path)));
    } else {
      const folderFiles = inspectedRepo.files.filter((f) =>
        f.path.startsWith(folderPath + '/')
      );
      setSelectedFilePaths(new Set<string>(folderFiles.map((f) => f.path)));
    }
  };

  const handleToggleFile = (path: string) => {
    const next = new Set<string>(selectedFilePaths);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setSelectedFilePaths(next);
  };

  const handleToggleAll = () => {
    if (!inspectedRepo) return;
    const currentPool =
      activeFolderFilter === 'all'
        ? inspectedRepo.files
        : inspectedRepo.files.filter((f) => f.path.startsWith(activeFolderFilter + '/'));

    const allInPoolSelected = currentPool.every((f) => selectedFilePaths.has(f.path));
    const next = new Set<string>(selectedFilePaths);

    if (allInPoolSelected) {
      currentPool.forEach((f) => next.delete(f.path));
    } else {
      currentPool.forEach((f) => next.add(f.path));
    }
    setSelectedFilePaths(next);
  };

  const handleImportSelected = async (autoStart: boolean = false) => {
    if (!inspectedRepo || selectedFilePaths.size === 0) return;

    setIsImporting(true);
    setInspectError(null);
    try {
      const res = await fetch('/api/github/fetch-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: inspectedRepo.owner,
          repo: inspectedRepo.repo,
          branch: inspectedRepo.branch,
          filePaths: Array.from(selectedFilePaths),
          token: githubToken.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch files from GitHub');
      }

      onImportFiles(data.files, autoStart);
      onClose();
    } catch (err: any) {
      setInspectError(err.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFork = async () => {
    if (!inspectedRepo) return;
    if (!githubToken.trim()) {
      setForkError('Please enter a GitHub Personal Access Token to fork this repository.');
      return;
    }

    setIsForking(true);
    setForkError(null);

    try {
      const res = await fetch('/api/github/fork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: inspectedRepo.owner,
          repo: inspectedRepo.repo,
          token: githubToken.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fork repository');
      }

      setForkedRepoInfo({
        forkedRepo: data.forkedRepo,
        htmlUrl: data.htmlUrl,
        owner: data.owner,
      });
    } catch (err: any) {
      setForkError(err.message || 'Forking failed');
    } finally {
      setIsForking(false);
    }
  };

  const handlePushTranslated = async () => {
    if (!githubToken.trim()) {
      setPushError('Please enter a GitHub Personal Access Token to commit translated chapters.');
      return;
    }

    const targetRepoFullName = forkedRepoInfo
      ? forkedRepoInfo.forkedRepo
      : inspectedRepo
      ? `${inspectedRepo.owner}/${inspectedRepo.repo}`
      : '';

    if (!targetRepoFullName) {
      setPushError('No repository selected or forked yet.');
      return;
    }

    const [fOwner, fRepo] = targetRepoFullName.split('/');
    const translatedFilesToCommit = completedFiles
      .filter((f) => f.translatedRaw)
      .map((f) => ({
        path: f.relativePath,
        content: f.translatedRaw!,
      }));

    if (translatedFilesToCommit.length === 0) {
      setPushError(
        'No completed translated files found yet. Translate your chapters first before pushing!'
      );
      return;
    }

    setIsPushing(true);
    setPushError(null);

    try {
      const branchName = `translated-${targetLanguage.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const res = await fetch('/api/github/commit-translated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forkedOwner: fOwner,
          forkedRepo: fRepo,
          branchName: branchName,
          files: translatedFilesToCommit,
          commitMessage: `Translate ${translatedFilesToCommit.length} chapter(s) to ${targetLanguage} with exact JSON hierarchy preserved`,
          token: githubToken.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to push to GitHub');
      }

      setPushResult({
        branchName: data.branchName,
        branchUrl: data.branchUrl,
        filesCommitted: data.filesCommitted,
      });
    } catch (err: any) {
      setPushError(err.message || 'Failed to push commit');
    } finally {
      setIsPushing(false);
    }
  };

  const loadPopularPreset = (url: string) => {
    setRepoUrl(url);
    handleInspect(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                GitHub Repository Import, Fork & Sync
              </h3>
              <p className="text-[11px] text-slate-400">
                Paste any GitHub repo link to inspect, fork, import chapters, translate, and commit back.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto text-xs">
          {/* GitHub URL Input */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              GitHub Repository URL or Path
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Github className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInspect()}
                  placeholder="e.g. https://github.com/semarketir/quranjson or owner/repo"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => handleInspect()}
                disabled={isInspecting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {isInspecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Inspecting...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Inspect Repo</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Demo Repositories */}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-400">Try popular open-source chapters:</span>
              <button
                type="button"
                onClick={() => loadPopularPreset('https://github.com/semarketir/quranjson')}
                className="text-[11px] text-indigo-600 hover:underline font-mono bg-indigo-50 px-2 py-0.5 rounded-md"
              >
                semarketir/quranjson
              </button>
              <button
                type="button"
                onClick={() => loadPopularPreset('https://github.com/risan/quran-json')}
                className="text-[11px] text-indigo-600 hover:underline font-mono bg-indigo-50 px-2 py-0.5 rounded-md"
              >
                risan/quran-json
              </button>
            </div>
          </div>

          {/* GitHub Token (Optional for reading public repos, Required for Forking / Committing) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-indigo-600" />
                <span>GitHub Personal Access Token</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  (Required only to Fork or Push commits to your account)
                </span>
              </label>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=JSON-Chapter-Translator"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Generate token (repo scope)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => handleSaveToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (Stored securely in local browser session)"
              className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>

          {/* Error Message */}
          {inspectError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{inspectError}</span>
            </div>
          )}

          {/* Inspected Repo Details */}
          {inspectedRepo && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Repo summary card */}
              <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-indigo-300">
                      {inspectedRepo.fullName}
                    </span>
                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full font-mono text-slate-300">
                      branch: {inspectedRepo.branch}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-lg line-clamp-2">
                    {inspectedRepo.description || 'No description provided'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={inspectedRepo.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
                    title="View on GitHub"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {/* Fork Button */}
                  <button
                    type="button"
                    onClick={handleFork}
                    disabled={isForking}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
                  >
                    {isForking ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <GitFork className="w-3.5 h-3.5" />
                    )}
                    <span>Fork to My Account</span>
                  </button>
                </div>
              </div>

              {/* Forked status banner if forked */}
              {forkedRepoInfo && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>
                      Successfully forked to <strong>{forkedRepoInfo.forkedRepo}</strong>!
                    </span>
                  </div>
                  <a
                    href={forkedRepoInfo.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold underline flex items-center gap-1"
                  >
                    <span>Open Fork</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {forkError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {forkError}
                </div>
              )}

              {/* Detected Language / Chapter Folders */}
              {inspectedRepo.detectedFolders && inspectedRepo.detectedFolders.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <FolderTree className="w-4 h-4 text-indigo-600" />
                      Select Chapter / Language Collection Folder
                    </span>
                    <span className="text-[11px] text-slate-500">Click a folder to select its chapters</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectFolder('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        activeFolderFilter === 'all'
                          ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      All Files ({inspectedRepo.files.length})
                    </button>
                    {inspectedRepo.detectedFolders.map((f) => (
                      <button
                        key={f.path}
                        type="button"
                        onClick={() => handleSelectFolder(f.path)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          activeFolderFilter === f.path
                            ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        📁 {f.path} ({f.count} files)
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* One-Click Fast Action Hero Banner */}
              <div className="p-4 bg-gradient-to-r from-indigo-500 via-indigo-600 to-sky-600 text-white rounded-xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Translate {selectedFilePaths.size} Chapters in One Go</span>
                  </div>
                  <p className="text-xs text-indigo-100 mt-0.5">
                    Target language: <strong>{targetLanguage}</strong> • Exact JSON hierarchies & keys preserved
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleImportSelected(true)}
                  disabled={isImporting || selectedFilePaths.size === 0}
                  className="px-5 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-bold rounded-xl shadow-md transition-all flex items-center gap-2 text-xs shrink-0 hover:scale-[1.02]"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Fetching Chapters...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Translate All in One Go ➔</span>
                    </>
                  )}
                </button>
              </div>

              {/* Files Discovered */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-slate-700">
                    <FolderTree className="w-4 h-4 text-indigo-600" />
                    <span>
                      {activeFolderFilter === 'all'
                        ? `All Chapter Files (${inspectedRepo.files.length})`
                        : `Files in "${activeFolderFilter}" (${selectedFilePaths.size})`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleToggleAll}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px]"
                    >
                      Toggle All in Folder
                    </button>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {selectedFilePaths.size} selected
                    </span>
                  </div>
                </div>

                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {inspectedRepo.files.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      No .json files found in this repository branch.
                    </div>
                  ) : (
                    inspectedRepo.files.map((file) => {
                      const isSelected = selectedFilePaths.has(file.path);
                      return (
                        <div
                          key={file.path}
                          onClick={() => handleToggleFile(file.path)}
                          className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleFile(file.path)}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono text-slate-800 truncate">
                              {file.path}
                            </span>
                          </div>
                          <span className="text-slate-400 font-mono text-[10px] shrink-0">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Commit / Push Back to GitHub section */}
              {completedFiles.some((f) => f.translatedRaw) && (
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <GitBranch className="w-4 h-4 text-emerald-600" />
                        <span>Push Translated Chapters to GitHub</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Commit {completedFiles.filter((f) => f.translatedRaw).length}{' '}
                        translated chapter(s) to a dedicated branch (e.g.{' '}
                        <code className="text-emerald-700 bg-emerald-100/60 px-1 rounded">
                          translated-{targetLanguage.toLowerCase()}
                        </code>
                        ) on your GitHub repository.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handlePushTranslated}
                      disabled={isPushing}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-all"
                    >
                      {isPushing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Pushing to GitHub...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>Commit to GitHub</span>
                        </>
                      )}
                    </button>
                  </div>

                  {pushError && (
                    <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[11px]">
                      {pushError}
                    </div>
                  )}

                  {pushResult && (
                    <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-lg text-emerald-900 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-700" />
                        <span>
                          Pushed {pushResult.filesCommitted} translated chapters to branch{' '}
                          <strong>{pushResult.branchName}</strong>!
                        </span>
                      </div>
                      <a
                        href={pushResult.branchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold underline flex items-center gap-1"
                      >
                        <span>View Branch on GitHub</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {inspectedRepo
              ? `${selectedFilePaths.size} chapter file(s) selected for workspace translation`
              : 'Enter repository link to fetch books & chapters'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {inspectedRepo && (
              <>
                <button
                  type="button"
                  onClick={() => handleImportSelected(false)}
                  disabled={isImporting || selectedFilePaths.size === 0}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span>Import {selectedFilePaths.size} Chapters</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleImportSelected(true)}
                  disabled={isImporting || selectedFilePaths.size === 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-xl shadow-md transition-all flex items-center gap-2 hover:scale-[1.01]"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Fetching Chapters...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Translate in One Go ({targetLanguage})</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
