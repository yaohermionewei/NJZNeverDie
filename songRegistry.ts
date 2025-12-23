// Song Registry - centralized song metadata for playlist feature

// Import audio files
import dittoAudio from './songs/Ditto - 250 Remix.mp3';
import supernaturalAudio from './songs/Supernatural - 250 Remix.MP3';
import attentionAudio from './songs/Attention - 250 Remix.MP3';
import hypeBoyAudio from './songs/Hype Boy - 250 Remix.MP3';
import omgAudio from './songs/OMG - FRNK Remix.MP3';
import cookieAudio from './songs/Cookie - FRNK Remix.MP3';

// Import lyrics files (raw text)
import dittoLrc from './lyrics_official/Ditto - 250 Remix.json?raw';
import supernaturalLrc from './lyrics_official/Supernatural - 250 Remix.json?raw';
import attentionLrc from './lyrics_official/Attention - 250 Remix.json?raw';
import hypeBoyLrc from './lyrics_official/Hype Boy - 250 Remix.json?raw';
import omgLrc from './lyrics_official/OMG - FRNK Remix.json?raw';
import cookieLrc from './lyrics_official/Cookie - FRNK Remix.json?raw';

// Import cover images
import dittoCover from './albums/Ditto - 250 Remix.jpg';
import supernaturalCover from './albums/Supernatural - 250 Remix.png';
import attentionCover from './albums/Attention - 250 Remix.jpg';
import hypeBoyCoevr from './albums/Hype Boy - 250 Remix.jpg';
import omgCover from './albums/OMG - FRNK Remix.jpg';
import cookieCover from './albums/Cookie - FRNK Remix.jpg';

export interface SongInfo {
  id: string;
  title: string;
  artist: string;
  album: string;
  audioSrc: string;
  lrcSrc: string;
  coverUrl: string;
  themeColor: string; // 主题色，用于歌词高亮和频谱
  cubesTheme: 'pink' | 'purple' | 'green'; // Cubes 可视化配色方案
}

export const SONGS: SongInfo[] = [
  {
    id: 'ditto',
    title: 'Ditto - 250 Remix',
    artist: 'NewJeans',
    album: 'OMG',
    audioSrc: dittoAudio,
    lrcSrc: dittoLrc,
    coverUrl: dittoCover,
    themeColor: '#ff4d6a', // 红色
    cubesTheme: 'pink'
  },
  {
    id: 'supernatural',
    title: 'Supernatural - 250 Remix',
    artist: 'NewJeans',
    album: 'Supernatural',
    audioSrc: supernaturalAudio,
    lrcSrc: supernaturalLrc,
    coverUrl: supernaturalCover,
    themeColor: '#656EE5', // 紫蓝色
    cubesTheme: 'purple'
  },
  {
    id: 'attention',
    title: 'Attention - 250 Remix',
    artist: 'NewJeans',
    album: 'New Jeans',
    audioSrc: attentionAudio,
    lrcSrc: attentionLrc,
    coverUrl: attentionCover,
    themeColor: '#6BC567', // 绿色
    cubesTheme: 'green'
  },
  {
    id: 'hypeboy',
    title: 'Hype Boy - 250 Remix',
    artist: 'NewJeans',
    album: 'New Jeans',
    audioSrc: hypeBoyAudio,
    lrcSrc: hypeBoyLrc,
    coverUrl: hypeBoyCoevr,
    themeColor: '#6BC567', // 绿色
    cubesTheme: 'green'
  },
  {
    id: 'omg',
    title: 'OMG - FRNK Remix',
    artist: 'NewJeans',
    album: 'OMG',
    audioSrc: omgAudio,
    lrcSrc: omgLrc,
    coverUrl: omgCover,
    themeColor: '#6BC567', // 绿色
    cubesTheme: 'green'
  },
  {
    id: 'cookie',
    title: 'Cookie - FRNK Remix',
    artist: 'NewJeans',
    album: 'New Jeans',
    audioSrc: cookieAudio,
    lrcSrc: cookieLrc,
    coverUrl: cookieCover,
    themeColor: '#6BC567', // 绿色
    cubesTheme: 'green'
  }
];

export function getSongById(id: string): SongInfo | undefined {
  return SONGS.find(song => song.id === id);
}

export function getDefaultSong(): SongInfo {
  return SONGS[0];
}

