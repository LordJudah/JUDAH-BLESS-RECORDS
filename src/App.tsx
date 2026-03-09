/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Music, Video, Library, Disc, Store } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import MusicStudio from './pages/MusicStudio';
import VideoStudio from './pages/VideoStudio';
import MyLibrary from './pages/MyLibrary';
import Albums from './pages/Albums';
import RecordStore from './pages/RecordStore';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

function ApiKeyCheck({ children }: { children: React.ReactNode }) {
  const [hasKey, setHasKey] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasKey(has);
      } else {
        setHasKey(true);
      }
      setChecking(false);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  if (checking) return <div className="flex h-screen items-center justify-center bg-zinc-900 text-white">Checking API Key...</div>;

  if (!hasKey) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-900 text-white p-4">
        <div className="bg-zinc-800 p-8 rounded-2xl max-w-md text-center border border-zinc-700 shadow-xl">
          <Disc className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">API Key Required</h2>
          <p className="text-zinc-400 mb-6">
            Judah Bless Records uses premium AI models (Veo and Imagen) which require a paid Google Cloud project API key.
            <br/><br/>
            Please review the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">billing documentation</a>.
          </p>
          <button 
            onClick={handleSelectKey}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium transition-colors w-full"
          >
            Select API Key
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Sidebar() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Music Studio', icon: Music },
    { path: '/video-studio', label: 'Video Studio', icon: Video },
    { path: '/library', label: 'My Library', icon: Library },
    { path: '/albums', label: 'Albums', icon: Disc },
    { path: '/store', label: 'Judah Bless Records', icon: Store },
  ];

  return (
    <div 
      className="w-64 text-zinc-300 flex flex-col h-full border-r border-zinc-800 relative overflow-hidden"
      style={{
        backgroundImage: 'url("/sidebar-bg.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Dark overlay to ensure text readability */}
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-0"></div>
      
      <div className="p-6 relative z-10">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Disc className="w-6 h-6 text-indigo-500" />
          Judah Bless
        </h1>
        <p className="text-xs text-zinc-400 mt-1">AI Music & Video Studio</p>
      </div>
      <nav className="flex-1 px-4 space-y-2 relative z-10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                isActive 
                  ? "bg-indigo-500/20 text-indigo-300 font-medium backdrop-blur-md" 
                  : "hover:bg-zinc-900/50 hover:text-white"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ApiKeyCheck>
      <Router>
        <div className="flex h-screen bg-zinc-900 text-zinc-100 font-sans overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<MusicStudio />} />
              <Route path="/video-studio" element={<VideoStudio />} />
              <Route path="/library" element={<MyLibrary />} />
              <Route path="/albums" element={<Albums />} />
              <Route path="/store" element={<RecordStore />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ApiKeyCheck>
  );
}
