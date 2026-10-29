export interface ExtractedStringItem {
  id: number;
  path: (string | number)[];
  text: string;
}

export type FileStatus = 'pending' | 'translating' | 'completed' | 'error';

export interface ChapterFile {
  id: string;
  name: string;
  relativePath: string;
  sizeBytes: number;
  rawSource: string;
  parsedSource: any;
  indentation: string | number;
  extractedItems: ExtractedStringItem[];
  translatedRaw?: string;
  translatedParsed?: any;
  status: FileStatus;
  progressPercent: number;
  errorMessage?: string;
  translatedItemsMap?: Record<number, string>;
}

export interface TranslationSettings {
  sourceLanguage: string;
  targetLanguage: string;
  contextTone: string;
  excludedKeys: string[];
  preserveNumbersAndDates: boolean;
  concurrencyLimit: number;
  batchChunkSize: number;
  customGlossary: Record<string, string>;
}

export interface TranslationStat {
  totalFiles: number;
  completedFiles: number;
  inProgressFiles: number;
  failedFiles: number;
  totalStrings: number;
  translatedStrings: number;
}
