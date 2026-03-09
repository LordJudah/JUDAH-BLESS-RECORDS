import { useState, useEffect } from 'react';
import { Disc, Plus, Image as ImageIcon, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';

export default function Albums() {
  const [albums, setAlbums] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('Hip Hop');
  const [prompt, setPrompt] = useState('');
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/albums').then(res => res.json()).then(setAlbums);
    fetch('/api/tracks').then(res => res.json()).then(setTracks);
  }, []);

  const handleGenerateArt = async () => {
    if (!prompt) return;
    setIsGeneratingArt(true);
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY || process.env.GEMINI_API_KEY });
      
      const promptId = uuidv4();
      await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promptId, content: prompt, type: 'image', category: style })
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts: [{ text: `Album cover for a ${style} album. ${prompt}` }] },
        config: {
          imageConfig: { aspectRatio: "1:1", imageSize: "1K" }
        }
      });

      let base64Image = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }

      if (!base64Image) {
        throw new Error("Failed to generate image");
      }

      setCoverImage(base64Image);
    } catch (error) {
      console.error(error);
      alert('Failed to generate album art.');
    } finally {
      setIsGeneratingArt(false);
    }
  };

  const handleCreateAlbum = async () => {
    if (!title) return;
    try {
      const albumId = uuidv4();
      const response = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: albumId,
          title,
          style,
          cover_image_data: coverImage,
          track_ids: selectedTracks
        })
      });
      const data = await response.json();
      if (!data.success) throw new Error('Failed');
      
      // Reset form and refresh
      setIsCreating(false);
      setTitle('');
      setPrompt('');
      setCoverImage(null);
      setSelectedTracks([]);
      fetch('/api/albums').then(res => res.json()).then(setAlbums);
    } catch (error) {
      console.error(error);
      alert('Failed to create album.');
    }
  };

  const toggleTrack = (id: string) => {
    setSelectedTracks(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Albums</h1>
          <p className="text-zinc-400">Organize your generated tracks into albums with custom AI cover art.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Create Album
        </button>
      </div>

      {isCreating && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 mb-8 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-semibold text-white mb-6">New Album</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Album Title</label>
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Midnight Beats Vol. 1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Primary Style</label>
                <select 
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Hip Hop">Hip Hop</option>
                  <option value="R&B">R&B</option>
                  <option value="Pop">Pop</option>
                  <option value="Electronic">Electronic</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Select Tracks</label>
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl h-48 overflow-y-auto p-2 space-y-1">
                  {tracks.map(track => (
                    <label key={track.id} className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedTracks.includes(track.id)}
                        onChange={() => toggleTrack(track.id)}
                        className="w-4 h-4 rounded border-zinc-600 text-indigo-600 focus:ring-indigo-500 bg-zinc-800"
                      />
                      <span className="text-sm text-zinc-300">{track.title}</span>
                    </label>
                  ))}
                  {tracks.length === 0 && <p className="text-zinc-500 text-sm p-2">No tracks available.</p>}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Cover Art Prompt</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Describe the album cover..."
                  />
                  <button 
                    onClick={handleGenerateArt}
                    disabled={isGeneratingArt || !prompt}
                    className="bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 text-white px-4 rounded-xl transition-colors flex items-center justify-center"
                  >
                    {isGeneratingArt ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="aspect-square bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden flex items-center justify-center">
                {coverImage ? (
                  <img src={`data:image/png;base64,${coverImage}`} alt="Cover Art" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-zinc-600 flex flex-col items-center gap-2">
                    <Disc className="w-12 h-12 opacity-50" />
                    <span className="text-sm">No cover art generated</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button 
              onClick={() => setIsCreating(false)}
              className="px-6 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreateAlbum}
              disabled={!title}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
            >
              Save Album
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {albums.map(album => (
          <div key={album.id} className="group cursor-pointer">
            <div className="aspect-square bg-zinc-800 rounded-2xl overflow-hidden mb-3 relative shadow-lg shadow-black/20">
              {album.cover_image_data ? (
                <img src={`data:image/png;base64,${album.cover_image_data}`} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                  <Disc className="w-12 h-12 text-zinc-600" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                  <Disc className="w-6 h-6" />
                </div>
              </div>
            </div>
            <h3 className="font-semibold text-white truncate">{album.title}</h3>
            <p className="text-sm text-zinc-400">{album.style}</p>
          </div>
        ))}
        {albums.length === 0 && !isCreating && (
          <p className="text-zinc-500 col-span-full">No albums created yet.</p>
        )}
      </div>
    </div>
  );
}
