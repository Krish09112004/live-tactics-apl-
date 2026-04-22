/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, Send, HelpCircle, Activity, Clock, 
  Target, Zap, Share2, Shield, AlertCircle, ChevronRight
} from 'lucide-react';
import { socket } from './services/socket';
import { getInvisibleInsight } from './services/geminiService';
import { GameState, BallRecord } from './types';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [insight, setInsight] = useState<{ insight: string; impactScore: number; graphUpdate: string } | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.on('match:update', async (data: { state: GameState; event: string }) => {
      setGameState(data.state);
      
      if (data.event === 'END_OF_OVER') {
        setIsSynthesizing(true);
        const newInsight = await getInvisibleInsight(data.state);
        setInsight(newInsight);
        setIsSynthesizing(false);
      }
    });

    return () => {
      socket.off('match:update');
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState?.history]);

  if (!gameState) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-bg-dark text-accent font-serif italic text-2xl">
        Connecting to Tactical Graph Stream...
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col p-8 overflow-hidden bg-bg-dark selection:bg-accent selection:text-black">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-ink pb-6 mb-8">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.4em] opacity-50 mb-2">Live Tactical Graph Engine</span>
          <h1 className="text-5xl font-serif italic flex items-center gap-4">
            {gameState.teams.batting} <span className="text-xl opacity-30 not-italic font-sans">v</span> {gameState.teams.bowling}
          </h1>
        </div>
        <div className="flex gap-12">
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-[0.4em] opacity-50 mb-2 block">Scoreboard</span>
            <div className="flex items-baseline gap-2">
               <span className="text-4xl font-light tracking-tighter text-accent font-sans">
                 {gameState.score.runs}/{gameState.score.wickets}
               </span>
               <span className="text-xl opacity-50">({gameState.score.overs}.{gameState.score.balls})</span>
            </div>
          </div>
          <div className="text-right border-l border-ink/30 pl-12 hidden md:block">
            <span className="text-[10px] uppercase tracking-[0.4em] opacity-50 mb-2 block">Knowledge Hub</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${gameState.apiStatus?.includes('Connected') ? 'bg-accent animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-xs font-mono text-accent uppercase tracking-tighter">
                {gameState.apiStatus || 'STABLE // SYSTEM'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 grid grid-cols-12 gap-8 min-h-0">
        
        {/* Left: Tactical Graph View */}
        <aside className="col-span-3 flex flex-col gap-6 border-r border-ink pr-8">
          <div className="space-y-8">
            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] opacity-50 block mb-4">Live Matchups</span>
              <div className="space-y-4">
                <div className="glass p-4 border-l-2 border-accent">
                  <span className="text-[10px] opacity-50 uppercase block mb-1">Batting</span>
                  <p className="font-serif italic text-lg">{gameState.currentPartnership.batsman1}</p>
                  <div className="mt-2 flex gap-2">
                    <span className="text-[10px] px-2 py-0.5 bg-accent/10 text-accent rounded">AGGRESSIVE</span>
                    <span className="text-[10px] px-2 py-0.5 bg-white/5 opacity-50 rounded">VS PACE: 142 SR</span>
                  </div>
                </div>
                <div className="glass p-4 border-l-2 border-red-500/50">
                  <span className="text-[10px] opacity-50 uppercase block mb-1">Bowling</span>
                  <p className="font-serif italic text-lg">{gameState.currentBowler}</p>
                  <div className="mt-2 flex gap-2">
                    <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 rounded">DEFENSIVE</span>
                    <span className="text-[10px] px-2 py-0.5 bg-white/5 opacity-50 rounded">ECON: 6.2</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] opacity-50 block mb-4">Graph Weighting</span>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-70">Pitch Influence</span>
                  <span className="text-accent">+18% Slow</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: '70%' }} className="h-full bg-accent" />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-70">Dew Factor</span>
                  <span className="text-blue-400">High Impact</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-auto pb-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] opacity-30">
              <Zap size={12} className="text-accent" />
              Graph Engine V2.4 Active
            </div>
          </div>
        </aside>

        {/* Center: Tactical Insight Hub */}
        <section className="col-span-6 flex flex-col gap-6">
          <div className="glass border border-ink p-8 flex-1 relative overflow-hidden flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-[10px] uppercase tracking-[0.4em] opacity-50 inline-flex items-center gap-2">
                <Target size={14} className="text-accent" /> Over {gameState.score.overs} Strategy Analysis
              </h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSynthesizing ? 'bg-accent animate-ping' : 'bg-green-500'}`} />
                <span className="text-[10px] uppercase tracking-widest opacity-50">
                  {isSynthesizing ? 'Synthesizing...' : 'Live Logic'}
                </span>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center items-center text-center px-12">
              <AnimatePresence mode="wait">
                {insight ? (
                  <motion.div 
                    key="insight"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full mb-2">
                       <Zap size={12} className="text-accent" />
                       <span className="text-[10px] text-accent uppercase font-bold tracking-widest">Invisible Tactical Shift</span>
                    </div>
                    <p className="text-3xl font-serif italic leading-snug text-white">
                      "{insight.insight}"
                    </p>
                    <div className="pt-6 border-t border-ink flex justify-around items-center">
                      <div className="text-center">
                        <span className="text-[10px] opacity-50 uppercase block mb-1">Impact</span>
                        <span className="text-xl text-accent">{(insight.impactScore * 100).toFixed(0)}%</span>
                      </div>
                      <div className="text-center border-l border-ink pl-8">
                        <span className="text-[10px] opacity-50 uppercase block mb-1">Graph Relation</span>
                        <span className="text-sm opacity-80">{insight.graphUpdate}</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="w-16 h-16 border-2 border-white/10 rounded-full flex items-center justify-center animate-spin-slow mb-6">
                      <Activity size={32} />
                    </div>
                    <p className="font-serif italic text-xl">Aggregating ball-by-ball relationship data...</p>
                    <p className="text-xs uppercase tracking-[0.3em]">Insights trigger at end of over</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded flex items-center gap-4">
               <div className="p-2 bg-accent/20 rounded">
                 <AlertCircle size={20} className="text-accent" />
               </div>
               <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-accent mb-1">Inference Engine Note</p>
                  <p className="text-xs opacity-50">Gemini is currently traversing matchup history nodes to find deviant bowling patterns.</p>
               </div>
            </div>
          </div>

          {/* Live Feed Bottom Bar */}
          <div className="h-32 glass border border-ink p-4 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase tracking-[0.4em] opacity-50 inline-flex items-center gap-2">
                <Terminal size={12} /> Live Tactical Feed
              </span>
              <span className="text-[10px] opacity-30">AUTO-SCROLL ON</span>
            </div>
            <div ref={scrollRef} className="flex-1 flex gap-4 overflow-x-auto no-scrollbar pb-2">
              <AnimatePresence initial={false}>
                {[...gameState.history].reverse().map((ball, idx) => (
                  <motion.div 
                    key={`${ball.over}-${ball.ball}-${idx}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex-shrink-0 w-24 p-2 border-r border-ink flex flex-col justify-between ${ball.runs === 'W' ? 'bg-red-500/10' : ''}`}
                  >
                    <span className="text-[10px] opacity-50">{ball.over}.{ball.ball}</span>
                    <span className={`text-xl font-sans font-bold ${ball.runs === 6 ? 'text-accent' : ball.runs === 'W' ? 'text-red-400' : ''}`}>
                      {ball.runs}
                    </span>
                    <span className="text-[8px] uppercase tracking-tighter opacity-40 truncate">{ball.bowler.split(' ').pop()}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Right Sidebar: Relationship Context */}
        <aside className="col-span-3 flex flex-col gap-6">
          <div className="glass border border-ink p-6 flex-1 flex flex-col relative">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <Share2 size={48} />
             </div>
            <h2 className="text-[10px] uppercase tracking-[0.4em] opacity-50 mb-6 inline-flex items-center gap-2">
              <Shield size={14} /> Knowledge Graph Nodes
            </h2>
            
            <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar">
               {[
                 { label: 'RR Reqs', val: '< 9.1 rpo', color: 'text-accent' },
                 { label: 'Sawai Mansingh', val: 'Spin Grip: High', color: 'text-white' },
                 { label: 'Bishnoi Googly', val: '32% LHB Kill', color: 'text-red-400' },
                 { label: 'Jaiswal vs Pace', val: '158 SR', color: 'text-blue-400' }
               ].map(item => (
                 <div key={item.label} className="group cursor-pointer">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[10px] opacity-40 uppercase tracking-widest">{item.label}</span>
                      <ChevronRight size={10} className="opacity-0 group-hover:opacity-50" />
                    </div>
                    <p className={`text-lg font-serif italic ${item.color}`}>{item.val}</p>
                 </div>
               ))}
               
               <div className="pt-6 border-t border-ink">
                  <p className="text-[10px] opacity-40 uppercase mb-3">Sync Persistence Log</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar font-mono">
                     {gameState.syncLogs?.map((log, i) => (
                       <div key={i} className="text-[9px] p-2 bg-black/20 border border-white/5 rounded flex justify-between items-center">
                         <div className="flex flex-col">
                           <span className="text-white/30 text-[7px]">{log.timestamp}</span>
                           <span className={`${log.source === 'PRIVATE_API' ? 'text-accent' : 'text-blue-400'} font-bold`}>
                             {log.source.replace('_', ' ')}
                           </span>
                         </div>
                         <span className={`${log.status === 'SUCCESS' ? 'text-green-500' : 'text-red-500'} text-[8px]`}>
                           {log.message}
                         </span>
                       </div>
                     ))}
                     {(!gameState.syncLogs || gameState.syncLogs.length === 0) && (
                       <div className="text-[9px] opacity-30 italic">Awaiting first sync pulse...</div>
                     )}
                  </div>
               </div>

               <div className="pt-6 border-t border-ink">
                  <p className="text-[10px] opacity-40 uppercase mb-3">Recent Edges Formed</p>
                  <div className="space-y-2">
                    <div className="text-[9px] font-mono p-2 bg-white/5 border border-white/10 rounded">
                      MATCH(RR) --[DOMINATES_PP]--&gt; MATCH(LSG)
                    </div>
                    <div className="text-[9px] font-mono p-2 bg-white/5 border border-white/10 rounded">
                      BOWLER(Bishnoi) --[NEGATES]--&gt; BATTING(Anchor)
                    </div>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="h-32 flex items-center justify-center border border-ink bg-accent/5">
            <div className="text-center group cursor-pointer">
               <p className="text-[10px] uppercase tracking-[0.5em] text-accent font-bold mb-2 group-hover:animate-pulse">Deep Inference</p>
               <p className="text-[8px] opacity-40">AUTO-TRAVERSING 4K RELATIONSHIPS</p>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-ink flex justify-between items-center">
        <div className="flex gap-8">
          <span className="text-[10px] opacity-40 uppercase tracking-widest flex items-center gap-2">
            <Activity size={10} /> Latency: 1.2s
          </span>
          <span className="text-[10px] opacity-40 uppercase tracking-widest">Model: Gemini 3.0 Tactical</span>
        </div>
        <div className="text-[10px] text-accent tracking-widest uppercase font-bold flex items-center gap-2">
          <Zap size={10} /> Live Tactical Stream Sync Complete
        </div>
      </footer>
    </div>
  );
}
