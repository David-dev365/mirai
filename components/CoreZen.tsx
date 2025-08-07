
import { useState, useEffect, useCallback, useRef } from 'react';
import type { FC, ChangeEvent, CSSProperties } from 'react';
import { MODULES } from '../constants';
import { getZenPrompt, getMeditationScript, getGroundingScript } from '../services/geminiService';
import type { ZenLog } from '../types';
import {
    SparkleIcon, MoonIcon, SunIcon, CheckIcon, PlayIcon, PauseIcon, StopIcon, ArrowLeftIcon, BookOpenIcon, HeadphonesIcon, DropletIcon, EyeIcon, StretchIcon, RefreshIcon, Volume2Icon, AnchorIcon,
} from './icons';

// --- Data Definitions ---
const moods = [
    { emoji: '😊', name: 'Happy' }, { emoji: '😐', name: 'Neutral' },
    { emoji: '😔', name: 'Sad' }, { emoji: '😠', name: 'Angry' }, { emoji: '😴', name: 'Tired' },
];

const habitsList = [
    { name: 'Mindful Moment', icon: SparkleIcon, detail: '5 mins' },
    { name: 'Gentle Stretch', icon: StretchIcon, detail: '5 mins' },
    { name: 'Hydrate', icon: DropletIcon, detail: '8 glasses' },
    { name: 'Screen Break', icon: EyeIcon, detail: 'Every 20 mins' },
    { name: 'Sleep', icon: MoonIcon, detail: '8 hours' },
];

interface BreathingPhase { name: 'Breathe In' | 'Hold' | 'Breathe Out'; duration: number; }
interface BreathingExercise {
    key: string; name: string; description: string; audioSrc: string; phases: BreathingPhase[];
}
const breathingExercises: BreathingExercise[] = [
  { key: 'box', name: 'Box Breathing', description: 'Balance and calm. Inhale for 4s, hold for 4s, exhale for 4s, hold for 4s.', audioSrc: '/assets/audio/calm-music-120575.mp3', phases: [ { name: 'Breathe In', duration: 4 }, { name: 'Hold', duration: 4 }, { name: 'Breathe Out', duration: 4 }, { name: 'Hold', duration: 4 }, ], },
  { key: '478', name: '4-7-8 Relaxing Breath', description: 'Promotes relaxation. Inhale for 4s, hold for 7s, and exhale for 8s.', audioSrc: '/assets/audio/calm-music-120575.mp3', phases: [ { name: 'Breathe In', duration: 4 }, { name: 'Hold', duration: 7 }, { name: 'Breathe Out', duration: 8 } ], },
  { key: 'coherent', name: 'Coherent Breathing', description: 'Sync heart and mind. Inhale for 5s, exhale for 5s.', audioSrc: '/assets/audio/calm-music-120575.mp3', phases: [{ name: 'Breathe In', duration: 5 }, { name: 'Breathe Out', duration: 5 }] },
  { key: 'belly', name: 'Deep Belly Breathing', description: 'Center and ground. A slow 6s inhale and 6s exhale.', audioSrc: '/assets/audio/calm-music-120575.mp3', phases: [{ name: 'Breathe In', duration: 6 }, { name: 'Breathe Out', duration: 6 }] },
];

interface MeditationTheme {
    key: string;
    name: string;
    description: string;
    promptDetail: string;
}

