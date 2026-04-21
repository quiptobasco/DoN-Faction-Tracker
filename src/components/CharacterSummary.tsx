import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Trash2, LayoutDashboard, UserCheck, ShieldCheck, Sparkles, Users, User, Shield } from 'lucide-react';
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
          <p className="text-xs text-slate-500 uppercase tracking-[0.2em] mt-2 font-bold">Assemble your raiding party for Norrath</p>
        </div>
        
        <div className="flex gap-4">
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

      {/* Mission Briefing Section (Only if characters selected) */}
      {characterIds.length > 0 ? (
        <div className="pt-12 border-t-2 border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
