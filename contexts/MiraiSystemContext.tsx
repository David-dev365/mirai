

import { createContext, useState, useEffect, useContext, FC, ReactNode, useCallback } from 'react';
import type { OpsChain, ExoCoreKey, AllCoreConfigs, SystemLog, OpsTrigger, OpsAction, OperationalStates } from '../types';
import { EXO_CORES } from '../constants';

// Initial data and keys
const CORE_STATUSES_KEY = 'coreops-statuses';
const AUTOMATION_CHAINS_KEY = 'coreops-chains';
const CORE_CONFIGS_KEY = 'coreops-configs';
const SYSTEM_LOGS_KEY = 'coreops-logs';
const OPERATIONAL_STATES_KEY = 'coreops-operational-states';

const initialStatuses = Object.fromEntries(
    Object.values(EXO_CORES).map(core => [core.key, { enabled: true, isolated: false }])
) as Record<ExoCoreKey, { enabled: boolean, isolated: boolean }>;


const initialChains: OpsChain[] = [
    {
        id: 'chain-1', name: 'Auto-Record on Threat',
        description: 'If Sentinel detects a threat, trigger Watcher to record.',
        trigger: { entity: 'CoreSentinel', event: 'Intrusion Detected' },
        actions: [{ entity: 'CoreWatcher', action: 'Start Ambient Recording', params: 'audio_only' }],
        enabled: true,
    },
];

const initialConfigs: AllCoreConfigs = {
    CoreSentinel: { scanFrequency: 5 },
    CoreWatcher: { recordingQuality: 128 },
    CoreDreamer: { surrealismFactor: 75 },
    CoreNexus: { stealthMode: false },
    CoreOps: {},
};

const initialLogs: SystemLog[] = [{ id: 'log-init', timestamp: new Date().toISOString(), source: 'System', message: 'Mirai System Context Initialized.', type: 'success' }];

const initialOperationalStates: OperationalStates = {
    CoreWatcher: { isRecording: false },
};

// Helper
const safeJsonParse = <T,>(key: string, fallback: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch { return fallback; }
};


// Context Type
interface MiraiSystemContextType {
    coreStatuses: Record<ExoCoreKey, { enabled: boolean; isolated: boolean }>;
    setCoreStatuses: React.Dispatch<React.SetStateAction<Record<ExoCoreKey, { enabled: boolean; isolated: boolean }>>>;
    automationChains: OpsChain[];
    setChains: React.Dispatch<React.SetStateAction<OpsChain[]>>;
    coreConfigs: AllCoreConfigs;
    setCoreConfigs: React.Dispatch<React.SetStateAction<AllCoreConfigs>>;
    systemLogs: SystemLog[];
    addLog: (source: ExoCoreKey | 'System', message: string, type: SystemLog['type']) => void;
    operationalStates: OperationalStates;
    setOperationalStates: React.Dispatch<React.SetStateAction<OperationalStates>>;
    processTriggers: (trigger: OpsTrigger) => void;
}

const MiraiSystemContext = createContext<MiraiSystemContextType | undefined>(undefined);

// Provider Component
export const MiraiSystemProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [coreStatuses, setCoreStatuses] = useState(() => safeJsonParse(CORE_STATUSES_KEY, initialStatuses));
    const [automationChains, setChains] = useState<OpsChain[]>(() => safeJsonParse(AUTOMATION_CHAINS_KEY, initialChains));
    const [coreConfigs, setCoreConfigs] = useState<AllCoreConfigs>(() => safeJsonParse(CORE_CONFIGS_KEY, initialConfigs));
    const [systemLogs, setSystemLogs] = useState<SystemLog[]>(() => safeJsonParse(SYSTEM_LOGS_KEY, initialLogs));
    const [operationalStates, setOperationalStates] = useState<OperationalStates>(() => safeJsonParse(OPERATIONAL_STATES_KEY, initialOperationalStates));


    useEffect(() => { localStorage.setItem(CORE_STATUSES_KEY, JSON.stringify(coreStatuses)); }, [coreStatuses]);
    useEffect(() => { localStorage.setItem(AUTOMATION_CHAINS_KEY, JSON.stringify(automationChains)); }, [automationChains]);
    useEffect(() => { localStorage.setItem(CORE_CONFIGS_KEY, JSON.stringify(coreConfigs)); }, [coreConfigs]);
    useEffect(() => { localStorage.setItem(SYSTEM_LOGS_KEY, JSON.stringify(systemLogs)); }, [systemLogs]);
    useEffect(() => { localStorage.setItem(OPERATIONAL_STATES_KEY, JSON.stringify(operationalStates)); }, [operationalStates]);

    const addLog = useCallback((source: ExoCoreKey | 'System', message: string, type: SystemLog['type']) => {
        const newLog: SystemLog = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), source, message, type };
        setSystemLogs(prev => [newLog, ...prev.slice(0, 199)]);
    }, []);

    const processTriggers = useCallback((trigger: OpsTrigger) => {
        const matchedChains = automationChains.filter(
            chain => chain.enabled &&
                     chain.trigger.entity === trigger.entity &&
                     chain.trigger.event === trigger.event
        );
    
        if (matchedChains.length === 0) return;
    
        const executeAction = (action: OpsAction) => {
            addLog('CoreOps', `Executing action: ${action.action} on ${action.entity}`, 'info');
            
            switch(action.entity) {
                case 'CoreWatcher':
                    switch(action.action) {
                        case 'Start Ambient Recording':
                            setOperationalStates(prev => ({
                                ...prev,
                                CoreWatcher: { ...prev.CoreWatcher, isRecording: true }
                            }));
                            break;
                    }
                    break;
            }
        };
        
        for (const chain of matchedChains) {
            addLog('CoreOps', `Automation triggered: "${chain.name}"`, 'success');
            for (const action of chain.actions) {
                executeAction(action);
            }
        }
    
    }, [automationChains, addLog, setOperationalStates]);

    const value = {
        coreStatuses,
        setCoreStatuses,
        automationChains,
        setChains,
        coreConfigs,
        setCoreConfigs,
        systemLogs,
        addLog,
        operationalStates,
        setOperationalStates,
        processTriggers
    };

    return (
        <MiraiSystemContext.Provider value={value}>
            {children}
        </MiraiSystemContext.Provider>
    );
};

// Custom Hook
export const useMiraiSystem = (): MiraiSystemContextType => {
    const context = useContext(MiraiSystemContext);
    if (context === undefined) {
        throw new Error('useMiraiSystem must be used within a MiraiSystemProvider');
    }
    return context;
};