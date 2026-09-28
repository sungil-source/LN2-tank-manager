import React, { useState, useEffect } from 'react';
import { X, Plus, Sparkles, CheckCircle2, User as UserIcon } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { CellVial, CryoBox, LN2Tank } from '../types/inventory';
import { HostSpeciesSelect } from './HostSpeciesSelect';

interface AddVialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddVial: (newVial: CellVial) => void;
  defaultTankId: string;
  defaultRackId: string;
  defaultBoxId: string;
  defaultRow?: string;
  defaultCol?: number;
  availableBoxes: CryoBox[];
  currentUser?: User | null;
}

export const AddVialModal: React.FC<AddVialModalProps> = ({
  isOpen,
  onClose,
  onAddVial,
  defaultTankId,
  defaultRackId,
  defaultBoxId,
  defaultRow = 'A',
  defaultCol = 1,
  availableBoxes,
  currentUser,
}) => {
  const userAccountName = currentUser?.displayName || currentUser?.email?.split('@')[0] || '';

  const [formData, setFormData] = useState<Partial<CellVial>>({
    cellLineName: '',
    cellType: '미지정',
    tissueOrigin: '',
    passage: 1,
    tankId: defaultTankId,
    rackId: defaultRackId,
    boxId: defaultBoxId,
    row: defaultRow,
    col: defaultCol,
    freezeDate: '',
    vialsStored: 1,
    cultureMedium: '',
    freezingMedium: '',
    geneModification: '',
    researcher: userAccountName,
    notes: '',
    status: 'Stored',
  });

  // Reset / sync form data when opened
  useEffect(() => {
    if (isOpen) {
      const defaultUser = currentUser?.displayName || currentUser?.email?.split('@')[0] || '';
      setFormData({
        cellLineName: '',
        cellType: '미지정',
        tissueOrigin: '',
        passage: 1,
        tankId: defaultTankId,
        rackId: defaultRackId,
        boxId: defaultBoxId,
        row: defaultRow,
        col: defaultCol,
        freezeDate: '',
        vialsStored: 1,
        cultureMedium: '',
        freezingMedium: '',
        geneModification: '',
        researcher: defaultUser,
        notes: '',
        status: 'Stored',
      });
    }
  }, [isOpen, defaultTankId, defaultRackId, defaultBoxId, defaultRow, defaultCol, currentUser]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cellLineName?.trim()) {
      alert('세포주 이름을 입력해주세요.');
      return;
    }

    const uniqueId = `VIAL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    const newVial: CellVial = {
      id: uniqueId,
      cellLineName: formData.cellLineName.trim(),
      cellType: formData.cellType?.trim() || '미지정',
      tissueOrigin: formData.tissueOrigin?.trim() || '',
      passage: formData.passage || 1,
      tankId: formData.tankId || defaultTankId,
      rackId: formData.rackId || defaultRackId,
      boxId: formData.boxId || defaultBoxId,
      row: (formData.row || 'A').toUpperCase(),
      col: formData.col || 1,
      freezeDate: formData.freezeDate?.trim() || '',
      vialsStored: 1, // 1 slot = 1 vial
      cultureMedium: formData.cultureMedium?.trim() || '미지정',
      freezingMedium: formData.freezingMedium?.trim() || '미지정',
      geneModification: formData.geneModification?.trim() || '',
      researcher: formData.researcher?.trim() || '',
      notes: formData.notes?.trim() || '',
      status: 'Stored',
      updatedAt: new Date().toISOString(),
    };

    onAddVial(newVial);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                신규 세포주 동결 등록 (Add New Cryo Stock)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                위치 지정: Box {formData.boxId} &gt; 슬롯 {(( (formData.row || 'A').charCodeAt(0) - 65 ) * 9) + (formData.col || 1)}번
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Cell Line Name & Passage */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-medium text-slate-300 mb-1">세포주 이름 (Cell Line) *</label>
              <input
                type="text"
                required
                placeholder="예: HEK293T, HeLa, Jurkat, iPSC-CL01"
                value={formData.cellLineName}
                onChange={(e) => setFormData({ ...formData, cellLineName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Passage (p#) *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.passage}
                onChange={(e) =>
                  setFormData({ ...formData, passage: parseInt(e.target.value) || 1 })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-hidden focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Coordinate & Box assignment with 1~81 slot numbers */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div>
              <label className="block font-medium text-slate-400 mb-1 text-[11px]">크라이오 박스</label>
              <select
                value={formData.boxId}
                onChange={(e) => {
                  const bId = e.target.value;
                  const found = availableBoxes.find((b) => b.id === bId);
                  setFormData({
                    ...formData,
                    boxId: bId,
                    rackId: found ? found.rackId : formData.rackId,
                  });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              >
                {availableBoxes.map((b) => (
                  <option key={b.id} value={b.id}>
                    Box {b.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-400 mb-1 text-[11px]">
                슬롯 번호 (1 ~ 81번)
              </label>
              <select
                value={(( (formData.row || 'A').charCodeAt(0) - 65 ) * 9) + (formData.col || 1)}
                onChange={(e) => {
                  const slotNum = parseInt(e.target.value) || 1;
                  const rIdx = Math.floor((slotNum - 1) / 9);
                  const c = ((slotNum - 1) % 9) + 1;
                  const r = String.fromCharCode(65 + rIdx);
                  setFormData({ ...formData, row: r, col: c });
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-cyan-300 font-mono font-bold"
              >
                {Array.from({ length: 81 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num}번 슬롯
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Host species, 기원 조직, and Freeze Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                value={formData.tissueOrigin || ''}
                onChange={(e) => setFormData({ ...formData, tissueOrigin: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-hidden focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                동결 일자 <span className="text-[10px] text-slate-400 font-normal">(YYYYMMDD, 선택사항)</span>
              </label>
              <input
                type="text"
                maxLength={8}
                placeholder="예: 20260927 (선택사항)"
                value={formData.freezeDate || ''}
                onChange={(e) => setFormData({ ...formData, freezeDate: e.target.value.replace(/[^0-9]/g, '') })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs sm:text-sm focus:outline-hidden focus:border-cyan-500 placeholder-slate-500"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/70 px-3 py-2 rounded-lg border border-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-cyan-300/90 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              1 슬롯 = 1 바이알 규격: 선택된 슬롯 (Box {formData.boxId} &gt; {(( (formData.row || 'A').charCodeAt(0) - 65 ) * 9) + (formData.col || 1)}번 슬롯)에 1개가 보관됩니다.
            </span>
          </div>

          {/* 배양 배지 (Culture Medium) */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              배양 배지 (Culture Medium) <span className="text-[10px] text-slate-400 font-normal">(미입력 시 '미지정')</span>
            </label>
            <input
              type="text"
              placeholder="예: DMEM + 10% FBS + 1% P/S (비우면 '미지정')"
              value={formData.cultureMedium}
              onChange={(e) => setFormData({ ...formData, cultureMedium: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* 동결 배지 (Freezing Medium) */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              동결 배지 (Freezing Medium) <span className="text-[10px] text-slate-400 font-normal">(미입력 시 '미지정')</span>
            </label>
            <input
              type="text"
              placeholder="예: 90% FBS + 10% DMSO (비우면 '미지정')"
              value={formData.freezingMedium}
              onChange={(e) => setFormData({ ...formData, freezingMedium: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* 유전자 변형 / 벡터 */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">유전자 변형 / 벡터</label>
            <input
              type="text"
              placeholder="예: Cas9 Knock-out, GFP-tag, WT"
              value={formData.geneModification}
              onChange={(e) => setFormData({ ...formData, geneModification: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* 동결 등록자 (Researcher) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-medium text-slate-300">
                동결 등록자 (연구원 이름) <span className="text-[10px] text-slate-400 font-normal">(지워서 빈 칸 가능)</span>
              </label>
              {currentUser && (
                <span className="text-[11px] text-cyan-400 flex items-center gap-1 font-sans">
                  <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                  구글 계정 자동 반영 ({currentUser.displayName || currentUser.email})
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="미입력 시 공란 (지워서 빈 칸 가능)"
              value={formData.researcher || ''}
              onChange={(e) => setFormData({ ...formData, researcher: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* 메모 */}
          <div>
            <label className="block font-medium text-slate-300 mb-1">메모</label>
            <textarea
              rows={2}
              placeholder="예: 해동 시 37도 워터배스에서 1분 내 급속 해동, 배양액 교체 요망"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>동결 등록 완료</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
