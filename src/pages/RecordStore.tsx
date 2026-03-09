import { useState, useEffect } from 'react';
import { Store, Disc, Search, Filter, Play, Download, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { pcmToBase64Wav } from '../utils/audio';

export default function RecordStore() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [downloadingAlbum, setDownloadingAlbum] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/albums').then(res => res.json()).then(setAlbums);
  }, []);

  const styles = ['All', ...Array.from(new Set(albums.map(a => a.style)))];

  const filteredAlbums = albums.filter(album => {
    const matchesStyle = filter === 'All' || album.style === filter;
    const matchesSearch = album.title.toLowerCase().includes(search.toLowerCase());
    return matchesStyle && matchesSearch;
  });

  const handleDownloadAlbum = async (album: any) => {
    setDownloadingAlbum(album.id);
    try {
      const zip = new JSZip();
      
      // Add cover image
      if (album.cover_image_data) {
        zip.file('cover.png', album.cover_image_data, { base64: true });
      }

      // Fetch tracks
      const res = await fetch(`/api/albums/${album.id}/tracks`);
      const tracks = await res.json();

      tracks.forEach((track: any, index: number) => {
        if (track.audio_data) {
          zip.file(`${index + 1} - ${track.title}.wav`, pcmToBase64Wav(track.audio_data), { base64: true });
        }
      });

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${album.title}.zip`);
    } catch (error) {
      console.error('Failed to download album', error);
      alert('Failed to download album.');
    } finally {
      setDownloadingAlbum(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2 flex items-center gap-3">
            <Store className="w-10 h-10 text-indigo-500" />
            Judah Bless Records
          </h1>
          <p className="text-zinc-400 text-lg">Your virtual record store. Browse, play, and download your AI-generated albums.</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search albums..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none bg-zinc-900 border border-zinc-800 rounded-full pl-10 pr-8 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
            >
              {styles.map(s => <option key={s} value={s as string}>{s as string}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredAlbums.map(album => (
          <div key={album.id} className="group relative bg-zinc-900 rounded-2xl p-4 border border-zinc-800 hover:border-indigo-500/50 transition-all hover:shadow-2xl hover:shadow-indigo-500/10">
            <div className="aspect-square bg-zinc-800 rounded-xl overflow-hidden mb-4 relative shadow-lg shadow-black/40">
              {album.cover_image_data ? (
                <img src={`data:image/png;base64,${album.cover_image_data}`} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                  <Disc className="w-16 h-16 text-zinc-700" />
                </div>
              )}
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-4">
                <button className="w-14 h-14 bg-indigo-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition-transform shadow-lg shadow-indigo-500/30">
                  <Play className="w-6 h-6 ml-1" />
                </button>
                <button 
                  onClick={() => handleDownloadAlbum(album)}
                  disabled={downloadingAlbum === album.id}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {downloadingAlbum === album.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {downloadingAlbum === album.id ? 'Zipping...' : 'Download'}
                </button>
              </div>
            </div>
            
            <div className="px-1">
              <h3 className="font-bold text-lg text-white truncate mb-1" title={album.title}>{album.title}</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
                  {album.style}
                </span>
                <span className="text-xs text-zinc-500">
                  {new Date(album.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {filteredAlbums.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <Disc className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No albums found</h3>
            <p className="text-zinc-500">Try adjusting your search or filter, or create a new album in the Studio.</p>
          </div>
        )}
      </div>
    </div>
  );
}
