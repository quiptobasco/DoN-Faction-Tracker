import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, onSnapshot, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ArrowLeft, CheckCircle2, Circle, Shield, Trophy, Trash2, Edit2, X, Save } from 'lucide-react';
import { auth } from '../lib/firebase';
import { getTiersByFaction, Tier, Task, Faction, MIN_REPUTATION, MAX_REPUTATION } from '../lib/constants';
import { getReputationLabel, getReputationClasses } from '../lib/repUtils';
import { handleFirestoreError } from '../lib/firestoreUtils';

interface Character {
  id: string;
  name: string;
  faction: string;
  reputation: string;
  reputationValue?: number;
  hasStartedDoN?: boolean;
  completedTasks: string[];
  userId: string;
  createdAt?: any;
  updatedAt?: any;
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

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedReputationValue, setEditedReputationValue] = useState<number | ''>(0);
  const [editedHasStartedDoN, setEditedHasStartedDoN] = useState(true);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  const initialLoadRef = useRef(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'characters', characterId), (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() } as Character;
        setCharacter(data);
        
        // Initialize edited states only on first load
        if (initialLoadRef.current) {
          setEditedTaskIds(data.completedTasks || []);
          setEditedName(data.name || '');
          setEditedReputationValue(data.reputationValue ?? 0);
          setEditedHasStartedDoN(data.hasStartedDoN ?? true);
          initialLoadRef.current = false;
        }
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'get', `characters/${characterId}`);
    });

    return unsubscribe;
  }, [characterId]);

  const toggleTask = (taskId: string) => {
    if (character && character.hasStartedDoN === false) return;
    setEditedTaskIds(prev => 
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleTierGroup = (tierTasks: Task[], select: boolean) => {
    if (character && character.hasStartedDoN === false) return;
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
        name: editedName,
        reputationValue: Number(editedReputationValue),
        reputation: getReputationLabel(Number(editedReputationValue)),
        hasStartedDoN: editedHasStartedDoN,
        completedTasks: editedTaskIds,
        updatedAt: serverTimestamp()
      });
      setIsEditingProfile(false);
    } catch (err: any) {
      handleFirestoreError(err, 'update', `characters/${characterId}`);
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
    } catch (err: any) {
      handleFirestoreError(err, 'delete', `characters/${characterId}`);
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
  const currentFactionTiers = getTiersByFaction(character.faction as Faction);
  
  const hasChanges = 
    JSON.stringify([...editedTaskIds].sort()) !== JSON.stringify([...character.completedTasks].sort()) ||
    editedName !== character.name ||
    editedHasStartedDoN !== (character.hasStartedDoN ?? true) ||
    Number(editedReputationValue) !== (character.reputationValue ?? 0);

  const totalTasks = currentFactionTiers.flatMap(t => t.tasks).length;

  const discardChanges = () => {
    setEditedTaskIds(character.completedTasks);
    setEditedName(character.name);
    setEditedReputationValue(character.reputationValue ?? 0);
    setEditedHasStartedDoN(character.hasStartedDoN ?? true);
    setIsEditingProfile(false);
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div className="flex items-start md:items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gold shrink-0 mt-1 md:mt-0" id="back_button_id">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              {isEditingProfile ? (
                <input 
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-2xl md:text-4xl font-serif font-bold bg-white/5 border-b-2 border-blue-500 text-white outline-none px-2 focus:bg-white/10 transition-colors w-full md:max-w-md"
                  id="edit_name_input_id"
                />
              ) : (
                <h2 className="text-2xl md:text-4xl font-serif font-bold faction-gold tracking-tight truncate" id="character_name_id">{character.name}</h2>
              )}
              {isOwner && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (isEditingProfile) {
                        discardChanges();
                      } else {
                        setIsEditingProfile(true);
                      }
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      isEditingProfile ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-blue-400'
                    }`}
                    title={isEditingProfile ? "Cancel Editing" : "Edit Profile"}
                    id="toggle_edit_profile_button_id"
                  >
                    {isEditingProfile ? <X className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                  </button>
                  {!isEditingProfile && (
                    <button 
                      onClick={handleDelete}
                      className={`p-2 transition-all flex items-center gap-2 rounded-lg ${
                        deleteConfirm 
                          ? 'bg-red-500 text-white animate-pulse px-3' 
                          : 'text-slate-600 hover:text-red-500'
                      }`}
                      title={deleteConfirm ? "Confirm Permanent Deletion" : "Delete Character"}
                      id="delete_character_button_id"
                    >
                      <Trash2 className="w-5 h-5" />
                      {deleteConfirm && <span className="text-[10px] font-black uppercase tracking-widest">Confirm?</span>}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mt-2 md:mt-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">{character.hasStartedDoN === false ? 'Intended Faction:' : 'Faction:'}</span>
                <span className="text-xs md:text-sm text-blue-300 font-bold tracking-wide uppercase">{character.faction}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-slate-500">Standing:</span>
                {isEditingProfile ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <input 
                      type="number"
                      min={MIN_REPUTATION}
                      max={MAX_REPUTATION}
                      value={editedReputationValue}
                      disabled={!editedHasStartedDoN}
                      onChange={(e) => {
                        if (e.target.value === '') {
                          setEditedReputationValue('');
                          return;
                        }
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) {
                          setEditedReputationValue(Math.max(MIN_REPUTATION, Math.min(MAX_REPUTATION, val)));
                        }
                      }}
                      className={`w-20 bg-white/5 border-b border-emerald-500/50 text-emerald-400 font-bold px-1 outline-none text-sm ${!editedHasStartedDoN ? 'opacity-50 cursor-not-allowed' : ''}`}
                      id="edit_reputation_input_id"
                    />
                    <span className="text-[9px] text-slate-600 font-mono italic">
                      {getReputationLabel(Number(editedReputationValue))}
                      {!editedHasStartedDoN && ' (Locked)'}
                    </span>
                  </div>
                ) : (
                  <span className={`text-xs md:text-sm ${getReputationClasses(character.reputationValue ?? 0)} transition-all duration-300`}>
                    {character.reputation} {character.reputationValue !== undefined && `(${character.reputationValue > 0 ? '+' : ''}${character.reputationValue})`}
                    {character.hasStartedDoN === false && <span className="ml-2 text-[8px] px-1 bg-red-900/40 border border-red-500/30 text-red-300 rounded font-black tracking-widest">NOT STARTED</span>}
                  </span>
                )}
              </div>
              {isEditingProfile && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newState = !editedHasStartedDoN;
                      setEditedHasStartedDoN(newState);
                      if (!newState) {
                        setEditedReputationValue(-100);
                        setEditedTaskIds([]);
                      }
                    }}
                    className={`flex items-center gap-2 px-2 py-1 rounded border transition-all ${
                      !editedHasStartedDoN 
                        ? 'bg-blue-900/20 border-blue-500/40 text-blue-300' 
                        : 'bg-black/20 border-slate-700 text-slate-500'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${!editedHasStartedDoN ? 'bg-blue-500 border-blue-400' : 'border-slate-600'}`}>
                      {!editedHasStartedDoN && <CheckCircle2 className="w-2 h-2 text-white" />}
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest">Haven't started DoN rep</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-start lg:items-end w-full lg:w-auto">
          <div className="flex flex-col items-start lg:items-end w-full">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 lg:text-right">Overall Progression</div>
            <div className="w-full lg:w-48 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700 mb-2">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_0_10px_#3b82f6] transition-all duration-500" 
                style={{ width: `${(editedTaskIds.length / totalTasks) * 100}%` }}
              ></div>
            </div>
            <div className="text-xs text-blue-300 font-mono lg:text-right">{Math.round((editedTaskIds.length / totalTasks) * 100)}% Current</div>
          </div>
          
          {isOwner ? (
            <div className="flex flex-wrap gap-3 mt-4 w-full lg:w-auto">
              {hasChanges && (
                <button
                  onClick={discardChanges}
                  disabled={saving}
                  className="flex-1 lg:flex-none px-4 py-2 rounded-lg font-sans font-bold border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all text-xs"
                  id="discard_changes_button_id"
                >
                  Discard
                </button>
              )}
              <button
                onClick={handleUpdate}
                disabled={!hasChanges || saving}
                className={`flex-1 lg:flex-none px-6 py-2 rounded-lg font-sans font-bold transition-all flex items-center justify-center gap-2 text-xs ${
                  hasChanges 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                }`}
                id="update_chronicles_button_id"
              >
                {saving ? 'Saving...' : (isEditingProfile ? 'Save All' : 'Update Marks')}
                {!saving && hasChanges && <Save className="w-3 h-3" />}
              </button>
            </div>
          ) : (
            <div className="mt-4 w-full text-center lg:text-right px-4 py-2 bg-blue-900/10 border border-blue-500/20 rounded-lg text-[10px] text-blue-400 font-bold uppercase tracking-widest">
              Read-Only Allied Intel
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {currentFactionTiers.map((tier) => {
          const completedCount = tier.tasks.filter(t => editedTaskIds.includes(t.id)).length;
          const allSelected = completedCount === tier.tasks.length;
          const isLocked = character.hasStartedDoN === false;
          
          return (
            <div key={tier.id} className={`fancy-card border-t-2 ${character.faction === "Dark Reign" ? 'border-t-red-500/30' : 'border-t-blue-500/30'} ${isLocked ? 'opacity-40 grayscale' : ''}`}>
              <div className="border-b border-slate-700 pb-3 mb-4 space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-serif text-blue-200">{tier.name}: {tier.reputation}</h3>
                  <span className="text-xs text-slate-500 font-sans">
                    {completedCount}/{tier.tasks.length}
                  </span>
                </div>
                {isOwner && !isLocked && (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => toggleTierGroup(tier.tasks, !allSelected)}
                      className={`text-[9px] uppercase font-black tracking-widest transition-colors ${
                        allSelected ? 'text-blue-400 hover:text-slate-400' : 'text-slate-500 hover:text-blue-400'
                      }`}
                      id={`toggle_tier_${tier.id}_button_id`}
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                )}
                {isLocked && (
                  <div className="text-[9px] text-red-400/60 font-black uppercase tracking-widest">
                    Faction Standing Required
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {tier.tasks.map((task) => {
                  const isCompleted = editedTaskIds.includes(task.id);
                  return (
                    <label 
                      key={task.id}
                      className={`flex items-center gap-3 group ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <input 
                        type="checkbox"
                        checked={isCompleted}
                        disabled={!isOwner || isLocked}
                        onChange={() => toggleTask(task.id)}
                        className={`task-checkbox shrink-0 ${(!isOwner || isLocked) ? 'cursor-not-allowed opacity-50' : ''}`}
                        id={`task_checkbox_${task.id}_id`}
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

    </div>
  );
}
