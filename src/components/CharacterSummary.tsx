import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { Trash2, LayoutDashboard, UserCheck, ShieldCheck, Sparkles, Users, User, Shield, Search, CheckCircle2, X } from 'lucide-react';
import { handleFirestoreError } from '../lib/firestoreUtils';
import { NORRATHS_KEEPERS_TIERS, DARK_REIGN_TIERS, Task, getTiersByFaction, Faction } from '../lib/constants';

interface Character {
  id: string;
  name: string;
  faction: string;
  userId: string;
  completedTasks: string[];
  reputationValue?: number;
}

interface FriendProfile {
  uid: string;
  email: string;
  nickname?: string;
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
  const [viewMode, setViewMode] = useState<'coordinated' | 'lookup'>('coordinated');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [focusedObjectiveId, setFocusedObjectiveId] = useState<string | null>(null);
  const [factionFilter, setFactionFilter] = useState<'all' | 'nk' | 'dr'>('all');
  const [sortMethod, setSortMethod] = useState<'name' | 'reputation'>(() => {
    const saved = localStorage.getItem('norrath_character_sort_by');
    return (saved === 'name' || saved === 'reputation') ? saved : 'reputation';
  });

  useEffect(() => {
    localStorage.setItem('norrath_character_sort_by', sortMethod);
  }, [sortMethod]);

  const allTasks: Task[] = [...NORRATHS_KEEPERS_TIERS.flatMap(t => t.tasks), ...DARK_REIGN_TIERS.flatMap(t => t.tasks)];

