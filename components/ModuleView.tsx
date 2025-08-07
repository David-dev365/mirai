

import { useCallback } from 'react';
import type { FC } from 'react';
import { MODULES } from '../constants';
import type { ModuleKey } from '../types';
import CoreFlow from './CoreFlow';
import CoreVerse from './CoreVerse';
import CoreTalk from './CoreTalk';
import CoreMind from './CoreMind';
import CoreVault from './CoreVault';
import CoreZen from './CoreZen';
import CoreRift from './CoreRift';
import { MLogo } from './icons';

interface ModuleViewProps {
  activeModule: ModuleKey;
  onSelectModule: (key: ModuleKey) => void;
  onGoHome: () => void;
}

const ModuleView: FC<ModuleViewProps> = ({ activeModule, onSelectModule, onGoHome }) => {

  const renderActiveModule = useCallback(() => {
    switch (activeModule) {
      case 'CoreFlow': return <CoreFlow />;
      case 'CoreVerse': return <CoreVerse />;
      case 'CoreTalk': return <CoreTalk />;
      case 'CoreMind': return <CoreMind />;
      case 'CoreVault': return <CoreVault />;
      case 'CoreZen': return <CoreZen />;
      case 'CoreRift': return <CoreRift />;
      default: return null;
    }
  }, [activeModule]);

  return (
    <div className="flex h-screen w-full font-sans animate-fade-in">
      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-64 bg-black/30 backdrop-blur-md border-r border-indigo-900/30 flex flex-col items-center lg:items-start p-4 transition-all duration-300 z-10">
        <button 
          onClick={onGoHome} 
          aria-label="Go to Hub"
          className="flex items-center justify-center lg:justify-start gap-3 mb-10 px-2 text-slate-100 hover:text-indigo-300 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <MLogo className="h-8 w-8 text-indigo-400" />
          <h1 className="hidden lg:block text-2xl font-bold tracking-wider">Mirai</h1>
        </button>
        <nav className="flex flex-col gap-2 w-full">
          {Object.values(MODULES).map((module) => (
            <button
              key={module.key}
              onClick={() => onSelectModule(module.key)}
              className={`flex items-center gap-4 p-3 rounded-lg w-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                activeModule === module.key
                  ? 'bg-indigo-500/30 text-indigo-200 shadow-[0_0_15px_rgba(129,140,248,0.4)]'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <module.Icon className="h-6 w-6 flex-shrink-0" />
              <span className="hidden lg:block font-medium">{module.name}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-center lg:justify-start gap-3 p-2 text-slate-500">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0"></div>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold">User</p>
            <p className="text-xs text-slate-600">Online</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {renderActiveModule()}
      </main>
    </div>
  );
};

export default ModuleView;