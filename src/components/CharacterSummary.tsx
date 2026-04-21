import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Trash2, LayoutDashboard, UserCheck, ShieldCheck, Sparkles, Users, User, Shield, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NORRATHS_KEEPERS_TIERS, Task } from '../lib/constants';

interface Character {
  id: string;
  name: string;
  faction: string;
  userId: string;
  completedTasks: string[];
  level: number;
}

interface FriendProfile {
  uid: string;
  email: string;
}

interface Props {
  characterIds: string[];
  currentUserUid?: string;
  onSelectionChange: (ids: string[]) => void;
  onBack: () => void;
  onClear: () => void;
}

export default function CharacterSummary({ characterIds, currentUserUid, onSelectionChange, onBack, onClear }: Props) {
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'coordinated' | 'ledger' | 'lookup'>('coordinated');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTierFilter, setLedgerTierFilter] = useState<string>('all');
  const [focusedObjectiveId, setFocusedObjectiveId] = useState<string | null>(null);

  const allTasks: Task[] = NORRATHS_KEEPERS_TIERS.flatMap(t => t.tasks);

  useEffect(() => {
    if (!currentUserUid) return;

    // 1. Fetch own characters
    const qOwn = query(collection(db, 'characters'), where('userId', '==', currentUserUid));
    
    // 2. Fetch all accepted friendships to find friends
    const qFriends = query(collection(db, 'friendships'), 
      where('uids', 'array-contains', currentUserUid),
      where('status', '==', 'accepted')
    );

    const unsubOwn = onSnapshot(qOwn, (snap) => {
      const ownChars = snap.docs.map(d => ({ id: d.id, ...d.data() } as Character));
      setAllCharacters(prev => {
        const others = prev.filter(c => c.userId !== currentUserUid);
        return [...ownChars, ...others];
      });
      setLoading(false);
    });

    const unsubFriends = onSnapshot(qFriends, async (snap) => {
      const friendIds = snap.docs.map(d => {
        const data = d.data();
        return data.uids.find((id: string) => id !== currentUserUid);
      });

      if (friendIds.length === 0) {
        setFriends([]);
        setAllCharacters(prev => prev.filter(c => c.userId === currentUserUid));
        return;
      }

      // Fetch friend profiles
      const profiles = await Promise.all(friendIds.map(async id => {
        const d = await getDoc(doc(db, 'users', id));
        return { uid: id, email: d.data()?.email || 'Unknown Ally' };
      }));
      setFriends(profiles);

      // Fetch all friends' characters
      const qFriendChars = query(collection(db, 'characters'), where('userId', 'in', friendIds));
      const charSnap = await getDocs(qFriendChars);
      const friendChars = charSnap.docs.map(d => ({ id: d.id, ...d.data() } as Character));
      
      setAllCharacters(prev => {
        const own = prev.filter(c => c.userId === currentUserUid);
        return [...own, ...friendChars];
      });
    });

    return () => {
      unsubOwn();
      unsubFriends();
    };
  }, [currentUserUid]);

  const toggleSelect = (id: string) => {
    const newSelection = characterIds.includes(id)
      ? characterIds.filter(idx => idx !== id)
      : [...characterIds, id];
    onSelectionChange(newSelection);
  };

  const selectedCharacters = allCharacters.filter(c => characterIds.includes(c.id));

  if (loading) {
    return <div className="text-center py-12 animate-pulse text-gold">Consulting the Strategic Chroniclers...</div>;
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-serif font-bold text-emerald-400 stat-glow flex items-center gap-3">
            <ShieldCheck className="w-10 h-10" /> Strategy Room
          </h2>
          <div className="flex items-center gap-6 mt-3">
            <button 
              onClick={() => setViewMode('coordinated')}
              className={`text-xs uppercase font-black tracking-[0.2em] transition-all border-b-2 pb-1 ${
                viewMode === 'coordinated' ? 'border-emerald-500 text-emerald-400 shadow-[0_4px_10px_rgba(16,185,129,0.2)]' : 'border-transparent text-slate-600 hover:text-slate-400'
              }`}
            >
              Coordinated Path
            </button>
            <button 
              onClick={() => setViewMode('ledger')}
              className={`text-xs uppercase font-black tracking-[0.2em] transition-all border-b-2 pb-1 ${
                viewMode === 'ledger' ? 'border-blue-500 text-blue-400 shadow-[0_4px_10px_rgba(59,130,246,0.2)]' : 'border-transparent text-slate-600 hover:text-slate-400'
              }`}
            >
              Master Objective Ledger
            </button>
            <button 
              onClick={() => setViewMode('lookup')}
              className={`text-xs uppercase font-black tracking-[0.2em] transition-all border-b-2 pb-1 ${
                viewMode === 'lookup' ? 'border-amber-500 text-amber-400 shadow-[0_4px_10px_rgba(245,158,11,0.2)]' : 'border-transparent text-slate-600 hover:text-slate-400'
              }`}
            >
              Objective Reverse Lookup
            </button>
          </div>
        </div>
        
        <div className="flex gap-4 self-start md:self-center">
          <button 
            onClick={onClear}
            disabled={characterIds.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-red-900/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-900/20 transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" /> Reset 
          </button>
          <button 
            onClick={onBack}
            className="px-6 py-2 glass-panel border-slate-700 text-slate-300 rounded-lg hover:border-slate-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
          >
            Exit Room
          </button>
        </div>
      </div>

      {/* Selection Hub */}
      <div className="space-y-8">
        <div className="flex items-center gap-4 border-b border-slate-800 pb-2">
          <Users className="w-5 h-5 text-gold" />
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Raiding Party Assembly</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Your Characters */}
          <div className="space-y-3">
            <h4 className="text-[10px] text-blue-400 uppercase font-bold tracking-widest flex items-center gap-2">
              <User className="w-3 h-3" /> Your Heroes
            </h4>
            <div className="space-y-2">
              {allCharacters.filter(c => c.userId === currentUserUid).map(char => (
                <CharacterMiniCard 
                  key={char.id} 
                  char={char} 
                  isSelected={characterIds.includes(char.id)} 
                  onToggle={() => toggleSelect(char.id)}
                />
              ))}
            </div>
          </div>

          {/* Friends' Characters */}
          {friends.map(friend => (
            <div key={friend.uid} className="space-y-3">
              <h4 className="text-[10px] text-purple-400 uppercase font-bold tracking-widest flex items-center gap-2">
                <Shield className="w-3 h-3" /> {friend.email.split('@')[0]}'s Allied Heroes
              </h4>
              <div className="space-y-2">
                {allCharacters.filter(c => c.userId === friend.uid).map(char => (
                  <CharacterMiniCard 
                    key={char.id} 
                    char={char} 
                    isSelected={characterIds.includes(char.id)} 
                    onToggle={() => toggleSelect(char.id)}
                    isFriend
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hub Body */}
      {viewMode === 'lookup' ? (
        <div className="pt-12 border-t-2 border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-8">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-serif font-bold text-amber-400 flex items-center gap-3">
                  <Search className="w-6 h-6 text-amber-500" /> Objective Focus
                </h3>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-2">Reverse search: Identify every adventurer who needs a specific mission</p>
              </div>
              
              <div className="relative flex-1 max-w-xl">
                <input 
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => {
                    setLedgerSearch(e.target.value);
                    setFocusedObjectiveId(null);
                  }}
                  placeholder="Type to search all Norrath objectives..."
                  className="fancy-input pl-4 pr-4 py-3 w-full text-sm font-bold bg-amber-500/5 focus:bg-amber-500/10 border-amber-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Objective List */}
              <div className="glass-panel border-slate-800 bg-slate-900/10 overflow-hidden flex flex-col h-[600px]">
                <div className="p-4 border-b border-slate-800 bg-black/40">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em]">Objective Register</span>
                </div>
                <div className="overflow-y-auto divide-y divide-slate-800 flex-1 custom-scrollbar scroll-smooth">
                  {NORRATHS_KEEPERS_TIERS.map(tier => {
                    const tierTasks = tier.tasks.filter(t => 
                      t.name.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
                      t.type.toLowerCase().includes(ledgerSearch.toLowerCase())
                    );
                    
                    if (tierTasks.length === 0) return null;

                    return (
                      <div key={tier.id} className="bg-black/20">
                        <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                          <span className="text-[9px] uppercase font-black text-amber-500/80 tracking-widest">{tier.name}</span>
                          <span className="text-[8px] text-slate-600 font-bold">{tierTasks.length} OBJECTIVES</span>
                        </div>
                        <div className="divide-y divide-slate-800/30">
                          {tierTasks.map(task => (
                            <button 
                              key={task.id}
                              onClick={() => setFocusedObjectiveId(task.id)}
                              className={`w-full text-left p-4 transition-all hover:bg-amber-500/5 ${focusedObjectiveId === task.id ? 'bg-amber-500/10 border-r-4 border-amber-500' : ''}`}
                            >
                              <div className="text-[9px] uppercase font-black text-amber-500/60 tracking-tighter mb-0.5">{task.type}</div>
                              <div className={`text-sm font-bold ${focusedObjectiveId === task.id ? 'text-amber-300' : 'text-slate-300'}`}>{task.name}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {allTasks.filter(t => 
                    t.name.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
                    t.type.toLowerCase().includes(ledgerSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="p-8 text-center text-slate-600 italic text-sm font-serif">No objectives match your search.</div>
                  )}
                </div>
              </div>

              {/* Analysis Results */}
              <div className="lg:col-span-2 space-y-6">
                {focusedObjectiveId ? (
                  <div className="animate-in fade-in zoom-in duration-300 space-y-8">
                    {(() => {
                      const task = allTasks.find(t => t.id === focusedObjectiveId);
                      if (!task) return null;
                      
                      const charsWhoNeed = allCharacters.filter(c => 
                        c.faction === "Norrath's Keepers" && !c.completedTasks.includes(task.id)
                      );
                      const charsWhoHave = allCharacters.filter(c => 
                        c.faction === "Norrath's Keepers" && c.completedTasks.includes(task.id)
                      );

                      return (
                        <>
                          <div className="glass-panel p-8 border-amber-500/30 bg-amber-500/5 relative overflow-hidden">
                            <div className="absolute -top-4 -right-4 opacity-5">
                              <Shield className="w-32 h-32 text-amber-400" />
                            </div>
                            <div className="relative z-10">
                              <span className="px-3 py-1 bg-amber-900/30 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase rounded-full mb-4 inline-block tracking-widest">{task.type} Focus</span>
                              <h4 className="text-4xl font-serif font-bold text-white mb-2">{task.name}</h4>
                              <p className="text-sm text-slate-400 leading-relaxed max-w-2xl mb-8">Intelligence report for all tracked adventurers (including allies) regarding this specific chronicle objective.</p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
                                    <span className="text-xs font-black text-red-400 uppercase tracking-widest">Unfinished Chronicles ({charsWhoNeed.length})</span>
                                  </div>
                                  <div className="space-y-3">
                                    {charsWhoNeed.map(char => {
                                      const isFriend = currentUserUid && char.userId !== currentUserUid;
                                      return (
                                        <div key={char.id} className={`p-3 rounded-xl border flex items-center justify-between transition-all hover:translate-x-1 ${isFriend ? 'bg-purple-900/5 border-purple-500/20' : 'bg-slate-900 border-slate-800'}`}>
                                          <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border ${isFriend ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-blue-500/20 border-blue-500/40 text-blue-300'}`}>
                                              {char.name.charAt(0)}
                                            </div>
                                            <div>
                                              <div className="text-sm font-bold text-white">{char.name}</div>
                                              <div className={`text-[9px] uppercase font-black tracking-widest ${isFriend ? 'text-purple-400' : 'text-slate-500'}`}>
                                                {isFriend ? 'Ally' : 'Account Hero'}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 px-2 py-1 bg-red-900/20 border border-red-500/20 text-red-500 text-[9px] font-black uppercase rounded">Needs</div>
                                        </div>
                                      );
                                    })}
                                    {charsWhoNeed.length === 0 && <p className="text-xs text-slate-600 italic p-4">No adventurers currently require this objective.</p>}
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                                    <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Cleared ({charsWhoHave.length})</span>
                                  </div>
                                  <div className="space-y-3 opacity-60">
                                    {charsWhoHave.map(char => {
                                      const isFriend = currentUserUid && char.userId !== currentUserUid;
                                      return (
                                        <div key={char.id} className={`p-3 rounded-xl border flex items-center justify-between ${isFriend ? 'bg-purple-900/5 border-purple-500/20' : 'bg-slate-900 border-slate-800'}`}>
                                          <div className="flex items-center gap-3 font-serif">
                                            <div className="text-xs text-slate-300 italic">{char.name}</div>
                                          </div>
                                          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-500">
                                            <div className="p-0.5 bg-emerald-500/20 rounded-full border border-emerald-500/30"><Check className="w-2.5 h-2.5" /></div>
                                            Cleared
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {charsWhoHave.length === 0 && <p className="text-xs text-slate-600 italic p-4">No adventurers have recorded this objective.</p>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-12 glass-panel border-dashed border-slate-800 bg-transparent text-center">
                    <div className="w-20 h-20 bg-amber-500/5 rounded-full flex items-center justify-center mb-6 border border-amber-500/10">
                      <Search className="w-10 h-10 text-amber-500/40" />
                    </div>
                    <h4 className="text-xl font-serif font-bold text-slate-500 mb-2">Select an Objective</h4>
                    <p className="text-sm text-slate-600 max-w-sm">Use the register on the left to select a mission and scan your entire adventurer network for requirements.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : characterIds.length > 0 ? (
        <div className="pt-12 border-t-2 border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {viewMode === 'coordinated' ? (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-12">
              <div className="xl:col-span-3 space-y-8">
                <h3 className="text-xl font-serif font-bold text-gold flex items-center gap-3">
                  <LayoutDashboard className="w-6 h-6 text-emerald-400" /> Coordinated Mission Path
                </h3>

                <div className="space-y-10">
                  {NORRATHS_KEEPERS_TIERS.map(tier => {
                    const missingInTier = tier.tasks.filter(task => 
                      selectedCharacters.some(char => char.faction === "Norrath's Keepers" && !char.completedTasks.includes(task.id))
                    );

                    if (missingInTier.length === 0) return null;

                    return (
                      <div key={tier.id} className="glass-panel p-8 border-slate-700/50 bg-slate-900/10">
                        <h4 className="font-serif text-2xl text-blue-300 mb-6 flex items-center justify-between">
                          {tier.name}
                          <span className="text-[10px] text-slate-500 uppercase font-sans tracking-[0.2em]">Tier Intelligence</span>
                        </h4>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {missingInTier.map(task => {
                            const charsWhoNeedThis = selectedCharacters.filter(char => 
                              char.faction === "Norrath's Keepers" && !char.completedTasks.includes(task.id)
                            );
                            
                            return (
                              <div key={task.id} className="bg-black/60 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 hover:border-emerald-500/30 transition-all group">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-black text-emerald-400/80 tracking-tighter">{task.type}</span>
                                    <div className="text-lg font-bold text-white leading-tight group-hover:text-emerald-300 transition-colors">{task.name}</div>
                                  </div>
                                  <div className="flex -space-x-2">
                                    {charsWhoNeedThis.map(char => {
                                      const isFriend = currentUserUid && char.userId !== currentUserUid;
                                      return (
                                        <div 
                                          key={char.id}
                                          title={char.name}
                                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-black uppercase ring-4 ring-black ${
                                            isFriend 
                                              ? 'bg-purple-900 border-purple-500 text-purple-300' 
                                              : 'bg-slate-800 border-slate-700 text-blue-400'
                                          }`}
                                        >
                                          {char.name.charAt(0)}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                  {charsWhoNeedThis.map(char => {
                                    const isFriend = currentUserUid && char.userId !== currentUserUid;
                                    return (
                                      <span 
                                        key={char.id} 
                                        className={`px-3 py-1 border-b-2 rounded text-[10px] font-black uppercase tracking-tighter ${
                                          isFriend 
                                            ? 'bg-purple-900/10 border-purple-500/30 text-purple-400 shadow-[0_2px_10px_rgba(168,85,247,0.1)]' 
                                            : 'bg-blue-900/10 border-blue-500/30 text-blue-400'
                                        }`}
                                      >
                                        {char.name}
                                      </span>
                                    );
                                  })}
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

              {/* Sidebar: Readiness Status */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-800 pb-2 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" /> Active Party Status
                </h3>
                
                <div className="space-y-4">
                  {selectedCharacters.map(char => {
                    const isNKSide = char.faction === "Norrath's Keepers";
                    const totalTasks = isNKSide ? 15 : 0;
                    const progress = totalTasks > 0 ? (char.completedTasks.length / totalTasks) * 100 : 0;
                    const isFriend = currentUserUid && char.userId !== currentUserUid;
                    
                    return (
                      <div key={char.id} className={`fancy-card border-l-4 p-5 transition-all ${isFriend ? 'border-l-purple-500 bg-purple-900/5' : 'border-l-emerald-500 bg-emerald-900/5'}`}>
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{char.name}</div>
                            <div className={`text-[9px] uppercase font-black tracking-widest mt-0.5 ${isFriend ? 'text-purple-400' : 'text-emerald-500 opacity-60'}`}>
                              {isFriend ? 'Allied Archer' : 'Your Adventurer'}
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-600 font-bold uppercase">{char.faction.split(' ')[0]}</span>
                        </div>
                        
                        <div className="space-y-2.5">
                          <div className="flex justify-between text-[11px] font-black px-1">
                            <span className="text-slate-500 uppercase tracking-tighter">Readiness</span>
                            <span className={isFriend ? 'text-purple-400' : 'text-emerald-400'}>{char.completedTasks.length} / {totalTasks}</span>
                          </div>
                          <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-slate-800">
                            <div 
                              className={`h-full transition-all duration-1000 ease-out ${isFriend ? 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-6 bg-emerald-900/10 border border-emerald-500/20 rounded-2xl">
                  <div className="text-[10px] text-emerald-400 uppercase font-black tracking-[0.2em] mb-3 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> Raid Strategy
                  </div>
                  <p className="text-xs text-slate-400 italic leading-relaxed">Selecting characters updates the mission list in real-time. Use this intelligence to pick the path of least resistance for your party.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <h3 className="text-xl font-serif font-bold text-gold flex items-center gap-3">
                  <LayoutDashboard className="w-6 h-6 text-blue-400" /> Master Objective Ledger
                </h3>
                
                <div className="flex flex-col md:flex-row gap-4 items-stretch">
                  <div className="relative">
                    <input 
                      type="text"
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      placeholder="Search chronicles..."
                      className="fancy-input pl-4 pr-10 py-2 w-full md:w-64 text-xs font-bold"
                    />
                  </div>
                  <div className="flex bg-black/40 rounded-lg p-1 border border-slate-800">
                    <button 
                      onClick={() => setLedgerTierFilter('all')}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${ledgerTierFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      All
                    </button>
                    {NORRATHS_KEEPERS_TIERS.map(t => (
                      <button 
                        key={t.id}
                        onClick={() => setLedgerTierFilter(t.id)}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${ledgerTierFilter === t.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {t.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {NORRATHS_KEEPERS_TIERS
                  .filter(t => ledgerTierFilter === 'all' || t.id === ledgerTierFilter)
                  .map(tier => {
                    const filteredTasks = tier.tasks.filter(task => 
                      task.name.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                      task.type.toLowerCase().includes(ledgerSearch.toLowerCase())
                    );

                    if (filteredTasks.length === 0 && ledgerSearch) return null;

                    return (
                      <div key={tier.id} className="glass-panel border-slate-800">
                        <div className="bg-slate-900/50 p-4 border-b border-slate-800">
                          <h4 className="font-serif text-lg text-blue-300">{tier.name}</h4>
                          <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mt-1">Full Objective Record</div>
                        </div>
                        <div className="divide-y divide-slate-800">
                          {filteredTasks.map(task => (
                            <LedgerItem 
                              key={task.id} 
                              task={task} 
                              characters={selectedCharacters} 
                              currentUserUid={currentUserUid}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-24 text-center glass-panel border-dashed border-slate-800 bg-transparent">
          <ShieldCheck className="w-20 h-20 text-slate-800 mx-auto mb-4 animate-pulse" />
          <h3 className="text-2xl font-serif text-slate-600">The Room is Quiet</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm">Select adventurers from the assembly above to generate a tactical mission briefing for your raid party.</p>
        </div>
      )}
    </div>
  );
}

function CharacterMiniCard({ char, isSelected, onToggle, isFriend }: { char: Character, isSelected: boolean, onToggle: () => void, isFriend?: boolean, key?: any }) {
  return (
    <div 
      onClick={onToggle}
      className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between group h-14 ${
        isSelected 
          ? isFriend ? 'bg-purple-900/20 border-purple-500/50 text-white' : 'bg-emerald-900/20 border-emerald-500/50 text-white'
          : 'bg-black/40 border-slate-800 hover:border-slate-600 text-slate-400'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
           isSelected 
             ? isFriend ? 'bg-purple-500 border-purple-400 text-white' : 'bg-emerald-500 border-emerald-400 text-white'
             : 'bg-slate-900 border-slate-700 text-slate-600'
        }`}>
          {isSelected ? <Check className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full border border-slate-600" />}
        </div>
        <div>
          <div className={`text-xs font-bold transition-colors ${isSelected ? 'text-white' : 'group-hover:text-slate-300'}`}>{char.name}</div>
          <div className="text-[9px] uppercase tracking-widest opacity-60">Level {char.level}</div>
        </div>
      </div>
      {isFriend && !isSelected && <div className="text-[8px] uppercase tracking-tighter text-purple-500 font-black">Allied</div>}
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 6 9 17l-5-5"/></svg>
  );
}

function LedgerItem({ task, characters, currentUserUid }: { task: Task, characters: Character[], currentUserUid?: string, key?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const charsWhoNeedThis = characters.filter(char => 
    char.faction === "Norrath's Keepers" && !char.completedTasks.includes(task.id)
  );
  
  const count = charsWhoNeedThis.length;
  const isComplete = characters.length > 0 && count === 0;

  return (
    <div className="group">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left p-4 hover:bg-slate-800/30 transition-all flex items-center justify-between ${isOpen ? 'bg-slate-800/20' : ''}`}
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="text-[9px] uppercase font-black text-slate-500 tracking-tighter mb-0.5">{task.type}</div>
          <div className={`text-xs font-bold truncate ${isComplete ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{task.name}</div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          {count > 0 && (
            <span className="px-2 py-0.5 bg-red-900/20 border border-red-500/20 text-red-400 text-[10px] font-black rounded-full shadow-[0_0_10px_rgba(239,68,68,0.1)]">
              {count} NEED
            </span>
          )}
          {isComplete && <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 animate-in fade-in zoom-in duration-300"><Check className="w-3 h-3" /></div>}
          <div className={`text-slate-600 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-black/40"
          >
            <div className="p-4 pt-2 border-t border-slate-800/50 space-y-3">
              {charsWhoNeedThis.length > 0 ? (
                <>
                  <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Unfinished Chronicles ({charsWhoNeedThis.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {charsWhoNeedThis.map(char => {
                      const isFriend = currentUserUid && char.userId !== currentUserUid;
                      return (
                        <span 
                          key={char.id} 
                          className={`px-2 py-0.5 border rounded text-[9px] font-black uppercase ${
                            isFriend 
                              ? 'bg-purple-900/10 border-purple-500/20 text-purple-400' 
                              : 'bg-blue-900/10 border-blue-500/20 text-blue-400'
                          }`}
                        >
                          {char.name}
                        </span>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 py-2">
                  <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30"><Check className="w-2.5 h-2.5" /></div>
                  <div className="text-[10px] text-emerald-500/70 uppercase font-black tracking-widest leading-none">Objective already cleared by all selected heroes</div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
