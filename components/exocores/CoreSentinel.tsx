

import { useState, useEffect, FC, useCallback } from 'react';
import type { ThreatLog, MonitoredApp, SensorType, AppStatus } from '../../types';
import * as gemini from '../../services/geminiService';
import { ExoCoreHeader, InfoCard } from './common';
import { useMiraiSystem } from '../../contexts/MiraiSystemContext';
import { 
    ShieldOffIcon, 
    ActivityIcon, 
    VideoIcon, 
    MicIcon, 
    XIcon, 
    CheckIcon,
    RadioIcon,
    AlertTriangleIcon,
    LockIcon,
    GlobeIcon,
    SparkleIcon,
    RefreshIcon,
} from '../icons';

// --- TYPES, CONSTANTS & HELPERS ---
const SENTINEL_APPS_KEY = 'sentinel-apps';
const SENTINEL_LOGS_KEY = 'sentinel-logs';
const SENTINEL_SHIELDS_KEY = 'sentinel-shields';
const SENTINEL_THREATDB_KEY = 'sentinel-threatdb';

const safeJsonParse = <T,>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.error(`Failed to parse ${key} from localStorage`, e);
        return fallback;
    }
};

const initialApps: MonitoredApp[] = [
    { id: 'app1', name: 'SocialConnect', category: 'Social', using: null, status: 'safe', networkActivity: 'idle' },
    { id: 'app2', name: 'GeoMaps', category: 'Navigation', using: 'location', status: 'safe', networkActivity: 'idle' },
    { id: 'app3', name: 'QuickVid', category: 'Entertainment', using: null, status: 'safe', networkActivity: 'idle' },
    { id: 'app4', name: 'WorkChat', category: 'Productivity', using: null, status: 'safe', networkActivity: 'idle' },
    { id: 'app5', name: 'UnknownService', category: 'System', using: null, status: 'suspicious', networkActivity: 'idle' },
];

const newAppPool: { name: string; category: string; status: AppStatus }[] = [
    { name: 'DataMiner Pro', category: 'Utilities', status: 'suspicious' },
    { name: 'FreeGamez', category: 'Entertainment', status: 'suspicious' },
    { name: 'SystemOptimizer', category: 'Utilities', status: 'safe' },
    { name: 'PhotoMagic AI', category: 'Entertainment', status: 'safe' },
    { name: 'NetScanner', category: 'Utilities', status: 'safe' },
];

const initialThreats = ['shady-analytics.com', 'malware-cdn.net', 'tracker.io', 'crypto-miner.pool'];
const threatUpdates = ['data-exfil.net', 'adware-distro.com', 'keylogger.info'];
const safeDomains = ['google.com', 'github.com', 'wikipedia.org', 'react.dev'];

const sensorIcons: Record<SensorType, FC<any>> = {
    camera: VideoIcon,
    microphone: MicIcon,
    location: GlobeIcon,
};

