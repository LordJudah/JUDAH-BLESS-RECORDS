import { useState, useEffect } from 'react';
import { Music, MessageSquare, Video, Play, Trash2 } from 'lucide-react';
import { pcmToBase64Wav } from '../utils/audio';

export default function MyLibrary() {
  const [activeTab, setActiveTab] = useState<'tracks' | 'prompts' | 'videos'>('tracks');
  const [tracks, setTracks] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/tracks').then(res => res.json()).then(setTracks);
    fetch('/api/prompts').then(res => res.json()).then(setPrompts);
    fetch('/api/videos').then(res => res.json()).then(setVideos);
  }, []);

  const handleDeleteTrack = async (id: string) => {
    if (!confirm('Are you sure you want to delete this track?')) return;
    
    try {
      const res = await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete track');
      
      setTracks(tracks.filter(track => track.id !== id));
    } catch (error) {
      console.error(error);
      alert('Failed to delete track. Please try again.');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Library</h1>
        <p className="text-zinc-400">All your generated tracks, videos, and saved prompts.</p>
      </div>

      <div className="flex gap-4 mb-8 border-b border-zinc-800 pb-4">
        <button 
          onClick={() => setActiveTab('tracks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'tracks' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white'}`}
        >
          <Music className="w-4 h-4" /> Tracks
        </button>
        <button 
          onClick={() => setActiveTab('videos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'videos' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white'}`}
        >
          <Video className="w-4 h-4" /> Videos
        </button>
        <button 
          onClick={() => setActiveTab('prompts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'prompts' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white'}`}
        >
          <MessageSquare className="w-4 h-4" /> Prompts
        </button>
      </div>

      {activeTab === 'tracks' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tracks.map(track => (
            <div key={track.id} className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 hover:bg-zinc-800 transition-colors relative group">
              <button 
                onClick={() => handleDeleteTrack(track.id)}
                className="absolute top-4 right-4 p-2 bg-zinc-900/80 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                title="Delete Track"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 mb-4">
                <Music className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-white mb-1 truncate pr-8">{track.title}</h3>
              <p className="text-sm text-zinc-400 mb-4">{track.style}</p>
              <audio controls src={`data:audio/wav;base64,${pcmToBase64Wav(track.audio_data)}`} className="w-full h-10" />
            </div>
          ))}
          {tracks.length === 0 && <p className="text-zinc-500 col-span-full">No tracks generated yet.</p>}
        </div>
      )}

      {activeTab === 'videos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map(video => (
            <div key={video.id} className="bg-zinc-800/50 border border-zinc-700 rounded-2xl overflow-hidden hover:bg-zinc-800 transition-colors">
              <div className="aspect-video bg-black relative">
                {video.cover_image_data && (
                  <img src={`data:image/png;base64,${video.cover_image_data}`} alt="Album Cover" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                )}
                <video controls src={video.video_url} className="w-full h-full object-contain relative z-10" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-1">Music Video</h3>
                <p className="text-xs text-zinc-500">{new Date(video.created_at).toLocaleDateString()}</p>
                <a href={video.video_url} download className="mt-4 block text-center text-sm bg-zinc-700 hover:bg-zinc-600 text-white py-2 rounded-lg transition-colors">
                  Download
                </a>
              </div>
            </div>
          ))}
          {videos.length === 0 && <p className="text-zinc-500 col-span-full">No videos generated yet.</p>}
        </div>
      )}

      {activeTab === 'prompts' && (
        <div className="space-y-4">
          {prompts.map(prompt => (
            <div key={prompt.id} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 flex items-start gap-4">
              <div className="mt-1">
                {prompt.type === 'music' ? <Music className="w-5 h-5 text-indigo-400" /> : 
                 prompt.type === 'video' ? <Video className="w-5 h-5 text-emerald-400" /> : 
                 <MessageSquare className="w-5 h-5 text-amber-400" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{prompt.type}</span>
                  <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">{prompt.category}</span>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed">{prompt.content}</p>
              </div>
            </div>
          ))}
          {prompts.length === 0 && <p className="text-zinc-500">No prompts saved yet.</p>}
        </div>
      )}
    </div>
  );
}
