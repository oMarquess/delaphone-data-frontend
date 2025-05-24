'use client';

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Howl } from 'howler';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, X, Move, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AudioPlayerState {
  isVisible: boolean;
  isPlaying: boolean;
  currentTrack: {
    src: string;
    title?: string;
  } | null;
  duration: number;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  position: { x: number; y: number };
}

interface AudioPlayerContextType {
  state: AudioPlayerState;
  playAudio: (src: string, title?: string) => void;
  togglePlay: () => void;
  closePlayer: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  seek: (time: number) => void;
  skip: (seconds: number) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return context;
};

interface AudioPlayerProviderProps {
  children: React.ReactNode;
}

export function AudioPlayerProvider({ children }: AudioPlayerProviderProps) {
  const router = useRouter();
  const [state, setState] = useState<AudioPlayerState>({
    isVisible: false,
    isPlaying: false,
    currentTrack: null,
    duration: 0,
    currentTime: 0,
    volume: 1,
    isMuted: false,
    isLoading: false,
    position: { x: 0, y: 0 }
  });

  const soundRef = useRef<Howl | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Set initial position after component mounts
  useEffect(() => {
    setState(prev => ({
      ...prev,
      position: { 
        x: window.innerWidth - 420, 
        y: window.innerHeight - 200 
      }
    }));
  }, []);

  // Cleanup function
  const cleanup = () => {
    if (soundRef.current) {
      soundRef.current.stop();
      soundRef.current.unload();
      soundRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // Cleanup on route change
  useEffect(() => {
    const handleRouteChange = () => {
      cleanup();
      setState(prev => ({
        ...prev,
        isVisible: false,
        isPlaying: false,
        currentTrack: null,
        duration: 0,
        currentTime: 0
      }));
    };

    // Listen for route changes (this might need adjustment based on your router setup)
    return () => {
      handleRouteChange();
    };
  }, [router]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  const playAudio = (src: string, title?: string) => {
    // Clean up existing audio
    cleanup();

    setState(prev => ({
      ...prev,
      isVisible: true,
      isLoading: true,
      currentTrack: { src, title },
      currentTime: 0,
      duration: 0
    }));

    soundRef.current = new Howl({
      src: [src],
      html5: true,
      format: ['wav'],
      onload: () => {
        setState(prev => ({
          ...prev,
          isLoading: false,
          duration: soundRef.current?.duration() || 0
        }));
      },
      onloaderror: (id, error) => {
        console.error('Error loading audio:', error);
        setState(prev => ({
          ...prev,
          isLoading: false
        }));
      },
      onend: () => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          currentTime: 0
        }));
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      },
      onplayerror: (id, error) => {
        console.error('Error playing audio:', error);
        setState(prev => ({
          ...prev,
          isPlaying: false,
          isLoading: false
        }));
      }
    });

    // Auto play
    setTimeout(() => {
      if (soundRef.current) {
        soundRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true }));
        
        // Start progress tracking
        progressIntervalRef.current = setInterval(() => {
          if (soundRef.current) {
            const currentTime = soundRef.current.seek();
            setState(prev => ({ ...prev, currentTime }));
          }
        }, 100);
      }
    }, 100);
  };

  const togglePlay = () => {
    if (!soundRef.current) return;

    if (state.isPlaying) {
      soundRef.current.pause();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    } else {
      soundRef.current.play();
      progressIntervalRef.current = setInterval(() => {
        if (soundRef.current) {
          const currentTime = soundRef.current.seek();
          setState(prev => ({ ...prev, currentTime }));
        }
      }, 100);
    }

    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const closePlayer = () => {
    cleanup();
    setState(prev => ({
      ...prev,
      isVisible: false,
      isPlaying: false,
      currentTrack: null,
      duration: 0,
      currentTime: 0
    }));
  };

  const setVolume = (volume: number) => {
    if (soundRef.current) {
      soundRef.current.volume(volume);
    }
    setState(prev => ({ 
      ...prev, 
      volume, 
      isMuted: volume === 0 
    }));
  };

  const toggleMute = () => {
    if (soundRef.current) {
      const newMuted = !state.isMuted;
      soundRef.current.mute(newMuted);
      setState(prev => ({ ...prev, isMuted: newMuted }));
    }
  };

  const seek = (time: number) => {
    if (soundRef.current) {
      soundRef.current.seek(time);
      setState(prev => ({ ...prev, currentTime: time }));
    }
  };

  const skip = (seconds: number) => {
    if (soundRef.current) {
      const newTime = Math.max(0, Math.min(state.duration, state.currentTime + seconds));
      soundRef.current.seek(newTime);
      setState(prev => ({ ...prev, currentTime: newTime }));
    }
  };

  const contextValue: AudioPlayerContextType = {
    state,
    playAudio,
    togglePlay,
    closePlayer,
    setVolume,
    toggleMute,
    seek,
    skip
  };

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {children}
      {state.isVisible && <FloatingAudioPlayer />}
    </AudioPlayerContext.Provider>
  );
}

function FloatingAudioPlayer() {
  const { state, togglePlay, closePlayer, setVolume, toggleMute, seek, skip } = useAudioPlayer();
  const playerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(state.position);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!playerRef.current) return;
    
    const rect = playerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !playerRef.current) return;

    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;

    // Keep within viewport bounds
    const maxX = window.innerWidth - playerRef.current.offsetWidth;
    const maxY = window.innerHeight - playerRef.current.offsetHeight;

    const boundedX = Math.max(0, Math.min(x, maxX));
    const boundedY = Math.max(0, Math.min(y, maxY));

    setPosition({ x: boundedX, y: boundedY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={playerRef}
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-96"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-t-lg cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <Move size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Audio Player
          </span>
          {state.isPlaying && (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
        <button
          onClick={closePlayer}
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X size={16} />
        </button>
      </div>

      {/* Player Content */}
      <div className="p-4">
        {/* Track Info */}
        {state.currentTrack?.title && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {state.currentTrack.title}
            </p>
          </div>
        )}

        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-12">
            {formatTime(state.currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={state.duration}
            value={state.currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            disabled={state.isLoading}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 w-12">
            {formatTime(state.duration)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => skip(-10)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              disabled={state.isLoading}
            >
              <SkipBack size={20} />
            </button>

            <button
              onClick={togglePlay}
              disabled={state.isLoading || !state.currentTrack}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
            >
              {state.isLoading ? (
                <div className="w-6 h-6 border-2 border-t-transparent border-blue-500 rounded-full animate-spin" />
              ) : state.isPlaying ? (
                <Pause size={24} />
              ) : (
                <Play size={24} />
              )}
            </button>

            <button
              onClick={() => skip(10)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              disabled={state.isLoading}
            >
              <SkipForward size={20} />
            </button>

            <button
              onClick={() => {
                if (state.currentTrack?.src) {
                  const link = document.createElement('a');
                  link.href = state.currentTrack.src;
                  link.download = state.currentTrack.title || 'recording.wav';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              }}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              disabled={state.isLoading || !state.currentTrack}
              title="Download audio"
            >
              <Download size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              disabled={state.isLoading}
            >
              {state.isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={state.volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              disabled={state.isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 