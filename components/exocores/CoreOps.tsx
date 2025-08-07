

import { useState, FC, FormEvent } from 'react';
import type { ExoCoreKey, OpsChain } from '../../types';
import { ExoCoreHeader } from './common';
import { GitBranchIcon, PlusIcon, TrashIcon, ArrowRightIcon, SettingsIcon, ActivityIcon, TerminalIcon, ShieldOffIcon, SaveIcon, UploadIcon, PowerIcon, SparkleIcon } from '../icons';
import { EXO_CORES } from '../../constants';
import { useMiraiSystem } from '../../contexts/MiraiSystemContext';
import { suggestOpsChain } from '../../services/geminiService';

const otherCores = Object.values(EXO_CORES).filter(c => c.key !== 'CoreOps');

const CORE_CONFIG_DEFS: Record<string, { label: string, type: 'slider' | 'toggle', min?: number, max?: number, step?: number }> = {
    'CoreSentinel.scanFrequency': { label: 'Scan Frequency (mins)', type: 'slider', min: 1, max: 60, step: 1 },
    'CoreWatcher.recordingQuality': { label: 'Recording Quality', type: 'slider', min: 64, max: 256, step: 32 },
    'CoreDreamer.surrealismFactor': { label: 'Surrealism Factor', type: 'slider', min: 0, max: 100, step: 5 },
    'CoreNexus.stealthMode': { label: 'Nexus Stealth Mode', type: 'toggle' },
};

const AUTOMATION_TRIGGERS: Record<ExoCoreKey, string[]> = {
    CoreSentinel: ['Intrusion Detected', 'Malicious App Blocked', 'Panic Switch Activated'],
    CoreWatcher: ['Recording Started', 'Recording Flagged Urgent', 'Storage Full'],
    CoreDreamer: ['Lucid Dream Initiated', 'Nightmare Detected'],
    CoreNexus: ['New Message in #urgent', 'Connection Request Received'],
    CoreOps: [],
};

const AUTOMATION_ACTIONS: Record<ExoCoreKey, string[]> = {
    CoreSentinel: ['Initiate Full Scan', 'Block App By Name', 'Enable Global Shield'],
    CoreWatcher: ['Start Ambient Recording', 'Wipe All Recordings'],
    CoreDreamer: ['Induce Calming Dream', 'Log Dream Fragment'],
    CoreNexus: ['Drop Message to Room', 'Disconnect All Users'],
    CoreOps: ['Enable/Disable Core', 'Isolate Core'],
};

const InfoPanel: FC<{ title: string; icon: FC<any>; children: React.ReactNode; className?: string }> = ({ title, icon: Icon, children, className }) => (
    <div className={`bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-red-800/50 flex flex-col ${className}`}>
        <h3 className="text-lg font-semibold text-red-300 mb-4 flex items-center gap-2">
            <Icon className="w-5 h-5" /> {title}
        </h3>
        {children}
    </div>
);

const CoreOps: FC<{ onBack: () => void }> = ({ onBack }) => {
    const {
        coreStatuses,
        setCoreStatuses,
        automationChains,
        setChains,
        coreConfigs,
        setCoreConfigs,
        systemLogs,
        addLog,
    } = useMiraiSystem();
    
    const [activeTab, setActiveTab] = useState<'automations' | 'configurations' | 'logs'>('automations');
    const [selectedCoreForConfig, setSelectedCoreForConfig] = useState<ExoCoreKey>('CoreSentinel');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isSuggesting, setIsSuggesting] = useState(false);


    const toggleCoreStatus = (coreKey: ExoCoreKey, field: 'enabled' | 'isolated') => {
        setCoreStatuses(prev => {
            const newState = { ...prev, [coreKey]: { ...prev[coreKey], [field]: !prev[coreKey][field] } };
            const statusText = newState[coreKey][field] ? 'ENABLED' : 'DISABLED';
            const actionText = field === 'enabled' ? `Power` : `Isolation mode`;
            addLog(coreKey, `${actionText} ${statusText}.`, 'info');
            return newState;
        });
    };
    
    const handleCreateChain = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newChain: OpsChain = {
            id: `chain-${Date.now()}`,
            name: formData.get('name') as string,
            description: 'User-created automation.',
            trigger: { entity: formData.get('triggerEntity') as ExoCoreKey, event: formData.get('triggerEvent') as string },
            actions: [{ entity: formData.get('actionEntity') as ExoCoreKey, action: formData.get('action') as string, params: formData.get('params') as string }],
            enabled: true,
        };
        setChains(prev => [newChain, ...prev]);
        addLog('System', `New automation created: "${newChain.name}".`, 'success');
        e.currentTarget.reset();
    };

    const handleSuggestChain = async (e: FormEvent) => {
        e.preventDefault();
        if (!aiPrompt.trim() || isSuggesting) return;

        setIsSuggesting(true);
        addLog('System', `Requesting AI suggestion for: "${aiPrompt}"`, 'info');
        try {
            const result = await suggestOpsChain(aiPrompt);
            if (result && result.name && result.trigger?.entity && result.actions?.length > 0) {
                const newChain: OpsChain = {
                    id: `chain-${Date.now()}`,
                    description: `AI-generated: ${aiPrompt}`,
                    name: result.name,
                    trigger: result.trigger,
                    actions: result.actions,
                    enabled: true,
                };
                setChains(prev => [newChain, ...prev]);
                addLog('System', `AI automation created: "${newChain.name}".`, 'success');
                setAiPrompt('');
            } else {
                addLog('System', 'AI suggestion failed to produce a valid chain.', 'error');
            }
        } catch (error) {
            console.error("Error suggesting chain:", error);
            addLog('System', 'Error communicating with AI for chain suggestion.', 'error');
        } finally {
            setIsSuggesting(false);
        }
    };
    
    const deleteChain = (id: string) => {
        const chainToDelete = automationChains.find(c => c.id === id);
        if (chainToDelete) {
             addLog('System', `Automation deleted: "${chainToDelete.name}".`, 'warn');
             setChains(c => c.filter(chain => chain.id !== id));
        }
    };

    const handleConfigChange = (coreKey: ExoCoreKey, setting: string, value: string | number | boolean) => {
        setCoreConfigs(prev => ({
            ...prev,
            [coreKey]: { ...prev[coreKey], [setting]: value }
        }));
    };

    const AutomationEditor = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 h-full overflow-y-auto">
            <div className="space-y-6">
                <div>
                    <h4 className="font-bold text-lg mb-2 text-red-300">Create with AI</h4>
                    <p className="text-xs text-slate-400 mb-2">Describe the automation in plain language.</p>
                    <form onSubmit={handleSuggestChain}>
                        <input 
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="e.g., When a threat is found, lock the camera" 
                            className="w-full bg-slate-800 border-slate-700 rounded p-2 text-sm"
                        />
                        <button type="submit" disabled={isSuggesting || !aiPrompt.trim()} className="w-full mt-2 p-2 bg-purple-600 hover:bg-purple-500 rounded font-semibold flex items-center justify-center gap-2 disabled:bg-slate-700">
                            {isSuggesting ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <SparkleIcon className="w-5 h-5"/>
                            )}
                            {isSuggesting ? 'Generating...' : 'Suggest Chain'}
                        </button>
                    </form>
                </div>
                <div>
                    <h4 className="font-bold text-lg mb-2 text-red-300">Create New Chain Manually</h4>
                    <form onSubmit={handleCreateChain} className="space-y-3 text-sm">
                        <input name="name" required placeholder="Chain Name (e.g., Lockdown Protocol)" className="w-full bg-slate-800 border-slate-700 rounded p-2 focus:ring-1 focus:ring-red-500" />
                        <p className="font-semibold text-slate-400">IF...</p>
                        <select name="triggerEntity" required className="w-full bg-slate-800 border-slate-700 rounded p-2"><option value="">Select Trigger Core</option>{otherCores.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}</select>
                        <select name="triggerEvent" required className="w-full bg-slate-800 border-slate-700 rounded p-2"><option value="">Select Trigger Event</option>{Object.values(AUTOMATION_TRIGGERS).flat().map(e => <option key={e} value={e}>{e}</option>)}</select>
                        <p className="font-semibold text-slate-400">THEN...</p>
                        <select name="actionEntity" required className="w-full bg-slate-800 border-slate-700 rounded p-2"><option value="">Select Action Core</option>{otherCores.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}</select>
                        <select name="action" required className="w-full bg-slate-800 border-slate-700 rounded p-2"><option value="">Select Action</option>{Object.values(AUTOMATION_ACTIONS).flat().map(a => <option key={a} value={a}>{a}</option>)}</select>
                        <input name="params" placeholder="Parameters (optional)" className="w-full bg-slate-800 border-slate-700 rounded p-2"/>
                        <button type="submit" className="w-full p-2 bg-red-600 hover:bg-red-500 rounded font-semibold flex items-center justify-center gap-2"><PlusIcon className="w-5 h-5"/> Create Chain</button>
                    </form>
                </div>
            </div>
            <div className="overflow-y-auto">
                <h4 className="font-bold text-lg mb-2 text-red-300">Active Chains</h4>
                <div className="space-y-2">
                    {automationChains.map(chain => (
                        <div key={chain.id} className="bg-slate-800/60 p-3 rounded-lg text-sm">
                            <div className="flex justify-between items-center"><h5 className="font-bold text-slate-200">{chain.name}</h5><button onClick={() => deleteChain(chain.id)} className="p-1 text-slate-500 hover:text-red-400"><TrashIcon className="w-4 h-4"/></button></div>
                            <div className="flex items-center gap-2 mt-1 text-slate-400"><span className="font-semibold text-red-400">{chain.trigger.entity}</span><ArrowRightIcon className="w-4 h-4"/><span className="font-semibold text-red-400">{chain.actions[0].entity}</span></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
    
    const ConfigEditor = () => (
         <div className="p-4 h-full overflow-y-auto space-y-4">
             <h4 className="font-bold text-lg text-red-300">Configure: {selectedCoreForConfig}</h4>
            {Object.entries(CORE_CONFIG_DEFS).filter(([key]) => key.startsWith(selectedCoreForConfig)).map(([key, def]) => {
                const settingKey = key.split('.')[1];
                const value = coreConfigs[selectedCoreForConfig]?.[settingKey];
                return (
                    <div key={key} className="text-sm">
                        <label className="text-slate-300">{def.label}</label>
                        {def.type === 'slider' && <div className="flex items-center gap-2"><input type="range" min={def.min} max={def.max} step={def.step} value={Number(value)} onChange={e => handleConfigChange(selectedCoreForConfig, settingKey, Number(e.target.value))} className="w-full" /><span className="font-bold w-12 text-center">{value}</span></div>}
                        {def.type === 'toggle' && <button onClick={() => handleConfigChange(selectedCoreForConfig, settingKey, !value)} className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors ${value ? 'bg-red-500 justify-end' : 'bg-slate-700 justify-start'}`}><div className="w-4 h-4 bg-white rounded-full"/></button>}
                    </div>
                );
            })}
        </div>
    );
    
    const LogViewer = () => (
         <div className="p-4 h-full overflow-y-auto text-xs font-mono">
            {systemLogs.map(log => {
                const color = { info: 'text-sky-400', success: 'text-green-400', warn: 'text-yellow-400', error: 'text-red-400' }[log.type];
                return (
                    <div key={log.id} className="whitespace-pre-wrap"><span className="text-slate-500 mr-2">{new Date(log.timestamp).toLocaleTimeString()}</span><span className={`font-bold mr-2 ${color}`}>[{log.source}]</span><span>{log.message}</span></div>
                )
            })}
         </div>
    );

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-900 p-4 sm:p-6 md:p-8 overflow-y-auto font-mono text-slate-200 animate-fade-in">
            <ExoCoreHeader coreKey="CoreOps" onBack={onBack} />
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
                <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 -mr-2">
                    <InfoPanel title="Master Control" icon={PowerIcon} className="flex-1">
                        <div className="space-y-2 overflow-y-auto -m-2 p-2">
                           {otherCores.map(core => {
                               const status = coreStatuses[core.key];
                               const statusText = !status?.enabled ? 'Offline' : status.isolated ? 'Isolated' : 'Online';
                               const statusColor = !status?.enabled ? 'bg-slate-500' : status.isolated ? 'bg-yellow-500' : 'bg-green-500';
                               return(
                                <div key={core.key} className="bg-slate-800/60 p-3 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <core.Icon className="w-6 h-6 flex-shrink-0" style={{color: core.color}}/>
                                        <div className="flex-1"><h4 className="font-bold text-slate-200">{core.name}</h4><div className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${statusColor}`}/><span className="text-xs text-slate-400">{statusText}</span></div></div>
                                        <button onClick={() => { setActiveTab('configurations'); setSelectedCoreForConfig(core.key);}} title="Configure" className="p-1 text-slate-400 hover:text-white"><SettingsIcon className="w-4 h-4"/></button>
                                    </div>
                                    <div className="flex gap-2 mt-2 text-xs">
                                        <button onClick={() => toggleCoreStatus(core.key, 'enabled')} className={`flex-1 p-1 rounded ${status?.enabled ? 'bg-green-500/20 text-green-300' : 'bg-slate-700 text-slate-400'}`}>Power</button>
                                        <button onClick={() => toggleCoreStatus(core.key, 'isolated')} className={`flex-1 p-1 rounded ${status?.isolated ? 'bg-yellow-500/20 text-yellow-300' : 'bg-slate-700 text-slate-400'}`}>Isolate</button>
                                    </div>
                                </div>
                           )})}
                        </div>
                    </InfoPanel>
                     <InfoPanel title="System Actions" icon={ActivityIcon}>
                         <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
                            <button className="p-2 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center gap-2"><SaveIcon className="w-4 h-4"/> Backup</button>
                            <button className="p-2 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center gap-2"><UploadIcon className="w-4 h-4"/> Restore</button>
                             <button className="col-span-2 p-2 bg-red-800/80 hover:bg-red-700/80 rounded flex items-center justify-center gap-2 text-red-300"><ShieldOffIcon className="w-4 h-4"/> Global Wipe</button>
                         </div>
                    </InfoPanel>
                </div>
                <div className="lg:col-span-7 xl:col-span-8 flex flex-col bg-black/30 backdrop-blur-sm rounded-xl border border-red-800/50 overflow-hidden">
                    <div className="flex border-b border-red-800/50 text-sm font-semibold">
                        <button onClick={()=>setActiveTab('automations')} className={`flex-1 p-3 transition-colors ${activeTab === 'automations' ? 'bg-red-500/20 text-red-300' : 'text-slate-400 hover:bg-slate-800'}`}><GitBranchIcon className="w-4 h-4 inline-block mr-2"/>Automations</button>
                        <button onClick={()=>setActiveTab('configurations')} className={`flex-1 p-3 transition-colors ${activeTab === 'configurations' ? 'bg-red-500/20 text-red-300' : 'text-slate-400 hover:bg-slate-800'}`}><SettingsIcon className="w-4 h-4 inline-block mr-2"/>Configuration</button>
                        <button onClick={()=>setActiveTab('logs')} className={`flex-1 p-3 transition-colors ${activeTab === 'logs' ? 'bg-red-500/20 text-red-300' : 'text-slate-400 hover:bg-slate-800'}`}><TerminalIcon className="w-4 h-4 inline-block mr-2"/>Logs</button>
                    </div>
                    {activeTab === 'automations' && <AutomationEditor/>}
                    {activeTab === 'configurations' && <ConfigEditor/>}
                    {activeTab === 'logs' && <LogViewer/>}
                </div>
            </div>
        </div>
    );
}

export default CoreOps;