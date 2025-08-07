
import type { ModuleInfo, ModuleKey, ExoCoreInfo, ExoCoreKey } from './types';
import { 
    CoreFlowIcon, 
    CoreVerseIcon, 
    CoreTalkIcon, 
    CoreMindIcon, 
    CoreVaultIcon, 
    CoreZenIcon, 
    CoreRiftIcon,
    CoreNexusIcon,
    CoreSentinelIcon,
    CoreWatcherIcon,
    CoreOpsIcon,
    CoreDreamerIcon,
} from './components/icons';

export const MODULES: Record<ModuleKey, ModuleInfo> = {
  CoreFlow: {
    key: 'CoreFlow',
    name: 'CoreFlow',
    description: 'Productivity & life management.',
    Icon: CoreFlowIcon,
    color: '#6366f1', // indigo-500
  },
  CoreVerse: {
    key: 'CoreVerse',
    name: 'CoreVerse',
    description: 'Interactive AR/3D learning about the universe.',
    Icon: CoreVerseIcon,
    color: '#2dd4bf', // teal-400
  },
  CoreTalk: {
    key: 'CoreTalk',
    name: 'CoreTalk',
    description: 'Human-like voice and video conversation.',
    Icon: CoreTalkIcon,
    color: '#fb7185', // rose-400
  },
  CoreMind: {
    key: 'CoreMind',
    name: 'CoreMind',
    description: 'Deep thought partner for ideas & self-discovery.',
    Icon: CoreMindIcon,
    color: '#60a5fa', // blue-400
  },
  CoreVault: {
    key: 'CoreVault',
    name: 'CoreVault',
    description: 'Private, secure data + smart AI analysis.',
    Icon: CoreVaultIcon,
    color: '#facc15', // amber-400
  },
  CoreZen: {
    key: 'CoreZen',
    name: 'CoreZen',
    description: 'Mental wellness & ambient focus.',
    Icon: CoreZenIcon,
    color: '#10b981', // emerald-600
  },
  CoreRift: {
    key: 'CoreRift',
    name: 'CoreRift',
    description: 'Surreal, dreamlike exploration of thoughts.',
    Icon: CoreRiftIcon,
    color: '#c084fc', // purple-400
  },
};

export const EXO_CORES: Record<ExoCoreKey, ExoCoreInfo> = {
  CoreNexus: {
    key: 'CoreNexus',
    name: 'CoreNexus',
    description: 'Encrypted, invite-only rooms, drops, and boards for covert communication and collaboration.',
    Icon: CoreNexusIcon,
    color: '#4f46e5', // Indigo
  },
  CoreSentinel: {
    key: 'CoreSentinel',
    name: 'CoreSentinel',
    description: 'Your Guardian. A local shield that monitors your device for threats and can lock down or wipe data if compromised.',
    Icon: CoreSentinelIcon,
    color: '#38bdf8', // Sky Blue
  },
  CoreWatcher: {
    key: 'CoreWatcher',
    name: 'CoreWatcher',
    description: 'Your Receipts. A stealth witness that quietly captures real-world audio, video, or context as evidence when you need it.',
    Icon: CoreWatcherIcon,
    color: '#f59e0b', // Amber
  },
  CoreOps: {
    key: 'CoreOps',
    name: 'CoreOps',
    description: 'Your Command Spine. The master control panel to automate, chain, and manage all other Cores in the Mirai system.',
    Icon: CoreOpsIcon,
    color: '#ef4444', // Red
  },
  CoreDreamer: {
    key: 'CoreDreamer',
    name: 'CoreDreamer',
    description: 'Your Dream Engine. A surreal playground to record, visualize, and guide your unconscious mind into lucid quests.',
    Icon: CoreDreamerIcon,
    color: '#a855f7', // Purple
  },
};