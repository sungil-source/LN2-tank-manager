import React, { useState } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Box as BoxIcon,
  Thermometer,
  Database,
  Search,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  ArrowUpDown,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import type { LN2Tank, CanisterRack, CryoBox, CellVial } from '../types/inventory';

interface RackSidebarProps {
  tanks: LN2Tank[];
  selectedTank: LN2Tank;
  racks: CanisterRack[];
  selectedRackId: string;
  onSelectRack: (rackId: string) => void;
  boxes: CryoBox[];
  selectedBox: CryoBox;
  onSelectBox: (box: CryoBox) => void;
  vials: CellVial[];
  onUpdateRackDescription?: (rackId: string, description: string) => void;
  canEdit?: boolean;
}

export const RackSidebar: React.FC<RackSidebarProps> = ({
  selectedTank,
  racks,
  selectedRackId,
  onSelectRack,
  boxes,
  selectedBox,
  onSelectBox,
  vials,
  onUpdateRackDescription,
  canEdit = true,
}) => {
  // Track open/closed state for each rack accordion (default open the selected rack)
  const [expandedRacks, setExpandedRacks] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    racks.forEach((r) => {
      init[r.id] = r.id === selectedRackId || r.id === 'RACK-1';
    });
    return init;
  });

  const [filterBoxText, setFilterBoxText] = useState('');
  const [editingRackId, setEditingRackId] = useState<string | null>(null);
  const [rackDescInput, setRackDescInput] = useState<string>('');

  const handleSaveRackDesc = (rackId: string) => {
    if (onUpdateRackDescription) {
      onUpdateRackDescription(rackId, rackDescInput.trim());
    }
    setEditingRackId(null);
  };

  const toggleRack = (rackId: string) => {
    setExpandedRacks((prev) => ({
      ...prev,
      [rackId]: !prev[rackId],
    }));
    onSelectRack(rackId);
  };

  const handleExpandAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    racks.forEach((r) => {
      next[r.id] = expand;
    });
    setExpandedRacks(next);
  };

  // Calculate total stored vials in the tank
  const totalStoredVials = vials.filter((v) => v.status === 'Stored').length;
  const tankCapacity = 6 * 10 * 81; // 4,860
  const tankOccupancyPct = Math.round((totalStoredVials / tankCapacity) * 100);

  return (
    <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl flex flex-col overflow-hidden">
      {/* Tank Header Info */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/70">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white tracking-tight">LN2 Tank Racks (1~6)</h2>
              <p className="text-[11px] text-slate-400 font-mono">
                총 6 Racks × 10 Boxes (4,860구)
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
            {totalStoredVials} vials ({tankOccupancyPct}%)
          </span>
        </div>

        {/* Quick Filter Box & Expand/Collapse All */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterBoxText}
              onChange={(e) => setFilterBoxText(e.target.value)}
              placeholder="Box 검색 (예: 1-A, 2-D)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 font-mono"
            />
          </div>
          <button
            onClick={() => handleExpandAll(!Object.values(expandedRacks).every(Boolean))}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded-lg border border-slate-700 font-medium transition-colors"
            title="전체 펼치기 / 접기"
          >
            {Object.values(expandedRacks).every(Boolean) ? '모두접기' : '모두펼치기'}
          </button>
        </div>
      </div>

      {/* Vertical Rack List (Rack 1 to Rack 6) */}
      <div className="p-3 overflow-y-auto max-h-[calc(100vh-280px)] space-y-2.5 scrollbar-thin">
        {racks.map((rack, rackIdx) => {
          const rackNum = rackIdx + 1; // 1 to 6
          const isExpanded = !!expandedRacks[rack.id];
          const isCurrentRackSelected = rack.id === selectedRackId;

          // All 10 boxes for this rack (1-A to 1-J, strictly sorted from Top A to Bottom J)
          const rackBoxes = boxes.filter((b) => b.rackId === rack.id);

          // Vials in this rack
          const rackVials = vials.filter(
            (v) => v.rackId === rack.id && v.status === 'Stored'
          );
          const rackCapacity = 10 * 81; // 810
          const rackOccupancy = Math.round((rackVials.length / rackCapacity) * 100);

          return (
            <div
              key={rack.id}
              className={`rounded-xl border transition-all overflow-hidden ${
                isCurrentRackSelected
                  ? 'border-cyan-500/60 bg-slate-950/80 shadow-md shadow-cyan-950/30'
                  : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'
              }`}
            >
              {/* Rack Accordion Header Button */}
              <button
                type="button"
                onClick={() => toggleRack(rack.id)}
                className={`w-full p-2.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                  isCurrentRackSelected ? 'bg-cyan-950/30' : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs font-mono ${
                      isCurrentRackSelected
                        ? 'bg-cyan-500 text-white shadow-xs'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {rackNum}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-white tracking-tight">
                        Rack {rackNum}
                      </span>
                      {rack.description && (
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px] hidden sm:inline" title={rack.description}>
                          • {rack.description}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                      <span>{rackVials.length} vials</span>
                      <span className="text-slate-600">•</span>
                      <span
                        className={
                          rackOccupancy > 80
                            ? 'text-rose-400'
                            : rackOccupancy > 50
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }
                      >
                        {rackOccupancy}% 점유
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-slate-400">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-cyan-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              </button>

              {/* Accordion Content: Dropdown of 10 Boxes (Top 1-A to Bottom 1-J) */}
              {isExpanded && (
                <div className="p-2 pt-1 border-t border-slate-800/80 bg-slate-900/60 space-y-1.5">
                  {/* Rack Description Banner & Edit */}
                  <div className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px]">
                    {editingRackId === rack.id ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-cyan-400 font-semibold">
                          <span>Rack {rackNum} 설명 수정</span>
                          <button
                            type="button"
                            onClick={() => setEditingRackId(null)}
                            className="text-slate-400 hover:text-white cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={rackDescInput}
                          onChange={(e) => setRackDescInput(e.target.value)}
                          placeholder="Rack 설명 입력 (예: 주요 보관 세포주, 프로젝트명)..."
                          className="w-full bg-slate-900 border border-cyan-500 rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-hidden"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRackDesc(rack.id);
                            if (e.key === 'Escape') setEditingRackId(null);
                          }}
                        />
                        <div className="flex justify-end gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => setEditingRackId(null)}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveRackDesc(rack.id)}
                            className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Check className="w-3 h-3" /> 저장
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="text-[11px] text-slate-300 leading-tight truncate min-w-0">
                          <span className="text-[10px] text-slate-500 mr-1 font-mono">설명:</span>
                          {rack.description ? (
                            <span className="text-slate-300 font-medium" title={rack.description}>
                              {rack.description}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">등록된 설명이 없습니다.</span>
                          )}
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRackId(rack.id);
                              setRackDescInput(rack.description || '');
                            }}
                            className="text-slate-400 hover:text-cyan-400 p-1 rounded hover:bg-slate-800 transition-colors flex items-center gap-1 text-[10px] shrink-0 cursor-pointer"
                            title="Rack 설명 수정"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>{rack.description ? '수정' : '설명 추가'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 px-2 py-0.5 uppercase tracking-wider font-mono">
                    <span>▲ 상단 (Top Tier 1-A)</span>
                    <span>10단 세로 적재</span>
                  </div>

                  {rackBoxes
                    .filter((b) =>
                      filterBoxText.trim()
                        ? b.id.toLowerCase().includes(filterBoxText.toLowerCase()) ||
                          b.name.toLowerCase().includes(filterBoxText.toLowerCase())
                        : true
                    )
                    .map((box, bIdx) => {
                      const isSelected = box.id === selectedBox.id;
                      const boxVials = vials.filter(
                        (v) => v.boxId === box.id && v.status === 'Stored'
                      );
                      const totalSlots = 81; // 9x9
                      const occupancy = Math.round((boxVials.length / totalSlots) * 100);
                      const tier = bIdx + 1; // 1 to 10
                      const isTop = tier === 1;
                      const isBottom = tier === 10;

                      return (
                        <button
                          key={box.id}
                          onClick={() => onSelectBox(box)}
                          className={`w-full p-2 rounded-lg text-left transition-all flex items-center justify-between group cursor-pointer border ${
                            isSelected
                              ? 'bg-cyan-600/20 border-cyan-400 text-white shadow-xs font-semibold'
                              : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Color indicator stripe */}
                            <span
                              className="w-1.5 h-6 rounded-full flex-shrink-0"
                              style={{ backgroundColor: box.colorTag }}
                            />

                            <div className="min-w-0 leading-tight">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-bold text-white tracking-wide">
                                  Box {box.id}
                                </span>
                                {isTop && (
                                  <span className="text-[9px] px-1 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                                    TOP (1단)
                                  </span>
                                )}
                                {isBottom && (
                                  <span className="text-[9px] px-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                                    BOTTOM (10단)
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Tier {tier} • 9x9 (81구)
                              </span>
                            </div>
                          </div>

                          {/* Occupancy Indicator */}
                          <div className="text-right flex flex-col items-end flex-shrink-0">
                            <span className="text-[11px] font-mono font-semibold text-slate-200">
                              {boxVials.length}
                              <span className="text-slate-500 font-normal">/81</span>
                            </span>
                            <div className="w-12 bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${occupancy}%`,
                                  backgroundColor:
                                    occupancy > 90 ? '#f43f5e' : occupancy > 60 ? '#f59e0b' : '#10b981',
                                }}
                              />
                            </div>
                          </div>
                        </button>
                      );
                    })}

                  <div className="text-[10px] text-slate-500 text-center py-1 uppercase tracking-wider font-mono">
                    ▼ 하단 (Bottom Tier {rackNum}-J)
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
