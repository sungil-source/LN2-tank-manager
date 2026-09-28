import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  PlusCircle,
  Pencil,
  Check,
  X,
  Layers,
  Flame,
  RefreshCw,
  Copy,
  Clipboard,
  CheckSquare,
  Square,
  AlertTriangle,
  Info,
  Maximize2,
  FileText,
  Printer,
  Download,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { CryoBox, CellVial } from '../types/inventory';
import { getVialLotKey } from '../services/vialUtils';
import { BatchStoreModal } from './BatchStoreModal';
import { BatchThawModal } from './BatchThawModal';
import { BatchEditModal } from './BatchEditModal';
import { ConflictResolutionModal } from './ConflictResolutionModal';

interface CryoBoxViewProps {
  box: CryoBox;
  vials: CellVial[];
  onSelectVial: (vial: CellVial) => void;
  onSelectEmptySlot: (row: string, col: number) => void;
  searchHighlightQuery?: string;
  onUpdateBoxDescription?: (boxId: string, description: string) => void;
  canEdit?: boolean;
  currentUser?: User | null;
  onBatchAddVials?: (newVials: CellVial[]) => void;
  onBatchThawVials?: (vialIds: string[], thawedBy: string, purpose: string, notes?: string) => void;
  onBatchEditVials?: (params: {
    actionType: 'fill_or_update' | 'clear_all';
    newVialData?: Partial<CellVial>;
    thawedBy?: string;
    thawPurpose?: string;
    targetSlots: Array<{ row: string; col: number; existingVial?: CellVial }>;
    box: CryoBox;
  }) => void;
  onCopyPasteVials?: (
    sourceVial: CellVial,
    targets: Array<{ row: string; col: number; existingVial?: CellVial }>,
    action: 'overwrite' | 'fill_empty_only',
    box: CryoBox
  ) => void;
  showToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const CryoBoxView: React.FC<CryoBoxViewProps> = ({
  box,
  vials,
  onSelectVial,
  onSelectEmptySlot,
  searchHighlightQuery = '',
  onUpdateBoxDescription,
  canEdit = true,
  currentUser,
  onBatchAddVials,
  onBatchThawVials,
  onBatchEditVials,
  onCopyPasteVials,
  showToast,
}) => {
  const [colorMode, setColorMode] = useState<'cellLine' | 'researcher'>('cellLine');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState(box.description || '');

  // Selection state
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [lastFocusedCoord, setLastFocusedCoord] = useState<{ rIdx: number; cIdx: number } | null>(null);

  // Marquee Drag selection state
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [dragStartCoord, setDragStartCoord] = useState<{ rIdx: number; cIdx: number } | null>(null);
  const [dragCurrentCoord, setDragCurrentCoord] = useState<{ rIdx: number; cIdx: number } | null>(null);
  const [isDragSelecting, setIsDragSelecting] = useState(false);

  // Fill Handle Drag state
  const [isFillDragging, setIsFillDragging] = useState(false);
  const [fillSourceSlot, setFillSourceSlot] = useState<{ row: string; col: number; vial: CellVial; rIdx: number; cIdx: number } | null>(null);
  const [fillCurrentCoord, setFillCurrentCoord] = useState<{ rIdx: number; cIdx: number } | null>(null);

  // In-memory Clipboard
  const [clipboardVial, setClipboardVial] = useState<CellVial | null>(null);

  // Modals state
  const [isBatchStoreOpen, setIsBatchStoreOpen] = useState(false);
  const [isBatchThawOpen, setIsBatchThawOpen] = useState(false);
  const [isBatchEditOpen, setIsBatchEditOpen] = useState(false);
  const [conflictModalData, setConflictModalData] = useState<{
    isOpen: boolean;
    sourceVial: CellVial;
    conflictingVials: CellVial[];
    emptySlotCount: number;
    targetSlots: Array<{ row: string; col: number; existingVial?: CellVial }>;
  } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Keep description input synced with selected box
  useEffect(() => {
    setDescInput(box.description || '');
    setIsEditingDesc(false);
    setSelectedKeys(new Set());
    setLastFocusedCoord(null);
  }, [box.id, box.description]);

  const handleSaveDescription = () => {
    if (onUpdateBoxDescription) {
      onUpdateBoxDescription(box.id, descInput.trim());
    }
    setIsEditingDesc(false);
  };

  // 9x9 box: 81 slots numbered 1 to 81
  const rows = useMemo(() => ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'], []);
  const cols = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8, 9], []);

  // Filter vials in this box
  const boxVials = useMemo(
    () => vials.filter((v) => v.boxId === box.id && v.status === 'Stored'),
    [vials, box.id]
  );

  // Map coordinate to vial
  const slotMap = useMemo(() => {
    const map = new Map<string, CellVial>();
    boxVials.forEach((v) => {
      map.set(`${v.row}-${v.col}`, v);
    });
    return map;
  }, [boxVials]);

  // Generate list of 81 slots (1 to 81)
  const slotList = useMemo(() => {
    return Array.from({ length: 81 }, (_, i) => {
      const slotNumber = i + 1;
      const rIdx = Math.floor(i / 9);
      const cIdx = i % 9;
      const row = rows[rIdx];
      const col = cols[cIdx];
      const coordKey = `${row}-${col}`;
      const vial = slotMap.get(coordKey);
      return {
        slotNumber,
        row,
        col,
        rIdx,
        cIdx,
        coordKey,
        vial,
      };
    });
  }, [rows, cols, slotMap]);

  // Selected Slots Data
  const selectedSlotsData = useMemo(() => {
    return slotList
      .filter((s) => selectedKeys.has(s.coordKey))
      .map((s) => ({
        row: s.row,
        col: s.col,
        slotNumber: s.slotNumber,
        existingVial: s.vial,
      }));
  }, [slotList, selectedKeys]);

  const emptySelected = useMemo(
    () => selectedSlotsData.filter((s) => !s.existingVial),
    [selectedSlotsData]
  );

  const occupiedSelected = useMemo(
    () => selectedSlotsData.filter((s) => !!s.existingVial),
    [selectedSlotsData]
  );

  const occupiedSelectedVials = useMemo(
    () => occupiedSelected.map((s) => s.existingVial!),
    [occupiedSelected]
  );

  // Map of total identical batch count in the tank for each unique batch key:
  // ('세포주 이름', 'passage', '동결 일자', '등록자'가 동일하면 같은 세포주로 간주)
  const lotBatchCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of vials) {
      if (v.status !== 'Stored') continue;
      const key = getVialLotKey(v);
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [vials]);

  // Fill Drag Preview targets (sequential slot numbers from source to target)
  const fillPreviewCoords = useMemo(() => {
    if (!isFillDragging || !fillSourceSlot || !fillCurrentCoord) return new Set<string>();

    const startSlotNum = fillSourceSlot.rIdx * 9 + fillSourceSlot.cIdx + 1;
    const endSlotNum = fillCurrentCoord.rIdx * 9 + fillCurrentCoord.cIdx + 1;
    const minSlot = Math.min(startSlotNum, endSlotNum);
    const maxSlot = Math.max(startSlotNum, endSlotNum);

    const keys = new Set<string>();
    for (let s = minSlot; s <= maxSlot; s++) {
      if (s === startSlotNum) continue; // exclude source slot itself
      const idx = s - 1;
      const rIdx = Math.floor(idx / 9);
      const cIdx = idx % 9;
      keys.add(`${rows[rIdx]}-${cols[cIdx]}`);
    }
    return keys;
  }, [isFillDragging, fillSourceSlot, fillCurrentCoord, rows, cols]);

  // Window mouseup listener to end dragging anywhere
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      // 1. Finalize fill handle drag
      if (isFillDragging && fillSourceSlot && fillCurrentCoord) {
        const targetKeys = Array.from(fillPreviewCoords);
        if (targetKeys.length > 0 && onCopyPasteVials) {
          const targetSlots = targetKeys.map((key) => {
            const [r, c] = key.split('-');
            const colNum = parseInt(c, 10);
            return {
              row: r,
              col: colNum,
              existingVial: slotMap.get(key),
            };
          });

          const conflicting = targetSlots.filter((s) => !!s.existingVial && s.existingVial.status === 'Stored');
          const emptyCount = targetSlots.length - conflicting.length;

          if (conflicting.length > 0) {
            // Show Conflict Resolution Modal
            setConflictModalData({
              isOpen: true,
              sourceVial: fillSourceSlot.vial,
              conflictingVials: conflicting.map((s) => s.existingVial!),
              emptySlotCount: emptyCount,
              targetSlots,
            });
          } else {
            // Directly copy to all empty slots
            onCopyPasteVials(fillSourceSlot.vial, targetSlots, 'fill_empty_only', box);
          }
        }
        setIsFillDragging(false);
        setFillSourceSlot(null);
        setFillCurrentCoord(null);
      }

      // 2. Finalize Marquee drag
      setIsMouseDown(false);
      setIsDragSelecting(false);
      setDragStartCoord(null);
      setDragCurrentCoord(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isFillDragging, fillSourceSlot, fillCurrentCoord, fillPreviewCoords, onCopyPasteVials, slotMap, box]);

  // Keyboard Shortcuts (Ctrl+C, Ctrl+V, ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // ESC: Deselect
      if (e.key === 'Escape') {
        setSelectedKeys(new Set());
        setLastFocusedCoord(null);
        return;
      }

      // Ctrl+C / Cmd+C: Copy selected occupied vial
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (occupiedSelectedVials.length > 0) {
          e.preventDefault();
          const targetToCopy = occupiedSelectedVials[0];
          setClipboardVial(targetToCopy);
          if (showToast) {
            showToast(`[${targetToCopy.cellLineName}] 바이알 정보가 클립보드에 복사되었습니다. (슬롯 선택 후 Ctrl+V)`, 'info');
          }
        }
      }

      // Ctrl+V / Cmd+V: Paste into selected slots
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboardVial && selectedSlotsData.length > 0 && onCopyPasteVials) {
          e.preventDefault();
          const targetSlots = selectedSlotsData;
          const conflicting = targetSlots.filter((s) => !!s.existingVial && s.existingVial.status === 'Stored');
          const emptyCount = targetSlots.length - conflicting.length;

          if (conflicting.length > 0) {
            setConflictModalData({
              isOpen: true,
              sourceVial: clipboardVial,
              conflictingVials: conflicting.map((s) => s.existingVial!),
              emptySlotCount: emptyCount,
              targetSlots,
            });
          } else {
            onCopyPasteVials(clipboardVial, targetSlots, 'fill_empty_only', box);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clipboardVial, occupiedSelectedVials, selectedSlotsData, onCopyPasteVials, showToast, box]);

  // Slot Mouse Down handler
  const handleSlotMouseDown = (
    e: React.MouseEvent,
    row: string,
    col: number,
    rIdx: number,
    cIdx: number,
    coordKey: string,
    vial?: CellVial
  ) => {
    // If fill drag is active, ignore
    if (isFillDragging) return;

    // Ctrl / Cmd: Toggle individual slot
    if (e.ctrlKey || e.metaKey) {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(coordKey)) {
          next.delete(coordKey);
        } else {
          next.add(coordKey);
        }
        return next;
      });
      setLastFocusedCoord({ rIdx, cIdx });
      return;
    }

    // Shift: Range select sequentially by slot numbers from lastFocusedCoord
    if (e.shiftKey && lastFocusedCoord) {
      const startSlot = lastFocusedCoord.rIdx * 9 + lastFocusedCoord.cIdx + 1;
      const endSlot = rIdx * 9 + cIdx + 1;
      const minSlot = Math.min(startSlot, endSlot);
      const maxSlot = Math.max(startSlot, endSlot);

      const next = new Set<string>();
      for (let s = minSlot; s <= maxSlot; s++) {
        const idx = s - 1;
        const r = Math.floor(idx / 9);
        const c = idx % 9;
        next.add(`${rows[r]}-${cols[c]}`);
      }
      setSelectedKeys(next);
      return;
    }

    // Normal Click / Drag Start
    setIsMouseDown(true);
    setDragStartCoord({ rIdx, cIdx });
    setDragCurrentCoord({ rIdx, cIdx });
    setSelectedKeys(new Set([coordKey]));
    setLastFocusedCoord({ rIdx, cIdx });
  };

  // Slot Mouse Enter handler (for Dragging selection or Fill Drag)
  const handleSlotMouseEnter = (rIdx: number, cIdx: number) => {
    // Fill handle drag preview
    if (isFillDragging) {
      setFillCurrentCoord({ rIdx, cIdx });
      return;
    }

    // Drag selection (sequential slot numbers from dragStartCoord to current)
    if (isMouseDown && dragStartCoord) {
      setIsDragSelecting(true);
      setDragCurrentCoord({ rIdx, cIdx });

      const startSlot = dragStartCoord.rIdx * 9 + dragStartCoord.cIdx + 1;
      const currentSlot = rIdx * 9 + cIdx + 1;
      const minSlot = Math.min(startSlot, currentSlot);
      const maxSlot = Math.max(startSlot, currentSlot);

      const next = new Set<string>();
      for (let s = minSlot; s <= maxSlot; s++) {
        const idx = s - 1;
        const r = Math.floor(idx / 9);
        const c = idx % 9;
        next.add(`${rows[r]}-${cols[c]}`);
      }
      setSelectedKeys(next);
    }
  };

  // Start Fill Handle Drag
  const handleStartFillDrag = (
    e: React.MouseEvent,
    row: string,
    col: number,
    rIdx: number,
    cIdx: number,
    vial: CellVial
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setIsFillDragging(true);
    setFillSourceSlot({ row, col, vial, rIdx, cIdx });
    setFillCurrentCoord({ rIdx, cIdx });
  };

  // Slot Double Click handler
  const handleSlotDoubleClick = (vial?: CellVial, row: string = 'A', col: number = 1) => {
    if (vial) {
      onSelectVial(vial);
    } else {
      onSelectEmptySlot(row, col);
    }
  };

  // Copy Action Button Handler
  const handleCopyAction = () => {
    if (occupiedSelectedVials.length > 0) {
      const targetToCopy = occupiedSelectedVials[0];
      setClipboardVial(targetToCopy);
      if (showToast) {
        showToast(`[${targetToCopy.cellLineName}] 바이알 정보가 복사되었습니다.`, 'info');
      }
    }
  };

  // Paste Action Button Handler
  const handlePasteAction = () => {
    if (clipboardVial && selectedSlotsData.length > 0 && onCopyPasteVials) {
      const targetSlots = selectedSlotsData;
      const conflicting = targetSlots.filter((s) => !!s.existingVial && s.existingVial.status === 'Stored');
      const emptyCount = targetSlots.length - conflicting.length;

      if (conflicting.length > 0) {
        setConflictModalData({
          isOpen: true,
          sourceVial: clipboardVial,
          conflictingVials: conflicting.map((s) => s.existingVial!),
          emptySlotCount: emptyCount,
          targetSlots,
        });
      } else {
        onCopyPasteVials(clipboardVial, targetSlots, 'fill_empty_only', box);
      }
    }
  };

  // Conflict Resolution Action
  const handleResolveConflict = (action: 'overwrite' | 'fill_empty_only' | 'cancel') => {
    if (action === 'cancel' || !conflictModalData || !onCopyPasteVials) {
      setConflictModalData(null);
      return;
    }

    onCopyPasteVials(
      conflictModalData.sourceVial,
      conflictModalData.targetSlots,
      action,
      box
    );
    setConflictModalData(null);
  };

  // Palette for cell line names: same cellLineName = same color
  const CELL_LINE_COLOR_PALETTES = [
    'bg-cyan-950/40 border-cyan-500/50 hover:border-cyan-400 text-cyan-200',
    'bg-emerald-950/40 border-emerald-500/50 hover:border-emerald-400 text-emerald-200',
    'bg-blue-950/40 border-blue-500/50 hover:border-blue-400 text-blue-200',
    'bg-purple-950/40 border-purple-500/50 hover:border-purple-400 text-purple-200',
    'bg-amber-950/40 border-amber-500/50 hover:border-amber-400 text-amber-200',
    'bg-rose-950/40 border-rose-500/50 hover:border-rose-400 text-rose-200',
    'bg-teal-950/40 border-teal-500/50 hover:border-teal-400 text-teal-200',
    'bg-indigo-950/40 border-indigo-500/50 hover:border-indigo-400 text-indigo-200',
    'bg-fuchsia-950/40 border-fuchsia-500/50 hover:border-fuchsia-400 text-fuchsia-200',
    'bg-violet-950/40 border-violet-500/50 hover:border-violet-400 text-violet-200',
    'bg-sky-950/40 border-sky-500/50 hover:border-sky-400 text-sky-200',
    'bg-lime-950/40 border-lime-500/50 hover:border-lime-400 text-lime-200',
    'bg-orange-950/40 border-orange-500/50 hover:border-orange-400 text-orange-200',
    'bg-pink-950/40 border-pink-500/50 hover:border-pink-400 text-pink-200',
  ];

  const getCellLineColor = (cellLineName: string): string => {
    const normalized = (cellLineName || '').trim().toLowerCase();
    if (!normalized) {
      return 'bg-cyan-950/40 border-cyan-500/50 hover:border-cyan-400 text-cyan-200';
    }
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = (hash << 5) - hash + normalized.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % CELL_LINE_COLOR_PALETTES.length;
    return CELL_LINE_COLOR_PALETTES[index];
  };

  const RESEARCHER_COLOR_PALETTES = [
    'bg-indigo-950/40 border-indigo-500/50 hover:border-indigo-400 text-indigo-200',
    'bg-rose-950/40 border-rose-500/50 hover:border-rose-400 text-rose-200',
    'bg-teal-950/40 border-teal-500/50 hover:border-teal-400 text-teal-200',
    'bg-amber-950/40 border-amber-500/50 hover:border-amber-400 text-amber-200',
    'bg-purple-950/40 border-purple-500/50 hover:border-purple-400 text-purple-200',
    'bg-cyan-950/40 border-cyan-500/50 hover:border-cyan-400 text-cyan-200',
    'bg-emerald-950/40 border-emerald-500/50 hover:border-emerald-400 text-emerald-200',
  ];

  const getResearcherColor = (researcher: string): string => {
    const normalized = (researcher || '').trim().toLowerCase();
    if (!normalized) {
      return 'bg-slate-900/60 border-slate-700/60 text-slate-300';
    }
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = (hash << 5) - hash + normalized.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % RESEARCHER_COLOR_PALETTES.length;
    return RESEARCHER_COLOR_PALETTES[index];
  };

  // Color mapper based on cellLineName or researcher
  const getSlotColor = (vial: CellVial | undefined) => {
    if (!vial) {
      return 'bg-slate-950/60 border-slate-800/80 text-slate-500 hover:border-cyan-500/70 hover:bg-slate-900/80 hover:text-cyan-300';
    }

    if (colorMode === 'researcher') {
      return getResearcherColor(vial.researcher);
    }

    // Default: 'cellLine' - identical cellLineName gets identical color
    return getCellLineColor(vial.cellLineName);
  };

  const totalSlots = 81;
  const occupiedCount = boxVials.length;
  const emptyCount = totalSlots - occupiedCount;
  const occupancyRate = Math.round((occupiedCount / totalSlots) * 100);

  /**
   * Formats cell line name and passage number.
   */
  const getCellDisplayInfo = (name: string, passage: number) => {
    const passageText = `p${passage}`;

    let totalWeight = 0;
    for (let i = 0; i < name.length; i++) {
      totalWeight += name.charCodeAt(i) > 0x7f ? 1.7 : 1.0;
    }

    const TWO_LINES_MAX_WEIGHT = 27;

    if (totalWeight > TWO_LINES_MAX_WEIGHT) {
      let currentWeight = 0;
      let cut1Index = 0;
      for (let i = 0; i < name.length; i++) {
        currentWeight += name.charCodeAt(i) > 0x7f ? 1.7 : 1.0;
        if (currentWeight >= TWO_LINES_MAX_WEIGHT) {
          cut1Index = i;
          break;
        }
      }

      const part1and2 = name.slice(0, cut1Index).trim();
      const part3Raw = name.slice(cut1Index).trim();

      const LINE3_MAX_WEIGHT = 9;
      let line3Weight = 0;
      let cut3Index = part3Raw.length;
      for (let i = 0; i < part3Raw.length; i++) {
        line3Weight += part3Raw.charCodeAt(i) > 0x7f ? 1.7 : 1.0;
        if (line3Weight >= LINE3_MAX_WEIGHT) {
          cut3Index = i;
          break;
        }
      }

      const part3Text =
        cut3Index < part3Raw.length
          ? part3Raw.slice(0, cut3Index).trim() + '...'
          : part3Raw + '...';

      return {
        isOverTwoLines: true,
        part1and2,
        part3Text,
        passageText,
        fullTitle: `${name} ${passageText}`,
      };
    }

    return {
      isOverTwoLines: false,
      name,
      passageText,
      fullTitle: `${name} ${passageText}`,
    };
  };

  const PRINT_PALETTE = [
    { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' }, // Sky
    { bg: '#dcfce7', text: '#15803d', border: '#86efac' }, // Green
    { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' }, // Purple
    { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' }, // Amber
    { bg: '#ffe4e6', text: '#be123c', border: '#fda4af' }, // Rose
    { bg: '#ccfbf1', text: '#0f766e', border: '#5eead4' }, // Teal
    { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' }, // Indigo
    { bg: '#fae8ff', text: '#a21caf', border: '#f0abfc' }, // Fuchsia
    { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' }, // Orange
  ];

  const getPrintColor = (name: string) => {
    const normalized = (name || '').trim().toLowerCase();
    if (!normalized) return { bg: '#f8fafc', text: '#334155', border: '#cbd5e1' };
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = (hash << 5) - hash + normalized.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % PRINT_PALETTE.length;
    return PRINT_PALETTE[idx];
  };

  /**
   * Safely formats and truncates cell line name so it never cuts off midway.
   * Allows comfortable space across 2-3 lines before truncating.
   */
  const formatCellNameForPdf = (name: string): string => {
    const trimmed = (name || '').trim();
    if (!trimmed) return '-';
    let weight = 0;
    let cut = trimmed.length;
    // Korean / CJK glyphs are wider (~1.6x Latin characters)
    for (let i = 0; i < trimmed.length; i++) {
      weight += trimmed.charCodeAt(i) > 0x07ff ? 1.6 : 1.0;
      if (weight > 44) {
        cut = i;
        break;
      }
    }
    if (cut < trimmed.length) {
      return trimmed.slice(0, cut) + '...';
    }
    return trimmed;
  };

  /**
   * Safely formats researcher name so it fits cleanly on one line without horizontal cutoff.
   * Returns empty string if no researcher is recorded.
   */
  const formatResearcherForPdf = (researcher?: string): string => {
    const trimmed = (researcher || '').trim();
    if (!trimmed) return '';
    // If researcher is an email address, extract username part before '@'
    if (trimmed.includes('@')) {
      const userPart = trimmed.split('@')[0];
      if (userPart.length > 10) {
        return userPart.slice(0, 9) + '..';
      }
      return userPart;
    }
    let weight = 0;
    let cut = trimmed.length;
    for (let i = 0; i < trimmed.length; i++) {
      weight += trimmed.charCodeAt(i) > 0x07ff ? 1.6 : 1.0;
      if (weight > 12) {
        cut = i;
        break;
      }
    }
    if (cut < trimmed.length) {
      return trimmed.slice(0, cut) + '..';
    }
    return trimmed;
  };

  /**
   * Generates and downloads a real PDF file for the current 2D box map (Portrait A4).
   */
  const handleExportPDF = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    if (showToast) {
      showToast(`Box ${box.id} 2D 맵 PDF 문서를 생성하는 중입니다...`, 'info');
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (!pdfContainerRef.current) {
        throw new Error('PDF 템플릿 요소를 찾을 수 없습니다.');
      }

      const canvas = await html2canvas(pdfContainerRef.current, {
        scale: 2, // High resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm

      const margin = 8; // 8mm margin to maximize space
      const usableWidth = pdfWidth - margin * 2; // 194 mm
      const usableHeight = pdfHeight - margin * 2; // 281 mm

      const imgData = canvas.toDataURL('image/png');
      const imgHeight = (canvas.height * usableWidth) / canvas.width;

      if (imgHeight <= usableHeight) {
        const offsetY = margin + (usableHeight - imgHeight) / 2;
        pdf.addImage(imgData, 'PNG', margin, offsetY, usableWidth, imgHeight, undefined, 'FAST');
      } else {
        const scale = usableHeight / imgHeight;
        const scaledWidth = usableWidth * scale;
        const offsetX = (pdfWidth - scaledWidth) / 2;
        pdf.addImage(imgData, 'PNG', offsetX, margin, scaledWidth, usableHeight, undefined, 'FAST');
      }

      const safeRackNum = box.rackId.replace('RACK-', '');
      const fileName = `LN2_Tank_Rack_${safeRackNum}_Box_${box.id}_2D_Map.pdf`;
      pdf.save(fileName);

      if (showToast) {
        showToast(`'${fileName}' PDF 파일 다운로드가 완료되었습니다.`, 'success');
      }
    } catch (err: any) {
      console.error('PDF export error:', err);
      if (showToast) {
        showToast(`PDF 다운로드 실패: ${err.message || '오류 발생'}`, 'error');
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl relative w-full select-none">
      {/* Box Header & Color Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-md inline-block shadow-sm shrink-0"
              style={{ backgroundColor: box.colorTag }}
            />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {box.name.replace(/\s*\(Tier[^)]*\)/i, '').trim()}
            </h2>
          </div>

          {/* User editable box description */}
          <div className="mt-1">
            {isEditingDesc ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <input
                  type="text"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  placeholder="박스 설명 입력 (예: 주요 보관 세포, 프로젝트명, 실험 목적)..."
                  className="bg-slate-950 border border-cyan-500 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-hidden w-64 sm:w-80 font-sans"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveDescription();
                    if (e.key === 'Escape') setIsEditingDesc(false);
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveDescription}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" /> 저장
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingDesc(false)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> 취소
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <p className="text-xs text-slate-400">
                  {box.description ? (
                    box.description
                  ) : (
                    <span className="text-slate-500 italic">박스 설명이 없습니다.</span>
                  )}
                </p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setDescInput(box.description || '');
                      setIsEditingDesc(true);
                    }}
                    className="text-slate-500 hover:text-cyan-400 p-1 rounded hover:bg-slate-800/80 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                    title="박스 설명 수정/입력"
                  >
                    <Pencil className="w-3 h-3" />
                    <span className="text-[11px]">{box.description ? '설명 수정' : '설명 입력'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* View Mode & Stats */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span>보관: <strong className="text-cyan-400 font-mono">{occupiedCount}</strong></span>
            <span className="text-slate-700">|</span>
            <span>빈 슬롯: <strong className="text-slate-400 font-mono">{emptyCount}</strong></span>
            <span className="text-slate-700">|</span>
            <span>점유율: <strong className="text-emerald-400 font-mono">{occupancyRate}%</strong></span>
          </div>

          {/* Color Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-[11px] text-slate-500 px-1.5 font-medium">색상:</span>
            <button
              onClick={() => setColorMode('cellLine')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                colorMode === 'cellLine' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="세포주 이름별로 동일한 색상 자동 표시"
            >
              세포 종류 (세포주명)
            </button>
            <button
              onClick={() => setColorMode('researcher')}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                colorMode === 'researcher' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="등록자(연구원)별 색상 구분"
            >
              등록 연구원
            </button>
          </div>

          {/* PDF Export Action Button */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-cyan-500 text-xs font-semibold shadow-xs transition-all cursor-pointer hover:text-white disabled:opacity-50"
            title="현재 박스의 2D 맵 및 보관 상세 목록을 PDF 파일로 즉시 다운로드"
          >
            {isExportingPdf ? (
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>{isExportingPdf ? 'PDF 생성 중...' : '2D 맵 PDF 다운로드'}</span>
          </button>
        </div>
      </div>

      {/* Dynamic Selection Toolbar (Shown when slots are selected or clipboard has item) */}
      <div className="mt-3">
        {selectedKeys.size > 0 ? (
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-800/80 shadow-lg flex items-center justify-between flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
            {/* Left: Selection Counter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 font-bold border border-cyan-700 flex items-center gap-1.5 font-mono">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{selectedKeys.size}개 슬롯 선택됨</span>
              </span>
              <span className="text-slate-400 text-[11px]">
                (빈 슬롯 <strong className="text-white font-mono">{emptySelected.length}</strong> · 보관 <strong className="text-cyan-400 font-mono">{occupiedSelected.length}</strong>)
              </span>
            </div>

            {/* Center / Right: Dynamic Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Case 1: Only empty slots selected -> '일괄 입고' */}
              {emptySelected.length > 0 && occupiedSelected.length === 0 && (
                <button
                  type="button"
                  onClick={() => setIsBatchStoreOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-cyan-950 transition-all cursor-pointer animate-pulse"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>일괄 입고 ({emptySelected.length}개)</span>
                </button>
              )}

              {/* Case 2: Only occupied slots selected -> '일괄 출고' */}
              {occupiedSelected.length > 0 && emptySelected.length === 0 && (
                <button
                  type="button"
                  onClick={() => setIsBatchThawOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-amber-950 transition-all cursor-pointer animate-pulse"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>일괄 출고 ({occupiedSelected.length}개)</span>
                </button>
              )}

              {/* Case 3: Both empty and occupied selected -> '일괄 수정' */}
              {emptySelected.length > 0 && occupiedSelected.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsBatchEditOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-purple-950 transition-all cursor-pointer animate-pulse"
                  title="빈 슬롯: 입고 / 기존 슬롯: 출고 후 교체 입고 또는 비우기"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>일괄 수정 (총 {selectedKeys.size}개)</span>
                </button>
              )}

              {/* Copy Button (Enabled if at least 1 occupied slot selected) */}
              {occupiedSelected.length >= 1 && (
                <button
                  type="button"
                  onClick={handleCopyAction}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                  title="선택한 바이알 정보 복사 (Ctrl+C)"
                >
                  <Copy className="w-3 h-3 text-cyan-400" />
                  <span>복사 (Ctrl+C)</span>
                </button>
              )}

              {/* Paste Button (Enabled if clipboard has vial) */}
              {clipboardVial && (
                <button
                  type="button"
                  onClick={handlePasteAction}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium flex items-center gap-1 border border-cyan-800 transition-colors cursor-pointer"
                  title={`[${clipboardVial.cellLineName}] 붙여넣기 (Ctrl+V)`}
                >
                  <Clipboard className="w-3 h-3 text-cyan-400" />
                  <span>붙여넣기</span>
                  <span className="text-[10px] text-slate-400 font-mono">({clipboardVial.cellLineName})</span>
                </button>
              )}

              {/* Single Detail view if exactly 1 occupied slot */}
              {occupiedSelected.length === 1 && emptySelected.length === 0 && (
                <button
                  type="button"
                  onClick={() => onSelectVial(occupiedSelectedVials[0])}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                >
                  <FileText className="w-3 h-3 text-cyan-400" />
                  <span>상세보기</span>
                </button>
              )}

              {/* Select All 81 */}
              <button
                type="button"
                onClick={() => {
                  const allKeys = new Set(slotList.map((s) => s.coordKey));
                  setSelectedKeys(allKeys);
                }}
                className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-white text-[11px] transition-colors cursor-pointer"
                title="전체 81개 슬롯 선택"
              >
                전체선택
              </button>

              {/* Deselect */}
              <button
                type="button"
                onClick={() => {
                  setSelectedKeys(new Set());
                  setLastFocusedCoord(null);
                }}
                className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-rose-400 text-[11px] flex items-center gap-0.5 transition-colors cursor-pointer"
                title="선택 해제 (ESC)"
              >
                <X className="w-3.5 h-3.5" />
                <span>해제</span>
              </button>
            </div>
          </div>
        ) : (
          /* Idle Helpful Shortcuts Tip Bar */
          <div className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold">💡 다중 선택 및 연속 채우기:</span>
              <span>
                마우스 <strong>드래그</strong>, <strong>Ctrl+클릭</strong>, <strong>Shift+클릭</strong>으로 여러 슬롯을 선택해 <strong>일괄 입고</strong> / <strong>일괄 출고</strong> / <strong>일괄 수정</strong>을 진행할 수 있습니다.
              </span>
            </div>

            {clipboardVial && (
              <div className="flex items-center gap-1.5 text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                <Clipboard className="w-3 h-3" />
                <span>클립보드: {clipboardVial.cellLineName} (슬롯 선택 후 Ctrl+V)</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Responsive 9x9 Cryo Box Grid */}
      <div className="mt-2.5 w-full" ref={gridRef}>
        <div className="w-full p-2 sm:p-2.5 bg-slate-950/90 rounded-2xl border border-slate-800/90 shadow-inner">
          <div className="grid grid-cols-9 gap-1 sm:gap-1.5 w-full">
            {slotList.map(({ slotNumber, row, col, rIdx, cIdx, coordKey, vial }) => {
              const isOccupied = !!vial;
              const isSelected = selectedKeys.has(coordKey);
              const isFillPreview = fillPreviewCoords.has(coordKey);

              // Match search query
              const isSearched =
                Boolean(searchHighlightQuery.trim()) &&
                Boolean(vial) &&
                (vial!.cellLineName.toLowerCase().includes(searchHighlightQuery.toLowerCase()) ||
                  vial!.researcher.toLowerCase().includes(searchHighlightQuery.toLowerCase()) ||
                  slotNumber.toString() === searchHighlightQuery.trim() ||
                  vial!.passage.toString() === searchHighlightQuery.trim());

              const lotKey = isOccupied ? getVialLotKey(vial) : '';
              const lotCount = isOccupied ? (lotBatchCounts.get(lotKey) || 1) : 0;
              const isLowStock = isOccupied && lotCount <= 2;
              const cellInfo = isOccupied ? getCellDisplayInfo(vial.cellLineName, vial.passage) : null;

              return (
                <div
                  key={coordKey}
                  onMouseDown={(e) => handleSlotMouseDown(e, row, col, rIdx, cIdx, coordKey, vial)}
                  onMouseEnter={() => handleSlotMouseEnter(rIdx, cIdx)}
                  onDoubleClick={() => handleSlotDoubleClick(vial, row, col)}
                  className={`h-[92px] sm:h-[96px] rounded-lg border flex flex-col justify-between text-left pt-1 pb-1.5 px-1.5 relative transition-all duration-100 group cursor-pointer shadow-xs select-none ${getSlotColor(
                    vial
                  )} ${
                    isSelected
                      ? 'ring-2 ring-cyan-400 bg-cyan-950/50 shadow-md shadow-cyan-950 z-20'
                      : ''
                  } ${
                    isFillPreview
                      ? 'ring-2 ring-amber-400 ring-dashed bg-amber-950/40 z-30 animate-pulse'
                      : ''
                  } ${
                    isSearched
                      ? 'ring-2 ring-yellow-400 scale-[1.02] z-10 shadow-lg shadow-yellow-500/30'
                      : ''
                  }`}
                  title={
                    vial
                      ? `[${slotNumber}번 슬롯] ${cellInfo?.fullTitle} | 잔여: ${lotCount}개${isLowStock ? ' (재고부족)' : ''}${vial.freezeDate ? ` | 동결: ${vial.freezeDate}` : ''}${vial.researcher ? ` | 등록: ${vial.researcher}` : ''}`
                      : `[${slotNumber}번] 빈 슬롯 (클릭 또는 드래그하여 다중 선택)`
                  }
                >
                  {/* Selection Indicator Badge */}
                  {isSelected && (
                    <div className="absolute top-1 right-1 z-20 w-3.5 h-3.5 rounded bg-cyan-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}

                  {/* Fill Preview Overlay Text */}
                  {isFillPreview && (
                    <div className="absolute inset-0 bg-cyan-950/80 backdrop-blur-2xs flex flex-col items-center justify-center text-cyan-300 font-bold text-[10px] z-30 rounded-lg">
                      <span>+ 채우기</span>
                    </div>
                  )}

                  {/* Slot Body Content */}
                  {isOccupied && cellInfo ? (
                    <>
                      {/* Top Header: Slot Number & Low Stock Indicator */}
                      <div className="flex items-center justify-between w-full leading-none mb-0.5">
                        <span className="text-[9px] font-mono font-bold text-cyan-400/90 leading-none">
                          {slotNumber}
                        </span>
                        {isLowStock && !isSelected && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0"
                            title={`동일 세포주 잔여: ${lotCount}개 (재고 부족)`}
                          />
                        )}
                      </div>

                      {/* Information Items */}
                      <div className="flex-1 flex flex-col justify-between w-full min-h-0 pt-0.5 pointer-events-none">
                        {cellInfo.isOverTwoLines ? (
                          <div className="space-y-0.5">
                            <div
                              className="text-[10px] font-bold text-white leading-[13.5px] line-clamp-2 break-all group-hover:text-cyan-200 transition-colors"
                              title={cellInfo.fullTitle}
                            >
                              {cellInfo.part1and2}
                            </div>
                            <div className="flex items-center justify-between w-full min-w-0 leading-[13.5px]">
                              <span
                                className="truncate flex-1 min-w-0 text-[10px] font-bold text-white group-hover:text-cyan-200 transition-colors mr-1"
                                title={cellInfo.fullTitle}
                              >
                                {cellInfo.part3Text}
                              </span>
                              <span className="text-[10px] font-mono font-semibold text-cyan-300 shrink-0 text-right">
                                {cellInfo.passageText}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div
                              className="text-[10px] font-bold text-white leading-[13.5px] line-clamp-2 break-all group-hover:text-cyan-200 transition-colors"
                              title={cellInfo.fullTitle}
                            >
                              {cellInfo.name}
                            </div>
                            <div className="text-[10px] font-mono text-cyan-300 font-semibold leading-[13.5px]">
                              {cellInfo.passageText}
                            </div>
                          </div>
                        )}

                        <div className="space-y-0.5 pt-0.5">
                          <div className="text-[10px] font-mono text-slate-300 leading-[13px] truncate min-h-[13px]">
                            {vial.freezeDate || ''}
                          </div>
                          <div className="text-[10px] font-sans text-slate-300 leading-[13px] truncate min-h-[13px]">
                            {vial.researcher || ''}
                          </div>
                        </div>
                      </div>

                      {/* Excel-style Drag Fill Handle (on bottom-right of occupied slot when selected) */}
                      {isSelected && canEdit && (
                        <div
                          data-fill-handle="true"
                          onMouseDown={(e) => handleStartFillDrag(e, row, col, rIdx, cIdx, vial)}
                          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-cyan-400 border border-slate-950 rounded-tl-sm cursor-crosshair z-30 hover:scale-125 transition-transform shadow-xs"
                          title="드래그하여 인접 슬롯에 내용 연속 복사 (Fill Handle)"
                        />
                      )}
                    </>
                  ) : (
                    /* Empty Slot Display */
                    <div className="flex flex-col items-center justify-between h-full w-full text-center pointer-events-none">
                      <div className="w-full flex justify-start leading-none">
                        <span className="text-[9px] font-mono font-bold text-slate-500 group-hover:text-cyan-400 transition-colors leading-none">
                          {slotNumber}
                        </span>
                      </div>
                      <PlusCircle className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 group-hover:scale-110 transition-all opacity-60 group-hover:opacity-100 my-auto" />
                      <span className="text-[9px] text-slate-600 group-hover:text-cyan-300 transition-colors leading-none">
                        빈 슬롯
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid Legend & Instructions */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500">범례:</span>
          {colorMode === 'cellLine' && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded bg-cyan-400"></span>
              <span>세포주 이름별 자동 색상 구분 (동일 세포주는 동일 색상)</span>
            </div>
          )}
          {colorMode === 'researcher' && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded bg-indigo-400"></span>
              <span>등록 연구원별 색상 구분</span>
            </div>
          )}
          <div className="flex items-center gap-1 ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-[11px] text-slate-300">재고 부족 (동일 세포주 잔여 &le;2개)</span>
          </div>
        </div>

        <div className="text-[11px] text-cyan-400/80 font-medium">
          💡 더블클릭: 단일 슬롯 상세보기/등록 | 드래그 또는 Shift/Ctrl: 다중 선택 및 일괄 처리
        </div>
      </div>

      {/* Batch Store Modal */}
      {isBatchStoreOpen && onBatchAddVials && (
        <BatchStoreModal
          isOpen={isBatchStoreOpen}
          onClose={() => {
            setIsBatchStoreOpen(false);
            setSelectedKeys(new Set());
          }}
          selectedSlots={emptySelected}
          box={box}
          currentUser={currentUser}
          onBatchAdd={(newVials) => {
            onBatchAddVials(newVials);
            setSelectedKeys(new Set());
          }}
        />
      )}

      {/* Batch Thaw Modal */}
      {isBatchThawOpen && onBatchThawVials && (
        <BatchThawModal
          isOpen={isBatchThawOpen}
          onClose={() => {
            setIsBatchThawOpen(false);
            setSelectedKeys(new Set());
          }}
          selectedVials={occupiedSelectedVials}
          currentUser={currentUser}
          onBatchThaw={(vialIds, thawedBy, purpose, notes) => {
            onBatchThawVials(vialIds, thawedBy, purpose, notes);
            setSelectedKeys(new Set());
          }}
        />
      )}

      {/* Batch Edit Modal */}
      {isBatchEditOpen && onBatchEditVials && (
        <BatchEditModal
          isOpen={isBatchEditOpen}
          onClose={() => {
            setIsBatchEditOpen(false);
            setSelectedKeys(new Set());
          }}
          selectedSlots={selectedSlotsData}
          box={box}
          currentUser={currentUser}
          onApplyBatchEdit={(params) => {
            onBatchEditVials({
              ...params,
              targetSlots: selectedSlotsData,
              box,
            });
            setSelectedKeys(new Set());
          }}
        />
      )}

      {/* Conflict Resolution Modal (for Drag-Fill & Ctrl+V Paste) */}
      {conflictModalData && (
        <ConflictResolutionModal
          isOpen={conflictModalData.isOpen}
          onClose={() => setConflictModalData(null)}
          conflictingVials={conflictModalData.conflictingVials}
          emptySlotCount={conflictModalData.emptySlotCount}
          sourceVial={conflictModalData.sourceVial}
          onResolve={handleResolveConflict}
        />
      )}

      {/* Hidden high-res container for direct PDF export (Portrait A4) */}
      <div
        ref={pdfContainerRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '800px',
          background: '#ffffff',
          color: '#0f172a',
          padding: '16px 20px',
          boxSizing: 'border-box',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '2.5px solid #0284c7',
            paddingBottom: '10px',
            marginBottom: '10px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '24px',
                  padding: '0 10px',
                  background: '#0284c7',
                  borderRadius: '5px',
                  boxSizing: 'border-box',
                }}
              >
                <span
                  style={{
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '11px',
                    lineHeight: '1',
                    display: 'inline-block',
                    position: 'relative',
                    top: '-5px',
                  }}
                >
                  LN2 Tank Manager (Beta)
                </span>
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '19px',
                  fontWeight: 800,
                  color: '#0369a1',
                  letterSpacing: '-0.5px',
                }}
              >
                Box {box.id} 2D 맵 (9×9, 81 Wells)
              </h1>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
              위치: {box.rackId.replace('RACK-', 'Rack ')} &gt; Box {box.id}{' '}
              {box.description ? `· ${box.description}` : ''}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '28px',
                padding: '0 12px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                boxSizing: 'border-box',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: '#334155',
                  fontWeight: 600,
                  lineHeight: '1',
                  display: 'inline-block',
                  position: 'relative',
                  top: '-5px',
                }}
              >
                보관: <strong style={{ color: '#0284c7' }}>{occupiedCount}구</strong> ({occupancyRate}%) &nbsp;|&nbsp; 빈 슬롯: <strong>{emptyCount}구</strong>
              </span>
            </div>
            <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '3px' }}>
              출력 일시: {new Date().toLocaleString('ko-KR')}
            </div>
          </div>
        </div>

        {/* 9x9 Grid Layout (Flexbox divs to prevent html2canvas table cell border collapse bug) */}
        <div
          style={{
            width: '100%',
            marginBottom: '10px',
            border: '1px solid #cbd5e1',
            boxSizing: 'border-box',
          }}
        >
          {/* Column Header Row */}
          <div style={{ display: 'flex', width: '100%' }}>
            <div
              style={{
                width: '32px',
                height: '24px',
                background: '#e2e8f0',
                borderRight: '1px solid #cbd5e1',
                borderBottom: '1px solid #cbd5e1',
                boxSizing: 'border-box',
                flexShrink: 0,
              }}
            />
            {cols.map((colNum) => (
              <div
                key={colNum}
                style={{
                  flex: 1,
                  height: '24px',
                  background: '#f1f5f9',
                  borderRight: colNum < 9 ? '1px solid #cbd5e1' : 'none',
                  borderBottom: '1px solid #cbd5e1',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#475569',
                  textAlign: 'center',
                  lineHeight: '23px',
                  boxSizing: 'border-box',
                }}
              >
                {colNum}
              </div>
            ))}
          </div>

          {/* Grid Rows (A to I) */}
          {rows.map((rowLetter, rIdx) => (
            <div
              key={rowLetter}
              style={{
                display: 'flex',
                width: '100%',
                borderBottom: rIdx < 8 ? '1px solid #cbd5e1' : 'none',
                boxSizing: 'border-box',
              }}
            >
              {/* Row Header Letter */}
              <div
                style={{
                  width: '32px',
                  height: '104px',
                  background: '#f1f5f9',
                  borderRight: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {rowLetter}
              </div>

              {/* 9 Slot Cells */}
              {cols.map((colNum, cIdx) => {
                const slotNum = rIdx * 9 + cIdx + 1;
                const vial = slotMap.get(`${rowLetter}-${colNum}`);
                if (vial) {
                  const color = getPrintColor(vial.cellLineName);
                  return (
                    <div
                      key={colNum}
                      style={{
                        flex: 1,
                        height: '104px',
                        backgroundColor: color.bg,
                        color: color.text,
                        borderRight: colNum < 9 ? `1px solid ${color.border}` : 'none',
                        padding: '6px 4px 6px 4px',
                        boxSizing: 'border-box',
                        textAlign: 'left',
                        position: 'relative',
                      }}
                    >
                      {/* TOP: Slot # and Passage badge */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          height: '14px',
                          marginBottom: '3px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '8.5px',
                            fontWeight: 800,
                            color: '#64748b',
                            lineHeight: '1',
                          }}
                        >
                          #{slotNum}
                        </span>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '15px',
                            padding: '0 4px',
                            backgroundColor: '#ffffff',
                            border: `1px solid ${color.border}`,
                            borderRadius: '3px',
                            boxSizing: 'border-box',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '8px',
                              fontWeight: 800,
                              color: color.text,
                              lineHeight: '1',
                              display: 'inline-block',
                              position: 'relative',
                              top: '-4px',
                            }}
                          >
                            p{vial.passage}
                          </span>
                        </div>
                      </div>

                      {/* CELL NAME: Shifted up */}
                      <div
                        style={{
                          width: '100%',
                          fontSize: '8.5px',
                          fontWeight: 900,
                          lineHeight: '1.25',
                          color: '#0f172a',
                          wordBreak: 'break-word',
                          textAlign: 'center',
                          marginBottom: '2px',
                        }}
                      >
                        {formatCellNameForPdf(vial.cellLineName)}
                      </div>

                      {/* RESEARCHER (if present) */}
                      {Boolean(formatResearcherForPdf(vial.researcher)) && (
                        <div
                          style={{
                            width: '100%',
                            fontSize: '7.5px',
                            fontWeight: 700,
                            color: '#334155',
                            lineHeight: '1.2',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            marginTop: '1px',
                          }}
                        >
                          {formatResearcherForPdf(vial.researcher)}
                        </div>
                      )}

                      {/* FREEZE DATE (if present) */}
                      {Boolean(vial.freezeDate) && (
                        <div
                          style={{
                            width: '100%',
                            fontSize: '7.5px',
                            color: '#64748b',
                            lineHeight: '1.2',
                            textAlign: 'center',
                            marginTop: '1px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {vial.freezeDate}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <div
                    key={colNum}
                    style={{
                      flex: 1,
                      height: '104px',
                      backgroundColor: '#fafafa',
                      borderRight: colNum < 9 ? '1px solid #e2e8f0' : 'none',
                      padding: '6px 4px 6px 4px',
                      boxSizing: 'border-box',
                      textAlign: 'center',
                      position: 'relative',
                    }}
                  >
                    <div style={{ height: '14px', textAlign: 'left', marginBottom: '18px' }}>
                      <span
                        style={{
                          fontSize: '8.5px',
                          fontWeight: 700,
                          color: '#94a3b8',
                          lineHeight: '1',
                        }}
                      >
                        #{slotNum}
                      </span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 800,
                          color: '#cbd5e1',
                          letterSpacing: '1px',
                          lineHeight: '1',
                        }}
                      >
                        EMPTY
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '10px',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '6px',
            fontSize: '8.5px',
            color: '#94a3b8',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>LN2 Tank Manager (Beta) · 실험실 액체질소 세포주 보관 관리 시스템</span>
          <span>위치: {box.rackId.replace('RACK-', 'Rack ')} &gt; Box {box.id} (총 81구)</span>
        </div>
      </div>
    </div>
  );
};