// --- MAIN COMPONENT ---
const CoreSentinel: FC<{ onBack: () => void }> = ({ onBack }) => {
    const { coreStatuses, addLog, processTriggers } = useMiraiSystem();
    const isEnabled = coreStatuses.CoreSentinel.enabled;

    const [apps, setApps] = useState<MonitoredApp[]>(() => safeJsonParse(SENTINEL_APPS_KEY, initialApps));
    const [logs, setLogs] = useState<ThreatLog[]>(() => safeJsonParse(SENTINEL_LOGS_KEY, []));
    const [shields, setShields] = useState(() => safeJsonParse(SENTINEL_SHIELDS_KEY, { camera: false, microphone: false, location: false, stealthMode: false }));
    const [threatDb, setThreatDb] = useState<string[]>(() => safeJsonParse(SENTINEL_THREATDB_KEY, initialThreats));
    
    const [lastDbUpdate, setLastDbUpdate] = useState<string | null>(null);
    const [lastScanned, setLastScanned] = useState<string>('');
    const [isUpdatingDb, setIsUpdatingDb] = useState(false);
    const [showPanicConfirm, setShowPanicConfirm] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState<string | null>(null);

    useEffect(() => { localStorage.setItem(SENTINEL_APPS_KEY, JSON.stringify(apps)); }, [apps]);
    useEffect(() => { localStorage.setItem(SENTINEL_LOGS_KEY, JSON.stringify(logs)); }, [logs]);
    useEffect(() => { localStorage.setItem(SENTINEL_SHIELDS_KEY, JSON.stringify(shields)); }, [shields]);
    useEffect(() => { localStorage.setItem(SENTINEL_THREATDB_KEY, JSON.stringify(threatDb)); }, [threatDb]);

    useEffect(() => {
        if (!isEnabled) {
            setApps(prev => prev.map(a => ({...a, using: null, networkActivity: 'idle'})));
            return;
        }

        const simulationTimer = setInterval(() => {
            setLastScanned(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            const randomActivity = Math.random();

            setApps(currentApps => {
                let nextApps = [...currentApps];

                if (randomActivity < 0.05 && nextApps.length < 8) { // Discover new app
                    const potentialNewApp = newAppPool[Math.floor(Math.random() * newAppPool.length)];
                    if (!nextApps.some(a => a.name === potentialNewApp.name)) {
                        const newApp: MonitoredApp = { ...potentialNewApp, id: `app${Date.now()}`, using: null, networkActivity: 'idle' };
                        nextApps.push(newApp);
                        const newLog: ThreatLog = { id: (Date.now() + 1).toString(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), severity: 'warning', message: `New application installed: "${newApp.name}".` };
                        setLogs(prev => [newLog, ...prev.slice(0, 99)]);
                    }
                } else if (randomActivity < 0.2) { // Sensor access
                    const nonBlockedApps = nextApps.filter(a => a.status !== 'blocked');
                    if (nonBlockedApps.length > 0) {
                        const targetApp = nonBlockedApps[Math.floor(Math.random() * nonBlockedApps.length)];
                        const sensors: SensorType[] = ['camera', 'microphone', 'location'];
                        const sensorToUse = sensors[Math.floor(Math.random() * sensors.length)];
                        
                        if (!shields[sensorToUse]) {
                            const newLogMsg: ThreatLog = { id: (Date.now() + 1).toString(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), severity: targetApp.status === 'suspicious' ? 'critical' : 'warning', message: `App "${targetApp.name}" started using ${sensorToUse}.` };
                            setLogs(prev => [newLogMsg, ...prev.slice(0, 99)]);
                            if (targetApp.status === 'suspicious') {
                                processTriggers({ entity: 'CoreSentinel', event: 'Intrusion Detected' });
                            }
                            const targetAppId = targetApp.id;
                            nextApps = nextApps.map(app => app.id === targetAppId ? { ...app, using: sensorToUse } : app);
                            setTimeout(() => setApps(prev => prev.map(app => app.id === targetAppId ? {...app, using: null} : app)), 3000);
                        }
                    }
                } else if (randomActivity < 0.4) { // Network activity
                    const activeApps = nextApps.filter(a => a.status !== 'blocked');
                    if (activeApps.length > 0) {
                        const app = activeApps[Math.floor(Math.random() * activeApps.length)];
                        const isMalicious = Math.random() < 0.4;
                        const domain = isMalicious ? threatDb[Math.floor(Math.random() * threatDb.length)] : safeDomains[Math.floor(Math.random() * safeDomains.length)];
                        const appId = app.id;
                        
                        nextApps = nextApps.map(a => a.id === appId ? { ...a, networkActivity: 'active' as const } : a);
                        setTimeout(() => { setApps(prev => prev.map(a => a.id === appId ? { ...a, networkActivity: 'idle' as const } : a)); }, 2000);
    
                        if (threatDb.includes(domain)) {
                            setLogs(prev => [{ id: (Date.now() + 1).toString(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), severity: 'critical', message: `App "${app.name}" attempted connection to malicious domain: ${domain}.` }, ...prev.slice(0, 99)]);
                            nextApps = nextApps.map(a => a.id === app.id ? {...a, status: 'blocked', using: null} : a);
                            processTriggers({ entity: 'CoreSentinel', event: 'Malicious App Blocked' });
                        }
                    }
                } else if (randomActivity > 0.98 && nextApps.length > initialApps.length) { // Uninstall app
                    const appsToUninstall = nextApps.filter(a => !initialApps.some(ia => ia.id === a.id));
                    if (appsToUninstall.length > 0) {
                        const appToRemove = appsToUninstall[0];
                        nextApps = nextApps.filter(a => a.id !== appToRemove.id);
                        setLogs(prev => [{ id: Date.now().toString(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), severity: 'info', message: `Application "${appToRemove.name}" was uninstalled.` }, ...prev.slice(0, 99)]);
                    }
                }
                return nextApps;
            });
        }, 2500);

        return () => clearInterval(simulationTimer);
    }, [shields, threatDb, isEnabled, processTriggers]);

    const toggleShield = (shield: keyof typeof shields) => {
        setShields(prev => {
            const newShields = { ...prev, [shield]: !prev[shield] };
            if (newShields[shield] && shield !== 'stealthMode') {
                setApps(currentApps => currentApps.map(app => app.using === shield ? {...app, using: null} : app));
                 const newLog: ThreatLog = { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), severity: 'info', message: `Global ${shield} shield ENABLED. Access blocked.` };
                setLogs(prevLogs => [newLog, ...prevLogs.slice(0, 99)]);
            }
            return newShields;
        });
    };

    const toggleAppBlock = (appId: string) => {
        setApps(prev => prev.map(app => {
            if (app.id === appId) {
                const isNowBlocked = app.status !== 'blocked';
                const newLog: ThreatLog = { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), severity: 'warning', message: `App "${app.name}" has been manually ${isNowBlocked ? 'BLOCKED' : 'UNBLOCKED'}.` };
                setLogs(prevLogs => [newLog, ...prevLogs.slice(0, 99)]);
                return { ...app, status: isNowBlocked ? 'blocked' : 'safe', using: null };
            }
            return app;
        }));
    };
    
    const handlePanic = () => {
        localStorage.removeItem(SENTINEL_APPS_KEY);
        localStorage.removeItem(SENTINEL_LOGS_KEY);
        localStorage.removeItem(SENTINEL_SHIELDS_KEY);
        const logMessage = 'PANIC SWITCH ACTIVATED. Wiping logs and blocking all apps.';
        setLogs([{ id: Date.now().toString(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), severity: 'critical', message: logMessage }]);
        addLog('CoreSentinel', logMessage, 'error');
        processTriggers({ entity: 'CoreSentinel', event: 'Panic Switch Activated' });
        setApps(prev => prev.map(app => ({...app, status: 'blocked', using: null})));
        setShields({ camera: true, microphone: true, location: true, stealthMode: true });
        setShowPanicConfirm(false);
    };
    
    const handleAnalyzeLog = async (logId: string) => {
        const logToAnalyze = logs.find(l => l.id === logId);
        if (!logToAnalyze || logToAnalyze.analysis || isAnalyzing) return;
        setIsAnalyzing(logId);
        const result = await gemini.analyzeThreatLog(logToAnalyze.message);
        if (result) {
            setLogs(prevLogs => prevLogs.map(l => l.id === logId ? { ...l, analysis: result } : l));
        }
        setIsAnalyzing(null);
    };
    
    const handleUpdateThreatDb = useCallback(() => {
        setIsUpdatingDb(true);
        setLogs(prev => [{ id: Date.now().toString(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), severity: 'info', message: `Fetching latest threat intelligence data...` }, ...prev.slice(0, 99)]);
        setTimeout(() => {
            setThreatDb(prev => [...new Set([...prev, ...threatUpdates])]);
            setLastDbUpdate(new Date().toLocaleString());
            setLogs(prev => [{ id: (Date.now() + 1).toString(), timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), severity: 'info', message: `Threat database updated with ${threatUpdates.length} new definitions.` }, ...prev.slice(0, 99)]);
            setIsUpdatingDb(false);
        }, 1500);
    }, []);

    const ShieldButton: FC<{label: string, name: keyof typeof shields, icon: FC<any>}> = ({label, name, icon: Icon}) => (
        <button onClick={() => toggleShield(name as keyof typeof shields)} className={`p-3 rounded-lg flex-1 flex flex-col items-center justify-center gap-2 transition-colors ${shields[name] ? 'bg-sky-500/30 text-sky-300' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700'}`}>
            <Icon className="w-6 h-6"/>
            <span className="text-xs font-semibold">{label}</span>
        </button>
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
            
            {showPanicConfirm && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center animate-fade-in">
                    <div className="p-8 bg-slate-900 border border-red-500/50 rounded-lg text-center max-w-sm">
                        <ShieldOffIcon className="w-12 h-12 text-red-500 mx-auto mb-4"/>
                        <h3 className="text-xl font-bold text-red-400 mb-2">ACTIVATE PANIC KILL SWITCH?</h3>
                        <p className="text-slate-300 mb-6 text-sm">This will immediately block all apps, enable all shields, and wipe activity logs from this device.</p>
                        <div className="flex gap-4">
                            <button onClick={handlePanic} className="flex-1 p-3 bg-red-600 hover:bg-red-500 rounded-md flex items-center justify-center gap-2"><CheckIcon className="w-5 h-5"/> Confirm</button>
                            <button onClick={() => setShowPanicConfirm(false)} className="flex-1 p-3 bg-slate-700 hover:bg-slate-600 rounded-md flex items-center justify-center gap-2"><XIcon className="w-5 h-5"/> Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            
            <ExoCoreHeader coreKey="CoreSentinel" onBack={onBack} />
            
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <InfoCard title="Global Privacy Shields" icon={LockIcon}>
                         <div className="flex gap-2">
                            <ShieldButton label="Camera" name="camera" icon={VideoIcon}/>
                            <ShieldButton label="Mic" name="microphone" icon={MicIcon}/>
                            <ShieldButton label="Location" name="location" icon={GlobeIcon}/>
                         </div>
                    </InfoCard>
                    <InfoCard title="Threat Intelligence" icon={RadioIcon}>
                         <div className="text-sm space-y-3">
                            <p>Definitions: <span className="font-bold text-sky-300">{threatDb.length}</span></p>
                            <p>Last DB Update: <span className="text-slate-400">{lastDbUpdate || 'Never'}</span></p>
                            <p>Last System Scan: <span className="font-bold text-sky-300">{lastScanned}</span></p>
                         </div>
                         <button onClick={handleUpdateThreatDb} disabled={isUpdatingDb} className="w-full mt-4 p-3 bg-sky-600/80 hover:bg-sky-500/80 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors disabled:bg-slate-700 disabled:cursor-wait">
                            <RefreshIcon className={`w-4 h-4 ${isUpdatingDb ? 'animate-spin' : ''}`}/>
                            {isUpdatingDb ? 'Updating...' : 'Update Database'}
                         </button>
                    </InfoCard>
                    <InfoCard title="Panic Kill Switch" icon={AlertTriangleIcon}>
                        <button onClick={() => setShowPanicConfirm(true)} className="w-full p-4 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded-lg text-red-300 flex items-center justify-center gap-3 transition-colors text-lg font-bold">
                           <ShieldOffIcon className="w-6 h-6"/>
                           INITIATE LOCKDOWN
                        </button>
                    </InfoCard>
                </div>

                <div className="lg:col-span-3 flex flex-col gap-6">
                     <InfoCard title="App Privacy Guard" icon={ActivityIcon} className="flex-1 overflow-hidden min-h-[300px]">
                        <div className="flex-1 overflow-y-auto -m-2 p-2 space-y-2">
                           {apps.map(app => {
                                const SensorIcon = app.using ? sensorIcons[app.using] : null;
                                return (
                                <div key={app.id} className={`p-3 rounded-lg flex items-center gap-3 transition-colors ${app.status === 'blocked' ? 'bg-red-500/10' : 'bg-slate-800/60'}`}>
                                    <div className="flex-1">
                                        <p className={`font-semibold ${app.status === 'blocked' ? 'text-slate-500 line-through' : ''}`}>{app.name}</p>
                                        <p className="text-xs text-slate-500">{app.category}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        {app.networkActivity === 'active' && <div className="flex items-center gap-1 text-green-400 animate-pulse"><GlobeIcon className="w-4 h-4"/> NET</div>}
                                        {app.using && !shields[app.using] && <div className="flex items-center gap-1 text-yellow-400 animate-pulse"><SensorIcon className="w-4 h-4"/> USING {app.using.toUpperCase()}</div>}
                                        {app.status === 'suspicious' && <div className="text-red-400 font-bold">SUSPICIOUS</div>}
                                    </div>
                                    <button onClick={() => toggleAppBlock(app.id)} className={`px-3 py-1 text-xs rounded transition-colors ${app.status === 'blocked' ? 'bg-green-600/80 hover:bg-green-500' : 'bg-red-600/80 hover:bg-red-500'}`}>
                                        {app.status === 'blocked' ? 'Unblock' : 'Block'}
                                    </button>
                                </div>
                            )})}
                        </div>
                    </InfoCard>
                </div>

                <InfoCard title="Local Audit Log" icon={RadioIcon} className="lg:col-span-5 overflow-hidden min-h-[200px]">
                     <div className="flex-1 overflow-y-auto -m-2 p-2">
                        <div className="text-xs space-y-1">
                            {logs.map(log => {
                                const color = { info: 'text-sky-400', warning: 'text-yellow-400', critical: 'text-red-400', error: 'text-red-400' }[log.severity];
                                return (
                                <div key={log.id} className="p-1 rounded animate-fade-in">
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="flex-1">
                                            <span className="text-slate-500 mr-2">{log.timestamp}</span>
                                            <span className={`${color} font-semibold mr-2`}>[{log.severity.toUpperCase()}]</span>
                                            <span>{log.message}</span>
                                        </p>
                                        {(log.severity === 'warning' || log.severity === 'critical') && !log.analysis && (
                                            <button onClick={() => handleAnalyzeLog(log.id)} disabled={!!isAnalyzing} title="Analyze Log" className="p-1 text-amber-400 hover:text-amber-300 disabled:text-slate-600 disabled:cursor-wait">
                                                {isAnalyzing === log.id 
                                                    ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-400"></div>
                                                    : <SparkleIcon className="w-4 h-4"/>
                                                }
                                            </button>
                                        )}
                                    </div>
                                    {log.analysis && (
                                        <div className="mt-2 ml-2 pl-4 text-xs border-l-2 border-slate-700 space-y-1 py-1 animate-fade-in">
                                            <p><strong className="text-amber-300">Analysis:</strong> {log.analysis.analysis}</p>
                                            <p><strong className="text-amber-300">Action:</strong> {log.analysis.recommendedAction}</p>
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </InfoCard>
            </div>
        </div>
    );
};

export default CoreSentinel;