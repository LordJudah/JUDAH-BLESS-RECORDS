import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { GoogleAuth } from 'google-auth-library';

const db = new Database('judah_bless_records.db');

// Initialize DB schema
db.exec(`
  CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    prompt_id TEXT,
    style TEXT,
    audio_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(prompt_id) REFERENCES prompts(id)
  );

  CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    cover_image_data TEXT,
    style TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS album_tracks (
    album_id TEXT,
    track_id TEXT,
    PRIMARY KEY(album_id, track_id),
    FOREIGN KEY(album_id) REFERENCES albums(id),
    FOREIGN KEY(track_id) REFERENCES tracks(id)
  );

  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    track_id TEXT,
    album_id TEXT,
    prompt_id TEXT,
    video_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(track_id) REFERENCES tracks(id),
    FOREIGN KEY(album_id) REFERENCES albums(id),
    FOREIGN KEY(prompt_id) REFERENCES prompts(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  
  // 1. Generate Music (Lyria2 via Vertex API)
  app.post('/api/generate/music', async (req, res) => {
    try {
      const { prompt, style } = req.body;
      
      const promptId = uuidv4();
      db.prepare('INSERT INTO prompts (id, content, type, category) VALUES (?, ?, ?, ?)').run(promptId, prompt, 'music', style);

      const credsJson = process.env.VERTEX_CREDENTIALS_JSON;
      if (!credsJson) {
        throw new Error("VERTEX_CREDENTIALS_JSON environment variable is missing. Please add your Google Cloud Service Account JSON.");
      }

      let credentials;
      try {
        credentials = JSON.parse(credsJson);
      } catch (e) {
        throw new Error("VERTEX_CREDENTIALS_JSON is not a valid JSON string.");
      }

      const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      });

      const client = await auth.getClient();
      const accessToken = await client.getAccessToken();

      const projectId = credentials.project_id || process.env.VERTEX_PROJECT_ID;
      const location = process.env.VERTEX_LOCATION || 'us-central1';
      
      let endpoint = process.env.VERTEX_ENDPOINT;
      if (!endpoint) {
        endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/lyria-2:predict`;
      } else if (!endpoint.startsWith('http')) {
        // If they just provided the model path like "publishers/google/models/lyria-002"
        // Ensure it has the correct prefix and suffix
        const modelPath = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
        endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/${modelPath}`;
        if (!endpoint.endsWith(':predict')) {
          endpoint += ':predict';
        }
      }

      // Make the REST call to Vertex AI
      // NOTE: The payload structure (instances, parameters) might need to be tweaked depending on your exact Lyria2 configuration.
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: `Style: ${style}. ${prompt}`,
            }
          ],
          parameters: {
            sampleCount: 1,
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Vertex API Error: ${response.status} ${errText}`);
      }

      const data = await response.json();
      
      // Extract audio data. Adjust this path based on the exact response format of your Lyria2 deployment.
      let base64Audio = null;
      if (data.predictions && data.predictions.length > 0) {
        const pred = data.predictions[0];
        base64Audio = pred.audio || pred.audioBytes || pred.bytesBase64Encoded || pred.content || pred.output || (typeof pred === 'string' ? pred : null);
      }

      if (!base64Audio || typeof base64Audio !== 'string') {
        const responsePreview = JSON.stringify(data).substring(0, 300);
        throw new Error(`Audio data not found. Vertex response: ${responsePreview}`);
      }

      const trackId = uuidv4();
      const title = `${style} Track - ${new Date().toLocaleTimeString()}`;
      
      db.prepare('INSERT INTO tracks (id, title, prompt_id, style, audio_data) VALUES (?, ?, ?, ?, ?)').run(trackId, title, promptId, style, base64Audio);

      res.json({ id: trackId, title, style, audio_data: base64Audio, prompt_id: promptId });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || 'Failed to generate music' });
    }
  });

  app.post('/api/prompts', (req, res) => {
    const { id, content, type, category } = req.body;
    db.prepare('INSERT INTO prompts (id, content, type, category) VALUES (?, ?, ?, ?)').run(id, content, type, category);
    res.json({ success: true });
  });

  app.post('/api/tracks', (req, res) => {
    const { id, title, prompt_id, style, audio_data } = req.body;
    db.prepare('INSERT INTO tracks (id, title, prompt_id, style, audio_data) VALUES (?, ?, ?, ?, ?)').run(id, title, prompt_id, style, audio_data);
    res.json({ success: true });
  });

  app.post('/api/videos', (req, res) => {
    const { id, track_id, album_id, prompt_id, video_url } = req.body;
    db.prepare('INSERT INTO videos (id, track_id, album_id, prompt_id, video_url) VALUES (?, ?, ?, ?, ?)').run(id, track_id, album_id, prompt_id, video_url);
    res.json({ success: true });
  });

  app.get('/api/tracks', (req, res) => {
    const tracks = db.prepare('SELECT * FROM tracks ORDER BY created_at DESC').all();
    res.json(tracks);
  });

  app.delete('/api/tracks/:id', (req, res) => {
    const { id } = req.params;
    try {
      db.transaction(() => {
        // Delete related records first to maintain referential integrity
        db.prepare('DELETE FROM album_tracks WHERE track_id = ?').run(id);
        db.prepare('DELETE FROM videos WHERE track_id = ?').run(id);
        db.prepare('DELETE FROM tracks WHERE id = ?').run(id);
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error('Failed to delete track:', error);
      res.status(500).json({ error: 'Failed to delete track' });
    }
  });

  app.get('/api/prompts', (req, res) => {
    const prompts = db.prepare('SELECT * FROM prompts ORDER BY created_at DESC').all();
    res.json(prompts);
  });

  app.get('/api/albums', (req, res) => {
    const albums = db.prepare('SELECT * FROM albums ORDER BY created_at DESC').all();
    res.json(albums);
  });

  app.get('/api/albums/:id', (req, res) => {
    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(req.params.id);
    res.json(album || null);
  });

  app.post('/api/albums', (req, res) => {
    const { id, title, cover_image_data, style, track_ids } = req.body;
    
    db.transaction(() => {
      db.prepare('INSERT INTO albums (id, title, cover_image_data, style) VALUES (?, ?, ?, ?)').run(id, title, cover_image_data, style);
      
      if (track_ids && track_ids.length > 0) {
        const insertTrack = db.prepare('INSERT INTO album_tracks (album_id, track_id) VALUES (?, ?)');
        for (const trackId of track_ids) {
          insertTrack.run(id, trackId);
        }
      }
    })();
    
    res.json({ success: true });
  });

  app.get('/api/albums/:id/tracks', (req, res) => {
    const tracks = db.prepare(`
      SELECT t.* FROM tracks t
      JOIN album_tracks at ON t.id = at.track_id
      WHERE at.album_id = ?
    `).all(req.params.id);
    res.json(tracks);
  });

  app.get('/api/videos', (req, res) => {
    const videos = db.prepare(`
      SELECT v.*, a.cover_image_data 
      FROM videos v 
      LEFT JOIN albums a ON v.album_id = a.id 
      ORDER BY v.created_at DESC
    `).all();
    res.json(videos);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
