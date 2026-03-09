import { useState } from 'react';
import { Play, Loader2, Music, Save, AlertCircle } from 'lucide-react';
import { pcmToBase64Wav } from '../utils/audio';

export default function MusicStudio() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('Hip Hop');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTrack, setGeneratedTrack] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    setErrorMsg(null);
    setGeneratedTrack(null);
    try {
      const response = await fetch('/api/generate/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      // If the API returns raw PCM, we convert it. If it returns WAV, this function handles it.
      const wavBase64 = pcmToBase64Wav(data.audio_data);
      
      setGeneratedTrack({ ...data, audio_data: wavBase64 });
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || 'Failed to generate music. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Music Studio</h1>
        <p className="text-zinc-400">Generate new tracks using AI based on your prompts and styles.</p>
      </div>

      <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 mb-8">
        <div className="space-y-6">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm overflow-auto break-words whitespace-pre-wrap">{errorMsg}</div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Musical Style / Genre
            </label>
            <select 
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="Hip Hop">Hip Hop</option>
              <option value="R&B">R&B</option>
              <option value="Pop">Pop</option>
              <option value="Electronic">Electronic</option>
              <option value="Rock">Rock</option>
              <option value="Jazz">Jazz</option>
              <option value="Classical">Classical</option>
              <option value="Lo-Fi">Lo-Fi</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Prompt Description
            </label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the mood, instruments, tempo, and theme..."
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
                Generating Track...
              </>
            ) : (
              <>
                <Music className="w-5 h-5" />
                Generate Track
              </>
            )}
          </button>
        </div>
      </div>

      {generatedTrack && (
        <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-semibold text-white mb-4">Generated Track</h2>
          <div className="flex items-center gap-4 bg-zinc-900 p-4 rounded-xl">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
              <Play className="w-6 h-6 ml-1" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white">{generatedTrack.title}</h3>
              <p className="text-sm text-zinc-400">{generatedTrack.style}</p>
            </div>
            <audio controls src={`data:audio/wav;base64,${generatedTrack.audio_data}`} className="h-10" />
          </div>
          <p className="text-sm text-zinc-500 mt-4 text-center">
            Track has been automatically saved to your Library.
          </p>
        </div>
      )}
    </div>
  );
}
