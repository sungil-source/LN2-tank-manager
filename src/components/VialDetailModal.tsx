import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Thermometer,
  QrCode,
  Flame,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Printer,
  User,
  Calendar,
  Layers,
  FileText,
  ShieldAlert,
  Lock,
  MapPin,
  ExternalLink,
  ChevronRight,
  Dna,
  Activity,
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { CellVial } from '../types/inventory';
import { getIdenticalBatchVials, formatVialSlotPosition, formatIdToNumber } from '../services/vialUtils';
import { HostSpeciesSelect } from './HostSpeciesSelect';

interface VialDetailModalProps {
  vial: CellVial | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateVial: (updated: CellVial) => void;
  onThawVial: (vialId: string, thawedBy: string, purpose: string) => void;
  onDeleteVial: (vialId: string) => void;
  canEdit?: boolean;
  currentUser?: FirebaseUser | null;
  onRequireLogin?: () => void;
  allVials?: CellVial[];
  onNavigateToVial?: (vial: CellVial) => void;
}

export const VialDetailModal: React.FC<VialDetailModalProps> = ({
  vial,
  isOpen,
  onClose,
  onUpdateVial,
  onThawVial,
  onDeleteVial,
  canEdit = true,
  currentUser,
  onRequireLogin,
  allVials = [],
  onNavigateToVial,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'thaw' | 'edit' | 'label'>('info');
  const [showLocationsModal, setShowLocationsModal] = useState(false);

  // Compute all stored vials in the tank that have identical specifications
  const identicalVials = useMemo(() => {
    if (!vial) return [];
    return getIdenticalBatchVials(allVials, vial);
  }, [allVials, vial]);

  const defaultThawedByName = currentUser?.displayName || currentUser?.email?.split('@')[0] || '';

  // Thaw Form State
  const [thawedBy, setThawedBy] = useState(defaultThawedByName);
  const [thawPurpose, setThawPurpose] = useState('');

  // Sync thawedBy if currentUser loads
  useEffect(() => {
    if (defaultThawedByName) {
      setThawedBy(defaultThawedByName);
    }
  }, [defaultThawedByName]);

  // Edit Form State
  const [editData, setEditData] = useState<CellVial>(() => (vial ? { ...vial } : ({} as CellVial)));

  // Sync editData and tab when vial changes
  useEffect(() => {
    if (vial) {
      setEditData({ ...vial });
      setActiveTab('info');
      setShowLocationsModal(false);
    }
  }, [vial]);

  if (!isOpen || !vial) return null;

  const handleThawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!thawedBy.trim()) {
      alert('해동 연구원 이름을 입력해주세요.');
      return;
    }
    onThawVial(vial.id, thawedBy, thawPurpose || '실험 진행');
    onClose();
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateVial({
      ...editData,
      cellType: editData.cellType?.trim() || '미지정',
      tissueOrigin: editData.tissueOrigin?.trim() || '',
      cultureMedium: editData.cultureMedium?.trim() || '미지정',
      freezingMedium: editData.freezingMedium?.trim() || '미지정',
      freezeDate: editData.freezeDate?.trim() || '',
      researcher: editData.researcher?.trim() || '',
      updatedAt: new Date().toISOString(),
    });
    setActiveTab('info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[90vh] relative">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="min-w-10 px-2 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold font-mono text-sm">
              {((vial.row.charCodeAt(0) - 65) * 9 + vial.col)}번
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white tracking-tight">{vial.cellLineName}</h3>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  p{vial.passage}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {vial.cellType || '미지정'}
                </span>
                {vial.tissueOrigin && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {vial.tissueOrigin}
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    vial.status === 'Stored'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {vial.status === 'Stored' ? '보관중' : '해동/소진'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                위치: Tank {formatIdToNumber(vial.tankId)} &gt; Rack {formatIdToNumber(vial.rackId)} &gt; Box {vial.boxId} &gt; {((vial.row.charCodeAt(0) - 65) * 9 + vial.col)}번 슬롯
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Subtabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-950/40 border-b border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'info'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            기본 스펙 정보
          </button>
          <button
            onClick={() => setActiveTab('thaw')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'thaw'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-400 hover:bg-amber-950/30'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>해동 / 출고 처리</span>
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'edit'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>정보 수정</span>
          </button>
          <button
            onClick={() => setActiveTab('label')}
            className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'label'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>라벨/QR 인쇄</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: INFO VIEW */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* Primary Quantities & Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Clickable Total Lot Quantity Card */}
                <div
                  onClick={() => setShowLocationsModal(true)}
                  className="bg-slate-950 p-3.5 rounded-xl border border-cyan-800/60 hover:border-cyan-400 bg-gradient-to-br from-cyan-950/30 to-slate-950 transition-all cursor-pointer group shadow-sm relative overflow-hidden"
                  title="클릭 시 LN2 Tank 전체 동일 바이알 위치 목록 열기"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-cyan-300 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-cyan-400" />
                      Tank 보관 잔량
                    </span>
                    <span className="text-[10px] text-cyan-400 font-bold group-hover:underline flex items-center gap-0.5">
                      위치 확인 📍
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-2xl font-black text-cyan-300 font-mono tracking-tight group-hover:text-cyan-200">
                      {identicalVials.length}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">개 (vials)</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="group-hover:text-cyan-300 transition-colors">
                      클릭하여 {identicalVials.length}개 전체 위치 보기 👆
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400">동결일 (Freezing Date)</div>
                  <div className="text-sm font-semibold text-slate-200 font-mono mt-1">
                    {vial.freezeDate || '미지정'}
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400">동결 등록자</div>
                  <div className="text-sm font-semibold text-slate-200 mt-1 truncate">
                    {vial.researcher || '미지정'}
                  </div>
                </div>
              </div>

              {/* Host species & Origin Tissue Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                  <div className="text-[11px] font-semibold text-indigo-400 mb-1 flex items-center gap-1.5">
                    <Dna className="w-3.5 h-3.5" />
                    <span>Host species (숙주 생물종)</span>
                  </div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{vial.cellType || '미지정'}</span>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                  <div className="text-[11px] font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    <span>기원 조직 (Origin Tissue)</span>
                  </div>
                  <div className="text-sm font-bold text-white">
                    {vial.tissueOrigin ? (
                      <span className="text-emerald-300">{vial.tissueOrigin}</span>
                    ) : (
                      <span className="text-slate-500 font-normal italic">미지정 (Unspecified)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Individual Item 1: 배양 배지 */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                <div className="text-[11px] font-semibold text-cyan-400 mb-1">배양 배지 (Culture Medium)</div>
                <div className="text-slate-200 font-mono text-xs">
                  {vial.cultureMedium || '미지정'}
                </div>
              </div>

              {/* Individual Item 2: 동결 배지 */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                <div className="text-[11px] font-semibold text-slate-400 mb-1">동결 배지 (Freezing Medium)</div>
                <div className="text-slate-200 font-mono text-xs">
                  {vial.freezingMedium || '미지정'}
                </div>
              </div>

              {/* Individual Item 3: 유전자 변형 / 벡터 */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs">
                <div className="text-[11px] font-semibold text-indigo-400 mb-1">유전자 변형 / 벡터</div>
                <div className="text-slate-200 font-mono text-xs">
                  {vial.geneModification ? vial.geneModification : '해당 없음 (WT / Normal)'}
                </div>
              </div>

              {/* Notes: renamed from 배양 및 해동 프로토콜 메모 to [메모] */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 text-xs">
                <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>메모</span>
                </div>
                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {vial.notes ? vial.notes : '등록된 특이사항 메모가 없습니다.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: THAW WORKFLOW */}
          {activeTab === 'thaw' && (
            <form onSubmit={handleThawSubmit} className="space-y-4">
              <div className="bg-amber-950/30 border border-amber-800/50 p-3 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">세포주 해동 및 출고 처리</p>
                  <p className="mt-0.5 text-amber-300/80">
                    현재 보관 중인 {vial.vialsStored}개 중 출고할 수량을 지정하세요. 해동 기록은 시스템
                    감사 로그(Audit Trail)에 영구 기록됩니다.
                  </p>
                </div>
              </div>

              {/* Permission Banner for Thaw */}
              {!canEdit && (
                <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-xl text-xs text-amber-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      수정 및 출고 권한이 없습니다. 승인된 구글 계정으로 로그인해야 출고할 수 있습니다.
                    </span>
                  </div>
                  {onRequireLogin && (
                    <button
                      type="button"
                      onClick={onRequireLogin}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      권한 확인 / 로그인
                    </button>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    해동 연구원 (출고자) <span className="text-amber-400">*</span>
                  </label>
                  {currentUser && (
                    <span className="text-[11px] text-amber-400 flex items-center gap-1 font-sans">
                      <CheckCircle2 className="w-3 h-3" />
                      구글 계정 자동 연동 ({currentUser.displayName || currentUser.email})
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  disabled={!canEdit}
                  value={thawedBy}
                  onChange={(e) => setThawedBy(e.target.value)}
                  placeholder="예: 홍길동 연구원"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Thaw Target & Single Slot Info */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">출고 대상 슬롯</div>
                  <div className="text-cyan-300 font-semibold font-mono mt-0.5">
                    Box {vial.boxId} &gt; {((vial.row.charCodeAt(0) - 65) * 9 + vial.col)}번 슬롯
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400">출고 수량 / 잔량 변동</div>
                  <div className="text-amber-400 font-bold font-mono mt-0.5">
                    1 vial 출고 (잔여: {Math.max(0, identicalVials.length - 1)}개)
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  실험 목적 / 과제명
                </label>
                <textarea
                  rows={3}
                  disabled={!canEdit}
                  value={thawPurpose}
                  onChange={(e) => setThawPurpose(e.target.value)}
                  placeholder="예: 항암제 효능 평가 IC50 측정 실험 (2차 반복)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={!canEdit}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Flame className="w-4 h-4" />
                <span>해동 출고 확인 (1개 출고 및 이력 기록)</span>
              </button>
            </form>
          )}

          {/* TAB 3: EDIT VIAL DETAILS */}
          {activeTab === 'edit' && (
            <form onSubmit={handleEditSave} className="space-y-3 text-xs">
              {!canEdit && (
                <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-xl text-xs text-amber-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      수정 권한이 없습니다. 관리자가 승인한 구글 계정으로 로그인해야 수정할 수 있습니다.
                    </span>
                  </div>
                  {onRequireLogin && (
                    <button
                      type="button"
                      onClick={onRequireLogin}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      권한 확인 / 로그인
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">세포주 이름</label>
                  <input
                    type="text"
                    required
                    disabled={!canEdit}
                    value={editData.cellLineName}
                    onChange={(e) => setEditData({ ...editData, cellLineName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Passage (P#)</label>
                  <input
                    type="number"
                    min="1"
                    disabled={!canEdit}
                    value={editData.passage}
                    onChange={(e) =>
                      setEditData({ ...editData, passage: parseInt(e.target.value) || 1 })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Host species & 기원 조직 (Origin Tissue) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Host species <span className="text-[10px] text-slate-400">(숙주 생물종)</span>
                  </label>
                  <HostSpeciesSelect
                    disabled={!canEdit}
                    value={editData.cellType || '미지정'}
                    onChange={(val) => setEditData({ ...editData, cellType: val })}
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    기원 조직 <span className="text-[10px] text-slate-400">(Origin Tissue)</span>
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    placeholder="예: Kidney, Brain, Liver..."
                    value={editData.tissueOrigin || ''}
                    onChange={(e) => setEditData({ ...editData, tissueOrigin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-xs sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed focus:outline-hidden focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  동결일 <span className="text-[10px] text-slate-400 font-normal">(YYYYMMDD, 선택사항)</span>
                </label>
                <input
                  type="text"
                  maxLength={8}
                  disabled={!canEdit}
                  placeholder="예: 20260927 (선택사항)"
                  value={editData.freezeDate || ''}
                  onChange={(e) => setEditData({ ...editData, freezeDate: e.target.value.replace(/[^0-9]/g, '') })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white font-mono disabled:opacity-60 disabled:cursor-not-allowed placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  배양 배지 (Culture Medium) <span className="text-[10px] text-slate-400 font-normal">(미입력 시 '미지정')</span>
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="예: DMEM + 10% FBS + 1% P/S (비우면 '미지정')"
                  value={editData.cultureMedium || ''}
                  onChange={(e) => setEditData({ ...editData, cultureMedium: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  동결 배지 (Freezing Medium) <span className="text-[10px] text-slate-400 font-normal">(미입력 시 '미지정')</span>
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="예: 90% FBS + 10% DMSO (비우면 '미지정')"
                  value={editData.freezingMedium || ''}
                  onChange={(e) => setEditData({ ...editData, freezingMedium: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">유전자 변형 / 벡터</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="예: CRISPR KO, GFP-Tag, WT"
                  value={editData.geneModification || ''}
                  onChange={(e) => setEditData({ ...editData, geneModification: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  동결 등록자 (Researcher) <span className="text-[10px] text-slate-400 font-normal">(지워서 빈 칸 가능)</span>
                </label>
                <input
                  type="text"
                  disabled={!canEdit}
                  placeholder="미입력 시 공란 (지워서 빈 칸 가능)"
                  value={editData.researcher || ''}
                  onChange={(e) => setEditData({ ...editData, researcher: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">메모</label>
                <textarea
                  rows={2}
                  disabled={!canEdit}
                  value={editData.notes || ''}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  placeholder="특이사항 메모 입력"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => onDeleteVial(vial.id)}
                    className="px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>이 바이알 슬롯 삭제</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    <span>삭제 권한 없음 (읽기 전용)</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canEdit}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>수정사항 저장</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: CRYOTUBE LABEL & QR PREVIEW */}
          {activeTab === 'label' && (
            <div className="space-y-5 text-center">
              <div className="text-xs text-slate-400">
                실험실 전용 저온 내동(LN2-safe) 크라이오 튜브 규격 라벨 프리뷰입니다.
              </div>

              {/* Physical Cryotube Label Simulation */}
              <div className="max-w-md mx-auto p-4 bg-white text-slate-900 rounded-xl shadow-lg border border-slate-300 flex items-center justify-between gap-4 font-sans text-left">
                {/* 2D QR Code Representation */}
                <div className="w-16 h-16 bg-slate-100 border border-slate-400 rounded-md p-1 flex flex-col items-center justify-center flex-shrink-0">
                  <QrCode className="w-12 h-12 text-slate-900" />
                  <span className="text-[7px] font-mono tracking-tighter text-slate-600">
                    p{vial.passage}
                  </span>
                </div>

                {/* Tube Label Text */}
                <div className="flex-1 min-w-0 leading-tight">
                  <div className="text-xs font-black tracking-tight text-slate-900 truncate">
                    {vial.cellLineName}
                  </div>
                  <div className="text-[10px] font-bold text-slate-700 font-mono mt-0.5">
                    p{vial.passage} | {vial.freezeDate}
                  </div>
                  <div className="text-[9px] text-slate-600 truncate mt-0.5">
                    Box {vial.boxId} [슬롯 {((vial.row.charCodeAt(0) - 65) * 9 + vial.col)}번]
                  </div>
                  <div className="text-[8px] text-slate-500 truncate mt-0.5 font-mono">
                    By: {vial.researcher}
                  </div>
                </div>

                {/* Round Top Cap Sticker (11mm) */}
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-400 bg-slate-50 flex flex-col items-center justify-center flex-shrink-0 text-center p-0.5">
                  <span className="text-[8px] font-bold truncate max-w-[36px]">{vial.cellLineName}</span>
                  <span className="text-[8px] font-mono font-black text-cyan-700">
                    #{((vial.row.charCodeAt(0) - 65) * 9 + vial.col)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => alert(`라벨 프린터로 [${vial.cellLineName}] 라벨 전송 완료`)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>라벨 프린터 출력</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Identical Vials All Locations View Overlay */}
        {showLocationsModal && (
          <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{vial.cellLineName} 전체 보관 위치</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-xs font-mono font-bold border border-cyan-700">
                      총 {identicalVials.length}개 보관중
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    동일 스펙: Passage {vial.passage} · 동결일 {vial.freezeDate} · {vial.cellType || 'Standard'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLocationsModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="위치 목록 닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Locations */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
              {identicalVials.map((item, idx) => {
                const isCurrent = item.id === vial.id;
                const slotNum = ((item.row.charCodeAt(0) - 65) * 9 + item.col);

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      isCurrent
                        ? 'bg-cyan-950/40 border-cyan-600/80 shadow-md ring-1 ring-cyan-500/30'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                          isCurrent ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white font-mono">
                            Box {item.boxId} &gt; {slotNum}번 슬롯
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
                              현재 선택된 바이알
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-1 flex-wrap">
                          <span>Rack {item.rackId?.replace('RACK-', '')}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-400">ID: {item.id}</span>
                          <span>•</span>
                          <span>등록자: {item.researcher}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isCurrent ? (
                        <span className="text-xs text-cyan-300 font-semibold px-2.5 py-1 bg-cyan-950/70 rounded-lg border border-cyan-800">
                          현재 확인 중
                        </span>
                      ) : (
                        onNavigateToVial && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowLocationsModal(false);
                              onNavigateToVial(item);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            <span>이 위치로 이동</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>* LN2 Tank 전체에서 동일한 세포주명, Passage, 동결일자를 가진 바이알들의 위치입니다.</span>
              <button
                type="button"
                onClick={() => setShowLocationsModal(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors cursor-pointer font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
