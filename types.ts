import React from 'react';

export enum MoodType {
  HAPPY = 'Happy',
  SAD = 'Sad',
  STRESSED = 'Stressed',
  ANGRY = 'Angry',
  TIRED = 'Tired',
  NEUTRAL = 'Neutral'
}

export interface User {
  uid: string; // Firebase User ID
  email: string | null;
  displayName: string | null;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  moodTag?: MoodType; // Optional: tag which mood generated this
}

export interface MoodLog {
  id?: string;
  timestamp: string;
  mood: MoodType;
  focusScore: number;
  note: string;
}

export interface MusicConfig {
  trackName: string;
  playlistType: string;
  bpm: number;
  url: string;
}

export interface MoodTheme {
  id: MoodType;
  label: string;
  colors: {
    background: string; 
    palette: string[]; 
    primary: string; 
    secondary: string; 
    text: string; 
    focusRing: string; 
  };
  bgImageStyle: React.CSSProperties;
  animation: string;
  weather: 'Sun' | 'Rain' | 'Fog' | 'Storm' | 'Moon' | 'Cloud';
  advice: string;
  music: MusicConfig;
}

export interface AiAnalysisResult {
  mood: MoodType;
  focusScore: number;
  reasoning: string;
  suggestedTasks: string[];
  shortSummary?: string;
}