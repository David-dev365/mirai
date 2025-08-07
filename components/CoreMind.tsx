import { useState, useEffect, useCallback, useRef, FC, FormEvent, useMemo } from 'react';
import { MODULES } from '../constants';
import * as gemini from '../services/geminiService';
import type { MindMapData, MindMapNode, MindMapEdge, ToneAnalysis, CoachMessage, StructuredAnalysis } from '../types';
import { SparkleIcon, BrainCircuitIcon, XIcon, RefreshIcon, SendIcon, MessageSquareQuoteIcon, CheckSquareIcon, HelpCircleIcon, CheckIcon } from './icons';

// --- Sub-components for CoreMind ---

const MindMapModal: FC<{ data: MindMapData | null; onClose: () => void }> = ({ data, onClose }) => {
    const [nodes, setNodes] = useState<MindMapNode[]>([]);
    const nodeMap = useRef(new Map<string, MindMapNode>());
    const animationFrameRef = useRef<number | null>(null);
    const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1200, height: 800 });
    const [draggingNode, setDraggingNode] = useState<string | null>(null);
    const [panState, setPanState] = useState<{ active: boolean; startX: number; startY: number }>({ active: false, startX: 0, startY: 0 });
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

    // Effect to initialize node positions when data changes
    useEffect(() => {
        if (!data?.nodes || data.nodes.length === 0) {
            setNodes([]);
            return;
        };

        const { width, height } = viewBox;
        const levels = new Map<number, string[]>();
        let maxLevel = 0;
        data.nodes.forEach(node => {
            if (!levels.has(node.level)) levels.set(node.level, []);
            levels.get(node.level)!.push(node.id);
            if(node.level > maxLevel) maxLevel = node.level;
        });

        const initialNodes = data.nodes.map(node => {
            let x = width / 2;
            let y = height / 2;
            const nodesAtLevel = levels.get(node.level);
            if (node.level > 0 && nodesAtLevel && nodesAtLevel.length > 0) {
                const angle = (nodesAtLevel.indexOf(node.id) / nodesAtLevel.length) * 2 * Math.PI;
                const radius = node.level * Math.min(width, height) / (maxLevel > 1 ? 3.5 : 2.5);
                x = width / 2 + radius * Math.cos(angle);
                y = height / 2 + radius * Math.sin(angle);
            }
            return { ...node, x, y, vx: 0, vy: 0 };
        });

        setNodes(initialNodes);
    }, [data, viewBox.width, viewBox.height]);

    // Memoize connections for fast highlighting lookup
    const connections = useMemo(() => {
        if (!data) return { getDirect: (_id: string) => new Set<string>() };
        const allConnections = new Map<string, string[]>();
        data.nodes.forEach(n => allConnections.set(n.id, []));
        data.edges.forEach(edge => {
            allConnections.get(edge.from)?.push(edge.to);
            allConnections.get(edge.to)?.push(edge.from);
        });
        return {
            getDirect: (id: string) => new Set(allConnections.get(id) || []),
        };
    }, [data]);
    
    // Physics Simulation Effect
    useEffect(() => {
        if (!data) return;

        let stableFrames = 0;
        const KINETIC_ENERGY_THRESHOLD = 0.02;

        const simulationLoop = () => {
            let totalKineticEnergy = 0;

            setNodes(currentNodes => {
                if(currentNodes.length === 0) return [];
                const newNodes = currentNodes.map(n => ({ ...n }));
                const newNodesMap = new Map(newNodes.map(n => [n.id, n]));
                
                // Constants for forces. Tuned for a "softer" feel.
                const kRepel = 200000; // Repulsion force between nodes
                const kSpring = 0.08; // Spring force along edges
                const damping = 0.92; // Slows down movement over time
                const centerForce = 0.005; // Pulls the whole graph towards the center
                const { width, height } = viewBox;

                newNodes.forEach(n => {
                    if (n.id === draggingNode) return;
                    
                    let totalForceX = 0;
                    let totalForceY = 0;
                    
                    newNodes.forEach(other => {
                        if (n.id === other.id) return;
                        const dx = n.x - other.x;
                        const dy = n.y - other.y;
                        const distSq = (dx * dx + dy * dy) || 1;
                        const force = kRepel / distSq;
                        totalForceX += (dx / Math.sqrt(distSq)) * force;
                        totalForceY += (dy / Math.sqrt(distSq)) * force;
                    });

                    data.edges.forEach(edge => {
                        const otherId = edge.from === n.id ? edge.to : edge.to === n.id ? edge.from : null;
                        if(otherId) {
                            const other = newNodesMap.get(otherId);
                            if (other) {
                                totalForceX += (other.x - n.x) * kSpring;
                                totalForceY += (other.y - n.y) * kSpring;
                            }
                        }
                    });

                    totalForceX += (width / 2 - n.x) * centerForce;
                    totalForceY += (height / 2 - n.y) * centerForce;

                    n.vx = (n.vx + totalForceX) * damping;
                    n.vy = (n.vy + totalForceY) * damping;
                    
                    n.x += n.vx;
                    n.y += n.vy;
                    totalKineticEnergy += 0.5 * (n.vx * n.vx + n.vy * n.vy);
                });
                
                nodeMap.current = new Map(newNodes.map(n => [n.id, n]));
                return newNodes;
            });

            if (totalKineticEnergy < KINETIC_ENERGY_THRESHOLD && !draggingNode) {
                stableFrames++;
            } else {
                stableFrames = 0;
            }
            if (stableFrames > 5) { // Stop simulation if stable for 5 frames
                cancelAnimationFrame(animationFrameRef.current!);
                animationFrameRef.current = null;
                return;
            }

            animationFrameRef.current = requestAnimationFrame(simulationLoop);
        };

        if (!animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(simulationLoop);
        }

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        };
    }, [data, draggingNode, viewBox]); // Rerun if these change
    
    const restartSimulation = () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        // Trigger the effect to restart
        setNodes(nodes => [...nodes]);
    };

    const getPointFromEvent = (e: React.MouseEvent<SVGSVGElement | SVGGElement> | React.TouchEvent<SVGSVGElement>) => {
        const svg = (e.currentTarget.ownerSVGElement ?? e.currentTarget) as SVGSVGElement;
        const pt = svg.createSVGPoint();
        if ('touches' in e) {
            pt.x = e.touches[0].clientX;
            pt.y = e.touches[0].clientY;
        } else {
            pt.x = e.clientX;
            pt.y = e.clientY;
        }
        const ctm = svg.getScreenCTM()?.inverse();
        return ctm ? pt.matrixTransform(ctm) : { x: 0, y: 0 };
    }
    
    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement | SVGGElement>, nodeId?: string) => {
        e.preventDefault();
        const point = getPointFromEvent(e);
        if (nodeId) {
            setDraggingNode(nodeId);
        } else {
            setPanState({ active: true, startX: point.x, startY: point.y });
        }
        restartSimulation();
    };
    
    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        e.preventDefault();
        const point = getPointFromEvent(e);
        
        if (draggingNode) {
            setNodes(currentNodes => currentNodes.map(n => n.id === draggingNode ? { ...n, x: point.x, y: point.y, vx: 0, vy: 0 } : n));
        } else if (panState.active) {
            const dx = point.x - panState.startX;
            const dy = point.y - panState.startY;
            setViewBox(vb => ({ ...vb, x: vb.x - dx, y: vb.y - dy }));
        }
    };
    
    const handleMouseUp = () => {
        setDraggingNode(null);
        setPanState({ active: false, startX: 0, startY: 0 });
    };

    const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
        e.preventDefault();
        const point = getPointFromEvent(e);
        const scaleFactor = e.deltaY < 0 ? 0.9 : 1.1;
        const newWidth = viewBox.width * scaleFactor;
        const newHeight = viewBox.height * scaleFactor;
        
        setViewBox({
            width: newWidth,
            height: newHeight,
            x: viewBox.x + (point.x - viewBox.x) * (1 - scaleFactor),
            y: viewBox.y + (point.y - viewBox.y) * (1 - scaleFactor),
        });
        restartSimulation();
    };

    const resetView = () => {
        setViewBox({ x: 0, y: 0, width: 1200, height: 800 });
        restartSimulation();
    }
    
    if (!data) return null;

    const hoveredNeighbors = hoveredNodeId ? connections.getDirect(hoveredNodeId) : null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center animate-fade-in" onClick={onClose}>
            <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white z-10 p-2 rounded-full bg-black/30"><XIcon className="w-8 h-8" /></button>
            <button onClick={resetView} className="absolute top-6 left-6 text-slate-300 hover:text-white z-10 p-2 rounded-full bg-black/30 flex items-center gap-2 text-sm px-3"><RefreshIcon className="w-5 h-5"/> Reset View</button>

            <div className="w-full h-full p-4" onClick={e => e.stopPropagation()}>
                <svg
                    width="100%"
                    height="100%"
                    viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                    onMouseDown={(e) => handleMouseDown(e)}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                    className="cursor-grab active:cursor-grabbing"
                >
                    <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#4f46e5" /></marker>
                        <marker id="arrow-highlight" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b4fc" /></marker>
                        <filter id="node-shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
                        </filter>
                        <radialGradient id="node-gradient" cx="0.3" cy="0.3" r="0.7">
                            <stop offset="0%" stopColor="#374151" />
                            <stop offset="100%" stopColor="#111827" />
                        </radialGradient>
                    </defs>
                    
                    {data.edges.map((edge, i) => {
                        const fromNode = nodeMap.current.get(edge.from);
                        const toNode = nodeMap.current.get(edge.to);
                        if (!fromNode || !toNode) return null;
                        
                        const isHighlighted = hoveredNodeId === edge.from || hoveredNodeId === edge.to;
                        const isDimmed = hoveredNodeId && !isHighlighted;

                        const controlX = (fromNode.x + toNode.x) / 2 + (toNode.y - fromNode.y) * 0.2;
                        const controlY = (fromNode.y + toNode.y) / 2 + (fromNode.x - toNode.x) * 0.2;
                        return <path key={`${edge.from}-${edge.to}`} d={`M${fromNode.x},${fromNode.y} Q${controlX},${controlY} ${toNode.x},${toNode.y}`} 
                            stroke={isHighlighted ? "#a5b4fc" : "#4A5568"} 
                            strokeWidth={isHighlighted ? 3 : 2} fill="none" 
                            markerEnd={isHighlighted ? "url(#arrow-highlight)" : "url(#arrow)"}
                            className={`transition-all duration-300 ${isDimmed ? 'opacity-20' : 'opacity-100'}`}
                         />;
                    })}

                    {nodes.map(node => {
                        const isHovered = node.id === hoveredNodeId;
                        const isNeighbor = hoveredNeighbors?.has(node.id);
                        const isDimmed = hoveredNodeId && !isHovered && !isNeighbor;
                        
                        return (
                        <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onMouseDown={(e) => handleMouseDown(e, node.id)} 
                            onMouseEnter={() => setHoveredNodeId(node.id)} onMouseLeave={() => setHoveredNodeId(null)}
                            className={`cursor-pointer transition-all duration-300 ${isDimmed ? 'opacity-30' : 'opacity-100'}`} style={{ filter: 'url(#node-shadow)' }}>
                            <circle r={node.level === 0 ? "55" : node.level === 1 ? "45" : "35"} fill="url(#node-gradient)" 
                                stroke={isHovered || isNeighbor ? "#a5b4fc" : "#6366f1"}
                                strokeWidth={isHovered ? 4 : 3} 
                                className="transition-all duration-300"
                            />
                            <text textAnchor="middle" dy=".3em" fill={isHovered || isNeighbor ? "#f1f5f9" : "#E2E8F0"} fontSize={node.level === 0 ? "14" : "12"} fontWeight="bold" pointerEvents="none" className="select-none transition-colors duration-300">
                                {node.label.length > 15 ? `${node.label.substring(0, 12)}...` : node.label}
                            </text>
                        </g>
                    )})}
                </svg>
            </div>
        </div>
    );
};

// --- Main CoreMind Component ---
const CoreMind: FC = () => {
    const moduleInfo = MODULES.CoreMind;

    // State
    const [journalText, setJournalText] = useState(() => localStorage.getItem('coremind-journal') || '');
    const [analysisResult, setAnalysisResult] = useState<StructuredAnalysis | null>(null);
    const [toneAnalysis, setToneAnalysis] = useState<ToneAnalysis | null>(null);
    const [mindMapData, setMindMapData] = useState<MindMapData | null>(null);
    const [isMindMapVisible, setIsMindMapVisible] = useState(false);
    const [dailyPrompt, setDailyPrompt] = useState('');
    const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({});
    
    // AI Coach State
    const [coachMessages, setCoachMessages] = useState<CoachMessage[]>(() => {
        const defaultMessages = [{ id: 'init', text: "I'm Mindful, your personal AI coach. What's on your mind?", sender: 'ai' }];
        try {
            const saved = localStorage.getItem('coremind-coach');
            return saved ? JSON.parse(saved) : defaultMessages;
        } catch(error) { 
            console.error("Failed to parse coach messages from localStorage:", error);
            localStorage.removeItem('coremind-coach');
            return defaultMessages;
        }
    });
    const [coachInput, setCoachInput] = useState('');
    const coachChatEndRef = useRef<HTMLDivElement>(null);

    // Effects
    useEffect(() => { localStorage.setItem('coremind-journal', journalText); }, [journalText]);
    useEffect(() => { localStorage.setItem('coremind-coach', JSON.stringify(coachMessages)); coachChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [coachMessages]);
    useEffect(() => { if(dailyPrompt) localStorage.setItem('coremind-prompt', dailyPrompt); }, [dailyPrompt]);

    const fetchDailyPrompt = useCallback(async (force = false) => {
        const storedPrompt = localStorage.getItem('coremind-prompt');
        if (!storedPrompt || force) {
            setIsLoading(prev => ({ ...prev, prompt: true }));
            const prompt = await gemini.getReflectionPrompt();
            setDailyPrompt(prompt);
            setIsLoading(prev => ({ ...prev, prompt: false }));
        } else {
            setDailyPrompt(storedPrompt);
        }
    }, []);
    
    useEffect(() => { 
        fetchDailyPrompt(); 
    }, [fetchDailyPrompt]);

    const handleAction = async (action: 'analyze' | 'visualize' | 'tone') => {
        if (!journalText.trim()) return;
        setIsLoading(prev => ({ ...prev, [action]: true }));
        setAnalysisResult(null); setToneAnalysis(null);

        try {
            if (action === 'analyze') {
                const result = await gemini.getStructuredThoughtAnalysis(journalText);
                setAnalysisResult(result);
            } else if (action === 'visualize') {
                const data = await gemini.generateMindMapData(journalText);
                setMindMapData(data);
                setIsMindMapVisible(true);
            } else if (action === 'tone') {
                const data = await gemini.analyzeJournalTone(journalText);
                setToneAnalysis(data);
            }
        } catch (error) {
            console.error(`Error during ${action}:`, error);
        } finally {
            setIsLoading(prev => ({ ...prev, [action]: false }));
        }
    };
    
    const handleCoachSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!coachInput.trim() || isLoading.coach) return;

        const userMessage: CoachMessage = { id: Date.now().toString(), text: coachInput.trim(), sender: 'user' };
        setCoachMessages(prev => [...prev, userMessage]);
        setCoachInput('');
        setIsLoading(prev => ({ ...prev, coach: true }));

        const history = coachMessages.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));
        
        const aiResponseText = await gemini.getAICoachResponse(history, userMessage.text);
        const aiMessage: CoachMessage = { id: (Date.now() + 1).toString(), text: aiResponseText, sender: 'ai' };
        setCoachMessages(prev => [...prev, aiMessage]);
        setIsLoading(prev => ({ ...prev, coach: false }));
    };


    return (
        <div className="flex-1 flex flex-col h-full bg-transparent p-4 sm:p-6 md:p-8 overflow-hidden">
            {isMindMapVisible && <MindMapModal data={mindMapData} onClose={() => setIsMindMapVisible(false)} />}
            
            <header className="mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <moduleInfo.Icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">{moduleInfo.name}</h1>
                        <p className="text-slate-400">{moduleInfo.description}</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-hidden">
                {/* Journal & Analysis */}
                <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
                    <div className="flex flex-col bg-black/30 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-800 h-full overflow-hidden">
                        <h2 className="text-xl font-semibold text-slate-200 mb-4">Thought Journal</h2>
                        <textarea
                            value={journalText}
                            onChange={(e) => setJournalText(e.target.value)}
                            placeholder="Dump your thoughts here. What's on your mind? What are you working through? Gemini will help you organize and reflect."
                            className="flex-1 w-full bg-slate-800/70 border border-slate-700 rounded-lg p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-base leading-relaxed"
                        />
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-4">
                            <button onClick={() => handleAction('analyze')} disabled={isLoading.analyze || !journalText.trim()} className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-sm rounded-md flex items-center justify-center gap-2 transition-colors">
                                <SparkleIcon className="w-4 h-4"/> {isLoading.analyze ? 'Analyzing...' : 'Structure Thoughts'}
                            </button>
                             <button onClick={() => handleAction('tone')} disabled={isLoading.tone || !journalText.trim()} className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-sm rounded-md flex items-center justify-center gap-2 transition-colors">
                                <SparkleIcon className="w-4 h-4"/> {isLoading.tone ? 'Reading...' : 'Analyze Tone'}
                            </button>
                            <button onClick={() => handleAction('visualize')} disabled={isLoading.visualize || !journalText.trim()} className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-sm rounded-md flex items-center justify-center gap-2 transition-colors">
                                <BrainCircuitIcon className="w-4 h-4"/> {isLoading.visualize ? 'Mapping...' : 'Visualize Mind Map'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Widgets Column */}
                <div className="lg:col-span-2 flex flex-col gap-6 overflow-y-auto pr-2 -mr-2">
                    {/* Analysis Display */}
                    {analysisResult && (
                         <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-800 animate-fade-in space-y-5">
                            <div>
                                <h3 className="text-lg font-semibold text-blue-300 mb-3">Key Themes</h3>
                                <div className="flex flex-wrap gap-2">
                                    {analysisResult.themes.map(t => <span key={t.theme} className="bg-blue-900/70 text-blue-200 text-sm px-3 py-1 rounded-full">{t.theme}</span>)}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center gap-2"><CheckSquareIcon className="w-5 h-5"/> Action Items</h3>
                                <ul className="space-y-2">
                                    {analysisResult.actionItems.length > 0 ? analysisResult.actionItems.map((item, i) => (
                                        <li key={i} className="flex items-center gap-2 text-slate-300 bg-slate-800/50 p-2 rounded-md"><CheckIcon className="w-4 h-4 text-green-400"/> {item}</li>
                                    )) : <p className="text-sm text-slate-400">No specific action items identified.</p>}
                                </ul>
                            </div>
                             <div>
                                <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center gap-2"><HelpCircleIcon className="w-5 h-5"/> Questions for Reflection</h3>
                                <div className="space-y-3">
                                {analysisResult.reflectionQuestions.map((q, i) => (
                                    <p key={i} className="text-slate-300 italic bg-slate-800/50 p-3 rounded-md">"{q}"</p>
                                ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {toneAnalysis && (
                        <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-800 animate-fade-in">
                            <h3 className="text-lg font-semibold text-blue-300 mb-2">Emotional Tone Analysis</h3>
                            <div className="text-slate-300 text-sm space-y-2">
                                <p><strong>Sentiment:</strong> <span className="font-bold text-blue-400">{toneAnalysis.sentiment}</span></p>
                                <p><strong>Summary:</strong> {toneAnalysis.summary}</p>
                                <div className="flex flex-wrap gap-2">
                                    <strong>Keywords:</strong>
                                    {toneAnalysis.keywords.map(k => <span key={k} className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded-full">{k}</span>)}
                                </div>
                            </div>
                        </div>
                    )}
                    
                     {/* Daily Prompt */}
                    <div className="bg-black/30 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-800">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold text-blue-300">Daily Reflection</h3>
                             <button onClick={() => fetchDailyPrompt(true)} disabled={isLoading.prompt}><RefreshIcon className={`w-5 h-5 text-slate-500 hover:text-white ${isLoading.prompt ? 'animate-spin': ''}`}/></button>
                        </div>
                        <p className="text-slate-300 italic">"{dailyPrompt || 'Loading prompt...'}"</p>
                    </div>

                    {/* AI Coach */}
                    <div className="bg-black/30 backdrop-blur-sm rounded-xl border border-slate-800 flex flex-col h-[28rem] overflow-hidden">
                       <h3 className="text-lg font-semibold text-blue-300 p-4 border-b border-slate-800 flex items-center gap-2"><MessageSquareQuoteIcon className="w-5 h-5"/> AI Coach</h3>
                       <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                           {coachMessages.map(msg => (
                               <div key={msg.id} className={`flex items-end gap-2 text-sm ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                   {msg.sender === 'ai' && <div className="w-6 h-6 rounded-full bg-blue-500/50 flex items-center justify-center flex-shrink-0"><moduleInfo.Icon className="w-4 h-4 text-blue-300"/></div>}
                                   <div className={`max-w-xs px-3 py-2 rounded-lg ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                                       <p>{msg.text}</p>
                                   </div>
                               </div>
                           ))}
                            {isLoading.coach && (
                                 <div className="flex items-end gap-2 justify-start">
                                     <div className="w-6 h-6 rounded-full bg-blue-500/50 flex items-center justify-center flex-shrink-0"><moduleInfo.Icon className="w-4 h-4 text-blue-300"/></div>
                                     <div className="px-3 py-2 rounded-lg bg-slate-700">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                        </div>
                                     </div>
                                 </div>
                            )}
                           <div ref={coachChatEndRef} />
                       </div>
                       <form onSubmit={handleCoachSubmit} className="p-2 border-t border-slate-800 flex items-center gap-2">
                           <input type="text" value={coachInput} onChange={e => setCoachInput(e.target.value)} placeholder="Ask your coach..." className="flex-1 bg-slate-800 border-none rounded-md px-3 py-1.5 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500"/>
                           <button type="submit" disabled={isLoading.coach || !coachInput.trim()} className="w-8 h-8 bg-blue-600 hover:bg-blue-500 rounded-md flex items-center justify-center flex-shrink-0 disabled:bg-blue-800"><SendIcon className="w-4 h-4"/></button>
                       </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoreMind;