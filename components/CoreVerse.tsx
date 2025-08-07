/// <reference path="../aframe.d.ts" />

import 'aframe';
import { useState, useCallback, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { MODULES } from '../constants';
import { getAstronomyData, getLiveSpaceEvents } from '../services/geminiService';
import type { CelestialObjectData, SpaceEvent } from '../types';
import { PlayIcon, PauseIcon, Volume2Icon, BookmarkIcon, CheckIcon, XIcon } from './icons';
import { celestialStaticData, skyTexture, BASE_ROTATION_DURATION_MS, StaticCelestialData } from './coreverse/celestialData';

const BOOKMARKS_KEY = 'coreverse-bookmarks';


type CombinedCelestialData = CelestialObjectData & StaticCelestialData;

// --- Unified Celestial Object Renderer ---
interface CelestialEntityProps {
    objectData: CombinedCelestialData;
    isAR?: boolean;
    position?: string;
}

const CelestialEntity: FC<CelestialEntityProps> = ({ objectData, isAR = false, position: propPosition }) => {
    const { name, visualization, rotationPeriodDays, axialTilt, texture, ringTexture } = objectData;

    const position = propPosition || (isAR ? '0 0.8 -2' : '0 1.25 -5');
    
    // --- Realistic Rotation Calculation ---
    const earthRotationPeriod = celestialStaticData['Earth'].rotationPeriodDays;
    // Duration is proportional to the object's rotation period relative to Earth's.
    // Use Math.abs because duration must be positive. Direction is handled separately.
    const rotationDur = BASE_ROTATION_DURATION_MS * (Math.abs(rotationPeriodDays) / earthRotationPeriod);
    // Use a negative rotation for retrograde planets.
    const rotationDirection = rotationPeriodDays < 0 ? '0 -360 0' : '0 360 0';
    const effectiveAxialTilt = axialTilt ?? 0;
    const rotationAnimation = `property: rotation; to: ${rotationDirection}; loop: true; dur: ${rotationDur}; easing: linear;`;

    // --- Special Cases: Black Hole & Nebula ---
    if (name === 'A Black Hole') {
        const fastRotation = `property: rotation; to: 0 360 0; loop: true; dur: 15000; easing: linear`;
        return (
            <a-entity position={position} scale={isAR ? '0.2 0.2 0.2' : '0.8 0.8 0.8'} animation={fastRotation}>
                <a-sphere color="#000" radius="1.2"></a-sphere>
                <a-torus color={visualization.color} arc="360" radius="2.5" radius-tubular="0.05" rotation="80 0 0" animation="property: rotation; to: 80 360 0; loop: true; dur: 8000; easing: linear" />
                <a-torus color={visualization.secondaryColor} arc="360" radius="3" radius-tubular="0.15" rotation="80 0 0" animation="property: rotation; to: 80 -360 0; loop: true; dur: 12000; easing: linear" />
            </a-entity>
        );
    }

    if (name === 'A Nebula') {
         const slowDrift = `property: rotation; to: 0 360 0; loop: true; dur: 200000; easing: linear`;
         return (
                <a-entity position={position} scale={isAR ? '0.3 0.3 0.3' : '1 1 1'} animation={slowDrift}>
                    <a-sphere
                        radius="1"
                        material={`shader: standard; src: #sky; emissive: ${visualization.color || '#A23B72'}; emissiveIntensity: 0.9; transparent: true; opacity: 0.8;`}
                    />
                </a-entity>
            );
    }
    
    // --- Standard Planetary Renderer ---
    const textureId = `#${name.toLowerCase().replace(/ /g, '')}`;
    const ringTextureId = ringTexture ? `#${name.toLowerCase().replace(/ /g, '')}ring` : '';
    const radius = isAR ? "0.5" : "1.2";

    const sphereMaterial = name === 'The Sun'
        ? `shader: flat; src: ${textureId}; emissive: #FFFFFF; emissiveIntensity: 1.5`
        : texture ? `src: ${textureId}` : `color: ${visualization.color}`;

    return (
        // This outer entity applies the correct axial tilt for the entire system (planet + rings).
        <a-entity position={position} rotation={`${effectiveAxialTilt} 0 0`}>
            <a-sphere
                radius={radius}
                material={sphereMaterial}
                animation={rotationAnimation} // The planet spins on its own (now tilted) axis.
            />
            {ringTexture && (
                <a-ring
                    material={`src: ${ringTextureId}; transparent: true; side: double;`}
                    radius-inner={isAR ? "0.7" : "1.6"}
                    radius-outer={isAR ? "1.2" : "3"}
                    rotation="90 0 0" // Orients the ring flat on the XZ plane, which is now tilted by the parent.
                />
            )}
        </a-entity>
    );
};


const CoreVerse: FC = () => {
    const moduleInfo = MODULES.CoreVerse;
    const [selectedObjectName, setSelectedObjectName] = useState<string>('Earth');
    const [selectedObjectData, setSelectedObjectData] = useState<CombinedCelestialData | null>(null);
    const [liveEvents, setLiveEvents] = useState<SpaceEvent[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    const [isNarrating, setIsNarrating] = useState(false);
    const [bookmarks, setBookmarks] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(BOOKMARKS_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [activeSound, setActiveSound] = useState('Cosmic Drift');
    const [greeting, setGreeting] = useState('');
    const [isArMode, setIsArMode] = useState(false);
    const [placedPosition, setPlacedPosition] = useState<string | null>(null);
    const sceneRef = useRef<any>(null);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [activeVoiceName, setActiveVoiceName] = useState<string>('Default');

    const isBookmarked = selectedObjectName ? bookmarks.includes(selectedObjectName) : false;

    // Effect to save bookmarks
    useEffect(() => {
        try {
            localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
        } catch (error) {
            console.error("Failed to save bookmarks to localStorage:", error);
        }
    }, [bookmarks]);

    // Effect to find and select the best available speech synthesis voice
    useEffect(() => {
        const getVoices = () => {
            return new Promise<SpeechSynthesisVoice[]>(resolve => {
                let voices = window.speechSynthesis.getVoices();
                if (voices.length) {
                    resolve(voices);
                    return;
                }
                window.speechSynthesis.onvoiceschanged = () => {
                    voices = window.speechSynthesis.getVoices();
                    resolve(voices);
                };
            });
        };

        const setBestVoice = async () => {
            const availableVoices = await getVoices();
            if (availableVoices.length === 0) return;

            const preferredVoices = [
                'google us english',
                'microsoft zira - english (united states)',
                'samantha',
                'daniel',
            ];

            let bestVoice: SpeechSynthesisVoice | null = null;
            
            for (const name of preferredVoices) {
                const found = availableVoices.find(v => v.name.toLowerCase() === name && v.lang.startsWith('en'));
                if (found) {
                    bestVoice = found;
                    break;
                }
            }

            if (!bestVoice) {
                bestVoice = availableVoices.find(v => v.lang === 'en-US' && v.localService) || null;
            }
            if (!bestVoice) {
                bestVoice = availableVoices.find(v => v.lang === 'en-US') || null;
            }
            if (!bestVoice) {
                bestVoice = availableVoices.find(v => v.lang.startsWith('en')) || null;
            }

            setSelectedVoice(bestVoice);
            if (bestVoice) {
                setActiveVoiceName(bestVoice.name);
            }
        };
        
        setBestVoice();
    }, []);

    // --- Narration Logic ---
    const handleToggleNarration = () => {
        if (!selectedObjectData?.narratorScript) return;

        const synth = window.speechSynthesis;
        if (synth.speaking) {
            synth.cancel();
            setIsNarrating(false);
        } else {
            const utterance = new SpeechSynthesisUtterance(selectedObjectData.narratorScript);
            
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
            
            utterance.pitch = 1.0;
            utterance.rate = 0.9;

            utterance.onend = () => setIsNarrating(false);
            utterance.onerror = (e: SpeechSynthesisErrorEvent) => {
                console.error("Speech synthesis error:", e.error);
                setIsNarrating(false);
            };
            synth.speak(utterance);
            setIsNarrating(true);
        }
    };

    // Effect to cancel speech synthesis when the selected object changes or component unmounts
    useEffect(() => {
        const synth = window.speechSynthesis;
        const cancelSpeech = () => {
            if (synth.speaking) {
                synth.cancel();
            }
        };
        
        cancelSpeech();
        setIsNarrating(false); // Reset narration state on object change

        return () => { // Cleanup on unmount
            cancelSpeech();
        };
    }, [selectedObjectName]);

    const fetchObjectData = useCallback(async (objectName: string) => {
        setIsLoadingData(true);
        setSelectedObjectName(objectName);

        const staticData = celestialStaticData[objectName];
        const dynamicData = await getAstronomyData(objectName);

        if (staticData && dynamicData) {
            setSelectedObjectData({ ...dynamicData, ...staticData, name: staticData.name });
        } else {
            console.error("Failed to load data for", objectName);
            setSelectedObjectData(null);
        }

        setIsLoadingData(false);
    }, []);

    const fetchEvents = useCallback(async () => {
        setIsLoadingEvents(true);
        const events = await getLiveSpaceEvents();
        setLiveEvents(events);
        setIsLoadingEvents(false);
    }, []);
    
    useEffect(() => {
        fetchObjectData('Earth');
        fetchEvents();
        setGreeting("Welcome, stargazer. Our home planet is first on our tour.");
    }, [fetchObjectData, fetchEvents]);

    useEffect(() => {
        const sceneEl = sceneRef.current;
        if (isArMode && sceneEl) {
            const handleSelect = (e: any) => {
                if(e.detail.intersection) {
                    const { point } = e.detail.intersection;
                    setPlacedPosition(`${point.x} ${point.y} ${point.z}`);
                }
            };
            sceneEl.addEventListener('ar-hit-test-select', handleSelect);
            return () => sceneEl.removeEventListener('ar-hit-test-select', handleSelect);
        }
    }, [isArMode]);

    const checkAndEnterAr = async () => {
        try {
            const nav = navigator as any;
            if (nav.xr && await nav.xr.isSessionSupported('immersive-ar')) {
                setPlacedPosition(null);
                setIsArMode(true);
            } else {
                alert("Your device doesn't support WebXR for Augmented Reality.");
            }
        } catch(e) {
            console.error("Error checking AR support:", e);
            alert("An error occurred while checking for AR support.");
        }
    };

    const handleToggleBookmark = () => {
        if (!selectedObjectName) return;
        setBookmarks(prev => 
            prev.includes(selectedObjectName)
                ? prev.filter(b => b !== selectedObjectName)
                : [...prev, selectedObjectName]
        );
    };
    
    const celestialBodies = Object.keys(celestialStaticData);
    const assets = (
        <a-assets timeout="15000">
            <img id="sky" src={skyTexture} crossOrigin="anonymous" />
            {Object.values(celestialStaticData).map(body => 
                body.texture && <img id={body.name.toLowerCase().replace(/ /g, '')} src={body.texture} key={body.name} crossOrigin="anonymous" />
            )}
            {Object.values(celestialStaticData).map(body => 
                body.ringTexture && <img id={`${body.name.toLowerCase().replace(/ /g, '')}ring`} src={body.ringTexture} key={`${body.name}ring`} crossOrigin="anonymous" />
            )}
        </a-assets>
    );

    if (isArMode) {
        return (
            <div className="absolute inset-0 z-50 animate-fade-in">
                <a-scene
                    ref={sceneRef}
                    webxr="requiredFeatures: hit-test;"
                    ar-hit-test-enabled="true"
                    renderer="colorManagement: true;"
                    className="w-full h-full"
                >
                    {assets}
                    <a-light type="ambient" color="#BBB"></a-light>
                    <a-light type="directional" intensity="0.5" position="-1 1 1"></a-light>
                    {selectedObjectData && placedPosition && <CelestialEntity objectData={selectedObjectData} isAR={true} position={placedPosition} />}
                </a-scene>
                 <button onClick={() => setIsArMode(false)} className="absolute top-6 right-6 bg-black/50 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                    <XIcon className="w-5 h-5"/> Exit AR
                </button>
                {!placedPosition && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/50 text-white px-6 py-3 rounded-xl">
                        Tap on a surface to place {selectedObjectName}.
                    </div>
                )}
            </div>
        );
    }
    
    return (
        <div className="flex-1 flex flex-col lg:flex-row h-full bg-transparent overflow-hidden">
             {/* Left Panel: Controls */}
             <div className="w-full lg:w-1/3 h-1/2 lg:h-full lg:max-w-sm flex-shrink-0 bg-black/30 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
                <header className="mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center">
                            <moduleInfo.Icon className="w-6 h-6 text-teal-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">{moduleInfo.name}</h1>
                            <p className="text-slate-400">{moduleInfo.description}</p>
                        </div>
                    </div>
                     <p className="text-sm text-teal-300/80 mt-4 p-3 bg-teal-900/40 rounded-lg">{greeting}</p>
                </header>
                
                <div className="space-y-6">
                    <div>
                        <label htmlFor="celestial-select" className="block text-sm font-medium text-slate-300 mb-2">Select Celestial Body</label>
                        <select
                            id="celestial-select"
                            value={selectedObjectName}
                            onChange={e => fetchObjectData(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base"
                        >
                            {celestialBodies.map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                         <button onClick={checkAndEnterAr} className="mt-2 w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                            View in AR
                        </button>
                    </div>

                    {isLoadingData ? (
                        <div className="text-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400 mx-auto"></div>
                            <p className="mt-4 text-slate-400">Traveling through spacetime...</p>
                        </div>
                    ) : selectedObjectData && (
                        <div className="animate-fade-in space-y-4">
                             <div className="flex justify-between items-center">
                                 <h2 className="text-2xl font-bold text-teal-300">{selectedObjectData.name}</h2>
                                 <button onClick={handleToggleBookmark} className={`p-2 rounded-full transition-colors ${isBookmarked ? 'bg-teal-500/30 text-teal-300' : 'text-slate-500 hover:bg-slate-700'}`}>
                                    {isBookmarked ? <CheckIcon className="w-5 h-5"/> : <BookmarkIcon className="w-5 h-5"/>}
                                 </button>
                             </div>
                            
                            <button
                                onClick={handleToggleNarration}
                                className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
                            >
                                {isNarrating ? <><PauseIcon className="w-5 h-5"/> Pause Narration</> : <><PlayIcon className="w-5 h-5"/> Play Narration</>}
                                <Volume2Icon className="w-5 h-5"/>
                            </button>
                            <p className="text-sm text-slate-400">Using voice: {activeVoiceName}</p>

                            <div className="bg-slate-800/50 p-4 rounded-lg">
                                <h3 className="font-semibold text-slate-200 mb-2">Fast Facts</h3>
                                <ul className="text-sm text-slate-300 space-y-1">
                                    {Object.entries(selectedObjectData.facts).map(([key, value]) => (
                                        <li key={key}><strong>{key.replace(/([A-Z])/g, ' $1').trim()}:</strong> {value}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="text-lg font-semibold text-slate-200 mb-2">Live Sky Events</h3>
                        {isLoadingEvents ? (
                            <p className="text-slate-400">Scanning the cosmos...</p>
                        ) : (
                            <ul className="space-y-2 text-sm">
                                {liveEvents.map(event => (
                                    <li key={event.title} className="bg-slate-800/50 p-3 rounded-lg">
                                        <p className="font-bold text-teal-400">{event.title} ({event.date})</p>
                                        <p className="text-slate-400">{event.description}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel: A-Frame Scene */}
            <div className="flex-1 bg-black h-1/2 lg:h-full">
                 <a-scene embedded className="w-full h-full" renderer="colorManagement: true;">
                    {assets}
                    <a-sky src="#sky" rotation="0 -90 0"></a-sky>
                    <a-entity light="type: ambient; color: #BBB"></a-entity>
                    <a-entity light="type: directional; intensity: 0.5" position="-1 1 1"></a-entity>
                    <a-camera position="0 1.6 0"></a-camera>

                    {selectedObjectData && !isLoadingData && <CelestialEntity objectData={selectedObjectData} />}
                </a-scene>
            </div>
        </div>
    );
};

export default CoreVerse;
