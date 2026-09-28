import React, { useState, useMemo } from 'react';
import {
  Download,
  AlertCircle,
  ArrowUpDown,
  MapPin,
  X,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import type { CellVial } from '../types/inventory';
import { exportToCSV } from '../services/sheetsService';
import { getVialLotKey, formatIdToNumber, getSlotNumber } from '../services/vialUtils';

interface InventoryTableViewProps {
  vials: CellVial[];
  onSelectVial: (vial: CellVial) => void;
  searchQuery: string;
}

export interface CellLotGroup {
  lotKey: string;
  cellLineName: string;
  passage: number;
  freezeDate: string;
  researcher: string;
  cellType: string;
  tissueOrigin: string;
  cultureMedium: string;
  freezingMedium: string;
  geneModification: string;
  notes: string;
  vials: CellVial[];
  lotCount: number;
  firstVial: CellVial;
}

export const InventoryTableView: React.FC<InventoryTableViewProps> = ({
  vials,
  onSelectVial,
  searchQuery,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'cellLineName' | 'passage' | 'freezeDate' | 'lotCount'>('cellLineName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal to display all physical slot locations of the clicked lot
  const [selectedLotForLocations, setSelectedLotForLocations] = useState<CellLotGroup | null>(null);

  // 1. Group stored vials into unique cell lots:
  // '세포주 이름', 'passage', '동결 일자', '등록자'가 동일하면 같은 세포주 로트로 간주하여 한 번만 표시
  const lotGroups = useMemo(() => {
    const map = new Map<string, CellLotGroup>();
    const stored = vials.filter((v) => v.status === 'Stored');

    stored.forEach((v) => {
      const key = getVialLotKey(v);
      const existing = map.get(key);
      if (existing) {
        existing.vials.push(v);
        existing.lotCount += 1;
        if (!existing.tissueOrigin && v.tissueOrigin) {
          existing.tissueOrigin = v.tissueOrigin;
        }
        if (!existing.notes && v.notes) {
          existing.notes = v.notes;
        }
      } else {
        map.set(key, {
          lotKey: key,
          cellLineName: v.cellLineName,
          passage: v.passage,
          freezeDate: v.freezeDate || '',
          researcher: v.researcher || '',
          cellType: v.cellType || '미지정',
          tissueOrigin: v.tissueOrigin || '',
          cultureMedium: v.cultureMedium || '미지정',
          freezingMedium: v.freezingMedium || '미지정',
          geneModification: v.geneModification || '',
          notes: v.notes || '',
          vials: [v],
          lotCount: 1,
          firstVial: v,
        });
      }
    });

    return Array.from(map.values());
  }, [vials]);

  // 2. Dynamically extract unique Cell Types (Host Species) from actual lot data
  const availableCellTypes = useMemo(() => {
    const set = new Set<string>();
    lotGroups.forEach((lot) => {
      if (lot.cellType && lot.cellType.trim()) {
        set.add(lot.cellType.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [lotGroups]);

  // 3. Filter and Sort the lot groups
  const filteredLots = useMemo(() => {
    return lotGroups
      .filter((lot) => {
        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            lot.cellLineName.toLowerCase().includes(q) ||
            lot.researcher.toLowerCase().includes(q) ||
            lot.cellType.toLowerCase().includes(q) ||
            lot.tissueOrigin.toLowerCase().includes(q) ||
            lot.passage.toString().includes(q) ||
            lot.freezeDate.includes(q) ||
            lot.notes.toLowerCase().includes(q) ||
            lot.vials.some(
              (v) =>
                v.boxId.toLowerCase().includes(q) ||
                getSlotNumber(v.row, v.col).toString() === q
            );
          if (!matches) return false;
        }

        // Cell Type / Host Species Filter
        if (filterType !== 'all' && lot.cellType !== filterType) {
          return false;
        }

        // Filter Low Stock (Tank total count <= 2)
        if (filterLowStockOnly && lot.lotCount > 2) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortBy === 'cellLineName') comp = a.cellLineName.localeCompare(b.cellLineName);
        if (sortBy === 'passage') comp = a.passage - b.passage;
        if (sortBy === 'freezeDate') comp = a.freezeDate.localeCompare(b.freezeDate);
        if (sortBy === 'lotCount') comp = a.lotCount - b.lotCount;
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [lotGroups, searchQuery, filterType, filterLowStockOnly, sortBy, sortOrder]);

  const toggleSort = (field: 'cellLineName' | 'passage' | 'freezeDate' | 'lotCount') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Export filtered lots' vials to CSV (without Vial_ID, using Slot 1..81 and clean Tank/Rack numbers)
  const handleExportFiltered = () => {
    const allFilteredVials = filteredLots.flatMap((l) => l.vials);
    const csv = exportToCSV(allFilteredVials);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `LN2_Inventory_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalVialCount = useMemo(() => {
    return filteredLots.reduce((acc, lot) => acc + lot.lotCount, 0);
  }, [filteredLots]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Dynamic Cell Type Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-medium">세포 유형:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-hidden focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">전체 생물종/유형 ({lotGroups.length}개 로트)</option>
              {availableCellTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Low Stock Filter Button */}
          <button
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
              filterLowStockOnly
                ? 'bg-rose-950/60 border-rose-600 text-rose-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>재고 부족 (&le;2)만 보기</span>
          </button>
        </div>

        {/* Export & Count */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            고유 로트: <strong className="text-white font-mono">{filteredLots.length}</strong>개{' '}
            <span className="text-slate-500 font-mono">(총 {totalVialCount} vials)</span>
          </span>
          <button
            onClick={handleExportFiltered}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            title="현재 목록의 바이알 전체를 표준 CSV 파일로 다운로드 (Vial ID 제외, 슬롯 1~81번)"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>CSV 저장</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/90 text-slate-400 border-b border-slate-800 uppercase font-mono text-[11px]">
            <tr>
              <th className="py-3 px-4">
                <button
                  onClick={() => toggleSort('cellLineName')}
                  className="flex items-center gap-1 hover:text-white cursor-pointer"
                >
                  <span>세포주 이름</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3">
                <button
                  onClick={() => toggleSort('passage')}
                  className="flex items-center gap-1 hover:text-white cursor-pointer"
                >
                  <span>P#</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3">Host species (조직)</th>
              <th className="py-3 px-3">
                <button
                  onClick={() => toggleSort('lotCount')}
                  className="flex items-center gap-1 hover:text-white cursor-pointer"
                  title="세포주 이름·Passage·동결일자·등록자가 동일한 탱크 전체 잔여 수량"
                >
                  <span>동일로트잔량</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3">배양 배지</th>
              <th className="py-3 px-3">동결 배지</th>
              <th className="py-3 px-3">
                <button
                  onClick={() => toggleSort('freezeDate')}
                  className="flex items-center gap-1 hover:text-white cursor-pointer"
                >
                  <span>동결 일자</span>
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-3">등록자</th>
              <th className="py-3 px-4 text-right">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
            {filteredLots.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  해당 조건에 일치하는 세포주 로트가 없습니다.
                </td>
              </tr>
            ) : (
              filteredLots.map((lot) => {
                const isLowStock = lot.lotCount <= 2;
                return (
                  <tr
                    key={lot.lotKey}
                    onClick={() => onSelectVial(lot.firstVial)}
                    className="hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    {/* Cell Line Name (NO VIAL ID) */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                        {lot.cellLineName}
                      </div>
                      {lot.geneModification && (
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                          {lot.geneModification}
                        </div>
                      )}
                    </td>

                    {/* Passage */}
                    <td className="py-3 px-3 font-mono font-semibold text-cyan-300">
                      p{lot.passage}
                    </td>

                    {/* Host Species & Tissue Origin */}
                    <td className="py-3 px-3">
                      <div className="text-slate-200 font-medium">{lot.cellType || '미지정'}</div>
                      {lot.tissueOrigin && (
                        <div
                          className="text-[10px] text-emerald-400 font-sans truncate max-w-[120px]"
                          title={lot.tissueOrigin}
                        >
                          {lot.tissueOrigin}
                        </div>
                      )}
                    </td>

                    {/* 동일로트잔량 (클릭 시 위치 전부 표시) */}
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLotForLocations(lot);
                        }}
                        className={`px-2.5 py-1 rounded-full font-bold text-xs font-mono inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                          isLowStock
                            ? 'bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 animate-pulse'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-800 hover:bg-cyan-900 hover:border-cyan-600'
                        }`}
                        title="클릭 시 전체 슬롯 보관 위치 목록 보기 📍"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>총 {lot.lotCount}개</span>
                      </button>
                    </td>

                    {/* Culture Medium */}
                    <td
                      className="py-3 px-3 text-slate-300 text-xs truncate max-w-[140px]"
                      title={lot.cultureMedium || '미지정'}
                    >
                      {lot.cultureMedium || '미지정'}
                    </td>

                    {/* Freezing Medium */}
                    <td
                      className="py-3 px-3 text-slate-400 text-xs truncate max-w-[130px]"
                      title={lot.freezingMedium || '미지정'}
                    >
                      {lot.freezingMedium || '미지정'}
                    </td>

                    {/* Freeze Date */}
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {lot.freezeDate || '-'}
                    </td>

                    {/* Researcher */}
                    <td className="py-3 px-3 text-slate-300 truncate max-w-[100px]">
                      {lot.researcher || '-'}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVial(lot.firstVial);
                        }}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                      >
                        상세/출고
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Lot Locations Modal: Triggered by clicking the quantity badge */}
      {selectedLotForLocations && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-cyan-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-100 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                    <span>{selectedLotForLocations.cellLineName}</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700">
                      p{selectedLotForLocations.passage}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    동결일자: {selectedLotForLocations.freezeDate || '미지정'} · 등록자:{' '}
                    {selectedLotForLocations.researcher || '미지정'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLotForLocations(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Count Banner */}
            <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                보관 중인 동일 로트 바이알:{' '}
                <strong className="text-cyan-300 font-mono text-sm">
                  {selectedLotForLocations.lotCount}
                </strong>
                개
              </span>
              <span className="text-[11px] text-slate-500">
                원하는 슬롯을 클릭하면 상세/출고 화면으로 이동합니다.
              </span>
            </div>

            {/* Slot Locations List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 text-xs">
              {selectedLotForLocations.vials.map((v, idx) => {
                const slotNum = getSlotNumber(v.row, v.col);
                const tankNum = formatIdToNumber(v.tankId);
                const rackNum = formatIdToNumber(v.rackId);
                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      setSelectedLotForLocations(null);
                      onSelectVial(v);
                    }}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-600 transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-900 text-slate-400 flex items-center justify-center font-mono font-bold text-[11px] border border-slate-800 group-hover:border-cyan-700 group-hover:text-cyan-300">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                          <span>Tank {tankNum}</span>
                          <ChevronRight className="w-3 h-3 text-slate-600" />
                          <span>Rack {rackNum}</span>
                          <ChevronRight className="w-3 h-3 text-slate-600" />
                          <span className="text-cyan-400 font-bold">Box {v.boxId}</span>
                          <ChevronRight className="w-3 h-3 text-slate-600" />
                          <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono font-bold border border-cyan-800">
                            {slotNum}번 슬롯
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {v.notes ? `메모: ${v.notes}` : '특이사항 메모 없음'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-2.5 py-1 rounded-lg bg-slate-800 group-hover:bg-cyan-600 text-slate-300 group-hover:text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span>선택</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLotForLocations(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
