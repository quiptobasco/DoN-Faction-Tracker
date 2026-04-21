import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, getDocs, doc, updateDoc, deleteDoc, getDoc, setDoc, limit } from 'firebase/firestore';
import { UserPlus, Check, X, Shield, Users as UsersIcon, Copy, Search, ExternalLink } from 'lucide-react';
import FriendCharacters from './FriendCharacters';

interface FriendInfo {
  uid: string;
  email: string;
  friendCode: string;
}

interface Friendship {
  id: string;
  uids: string[];
  status: 'pending' | 'accepted';
  requesterId: string;
  receiverId: string;
}

interface FriendWithProfile extends Friendship {
  profile?: FriendInfo;
}

interface Props {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onViewFriendCharacters: (id: string) => void;
}

export default function FriendsList({ selectedIds, onSelectionChange, onViewFriendCharacters }: Props) {
  const [friendships, setFriendships] = useState<FriendWithProfile[]>([]);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchError, setSearchError] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch self for friend code
    getDoc(doc(db, 'users', auth.currentUser.uid)).then(d => setUserProfile(d.data()));

    const q = query(
      collection(db, 'friendships'),
      where('uids', 'array-contains', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const friendshipData: Friendship[] = [];
      snapshot.forEach((doc) => {
        friendshipData.push({ id: doc.id, ...doc.data() } as Friendship);
      });

      // Fetch profiles for each friend
      const fullFriends = await Promise.all(
        friendshipData.map(async (f) => {
          const friendId = f.uids.find(id => id !== auth.currentUser?.uid);
          if (friendId) {
            const pDoc = await getDoc(doc(db, 'users', friendId));
            return { ...f, profile: { ...pDoc.data(), uid: pDoc.id } as FriendInfo };
          }
          return f;
        })
      );

      setFriendships(fullFriends);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    if (!auth.currentUser || !friendCodeInput) return;

    try {
      // 1. Find user by code
      const q = query(
        collection(db, 'users'), 
        where('friendCode', '==', friendCodeInput.toUpperCase()),
        limit(1)
      );
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setSearchError('No explorer found with that code.');
        return;
      }

      const targetUser = snap.docs[0];
      if (targetUser.id === auth.currentUser.uid) {
        setSearchError("You cannot befriend yourself... yet.");
        return;
      }

      // 2. Check if already friends
      const existing = friendships.find(f => f.uids.includes(targetUser.id));
      if (existing) {
        setSearchError('Friendship record already exists.');
        return;
      }

      // 3. Create request
      const uid1 = auth.currentUser.uid;
      const uid2 = targetUser.id;
      const id = uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;

      await setDoc(doc(db, 'friendships', id), {
        uids: [uid1, uid2],
        status: 'pending',
        requesterId: uid1,
        receiverId: uid2,
        createdAt: new Date().toISOString()
      });

      setFriendCodeInput('');
      setSearchError('');
    } catch (err: any) {
      setSearchError(err.message);
    }
  };

  const acceptFriend = async (friendshipId: string) => {
    await updateDoc(doc(db, 'friendships', friendshipId), {
      status: 'accepted'
    });
  };

  const removeFriend = async (friendshipId: string) => {
    if (!window.confirm('Terminate this alliance? This will revoke mutual access to character chronicles.')) return;
    await deleteDoc(doc(db, 'friendships', friendshipId));
  };

  const copyCode = () => {
    if (userProfile?.friendCode) {
      navigator.clipboard.writeText(userProfile.friendCode);
    }
  };

  if (loading) return <div className="text-center py-12 text-gold animate-pulse">Searching the Tavern...</div>;

  const pendingIncoming = friendships.filter(f => f.status === 'pending' && f.receiverId === auth.currentUser?.uid);
  const pendingOutgoing = friendships.filter(f => f.status === 'pending' && f.requesterId === auth.currentUser?.uid);
  const acceptedFriends = friendships.filter(f => f.status === 'accepted');

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: Search & Discovery */}
        <div className="flex-1 space-y-6">
          <div className="glass-panel p-6 border-purple-500/30 bg-purple-900/5">
            <h2 className="text-xl font-serif font-bold text-gold mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-400" /> Seek New Allies
            </h2>
            <form onSubmit={handleAddFriend} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={friendCodeInput}
                  onChange={(e) => setFriendCodeInput(e.target.value)}
                  placeholder="ENTER FRIEND CODE..."
                  className="fancy-input w-full pl-10 h-11 text-sm tracking-widest uppercase"
                />
              </div>
              <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-all">
                Send Request
              </button>
            </form>
            {searchError && <p className="text-red-400 text-[10px] mt-2 uppercase font-bold">{searchError}</p>}
            
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Your Unique Code</span>
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Share with others</span>
              </div>
              <div className="flex items-center gap-2 bg-black/40 p-3 rounded-lg border border-slate-800">
                <code className="text-gold font-mono text-lg tracking-[0.3em] font-bold flex-1 text-center">{userProfile?.friendCode}</code>
                <button onClick={copyCode} className="p-2 hover:bg-white/10 rounded-md text-slate-400 transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Pending Requests */}
          {(pendingIncoming.length > 0 || pendingOutgoing.length > 0) && (
            <div className="space-y-4">
              <h3 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">Chronicle Requests</h3>
              <div className="space-y-2">
                {pendingIncoming.map(f => (
                  <div key={f.id} className="bg-slate-900/50 border border-amber-500/20 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{f.profile?.email}</div>
                      <div className="text-[10px] text-amber-500 uppercase font-bold">Incoming Request</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => acceptFriend(f.id)} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 border border-emerald-500/20">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeFriend(f.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 border border-red-500/20">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {pendingOutgoing.map(f => (
                  <div key={f.id} className="bg-slate-900/50 border border-slate-700 p-4 rounded-xl flex items-center justify-between opacity-70">
                    <div>
                      <div className="text-sm font-bold text-white">{f.profile?.email}</div>
                      <div className="text-[10px] text-slate-400 uppercase">Wait for acceptance...</div>
                    </div>
                    <button onClick={() => removeFriend(f.id)} className="text-[10px] text-slate-500 hover:text-red-400 uppercase font-bold">
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Actual Friends List */}
        <div className="w-full md:w-96 space-y-4">
          <h2 className="text-xl font-serif font-bold text-gold flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-blue-400" /> Your Fellowship
          </h2>
          
          <div className="space-y-3">
            {acceptedFriends.length === 0 ? (
              <div className="text-center py-12 glass-panel border-dashed border-slate-800 opacity-50">
                <Shield className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">No alliances formed.<br/>Share your code to begin.</p>
              </div>
            ) : (
              acceptedFriends.map(f => (
                <div 
                  key={f.id}
                  onClick={() => setActiveFriendId(f.profile?.uid || null)}
                  className={`glass-panel p-4 cursor-pointer transition-all border-l-4 ${
                    activeFriendId === f.profile?.uid 
                      ? 'bg-blue-900/20 border-l-blue-400 ring-1 ring-blue-500/30' 
                      : 'border-l-transparent hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate">{f.profile?.email}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-[10px] text-slate-500 uppercase">Allied Archer</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFriend(f.id); }} 
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      title="Terminate Alliance"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Friend Detail Overlay/Sub-view */}
      {activeFriendId && (
        <div className="mt-8 pt-8 border-t border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-serif font-bold text-blue-400">Allied Chronicles</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Viewing characters of your ally</p>
            </div>
            <button onClick={() => setActiveFriendId(null)} className="text-xs text-slate-500 hover:text-white uppercase font-bold">
              Close View
            </button>
          </div>
          
          <div className="bg-blue-900/5 p-6 rounded-2xl border border-blue-500/10">
             <FriendCharacters 
               friendId={activeFriendId} 
               selectedIds={selectedIds}
               onSelectionChange={onSelectionChange}
             />
          </div>
        </div>
      )}
    </div>
  );
}
