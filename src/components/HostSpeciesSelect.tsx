import React, { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { getSavedHostSpecies, addCustomHostSpecies } from '../services/speciesService';

interface HostSpeciesSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const HostSpeciesSelect: React.FC<HostSpeciesSelectProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [speciesList, setSpeciesList] = useState<string[]>(() => {
    const list = getSavedHostSpecies();
    if (value && !list.includes(value)) {
      return [...list, value];
    }
    return list;
  });

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSpeciesInput, setNewSpeciesInput] = useState('');

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__ADD_NEW__') {
      setIsAddingNew(true);
      setNewSpeciesInput('');
    } else {
      onChange(val);
    }
  };

  const handleSaveNewSpecies = () => {
    const trimmed = newSpeciesInput.trim();
    if (!trimmed) {
      setIsAddingNew(false);
      return;
    }
    const updated = addCustomHostSpecies(trimmed);
    setSpeciesList(updated);
    onChange(trimmed);
    setIsAddingNew(false);
    setNewSpeciesInput('');
  };

  const handleCancelNew = () => {
    setIsAddingNew(false);
    setNewSpeciesInput('');
  };

  return (
    <div className="w-full">
      {isAddingNew ? (
        <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
          <input
            type="text"
            autoFocus
            disabled={disabled}
            value={newSpeciesInput}
            onChange={(e) => setNewSpeciesInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveNewSpecies();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelNew();
              }
            }}
            placeholder="새 Host species 입력 (예: Canine, Sheep...)"
            className="flex-1 bg-slate-950 border border-cyan-500 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={handleSaveNewSpecies}
            className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
            title="추가 및 선택"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCancelNew}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="취소"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <select
            disabled={disabled}
            value={value || '미지정'}
            onChange={handleSelectChange}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed text-xs sm:text-sm"
          >
            {speciesList.map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
            <option value="__ADD_NEW__" className="text-cyan-400 font-bold bg-slate-900">
              ➕ 직접 항목 추가하기...
            </option>
          </select>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsAddingNew(true)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            title="새 Host species 항목 추가"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
