import React from 'react';
import { Database, Box as BoxIcon, ChevronRight, Layers, MapPin, AlertTriangle } from 'lucide-react';
import type { LN2Tank, CanisterRack, CryoBox, CellVial } from '../types/inventory';

interface TankNavigatorProps {
  tanks: LN2Tank[];
  selectedTank: LN2Tank;
  onSelectTank: (tank: LN2Tank) => void;
  racks: CanisterRack[];
  selectedRackId: string;
  onSelectRack: (rackId: string) => void;
  boxes: CryoBox[];
  selectedBox: CryoBox;
  onSelectBox: (box: CryoBox) => void;
  vials: CellVial[];
}

export const TankNavigator: React.FC<TankNavigatorProps> = ({
  tanks,
  selectedTank,
  onSelectTank,
  racks,
  selectedRackId,
  onSelectRack,
  boxes,
  selectedBox,
  onSelectBox,
  vials,
}) => {
  const currentRacks = racks.filter((r) => r.tankId === selectedTank.id);
  const currentBoxes = boxes.filter(
    (b) => b.tankId === selectedTank.id && b.rackId === selectedRackId
  );

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl">
      {/* Tank Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            LN2 Tank 인벤토리 네비게이터
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {tanks.map((tank) => {
            const isSelected = tank.id === selectedTank.id;
            const tankVials = vials.filter((v) => v.tankId === tank.id && v.status === 'Stored');

            return (
              <button
                key={tank.id}
                onClick={() => onSelectTank(tank)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-950/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    tank.ln2LevelPercentage < 20
                      ? 'bg-rose-500 animate-ping'
                      : tank.ln2LevelPercentage < 50
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <span>{tank.name.split('(')[0].trim()}</span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                  {tankVials.length} vials
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Racks & Boxes Breadcrumb & Selector */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Canisters / Racks Selection */}
        <div className="md:col-span-4">
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>캐니스터 / 랙 (Canister / Rack)</span>
          </label>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {currentRacks.map((rack) => {
              const isSelected = rack.id === selectedRackId;
              const rackVials = vials.filter(
                (v) => v.tankId === selectedTank.id && v.rackId === rack.id && v.status === 'Stored'
              );

              return (
                <button
                  key={rack.id}
                  onClick={() => onSelectRack(rack.id)}
                  className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{rack.name.split('(')[0].trim()}</span>
                    <span
                      className={`text-[10px] px-1 rounded ${
                        isSelected ? 'bg-cyan-800 text-cyan-100' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {rackVials.length}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cryo Boxes Selection */}
        <div className="md:col-span-8">
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
            <BoxIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span>크라이오 박스 선택 (Cryo Box: 9x9 / 10x10)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {currentBoxes.map((box) => {
              const isSelected = box.id === selectedBox.id;
              const totalSlots = box.dimension * box.dimension;
              const occupiedVials = vials.filter(
                (v) => v.boxId === box.id && v.status === 'Stored'
              );
              const occupancyRate = Math.round((occupiedVials.length / totalSlots) * 100);

              return (
                <button
                  key={box.id}
                  onClick={() => onSelectBox(box)}
                  className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-400/80 shadow-md shadow-cyan-950/30'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div
                    className="absolute top-0 left-0 bottom-0 w-1 opacity-80"
                    style={{ backgroundColor: box.colorTag }}
                  />
                  <div className="pl-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                        {box.name.split(':')[0]}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {box.dimension}x{box.dimension}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 text-[10px]">
                        {occupiedVials.length}/{totalSlots}구
                      </span>
                      <span
                        className={`text-[10px] font-bold font-mono ${
                          occupancyRate > 90
                            ? 'text-rose-400'
                            : occupancyRate > 70
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {occupancyRate}%
                      </span>
                    </div>

                    {/* Progress mini bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1 mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${occupancyRate}%`,
                          backgroundColor:
                            occupancyRate > 90 ? '#f43f5e' : occupancyRate > 70 ? '#f59e0b' : '#10b981',
                        }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
