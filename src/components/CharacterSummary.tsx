import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { ArrowLeft, Trash2, LayoutDashboard, UserCheck, UserMinus, ShieldQuestion } from 'lucide-react';
import { NORRATHS_KEEPERS_TIERS, Task } from '../lib/constants';

interface Character {
  id: string;
  name: string;
  faction: string;
  completedTasks: string[];
}

interface Props {
  characterIds: string[];
  onBack: () => void;
  onClear: () => void;
}

export default function CharacterSummary({ characterIds, onBack, onClear }: Props) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (characterIds.length === 0) return;

    const q = query(
      collection(db, 'characters'),
      where('__name__', 'in', characterIds)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Character[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Character);
      });
      setCharacters(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [characterIds]);

  if (loading) {
    return <div className="text-center py-12 animate-pulse text-gold">Consulting the Chroniclers...</div>;
  }

  // Aggregate missing tasks
  const allTasks: Task[] = NORRATHS_KEEPERS_TIERS.flatMap(t => t.tasks);
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gold">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-3xl font-serif font-bold text-emerald-400 stat-glow tracking-tight">Mission Briefing</h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Summary for {characters.length} selected heroes</p>
          </div>
        </div>
        <button 
          onClick={onClear}
          className="flex items-center gap-2 px-4 py-2 bg-red-900/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-900/40 transition-all text-xs font-bold uppercase tracking-widest"
        >
          <Trash2 className="w-4 h-4" /> Reset Selection
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Aggregated List of Missions Still Needed */}
        <div className="xl:col-span-3 space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" /> Pending Tasks by Tier
          </h3>
          
          <div className="space-y-8">
            {NORRATHS_KEEPERS_TIERS.map(tier => {
              const missingInTier = tier.tasks.filter(task => 
                characters.some(char => char.faction === "Norrath's Keepers" && !char.completedTasks.includes(task.id))
              );

              if (missingInTier.length === 0) return null;

              return (
                <div key={tier.id} className="glass-panel p-6 border-slate-700/50">
                  <h4 className="font-serif text-xl text-blue-300 mb-4">{tier.name} <span className="text-[10px] text-slate-500 uppercase font-sans tracking-widest ml-2">Remaining Objectives</span></h4>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {missingInTier.map(task => {
                      const charsWhoNeedThis = characters.filter(char => 
                        char.faction === "Norrath's Keepers" && !char.completedTasks.includes(task.id)
                      );
                      
                      return (
                        <div key={task.id} className="bg-black/40 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div className="text-sm font-bold text-white tracking-tight">
                              <span className="opacity-40 text-[9px] uppercase block mb-0.5">{task.type}</span>
                              {task.name}
                            </div>
                            <div className="flex -space-x-2">
                              {charsWhoNeedThis.map(char => (
                                <div 
                                  key={char.id}
                                  title={char.name}
                                  className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] font-bold text-blue-400 uppercase ring-2 ring-black"
                                >
                                  {char.name.charAt(0)}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5">
                            {charsWhoNeedThis.map(char => (
                              <span key={char.id} className="px-2 py-0.5 bg-blue-900/10 border border-blue-500/20 rounded text-[9px] text-blue-400 font-bold uppercase">
                                {char.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Character Progress Cards for Comparison */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
            <UserCheck className="w-4 h-4" /> Readiness Level
          </h3>
          
          <div className="space-y-4">
            {characters.map(char => {
              const isNKSide = char.faction === "Norrath's Keepers";
              const totalTasks = isNKSide ? 15 : 0; // NK currently has 15 tasks pre-loaded
              const progress = totalTasks > 0 ? (char.completedTasks.length / totalTasks) * 100 : 0;
              
              return (
                <div key={char.id} className="fancy-card border-l-2 border-l-emerald-500/50 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-white">{char.name}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{char.faction.split(' ')[0]}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase font-bold px-1">
                      <span className="text-slate-500">Journey</span>
                      <span className="text-emerald-400">{char.completedTasks.length} / {totalTasks}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  {!isNKSide && (
                    <div className="mt-3 py-1 px-2 bg-amber-900/10 border border-amber-500/20 rounded-md text-[8px] text-amber-500 uppercase font-bold flex items-center gap-1">
                      <ShieldQuestion className="w-3 h-3" /> Dark Reign data incomplete
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="p-4 bg-blue-900/5 border border-blue-500/10 rounded-xl mt-8">
            <div className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mb-2">Strategy Tip</div>
            <p className="text-[11px] text-slate-400 italic">This briefing displays all tasks that at least ONE selected character still needs. Use the initials on task cards to identify which specific adventurers need the objective.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
