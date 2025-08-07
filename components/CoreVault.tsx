import { useState, useEffect, useMemo, useRef, useCallback, ChangeEvent, FormEvent } from 'react';
import type { FC } from 'react';
import type { VaultItem } from '../types';
import { MODULES } from '../constants';
import * as gemini from '../services/geminiService';
import { PlusIcon, TrashIcon, SparkleIcon, FileTextIcon, ImageIcon, UploadIcon, TagIcon, LockIcon, SendIcon } from './icons';

const VAULT_PIN_KEY = 'corevault-pin';
const VAULT_ITEMS_KEY = 'corevault-items';
const LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// --- Helper Components ---
const PinLockScreen: FC<{ onUnlock: (pin: string) => void; onSetPin: (pin: string) => void; hasPin: boolean; error: string; }> = ({ onUnlock, onSetPin, hasPin, error }) => {
    const [pin, setPin] = useState('');
    const title = hasPin ? "Enter PIN to Unlock Vault" : "Create a PIN for Your Vault";
    const buttonText = hasPin ? "Unlock" : "Set PIN";

    const handleKeyClick = (key: string) => {
        if (key === 'del') setPin(p => p.slice(0, -1));
        else if (pin.length < 4) setPin(p => p + key);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (pin.length !== 4) return;
        if (hasPin) onUnlock(pin);
        else onSetPin(pin);
        setPin('');
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center animate-fade-in">
            <div className="w-full max-w-xs p-8 bg-slate-900/70 rounded-2xl border border-indigo-700/50 flex flex-col items-center">
                <LockIcon className="w-10 h-10 text-indigo-400 mb-4" />
                <h2 className="text-xl font-bold text-slate-100 mb-2">{title}</h2>
                <p className="text-sm text-slate-400 mb-6">Your vault is locally encrypted.</p>
                <div className="flex items-center gap-4 mb-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={`w-4 h-4 rounded-full border-2 ${pin.length > i ? 'bg-indigo-400 border-indigo-400' : 'border-slate-500'}`} />
                    ))}
                </div>
                {error && <p className="text-red-400 text-sm mb-4 h-5">{error}</p>}
                <div className="grid grid-cols-3 gap-4 w-full">
                    {'123456789'.split('').map(key => (
                        <button key={key} onClick={() => handleKeyClick(key)} className="p-4 text-2xl font-semibold bg-slate-800/50 hover:bg-slate-700/70 rounded-lg transition-colors">
                            {key}
                        </button>
                    ))}
                    <div />
                    <button onClick={() => handleKeyClick('0')} className="p-4 text-2xl font-semibold bg-slate-800/50 hover:bg-slate-700/70 rounded-lg transition-colors">0</button>
                    <button onClick={() => handleKeyClick('del')} className="p-4 text-xl font-semibold bg-slate-800/50 hover:bg-slate-700/70 rounded-lg transition-colors">⌫</button>
                </div>
                <button onClick={handleSubmit} disabled={pin.length !== 4} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed">
                    {buttonText}
                </button>
            </div>
        </div>
    );
};