const meditationThemes: MeditationTheme[] = [
    { 
        key: 'stress-release', 
        name: 'Stress Release', 
        description: 'Let go of tension and find calm.',
        promptDetail: 'Focus on deep, calming breaths. Guide the user to visualize stress as a physical object or color that dissolves and leaves their body with each long, slow exhale. Encourage a feeling of lightness and release.'
    },
    { 
        key: 'gratitude', 
        name: 'Gratitude', 
        description: 'Cultivate appreciation for the present.',
        promptDetail: 'Gently guide the user to bring to mind three specific things from their day, no matter how small, that they are grateful for. Encourage them to explore the feeling of gratitude physically, like a warmth in the chest.'
    },
    { 
        key: 'body-scan', 
        name: 'Body Scan', 
        description: 'Connect with your body and release tightness.',
        promptDetail: 'Systematically guide the user to bring non-judgmental awareness to each part of their body, from the tips of the toes to the crown of the head. Encourage them to notice sensations like warmth, coolness, or tingling, and to breathe into any areas of tension, inviting them to soften.'
    },
    { 
        key: 'focus', 
        name: 'Mindful Focus', 
        description: 'Sharpen your concentration and awareness.',
        promptDetail: 'Instruct the user to anchor their attention on the physical sensation of their breath—where they feel it most prominently. When the mind wanders, gently and without judgment, guide them to notice where it went and then escort their attention back to the breath.'
    },
    { 
        key: 'progressive-muscle-relaxation', 
        name: 'Progressive Muscle Relaxation', 
        description: 'Release physical tension from head to toe.',
        promptDetail: 'Guide the user to systematically tense a specific muscle group (e.g., clenching a fist) for 5 seconds, and then release the tension completely for 10-15 seconds, paying close attention to the difference in sensation. Move through all major muscle groups.'
    },
    { 
        key: 'self-compassion', 
        name: 'Self-Compassion', 
        description: 'Cultivate kindness and understanding for yourself.',
        promptDetail: 'Ask the user to think of a time they are struggling. Guide them to offer themselves words of comfort and kindness, as they would to a dear friend. Phrases like "May I be kind to myself" or "It\'s okay to feel this way" can be used.'
    },
];

const groundingTechniques = [
    { key: '54321', name: '5-4-3-2-1 Grounding', description: 'Reconnect with your senses and the present moment.' },
];

const soundscapes = [
    { name: 'Calm Waves', src: '/assets/audio/calm-waves.mp3' },
    { name: 'Forest Stream', src: '/assets/audio/forest-stream.mp3' },
    { name: 'Rainforest', src: '/assets/audio/rainforest.mp3' },
    { name: 'Campfire', src: '/assets/audio/campfire.mp3' },
];

const getTodayKey = () => `corezen-log-${new Date().toISOString().split('T')[0]}`;


