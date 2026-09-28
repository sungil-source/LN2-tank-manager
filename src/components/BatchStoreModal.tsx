import React, { useState, useEffect } from 'react';
import { X, Layers, CheckCircle2, User as UserIcon, Sparkles } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { CellVial, CryoBox } from '../types/inventory';
import { HostSpeciesSelect } from './HostSpeciesSelect';

interface BatchStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlots: Array<{ row: string; col: number; slotNumber: number }>;
  box: CryoBox;
  currentUser?: User | null;
  onBatchAdd: (newVials: CellVial[]) => void;
}

export const BatchStoreModal: React.FC<BatchStoreModalProps> = ({
  isOpen,
  onClose,
  selectedSlots,
  box,
  currentUser,
  onBatchAdd,
}) => {
  const userAccountName = currentUser?.displayName || currentUser?.email?.split('@')[0] || '';

  const [formData, setFormData] = useState({
    cellLineName: '',
    cellType: '미지정' as CellVial['cellType'],
    tissueOrigin: '',
    passage: 1,
    freezeDate: '',
    cultureMedium: '',
    freezingMedium: '',
    geneModification: '',
    researcher: userAccountName,
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      const defaultUser = currentUser?.displayName || currentUser?.email?.split('@')[0] || '';
      setFormData({
        cellLineName: '',
        cellType: '미지정' as CellVial['cellType'],
        tissueOrigin: '',
        passage: 1,
        freezeDate: '',
        cultureMedium: '',
        freezingMedium: '',
        geneModification: '',
        researcher: defaultUser,
        notes: '',
      });
    }
  }, [isOpen, currentUser]);

  if (!isOpen || selectedSlots.length === 0) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cellLineName.trim()) {
      alert('세포주명을 입력해주세요.');
      return;
    }

    const timestamp = Date.now().toString().slice(-6);
    const newVials: CellVial[] = selectedSlots.map((slot, idx) => ({
      id: `VIAL-${timestamp}-${idx + 1}`,
      cellLineName: formData.cellLineName.trim(),
      cellType: formData.cellType?.trim() || '미지정',
      tissueOrigin: formData.tissueOrigin.trim(),
      passage: Number(formData.passage) || 1,
      tankId: box.tankId,
      rackId: box.rackId,
      boxId: box.id,
      row: slot.row,
      col: slot.col,
      freezeDate: formData.freezeDate?.trim() || '',
      vialsStored: 1, // 1 slot = 1 vial
      cultureMedium: formData.cultureMedium?.trim() || '미지정',
      freezingMedium: formData.freezingMedium?.trim() || '미지정',
      geneModification: formData.geneModification?.trim() || '',
      researcher: formData.researcher?.trim() || '',
      notes: formData.notes?.trim() || '',
      status: 'Stored',
      updatedAt: new Date().toISOString(),
    }));

    onBatchAdd(newVials);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-800/80 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span>일괄 바이알 동결 등록 (입고)</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-xs font-mono font-bold border border-cyan-700">
                  {selectedSlots.length}개 슬롯
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                선택된 {selectedSlots.length}개의 빈 슬롯에 동일한 세포주 정보를 한 번에 일괄 등록합니다.
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

        {/* Selected Slots Badges */}
        <div className="bg-slate-950/60 px-5 py-2.5 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium shrink-0">대상 슬롯:</span>
          <div className="flex items-center gap-1.5 flex-wrap max-h-16 overflow-y-auto">
            {selectedSlots.map((s) => (
              <span
                key={`${s.row}-${s.col}`}
                className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-800 text-cyan-300 font-mono text-[11px] font-semibold"
              >
                Box {box.id} &gt; {s.slotNumber}번 슬롯
              </span>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Quick Presets */}
          <div>
            <label className="block font-medium text-slate-400 mb-1.5">빠른 프리셋 (세포주명 예시)</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['HEK293T', 'HeLa', 'Jurkat', 'A549', 'K562', 'hiPSC', 'MCF-7'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setFormData({ ...formData, cellLineName: preset })}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-mono transition-colors cursor-pointer border border-slate-700"
                >
                  +{preset}
                </button>
              ))}
            </div>
          </div>

          {/* Cell Line Name & Passage */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-300 mb-1">
                세포주명 (Cell Line Name) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.cellLineName}
                onChange={(e) => setFormData({ ...formData, cellLineName: e.target.value })}
                placeholder="예: HEK293T, Jurkat, HeLa..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Passage (P#)</label>
              <input
                type="number"
                min="0"
                value={formData.passage}
                onChange={(e) => setFormData({ ...formData, passage: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-hidden focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Host species & 기원 조직 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Host species <span className="text-[10px] text-slate-400">(숙주 생물종)</span>
              </label>
              <HostSpeciesSelect
                value={formData.cellType || '미지정'}
                onChange={(val) => setFormData({ ...formData, cellType: val })}
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                기원 조직 <span className="text-[10px] text-slate-400">(Origin Tissue)</span>
              </label>
              <input
                type="text"
                placeholder="예: Kidney, Brain, Liver..."
                value={formData.tissueOrigin}
                onChange={(e) => setFormData({ ...formData, tissueOrigin: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">
              동결 일자 <span className="text-[10px] text-slate-400 font-normal">(YYYYMMDD, 선택사항)</span>
            </label>
            <input
              type="text"
              maxLength={8}
              placeholder="예: 20260927 (선택사항)"
              value={formData.freezeDate}
              onChange={(e) => setFormData({ ...formData, freezeDate: e.target.value.replace(/[^0-9]/g, '') })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-hidden focus:border-cyan-500 placeholder-slate-500"
            />
          </div>

          {/* Media Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                배양 배지 (Culture Medium) <span className="text-[10px] text-slate-400 font-normal">(미입력 시 '미지정')</span>
              </label>
              <input
                type="text"
                placeholder="예: DMEM + 10% FBS + 1% P/S (비우면 '미지정')"
                value={formData.cultureMedium}
                onChange={(e) => setFormData({ ...formData, cultureMedium: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                동결 배지 (Freezing Medium) <span className="text-[10px] text-slate-400 font-normal">(미입력 시 '미지정')</span>
              </label>
              <input
                type="text"
                placeholder="예: 90% FBS + 10% DMSO (비우면 '미지정')"
                value={formData.freezingMedium}
                onChange={(e) => setFormData({ ...formData, freezingMedium: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Gene Modification & Researcher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">유전자 변형 / 특징 (Gene Modification)</label>
              <input
                type="text"
                value={formData.geneModification}
                onChange={(e) => setFormData({ ...formData, geneModification: e.target.value })}
                placeholder="예: CRISPR GFP-KO, WT, Overexpression..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-slate-300">
                  동결 등록자 (연구원 이름) <span className="text-[10px] text-slate-400 font-normal">(지워서 빈 칸 가능)</span>
                </label>
                {currentUser && (
                  <span className="text-[10px] text-cyan-400 flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400" /> 구글 계정 반영
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={formData.researcher}
                  onChange={(e) => setFormData({ ...formData, researcher: e.target.value })}
                  placeholder="미입력 시 공란 (지워서 빈 칸 가능)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-white focus:outline-hidden focus:border-cyan-500"
                />
                <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">메모 / 보관 특이사항</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="일괄 등록 배치 정보, 로트 번호, 생존율 등 특이사항..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-cyan-500 resize-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">
              1 슬롯 당 1개 바이알 × {selectedSlots.length}개 = 총 {selectedSlots.length}개 입고
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
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-950 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{selectedSlots.length}개 슬롯 일괄 입고</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
