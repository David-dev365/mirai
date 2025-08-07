
import { useState, useMemo, FC, FormEvent, useEffect } from 'react';
import type { DreamEntry, DreamSymbol } from '../../types';
import * as gemini from '../../services/geminiService';
import { ExoCoreHeader, InfoCard } from './common';
import { useMiraiSystem } from '../../contexts/MiraiSystemContext';
import { BookOpenIcon, PlusIcon, SparkleIcon, TrashIcon, ShieldOffIcon } from '../icons';

const DREAMER_KEY = 'coredreamer-entries';

const CoreDreamer: FC<{ onBack: () => void }> = ({ onBack }) => {
    const { coreStatuses } = useMiraiSystem();
    const isEnabled = coreStatuses.CoreDreamer.enabled;

    const [entries, setEntries] = useState<DreamEntry[]>(() => {
        try {
            const saved = localStorage.getItem(DREAMER_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });
    const [selectedEntry, setSelectedEntry] = useState<DreamEntry | null>(entries[0] || null);
    const [activeTab, setActiveTab] = useState<'diary' | 'analysis' | 'lucid'>('diary');
    const [newDreamText, setNewDreamText] = useState('');
    const [lucidIntention, setLucidIntention] = useState('');
    const [lucidScript, setLucidScript] = useState('');
    const [isLoading, setIsLoading] = useState({ analysis: false, script: false });

    useEffect(() => {
        try {
            localStorage.setItem(DREAMER_KEY, JSON.stringify(entries));
        } catch (e) { console.error("Failed to save dream entries", e); }
    }, [entries]);

    const handleAddEntry = (e: FormEvent) => {
        e.preventDefault();
        if (!newDreamText.trim()) return;
        const newEntry: DreamEntry = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            title: newDreamText.substring(0, 30) + '...',
            content: newDreamText,
            mood: 'neutral' // Could be analyzed
        };
        setEntries(prev => [newEntry, ...prev]);
        setSelectedEntry(newEntry);
        setNewDreamText('');
        setActiveTab('diary');
    };
    
    const handleAnalyzeDream = async () => {
        if (!selectedEntry || isLoading.analysis) return;
        setIsLoading(p => ({ ...p, analysis: true }));
        const result = await gemini.analyzeDream(selectedEntry.content);
        if (result) {
            const updatedEntry = { ...selectedEntry, symbols: result.symbols, summary: result.summary };
            setEntries(e => e.map(entry => entry.id === selectedEntry.id ? updatedEntry : entry));
            setSelectedEntry(updatedEntry);
        }
        setIsLoading(p => ({ ...p, analysis: false }));
        setActiveTab('analysis');
    };
    
    const handleGenerateScript = async (e: FormEvent) => {
        e.preventDefault();
        if (!lucidIntention.trim() || isLoading.script) return;
        setIsLoading(p => ({...p, script: true}));
        const result = await gemini.generateLucidScript(lucidIntention);
        setLucidScript(result);
        setIsLoading(p => ({...p, script: false}));
    };

    const handleDelete = (id: string) => {
        const newEntries = entries.filter(rec => rec.id !== id);
        setEntries(newEntries);
        if (selectedEntry?.id === id) {
            setSelectedEntry(newEntries[0] || null);
        }
    };
    
    const DiaryView = () => (
        <div className="p-4 sm:p-6 space-y-4">
            <h3 className="font-bold text-xl text-purple-300 truncate">{selectedEntry?.title}</h3>
            <p className="text-xs text-slate-400">{selectedEntry ? new Date(selectedEntry.date).toLocaleString() : ''}</p>
            <div className="text-sm bg-slate-800/50 p-4 rounded-md h-64 overflow-y-auto whitespace-pre-wrap">
                {selectedEntry?.content}
            </div>
            <button onClick={handleAnalyzeDream} disabled={!selectedEntry || isLoading.analysis} className="w-full p-2 bg-purple-600/80 hover:bg-purple-500/80 disabled:bg-purple-800 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors">
                <SparkleIcon className="w-4 h-4"/>
                {isLoading.analysis ? 'Analyzing Dream...' : 'Map Symbols & Themes'}
            </button>
        </div>
    );
    
    const AnalysisView = () => (
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto h-full">
            {!selectedEntry?.symbols ? <p className="text-center text-slate-400">Analyze the dream first to see symbols and themes.</p> :
            <>
                <div>
                    <h4 className="font-semibold text-slate-400 mb-2">AI Summary of Dream</h4>
                    <p className="text-sm bg-slate-800/50 p-3 rounded-md italic">"{selectedEntry.summary}"</p>
                </div>
                 <div>
                    <h4 className="font-semibold text-slate-400 mb-2">Symbol Mapper</h4>
                    <div className="space-y-3">
                    {selectedEntry.symbols?.map(s => (
                        <div key={s.symbol} className="bg-slate-800/50 p-3 rounded-md">
                            <p className="font-bold text-purple-300">{s.symbol}</p>
                            <p className="text-xs text-slate-400 my-1 italic">"{s.context}"</p>
                            <p className="text-sm">{s.meaning}</p>
                        </div>
                    ))}
                    </div>
                </div>
            </>}
        </div>
    );

    const LucidScriptView = () => (
        <div className="p-4 sm:p-6 space-y-4">
            <h4 className="font-semibold text-slate-400 mb-2">Lucid Quest Intention</h4>
            <form onSubmit={handleGenerateScript} className="flex flex-col gap-2">
                <input value={lucidIntention} onChange={e => setLucidIntention(e.target.value)} type="text" placeholder="e.g., 'Tonight I want to fly.'" className="w-full bg-slate-800 border-slate-700 rounded-md p-2 text-sm"/>
                <button type="submit" disabled={isLoading.script} className="p-2 bg-purple-600/80 hover:bg-purple-500/80 disabled:bg-purple-800 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors">
                    <SparkleIcon className="w-4 h-4"/> {isLoading.script ? 'Generating...' : 'Generate Bedtime Script'}
                </button>
            </form>
            <div className="min-h-[12rem] bg-slate-800/50 p-3 rounded-md text-sm italic text-purple-200">
                {isLoading.script ? 'Writing your script...' : lucidScript || 'Your personalized lucid dreaming script will appear here.'}
            </div>
        </div>
    );

    return (
        <div className="relative flex-1 flex flex-col h-full bg-slate-900 p-4 sm:p-6 md:p-8 overflow-y-auto font-mono text-slate-200 animate-fade-in">
            {!isEnabled && (
                <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-center p-4">
                    <ShieldOffIcon className="w-16 h-16 text-red-500"/>
                    <h2 className="text-2xl font-bold text-red-400">Core Offline</h2>
                    <p className="text-slate-400">This Exo-Core has been disabled via CoreOps.</p>
                </div>
            )}
            <ExoCoreHeader coreKey="CoreDreamer" onBack={onBack} />
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
                <div className="lg:col-span-4 flex flex-col gap-6">
                     <InfoCard title="New Dream Entry" icon={PlusIcon}>
                        <form onSubmit={handleAddEntry} className="flex flex-col gap-2">
                           <textarea value={newDreamText} onChange={e => setNewDreamText(e.target.value)} placeholder="Record raw dreams, fleeting ideas, night whispers..." rows={5} className="w-full bg-slate-800 border-slate-700 rounded-md p-2 text-sm resize-none" disabled={!isEnabled}/>
                           <button type="submit" disabled={!isEnabled} className="p-2 bg-purple-600 hover:bg-purple-500 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors disabled:bg-slate-700">Add to Diary</button>
                        </form>
                    </InfoCard>
                    <InfoCard title="Dream Diary" icon={BookOpenIcon} className="flex-1 overflow-hidden">
                        <div className="flex-1 space-y-2 overflow-y-auto -mr-2 pr-2">
                             {entries.length > 0 ? entries.map(entry => (
                                <button key={entry.id} onClick={() => { setSelectedEntry(entry); setActiveTab('diary'); }} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${selectedEntry?.id === entry.id ? 'bg-purple-500/20' : 'bg-slate-800/60 hover:bg-slate-700/80'}`}>
                                    <div className="flex-1 overflow-hidden">
                                        <h4 className="font-semibold text-purple-300 truncate">{entry.title}</h4>
                                        <p className="text-xs text-slate-400">{new Date(entry.date).toLocaleDateString()}</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }} className="p-1 text-slate-500 hover:text-red-500 flex-shrink-0"><TrashIcon className="w-4 h-4"/></button>
                                </button>
                            )) : <p className="text-sm text-slate-500 text-center py-4">No dreams recorded yet.</p>}
                        </div>
                    </InfoCard>
                </div>
                <div className="lg:col-span-8 flex flex-col bg-black/30 backdrop-blur-sm rounded-xl border border-purple-800/50 overflow-hidden">
                    <div className="flex border-b border-purple-800/50">
                        <button onClick={()=>setActiveTab('diary')} disabled={!selectedEntry} className={`flex-1 p-3 text-sm font-semibold transition-colors disabled:text-slate-600 disabled:bg-transparent ${activeTab === 'diary' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400 hover:bg-slate-800'}`}>Diary</button>
                        <button onClick={()=>setActiveTab('analysis')} disabled={!selectedEntry} className={`flex-1 p-3 text-sm font-semibold transition-colors disabled:text-slate-600 disabled:bg-transparent ${activeTab === 'analysis' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400 hover:bg-slate-800'}`}>Symbol Analysis</button>
                        <button onClick={()=>setActiveTab('lucid')} className={`flex-1 p-3 text-sm font-semibold transition-colors ${activeTab === 'lucid' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400 hover:bg-slate-800'}`}>Lucid Scripts</button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {!selectedEntry && <div className="flex items-center justify-center h-full text-slate-500">Select a dream entry to begin.</div>}
                        {selectedEntry && activeTab === 'diary' && <DiaryView/>}
                        {selectedEntry && activeTab === 'analysis' && <AnalysisView/>}
                        {activeTab === 'lucid' && <LucidScriptView/>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoreDreamer;