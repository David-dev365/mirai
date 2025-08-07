
import { useState, useEffect, useMemo, CSSProperties } from 'react';
import type { FC } from 'react';
import { MODULES } from '../constants';
import type { ModuleKey, ModuleInfo } from '../types';
import { MLogo, ExoCoreButtonIcon } from './icons';

interface HubProps {
    onSelectModule: (key: ModuleKey) => void;
    onSelectExoCore: () => void;
    onSelectLogo: () => void;
    bootSequenceFinished: boolean;
    onBootComplete: () => void;
}

const modules = Object.values(MODULES);
const totalModules = modules.length;

const BootSequence: FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [stage, setStage] = useState(0);

    const particles = useMemo(() => {
        return Array.from({ length: 200 }).map((_, i) => ({
            id: i,
            endX: `${(Math.random() - 0.5) * 200}vmax`,
            endY: `${(Math.random() - 0.5) * 200}vmax`,
            duration: `${Math.random() * 2 + 1.5}s`,
            delay: `${Math.random() * 0.5}s`,
            size: `${Math.random() * 2 + 1}px`,
        }));
    }, []);

    useEffect(() => {
        const timers: number[] = [];
        timers.push(window.setTimeout(() => setStage(1), 500));
        timers.push(window.setTimeout(() => setStage(2), 2500));
        timers.push(window.setTimeout(() => setStage(3), 4500));
        timers.push(window.setTimeout(() => setStage(4), 7000));
        timers.push(window.setTimeout(() => setStage(5), 9500));
        timers.push(window.setTimeout(() => setStage(6), 11000));
        timers.push(window.setTimeout(onComplete, 12000));

        return () => timers.forEach(clearTimeout);
    }, [onComplete]);

    return (
        <div 
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none overflow-hidden bg-black"
            style={{ animation: stage >= 6 ? 'boot-container-fade-out 1s ease-out forwards' : '' }}
        >
            {stage >= 1 && stage < 4 && (
                <div 
                    className="absolute w-full h-0.5 bg-white"
                    style={{
                        animation: stage === 1 ? 'boot-line-appear 2s ease-out forwards' 
                                 : stage === 2 ? 'boot-line-appear 2s ease-out forwards, boot-line-glitch 0.2s steps(4, end) infinite 2s'
                                 : 'boot-line-dissolve 0.5s ease-in forwards',
                        boxShadow: '0 0 5px white, 0 0 10px white',
                    }}
                />
            )}
            {stage === 3 && (
                <div className="absolute inset-0 flex items-center justify-center">
                    {particles.map(p => (
                        <div
                            key={p.id}
                            className="absolute rounded-full bg-white"
                            style={{
                                width: p.size,
                                height: p.size,
                                // @ts-ignore
                                '--particle-end-x': p.endX,
                                '--particle-end-y': p.endY,
                                animation: `boot-particle-explode ${p.duration} ease-out forwards`,
                                animationDelay: p.delay,
                            }}
                        />
                    ))}
                </div>
            )}
            {stage >= 4 && (
                 <MLogo 
                    className="w-32 h-32 sm:w-48 sm:h-48 text-white transition-all duration-1000"
                    style={{ animation: stage === 4 ? 'boot-logo-materialize 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards' : '' }}
                 />
            )}
            {stage >= 5 && (
                <div 
                    className="absolute w-1 h-1 bg-transparent rounded-full" 
                    style={{ animation: 'boot-final-shockwave 1.5s ease-out forwards' }}
                />
            )}
        </div>
    );
};

const ModuleCard: FC<{ module: ModuleInfo, onClick: () => void }> = ({ module, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="group relative aspect-square flex flex-col items-center justify-center text-center p-2 sm:p-4 transition-all duration-300 focus:outline-none bg-slate-900/70 backdrop-blur-sm rounded-lg border border-purple-500/20 hover:bg-slate-800/90"
            style={{ '--module-color': module.color } as CSSProperties}
        >
            <div
                className="absolute inset-0 transition-all duration-300 opacity-0 group-hover:opacity-100 rounded-lg"
                style={{
                    border: '2px solid var(--module-color)',
                    filter: 'drop-shadow(0 0 10px var(--module-color))',
                }}
            />
            <div className="relative z-10 flex flex-col items-center justify-center p-2">
                <module.Icon
                    className="w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300 group-hover:scale-110"
                    style={{ color: 'var(--module-color)', filter: 'drop-shadow(0 0 5px var(--module-color))' }}
                />
                <span className="text-sm font-semibold mt-2 text-white transition-all duration-300">
                    {module.name}
                </span>
                <p className="text-xs text-slate-400 mt-1 hidden sm:block">
                    {module.description}
                </p>
            </div>
        </button>
    );
};

const Hub: FC<HubProps> = ({ onSelectModule, onSelectExoCore, onSelectLogo, bootSequenceFinished, onBootComplete }) => {
    const [hoveredModule, setHoveredModule] = useState<ModuleKey | null>(null);
    
    useEffect(() => {
        if (!bootSequenceFinished) return;
        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            const x = (clientX / innerWidth - 0.5) * 40;
            const y = (clientY / innerHeight - 0.5) * 40;
            document.documentElement.style.setProperty('--mouse-x', `${-x / 2}`);
            document.documentElement.style.setProperty('--mouse-y', `${-y / 2}`);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [bootSequenceFinished]);

    return (
        <div className="w-full min-h-screen overflow-x-hidden">
            {!bootSequenceFinished && <BootSequence onComplete={onBootComplete} />}
            
            {bootSequenceFinished && (
                <div className="w-full min-h-screen flex flex-col items-center justify-start lg:justify-center p-4 text-white animate-fade-in">
                    {/* Mobile & Tablet Layout */}
                    <div className="w-full flex flex-col items-center lg:hidden pt-8 pb-16">
                        <button onClick={onSelectLogo} className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-indigo-400 rounded-full mb-6">
                           <MLogo className="w-20 h-20 text-white" />
                        </button>
                        <div className="w-full max-w-md grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {modules.map(module => (
                                <ModuleCard key={module.key} module={module} onClick={() => onSelectModule(module.key)} />
                            ))}
                        </div>
                         <div className="mt-8">
                           <button 
                                onClick={onSelectExoCore} 
                                className="group relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center"
                                aria-label="Access Exo-Cores"
                            >
                                <div className="absolute inset-0 bg-amber-500/20 rounded-full opacity-50 group-hover:opacity-70" style={{ animation: 'exo-pulse 4s infinite ease-in-out' }}></div>
                                <div className="absolute inset-1.5 bg-slate-900 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105" style={{ boxShadow: '0 0 15px rgba(251, 146, 60, 0.4) inset, 0 0 10px rgba(0,0,0,0.5)' }}>
                                    <ExoCoreButtonIcon className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 transition-transform duration-300 group-hover:rotate-12" />
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="w-full h-full items-center justify-center hidden lg:flex">
                        <main className="relative w-full max-w-4xl h-[550px] flex items-center justify-center">
                            <div className="relative w-32 h-32 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-900/50 via-slate-900/30 to-purple-900/50 opacity-50 blur-lg"></div>
                                <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400/50" style={{animation: 'holo-ring-spin 20s linear infinite'}}></div>
                                <div className="absolute inset-2 rounded-full border-b-2 border-fuchsia-500/50" style={{animation: 'holo-ring-spin 15s linear infinite reverse'}}></div>
                                <button onClick={onSelectLogo} className="relative z-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-400 rounded-full">
                                   <MLogo className="w-24 h-24 text-white" />
                                </button>
                            </div>

                            {modules.map((module, index) => {
                                const angle = (index / totalModules) * (2 * Math.PI);
                                const radius = 240;
                                const isHovered = hoveredModule === module.key;
                                const isAnyHovered = hoveredModule !== null;
                                let x = radius * Math.cos(angle);
                                let y = radius * Math.sin(angle);
                                let scale = 0.9;
                                let opacity = 0.9;
                                
                                if (isHovered) {
                                    scale = 1.1;
                                    opacity = 1;
                                } else if (isAnyHovered) {
                                    opacity = 0.6;
                                }
                                
                                return (
                                    <div 
                                        key={module.key}
                                        className="absolute transition-all duration-300 ease-in-out group"
                                        style={{ '--module-color': module.color, transform: `translate(${x}px, ${y - (isHovered ? 10 : 0)}px) scale(${scale})`, opacity } as CSSProperties}
                                        onMouseEnter={() => setHoveredModule(module.key)}
                                        onMouseLeave={() => setHoveredModule(null)}
                                    >
                                        <button
                                            onClick={() => onSelectModule(module.key)}
                                            className="relative w-32 h-36 flex flex-col items-center justify-center text-center transition-all duration-300 focus:outline-none"
                                            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                                        >
                                            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-all duration-300 group-hover:bg-slate-800/90" style={{clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'}}/>
                                            <div className="absolute inset-0 transition-all duration-300 opacity-40 group-hover:opacity-100" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', border: '2px solid var(--module-color)', filter: 'drop-shadow(0 0 10px var(--module-color))' }}/>
                                            <div className="relative z-10 flex flex-col items-center justify-center p-2">
                                                <module.Icon className="w-9 h-9 transition-all duration-300 group-hover:scale-110" style={{ color: 'var(--module-color)', filter: 'drop-shadow(0 0 5px var(--module-color))' }} />
                                                <span className="text-sm font-semibold mt-2 text-white transition-all duration-300 opacity-90 group-hover:opacity-100">{module.name}</span>
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </main>
                        <div className="absolute bottom-8 right-8">
                            <button 
                                onClick={onSelectExoCore} 
                                className="group relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center"
                                aria-label="Access Exo-Cores"
                            >
                                <div className="absolute inset-0 bg-amber-500/20 rounded-full transition-opacity opacity-50 group-hover:opacity-70" style={{ animation: 'exo-pulse 4s infinite ease-in-out' }}></div>
                                <div className="absolute inset-1.5 bg-slate-900 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105" style={{ boxShadow: '0 0 15px rgba(251, 146, 60, 0.4) inset, 0 0 10px rgba(0,0,0,0.5)' }}>
                                     <ExoCoreButtonIcon className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 transition-transform duration-300 group-hover:rotate-12" />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Hub;