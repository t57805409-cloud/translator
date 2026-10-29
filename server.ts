import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware for parsing JSON with generous limits for multi-chapter JSONs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Server-side Gemini initialization following gemini-api skill
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Check API status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    model: 'gemini-3.8-flash',
  });
});

interface TranslationItem {
  id: string | number;
  path: string;
  text: string;
}

// Helper to safely extract JSON array from model output
function extractJsonArray(text: string): Array<{ id: string | number; translated: string }> {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  // Regex fallback to find [ ... ] array
  const match = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  return [];
}

// Dynamic Model Pool with Quota Awareness and Immediate Failover
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.6-flash',
];
const modelCooloffUntil = new Map<string, number>();

function getAvailableModels(): string[] {
  const now = Date.now();
  const available = CANDIDATE_MODELS.filter((m) => {
    const cooloff = modelCooloffUntil.get(m) || 0;
    return now > cooloff;
  });
  return available.length > 0 ? available : CANDIDATE_MODELS;
}

function markModelExhausted(model: string, minutes: number = 30) {
  modelCooloffUntil.set(model, Date.now() + minutes * 60 * 1000);
}

// Batch string translation endpoint with retries and fail-safe resilience
app.post('/api/translate-batch', async (req, res) => {
  const {
    items,
    sourceLanguage = 'Auto-detect',
    targetLanguage = 'Tamil',
    context = 'literary and religious chapter text',
    glossary = {},
  } = req.body as {
    items: TranslationItem[];
    sourceLanguage?: string;
    targetLanguage?: string;
    context?: string;
    glossary?: Record<string, string>;
  };

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing or empty items array for translation' });
  }

  if (!ai) {
    const dynamicKey = process.env.GEMINI_API_KEY;
    if (dynamicKey) {
      ai = new GoogleGenAI({
        apiKey: dynamicKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } else {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in the server environment.',
      });
    }
  }

  const glossaryInstruction =
    glossary && Object.keys(glossary).length > 0
      ? `Use this custom glossary terminology:\n${JSON.stringify(glossary, null, 2)}\n`
      : '';

  const systemInstruction = `You are a high-fidelity linguistic translation engine specialized in translating book chapters, religious scriptures (Quranic, Hadith, Biblical, philosophical), literature, and structured documents.
Target Language: "${targetLanguage}".
Source Language: "${sourceLanguage}" (if Auto-detect, accurately detect per item).
Domain / Text Style: "${context}".

CRITICAL TRANSLATION REQUIREMENTS:
1. Translate EVERY text item faithfully, maintaining exact semantic depth, nuance, and respectful cultural tone in ${targetLanguage}.
2. For Arabic or religious chapter texts (e.g. Surah, Ayah, Hadith), preserve theological terminology and provide standard, authentic ${targetLanguage} equivalents (e.g. Tamil or Malayalam scholarly vocabulary).
3. Do NOT translate placeholders, code variables, Markdown tags like {name}, %s, URLs, HTML tags, or file extensions.
4. Keep punctuation style, exclamation, question marks, and chapter numbering references aligned.
5. Return ONLY a valid JSON array of objects with the exact shape: [{"id": <item_id>, "translated": "<translated_text>"}].
6. Every input ID must be present in the output array in the exact same order.
7. Do NOT leave words, titles, names or phrases in English or Arabic when translating to ${targetLanguage}. Every item must be converted into authentic ${targetLanguage} script.
8. Output MUST contain all ${items.length} input items with their exact matching IDs. Do not omit or skip any items.
${glossaryInstruction}`;

  const prompt = `Translate the following string items to ${targetLanguage}.
Input array:
${JSON.stringify(
  items.map((i) => ({ id: i.id, text: i.text, context_hint: i.path })),
  null,
  2
)}`;

  const availableModels = getAvailableModels();
  let lastError: any = null;

  for (const currentModel of availableModels) {
    try {
      const response = await ai.models.generateContent({
        model: currentModel,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER, description: 'Original item ID' },
                translated: { type: Type.STRING, description: 'The translated text' },
              },
              required: ['id', 'translated'],
            },
          },
        },
      });

      const responseText = response.text || '[]';
      let parsedTranslations = extractJsonArray(responseText);

      if (parsedTranslations.length > 0) {
        const returnedIds = new Set(
          parsedTranslations
            .filter((item) => item && item.id !== undefined)
            .map((item) => Number(item.id))
        );
        const missingItems = items.filter((item) => !returnedIds.has(Number(item.id)));

        if (missingItems.length > 0 && missingItems.length < items.length) {
          try {
            const recoveryPrompt = `Translate these specific items to ${targetLanguage}:\n${JSON.stringify(
              missingItems.map((m) => ({ id: m.id, text: m.text })),
              null,
              2
            )}`;
            const recoveryRes = await ai.models.generateContent({
              model: currentModel,
              contents: recoveryPrompt,
              config: {
                systemInstruction: systemInstruction,
                temperature: 0.1,
                responseMimeType: 'application/json',
              },
            });
            const recovered = extractJsonArray(recoveryRes.text || '[]');
            const recoveredById = new Map(
              recovered.map((item) => [Number(item.id), item])
            );
            parsedTranslations = [
              ...parsedTranslations.filter((item) => !recoveredById.has(Number(item.id))),
              ...recovered,
            ];
          } catch (recoveryError) {
            console.warn(`Translation recovery failed for ${currentModel}:`, recoveryError);
          }
        }

        const translationsById = new Map<number, string>();
        let hasDuplicateIds = false;
        for (const translation of parsedTranslations) {
          if (!translation || typeof translation !== 'object') {
            continue;
          }
          const id = Number(translation?.id);
          if (
            !Number.isFinite(id) ||
            !items.some((item) => Number(item.id) === id) ||
            typeof translation.translated !== 'string' ||
            !translation.translated.trim()
          ) {
            continue;
          }
          if (translationsById.has(id)) {
            hasDuplicateIds = true;
            break;
          }
          translationsById.set(id, translation.translated);
        }

        if (hasDuplicateIds) {
          lastError = new Error(`Model ${currentModel} returned duplicate translation IDs.`);
          continue;
        }

        const missingIds = items.filter((item) => !translationsById.has(Number(item.id)));
        if (missingIds.length > 0) {
          lastError = new Error(
            `Model ${currentModel} returned ${missingIds.length} missing or invalid translations.`
          );
          continue;
        }

        return res.json({
          success: true,
          translations: items.map((item) => ({
            id: item.id,
            translated: translationsById.get(Number(item.id))!,
          })),
          count: items.length,
          targetLanguage,
          modelUsed: currentModel,
        });
      }
      lastError = new Error(`Model ${currentModel} returned an empty or invalid response.`);
    } catch (err: any) {
      lastError = err;
      const isQuotaError =
        err?.status === 429 || (err?.message && String(err.message).includes('429'));
      if (isQuotaError) {
        markModelExhausted(currentModel, 30);
      }
      // Immediately failover to next model in pool
    }
  }

  console.error('All translation models exhausted or failed:', lastError?.message || lastError);
  const isQuotaError =
    lastError?.status === 429 ||
    (lastError?.message && String(lastError.message).includes('429'));
  return res.status(isQuotaError ? 429 : 502).json({
    success: false,
    error: isQuotaError
      ? 'Gemini API quota or rate limit reached. Check your Google AI Studio quota and try again later.'
      : 'Gemini could not return a complete translation. Check the Render server logs for details.',
  });
});

// Helper: Parse GitHub URL
function parseGitHubUrl(rawUrl: string): {
  owner: string;
  repo: string;
  branch?: string;
  subpath?: string;
} | null {
  try {
    let clean = rawUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean.replace(/^github\.com\//, '');
    }
    const parsed = new URL(clean);
    if (!parsed.hostname.includes('github.com')) return null;

    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, '');

    let branch: string | undefined;
    let subpath: string | undefined;

    if (parts[2] === 'tree' && parts.length >= 4) {
      branch = parts[3];
      if (parts.length > 4) {
        subpath = parts.slice(4).join('/');
      }
    }

    return { owner, repo, branch, subpath };
  } catch {
    return null;
  }
}

// Inspect a GitHub repository: check existence, find all JSON chapter files and group by folders
app.post('/api/github/inspect', async (req, res) => {
  try {
    const { repoUrl, token } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required.' });
    }

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return res.status(400).json({
        error: 'Invalid GitHub repository link. Format: https://github.com/owner/repo',
      });
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'JSON-Chapter-Translator',
    };
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    // 1. Fetch repo metadata
    const repoRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      { headers }
    );

    if (!repoRes.ok) {
      if (repoRes.status === 404) {
        return res.status(404).json({ error: 'GitHub repository not found or is private.' });
      }
      if (repoRes.status === 403) {
        return res.status(403).json({
          error:
            'GitHub API rate limit reached. Please provide your GitHub Personal Access Token.',
        });
      }
      return res.status(repoRes.status).json({
        error: `GitHub error (${repoRes.status}): ${repoRes.statusText}`,
      });
    }

    const repoData = await repoRes.json();
    const branch = parsed.branch || repoData.default_branch || 'main';

    // 2. Fetch recursive git tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${branch}?recursive=1`,
      { headers }
    );

    if (!treeRes.ok) {
      return res.status(treeRes.status).json({
        error: 'Could not fetch Git tree. Branch may be empty or invalid.',
      });
    }

    const treeData = await treeRes.json();
    const allTree: Array<{ path: string; type: string; size?: number; sha: string }> =
      treeData.tree || [];

    // Filter JSON files, filtering out non-chapter noise like audio indexes, lockfiles, node_modules
    const ignoredPatterns = [
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'node_modules/',
      '.eslintrc',
      'audio/',
    ];

    let jsonFiles = allTree.filter((item) => {
      if (item.type !== 'blob' || !item.path.toLowerCase().endsWith('.json')) {
        return false;
      }
      // Skip audio index metadata files
      if (ignoredPatterns.some((pattern) => item.path.toLowerCase().includes(pattern))) {
        return false;
      }
      return true;
    });

    if (parsed.subpath) {
      const prefix = parsed.subpath.toLowerCase() + '/';
      jsonFiles = jsonFiles.filter((item) =>
        item.path.toLowerCase().startsWith(prefix)
      );
    }

    // Group files into logical folders (e.g. source/surah, source/translation/en, chapters)
    const folderMap = new Map<string, number>();
    for (const f of jsonFiles) {
      const segments = f.path.split('/');
      const dir = segments.length > 1 ? segments.slice(0, -1).join('/') : 'root';
      folderMap.set(dir, (folderMap.get(dir) || 0) + 1);
    }

    const detectedFolders = Array.from(folderMap.entries())
      .map(([dir, count]) => ({
        path: dir,
        count,
        label: `${dir} (${count} files)`,
      }))
      .sort((a, b) => b.count - a.count);

    return res.json({
      success: true,
      owner: parsed.owner,
      repo: parsed.repo,
      branch: branch,
      defaultBranch: repoData.default_branch,
      fullName: repoData.full_name,
      description: repoData.description,
      stars: repoData.stargazers_count,
      isFork: repoData.fork,
      htmlUrl: repoData.html_url,
      totalJsonFiles: jsonFiles.length,
      detectedFolders,
      files: jsonFiles.map((f) => ({
        path: f.path,
        name: f.path.split('/').pop() || f.path,
        size: f.size || 0,
        sha: f.sha,
      })),
    });
  } catch (error: any) {
    console.error('Inspect error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to inspect GitHub repo' });
  }
});

// Fetch contents of selected JSON files from GitHub with retry and high concurrency
app.post('/api/github/fetch-files', async (req, res) => {
  try {
    const { owner, repo, branch = 'main', filePaths, token } = req.body as {
      owner: string;
      repo: string;
      branch?: string;
      filePaths: string[];
      token?: string;
    };

    if (!owner || !repo || !Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({ error: 'Missing owner, repo, or filePaths' });
    }

    const headers: Record<string, string> = {
      'User-Agent': 'JSON-Chapter-Translator',
    };
    if (token) {
      headers.Authorization = `token ${token}`;
    }

    // Support fetching all requested files
    const selectedPaths = filePaths;
    const fetchedFiles: Array<{
      name: string;
      relativePath: string;
      content: string;
      sizeBytes: number;
    }> = [];

    // Parallel fetch worker pool with retry
    const concurrency = 15;
    for (let i = 0; i < selectedPaths.length; i += concurrency) {
      const slice = selectedPaths.slice(i, i + concurrency);
      const results = await Promise.all(
        slice.map(async (fpath) => {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fpath}`;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const fileRes = await fetch(rawUrl, { headers });
              if (fileRes.ok) {
                const text = await fileRes.text();
                return {
                  name: fpath.split('/').pop() || fpath,
                  relativePath: fpath,
                  content: text,
                  sizeBytes: Buffer.byteLength(text, 'utf-8'),
                };
              }
            } catch (e) {
              if (attempt < 3) {
                await new Promise((r) => setTimeout(r, 200 * attempt));
              }
            }
          }
          return null;
        })
      );

      for (const r of results) {
        if (r) fetchedFiles.push(r);
      }
    }

    return res.json({
      success: true,
      count: fetchedFiles.length,
      files: fetchedFiles,
    });
  } catch (error: any) {
    console.error('Fetch files error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to fetch repository files' });
  }
});

// Fork repository to user's GitHub account
app.post('/api/github/fork', async (req, res) => {
  try {
    const { owner, repo, token } = req.body;
    if (!token) {
      return res.status(400).json({
        error: 'A GitHub Personal Access Token (with "repo" scope) is required to fork.',
      });
    }

    const forkRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/forks`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `token ${token}`,
        'User-Agent': 'JSON-Chapter-Translator',
      },
    });

    if (!forkRes.ok) {
      const err = await forkRes.json().catch(() => ({}));
      return res.status(forkRes.status).json({
        error: err.message || `Failed to fork repository (${forkRes.status})`,
      });
    }

    const forkData = await forkRes.json();
    return res.json({
      success: true,
      forkedRepo: forkData.full_name,
      owner: forkData.owner?.login,
      htmlUrl: forkData.html_url,
      cloneUrl: forkData.clone_url,
      defaultBranch: forkData.default_branch || 'main',
    });
  } catch (error: any) {
    console.error('Fork error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to fork repository' });
  }
});

// Commit translated files to user's forked repository (Atomic Git commit)
app.post('/api/github/commit-translated', async (req, res) => {
  try {
    const {
      forkedOwner,
      forkedRepo,
      branchName = 'translated-chapters',
      files,
      commitMessage = 'Translate chapter contents while preserving exact JSON hierarchy',
      token,
    } = req.body as {
      forkedOwner: string;
      forkedRepo: string;
      branchName?: string;
      files: Array<{ path: string; content: string }>;
      commitMessage?: string;
      token: string;
    };

    if (!token) {
      return res.status(400).json({ error: 'GitHub Personal Access Token is required.' });
    }
    if (!forkedOwner || !forkedRepo || !files || files.length === 0) {
      return res.status(400).json({ error: 'Missing repository or files to commit.' });
    }

    const headers = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${token}`,
      'User-Agent': 'JSON-Chapter-Translator',
      'Content-Type': 'application/json',
    };

    // 1. Get repository info to find default branch
    const repoInfoRes = await fetch(
      `https://api.github.com/repos/${forkedOwner}/${forkedRepo}`,
      { headers }
    );
    if (!repoInfoRes.ok) {
      return res.status(repoInfoRes.status).json({
        error: 'Failed to access forked repository. Ensure your token has "repo" permissions.',
      });
    }
    const repoInfo = await repoInfoRes.json();
    const defaultBranch = repoInfo.default_branch || 'main';

    // 2. Get latest commit SHA on the default branch
    const refRes = await fetch(
      `https://api.github.com/repos/${forkedOwner}/${forkedRepo}/git/refs/heads/${defaultBranch}`,
      { headers }
    );
    if (!refRes.ok) {
      return res.status(refRes.status).json({
        error: `Could not retrieve default branch '${defaultBranch}' reference.`,
      });
    }
    const refData = await refRes.json();
    const baseCommitSha = refData.object.sha;

    // 3. Create Git Blobs for each translated file
    const treeEntries: Array<{ path: string; mode: string; type: string; sha: string }> = [];

    for (const f of files) {
      const blobRes = await fetch(
        `https://api.github.com/repos/${forkedOwner}/${forkedRepo}/git/blobs`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: f.content,
            encoding: 'utf-8',
          }),
        }
      );

      if (!blobRes.ok) {
        throw new Error(`Failed to create Git blob for ${f.path}`);
      }
      const blobData = await blobRes.json();
      treeEntries.push({
        path: f.path.replace(/^[/\\]+/, ''),
        mode: '100644',
        type: 'blob',
        sha: blobData.sha,
      });
    }

    // 4. Create new Git Tree with base_tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${forkedOwner}/${forkedRepo}/git/trees`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          base_tree: baseCommitSha,
          tree: treeEntries,
        }),
      }
    );
    if (!treeRes.ok) {
      throw new Error('Failed to create Git tree');
    }
    const treeData = await treeRes.json();
    const newTreeSha = treeData.sha;

    // 5. Create Git Commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${forkedOwner}/${forkedRepo}/git/commits`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: commitMessage,
          tree: newTreeSha,
          parents: [baseCommitSha],
        }),
      }
    );
    if (!commitRes.ok) {
      throw new Error('Failed to create Git commit');
    }
    const commitData = await commitRes.json();
    const newCommitSha = commitData.sha;

    // 6. Create or update target branch ref
    let branchRefRes = await fetch(
      `https://api.github.com/repos/${forkedOwner}/${forkedRepo}/git/refs/heads/${branchName}`,
      { headers }
    );

    let finalBranchUrl = `https://github.com/${forkedOwner}/${forkedRepo}/tree/${branchName}`;

    if (branchRefRes.ok) {
      // Update existing branch
      await fetch(
        `https://api.github.com/repos/${forkedOwner}/${forkedRepo}/git/refs/heads/${branchName}`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ sha: newCommitSha, force: true }),
        }
      );
    } else {
      // Create new branch
      const createRefRes = await fetch(
        `https://api.github.com/repos/${forkedOwner}/${forkedRepo}/git/refs`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ref: `refs/heads/${branchName}`,
            sha: newCommitSha,
          }),
        }
      );
      if (!createRefRes.ok) {
        throw new Error('Failed to create new branch reference');
      }
    }

    return res.json({
      success: true,
      commitSha: newCommitSha,
      branchName: branchName,
      branchUrl: finalBranchUrl,
      filesCommitted: files.length,
      htmlUrl: repoInfo.html_url,
    });
  } catch (error: any) {
    console.error('Commit error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to commit to GitHub' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JSON Translator Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
