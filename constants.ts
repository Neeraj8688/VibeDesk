import { MoodType, MoodTheme } from './types';

// 1. Mood Scores
export const MOOD_GRAPH_SCORES: Record<MoodType, number> = {
  [MoodType.HAPPY]: 90,
  [MoodType.NEUTRAL]: 60,
  [MoodType.TIRED]: 45,
  [MoodType.STRESSED]: 35,
  [MoodType.SAD]: 25,
  [MoodType.ANGRY]: 20,
};

// 2. Base Focus Scores
export const MOOD_FOCUS_BASE: Record<MoodType, number> = {
  [MoodType.HAPPY]: 75,
  [MoodType.NEUTRAL]: 65,
  [MoodType.TIRED]: 40,
  [MoodType.STRESSED]: 30,
  [MoodType.SAD]: 35,
  [MoodType.ANGRY]: 25,
};

// 3. Mood Specific Tasks
export const MOOD_SPECIFIC_TASKS: Record<MoodType, string[]> = {
  [MoodType.SAD]: [
    "Write down one kind thing you did recently.",
    "Listen to a comfort song.",
    "Send a message to someone you trust."
  ],
  [MoodType.STRESSED]: [
    "Try a 3-minute breathing exercise.",
    "Step away from the screen for 2 minutes.",
    "Write down the ONE most important task right now."
  ],
  [MoodType.ANGRY]: [
    "Take a short walk or stretch your body.",
    "Write your thoughts uncensored, then close the tab.",
    "Do 10 slow deep breaths."
  ],
  [MoodType.HAPPY]: [
    "Use this energy to finish one priority task.",
    "Celebrate a tiny win from today.",
    "Plan one small nice thing for tomorrow."
  ],
  [MoodType.TIRED]: [
    "Drink some water and stretch for 1 minute.",
    "Decide one small, no-pressure task.",
    "Prepare things for tomorrow so you can rest."
  ],
  [MoodType.NEUTRAL]: [
    "Choose one easy task to warm up.",
    "Check in with how your body feels.",
    "Organize your to-do list for today."
  ]
};

// 4. Audio Sources - EMPTY (User must provide their own)
export const FALLBACK_AUDIO = ""; 

// 5. Themes - "Dynamic Aurora"
export const MOOD_THEMES: Record<MoodType, MoodTheme> = {
  [MoodType.HAPPY]: {
    id: MoodType.HAPPY,
    label: "Radiant",
    colors: {
      background: 'linear-gradient(120deg, #FF9A9E 0%, #FECFEF 100%)',
      palette: ['#FF9A9E', '#FECFEF', '#F6D365'], 
      primary: 'bg-orange-500',
      secondary: 'bg-orange-50', 
      text: 'text-orange-950', 
      focusRing: 'text-orange-500'
    },
    bgImageStyle: {},
    animation: 'Sun rays',
    weather: 'Sun',
    advice: "You're glowing! Use this spark to handle your biggest task.",
    music: { trackName: "", playlistType: "User Audio", bpm: 120, url: "" }
  },
  [MoodType.SAD]: {
    id: MoodType.SAD,
    label: "Reflective",
    colors: {
      background: 'linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)',
      palette: ['#a18cd1', '#fbc2eb', '#a6c1ee'],
      primary: 'bg-blue-500', 
      secondary: 'bg-blue-50',
      text: 'text-blue-950',
      focusRing: 'text-blue-500'
    },
    bgImageStyle: {},
    animation: 'Gentle rain',
    weather: 'Rain',
    advice: "It's okay to go slow. Small steps are still progress.",
    music: { trackName: "", playlistType: "User Audio", bpm: 60, url: "" }
  },
  [MoodType.STRESSED]: {
    id: MoodType.STRESSED,
    label: "High Pressure",
    colors: {
      background: 'linear-gradient(to top, #84fab0 0%, #8fd3f4 100%)',
      palette: ['#84fab0', '#8fd3f4', '#d299c2'],
      primary: 'bg-emerald-600', 
      secondary: 'bg-emerald-50',
      text: 'text-emerald-950',
      focusRing: 'text-emerald-600'
    },
    bgImageStyle: {},
    animation: 'Breathing mist',
    weather: 'Fog',
    advice: "Pause. Breathe in for 4, hold for 4, out for 4.",
    music: { trackName: "", playlistType: "User Audio", bpm: 50, url: "" }
  },
  [MoodType.ANGRY]: {
    id: MoodType.ANGRY,
    label: "Intense",
    colors: {
      background: 'linear-gradient(to right, #ff9a9e 0%, #fecfef 100%)',
      palette: ['#eb3349', '#f45c43', '#ffecd2'],
      primary: 'bg-rose-600', 
      secondary: 'bg-rose-50',
      text: 'text-rose-950',
      focusRing: 'text-rose-600'
    },
    bgImageStyle: {},
    animation: 'Slow pulse',
    weather: 'Storm',
    advice: "This energy is real. Ground your feet. Write it out.",
    music: { trackName: "", playlistType: "User Audio", bpm: 80, url: "" }
  },
  [MoodType.TIRED]: {
    id: MoodType.TIRED,
    label: "Low Energy",
    colors: {
      background: 'linear-gradient(to top, #4facfe 0%, #00f2fe 100%)',
      palette: ['#667eea', '#764ba2', '#a3bded'],
      primary: 'bg-purple-500', 
      secondary: 'bg-purple-50',
      text: 'text-purple-950',
      focusRing: 'text-purple-500'
    },
    bgImageStyle: {},
    animation: 'Night glow',
    weather: 'Moon',
    advice: "Rest is productive. Even 5 minutes eyes-closed helps.",
    music: { trackName: "", playlistType: "User Audio", bpm: 40, url: "" }
  },
  [MoodType.NEUTRAL]: {
    id: MoodType.NEUTRAL,
    label: "Balanced",
    colors: {
      background: 'linear-gradient(120deg, #fdfbfb 0%, #ebedee 100%)',
      palette: ['#e0c3fc', '#8ec5fc', '#fdfbfb'],
      primary: 'bg-slate-800', 
      secondary: 'bg-slate-100',
      text: 'text-slate-900',
      focusRing: 'text-slate-800'
    },
    bgImageStyle: {},
    animation: 'Flowing air',
    weather: 'Cloud',
    advice: "Smooth sailing. Good time to organize or clear inbox.",
    music: { trackName: "", playlistType: "User Audio", bpm: 90, url: "" }
  }
};