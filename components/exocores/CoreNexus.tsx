


import { useState, FC, FormEvent, useEffect, useRef, useMemo } from 'react';
import type { NexusUser, NexusConversation, NexusRoom, NexusDirectChat, NexusMessage, ConnectionRequest } from '../../types';
import { ExoCoreHeader } from './common';
import { useMiraiSystem } from '../../contexts/MiraiSystemContext';
import { CoreNexusIcon, ShieldOffIcon, PlusIcon, SendIcon, UsersIcon, UserIcon, KeyIcon, FireIcon, XIcon, SettingsIcon } from '../icons';
import { db, isFirebaseConfigured } from '../../services/firebase';
import { 
    collection, query, where, onSnapshot, addDoc, doc, updateDoc,
    writeBatch, serverTimestamp, orderBy, getDocs, limit
} from 'firebase/firestore';


// --- UTILITIES ---
const encrypt = (text: string): string => `E2E_SIM_DATA::${btoa(text)}`;
const decrypt = (encrypted: string): string => {
    try {
        return atob(encrypted.replace('E2E_SIM_DATA::', ''));
    } catch {
        return "[DECRYPTION FAILED]";
    }
};

const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '';
    // Firestore Timestamps have a toDate() method
    if (timestamp.toDate) {
        return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Fallback for JS Dates or numbers
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return '';
};


// --- MODAL COMPONENTS ---
type ModalType = null | 'addContact' | 'requests' | 'profile' | 'createRoom';

const Modal: FC<{onClose: () => void, title: string, children: React.ReactNode}> = ({ onClose, title, children }) => (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center animate-fade-in" onClick={onClose}>
        <div className="bg-slate-900 border border-indigo-700/50 rounded-lg p-6 w-full max-w-md animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-indigo-300">{title}</h2><button onClick={onClose}><XIcon className="w-6 h-6 text-slate-400 hover:text-white"/></button></div>
            {children}
        </div>
    </div>
);

const AddContactModal: FC<{onClose: () => void, onConnect: (code: string) => Promise<string | null>}> = ({ onClose, onConnect }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        const result = await onConnect(code.trim());
        if (result) setError(result);
        else onClose();
    };
    return (
        <Modal onClose={onClose} title="Connect via Invite Code">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Enter user's invite code" value={code} onChange={e => setCode(e.target.value)} required className="w-full bg-slate-800 border-slate-700 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500"/>
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button type="submit" className="w-full mt-2 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-sm font-semibold">Connect</button>
            </form>
        </Modal>
    );
};

const RequestsModal: FC<{
    requests: ConnectionRequest[],
    users: NexusUser[],
    onAccept: (userId: string, reqId: string) => void,
    onDecline: (reqId: string) => void,
    onClose: () => void,
}> = ({ requests, users, onAccept, onDecline, onClose }) => {
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u.handle])), [users]);
    return (
        <Modal onClose={onClose} title="Connection Requests">
            <div className="space-y-2 max-h-80 overflow-y-auto">
                {requests.length > 0 ? requests.map(req => (
                    <div key={req.id} className="p-3 bg-slate-800 rounded-lg flex items-center justify-between">
                        <span><span className="font-bold text-indigo-300">{userMap.get(req.from) || 'Unknown User'}</span> wants to connect.</span>
                        <div className="flex gap-2">
                            <button onClick={() => onAccept(req.from, req.id)} className="p-2 bg-green-600 hover:bg-green-500 text-xs rounded">Accept</button>
                            <button onClick={() => onDecline(req.id)} className="p-2 bg-red-600 hover:bg-red-500 text-xs rounded">Decline</button>
                        </div>
                    </div>
                )) : <p className="text-slate-400 text-sm text-center py-4">No pending requests.</p>}
            </div>
        </Modal>
    );
};

const MyProfileModal: FC<{currentUser: NexusUser, onClose: () => void}> = ({currentUser, onClose}) => (
    <Modal onClose={onClose} title="My Profile">
        <div className="space-y-4 text-sm">
            <div><h4 className="font-semibold text-slate-400 mb-1">Your Handle</h4><p className="p-2 bg-slate-800 rounded-md">{currentUser.handle}</p></div>
            <div>
                <h4 className="font-semibold text-slate-400 mb-1">Your Invite Code</h4>
                 <div className="bg-slate-800 p-2 rounded-md flex justify-between items-center">
                    <span className="text-indigo-300 font-bold">{currentUser.inviteCode}</span>
                    <button onClick={() => navigator.clipboard.writeText(currentUser.inviteCode)} className="text-xs p-1 bg-slate-700 hover:bg-slate-600 rounded">Copy</button>
                </div>
                <p className="text-xs text-slate-500 mt-2">Share this code with someone to let them connect with you.</p>
            </div>
        </div>
    </Modal>
);

const CreateRoomModal: FC<{onClose: () => void, onCreate: (name: string) => void}> = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onCreate(name.trim());
        onClose();
    };
    return (
        <Modal onClose={onClose} title="Create Secret Room">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Room Name (e.g., #covert-ops)" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-800 border-slate-700 rounded-md p-2 text-sm focus:ring-1 focus:ring-indigo-500"/>
                <button type="submit" className="w-full mt-2 p-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-sm font-semibold">Create</button>
            </form>
        </Modal>
    );
};

// --- MAIN COMPONENT ---
const CoreNexus: FC<{ onBack: () => void }> = ({ onBack }) => {
    const { coreStatuses } = useMiraiSystem();
    const isEnabled = coreStatuses.CoreNexus.enabled;

    const [users, setUsers] = useState<NexusUser[]>([]);
    const [conversations, setConversations] = useState<NexusConversation[]>([]);
    const [messages, setMessages] = useState<Record<string, NexusMessage[]>>({});
    const [requests, setRequests] = useState<ConnectionRequest[]>([]);
    const [activeConversation, setActiveConversation] = useState<NexusConversation | null>(null);
    const [modal, setModal] = useState<ModalType>(null);
    const [messageInput, setMessageInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const currentUser = useMemo(() => users.find(u => u.id === 'user-self'), [users]);
    const firebaseReady = isFirebaseConfigured();

    // Data fetching and real-time listeners
    useEffect(() => {
        if (!firebaseReady) {
            setIsLoading(false);
            return;
        }

        // Fetch all users
        const usersUnsub = onSnapshot(collection(db, "nexus_users"), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as NexusUser));
            setUsers(usersData);
            setIsLoading(false);
        });

        return () => usersUnsub();
    }, [firebaseReady]);
    
    useEffect(() => {
        if (!firebaseReady || !currentUser) return;

        // Listen for conversations
        const convosQuery = query(collection(db, "nexus_conversations"), where("participants", "array-contains", currentUser.id));
        const convosUnsub = onSnapshot(convosQuery, (snapshot) => {
            const convosData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as NexusConversation));
            setConversations(convosData.sort((a,b) => (b.lastMessageTimestamp?.toMillis() || 0) - (a.lastMessageTimestamp?.toMillis() || 0)));
        });

        // Listen for connection requests
        const requestsQuery = query(collection(db, "nexus_requests"), where("to", "==", currentUser.id));
        const requestsUnsub = onSnapshot(requestsQuery, (snapshot) => {
            const requestsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ConnectionRequest));
            setRequests(requestsData);
        });

        return () => {
            convosUnsub();
            requestsUnsub();
        };
    }, [firebaseReady, currentUser]);

    // Listen for messages in the active conversation
    useEffect(() => {
        if (!firebaseReady || !activeConversation) return;

        const messagesQuery = query(collection(db, "nexus_conversations", activeConversation.id, "messages"), orderBy("timestamp", "asc"));
        const messagesUnsub = onSnapshot(messagesQuery, (snapshot) => {
            const messagesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as NexusMessage));
            setMessages(prev => ({ ...prev, [activeConversation.id]: messagesData }));
        });

        return () => messagesUnsub();
    }, [firebaseReady, activeConversation]);
    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, activeConversation]);


    // Handlers
    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !activeConversation || !currentUser) return;

        const encryptedContent = encrypt(messageInput.trim());
        setMessageInput('');

        await addDoc(collection(db, "nexus_conversations", activeConversation.id, "messages"), {
            conversationId: activeConversation.id,
            senderId: currentUser.id,
            encryptedContent,
            timestamp: serverTimestamp(),
            status: 'sent'
        });

        await updateDoc(doc(db, "nexus_conversations", activeConversation.id), {
            lastMessageTimestamp: serverTimestamp(),
            lastMessageContent: encryptedContent, // For display in convo list
        });
    };
    
    const handleConnect = async (code: string): Promise<string | null> => {
        if (!currentUser) return "User profile not loaded.";
        const targetUser = users.find(u => u.inviteCode === code);
        if (!targetUser) return "Invalid invite code.";
        if (targetUser.id === currentUser.id) return "You cannot connect with yourself.";

        // Check if a conversation already exists
        const existingConvo = conversations.find(c => c.type === 'direct' && c.participants.includes(targetUser.id));
        if (existingConvo) {
            setActiveConversation(existingConvo);
            return null; // Success, no error
        }

        const newConvo: Omit<NexusDirectChat, 'id'> = {
            type: 'direct',
            participants: [currentUser.id, targetUser.id],
            participantHandles: [currentUser.handle, targetUser.handle],
            lastMessageTimestamp: serverTimestamp() as any,
            unreadCount: 0,
        };
        await addDoc(collection(db, "nexus_conversations"), newConvo);
        return null;
    };
    
    const handleCreateRoom = async (name: string) => {
        if (!currentUser) return;
        const newRoom: Omit<NexusRoom, 'id'> = {
            type: 'room',
            name,
            participants: [currentUser.id],
            admins: [currentUser.id],
            lastMessageTimestamp: serverTimestamp() as any,
            unreadCount: 0,
            inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
        };
        await addDoc(collection(db, "nexus_conversations"), newRoom);
    };

    const handleAcceptRequest = async (fromUserId: string, reqId: string) => {
        if (!currentUser) return;
        const fromUser = users.find(u => u.id === fromUserId);
        if (!fromUser) return;
        
        const batch = writeBatch(db);
        // Delete request
        batch.delete(doc(db, "nexus_requests", reqId));
        // Create new conversation
        const newConvoRef = doc(collection(db, "nexus_conversations"));
        const newConvoData: Omit<NexusDirectChat, 'id'> = {
            type: 'direct',
            participants: [currentUser.id, fromUser.id],
            participantHandles: [currentUser.handle, fromUser.handle],
            lastMessageTimestamp: serverTimestamp() as any,
            unreadCount: 0,
        };
        batch.set(newConvoRef, newConvoData);
        await batch.commit();
    };
    
    const handleDeclineRequest = async (reqId: string) => {
        await updateDoc(doc(db, "nexus_requests", reqId), { status: 'declined' }); // Or deleteDoc
    };

    const handlePanicExit = () => {
        if (window.confirm("ARE YOU SURE? This will wipe all local data for this application from your browser.")) {
            localStorage.clear();
            window.location.reload();
        }
    };
    
    const ConversationItem: FC<{convo: NexusConversation}> = ({ convo }) => {
        const Icon = convo.type === 'direct' ? UserIcon : UsersIcon;
        const title = useMemo(() => {
            if (convo.type === 'room') {
                return convo.name;
            }
            if (!currentUser) {
                return 'Direct Message';
            }
            const otherHandle = convo.participantHandles.find(h => h !== currentUser.handle);
            return otherHandle || 'Direct Message';
        }, [convo, currentUser]);
        
        const lastMessageText = convo.lastMessageContent ? decrypt(convo.lastMessageContent) : '...';

        return (
            <button onClick={() => setActiveConversation(convo)} className={`w-full text-left p-3 rounded-md flex items-start gap-3 transition-colors ${activeConversation?.id === convo.id ? 'bg-indigo-500/30' : 'hover:bg-slate-800'}`}>
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-slate-700 ${convo.type === 'room' ? 'text-indigo-300' : 'text-slate-300'}`}><Icon className="w-5 h-5"/></div>
                <div className="flex-1 overflow-hidden">
                    <h3 className="font-semibold text-slate-200 truncate">{title}</h3>
                    <p className="text-xs text-slate-400 truncate">{lastMessageText}</p>
                </div>
            </button>
        );
    };

    // --- RENDER ---
    if (isLoading) {
        return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div></div>;
    }

    if (!currentUser && firebaseReady) {
        return <div className="flex-1 flex items-center justify-center text-center p-4">Could not load user profile 'user-self'.<br/>Please ensure this user exists in your 'nexus_users' Firestore collection.</div>;
    }
    
    return (
        <div className="relative flex-1 flex flex-col h-full bg-slate-900 p-4 sm:p-6 md:p-8 overflow-y-auto font-mono text-slate-200 animate-fade-in">
            {!isEnabled && (
                <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-center p-4">
                    <ShieldOffIcon className="w-16 h-16 text-red-500"/>
                    <h2 className="text-2xl font-bold text-red-400">Core Offline</h2>
                    <p className="text-slate-400">This Exo-Core has been disabled via CoreOps.</p>
                </div>
            )}
            
            {modal === 'addContact' && <AddContactModal onClose={() => setModal(null)} onConnect={handleConnect} />}
            {modal === 'requests' && currentUser && <RequestsModal onClose={() => setModal(null)} requests={requests} users={users} onAccept={handleAcceptRequest} onDecline={handleDeclineRequest} />}
            {modal === 'profile' && currentUser && <MyProfileModal onClose={() => setModal(null)} currentUser={currentUser}/>}
            {modal === 'createRoom' && <CreateRoomModal onClose={() => setModal(null)} onCreate={handleCreateRoom} />}
            
            <ExoCoreHeader coreKey="CoreNexus" onBack={onBack} />
            
            {!firebaseReady && (
                 <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-300 text-xs text-center p-2 rounded-md mb-4">
                    Firebase not configured. Running in offline mode. Real-time features are disabled.
                </div>
            )}

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
                {/* Sidebar */}
                <div className="lg:col-span-4 flex flex-col bg-black/30 backdrop-blur-sm rounded-xl p-4 border border-indigo-800/50 overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-indigo-300">Conversations</h2>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setModal('addContact')} title="Add Contact" className="p-2 text-slate-400 hover:text-white"><PlusIcon className="w-5 h-5"/></button>
                            <button onClick={() => setModal('createRoom')} title="Create Room" className="p-2 text-slate-400 hover:text-white"><UsersIcon className="w-5 h-5"/></button>
                             <button onClick={() => setModal('requests')} title="Requests" className="relative p-2 text-slate-400 hover:text-white">
                                <KeyIcon className="w-5 h-5"/>
                                {requests.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
                             </button>
                        </div>
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto -mr-2 pr-2">
                       {conversations.map(convo => <ConversationItem key={convo.id} convo={convo}/>)}
                    </div>
                     <div className="mt-4 pt-4 border-t border-indigo-900/50 flex justify-between items-center">
                        <button onClick={() => setModal('profile')} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white">
                            <CoreNexusIcon className="w-5 h-5"/> My Profile
                        </button>
                        <button onClick={handlePanicExit} title="Panic Exit" className="p-2 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-full"><ShieldOffIcon className="w-5 h-5"/></button>
                    </div>
                </div>

                {/* Main Chat Window */}
                <div className="lg:col-span-8 flex flex-col bg-black/30 backdrop-blur-md rounded-xl border border-indigo-800/50 overflow-hidden">
                    {activeConversation && currentUser ? (
                        <>
                            <div className="p-3 border-b border-indigo-800/50 flex items-center justify-between">
                                <h3 className="font-bold text-lg text-slate-200">{activeConversation.type === 'room' ? (activeConversation as NexusRoom).name : (activeConversation as NexusDirectChat).participantHandles.find(h => h !== currentUser.handle)}</h3>
                                <button><SettingsIcon className="w-5 h-5 text-slate-500 hover:text-white"/></button>
                            </div>
                             <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                                {(messages[activeConversation.id] || []).map(msg => {
                                    const isSelf = msg.senderId === currentUser.id;
                                    const senderHandle = users.find(u => u.id === msg.senderId)?.handle || 'Unknown';
                                    return (
                                        <div key={msg.id} className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-md lg:max-w-lg px-4 py-2 rounded-xl ${isSelf ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none'}`}>
                                                {!isSelf && activeConversation.type === 'room' && <p className="text-xs font-bold text-indigo-300 mb-1">{senderHandle}</p>}
                                                <p className="text-sm md:text-base">{decrypt(msg.encryptedContent)}</p>
                                                <p className="text-xs opacity-60 text-right mt-1">{formatTimestamp(msg.timestamp)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={chatEndRef}></div>
                            </div>
                            <div className="p-4 border-t border-indigo-800/50 bg-slate-900/50">
                                <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                                    <input type="text" value={messageInput} onChange={e => setMessageInput(e.target.value)} placeholder="Send an encrypted message..." className="flex-1 bg-slate-800 border border-slate-700 rounded-full px-5 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                                    <button type="submit" className="w-11 h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center flex-shrink-0"><SendIcon className="w-5 h-5"/></button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <CoreNexusIcon className="w-16 h-16 text-slate-700 mb-4"/>
                            <h2 className="text-2xl font-bold text-slate-400">Welcome to the Nexus</h2>
                            <p className="text-slate-500 mt-2">Select a conversation or connect with a new contact.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CoreNexus;