// --- Main Component ---
const CoreZen: FC = () => {
    const moduleInfo = MODULES.CoreZen;
    const [zenPrompt, setZenPrompt] = useState('');
    const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);
    const [todayLog, setTodayLog] = useState<ZenLog>(() => {
        try {
            const savedLog = localStorage.getItem(getTodayKey());
            return savedLog ? JSON.parse(savedLog) : { mood: null, journal: '', habits: {} };
        } catch { return { mood: null, journal: '', habits: {} }; }
    });
    const [journalDraft, setJournalDraft] = useState(todayLog.journal);

    // --- Activity Modes State ---
    const [activeMode, setActiveMode] = useState<'none' | 'breathing' | 'meditation' | 'grounding'>('none');
    
    // Breathing state
    const [selectedExercise, setSelectedExercise] = useState<BreathingExercise | null>(null);
    const [breathingPhaseIndex, setBreathingPhaseIndex] = useState(0);
    const [countdown, setCountdown] = useState(0);
    
    // Meditation state
    const [selectedMeditation, setSelectedMeditation] = useState<MeditationTheme | null>(null);
    const [meditationScript, setMeditationScript] = useState('');
    const [isLoadingScript, setIsLoadingScript] = useState(false);
    
    // Grounding state
    const [selectedGrounding, setSelectedGrounding] = useState<{key: string, name: string} | null>(null);
    const [groundingScript, setGroundingScript] = useState('');

    // Soundscapes state
    const [soundscape, setSoundscape] = useState(soundscapes[0]);
    const [isSoundscapePlaying, setIsSoundscapePlaying] = useState(false);

    // Unified player state
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const timerRef = useRef<number | null>(null);
    const synthRef = useRef(window.speechSynthesis);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);


    // --- Effects ---

    // Load and save daily log
    useEffect(() => {
        try {
            localStorage.setItem(getTodayKey(), JSON.stringify(todayLog));
        } catch (e) { console.error("Failed to save Zen log", e); }
    }, [todayLog]);

    // Fetch initial data
    const fetchPrompt = useCallback(async () => {
        setIsLoadingPrompt(true);
        const prompt = await getZenPrompt();
        setZenPrompt(prompt);
        setIsLoadingPrompt(false);
    }, []);
    
    useEffect(() => {
        fetchPrompt();
        
        // Setup audio element for reuse
        const audio = new Audio();
        audio.loop = true;
        audioRef.current = audio;

        // Setup speech synthesis voice
        const getVoices = () => new Promise<SpeechSynthesisVoice[]>(resolve => {
            let voices = synthRef.current.getVoices();
            if (voices.length) { resolve(voices); return; }
            synthRef.current.onvoiceschanged = () => resolve(synthRef.current.getVoices());
        });
        
        const setBestVoice = async () => {
            const voices = await getVoices();
            const preferred = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
                              voices.find(v => v.lang === 'en-US' && v.localService) ||
                              voices.find(v => v.lang === 'en-US') ||
                              voices.find(v => v.lang.startsWith('en'));
            setSelectedVoice(preferred || voices[0] || null);
        };
        setBestVoice();

        return () => { // Cleanup on unmount
            if (timerRef.current) clearInterval(timerRef.current);
            synthRef.current.cancel();
            audioRef.current?.pause();
        }
    }, []);
    
    // Breathing exercise timer
    useEffect(() => {
        if (isPlaying && activeMode === 'breathing' && selectedExercise) {
            timerRef.current = window.setInterval(() => {
                setCountdown(prev => {
                    if (prev > 1) {
                        return prev - 1;
                    } else {
                        setBreathingPhaseIndex(prevIndex => {
                            const nextIndex = (prevIndex + 1) % selectedExercise.phases.length;
                            setCountdown(selectedExercise.phases[nextIndex].duration);
                            return nextIndex;
                        });
                        return 0;
                    }
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
    }, [isPlaying, activeMode, selectedExercise]);
    
    // Unified audio/speech control
    useEffect(() => {
        const audio = audioRef.current;
        const synth = synthRef.current;
        const scriptToPlay = activeMode === 'meditation' ? meditationScript : activeMode === 'grounding' ? groundingScript : '';

        if (isPlaying) {
            if ((activeMode === 'meditation' || activeMode === 'grounding') && scriptToPlay) {
                audio?.pause();
                const utterance = new SpeechSynthesisUtterance(scriptToPlay);
                if (selectedVoice) utterance.voice = selectedVoice;
                utterance.onend = () => { setIsPlaying(false); };
                synth.speak(utterance);
            } else if (audio && activeMode === 'breathing') {
                synth.cancel();
                audio.play().catch(e => console.error("Audio play failed:", e));
            }
        } else {
            audio?.pause();
            synth.cancel();
        }
        
    }, [isPlaying, activeMode, meditationScript, groundingScript, selectedVoice]);

    
    // --- Handlers ---
    const stopAllAudio = () => {
        setIsPlaying(false);
        setIsSoundscapePlaying(false);
        synthRef.current.cancel();
        if(audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const handleMoodSelect = (moodName: string) => {
        const newMood = todayLog.mood === moodName ? null : moodName;
        setTodayLog(prev => ({ ...prev, mood: newMood }));
    };
    
    const handleSaveJournal = () => {
        setTodayLog(prev => ({ ...prev, journal: journalDraft }));
    };

    const handleHabitToggle = (habitName: string) => {
        setTodayLog(prev => ({ ...prev, habits: { ...prev.habits, [habitName]: !prev.habits[habitName] } }));
    };
    
    const handleSelectExercise = (exercise: BreathingExercise) => {
        stopAllAudio();
        setSelectedExercise(exercise);
        setBreathingPhaseIndex(0);
        setCountdown(exercise.phases[0].duration);
        if (audioRef.current) audioRef.current.src = exercise.audioSrc;
        setActiveMode('breathing');
    };
    
    const handleSelectMeditation = async (theme: MeditationTheme) => {
        stopAllAudio();
        setSelectedMeditation(theme);
        setActiveMode('meditation');
        setIsLoadingScript(true);
        const script = await getMeditationScript(theme.name, theme.promptDetail);
        setMeditationScript(script);
        setIsLoadingScript(false);
    };

    const handleSelectGrounding = async (technique: {key: string, name: string}) => {
        stopAllAudio();
        setSelectedGrounding(technique);
        setActiveMode('grounding');
        setIsLoadingScript(true);
        const script = await getGroundingScript();
        setGroundingScript(script);
        setIsLoadingScript(false);
    };

    const handlePlayPause = () => {
        if(activeMode === 'none') return;
        setIsPlaying(prev => !prev);
    };

    const handleStop = () => {
        stopAllAudio();
        setActiveMode('none');
        setSelectedExercise(null);
        setSelectedMeditation(null);
        setSelectedGrounding(null);
    };
    
    const handleSoundscapeToggle = () => {
        if (isSoundscapePlaying) {
            stopAllAudio();
        } else {
            stopAllAudio();
            if(audioRef.current) {
                audioRef.current.src = soundscape.src;
                audioRef.current.play().catch(console.error);
                setIsSoundscapePlaying(true);
            }
        }
    };
    
    const handleSoundscapeChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const newSoundscape = soundscapes.find(s => s.name === e.target.value) || soundscapes[0];
        setSoundscape(newSoundscape);
        if (isSoundscapePlaying && audioRef.current) {
            audioRef.current.src = newSoundscape.src;
            audioRef.current.play().catch(console.error);
        }
    };

    // --- Render Logic ---
    if (activeMode !== 'none') {
        const isBreathing = activeMode === 'breathing';
        const isMeditation = activeMode === 'meditation';
        const isGrounding = activeMode === 'grounding';
        
        const currentExercise = selectedExercise;
        const currentMeditation = selectedMeditation;
        const currentGrounding = selectedGrounding;
        const currentPhase = isBreathing && currentExercise ? currentExercise.phases[breathingPhaseIndex] : null;

        const title = isBreathing ? currentExercise?.name : isMeditation ? currentMeditation?.name : isGrounding ? currentGrounding?.name : 'Wellness Activity';
        const script = isMeditation ? meditationScript : isGrounding ? groundingScript : '';

        const visualizerAnimation = {
            animationName: isPlaying && isBreathing && (currentPhase?.name === 'Breathe In' ? 'inhale' : currentPhase?.name === 'Breathe Out' ? 'exhale' : 'none'),
            animationDuration: isPlaying && currentPhase ? `${currentPhase.duration}s` : '0s',
            transform: isPlaying && isBreathing ? '' : (isBreathing && (currentPhase?.name === 'Breathe Out' || (currentPhase?.name === 'Hold' && breathingPhaseIndex > 0))) ? 'scale(1.4)' : 'scale(1)',
        };
        const visualizerStyle = { ...visualizerAnimation, animationTimingFunction: 'ease-in-out', animationFillMode: 'forwards' } as CSSProperties;

        return (
            <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col items-center justify-center p-4 text-white animate-fade-in">
                 <style>{`@keyframes inhale { from { transform: scale(1); } to { transform: scale(1.4); } } @keyframes exhale { from { transform: scale(1.4); } to { transform: scale(1); } }`}</style>
                <button onClick={handleStop} className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"><ArrowLeftIcon className="w-5 h-5"/> Back</button>
                 
                <div className="flex flex-col items-center justify-around h-full w-full max-w-4xl mx-auto">
                    <div className="text-center">
                        <h2 className="text-2xl sm:text-3xl font-bold text-emerald-300">{title}</h2>
                    </div>

                    {isBreathing && (
                        <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                            <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-pulse"></div>
                            <div style={visualizerStyle} className="w-32 h-32 sm:w-40 sm:h-40 bg-emerald-500/20 rounded-full transition-transform duration-1000"></div>
                            <div className="absolute text-center">
                                {isPlaying && currentPhase ? (
                                    <><p className="text-4xl sm:text-5xl font-bold">{countdown}</p><p className="text-xl sm:text-2xl text-slate-300 tracking-widest uppercase">{currentPhase.name}</p></>
                                ) : <p className="text-2xl text-slate-300">Press Play</p>}
                            </div>
                        </div>
                    )}
                    
                    {(isMeditation || isGrounding) && (
                        <div className="w-full h-64 bg-slate-800/50 rounded-lg p-6 overflow-y-auto">
                             {isLoadingScript ? (
                                 <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div></div>
                             ) : (
                                 <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{script}</p>
                             )}
                        </div>
                    )}

                    <div className="flex items-center gap-4 sm:gap-6">
                        <button onClick={handlePlayPause} disabled={isLoadingScript} className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-600 hover:bg-emerald-500 rounded-full flex items-center justify-center text-white transition-colors disabled:bg-slate-600">
                            {isPlaying ? <PauseIcon className="w-8 h-8 sm:w-10 sm:h-10"/> : <PlayIcon className="w-8 h-8 sm:w-10 sm:h-10 ml-1"/>}
                        </button>
                        <button onClick={handleStop} className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-700 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors">
                            <StopIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ backgroundSize: '400%', animation: 'bg-pan-left 15s ease-in-out infinite alternate', backgroundImage: 'linear-gradient(to right, #f0fdf4, #f0fdfa, #f9fafb)'}} className="flex-1 flex flex-col h-full text-slate-800 p-4 sm:p-6 md:p-8 overflow-y-auto">
            <header className="mb-8 flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center"><moduleInfo.Icon className="w-6 h-6 text-emerald-600" /></div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{moduleInfo.name}</h1>
                        <p className="text-slate-500">{moduleInfo.description}</p>
                    </div>
                </div>
            </header>
            
            <div className="space-y-8">
                {/* --- DAILY PROMPT --- */}
                <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-slate-200">
                    <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-2"><SparkleIcon className="w-5 h-5 text-amber-500"/> Daily Zen Prompt</span>
                        <button onClick={fetchPrompt} disabled={isLoadingPrompt}><RefreshIcon className={`w-5 h-5 text-slate-500 ${isLoadingPrompt ? 'animate-spin': ''}`}/></button>
                    </h2>
                    <div className="min-h-[4rem] flex items-center justify-center p-4 bg-emerald-50/50 rounded-lg">
                        {isLoadingPrompt ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div> : <p className="text-center text-lg text-emerald-800 italic">"{zenPrompt}"</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {/* --- MOOD JOURNAL --- */}
                    <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-slate-200 flex flex-col">
                        <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center gap-2"><BookOpenIcon className="w-5 h-5 text-blue-600"/> Mood Journal</h2>
                        <p className="text-sm text-slate-500 mb-4">How are you feeling right now?</p>
                        <div className="flex justify-around bg-slate-100/80 rounded-lg p-4">
                            {moods.map(mood => (
                                <button key={mood.name} onClick={() => handleMoodSelect(mood.name)} className={`flex flex-col items-center gap-2 transition-all duration-200 focus:outline-none ${todayLog.mood === mood.name ? 'text-emerald-600' : 'text-slate-500 hover:text-emerald-600'}`}>
                                    <span className={`text-3xl sm:text-4xl transform transition-transform ${todayLog.mood === mood.name ? 'scale-110' : 'hover:scale-110'}`}>{mood.emoji}</span>
                                    <span className="text-xs font-medium">{mood.name}</span>
                                </button>
                            ))}
                        </div>
                        {todayLog.mood && (
                            <div className="mt-4 animate-fade-in">
                                <textarea value={journalDraft} onChange={e => setJournalDraft(e.target.value)} placeholder={`What's making you feel ${todayLog.mood.toLowerCase()}?`} className="w-full bg-white border border-slate-300 rounded-md p-2 text-sm text-slate-800 h-20 resize-none focus:ring-emerald-500 focus:border-emerald-500"></textarea>
                                <button onClick={handleSaveJournal} className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 px-4 rounded-md transition-colors">Save Journal</button>
                            </div>
                        )}
                    </div>
                    {/* --- HABIT TRACKER --- */}
                    <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-slate-200">
                        <h2 className="text-xl font-semibold text-slate-700 mb-4">Habit Tracker</h2>
                        <div className="space-y-2">
                             {habitsList.map(habit => (
                                <button key={habit.name} onClick={() => handleHabitToggle(habit.name)} className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${todayLog.habits[habit.name] ? 'bg-emerald-100' : 'bg-slate-100/80 hover:bg-slate-200'}`}>
                                     <p className={`flex-1 ${todayLog.habits[habit.name] ? 'text-emerald-800 font-medium' : ''}`}>{habit.name}</p>
                                     <div className={`flex items-center gap-2 text-sm transition-colors ${todayLog.habits[habit.name] ? 'text-emerald-600' : 'text-slate-500'}`}>
                                         {todayLog.habits[habit.name] ? <CheckIcon className="w-5 h-5" /> : <><habit.icon className="w-5 h-5"/><span>{habit.detail}</span></>}
                                     </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                 {/* --- WELLNESS ACTIVITIES --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-slate-200">
                        <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center gap-2"><HeadphonesIcon className="w-5 h-5 text-purple-600"/> Guided Meditations</h2>
                        <div className="space-y-3">
                            {meditationThemes.map(theme => (
                                <button key={theme.key} onClick={() => handleSelectMeditation(theme)} className="w-full text-left bg-slate-100/80 hover:bg-slate-200 p-4 rounded-lg transition-colors">
                                    <h3 className="font-semibold text-purple-800">{theme.name}</h3>
                                    <p className="text-sm text-slate-600">{theme.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                     <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-slate-200">
                        <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center gap-2"><AnchorIcon className="w-5 h-5 text-cyan-600"/> Grounding Techniques</h2>
                        <div className="space-y-3">
                             {groundingTechniques.map(technique => (
                                <button key={technique.key} onClick={() => handleSelectGrounding(technique)} className="w-full text-left bg-slate-100/80 hover:bg-slate-200 p-4 rounded-lg transition-colors">
                                    <h3 className="font-semibold text-cyan-800">{technique.name}</h3>
                                    <p className="text-sm text-slate-600">{technique.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-slate-200">
                        <h2 className="text-xl font-semibold text-slate-700 mb-4 flex items-center gap-2"><Volume2Icon className="w-5 h-5 text-teal-600"/> Soundscapes</h2>
                        <div className="flex flex-col gap-4 items-center justify-center h-full">
                           <select value={soundscape.name} onChange={handleSoundscapeChange} disabled={isSoundscapePlaying} className="w-full bg-white border border-slate-300 rounded-md p-3 text-slate-800 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-70">
                               {soundscapes.map(s => <option key={s.name}>{s.name}</option>)}
                           </select>
                           <button onClick={handleSoundscapeToggle} className="w-16 h-16 bg-teal-600 hover:bg-teal-500 text-white rounded-full flex items-center justify-center">
                               {isSoundscapePlaying ? <PauseIcon className="w-8 h-8"/> : <PlayIcon className="w-8 h-8 ml-1"/>}
                           </button>
                        </div>
                    </div>
                    <div className="bg-white/70 backdrop-blur-md rounded-xl p-6 border border-slate-200">
                        <h2 className="text-xl font-semibold text-slate-700 mb-4">Breathing Exercises</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {breathingExercises.map(ex => (
                                <div key={ex.key} className="bg-slate-100/80 p-4 rounded-lg flex flex-col text-center">
                                    <h3 className="text-md font-semibold text-emerald-800 mb-1">{ex.name}</h3>
                                    <p className="flex-1 text-xs text-slate-600 mb-3">{ex.description}</p>
                                    <button onClick={() => handleSelectExercise(ex)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors">Begin</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoreZen;