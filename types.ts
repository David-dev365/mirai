import type { FC, SVGProps } from 'react';

export type ModuleKey = 'CoreFlow' | 'CoreVerse' | 'CoreTalk' | 'CoreMind' | 'CoreVault' | 'CoreZen' | 'CoreRift';

export interface ModuleInfo {
  key: ModuleKey;
  name: string;
  description: string;
  Icon: FC<SVGProps<SVGSVGElement>>;
  color: string;
}

export type ExoCoreKey = 'CoreNexus' | 'CoreSentinel' | 'CoreWatcher' | 'CoreOps' | 'CoreDreamer';

export interface ExoCoreInfo {
  key: ExoCoreKey;
  name:string;
  description: string;
  Icon: FC<SVGProps<SVGSVGElement>>;
  color: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
}

export interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: string;
}

export interface ZenLog {
    mood: string | null;
    journal: string;
    habits: Record<string, boolean>;
}

export interface ZenPrompt {
    id:string;
    prompt: string;
}

export interface VaultItem {
    id: string;
    type: 'note' | 'file';
    title: string;
    // For notes, this is the body. For files, this can hold AI-extracted text (e.g., from images).
    content: string; 
    // For files
    fileName?: string;
    fileData?: string; // base64 encoded
    fileMimeType?: string;
    
    createdAt: string;
    tags: string[];
}

export interface RiftNode {
    id: string; // Unique ID for the node
    label: string; // Short title
    content: string; // Full content for display
    sourceModule: ModuleKey | 'mood' | 'thought' | 'dream' | 'crafted';
    sourceId: string; // ID from the original item
    position: { x: number; y: number; z: number; vx: number; vy: number };
    state: 'active' | 'fading' | 'anchored' | 'sprouting' | 'decaying';
    // Visual properties
    color: string;
    shape: 'sphere' | 'box' | 'icosahedron' | 'crystal' | 'plant' | 'door';
    scale: number;
    createdAt: number; // Timestamp for lifecycle management
}

export interface CelestialObjectData {
    name: string;
    type: string;
    facts: {
        distanceFromSun: string;
        diameter: string;
        dayLength: string;
        knownMoons: string;
    };
    narratorScript: string;
    visualization: {
        color: string;
        secondaryColor: string;
    };
}

export interface SpaceEvent {
    title: string;
    date: string;
    description: string;
}

// --- CoreMind Specific Types ---

export interface MindMapNode {
    id: string;
    label: string;
    level: number;
    x: number; // Position is now mandatory
    y: number; // Position is now mandatory
    vx: number; // Velocity for physics simulation
    vy: number; // Velocity y for physics simulation
}

export interface MindMapEdge {
    from: string;
    to: string;
}

export interface MindMapData {
    nodes: MindMapNode[];
    edges: MindMapEdge[];
}

export interface CoachMessage {
    id: string;
    text: string;
    sender: 'user' | 'ai';
}

export interface ToneAnalysis {
    sentiment: string;
    keywords: string[];
    summary: string;
}

export interface StructuredAnalysis {
    themes: {
        theme: string;
        description: string;
    }[];
    actionItems: string[];
    reflectionQuestions: string[];
}

// --- Exo-Cores Specific Types ---

// CoreNexus (New Chat-focused Models)
export interface NexusUser {
    id: string; // e.g., 'user-1'
    handle: string; // e.g., 'Ghost_7'
    inviteCode: string; // A unique code for others to connect
}

interface NexusConversationBase {
    id: string; // e.g., 'dm-1' or 'room-1'
    type: 'direct' | 'room';
    lastMessageTimestamp: any;
    unreadCount: number;
    lastMessageContent?: string;
}

export interface NexusDirectChat extends NexusConversationBase {
    type: 'direct';
    participants: [string, string]; // Array of two user IDs
    participantHandles: [string, string];
}

export interface NexusRoom extends NexusConversationBase {
    type: 'room';
    name: string;
    participants: string[]; // Array of user IDs
    admins: string[]; // Array of user IDs who are admins
    inviteCode: string;
}

export type NexusConversation = NexusDirectChat | NexusRoom;

export interface NexusMessage {
    id: string;
    conversationId: string;
    senderId: string;
    encryptedContent: string; // Will store base64 encoded plain text for simulation
    timestamp: any;
    burnOnRead: boolean;
    expiresAt?: number; // Timestamp for self-destruct
    status: 'sent' | 'delivered' | 'read';
}

export interface ConnectionRequest {
    id: string;
    from: string; // user ID
    to: string; // user ID
}


// CoreSentinel
export type SensorType = 'camera' | 'microphone' | 'location';
export type AppStatus = 'safe' | 'suspicious' | 'blocked';

export interface ThreatAnalysis {
    analysis: string;
    recommendedAction: string;
}

export interface ThreatLog {
    id: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'critical' | 'error';
    message: string;
    analysis?: ThreatAnalysis;
}

export interface MonitoredApp {
  id: string;
  name: string;
  category: string;
  using: SensorType | null;
  status: AppStatus;
  networkActivity: 'idle' | 'active';
}


// CoreWatcher
export interface WatcherRecording {
    id: string;
    timestamp: string;
    type: 'audio' | 'video-snippet';
    duration: string;
    title: string;
    transcript: string;
    keywords: string[];
    summary: string;
    audioBase64?: string;
    audioMimeType?: string;
}

// CoreOps
export type OpsEntity = ExoCoreKey | 'User' | 'External' | 'System';
export interface OpsTrigger {
    entity: OpsEntity;
    event: string;
}
export interface OpsAction {
    entity: OpsEntity;
    action: string;
    params?: string;
}
export interface OpsChain {
    id: string;
    name: string;
    description: string;
    trigger: OpsTrigger;
    actions: OpsAction[];
    enabled: boolean;
}
export type CoreConfigValue = string | number | boolean;
export type CoreConfig = Record<string, CoreConfigValue>;
export type AllCoreConfigs = Record<ExoCoreKey, CoreConfig>;
export interface SystemLog {
    id: string;
    timestamp: string;
    source: OpsEntity;
    message: string;
    type: 'info' | 'warn' | 'error' | 'success';
}
export interface OperationalStates {
    CoreWatcher: {
        isRecording: boolean;
    };
    // Future states for other cores can be added here
}


// CoreDreamer
export interface DreamSymbol {
    symbol: string;
    meaning: string;
    context: string;
}
export interface DreamEntry {
    id: string;
    date: string;
    title: string;
    content: string;
    mood: 'positive' | 'negative' | 'neutral' | 'surreal';
    symbols?: DreamSymbol[];
    summary?: string;
    lucidScript?: string;
}