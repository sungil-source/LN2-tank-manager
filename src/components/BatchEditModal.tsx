import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, Sparkles, Flame, User as UserIcon, CheckCircle2 } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { CellVial, CryoBox } from '../types/inventory';
import { HostSpeciesSelect } from './HostSpeciesSelect';

interface BatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlots: Array<{ row: string; col: number; slotNumber: number; existingVial?: CellVial }>;
  box: CryoBox;
  currentUser?: User | null;
  onApplyBatchEdit: (params: {
    actionType: 'fill_or_update' | 'clear_all';
    newVialData?: Partial<CellVial>;
    thawedBy?: string;
    thawPurpose?: string;
  }) => void;
}

export const BatchEditModal: React.FC<BatchEditModalProps> = ({
  isOpen,
  onClose,
  selectedSlots,
  box,
  currentUser,
  onApplyBatchEdit,
}) => {
  const emptySlots = selectedSlots.filter((s) => !s.existingVial);
  const occupiedSlots = selectedSlots.filter((s) => !!s.existingVial);

  const userAccountName = currentUser?.displayName || currentUser?.email?.split('@')[0] || '';

  const [editMode, setEditMode] = useState<'fill_or_update' | 'clear_all'>('fill_or_update');

  // Form for new cell data
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

  // Form for thaw audit (for existing vials being replaced or cleared)
  const [thawedBy, setThawedBy] = useState(userAccountName);
  const [thawPurpose, setThawPurpose] = useState('일괄 수정을 통한 세포주 교체/정리');

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
      setThawedBy(defaultUser);
      setThawPurpose('일괄 수정을 통한 세포주 교체/정리');
    }
  }, [isOpen, currentUser]);

  if (!isOpen || selectedSlots.length === 0) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editMode === 'clear_all') {
      if (!thawedBy.trim()) {
        alert('출고 담당 연구원 이름을 입력해주세요.');
        return;
      }
      onApplyBatchEdit({
        actionType: 'clear_all',
        thawedBy: thawedBy.trim(),
        thawPurpose: thawPurpose.trim() || '일괄 비우기 출고',
      });
      onClose();
      return;
    }

    // fill_or_update mode
    if (!formData.cellLineName.trim()) {
      alert('세포주명을 입력해주세요.');
      return;
    }

    if (occupiedSlots.length > 0 && !thawedBy.trim()) {
      alert('기존 바이알의 출고 처리를 위해 담당 연구원 이름을 입력해주세요.');
      return;
    }

    onApplyBatchEdit({
      actionType: 'fill_or_update',
      newVialData: {
        cellLineName: formData.cellLineName.trim(),
        cellType: formData.cellType?.trim() || '미지정',
        tissueOrigin: formData.tissueOrigin.trim(),
        passage: Number(formData.passage) || 1,
        freezeDate: formData.freezeDate?.trim() || '',
        cultureMedium: formData.cultureMedium?.trim() || '미지정',
        freezingMedium: formData.freezingMedium?.trim() || '미지정',
        geneModification: formData.geneModification?.trim() || '',
        researcher: formData.researcher?.trim() || '',
        notes: formData.notes?.trim() || '',
        status: 'Stored',
        vialsStored: 1,
      },
      thawedBy: thawedBy.trim(),
      thawPurpose: thawPurpose.trim() || '일괄 수정으로 인한 교체 출고',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-purple-800/80 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <span>일괄 슬롯 내용 수정</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 text-xs font-mono font-bold border border-purple-700">
                  총 {selectedSlots.length}개 슬롯
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                빈 슬롯({emptySlots.length}개)과 기존 보관 슬롯({occupiedSlots.length}개)이 혼합 선택되었습니다.
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

        {/* Mode Selector Tabs */}
        <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditMode('fill_or_update')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              editMode === 'fill_or_update'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>선택 슬롯 전체에 새 세포주 적용</span>
          </button>
          <button
            type="button"
            onClick={() => setEditMode('clear_all')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              editMode === 'clear_all'
                ? 'bg-rose-700 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>선택 슬롯 모두 비우기 (일괄 출고)</span>
          </button>
        </div>

        {/* Explain Rule Notice */}
        <div className="px-5 py-2.5 bg-purple-950/30 border-b border-purple-900/40 text-[11px] text-purple-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          {editMode === 'fill_or_update' ? (
            <div>
              <strong>일괄 수정 규칙:</strong>
              <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-slate-300">
                <li>빈 슬롯 ({emptySlots.length}개): 새 세포주로 <strong>신규 입고</strong> 등록됩니다.</li>
                <li>기존 보관 슬롯 ({occupiedSlots.length}개): 기존 바이알은 <strong>출고(이력 기록)</strong> 처리된 후, 새 세포주로 <strong>신규 입고</strong>됩니다.</li>
              </ul>
            </div>
          ) : (
            <div>
              <strong>모두 비우기 규칙:</strong>
              <p className="mt-0.5 text-slate-300">
                기존 보관 중인 {occupiedSlots.length}개의 바이알이 <strong>출고(이력 기록)</strong> 처리되며, 모든 슬롯이 빈 슬롯으로 전환됩니다.
              </p>
            </div>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {editMode === 'fill_or_update' ? (
            <>
              {/* Cell Line Name & Passage */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium text-slate-300 mb-1">
                    적용할 세포주명 (Cell Line Name) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.cellLineName}
                    onChange={(e) => setFormData({ ...formData, cellLineName: e.target.value })}
                    placeholder="예: HEK293T, Jurkat, HeLa..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-hidden focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Passage (P#)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.passage}
                    onChange={(e) => setFormData({ ...formData, passage: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-hidden focus:border-purple-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-hidden focus:border-purple-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-hidden focus:border-purple-500 placeholder-slate-500"
                />
              </div>

              {/* Media */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    배양 배지 <span className="text-[10px] text-slate-400 font-normal">(미입력 시 '미지정')</span>
                  </label>
                  <input
                    type="text"
                    placeholder="예: DMEM + 10% FBS + 1% P/S (비우면 '미지정')"
                    value={formData.cultureMedium}
                    onChange={(e) => setFormData({ ...formData, cultureMedium: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    동결 배지 <span className="text-[10px] text-slate-400 font-normal">(미입력 시 '미지정')</span>
                  </label>
                  <input
                    type="text"
                    placeholder="예: 90% FBS + 10% DMSO (비우면 '미지정')"
                    value={formData.freezingMedium}
                    onChange={(e) => setFormData({ ...formData, freezingMedium: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Researcher & Modification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">유전자 변형 / 특징</label>
                  <input
                    type="text"
                    value={formData.geneModification}
                    onChange={(e) => setFormData({ ...formData, geneModification: e.target.value })}
                    placeholder="예: CRISPR GFP-KO, WT..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    등록 연구원 <span className="text-[10px] text-slate-400 font-normal">(지워서 빈 칸 가능)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="미입력 시 공란 (지워서 빈 칸 가능)"
                    value={formData.researcher}
                    onChange={(e) => setFormData({ ...formData, researcher: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-purple-500"
                  />
                </div>
              </div>

              {/* If there are occupied slots that will be thawed */}
              {occupiedSlots.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" />
                    <span>기존 {occupiedSlots.length}개 바이알 출고(교체) 정보 기록</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-300 mb-1">출고 연구원</label>
                      <input
                        type="text"
                        required
                        value={thawedBy}
                        onChange={(e) => setThawedBy(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-300 mb-1">출고 사유</label>
                      <input
                        type="text"
                        required
                        value={thawPurpose}
                        onChange={(e) => setThawPurpose(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Clear all mode */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-300 mb-3">
                  선택된 {selectedSlots.length}개 슬롯 중 보관 중인{' '}
                  <strong className="text-amber-400">{occupiedSlots.length}개 바이알</strong>을 출고 처리하고 빈 슬롯으로 비웁니다.
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      출고 담당 연구원 <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={thawedBy}
                      onChange={(e) => setThawedBy(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">
                      출고 목적 / 사유 <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={thawPurpose}
                      onChange={(e) => setThawPurpose(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-hidden focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              {editMode === 'fill_or_update'
                ? `입고: ${emptySlots.length}건, 출고 후 재입고: ${occupiedSlots.length}건`
                : `출고: ${occupiedSlots.length}건 (비우기)`}
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
                className={`px-5 py-2 rounded-xl font-bold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer text-white ${
                  editMode === 'fill_or_update'
                    ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-950'
                    : 'bg-rose-700 hover:bg-rose-600 shadow-rose-950'
                }`}
              >
                {editMode === 'fill_or_update' ? (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>일괄 수정 적용</span>
                  </>
                ) : (
                  <>
                    <Flame className="w-4 h-4" />
                    <span>모두 비우기 확인</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
