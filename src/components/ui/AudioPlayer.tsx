'use client';

import { useState, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;
  onEnd?: () => void;
  className?: string;
}

export default function AudioPlayer({ src, autoPlay = false, onEnd, className = '' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const soundRef = useRef<Howl | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Initialize Howler sound
    if (src) {
      setIsLoading(true);
      soundRef.current = new Howl({
        src: [src],
        html5: true,
        format: ['wav'],
        onload: () => {
          console.log('Audio loaded successfully');
          setIsLoading(false);
          setDuration(soundRef.current?.duration() || 0);
        },
        onloaderror: (id, error) => {
          console.error('Error loading audio:', error);
          setIsLoading(false);
        },
        onend: () => {
          setIsPlaying(false);
          setCurrentTime(0);
          onEnd?.();
        },
        onplayerror: (id, error) => {
          console.error('Error playing audio:', error);
          setIsPlaying(false);
          setIsLoading(false);
        }
      });
    }
    
    // Cleanup on unmount
    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [src, onEnd]);
  
  useEffect(() => {
    if (autoPlay && !isLoading && soundRef.current) {
      soundRef.current.play();
      setIsPlaying(true);
    }
  }, [autoPlay, isLoading]);
  
  const togglePlay = () => {
    if (!soundRef.current) return;
    
    if (isPlaying) {
      soundRef.current.pause();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    } else {
      soundRef.current.play();
      progressIntervalRef.current = setInterval(() => {
        setCurrentTime(soundRef.current?.seek() || 0);
      }, 100);
    }
    
    setIsPlaying(!isPlaying);
  };
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (soundRef.current) {
      soundRef.current.seek(newTime);
      setCurrentTime(newTime);
    }
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (soundRef.current) {
      soundRef.current.volume(newVolume);
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };
  
  const toggleMute = () => {
    if (soundRef.current) {
      const newMuted = !isMuted;
      soundRef.current.mute(newMuted);
      setIsMuted(newMuted);
    }
  };
  
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const skip = (seconds: number) => {
    if (soundRef.current) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      soundRef.current.seek(newTime);
      setCurrentTime(newTime);
    }
  };
  
  return (
    <div className={`flex flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 w-12">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
          disabled={isLoading}
        />
        <span className="text-xs text-gray-500 dark:text-gray-400 w-12">
          {formatTime(duration)}
        </span>
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => skip(-10)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            disabled={isLoading}
          >
            <SkipBack size={20} />
          </button>
          
          <button
            onClick={togglePlay}
            disabled={isLoading || !src}
            className={`p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 ${isLoading ? 'cursor-wait' : ''}`}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-t-transparent border-blue-500 rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause size={24} />
            ) : (
              <Play size={24} />
            )}
          </button>
          
          <button
            onClick={() => skip(10)}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            disabled={isLoading}
          >
            <SkipForward size={20} />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            disabled={isLoading}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={volume}
            onChange={handleVolumeChange}
            className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
} 