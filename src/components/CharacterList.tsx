import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { PlusCircle, Shield, User, Trash2 } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  level: number;
  faction: string;
  reputation: string;
  reputationValue?: number;
}

interface Props {
  onAddCharacter: () => void;
  onSelectCharacter: (id: string) => void;
}

export default function CharacterList({ onAddCharacter, onSelectCharacter }: Props) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'characters'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const charData: Character[] = [];
      snapshot.forEach((doc) => {
        charData.push({ id: doc.id, ...doc.data() } as Character);
      });
      setCharacters(charData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await deleteDoc(doc(db, 'characters', id));
    } catch (err) {
      console.error('Error deleting character:', err);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
        <h2 className="text-2xl font-serif font-bold text-gold">Your Adventurers</h2>
        <button 
          onClick={onAddCharacter}
          className="fancy-button flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" /> Add Character
        </button>
      </div>

      {characters.length === 0 ? (
        <div className="fancy-card p-12 text-center border-dashed border-slate-600 bg-transparent">
          <User className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500 italic font-serif">No characters tracked yet. Begin your chronicles by adding a character.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {characters.map((char) => {
            return (
              <div 
                key={char.id}
                onClick={() => onSelectCharacter(char.id)}
                className="glass-panel p-6 cursor-pointer transition-all group relative border-t-2 border-t-transparent hover:border-blue-500/50 hover:bg-blue-900/10"
              >
                <div className="absolute top-2 right-2 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Shield className="w-12 h-12 text-blue-400" />
                </div>
                
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">{char.name}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-blue-400 uppercase tracking-widest mt-1">
                    Level {char.level} <span className="opacity-30">•</span> {char.faction}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                    <div className="text-[10px] uppercase tracking-tighter text-slate-500">Reputation</div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-bold text-emerald-400 stat-glow uppercase tracking-wider">
                        {char.reputation} {char.reputationValue !== undefined && `(${char.reputationValue > 0 ? '+' : ''}${char.reputationValue})`}
                      </div>
                      <button 
                        onClick={(e) => handleDelete(e, char.id, char.name)}
                        className="p-1.5 text-slate-600 hover:text-red-400 transition-colors z-20"
                        title="Delete Character"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
