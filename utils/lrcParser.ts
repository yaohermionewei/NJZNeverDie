import { LyricLine } from '../types';

/**
 * Parse lyrics from either:
 * 1) Official JSON array: [{ time: number(ms), lyric: string }, ...]
 * 2) Classic LRC text: [mm:ss.xx] lyric
 *
 * Return format is always seconds-based: LyricLine { time: number(seconds), text: string }.
 */
export const parseLrc = (content: string): LyricLine[] => {
  const raw = (content ?? '').replace(/^\uFEFF/, '').trim();

  // --- 1) Official JSON (preferred) ---
  // Example: [{"time":0,"lyric":"..."}, ...]
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const mapped = parsed
          .map((item, index) => {
            const tMs = Number((item as any)?.time);
            const text = (item as any)?.lyric ?? (item as any)?.text ?? '';
            if (!Number.isFinite(tMs)) return null;
            return { time: tMs / 1000, text: String(text ?? ''), _i: index };
          })
          .filter((x): x is { time: number; text: string; _i: number } => !!x)
          .sort((a, b) => a.time - b.time || a._i - b._i)
          .map(({ time, text }) => ({ time, text }));

        // If JSON is valid but empty, return empty array (no need to fallback).
        if (mapped.length === 0) return [];
        return mapped;
      }
    } catch {
      // Fall through to LRC parsing
    }
  }

  // --- 2) Fallback: LRC ---
  const lines = raw.split('\n');
  const lyricLines: LyricLine[] = [];

  // Regex to match [mm:ss.xx] or [mm:ss]
  // Supports 2 or 3 digits for milliseconds
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const match = timeRegex.exec(trimmedLine);
    if (!match) continue;

    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);

    // LRC fraction is usually centiseconds (2 digits) but some files use milliseconds (3 digits).
    const fractionStr = match[3] || '0';
    const fraction = parseFloat(`0.${fractionStr}`);

    const time = minutes * 60 + seconds + fraction;
    const text = trimmedLine.replace(timeRegex, '').trim();

    lyricLines.push({ time, text });
  }

  return lyricLines.sort((a, b) => a.time - b.time);
};

