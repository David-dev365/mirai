
import type { FC } from 'react';
import { ArrowLeftIcon } from './icons';

interface DailyBriefingProps {
    onGoHome: () => void;
}

const DailyBriefing: FC<DailyBriefingProps> = ({ onGoHome }) => {
    return (
        <div className="flex-1 flex flex-col h-full bg-slate-900 p-4 sm:p-6 md:p-8 overflow-y-auto text-slate-200 animate-fade-in">
            <header className="flex justify-between items-center mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Daily Briefing</h1>
                <button 
                    onClick={onGoHome} 
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 text-slate-300 rounded-md hover:bg-slate-700/50 hover:border-slate-500 transition-colors"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                    Back to Hub
                </button>
            </header>
            <div className="flex-1 flex items-center justify-center text-center bg-black/30 backdrop-blur-sm rounded-xl border border-slate-800">
                <div>
                    <h2 className="text-4xl font-bold text-indigo-400">Coming Soon</h2>
                    <p className="text-slate-400 mt-2">This screen is under construction. You can add your content here.</p>
                </div>
            </div>
        </div>
    );
};

export default DailyBriefing;