// --- Main Component ---
const CoreVault: FC = () => {
    const moduleInfo = MODULES.CoreVault;
    const [isLocked, setIsLocked] = useState(true);
    const [pin, setPin] = useState<string | null>(null);
    const [pinError, setPinError] = useState('');
    const [items, setItems] = useState<VaultItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [vaultQuery, setVaultQuery] = useState('');
    const [vaultQueryResult, setVaultQueryResult] = useState('');
    const [aiSummary, setAiSummary] = useState('');
    const [relatedItems, setRelatedItems] = useState<{ id: string, title: string, reason: string }[]>([]);
    const [isAiLoading, setIsAiLoading] = useState({ query: false, summary: false, related: false, tags: false, extraction: null as string | null });

    const lockTimerRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Security and Data Hooks ---
    useEffect(() => {
        const storedPin = localStorage.getItem(VAULT_PIN_KEY);
        setPin(storedPin);
        if (!storedPin) setIsLocked(true);
    }, []);

    useEffect(() => {
        if (!isLocked) {
            try {
                const savedItems = localStorage.getItem(VAULT_ITEMS_KEY);
                const parsedItems = savedItems ? JSON.parse(savedItems) : [];
                setItems(parsedItems);
                if (parsedItems.length > 0 && !selectedItem) {
                    setSelectedItem(parsedItems[0]);
                }
            } catch (error) { 
                console.error("Failed to parse items from localStorage:", error); 
                localStorage.removeItem(VAULT_ITEMS_KEY);
                setItems([]);
            }
        }
    }, [isLocked, selectedItem]);

    useEffect(() => {
        if (!isLocked) localStorage.setItem(VAULT_ITEMS_KEY, JSON.stringify(items));
    }, [items, isLocked]);
    
    // --- Auto-lock Timer ---
    const resetLockTimer = useCallback(() => {
        if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
        lockTimerRef.current = window.setTimeout(() => {
            setIsLocked(true);
            setSelectedItem(null); setItems([]);
        }, LOCK_TIMEOUT_MS);
    }, []);

    useEffect(() => {
        if (!isLocked) {
            resetLockTimer();
            window.addEventListener('mousemove', resetLockTimer); window.addEventListener('keydown', resetLockTimer);
        } else {
            if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
            window.removeEventListener('mousemove', resetLockTimer); window.removeEventListener('keydown', resetLockTimer);
        }
        return () => {
            if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
            window.removeEventListener('mousemove', resetLockTimer); window.removeEventListener('keydown', resetLockTimer);
        };
    }, [isLocked, resetLockTimer]);
    
    // --- PIN Handlers ---
    const handleSetPin = (newPin: string) => { localStorage.setItem(VAULT_PIN_KEY, newPin); setPin(newPin); setIsLocked(false); setPinError(''); };
    const handleUnlock = (enteredPin: string) => { if (enteredPin === pin) { setIsLocked(false); setPinError(''); } else { setPinError('Incorrect PIN. Please try again.'); } };

    // --- Item Handlers ---
    const createNewItem = (type: 'note' | 'file') => {
        if (type === 'note') {
            const newItem: VaultItem = { id: Date.now().toString(), type: 'note', title: 'New Note', content: '', createdAt: new Date().toISOString(), tags: [] };
            const newItems = [newItem, ...items];
            setItems(newItems); setSelectedItem(newItem);
        } else {
            fileInputRef.current?.click();
        }
    };

    const handleImageTextExtraction = async (itemId: string, base64Data: string, mimeType: string) => {
        setIsAiLoading(prev => ({ ...prev, extraction: itemId }));
        const extractedText = await gemini.extractTextFromImage(base64Data, mimeType);
        setItems(currentItems => {
             const updated = currentItems.map(item => item.id === itemId ? { ...item, content: extractedText } : item);
             if (selectedItem?.id === itemId) {
                setSelectedItem(prev => prev ? { ...prev, content: extractedText } : null);
             }
             return updated;
        });
        setIsAiLoading(prev => ({ ...prev, extraction: null }));
    };

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Data = (event.target?.result as string).split(',')[1];
            const newItem: VaultItem = { id: Date.now().toString(), type: 'file', title: file.name, content: '', fileName: file.name, fileData: base64Data, fileMimeType: file.type, createdAt: new Date().toISOString(), tags: [] };
            
            setItems(prevItems => [newItem, ...prevItems]);
            setSelectedItem(newItem);
            
            if (file.type.startsWith('image/')) {
                handleImageTextExtraction(newItem.id, base64Data, file.type);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // Reset input
    };

    const updateSelectedItem = (updates: Partial<VaultItem>) => {
        if (!selectedItem) return;
        const updatedItem = { ...selectedItem, ...updates };
        setSelectedItem(updatedItem);
        setItems(currentItems => currentItems.map(item => item.id === selectedItem.id ? updatedItem : item));
    };
    
    const deleteItem = (idToDelete: string) => {
        const newItems = items.filter(n => n.id !== idToDelete);
        setItems(newItems);
        if (selectedItem?.id === idToDelete) setSelectedItem(newItems.length > 0 ? newItems[0] : null);
    };

    // --- AI Handlers ---
    const handleItemAnalysis = async (type: 'summary' | 'related') => {
        if (!selectedItem) return;
        setIsAiLoading(prev => ({ ...prev, [type]: true }));
        setAiSummary(''); setRelatedItems([]);

        try {
            if (type === 'summary') {
                const summary = await gemini.summarizeVaultItem(selectedItem.content, selectedItem.title);
                setAiSummary(summary);
            } else if (type === 'related') {
                const result = await gemini.findRelatedNotes(selectedItem, items);
                if (result) setRelatedItems(result.relatedItems);
            }
        } finally { setIsAiLoading(prev => ({ ...prev, [type]: false })); }
    };
    
    const handleAutoTag = async () => {
        if (!selectedItem || isAiLoading.tags) return;
        setIsAiLoading(prev => ({ ...prev, tags: true }));
        try {
            const suggestedTags = await gemini.generateTagsForItem(selectedItem.content || '', selectedItem.title);
            if (suggestedTags.length > 0) {
                const newTags = [...new Set([...selectedItem.tags, ...suggestedTags])];
                updateSelectedItem({ tags: newTags });
            }
        } finally { setIsAiLoading(prev => ({ ...prev, tags: false })); }
    };

    const handleVaultQuery = async (e: FormEvent) => {
        e.preventDefault();
        if (!vaultQuery.trim() || isAiLoading.query) return;
        setIsAiLoading(prev => ({ ...prev, query: true }));
        setVaultQueryResult('');
        try {
            const result = await gemini.queryVault(vaultQuery, items);
            setVaultQueryResult(result);
        } finally { setIsAiLoading(prev => ({ ...prev, query: false })); }
    };

    const filteredItems = useMemo(() => {
        const query = searchTerm.toLowerCase();
        if (!query) return items.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return items.filter(item => item.title.toLowerCase().includes(query) || (item.content && item.content.toLowerCase().includes(query)) || item.tags.some(tag => tag.toLowerCase().includes(query))).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [items, searchTerm]);

    if (isLocked) return <PinLockScreen onUnlock={handleUnlock} onSetPin={handleSetPin} hasPin={!!pin} error={pinError} />;

    return (
        <div className="flex-1 flex flex-col h-full bg-transparent p-4 sm:p-6 md:p-8 overflow-hidden">
            <header className="mb-6"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center"><moduleInfo.Icon className="w-6 h-6 text-indigo-400" /></div><div><h1 className="text-2xl sm:text-3xl font-bold text-slate-100">{moduleInfo.name}</h1><p className="text-slate-400">{moduleInfo.description}</p></div></div></header>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
                <div className="lg:col-span-3 flex flex-col bg-black/30 backdrop-blur-md rounded-xl p-4 border border-indigo-800/50 overflow-y-auto">
                    <div className="flex items-center gap-2 mb-4"><button onClick={() => createNewItem('note')} className="flex-1 p-2 bg-slate-700 hover:bg-slate-600 text-sm rounded-md flex items-center justify-center gap-2 transition-colors"><PlusIcon className="w-4 h-4"/> New Note</button><button onClick={() => createNewItem('file')} className="flex-1 p-2 bg-slate-700 hover:bg-slate-600 text-sm rounded-md flex items-center justify-center gap-2 transition-colors"><UploadIcon className="w-4 h-4"/> Upload File</button><input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf,.txt,.md" /></div>
                    <input type="search" placeholder="Search vault..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-800 border-slate-700 rounded-md px-3 py-1.5 mb-4 text-sm text-slate-200 focus:ring-indigo-500" />
                    <div className="space-y-2">{filteredItems.map(item => (<div key={item.id} onClick={() => setSelectedItem(item)} className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center gap-3 ${selectedItem?.id === item.id ? 'bg-indigo-500/30' : 'hover:bg-slate-800'}`}>{item.type === 'note' ? <FileTextIcon className="w-5 h-5 text-indigo-300 flex-shrink-0"/> : <ImageIcon className="w-5 h-5 text-green-300 flex-shrink-0"/>}<div className="flex-1 overflow-hidden"><h3 className="font-semibold text-slate-200 truncate">{item.title}</h3><p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</p></div>{isAiLoading.extraction === item.id && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-400"></div>}</div>))}</div>
                </div>
                
                <div className="lg:col-span-6 flex flex-col bg-black/30 backdrop-blur-md rounded-xl border border-indigo-800/50 overflow-hidden">
                    {selectedItem ? (<><div className="p-4 border-b border-indigo-800/50 flex items-center justify-between gap-4"><input type="text" value={selectedItem.title} onChange={(e) => updateSelectedItem({ title: e.target.value })} className="text-lg sm:text-xl font-bold bg-transparent text-slate-100 focus:outline-none w-full" /><button onClick={() => deleteItem(selectedItem.id)} className="text-slate-500 hover:text-red-500 p-2 rounded-md flex-shrink-0"><TrashIcon className="w-5 h-5"/></button></div><div className="flex-1 overflow-y-auto p-4">{selectedItem.type === 'note' ? (<textarea value={selectedItem.content} onChange={(e) => updateSelectedItem({ content: e.target.value })} placeholder="Start writing your secure note..." className="w-full h-full bg-transparent text-slate-300 placeholder-slate-500 focus:outline-none resize-none" />) : (<div className="space-y-4">{selectedItem.fileMimeType?.startsWith('image/') ? (<img src={`data:${selectedItem.fileMimeType};base64,${selectedItem.fileData}`} alt={selectedItem.title} className="max-w-full max-h-64 rounded-lg mx-auto" />) : (<div className="h-48 bg-slate-800 rounded-lg flex flex-col items-center justify-center text-slate-400"><FileTextIcon className="w-16 h-16"/><p>No preview available for this file type.</p></div>)}<a href={`data:${selectedItem.fileMimeType};base64,${selectedItem.fileData}`} download={selectedItem.fileName} className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-md">Download File</a>{selectedItem.content && <div className="pt-4 border-t border-indigo-900/50"><h4 className="font-semibold text-indigo-300 mb-2">Extracted Text</h4><p className="text-sm text-slate-400 whitespace-pre-wrap bg-slate-800/50 p-3 rounded-md">{selectedItem.content}</p></div>}</div>)}</div><div className="p-4 border-t border-indigo-800/50"><label className="flex items-center gap-2 text-sm text-slate-400 mb-2"><TagIcon className="w-4 h-4"/> Tags</label><div className="relative"><input type="text" value={selectedItem.tags.join(', ')} onChange={e => updateSelectedItem({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} placeholder="Add tags, comma-separated" className="w-full bg-slate-800 border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:ring-indigo-500 pr-10" /><button onClick={handleAutoTag} disabled={isAiLoading.tags || !selectedItem.content} className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-300 disabled:text-slate-600 p-1">{isAiLoading.tags ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-400"></div> : <SparkleIcon className="w-4 h-4"/>}</button></div></div></>) : (<div className="flex flex-col items-center justify-center h-full text-center p-8"><moduleInfo.Icon className="w-16 h-16 text-slate-700 mb-4"/><h2 className="text-2xl font-bold text-slate-400">Your Secure Vault</h2><p className="text-slate-500 mt-2">Select an item or create a new one to begin.</p></div>)}
                </div>

                <div className="lg:col-span-3 flex flex-col bg-black/30 backdrop-blur-md rounded-xl p-4 border border-indigo-800/50 overflow-y-auto space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2"><SparkleIcon className="w-5 h-5 text-amber-400"/> Ask Your Vault</h2>
                        <form onSubmit={handleVaultQuery} className="flex flex-col gap-2">
                           <textarea value={vaultQuery} onChange={e => setVaultQuery(e.target.value)} rows={2} placeholder="e.g., When is my project deadline?" className="w-full bg-slate-800 border-slate-700 rounded-md p-2 text-sm text-slate-200 focus:ring-indigo-500 resize-none"></textarea>
                           <button type="submit" disabled={isAiLoading.query} className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors">
                            {isAiLoading.query ? 'Searching...' : 'Ask'} <SendIcon className="w-4 h-4"/>
                           </button>
                        </form>
                        <div className="mt-3 text-sm text-slate-300 bg-slate-800/50 p-3 rounded-md min-h-[6rem]">
                            {isAiLoading.query ? <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400"></div></div> : (vaultQueryResult || <span className="text-slate-500">Your answer will appear here.</span>) }
                        </div>
                    </div>
                    <div className="pt-4 border-t border-indigo-900/50">
                        <h2 className="text-lg font-semibold text-slate-200 mb-4">Analyze Selected Item</h2>
                        {selectedItem ? (<div className="space-y-4"><div className="grid grid-cols-2 gap-2"><button onClick={() => handleItemAnalysis('summary')} disabled={isAiLoading.summary || !selectedItem.content} className="p-2 bg-amber-600/80 hover:bg-amber-500/80 disabled:bg-amber-800/50 text-sm rounded-md flex items-center justify-center gap-2 transition-colors">Summary</button><button onClick={() => handleItemAnalysis('related')} disabled={isAiLoading.related} className="p-2 bg-amber-600/80 hover:bg-amber-500/80 disabled:bg-amber-800/50 text-sm rounded-md flex items-center justify-center gap-2 transition-colors">Connections</button></div>{(isAiLoading.summary || isAiLoading.related) ? <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400"></div></div> : (<div className="space-y-4 animate-fade-in">{aiSummary && (<div><h3 className="font-semibold text-amber-300 mb-2">Summary</h3><p className="text-sm text-slate-300 bg-slate-800/50 p-3 rounded-md">{aiSummary}</p></div>)}{relatedItems.length > 0 && (<div><h3 className="font-semibold text-amber-300 mb-2">Related Items</h3><div className="space-y-2">{relatedItems.map(item => (<div key={item.id} onClick={() => setSelectedItem(items.find(i => i.id === item.id) || null)} className="bg-slate-800/50 p-3 rounded-md cursor-pointer hover:bg-slate-700/50"><p className="font-semibold text-indigo-300">{item.title}</p><p className="text-xs text-slate-400 italic">"{item.reason}"</p></div>))}</div></div>)}</div>)}</div>) : (<p className="text-sm text-slate-500 text-center py-8">Select an item to analyze.</p>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoreVault;