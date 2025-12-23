export interface LyricLine {
  time: number; // Time in seconds
  text: string;
}

export interface SongMeta {
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
}

// ThemeMode includes hidden/debug themes that may not be exposed in the UI drawer.
export type ThemeMode = 'vinyl' | 'particle' | 'cubes' | 'powerpuff' | 'liquid' | 'fireworks';

export interface VinylParams {
  vinylSpeed: number;
  rabbitSpeed: number;
}
