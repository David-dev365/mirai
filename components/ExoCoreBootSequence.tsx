import { useState, useEffect } from 'react';
import type { FC } from 'react';

interface ExoCoreBootSequenceProps {
  onComplete: () => void;
}

const systemChecks = [
  { text: 'INITIATING EXO-CORE PROTOCOL V2.0...', status: 'OK' },
  { text: 'LOADING COMMAND SPINE... [CoreOps]', status: 'OK' },
  { text: 'PARSING NODE CHAIN AUTOMATIONS...', status: 'OK' },
  { text: 'ENGAGING DEVICE GUARDIAN... [CoreSentinel]', status: 'OK' },
  { text: 'SENSOR MONITORING ONLINE (MIC, CAM, GPS)...', status: 'WARN' },
  { text: 'INTRUSION LOCK PROTOCOLS ACTIVE', status: 'OK' },
  { text: 'ACTIVATING STEALTH WITNESS... [CoreWatcher]', status: 'OK' },
  { text: 'AMBIENT RECORDER ON STANDBY', status: 'OK' },
  { text: 'ESTABLISHING HIDDEN COMMUNITY LINK... [CoreNexus]', status: 'OK' },
  { text: 'E2E CRYPTO LAYER VERIFIED', status: 'OK' },
  { text: 'SPOOLING LUCID ENGINE... [CoreDreamer]', status: 'OK' },
  { text: 'DREAM SYMBOL MAPPER LOADED', status: 'OK' },
  { text: 'ALL SYSTEMS NOMINAL. STANDING BY.', status: 'OK' },
];


const ExoCoreBootSequence: FC<ExoCoreBootSequenceProps> = ({ onComplete }) => {
  const [stage, setStage] = useState(0);
  const [checks, setChecks] = useState<typeof systemChecks>([]);

  useEffect(() => {
    const timers: number[] = [];

    // Stage 1: Initial message
    timers.push(window.setTimeout(() => setStage(1), 500));

    // Stage 2: System checks
    timers.push(window.setTimeout(() => {
      setStage(2);
      systemChecks.forEach((check, index) => {
        timers.push(window.setTimeout(() => {
          setChecks(prev => [...prev, check]);
        }, index * 200));
      });
    }, 1500));

    // Stage 3: ASCII Logo
    timers.push(window.setTimeout(() => setStage(3), 5000));

    // Stage 4: Final Message
    timers.push(window.setTimeout(() => setStage(4), 8500));
    
    // Completion
    timers.push(window.setTimeout(onComplete, 10000));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="absolute inset-0 bg-black flex items-center justify-center font-mono text-cyan-300 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,rgba(0,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,255,255,0.2)_1px,transparent_1px)] bg-[size:2rem_2rem]"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-black/40" style={{ animation: 'scanline 10s linear infinite' }}></div>
      <div className="absolute inset-0" style={{ animation: 'glitch 3s steps(2, end) infinite' }}></div>

      <div className="w-full max-w-4xl p-8 text-sm sm:text-base">
        {stage >= 1 && (
          <p className="text-center animate-fade-in" style={{ animation: 'glitch 5s steps(4, end) infinite' }}>
            &gt; INITIATING EXO-CORE SUITE...
          </p>
        )}
        
        {stage >= 2 && (
          <div className="mt-8 space-y-1">
            {checks.map((check, index) => (
              <div key={index} className="flex justify-between items-center animate-fade-in" style={{ animationDelay: `${index * 200}ms` }}>
                <span>{check.text}</span>
                <span className={`font-bold ${check.status === 'OK' ? 'text-green-400' : 'text-yellow-400'}`}>
                  [{check.status}]
                </span>
              </div>
            ))}
          </div>
        )}

        {stage >= 3 && (
          <div className="mt-8 text-center text-xs sm:text-base whitespace-pre animate-fade-in" style={{animationDelay: '0.5s'}}>
            <p className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 5px currentColor)' }}>
{`
    ______ ____  _   __ ______     ______  _____  ______  ______ _____ 
   / ____// __ \\/ | / // ____/    / ____/ / ___/ / ____/ / ____// ___/
  / __/  / / / /  |/ // /        / /      \\__ \\ / /     / __/   \\__ \\ 
 / /___ / /_/ / /|  // /___     / /___   ___/ // /___  / /___  ___/ / 
/_____/ \\____/_/ |_/ \\____/    /_____/  /____/ \\____/ /_____/ /____/  
`}
            </p>
          </div>
        )}
        
        {stage >= 4 && (
             <p className="mt-8 text-center text-lg sm:text-xl font-bold text-white overflow-hidden whitespace-nowrap" style={{animation: 'text-reveal 1.5s steps(40, end)'}}>
                &gt; BOOT SEQUENCE COMPLETE. WELCOME, ADMINISTRATOR.
            </p>
        )}

      </div>
    </div>
  );
};

export default ExoCoreBootSequence;