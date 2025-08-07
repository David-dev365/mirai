import { useState, useEffect, useRef, useCallback, FC, FormEvent } from 'react';
import type { RiftNode, VaultItem, Task, ZenLog } from '../types';
import { MODULES } from '../constants';
import { BookmarkIcon, Volume2Icon, XIcon, WandIcon, CompassIcon, SparkleIcon } from './icons';
import { getDreamlikeNarration, generateDreamNode, getCraftedNode, getOracleRiddle } from '../services/geminiService';

// Constants
const RIFT_ANCHORED_KEY = 'corerift-anchored';
const PARTICLE_COUNT = 250;
const VAULT_ITEMS_KEY = 'corevault-items';
const COREFLOW_TASKS_KEY = 'coreflow-tasks';
const COREMIND_JOURNAL_KEY = 'coremind-journal';
const NODE_DECAY_TIME = 5 * 60 * 1000; // 5 minutes

// Helper to get today's key for CoreZen log
const getTodayKey = () => `corezen-log-${new Date().toISOString().split('T')[0]}`;

// Helper to safely parse localStorage JSON
const safeJsonParse = <T,>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.error(`Failed to parse ${key} from localStorage`, e);
        return fallback;
    }
};

// --- Data Loading and Transformation ---
const loadDataForRift = (): Omit<RiftNode, 'position' | 'state'>[] => {
    const loadedNodes: Omit<RiftNode, 'position' | 'state'>[] = [];
    const now = Date.now();
    
    const addNode = (
        label: string, content: string, sourceModule: RiftNode['sourceModule'], sourceId: string,
        color: string, shape: RiftNode['shape'], scale: number
    ) => {
        loadedNodes.push({
            id: `${sourceModule}-${sourceId}`, label, content, sourceModule, sourceId,
            color, shape, scale, createdAt: now
        });
    };

    const journalText = localStorage.getItem(COREMIND_JOURNAL_KEY);
    if (journalText && journalText.length > 50) {
        addNode('Journal Stream', journalText, 'CoreMind', 'journal', '#60a5fa', 'sphere', 1.5);
    }
    
    const vaultItems = safeJsonParse<VaultItem[]>(VAULT_ITEMS_KEY, []);
    vaultItems.slice(0, 5).forEach(item => {
         addNode(item.title, item.content || `File: ${item.fileName}`, 'CoreVault', item.id, '#4ade80', 'crystal', 1);
    });
    
    const tasks = safeJsonParse<Task[]>(COREFLOW_TASKS_KEY, []);
    tasks.filter(t => !t.completed).slice(0, 5).forEach(task => {
        addNode(task.text, `An open task: "${task.text}"`, 'CoreFlow', task.id, '#facc15', 'box', 0.8);
    });

    return loadedNodes;
};

// --- Particle Canvas Component ---
const ParticleCanvas: FC<{ mood: string; stress: number }> = ({ mood, stress }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particles = useRef<any[]>([]);
    
    const moodColors: Record<string, string> = {
        Happy: `rgba(252, 211, 77, ${0.6 + stress / 250})`, // amber-300
        Sad: `rgba(96, 165, 250, ${0.6 + stress / 250})`, // blue-400
        Angry: `rgba(248, 113, 113, ${0.7 + stress / 200})`, // red-400
        Neutral: `rgba(209, 213, 219, ${0.6 + stress / 250})`, // gray-300
        Default: `rgba(192, 132, 252, ${0.6 + stress / 250})`, // purple-400
    };
    const particleColor = moodColors[mood] || moodColors.Default;
    const velocityFactor = 1 + (stress / 100);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let animationFrameId: number;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        particles.current = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.current.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.3 * velocityFactor,
                vy: (Math.random() - 0.5) * 0.3 * velocityFactor,
                radius: Math.random() * 1.5 + 0.5,
            });
        }
        
        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = particleColor;
            
            particles.current.forEach(p => {
                p.x += p.vx * velocityFactor;
                p.y += p.vy * velocityFactor;
                
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });
            
            animationFrameId = requestAnimationFrame(animate);
        };
        
        animate();
        return () => cancelAnimationFrame(animationFrameId);
    }, [particleColor, velocityFactor]);
    
    return <canvas ref={canvasRef} className="absolute inset-0 z-0" />;
};


// --- Node Component ---
const NodeEntity: FC<{ node: RiftNode, onSelect: (node: RiftNode) => void; isDimmed: boolean; mousePosition: {x: number, y: number};}> = ({ node, onSelect, isDimmed, mousePosition }) => {
    const { position, color, shape, scale, label, state } = node;
    const [isHovered, setIsHovered] = useState(false);
    
    const parallaxX = (mousePosition.x - window.innerWidth / 2) * (position.z * 0.01);
    const parallaxY = (mousePosition.y - window.innerHeight / 2) * (position.z * 0.01);

    const shapeClasses: Record<RiftNode['shape'], string> = {
        sphere: 'rounded-full',
        box: 'rounded-md',
        icosahedron: '',
        crystal: '',
        plant: 'opacity-80', // Use SVG for this
        door: 'opacity-80', // Use SVG
    };

    const isAnchored = state === 'anchored';
    const isFading = state === 'fading' || state === 'decaying';
    const isSprouting = state === 'sprouting';
    const glowColor = isAnchored ? '#fcd34d' : color;

    const getShapeElement = () => {
        if (shape === 'plant') {
            return <svg viewBox="0 0 100 100" className="w-full h-full"><path d="M50,100 C75,100 80,75 80,50 C80,25 75,0 50,0 C25,0 20,25 20,50 C20,75 25,100 50,100 Z M50,75 C60,75 65,60 65,50 C65,40 60,25 50,25 C40,25 35,40 35,50 C35,60 40,75 50,75 Z" fill={color} /></svg>;
        }
         if (shape === 'crystal') {
            return <div className="w-full h-full" style={{ backgroundColor: color, clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)'}}></div>
        }
        return <div className={`w-full h-full ${shapeClasses[shape]}`} style={{ backgroundColor: color, clipPath: shape === 'icosahedron' ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : 'none' }}></div>
    }

    return (
        <div 
            className={`absolute transition-all duration-1000 ease-out cursor-pointer group 
                ${isDimmed ? 'opacity-20 blur-sm scale-90' : 'opacity-100'} 
                ${isFading ? 'opacity-0 scale-50' : ''}
                ${isSprouting ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}
            `}
            style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: `translate(-50%, -50%) translate3d(${parallaxX}px, ${parallaxY}px, 0) scale(${isSprouting ? 0 : 1})`,
                width: `${scale * 5}rem`,
                height: `${scale * 5}rem`,
                // @ts-ignore
                '--glow-color': glowColor,
            }}
            onClick={() => onSelect(node)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className="w-full h-full transition-all duration-300"
                style={{
                    filter: `drop-shadow(0 0 ${isHovered || isAnchored ? '25px' : '10px'} var(--glow-color))`,
                    animation: isAnchored ? 'slow-pulse 4s infinite' : '',
                }}
            >
                {getShapeElement()}
            </div>
            <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 w-max px-3 py-1 bg-slate-900/80 text-white text-xs rounded-md transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                {label}
            </div>
        </div>
    );
};

// --- Main CoreRift Component ---
const CoreRift: FC = () => {
    const moduleInfo = MODULES.CoreRift;
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [nodes, setNodes] = useState<RiftNode[]>([]);
    const [anchoredIds, setAnchoredIds] = useState<string[]>(() => safeJsonParse<string[]>(RIFT_ANCHORED_KEY, []));
    
    const [selectedNode, setSelectedNode] = useState<RiftNode | null>(null);
    const [narration, setNarration] = useState('');
    const [isLoading, setIsLoading] = useState({narration: false, dream: false, craft: false, oracle: false });
    
    const [mood, setMood] = useState('Default');
    const [stressLevel, setStressLevel] = useState(0); // 0-100
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const [craftInput, setCraftInput] = useState('');
    const [oracleText, setOracleText] = useState('');
    const [isOracleVisible, setIsOracleVisible] = useState(false);
    
    // --- Initial setup & Lifecycle ---
    useEffect(() => {
        const initialNodes = loadDataForRift().map((node): RiftNode => ({
            ...node,
            position: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10, z: Math.random() * 2 + 0.5, vx: 0, vy: 0 },
            state: anchoredIds.includes(node.id) ? 'anchored' : 'sprouting',
        }));
        setNodes(initialNodes);
        
        // Unset sprouting state after animation
        setTimeout(() => setNodes(current => current.map(n => ({...n, state: anchoredIds.includes(n.id) ? 'anchored' : 'active'}))), 1000);

        const log = safeJsonParse<ZenLog>(getTodayKey(), { mood: null, journal: '', habits: {} });
        if(log.mood) setMood(log.mood);

        const audio = new Audio('/assets/audio/background-music-soft-calm-15-sec-368068.mp3');
        audio.loop = true; audio.volume = 0.2;
        audio.play().catch(console.error);
        audioRef.current = audio;
        
        const handleMouseMove = (e: MouseEvent) => setMousePosition({ x: e.clientX, y: e.clientY });
        window.addEventListener('mousemove', handleMouseMove);

        // Animation loop for drifting
        let animationFrameId: number;
        const driftLoop = () => {
            setNodes(currentNodes => currentNodes.map(n => {
                const newPos = {...n.position};
                newPos.x += newPos.vx * 0.01;
                newPos.y += newPos.vy * 0.01;

                if (newPos.x < 5 || newPos.x > 95) newPos.vx *= -1;
                if (newPos.y < 5 || newPos.y > 95) newPos.vy *= -1;

                return {...n, position: newPos};
            }));
            animationFrameId = requestAnimationFrame(driftLoop);
        };
        driftLoop();

        // Decay loop
        const decayInterval = setInterval(() => {
            const now = Date.now();
            setNodes(current => current.map(n => 
                !anchoredIds.includes(n.id) && now - n.createdAt > NODE_DECAY_TIME ? { ...n, state: 'decaying' } : n
            ));
            setTimeout(() => setNodes(current => current.filter(n => n.state !== 'decaying')), 1000);
        }, 60000); // Check every minute

        return () => {
            audioRef.current?.pause();
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationFrameId);
            clearInterval(decayInterval);
            window.speechSynthesis.cancel();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { localStorage.setItem(RIFT_ANCHORED_KEY, JSON.stringify(anchoredIds)); }, [anchoredIds]);
    
    useEffect(() => {
        if(audioRef.current) audioRef.current.playbackRate = 1 - (stressLevel / 500);
    }, [stressLevel]);

    const addNode = (newNodeData: Omit<RiftNode, 'position' | 'state'>) => {
        const newNode: RiftNode = {
            ...newNodeData,
            position: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10, z: Math.random() * 2 + 0.5, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5 },
            state: 'sprouting',
        }
        setNodes(current => [...current, newNode]);
        setTimeout(() => setNodes(current => current.map(n => n.id === newNode.id ? {...n, state: 'active'} : n)), 1000);
    }
    
    // --- Handlers ---
    const handleSelectNode = useCallback(async (node: RiftNode) => {
        if(node.id === selectedNode?.id) { setSelectedNode(null); setNarration(''); return; }
        setSelectedNode(node);
        setIsLoading(p => ({...p, narration: true})); setNarration('');
        const result = await getDreamlikeNarration(node.content, node.sourceModule);
        setNarration(result);
        setIsLoading(p => ({...p, narration: false}));
    }, [selectedNode]);

    const handleReleaseNode = () => {
        if (!selectedNode) return;
        setNodes(prev => prev.map(n => n.id === selectedNode.id ? {...n, state: 'fading'} : n));
        setTimeout(() => {
            setNodes(prev => prev.filter(n => n.id !== selectedNode.id));
            if(anchoredIds.includes(selectedNode.id)) { setAnchoredIds(prev => prev.filter(id => id !== selectedNode.id)); }
            setSelectedNode(null); setNarration('');
        }, 1000);
    };

    const handleAnchorNode = () => {
        if (!selectedNode) return;
        setAnchoredIds(prev => [...new Set([...prev, selectedNode.id])]);
        setNodes(prev => prev.map(n => n.id === selectedNode.id ? {...n, state: 'anchored'} : n));
    };

    const handlePlayNarration = () => {
        if (!narration) return;
        const synth = window.speechSynthesis;
        synth.cancel();
        const voices = synth.getVoices().filter(v => v.lang.startsWith('en'));
        if (voices.length === 0) { // Fallback for no voices
            synth.speak(new SpeechSynthesisUtterance(narration)); return;
        }
        const playWhisper = (text:string, voice:SpeechSynthesisVoice, pitch:number, rate:number, volume:number, delay:number) => {
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.voice = voice;
                utterance.pitch = pitch;
                utterance.rate = rate;
                utterance.volume = volume;
                synth.speak(utterance);
            }, delay);
        };
        playWhisper(narration, voices[0], 1, 1, 0.9, 0);
        if (voices.length > 1) playWhisper(narration, voices[1], 0.8, 1.1, 0.4, 150);
        if (voices.length > 2) playWhisper(narration, voices[2], 1.2, 0.9, 0.3, 300);
    };

    const handleSummonDream = async () => {
        setIsLoading(p => ({...p, dream: true}));
        const context = `Journal: ${localStorage.getItem(COREMIND_JOURNAL_KEY) || 'N/A'}. Tasks: ${localStorage.getItem(COREFLOW_TASKS_KEY) || 'N/A'}`;
        const result = await generateDreamNode(context);
        if (result) {
            addNode({ ...result, id: `dream-${Date.now()}`, sourceModule: 'dream', sourceId: 'ai', createdAt: Date.now() });
        }
        setIsLoading(p => ({...p, dream: false}));
    };

    const handleCraftNode = async (e: FormEvent) => {
        e.preventDefault();
        if(!craftInput.trim()) return;
        setIsLoading(p => ({...p, craft: true}));
        const result = await getCraftedNode(craftInput);
        if(result) {
            addNode({ ...result, id: `crafted-${Date.now()}`, sourceModule: 'crafted', sourceId: craftInput, createdAt: Date.now() });
        }
        setCraftInput('');
        setIsLoading(p => ({...p, craft: false}));
    };

    const handleSeekOracle = async () => {
        setIsLoading(p => ({...p, oracle: true}));
        const context = `Anchored thoughts: ${nodes.filter(n => n.state === 'anchored').map(n => n.label).join(', ')}. Mood: ${mood}. Stress: ${stressLevel}/100.`;
        const result = await getOracleRiddle(context);
        setOracleText(result);
        setIsOracleVisible(true);
        setIsLoading(p => ({...p, oracle: false}));
    };

    const moodClasses: Record<string, { bg: string, fog: string, particle: string }> = {
        Happy: { bg: 'from-amber-900/50', fog: 'bg-amber-500/10', particle: 'text-amber-300' },
        Sad: { bg: 'from-blue-900/50', fog: 'bg-blue-500/10', particle: 'text-blue-300' },
        Angry: { bg: 'from-red-900/50', fog: 'bg-red-500/10', particle: 'text-red-300' },
        Neutral: { bg: 'from-gray-800/50', fog: 'bg-gray-500/10', particle: 'text-gray-300' },
        Default: { bg: 'from-purple-900/50', fog: 'bg-purple-500/10', particle: 'text-purple-300' },
    };
    const currentMoodStyle = moodClasses[mood] || moodClasses.Default;

    return (
        <div className={`relative flex-1 flex flex-col h-full bg-slate-900 overflow-hidden`}>
             <style>{`@keyframes slow-pulse {0%,100%{transform:scale(1);filter:drop-shadow(0 0 15px var(--glow-color))} 50%{transform:scale(1.05);filter:drop-shadow(0 0 25px var(--glow-color))}} @keyframes fog-drift{0%{transform:translate(0,0) scale(1)} 25%{transform:translate(20px,-10px) scale(1.05)} 50%{transform:translate(0,20px) scale(1)} 75%{transform:translate(-20px,-10px) scale(1.05)} 100%{transform:translate(0,0) scale(1)}}`}</style>
            
            <div className={`absolute inset-0 bg-gradient-to-b ${currentMoodStyle.bg} to-slate-900 transition-colors duration-1000`}></div>
            <ParticleCanvas mood={mood} stress={stressLevel} />
            <div className={`absolute -inset-1/4 rounded-full ${currentMoodStyle.fog} blur-3xl`} style={{ animation: 'fog-drift 60s ease-in-out infinite alternate', opacity: 0.3 + stressLevel/200 }} ></div>

            <div className="absolute inset-0 z-10">{nodes.map(node => (<NodeEntity key={node.id} node={node} onSelect={handleSelectNode} isDimmed={!!selectedNode && selectedNode.id !== node.id} mousePosition={mousePosition}/>))}</div>

            {/* UI Overlay */}
            <div className="relative z-20 pointer-events-none p-4 sm:p-6 md:p-8 flex flex-col h-full">
                <header><div className="flex items-center gap-4"><div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center"><moduleInfo.Icon className="w-6 h-6 text-purple-400" /></div><div><h1 className="text-2xl sm:text-3xl font-bold text-slate-100">{moduleInfo.name}</h1><p className="text-slate-400">Your living subconscious biome.</p></div></div></header>

                {isOracleVisible && (
                    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fade-in" onClick={() => setIsOracleVisible(false)}>
                        <div className="text-center max-w-lg p-8" onClick={e => e.stopPropagation()}>
                            <CompassIcon className="w-16 h-16 mx-auto text-purple-300/50 mb-4"/>
                            <p className="text-2xl font-serif text-purple-200 italic">"{oracleText}"</p>
                            <button onClick={() => setIsOracleVisible(false)} className="mt-8 text-slate-400 text-sm opacity-80 hover:opacity-100">The vision fades...</button>
                        </div>
                    </div>
                )}

                {selectedNode && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg p-6 bg-black/70 backdrop-blur-lg rounded-2xl border border-purple-400/30 shadow-2xl shadow-purple-500/10 pointer-events-auto animate-fade-in">
                        <h3 className="text-xl font-bold text-purple-300 mb-2">{selectedNode.label}</h3>
                        <div className="max-h-40 overflow-y-auto text-slate-300 pr-2 mb-4"><p className="whitespace-pre-wrap">{selectedNode.content}</p></div>
                        <div className="h-24 p-3 bg-slate-800/50 rounded-lg text-sm text-purple-200 italic flex items-center justify-center">{isLoading.narration ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div> : narration}</div>
                        <div className="mt-4 flex justify-between items-center gap-4">
                            <div className="flex gap-2"><button onClick={handleAnchorNode} title="Anchor Insight" className={`flex items-center gap-2 px-3 py-2 bg-slate-700/80 hover:bg-slate-600/80 text-sm rounded-md transition-colors ${anchoredIds.includes(selectedNode.id) ? 'text-amber-300' : 'text-slate-300'}`}><BookmarkIcon className="w-4 h-4"/> Anchor</button><button onClick={handleReleaseNode} title="Release Thought" className="flex items-center gap-2 px-3 py-2 bg-slate-700/80 hover:bg-slate-600/80 text-sm text-rose-300 rounded-md transition-colors"><XIcon className="w-4 h-4"/> Release</button></div>
                            <div className="flex gap-2"><button onClick={handlePlayNarration} disabled={!narration || isLoading.narration} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full disabled:opacity-50"><Volume2Icon className="w-5 h-5"/></button><button onClick={() => setSelectedNode(null)} className="p-2 bg-purple-600 hover:bg-purple-500 rounded-full"><XIcon className="w-5 h-5"/></button></div>
                        </div>
                    </div>
                )}
                
                {/* Ultra Control Panel */}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 pointer-events-auto">
                    <div className="max-w-4xl mx-auto p-3 bg-black/50 backdrop-blur-lg border border-purple-500/20 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className='md:col-span-1'>
                            <label className="text-xs text-slate-400">Stress Level</label>
                            <input type="range" min="0" max="100" value={stressLevel} onChange={e => setStressLevel(Number(e.target.value))} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full"/>
                            <div className="flex items-center gap-2 mt-2">
                                <button onClick={handleSummonDream} disabled={isLoading.dream} className="flex-1 text-xs py-1.5 px-2 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center gap-1"><SparkleIcon className="w-3 h-3"/> {isLoading.dream ? '...' : 'Summon Dream'}</button>
                                <button onClick={handleSeekOracle} disabled={isLoading.oracle} className="flex-1 text-xs py-1.5 px-2 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center gap-1"><CompassIcon className="w-3 h-3"/> {isLoading.oracle ? '...' : 'Seek Oracle'}</button>
                            </div>
                        </div>
                        <form onSubmit={handleCraftNode} className="md:col-span-2 flex items-center gap-2">
                            <WandIcon className="w-5 h-5 text-purple-400 flex-shrink-0"/>
                            <input type="text" value={craftInput} onChange={e=>setCraftInput(e.target.value)} placeholder="Craft a node: 'My fear is a locked door...'" className="flex-1 bg-slate-800/70 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"/>
                            <button type="submit" disabled={isLoading.craft} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-md text-sm font-semibold">{isLoading.craft ? 'Crafting...': 'Craft'}</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoreRift;