import type { FC } from 'react';
import type { ExoCoreKey } from '../../types';
import { EXO_CORES } from '../../constants';
import { ArrowLeftIcon } from '../icons';

interface ExoCoreHeaderProps {
    coreKey: ExoCoreKey;
    onBack: () => void;
}

export const ExoCoreHeader: FC<ExoCoreHeaderProps> = ({ coreKey, onBack }) => {
    const coreInfo = EXO_CORES[coreKey];
    // Take the first sentence of the description for the subtitle.
    const subtitle = coreInfo.description.split('.')[0] + '.';

    return (
        <header className="w-full flex justify-between items-center mb-6 sm:mb-8 z-10">
            <div className="flex items-center gap-4 overflow-hidden">
                <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" 
                    style={{ backgroundColor: `${coreInfo.color}20` }}
                >
                    <coreInfo.Icon className="w-7 h-7" style={{ color: coreInfo.color }} />
                </div>
                <div className="overflow-hidden">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-wider truncate" style={{ color: coreInfo.color }}>
                        {coreInfo.name}
                    </h1>
                    <p className="text-sm text-slate-400 font-mono truncate">{subtitle}</p>
                </div>
            </div>
            <button 
                onClick={onBack} 
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 text-slate-300 rounded-md hover:bg-slate-700/50 hover:border-slate-500 transition-colors flex-shrink-0"
            >
                <ArrowLeftIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Exo-Cores</span>
            </button>
        </header>
    );
};

// A reusable card component for consistent styling within core UIs
export const InfoCard: FC<{
    title: string,
    icon: FC<any>,
    children: React.ReactNode,
    className?: string,
}> = ({ title, icon: Icon, children, className = '' }) => (
    <div className={`bg-black/30 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-800 flex flex-col ${className}`}>
        <h3 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Icon className="w-5 h-5 text-slate-400" />
            {title}
        </h3>
        {children}
    </div>
);