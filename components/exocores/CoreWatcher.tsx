

import { useState, useMemo, FC, useEffect, FormEvent, useRef } from 'react';
import type { WatcherRecording } from '../../types';
import * as gemini from '../../services/geminiService';
import { ExoCoreHeader, InfoCard } from './common';
import { useMiraiSystem } from '../../contexts/MiraiSystemContext';
import { RadioIcon, TrashIcon, SparkleIcon, FileTextIcon, SettingsIcon, CheckIcon, PlayIcon, PauseIcon, ShieldOffIcon } from '../icons';

const WATCHER_KEY = 'corewatcher-recordings';
const CLEANER_KEY = 'corewatcher-cleaner-schedule';

const CoreWatcher: FC<{ onBack: () => void }> = ({ onBack }) => {
    const { coreStatuses, operationalStates, setOperationalStates, addLog } = useMiraiSystem();
    const isEnabled = coreStatuses.CoreWatcher.enabled;
    const isRecording = operationalStates.CoreWatcher.isRecording;

    const [recordings, setRecordings] = useState<WatcherRecording[]>(() => {
        try {
            const saved = localStorage.getItem(WATCHER_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [selectedRec, setSelectedRec] = useState<WatcherRecording | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [panicTitle, setPanicTitle] = useState('');
    const [cleanerSchedule, setCleanerSchedule] = useState(() => {
         try {
            const saved = localStorage.getItem(CLEANER_KEY);
            return saved ? JSON.parse(saved) : { enabled: false, time: '00:00' };
        } catch { return { enabled: false, time: '00:00' }; }
    });
    const [lastCleaned, setLastCleaned] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioPlayerRef = useRef<HTMLAudioElement>(null);
    const [activePlayback, setActivePlayback] = useState<string | null>(null);

    useEffect(() => {
        try {
            localStorage.setItem(WATCHER_KEY, JSON.stringify(recordings));
        } catch (e) { console.error("Failed to save recordings", e); }
    }, [recordings]);
    
    useEffect(() => {
        try {
            localStorage.setItem(CLEANER_KEY, JSON.stringify(cleanerSchedule));
        } catch (e) { console.error("Failed to save cleaner schedule", e); }
    }, [cleanerSchedule]);

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                resolve(base64String.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handleRecordButtonClick = () => {
        // This button now just toggles the central state.
        setOperationalStates(prev => ({
            ...prev,
            CoreWatcher: { ...prev.CoreWatcher, isRecording: !prev.CoreWatcher.isRecording }
        }));
    };

    useEffect(() => {
        const startBrowserRecording = async () => {
            if (mediaRecorderRef.current?.state === 'recording') return;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
                audioChunksRef.current = [];
                const recorder = new MediaRecorder(stream);
                mediaRecorderRef.current = recorder;

                recorder.ondataavailable = (event) => {
                    if (event.data.size > 0) audioChunksRef.current.push(event.data);
                };

                recorder.onstop = async () => {
                    setOperationalStates(prev => ({ ...prev, CoreWatcher: { ...prev.CoreWatcher, isRecording: false } }));
                    setIsLoading(true);

                    const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
                    const audioBase64 = await blobToBase64(audioBlob);
                    const title = panicTitle || `Recording - ${new Date().toLocaleString()}`;
                    const result = await gemini.transcribeAudio(audioBase64, recorder.mimeType);

                    if (result) {
                        const newRecording: WatcherRecording = {
                            id: Date.now().toString(), timestamp: new Date().toISOString(), type: 'audio',
                            duration: 'N/A', title, ...result, audioBase64, audioMimeType: recorder.mimeType,
                        };
                        setRecordings(prev => [newRecording, ...prev]);
                        setSelectedRec(newRecording);
                    }
                    
                    streamRef.current?.getTracks().forEach(track => track.stop());
                    setIsLoading(false);
                    setPanicTitle('');
                };

                recorder.start();
                addLog('CoreWatcher', 'Recording started.', 'info');
            } catch (err) {
                console.error("Microphone access denied:", err);
                addLog('CoreWatcher', 'Microphone access denied.', 'error');
                setOperationalStates(prev => ({ ...prev, CoreWatcher: { ...prev.CoreWatcher, isRecording: false } }));
            }
        };

        if (isRecording && isEnabled) {
            startBrowserRecording();
        } else {
            if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
                addLog('CoreWatcher', 'Recording stopped.', 'info');
            }
            streamRef.current?.getTracks().forEach(track => track.stop());
        }

        return () => {
            streamRef.current?.getTracks().forEach(track => track.stop());
            if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, [isRecording, isEnabled, setOperationalStates, addLog, panicTitle]);

    
    const handleCleanNow = () => {
        setLastCleaned('Cache, cookies, and local traces wiped at ' + new Date().toLocaleTimeString());
        setTimeout(() => setLastCleaned(null), 4000);
    };

    const handleDelete = (id: string) => {
        setRecordings(r => r.filter(rec => rec.id !== id));
        if (selectedRec?.id === id) {
            setSelectedRec(recordings.length > 1 ? recordings.filter(r => r.id !== id)[0] : null);
        }
    };

    const handlePlayback = (rec: WatcherRecording) => {
        const audio = audioPlayerRef.current;
        if (!audio || !rec.audioBase64) return;
        
        if (activePlayback === rec.id && !audio.paused) {
            audio.pause();
        } else {
            audio.src = `data:${rec.audioMimeType};base64,${rec.audioBase64}`;
            audio.play().catch(e => console.error("Audio playback error:", e));
            setActivePlayback(rec.id);
        }
    };

    return (
        <div className="relative flex-1 flex flex-col h-full bg-slate-900 p-4 sm:p-6 md:p-8 overflow-y-auto font-mono text-slate-200 animate-fade-in">
            {!isEnabled && (
                <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-center p-4">
                    <ShieldOffIcon className="w-16 h-16 text-red-500"/>
                    <h2 className="text-2xl font-bold text-red-400">Core Offline</h2>
                    <p className="text-slate-400">This Exo-Core has been disabled via CoreOps.</p>
                </div>
            )}
            <audio ref={audioPlayerRef} onPause={() => setActivePlayback(null)} onEnded={() => setActivePlayback(null)} className="hidden"/>
            <ExoCoreHeader coreKey="CoreWatcher" onBack={onBack} />
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
                {/* Left Panel: Controls */}
                <div className="lg:col-span-5 flex flex-col gap-6 overflow-y-auto pr-2 -mr-2">
                    <InfoCard title="Stealth Audio Recorder" icon={RadioIcon}>
                        <p className="text-xs text-slate-400 mb-4">Discreetly start ambient recording. A subtle OS notification is shown for compliance.</p>
                        <input type="text" value={panicTitle} onChange={e => setPanicTitle(e.target.value)} placeholder="Optional Title (e.g., 'Meeting 5/21')" className="w-full bg-slate-800 border-slate-700 rounded-md p-2 text-sm mb-4 focus:ring-1 focus:ring-amber-500" />
                        <button onClick={handleRecordButtonClick} disabled={isLoading || !isEnabled} className="w-full p-4 bg-red-600 hover:bg-red-500 disabled:bg-red-800/50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center gap-3 transition-colors text-lg font-bold">
                            {isLoading ? <div className="w-6 h-6 border-2 border-white rounded-full border-t-transparent animate-spin"/> : <RadioIcon className="w-6 h-6"/>}
                            {isLoading ? 'ANALYZING...' : (isRecording ? 'STOP RECORDING' : 'START RECORDING')}
                        </button>
                    </InfoCard>

                    <InfoCard title="Local Auto-Cleaner" icon={SparkleIcon}>
                        <p className="text-xs text-slate-400 mb-4">Wipe local traces like app cache, clipboard, and browser cookies (where accessible).</p>
                        <button onClick={handleCleanNow} disabled={!isEnabled} className="w-full p-3 bg-amber-600/80 hover:bg-amber-500/80 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors disabled:bg-slate-700">
                            Clean Now
                        </button>
                        {lastCleaned && <p className="text-xs text-green-400 text-center animate-fade-in mb-4">{lastCleaned}</p>}
                        
                        <div className="pt-4 border-t border-amber-900/50">
                             <p className="text-xs text-slate-400 mb-2">Schedule daily wipe:</p>
                             <div className="flex items-center gap-2">
                                <input type="time" value={cleanerSchedule.time} onChange={e => setCleanerSchedule(p => ({...p, time: e.target.value}))} disabled={!cleanerSchedule.enabled || !isEnabled} className="w-full bg-slate-800 border-slate-700 rounded-md p-2 text-sm disabled:opacity-50"/>
                                <button onClick={() => setCleanerSchedule(p => ({...p, enabled: !p.enabled}))} disabled={!isEnabled} className={`p-2 rounded-md ${cleanerSchedule.enabled ? 'bg-green-600' : 'bg-slate-700'}`}>
                                    {cleanerSchedule.enabled ? 'On' : 'Off'}
                                </button>
                             </div>
                        </div>
                    </InfoCard>
                </div>
                
                {/* Right Panel: Evidence Locker */}
                <div className="lg:col-span-7 flex flex-col bg-black/30 backdrop-blur-sm rounded-xl border border-amber-800/50 overflow-hidden">
                     <header className="p-4 border-b border-amber-800/50 flex justify-between items-center">
                        <h3 className="font-bold text-xl text-amber-300">Secure Evidence Locker</h3>
                        <p className="text-xs text-slate-500">Encrypted Local Storage</p>
                    </header>
                    <div className="flex-1 flex overflow-hidden">
                        <div className="w-1/3 border-r border-amber-800/50 overflow-y-auto">
                           {recordings.length > 0 ? recordings.map(rec => (
                                <button key={rec.id} onClick={() => setSelectedRec(rec)} className={`w-full text-left p-3 flex items-start gap-2 transition-colors ${selectedRec?.id === rec.id ? 'bg-amber-500/20' : 'hover:bg-slate-800/60'}`}>
                                    <FileTextIcon className="w-4 h-4 text-amber-300 mt-1 flex-shrink-0"/>
                                    <div className="flex-1 overflow-hidden">
                                        <h4 className="text-sm font-semibold text-amber-200 truncate">{rec.title}</h4>
                                        <p className="text-xs text-slate-500">{new Date(rec.timestamp).toLocaleString()}</p>
                                    </div>
                                </button>
                            )) : <p className="text-xs text-slate-500 text-center p-4">No receipts saved.</p>}
                        </div>
                        <div className="w-2/3 overflow-y-auto p-4 sm:p-6 space-y-4">
                            {selectedRec ? (
                                <>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-amber-200 text-lg">{selectedRec.title}</h4>
                                            <p className="text-xs text-slate-400">{new Date(selectedRec.timestamp).toLocaleString()} ({selectedRec.duration})</p>
                                        </div>
                                        <button onClick={() => handleDelete(selectedRec.id)} className="text-slate-500 hover:text-red-500 p-1 flex-shrink-0"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                    {selectedRec.audioBase64 && (
                                        <div>
                                            <h5 className="font-semibold text-slate-400 text-sm mb-2">Playback</h5>
                                            <div className="flex items-center gap-4 bg-slate-800/50 p-2 rounded-md">
                                                <button onClick={() => handlePlayback(selectedRec)} className="p-2 bg-amber-600 hover:bg-amber-500 rounded-full text-white">
                                                    {activePlayback === selectedRec.id ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                                                </button>
                                                <p className="text-xs text-amber-300">Listen to recording</p>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <h5 className="font-semibold text-slate-400 text-sm mb-2">AI Summary</h5>
                                        <p className="text-sm bg-slate-800/50 p-3 rounded-md italic">"{selectedRec.summary}"</p>
                                    </div>
                                    <div>
                                        <h5 className="font-semibold text-slate-400 text-sm mb-2">Keywords</h5>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedRec.keywords.map(kw => <span key={kw} className="bg-amber-900/70 text-amber-200 text-xs px-2 py-1 rounded-full">{kw}</span>)}
                                        </div>
                                    </div>
                                    <div>
                                        <h5 className="font-semibold text-slate-400 text-sm mb-2">Full Transcript</h5>
                                        <p className="text-xs bg-slate-800/50 p-3 rounded-md whitespace-pre-wrap">{selectedRec.transcript}</p>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-center p-8 h-full">
                                    <div>
                                        <FileTextIcon className="w-12 h-12 text-slate-700 mx-auto mb-4"/>
                                        <h3 className="text-lg text-slate-400">No Receipt Selected</h3>
                                        <p className="text-sm text-slate-500">Select an item to view its details.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoreWatcher;