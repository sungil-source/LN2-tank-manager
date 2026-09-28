import React, { useState, useEffect } from 'react';
import { X, Flame, AlertTriangle, User as UserIcon, CheckCircle2 } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { CellVial } from '../types/inventory';

interface BatchThawModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVials: CellVial[];
  currentUser?: User | null;
  onBatchThaw: (vialIds: string[], thawedBy: string, purpose: string, notes?: string) => void;
}

export const BatchThawModal: React.FC<BatchThawModalProps> = ({
  isOpen,
  onClose,
  selectedVials,
  currentUser,
  onBatchThaw,
}) => {
  const defaultThawedByName = currentUser?.displayName || currentUser?.email?.split('@')[0] || '';
  const [thawedBy, setThawedBy] = useState(defaultThawedByName);
  const [purpose, setPurpose] = useState('실험 진행 (실험실 연구)');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (currentUser) {
      const name = currentUser.displayName || currentUser.email?.split('@')[0] || '';
      if (name) setThawedBy(name);
    }
  }, [currentUser]);

  if (!isOpen || selectedVials.length === 0) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thawedBy.trim()) {
      alert('해동 연구원(출고자) 이름을 입력해주세요.');
      return;
    }

    const vialIds = selectedVials.map((v) => v.id);
    onBatchThaw(vialIds, thawedBy.trim(), purpose.trim(), notes.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-800/80 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span>일괄 바이알 해동 출고</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 text-xs font-mono font-bold border border-amber-700">
                  {selectedVials.length}개 바이알
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                선택된 바이알들을 LN2 보관 상태에서 해동 출고 처리하고 감사 로그를 생성합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-950/40 border-b border-amber-900/50 px-5 py-2.5 flex items-center gap-2 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            출고 완료 시 해당 슬롯들은 <strong>빈 슬롯</strong>으로 전환되며 각 바이알별 출고 이력이 영구 기록됩니다.
          </span>
        </div>

        {/* Selected Vials List */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800 max-h-48 overflow-y-auto">
          <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
            <span>출고 대상 바이알 목록 ({selectedVials.length}건)</span>
            <span className="font-mono text-[10px] text-slate-500">1 바이알 = 1 슬롯 출고</span>
          </div>
          <div className="space-y-1.5">
            {selectedVials.map((v) => {
              const slotNum = (v.row.charCodeAt(0) - 65) * 9 + v.col;
              return (
                <div
                  key={v.id}
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-400 text-[11px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      Box {v.boxId} &gt; {slotNum}번 슬롯
                    </span>
                    <span className="font-bold text-white">{v.cellLineName}</span>
                    <span className="font-mono text-[11px] text-cyan-300">p{v.passage}</span>
                    <span className="text-[10px] text-slate-500">({v.cellType || '미지정'})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {v.freezeDate || '미입력'} {v.researcher ? `(${v.researcher})` : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Thawed By */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-medium text-slate-300">
                해동 연구원 (출고자 성명) <span className="text-rose-400">*</span>
              </label>
              {currentUser && (
                <span className="text-[10px] text-cyan-400 flex items-center gap-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400" /> 구글 계정 연동
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                required
                value={thawedBy}
                onChange={(e) => setThawedBy(e.target.value)}
                placeholder="해동자 성명 입력"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-white font-medium focus:outline-hidden focus:border-amber-500"
              />
              <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              해동 / 출고 목적 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="예: Drug Screening 실험, 형질전환, 타 연구실 분양 등..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">출고 특이사항 및 메모</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="일괄 출고 관련 특이사항 기록..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-amber-500 resize-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              총 {selectedVials.length}개의 출고 이력 로그가 생성됩니다.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-950 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Flame className="w-4 h-4" />
                <span>{selectedVials.length}개 바이알 일괄 출고 확인</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
