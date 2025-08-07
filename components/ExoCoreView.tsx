
import type { FC, CSSProperties } from 'react';
import { EXO_CORES } from '../constants';
import { ArrowLeftIcon } from './icons';
import type { ExoCoreKey } from '../types';

interface ExoCoreViewProps {
  onGoHome: () => void;
  onSelectCore: (key: ExoCoreKey) => void;
}

const ExoCoreView: FC<ExoCoreViewProps> = ({ onGoHome, onSelectCore }) => {
  return (
    <div className="absolute inset-0 bg-slate-900 font-mono flex flex-col items-center justify-start py-8 px-4 sm:px-8 animate-fade-in overflow-y-auto">
      {/* Background Grid & Effects */}
      <div 
        className="absolute inset-0 opacity-10" 
        style={{
          backgroundImage: `
            linear-gradient(rgba(20,184,166,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(20,184,166,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '3rem 3rem',
          animation: 'background-pan 20s linear infinite',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900"></div>

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto flex justify-between items-center mb-10 sm:mb-12 z-10">
        <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-cyan-300 tracking-widest uppercase" style={{ animation: 'text-flicker 5s linear infinite' }}>
              Exo-Core Interface
            </h1>
            <p className="text-sm text-slate-400">Experimental High-Order Systems</p>
        </div>
        <button 
          onClick={onGoHome} 
          className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-cyan-500/30 text-cyan-300 rounded-md hover:bg-slate-700/50 hover:border-cyan-400/50 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Hub</span>
        </button>
      </header>

      {/* Core Grid */}
      <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10">
        {Object.values(EXO_CORES).map((core, index) => {
          return (
            <button
              key={core.key}
              onClick={() => onSelectCore(core.key)}
              className={`group relative col-span-1 aspect-[4/3] transition-all duration-300`}
              style={{
                animation: 'card-enter 0.5s ease-out forwards',
                animationDelay: `${index * 100}ms`,
                opacity: 0,
                '--core-color': core.color,
              } as CSSProperties}
            >
              {/* This div handles the glow, which is not clipped */}
              <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ filter: 'drop-shadow(0 0 10px var(--core-color))' }}
              >
                {/* This div has the shape and a transparent fill, so drop-shadow has something to draw from */}
                <div className="h-full w-full bg-transparent" style={{ clipPath: 'polygon(0 15px, 15px 0, calc(100% - 15px) 0, 100% 15px, 100% calc(100% - 15px), calc(100% - 15px) 100%, 15px 100%, 0 calc(100% - 15px))' }}/>
              </div>

              {/* This div has the content, background, and border */}
              <div className="relative h-full w-full p-6 bg-black/50 backdrop-blur-md text-left
                flex flex-col justify-between
                border border-[var(--core-color)] border-opacity-40 group-hover:border-opacity-100
                transition-all duration-300 group-hover:bg-[var(--core-color)]/10"
                style={{ clipPath: 'polygon(0 15px, 15px 0, calc(100% - 15px) 0, 100% 15px, 100% calc(100% - 15px), calc(100% - 15px) 100%, 15px 100%, 0 calc(100% - 15px))' }}
              >
                <div className="flex justify-between w-full items-start">
                    <h2 className="text-xl font-bold text-white uppercase">{core.name}</h2>
                    <core.Icon className="w-8 h-8 transition-transform duration-300 group-hover:scale-110 group-hover:animate-pulse" style={{ color: 'var(--core-color)' }}/>
                </div>

                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-center px-4">
                    {core.description}
                  </p>
                </div>
                
                <div>
                  <span className="text-xs tracking-widest" style={{ color: 'var(--core-color)' }}>
                    Status: Nominal
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
       <footer className="w-full max-w-7xl mx-auto mt-12 text-center text-xs text-slate-500 z-10">
        &gt;&gt; Unauthorized access is monitored. Engage cores at your own discretion. <span className="inline-block w-2 h-3 bg-cyan-300" style={{animation: 'terminal-blink 1s steps(1) infinite'}}></span>
      </footer>
    </div>
  );
};

export default ExoCoreView;
