import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, Circle, Shield, Trophy, Trash2 } from 'lucide-react';
import { auth } from '../lib/firebase';
import { NORRATHS_KEEPERS_TIERS, Tier, Task } from '../lib/constants';

interface Character {
  id: string;
  name: string;
  level: number;
  faction: string;
  reputation: string;
  reputationValue?: number;
  completedTasks: string[];
  userId: string;
}

interface Props {
  characterId: string;
  onBack: () => void;
}

export default function CharacterDetails({ characterId, onBack }: Props) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [editedTaskIds, setEditedTaskIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'characters', characterId), (doc) => {
      if (doc.exists()) {
        const data = { id: doc.id, ...doc.data() } as Character;
        setCharacter(data);
        // Only initialize state if we don't have a character yet (first load)
        // or if we want to sync after a successful save.
        // We'll use a functional update to check the current character value safely.
        setEditedTaskIds(prev => (prev.length === 0 && !character) ? data.completedTasks : prev);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [characterId, character]); // Added character to dependencies to handle the initial null check correctly

  const toggleTask = (taskId: string) => {
    setEditedTaskIds(prev => 
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleTierGroup = (tierTasks: Task[], select: boolean) => {
    const tierIds = tierTasks.map(t => t.id);
    if (select) {
      // Add all missing ids from this tier
      setEditedTaskIds(prev => {
        const toAdd = tierIds.filter(id => !prev.includes(id));
        return [...prev, ...toAdd];
      });
    } else {
      // Remove all ids from this tier
      setEditedTaskIds(prev => prev.filter(id => !tierIds.includes(id)));
    }
  };

  const handleUpdate = async () => {
    if (!character) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'characters', characterId), {
        completedTasks: editedTaskIds,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error updating task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!character) return;
    
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
      return;
    }

    setSaving(true);
    try {
      await deleteDoc(doc(db, 'characters', characterId));
      onBack();
    } catch (err) {
      console.error('Error deleting character:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto"></div>
      </div>
    );
  }

  if (!character) return null;

  const isOwner = character.userId === auth.currentUser?.uid;
  const isNKSide = character.faction === "Norrath's Keepers";
  const hasChanges = JSON.stringify([...editedTaskIds].sort()) !== JSON.stringify([...character.completedTasks].sort());

  const totalTasks = NORRATHS_KEEPERS_TIERS.flatMap(t => t.tasks).length;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gold">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-4xl font-serif font-bold faction-gold tracking-tight">{character.name}</h2>
              {isOwner && (
                <button 
                  onClick={handleDelete}
                  className={`p-2 transition-all flex items-center gap-2 rounded-lg ${
                    deleteConfirm 
                      ? 'bg-red-500 text-white animate-pulse px-3' 
                      : 'text-slate-600 hover:text-red-500'
                  }`}
                  title={deleteConfirm ? "Confirm Permanent Deletion" : "Delete Character"}
                >
                  <Trash2 className="w-5 h-5" />
                  {deleteConfirm && <span className="text-[10px] font-black uppercase tracking-widest">Confirm?</span>}
                </button>
              )}
            </div>
            <div className="flex items-center gap-6 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">Faction:</span>
                <span className="text-sm text-blue-300 font-bold tracking-wide uppercase">{character.faction}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">Standing:</span>
                <span className="text-sm text-emerald-400 font-bold tracking-wide uppercase stat-glow">
                  {character.reputation} {character.reputationValue !== undefined && `(${character.reputationValue > 0 ? '+' : ''}${character.reputationValue})`}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-right flex flex-col items-end">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Overall Progression</div>
          <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-2">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_#3b82f6] transition-all duration-500" 
              style={{ width: `${(editedTaskIds.length / totalTasks) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-blue-300 font-mono">{Math.round((editedTaskIds.length / totalTasks) * 100)}% Current</div>
          
          {isOwner ? (
            <div className="flex gap-4 mt-4">
              {hasChanges && (
                <button
                  onClick={() => setEditedTaskIds(character.completedTasks)}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg font-sans font-bold border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all"
                >
                  Discard
                </button>
              )}
              <button
                onClick={handleUpdate}
                disabled={!hasChanges || saving}
                className={`px-6 py-2 rounded-lg font-sans font-bold transition-all ${
                  hasChanges 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                }`}
              >
                {saving ? 'Saving...' : 'Update Chronicles'}
              </button>
            </div>
          ) : (
            <div className="mt-4 px-4 py-2 bg-blue-900/10 border border-blue-500/20 rounded-lg text-[10px] text-blue-400 font-bold uppercase tracking-widest">
              Read-Only Allied Intel
            </div>
          )}
        </div>
      </div>

      {!isNKSide ? (
        <div className="fancy-card p-12 text-center border-t-2 border-t-emerald-500/30">
          <Shield className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-2xl font-serif text-blue-200 mb-2">Dark Reign Intel Pending</h3>
          <p className="text-slate-400 max-w-md mx-auto">The scouts are still gathering information for the Dark Reign faction. For now, only Norrath's Keepers progression is available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {NORRATHS_KEEPERS_TIERS.map((tier) => {
            const completedCount = tier.tasks.filter(t => editedTaskIds.includes(t.id)).length;
            const allSelected = completedCount === tier.tasks.length;
            
            return (
              <div key={tier.id} className="fancy-card border-t-2 border-t-blue-500/30">
                <div className="border-b border-slate-700 pb-3 mb-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-serif text-blue-200">{tier.name}: {tier.reputation}</h3>
                    <span className="text-xs text-slate-500 font-sans">
                      {completedCount}/{tier.tasks.length}
                    </span>
                  </div>
                  {isOwner && (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => toggleTierGroup(tier.tasks, !allSelected)}
                        className={`text-[9px] uppercase font-black tracking-widest transition-colors ${
                          allSelected ? 'text-blue-400 hover:text-slate-400' : 'text-slate-500 hover:text-blue-400'
                        }`}
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {tier.tasks.map((task) => {
                    const isCompleted = editedTaskIds.includes(task.id);
                    return (
                      <label 
                        key={task.id}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <input 
                          type="checkbox"
                          checked={isCompleted}
                          disabled={!isOwner}
                          onChange={() => toggleTask(task.id)}
                          className={`task-checkbox shrink-0 ${!isOwner ? 'cursor-not-allowed opacity-50' : ''}`}
                        />
                        <div className={`text-sm transition-colors ${
                          isCompleted ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-200'
                        }`}>
                          <span className="opacity-50 text-[10px] uppercase font-sans mr-1">{task.type.split(' ')[0]}:</span>
                          {task.name}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
