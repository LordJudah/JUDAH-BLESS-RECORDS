import { useState, useEffect } from 'react';
import { Video, Loader2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';

export default function VideoStudio() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [operationName, setOperationName] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<any>(null);
  const [albums, setAlbums] = useState<any[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<string>('');
  const [tracks, setTracks] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string>('');
  const [promptId, setPromptId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/albums').then(res => res.json()).then(setAlbums);
    fetch('/api/tracks').then(res => res.json()).then(setTracks);
  }, []);

  useEffect(() => {
    let interval: any;
    if (operationName && !generatedVideo) {
      interval = setInterval(async () => {
        try {
          const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY || process.env.GEMINI_API_KEY });
          let operation = await ai.operations.getVideosOperation({ operation: { name: operationName } as any });
          
          if (operation.done) {
            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
              const videoId = uuidv4();
              await fetch('/api/videos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: videoId,
                  track_id: selectedTrack || null,
                  album_id: selectedAlbum || null,
                  prompt_id: promptId,
                  video_url: downloadLink
                })
              });
              setGeneratedVideo({ id: videoId, video_url: downloadLink });
            } else {
              alert('No video generated');
            }
            setOperationName(null);
            setIsGenerating(false);
          }
        } catch (e) {
          console.error(e);
        }
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [operationName, generatedVideo, selectedAlbum, selectedTrack, promptId]);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setGeneratedVideo(null);
    try {
      const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY || process.env.GEMINI_API_KEY });
      
      const newPromptId = uuidv4();
      setPromptId(newPromptId);
      await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newPromptId, content: prompt, type: 'video', category: 'music_video' })
      });

      let imageBytes;
      if (selectedAlbum) {
        const res = await fetch(`/api/albums/${selectedAlbum}`);
        const album = await res.json();
        if (album && album.cover_image_data) {
          imageBytes = album.cover_image_data;
        }
      }

      const videoConfig: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      };

      if (imageBytes) {
        videoConfig.image = {
          imageBytes: imageBytes,
          mimeType: 'image/png'
        };
      }

      let operation = await ai.models.generateVideos(videoConfig);
      setOperationName(operation.name);
    } catch (error) {
      console.error(error);
      alert('Failed to start video generation.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Video Studio</h1>
        <p className="text-zinc-400">Generate music videos using Veo based on your prompts and album art.</p>
      </div>

      <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 mb-8">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Select Track (Optional)
              </label>
              <select 
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              >
                <option value="">None</option>
                {tracks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Select Album Art (Optional)
              </label>
              <select 
                value={selectedAlbum}
                onChange={(e) => setSelectedAlbum(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              >
                <option value="">None</option>
                {albums.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Video Prompt
            </label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the visual style, action, and atmosphere of the music video..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white h-32 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !prompt}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {operationName ? 'Generating Video (This may take a few minutes)...' : 'Starting Generation...'}
              </>
            ) : (
              <>
                <Video className="w-5 h-5" />
                Generate Music Video
              </>
            )}
          </button>
        </div>
      </div>

      {generatedVideo && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            <h2 className="text-xl font-semibold text-white">Video Generated Successfully</h2>
          </div>
          <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4">
            <video 
              controls 
              src={generatedVideo.video_url} 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex justify-end">
            <a 
              href={generatedVideo.video_url} 
              download
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
            >
              Download Video
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
