import { ExtractedStringItem } from '../types/translation';

/**
 * Detects the indentation style of a JSON string (default: 2 spaces)
 */
export function detectIndentation(jsonStr: string): number | string {
  // If minified or single line without indentation
  if (!jsonStr.includes('\n')) return 0;
  const match = jsonStr.match(/^[ \t]+(?=["{\[])/m);
  if (!match) return 2;
  const indent = match[0];
  if (indent.includes('\t')) return '\t';
  return indent.length;
}

/**
 * Checks if a string value should be skipped for translation
 * e.g. pure numbers, dates, urls, colors, UUIDs, single non-alphabet tokens
 */
export function isNonTranslatableString(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return true;

  // Pure numbers or version strings like "1.2.3"
  if (/^v?\d+(\.\d+)*$/.test(trimmed)) return true;

  // Hex colors e.g. #fff, #1a2b3c
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) return true;

  // URLs (must start with http://, https://, mailto:, file://)
  if (/^(https?:\/\/|mailto:|file:\/\/)/i.test(trimmed)) return true;

  // File paths with media or data extensions (e.g. image.png, /audio/test.mp3)
  if (/^[a-zA-Z0-9_\-\/\\.]+\.(png|jpe?g|svg|webp|mp3|wav|mp4|json|xml|csv|pdf)$/i.test(trimmed)) return true;

  // Exact email addresses
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed)) return true;

  // UUIDs / IDs (exact 36-char hex)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return true;

  // ISO Dates (e.g. 2026-10-22T06:42:00Z)
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/.test(trimmed)) return true;

  return false;
}

/**
 * Checks if a key should be excluded based on user exclusion list
 */
function isKeyExcluded(key: string | number, excludedKeys: string[]): boolean {
  if (typeof key === 'number') return false; // Array indices are not keys
  const lowerKey = String(key).toLowerCase().trim();
  return excludedKeys.some((ex) => lowerKey === ex.toLowerCase().trim());
}

/**
 * Extracts translatable strings from JSON object while maintaining full path
 */
export function extractTranslatableStrings(
  obj: any,
  options: {
    excludedKeys: string[];
    preserveNumbersAndDates: boolean;
  }
): { items: ExtractedStringItem[]; count: number } {
  const items: ExtractedStringItem[] = [];
  let currentId = 1;

  function traverse(current: any, path: (string | number)[]) {
    if (current === null || current === undefined) {
      return;
    }

    if (Array.isArray(current)) {
      current.forEach((item, index) => {
        traverse(item, [...path, index]);
      });
      return;
    }

    if (typeof current === 'object') {
      for (const [key, value] of Object.entries(current)) {
        if (isKeyExcluded(key, options.excludedKeys)) {
          continue;
        }
        traverse(value, [...path, key]);
      }
      return;
    }

    if (typeof current === 'string') {
      // Check if string should be excluded
      if (options.preserveNumbersAndDates && isNonTranslatableString(current)) {
        return;
      }

      items.push({
        id: currentId++,
        path: [...path],
        text: current,
      });
    }
  }

  traverse(obj, []);
  return { items, count: items.length };
}

/**
 * Injects translated strings back into the exact original JSON structure
 */
export function rebuildTranslatedJson(
  originalObj: any,
  translationsMap: Record<number, string>,
  items: ExtractedStringItem[],
  indentation: number | string = 2
): { translatedObj: any; formattedJson: string } {
  // Deep clone to guarantee immutability of the original
  const cloned = structuredClone(originalObj);

  for (const item of items) {
    const translatedText = translationsMap[item.id];
    if (translatedText === undefined) continue;

    // Navigate to parent and update value
    let parent = cloned;
    for (let i = 0; i < item.path.length - 1; i++) {
      const segment = item.path[i];
      if (parent[segment] === undefined) {
        parent = undefined;
        break;
      }
      parent = parent[segment];
    }

    if (parent !== undefined && item.path.length > 0) {
      const lastKey = item.path[item.path.length - 1];
      parent[lastKey] = translatedText;
    }
  }

  const formattedJson =
    indentation === 0
      ? JSON.stringify(cloned)
      : JSON.stringify(cloned, null, indentation);
  return { translatedObj: cloned, formattedJson };
}

/**
 * Splits array into chunks of max N items
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Splits extracted items into smart chunks considering both item count and character limit
 */
export function createSmartChunks(
  items: ExtractedStringItem[],
  maxItems: number = 45,
  maxChars: number = 3200
): ExtractedStringItem[][] {
  const chunks: ExtractedStringItem[][] = [];
  let currentChunk: ExtractedStringItem[] = [];
  let currentChars = 0;

  for (const item of items) {
    const itemLength = item.text.length;
    // If adding this item exceeds maxItems or maxChars (and current chunk is not empty)
    if (
      (currentChunk.length >= maxItems || currentChars + itemLength > maxChars) &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentChars = 0;
    }

    currentChunk.push(item);
    currentChars += itemLength;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}