  const getReadiness = (char: Character, taskId: string) => {
    const factionTiers = getTiersByFaction(char.faction as Faction);
    const tierIndex = factionTiers.findIndex(t => t.tasks.some(tk => tk.id === taskId));
    if (tierIndex === -1) return { ready: false, repOk: false, prevOk: false, reqRep: 0 };

    const tier = factionTiers[tierIndex];
    const repReqs = [0, 100, 300, 500, 750];
    const reqRep = repReqs[tier.id - 1] || 0;
    const repOk = (char.reputationValue ?? 0) >= reqRep;

    let prevOk = true;
    for (let i = 0; i < tierIndex; i++) {
      if (!factionTiers[i].tasks.every(tk => char.completedTasks.includes(tk.id))) {
        prevOk = false;
        break;
      }
    }

    return { ready: repOk && prevOk, repOk, prevOk, reqRep };
  };

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
    }, (error) => handleFirestoreError(error, 'listen', 'characters (own)'));

    const unsubFriends = onSnapshot(qFriends, async (snap) => {
      const friendshipsList = snap.docs.map(d => {
        const data = d.data();
        const fId = data.uids.find((id: string) => id !== currentUserUid);
        const nickname = data.nicknames?.[currentUserUid] || '';
        return { friendId: fId, nickname };
      }).filter(item => item.friendId !== undefined) as { friendId: string; nickname: string }[];

      if (friendshipsList.length === 0) {
        setFriends([]);
        setAllCharacters(prev => prev.filter(c => c.userId === currentUserUid));
        return;
      }

      const friendIds = friendshipsList.map(item => item.friendId);

      try {
        // Fetch friend profiles
        const profiles = await Promise.all(friendshipsList.map(async ({ friendId, nickname }) => {
          const d = await getDoc(doc(db, 'users', friendId));
          return { 
            uid: friendId, 
            email: d.data()?.email || 'Unknown Ally',
            nickname: nickname
          };
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
      } catch (error) {
        handleFirestoreError(error, 'list', 'characters (friends)');
      }
    }, (error) => handleFirestoreError(error, 'listen', 'friendships'));

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

  const toggleBulkSelect = (ids: string[], select: boolean) => {
    if (select) {
      // Add only those not already selected
      const toAdd = ids.filter(id => !characterIds.includes(id));
      onSelectionChange([...characterIds, ...toAdd]);
    } else {
      // Remove all provided ids from selection
      const newSelection = characterIds.filter(id => !ids.includes(id));
      onSelectionChange(newSelection);
    }
  };

  const selectedCharacters = allCharacters.filter(c => characterIds.includes(c.id));

  if (loading) {
    return <div className="text-center py-12 animate-pulse text-gold">Consulting the Strategic Chroniclers...</div>;
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-4">
          <h2 className="text-2xl md:text-4xl font-serif font-bold text-emerald-400 stat-glow flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 md:w-10 md:h-10" /> Strategy Room
          </h2>
          <div className="flex flex-wrap items-center gap-4 md:gap-6 mt-3">
            <button 
              onClick={() => setViewMode('coordinated')}
              className={`text-[10px] md:text-xs uppercase font-black tracking-[0.2em] transition-all border-b-2 pb-1 ${
                viewMode === 'coordinated' ? 'border-emerald-500 text-emerald-400 shadow-[0_4px_10px_rgba(16,185,129,0.2)]' : 'border-transparent text-slate-600 hover:text-slate-400'
              }`}
            >
              Coordinated Path
            </button>
            <button 
              onClick={() => setViewMode('lookup')}
              className={`text-[10px] md:text-xs uppercase font-black tracking-[0.2em] transition-all border-b-2 pb-1 ${
                viewMode === 'lookup' ? 'border-amber-500 text-amber-400 shadow-[0_4px_10px_rgba(245,158,11,0.2)]' : 'border-transparent text-slate-600 hover:text-slate-400'
              }`}
            >
              Objective Reverse Lookup
            </button>
            <div className="h-4 w-[1px] bg-slate-800 mx-2 hidden md:block"></div>
            <button 
              onClick={() => setSortMethod(prev => prev === 'name' ? 'reputation' : 'name')}
              className="text-[10px] md:text-xs uppercase font-black tracking-[0.2em] text-slate-500 hover:text-gold transition-all"
            >
              Sorting: {sortMethod === 'reputation' ? 'Reputation' : 'Name'}
            </button>
          </div>
        </div>
        
        <div className="flex gap-3 md:gap-4 self-start lg:self-center w-full lg:w-auto">
          <button 
            onClick={onClear}
            disabled={characterIds.length === 0}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2 bg-red-900/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-900/20 transition-all text-[10px] md:text-xs font-bold uppercase tracking-widest disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" /> Reset 
          </button>
          <button 
            onClick={onBack}
            className="flex-1 lg:flex-none flex items-center justify-center px-4 md:px-6 py-2 glass-panel border-slate-700 text-slate-300 rounded-lg hover:border-slate-500 hover:text-white transition-all text-[10px] md:text-xs font-bold uppercase tracking-widest"
          >
            Exit Room
          </button>
        </div>
      </div>

      {/* Selection Hub */}
      {viewMode === 'coordinated' && (
        <div className="space-y-8">
          <div className="flex items-center gap-4 border-b border-slate-800 pb-2">
            <Users className="w-5 h-5 text-gold" />
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Raiding Party Assembly</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Your Characters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] text-blue-400 uppercase font-bold tracking-widest flex items-center gap-2">
                  <User className="w-3 h-3" /> Your Heroes
                </h4>
                {(() => {
                  const ownIds = allCharacters.filter(c => c.userId === currentUserUid).map(c => c.id);
                  const allSelected = ownIds.length > 0 && ownIds.every(id => characterIds.includes(id));
                  return ownIds.length > 0 ? (
                    <button 
                      onClick={() => toggleBulkSelect(ownIds, !allSelected)}
                      className="text-[9px] uppercase font-bold text-slate-500 hover:text-blue-400 transition-colors"
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  ) : null;
                })()}
              </div>
              <div className="space-y-2">
                {allCharacters
                  .filter(c => c.userId === currentUserUid)
                  .sort((a, b) => {
                    if (sortMethod === 'name') return a.name.localeCompare(b.name);
                    return (b.reputationValue ?? 0) - (a.reputationValue ?? 0);
                  })
                  .map(char => (
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
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] text-purple-400 uppercase font-bold tracking-widest flex items-center gap-2">
                    <Shield className="w-3 h-3" /> {friend.nickname || friend.email.split('@')[0]}'s Allied Heroes
                  </h4>
                  {(() => {
                     const friendIds = allCharacters.filter(c => c.userId === friend.uid).map(c => c.id);
                     const allSelected = friendIds.length > 0 && friendIds.every(id => characterIds.includes(id));
                     return friendIds.length > 0 ? (
                       <button 
                         onClick={() => toggleBulkSelect(friendIds, !allSelected)}
                         className="text-[9px] uppercase font-bold text-slate-500 hover:text-purple-400 transition-colors"
                       >
                         {allSelected ? 'Deselect All' : 'Select All'}
                       </button>
                     ) : null;
                  })()}
                </div>
                <div className="space-y-2">
                  {allCharacters
                    .filter(c => c.userId === friend.uid)
                    .sort((a, b) => {
                      if (sortMethod === 'name') return a.name.localeCompare(b.name);
                      return (b.reputationValue ?? 0) - (a.reputationValue ?? 0);
                    })
                    .map(char => (
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
      )}

      {/* Hub Body */}
      {viewMode === 'lookup' ? (
        <div className="pt-12 border-t-2 border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="space-y-8">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
              <div>
                <h3 className="text-lg md:text-xl font-serif font-bold text-amber-400 flex items-center gap-3">
                  <Search className="w-5 h-5 md:w-6 md:h-6 text-amber-500" /> Objective Focus
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
              <div className="glass-panel border-slate-800 bg-slate-900/10 overflow-hidden flex flex-col h-[400px] lg:h-[600px]">
                <div className="p-4 border-b border-slate-800 bg-black/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] whitespace-nowrap">Objective Register</span>
                  <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-slate-800/80 shrink-0 self-start sm:self-auto">
                    <button
                      onClick={() => {
                        setFactionFilter('all');
                        setFocusedObjectiveId(null);
                      }}
                      className={`px-2.5 py-1 text-[9px] uppercase font-bold tracking-wider rounded transition-all ${
                        factionFilter === 'all'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'text-slate-400 hover:text-white border border-transparent'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => {
                        setFactionFilter('nk');
                        setFocusedObjectiveId(null);
                      }}
                      className={`px-2.5 py-1 text-[9px] uppercase font-bold tracking-wider rounded transition-all ${
                        factionFilter === 'nk'
                          ? 'bg-blue-950/60 text-blue-400 border border-blue-500/30 font-bold'
                          : 'text-slate-400 hover:text-blue-300 border border-transparent'
                      }`}
                    >
                      NK
                    </button>
                    <button
                      onClick={() => {
                        setFactionFilter('dr');
                        setFocusedObjectiveId(null);
                      }}
                      className={`px-2.5 py-1 text-[9px] uppercase font-bold tracking-wider rounded transition-all ${
                        factionFilter === 'dr'
                          ? 'bg-red-950/60 text-red-400 border border-red-500/30 font-bold'
                          : 'text-slate-400 hover:text-red-300 border border-transparent'
                      }`}
                    >
                      DR
                    </button>
                  </div>
                </div>
                <div className="overflow-y-auto divide-y divide-slate-800 flex-1 custom-scrollbar scroll-smooth">
                  {(() => {
                    let tiersToRender = [...NORRATHS_KEEPERS_TIERS, ...DARK_REIGN_TIERS];
                    if (factionFilter === 'nk') {
                      tiersToRender = NORRATHS_KEEPERS_TIERS;
                    } else if (factionFilter === 'dr') {
                      tiersToRender = DARK_REIGN_TIERS;
                    }

                    return tiersToRender.map(tier => {
                      const tierTasks = tier.tasks.filter(t => 
                        t.name.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
                        t.type.toLowerCase().includes(ledgerSearch.toLowerCase())
                      );
                      
                      if (tierTasks.length === 0) return null;

                      const isNK = tier.tasks[0]?.id.startsWith('nk');

                      return (
                        <div key={`${tier.id}-${isNK ? 'nk' : 'dr'}`} className="bg-black/20">
                          <div className={`px-4 py-2 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md ${isNK ? 'bg-blue-900/40' : 'bg-red-900/40'}`}>
                            <span className={`text-[9px] uppercase font-black tracking-widest ${isNK ? 'text-blue-400' : 'text-red-400'}`}>
                              {isNK ? 'NK' : 'DR'} {tier.name}
                            </span>
                            <span className="text-[8px] text-slate-500 font-bold">{tierTasks.length} OBJECTIVES</span>
                          </div>
                          <div className="divide-y divide-slate-800/30">
                            {tierTasks.map(task => (
                              <button 
                                key={task.id}
                                onClick={() => setFocusedObjectiveId(task.id)}
                                className={`w-full text-left p-4 transition-all hover:bg-slate-500/5 ${focusedObjectiveId === task.id ? (isNK ? 'bg-blue-500/10 border-r-4 border-blue-500' : 'bg-red-500/10 border-r-4 border-red-500') : ''}`}
                              >
                                <div className={`text-[9px] uppercase font-black tracking-tighter mb-0.5 ${isNK ? 'text-blue-500/60' : 'text-red-500/60'}`}>{task.type}</div>
                                <div className={`text-sm font-bold ${focusedObjectiveId === task.id ? (isNK ? 'text-blue-300' : 'text-red-300') : 'text-slate-300'}`}>{task.name}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                  {(() => {
                    let filteredAllTasks = allTasks;
                    if (factionFilter === 'nk') {
                      filteredAllTasks = allTasks.filter(t => t.id.startsWith('nk'));
                    } else if (factionFilter === 'dr') {
                      filteredAllTasks = allTasks.filter(t => t.id.startsWith('dr'));
                    }
                    
                    const matchesCount = filteredAllTasks.filter(t => 
                      t.name.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
                      t.type.toLowerCase().includes(ledgerSearch.toLowerCase())
                    ).length;

                    return matchesCount === 0 ? (
                      <div className="p-8 text-center text-slate-600 italic text-sm font-serif">No objectives match your search.</div>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Analysis Results */}
              <div className="lg:col-span-2 space-y-6">
                {focusedObjectiveId ? (
                  <div className="animate-in fade-in zoom-in duration-300 space-y-8">
                    {(() => {
                      const task = allTasks.find(t => t.id === focusedObjectiveId);
                      if (!task) return null;
                      
                      const isNKTask = task.id.startsWith('nk');
                      const relevantFaction = isNKTask ? "Norrath's Keepers" : "Dark Reign";

                      const charsWhoNeed = allCharacters
                        .filter(c => c.faction === relevantFaction && !c.completedTasks.includes(task.id))
                        .sort((a, b) => (b.reputationValue ?? 0) - (a.reputationValue ?? 0));

                      return (
                        <>
                          <div className={`glass-panel p-4 md:p-8 relative overflow-hidden bg-opacity-5 ${isNKTask ? 'border-blue-500/30 bg-blue-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                            <div className="absolute -top-4 -right-4 opacity-5">
                              <Shield className={`w-24 h-24 md:w-32 md:h-32 ${isNKTask ? 'text-blue-400' : 'text-red-400'}`} />
                            </div>
                            <div className="relative z-10">
                              <span className={`px-3 py-1 border text-[9px] md:text-[10px] font-black uppercase rounded-full mb-4 inline-block tracking-widest ${isNKTask ? 'bg-blue-900/30 border-blue-500/30 text-blue-400' : 'bg-red-900/30 border-red-500/30 text-red-400'}`}>{task.type} Focus ({isNKTask ? 'NK' : 'DR'})</span>
                              <h4 className="text-2xl md:text-4xl font-serif font-bold text-white mb-2">{task.name}</h4>
                              <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-2xl mb-8">Intelligence report for all tracked adventurers (including allies) regarding this specific chronicle objective.</p>
                              
                              <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
                                  <span className="text-xs font-black text-red-400 uppercase tracking-widest">Unfinished Chronicles ({charsWhoNeed.length})</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {charsWhoNeed.map(char => {
                                    const isFriend = currentUserUid && char.userId !== currentUserUid;
                                    const { ready, repOk, prevOk, reqRep } = getReadiness(char, task.id);
                                    
                                    return (
                                        <div key={char.id} className={`p-3 rounded-xl border flex flex-col gap-3 transition-all hover:translate-x-1 ${isFriend ? 'bg-purple-900/5 border-purple-500/20' : 'bg-slate-900 border-slate-800'}`}>
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <div>
                                                <div className="text-sm font-bold text-white">{char.name}</div>
                                                <div className={`text-[9px] uppercase font-black tracking-widest ${isFriend ? 'text-purple-400' : 'text-slate-500'}`}>
                                                  {isFriend ? 'Ally' : 'Account Hero'} • Rep: {char.reputationValue ?? 0}
                                                </div>
                                              </div>
                                            </div>
                                            <div className={`flex items-center gap-2 px-2 py-1 border text-[9px] font-black uppercase rounded ${
                                              ready 
                                                ? 'bg-emerald-900/40 border-emerald-500/40 text-emerald-400' 
                                                : 'bg-amber-900/20 border-amber-500/20 text-amber-500'
                                            }`}>
                                              {ready ? 'Ready to Deploy' : 'Awaiting Prep'}
                                            </div>
                                          </div>
                                        
                                        {!ready && (
                                          <div className="flex flex-wrap gap-2 px-2 pb-1">
                                            {!repOk && (
                                              <div className="text-[8px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1">
                                                <Shield className="w-2.5 h-2.5" /> Need {reqRep - (char.reputationValue ?? 0)} more Rep
                                              </div>
                                            )}
                                            {!prevOk && (
                                              <div className="text-[8px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1">
                                                <X className="w-2.5 h-2.5" /> Previous Tiers Incomplete
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {charsWhoNeed.length === 0 && <div className="col-span-full text-xs text-slate-600 italic p-4 text-center">No adventurers currently require this objective.</div>}
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 md:gap-12">
            <div className="lg:col-span-3 space-y-8">
              <h3 className="text-lg md:text-xl font-serif font-bold text-gold flex items-center gap-3">
                <LayoutDashboard className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" /> Coordinated Mission Path
              </h3>

              <div className="space-y-10">
                {[...NORRATHS_KEEPERS_TIERS, ...DARK_REIGN_TIERS].map(tier => {
                  const isNK = tier.tasks[0]?.id.startsWith('nk');
                  const relevantFaction = isNK ? "Norrath's Keepers" : "Dark Reign";
                  
                  const missingInTier = tier.tasks.filter(task => 
                    selectedCharacters.some(char => char.faction === relevantFaction && !char.completedTasks.includes(task.id))
                  );

                  if (missingInTier.length === 0) return null;

                  return (
                    <div key={`${tier.id}-${isNK ? 'nk' : 'dr'}`} className={`glass-panel p-4 md:p-8 border-slate-700/50 bg-slate-900/10 ${!isNK ? 'border-r-red-500/20' : 'border-r-blue-500/20'}`}>
                      <h4 className={`font-serif text-xl md:text-2xl mb-6 flex items-center justify-between ${isNK ? 'text-blue-300' : 'text-red-300'}`}>
                        {isNK ? 'NK' : 'DR'} {tier.name}
                        <span className="text-[8px] md:text-[10px] text-slate-500 uppercase font-sans tracking-[0.2em]">{relevantFaction.split(' ')[0]} Intel</span>
                      </h4>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {missingInTier.map(task => {
                          const charsWhoNeedThis = selectedCharacters.filter(char => 
                            char.faction === relevantFaction && !char.completedTasks.includes(task.id)
                          );
                          
                          return (
                            <div key={task.id} className={`bg-black/60 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 transition-all group ${isNK ? 'hover:border-blue-500/30' : 'hover:border-red-500/30'}`}>
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <span className={`text-[10px] uppercase font-black tracking-tighter ${isNK ? 'text-blue-400/80' : 'text-red-400/80'}`}>{task.type}</span>
                                  <div className={`text-lg font-bold text-white leading-tight transition-colors ${isNK ? 'group-hover:text-blue-300' : 'group-hover:text-red-300'}`}>{task.name}</div>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                  {charsWhoNeedThis.map(char => {
                                    const isFriend = currentUserUid && char.userId !== currentUserUid;
                                    const { ready, repOk, prevOk, reqRep } = getReadiness(char, task.id);
                                    return (
                                      <span 
                                        key={char.id} 
                                        title={ready ? 'READY' : `PREP: ${!repOk ? `[Need ${reqRep - (char.reputationValue ?? 0)} Rep] ` : ''}${!prevOk ? '[Tiers Incomplete]' : ''}`}
                                        className={`px-3 py-1 border-b-2 rounded text-[10px] font-black uppercase tracking-tighter flex items-center gap-2 ${
                                        isFriend 
                                          ? 'bg-purple-900/10 border-purple-500/30 text-purple-400 shadow-[0_2px_10px_rgba(168,85,247,0.1)]' 
                                          : isNK ? 'bg-blue-900/10 border-blue-500/30 text-blue-400' : 'bg-red-900/10 border-red-500/30 text-red-400'
                                      } ${!ready ? 'opacity-40 grayscale' : ''}`}
                                    >
                                      {char.name}
                                      {ready ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> : <X className="w-2.5 h-2.5 text-slate-500" />}
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
            <div className="space-y-6 lg:sticky lg:top-24">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-800 pb-2 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" /> Active Party Status
              </h3>
              
              <div className="space-y-4">
                {selectedCharacters.map(char => {
                  const currentTiers = getTiersByFaction(char.faction as Faction);
                  const totalTasks = currentTiers.flatMap(t => t.tasks).length;
                  const progress = totalTasks > 0 ? (char.completedTasks.length / totalTasks) * 100 : 0;
                  const isFriend = currentUserUid && char.userId !== currentUserUid;
                  
                  return (
                    <div key={char.id} className={`fancy-card border-l-4 p-5 transition-all ${isFriend ? 'border-l-purple-500 bg-purple-900/5' : char.faction === 'Dark Reign' ? 'border-l-red-500 bg-red-900/5' : 'border-l-emerald-500 bg-emerald-900/5'}`}>
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
             : isFriend ? 'bg-purple-950/40 border-purple-500/40 text-purple-400' : char.faction === 'Dark Reign' ? 'bg-red-900/40 border-red-500/40 text-red-400' : 'bg-blue-900/40 border-blue-500/40 text-blue-400'
        }`}>
          {isSelected ? <Check className="w-4 h-4" /> : <span className="font-black text-[10px]">{char.faction === "Dark Reign" ? "DR" : "NK"}</span>}
        </div>
        <div>
          <div className={`text-xs font-bold transition-colors ${isSelected ? 'text-white' : 'group-hover:text-slate-300'}`}>{char.name}</div>
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
