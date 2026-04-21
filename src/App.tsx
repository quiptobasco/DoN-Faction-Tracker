import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from './lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import Auth from './components/Auth';
import CharacterList from './components/CharacterList';
import CharacterCreate from './components/CharacterCreate';
import CharacterDetails from './components/CharacterDetails';
import CharacterSummary from './components/CharacterSummary';
import { Swords, LogOut, Users, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import FriendsList from './components/FriendsList';
import FriendCharacters from './components/FriendCharacters';

export type View = 'list' | 'create' | 'details' | 'summary' | 'social';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('list');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [summaryIds, setSummaryIds] = useState<string[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // Ensure user has a friend code
        const userDocRef = doc(db, 'users', authUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (!data.friendCode) {
            const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            await updateDoc(userDocRef, { friendCode: newCode });
            setUser({ ...authUser, friendCode: newCode } as any);
          } else {
            setUser({ ...authUser, ...data } as any);
          }
        } else {
          // If profile missing (shouldn't happen with Auth.tsx logic but safety first)
          const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          await setDoc(userDocRef, {
            uid: authUser.uid,
            email: authUser.email,
            friendCode: newCode,
            createdAt: new Date().toISOString()
          });
          setUser({ ...authUser, friendCode: newCode } as any);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-deep-brown text-gold">
        <Swords className="w-12 h-12 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const handleLogout = () => auth.signOut();

  return (
    <div className="flex bg-[#161b22] text-parchment h-screen overflow-hidden">
      {/* Sidebar - Persistent if logged in */}
      <aside className="w-72 bg-[#161b22] border-r border-slate-700 flex flex-col p-6 shadow-2xl shrink-0">
        <div className="mb-10 text-center">
          <div className="text-[10px] tracking-[0.3em] uppercase text-slate-500 mb-1">Adventurer</div>
          <div className="text-sm font-sans font-medium text-slate-300 truncate">{user.email}</div>
        </div>

        <nav className="flex-1 space-y-4">
          <div className="flex items-center gap-3 mb-6 cursor-pointer group" onClick={() => setView('list')}>
            <Swords className="w-8 h-8 text-gold group-hover:rotate-12 transition-transform" />
            <h1 className="text-2xl font-serif font-bold text-gold faction-gold">Norrath Tracker</h1>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setView('list')}
              className={`text-left p-3 rounded-lg transition-all border ${
                view === 'list' 
                  ? 'glass-panel border-blue-500/50 bg-blue-900/20 text-white' 
                  : 'border-transparent text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <div className="text-sm font-bold">Characters</div>
              <div className="text-[10px] uppercase tracking-widest opacity-60">Manage your heroes</div>
            </button>

            <button 
              onClick={() => setView('social')}
              className={`text-left p-3 rounded-lg transition-all border mt-2 flex items-center gap-3 ${
                view === 'social' 
                  ? 'glass-panel border-purple-500/50 bg-purple-900/20 text-white' 
                  : 'border-slate-800 text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <Users className={`w-5 h-5 ${view === 'social' ? 'text-purple-400' : 'text-slate-500'}`} />
              <div className="flex-1">
                <div className="text-sm font-bold">Friends</div>
                <div className="text-[10px] uppercase tracking-widest opacity-60">Social connection</div>
              </div>
            </button>

            <button 
              onClick={() => {
                setView('summary');
              }}
              className={`text-left p-3 rounded-lg transition-all border mt-2 ${
                view === 'summary' 
                  ? 'glass-panel border-emerald-500/50 bg-emerald-900/20 text-white' 
                  : 'border-slate-800 text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <div className="text-sm font-bold text-emerald-400 tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Strategy Room
              </div>
              <div className="text-[10px] uppercase tracking-widest opacity-60">
                {summaryIds.length === 0 ? 'Start Comparison' : `${summaryIds.length} Selected`}
              </div>
            </button>

          </div>
        </nav>

        <div className="mt-auto space-y-4">
          <div className="p-4 glass-panel rounded-xl text-center border-slate-700/50">
            <div className="text-[10px] text-slate-500 mb-1 italic uppercase tracking-wider">World Data</div>
            <div className="text-[11px] text-blue-400 font-sans tracking-wide">Dragons of Norrath</div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-gold hover:text-white text-sm opacity-60 hover:opacity-100 transition-all font-sans"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-8 overflow-y-auto scroll-bg">
        <div className="max-w-5xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {view === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <CharacterList 
                  onAddCharacter={() => setView('create')} 
                  onSelectCharacter={(id) => {
                    setSelectedCharacterId(id);
                    setView('details');
                  }}
                />
              </motion.div>
            )}

            {view === 'create' && (
              <motion.div
                key="create"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <CharacterCreate 
                  onCancel={() => setView('list')} 
                  onSuccess={() => setView('list')}
                />
              </motion.div>
            )}

            {view === 'social' && (
              <motion.div
                key="social"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <FriendsList 
                  selectedIds={summaryIds}
                  onSelectionChange={setSummaryIds}
                  onViewFriendCharacters={(id) => {
                    setSelectedFriendId(id);
                  }}
                />
              </motion.div>
            )}

            {view === 'details' && selectedCharacterId && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <CharacterDetails 
                  characterId={selectedCharacterId}
                  onBack={() => setView('list')}
                />
              </motion.div>
            )}

            {view === 'summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
              >
                <CharacterSummary 
                  characterIds={summaryIds} 
                  currentUserUid={user?.uid}
                  onSelectionChange={setSummaryIds}
                  onBack={() => setView('list')}
                  onClear={() => {
                    setSummaryIds([]);
                    setView('list');
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}


