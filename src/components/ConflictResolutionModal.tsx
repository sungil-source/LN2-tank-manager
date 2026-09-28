import React from 'react';
import { AlertTriangle, X, ShieldAlert, CheckCircle2, Ban, Layers } from 'lucide-react';
import type { CellVial } from '../types/inventory';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictingVials: CellVial[];
  emptySlotCount: number;
  sourceVial: CellVial;
  onResolve: (action: 'overwrite' | 'fill_empty_only' | 'cancel') => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflictingVials,
  emptySlotCount,
  sourceVial,
  onResolve,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-600/80 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                슬롯 충돌 알림 (기존 바이알 감지)
              </h3>
              <p className="text-xs text-amber-300 mt-0.5 font-medium">
                대상 범위에 이미 다른 바이알 {conflictingVials.length}개가 보관되어 있습니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onResolve('cancel')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Vial Info */}
        <div className="p-4 bg-slate-950/70 border-b border-slate-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">복사/적용할 원본 세포주:</span>
            <span className="font-bold text-cyan-300 font-mono">
              {sourceVial.cellLineName} (p{sourceVial.passage})
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono text-[11px] border border-cyan-800">
            빈 슬롯 {emptySlotCount}개 + 기존 바이알 {conflictingVials.length}개
          </span>
        </div>

        {/* Conflicting Vials List */}
        <div className="p-4 overflow-y-auto max-h-40 border-b border-slate-800 space-y-1.5 text-xs bg-slate-950/40">
          <div className="text-[11px] font-semibold text-slate-400 mb-1">
            충돌하는 기존 보관 바이알 목록:
          </div>
          {conflictingVials.map((v) => {
            const slotNum = (v.row.charCodeAt(0) - 65) * 9 + v.col;
            return (
              <div
                key={v.id}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-400 text-[11px]">
                    Box {v.boxId} &gt; {slotNum}번 슬롯
                  </span>
                  <span className="text-white font-semibold">{v.cellLineName}</span>
                  <span className="text-slate-400 font-mono text-[10px]">p{v.passage}</span>
                </div>
                <div className="text-slate-400 text-[11px] font-mono">
                  {v.freezeDate} ({v.researcher})
                </div>
              </div>
            );
          })}
        </div>

        {/* 3 Action Choices */}
        <div className="p-5 space-y-2.5">
          <div className="text-xs font-semibold text-slate-300 mb-2">
            작업 방식을 선택해주세요:
          </div>

          {/* Option 1: Overwrite */}
          <button
            type="button"
            onClick={() => onResolve('overwrite')}
            className="w-full p-3.5 rounded-xl border border-rose-800/80 bg-rose-950/30 hover:bg-rose-950/60 hover:border-rose-600 transition-all text-left flex items-start gap-3 group cursor-pointer"
          >
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-rose-200 group-hover:text-white transition-colors flex items-center gap-1.5">
                <span>해당 vial 내용 덮어쓰기</span>
                <span className="text-[10px] bg-rose-900/80 text-rose-200 px-1.5 py-0.5 rounded font-mono">
                  기존 vial 출고 처리 후 신규 등록
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                충돌 바이알 {conflictingVials.length}개를 출고(이력 기록) 처리하고, 모든 대상 슬롯에 새 세포주를 입력합니다.
              </p>
            </div>
          </button>

          {/* Option 2: Fill empty slots only */}
          <button
            type="button"
            onClick={() => onResolve('fill_empty_only')}
            className="w-full p-3.5 rounded-xl border border-cyan-800/80 bg-cyan-950/30 hover:bg-cyan-950/60 hover:border-cyan-600 transition-all text-left flex items-start gap-3 group cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-cyan-200 group-hover:text-white transition-colors flex items-center gap-1.5">
                <span>빈 slot에만 내용 채우기</span>
                <span className="text-[10px] bg-cyan-900/80 text-cyan-200 px-1.5 py-0.5 rounded font-mono">
                  기존 vial 유지 (안전)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                기존 바이알 {conflictingVials.length}개는 변경 없이 유지하고, 비어있는 {emptySlotCount}개 슬롯에만 복사합니다.
              </p>
            </div>
          </button>

          {/* Option 3: Cancel */}
          <button
            type="button"
            onClick={() => onResolve('cancel')}
            className="w-full p-3 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-800 transition-all text-left flex items-center gap-3 text-slate-400 hover:text-white cursor-pointer"
          >
            <Ban className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <span className="text-xs font-semibold">작업 취소 (아무 작업도 수행하지 않음)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
