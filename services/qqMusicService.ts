import { SongInfo } from '../songRegistry';

const BASE_URL = 'http://localhost:3300';

/**
 * 将 QQ 音乐的原始数据映射为项目定义的 SongInfo 格式
 */
const mapQQToSongInfo = (qqSong: any): SongInfo => {
  return {
    id: qqSong.songmid,
    title: qqSong.songname,
    artist: qqSong.singer.map((s: any) => s.name).join('/'),
    album: qqSong.albumname,
    // QQ 音乐封面拼接规则：T002R300x300M000 + albummid
    coverUrl: `https://y.gtimg.cn/music/photo_new/T002R300x300M000${qqSong.albummid}.jpg`,
    audioSrc: '', // 初始为空，播放时动态获取
    lrcSrc: '',   // 同上
    themeColor: '#656EE5', // 默认紫色，后续可以根据封面动态提取
    cubesTheme: 'purple'
  };
};

/**
 * 搜索歌曲
 */
export const searchQQMusic = async (keyword: string): Promise<SongInfo[]> => {
  try {
    const res = await fetch(`${BASE_URL}/search?key=${encodeURIComponent(keyword)}`);
    const data = await res.json();
    if (data.result === 100 && data.data && data.data.list) {
      return data.data.list.map(mapQQToSongInfo);
    }
    return [];
  } catch (error) {
    console.error('QQ Music search failed:', error);
    return [];
  }
};

/**
 * 获取播放地址
 */
export const getPlayUrl = async (songmid: string): Promise<string> => {
  try {
    const res = await fetch(`${BASE_URL}/song/url?id=${songmid}`);
    const data = await res.json();
    // API 通常返回一个对象，key 为 songmid，value 为播放地址
    return data.data || '';
  } catch (error) {
    console.error('Failed to get play URL:', error);
    return '';
  }
};

/**
 * 获取歌词
 */
export const getLyrics = async (songmid: string): Promise<string> => {
  try {
    const res = await fetch(`${BASE_URL}/lyric?songmid=${songmid}`);
    const data = await res.json();
    if (data.result === 100 && data.data) {
      return data.data.lyric || '';
    }
    return '';
  } catch (error) {
    console.error('Failed to get lyrics:', error);
    return '';
  }
};

