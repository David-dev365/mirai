

import { useState } from 'react';
import type { FC } from 'react';
import type { ModuleKey, ExoCoreKey } from './types';
import Hub from './components/Hub';
import ModuleView from './components/ModuleView';
import ExoCoreBootSequence from './components/ExoCoreBootSequence';
import ExoCoreView from './components/ExoCoreView';
import CoreNexus from './components/exocores/CoreNexus';
import CoreSentinel from './components/exocores/CoreSentinel';
import CoreWatcher from './components/exocores/CoreWatcher';
import CoreOps from './components/exocores/CoreOps';
import CoreDreamer from './components/exocores/CoreDreamer';
import DailyBriefing from './components/DailyBriefing';
import { MiraiSystemProvider } from './contexts/MiraiSystemContext';

type ViewState = ModuleKey | 'Hub' | 'ExoCoreBoot' | 'ExoCoreView' | ExoCoreKey | 'DailyBriefing';

const App: FC = () => {
  const [view, setView] = useState<ViewState>('Hub');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [bootSequenceFinished, setBootSequenceFinished] = useState(false);

  const handleSetView = (key: ViewState) => {
      if (isTransitioning) return;

      setIsTransitioning(true);
      // Wait for fade-out animation before changing view
      setTimeout(() => {
          setView(key);
          setIsTransitioning(false);
      }, 350);
  };

  const renderContent = () => {
    switch (view) {
        case 'Hub':
            return <Hub 
                onSelectModule={(key) => handleSetView(key)} 
                onSelectExoCore={() => handleSetView('ExoCoreBoot')} 
                onSelectLogo={() => handleSetView('DailyBriefing')}
                bootSequenceFinished={bootSequenceFinished}
                onBootComplete={() => setBootSequenceFinished(true)}
            />;
        case 'DailyBriefing':
            return <DailyBriefing onGoHome={() => handleSetView('Hub')} />;
        case 'ExoCoreBoot':
            return <ExoCoreBootSequence onComplete={() => handleSetView('ExoCoreView')} />;
        case 'ExoCoreView':
            return <ExoCoreView onGoHome={() => handleSetView('Hub')} onSelectCore={(key) => handleSetView(key)} />;
        
        // Exo-Core Views
        case 'CoreNexus':
            return <CoreNexus onBack={() => handleSetView('ExoCoreView')} />;
        case 'CoreSentinel':
            return <CoreSentinel onBack={() => handleSetView('ExoCoreView')} />;
        case 'CoreWatcher':
            return <CoreWatcher onBack={() => handleSetView('ExoCoreView')} />;
        case 'CoreOps':
            return <CoreOps onBack={() => handleSetView('ExoCoreView')} />;
        case 'CoreDreamer':
            return <CoreDreamer onBack={() => handleSetView('ExoCoreView')} />;
            
        default:
            // This handles all ModuleKey cases
            return <ModuleView 
                activeModule={view as ModuleKey} 
                onSelectModule={(key) => handleSetView(key)} 
                onGoHome={() => handleSetView('Hub')}
            />;
    }
  };


  return (
    <MiraiSystemProvider>
        <div className={`relative w-full min-h-screen font-sans bg-transparent transition-opacity duration-300 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
            {renderContent()}
        </div>
    </MiraiSystemProvider>
  );
};

export default App;