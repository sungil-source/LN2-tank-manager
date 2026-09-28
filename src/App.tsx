import React, { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout as firebaseLogout,
  getAccessToken,
} from './services/firebase';
import {
  INITIAL_TANKS,
  INITIAL_RACKS,
  INITIAL_BOXES,
  INITIAL_VIALS,
  INITIAL_AUDIT_LOGS,
} from './services/demoData';
import {
  readSpreadsheetVials,
  writeSpreadsheetVials,
} from './services/sheetsService';
import type {
  LN2Tank,
  CanisterRack,
  CryoBox,
  CellVial,
  ThawAuditRecord,
  GoogleSheetConfig,
} from './types/inventory';
import { Header } from './components/Header';
import { RackSidebar } from './components/RackSidebar';
import { CryoBoxView } from './components/CryoBoxView';
import { InventoryTableView } from './components/InventoryTableView';
import { AuditTrailView } from './components/AuditTrailView';
import { ToolsComparisonModal } from './components/ToolsComparisonModal';
import { VialDetailModal } from './components/VialDetailModal';
import { AddVialModal } from './components/AddVialModal';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { PermissionManageModal } from './components/PermissionManageModal';
import { getIdenticalBatchVials } from './services/vialUtils';
import { AlertCircle, CheckCircle, Database, Layers, Box as BoxIcon, ChevronRight } from 'lucide-react';

export default function App() {
  // Navigation & View State
  const [currentTab, setCurrentTab] = useState<'grid' | 'table' | 'audit' | 'tools'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Physical Inventory Topology State (Tank 1 with 6 Racks, 10 Boxes each 1-A ~ 6-J)
  const [tanks, setTanks] = useState<LN2Tank[]>(INITIAL_TANKS);
  const [selectedTank, setSelectedTank] = useState<LN2Tank>(INITIAL_TANKS[0]);

  const [racks, setRacks] = useState<CanisterRack[]>(() => {
    try {
      const saved = localStorage.getItem('cryocell_racks_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((r: CanisterRack) => ({
            ...r,
            name: r.name.replace(/\s*\([^)]*\)/g, '').trim(),
          }));
        }
      }
    } catch (e) {
      console.warn('Could not read cached racks', e);
    }
    return INITIAL_RACKS.map((r) => ({
      ...r,
      name: r.name.replace(/\s*\([^)]*\)/g, '').trim(),
    }));
  });
  const [selectedRackId, setSelectedRackId] = useState<string>('RACK-1');

  const [boxes, setBoxes] = useState<CryoBox[]>(() => {
    try {
      const saved = localStorage.getItem('cryocell_boxes_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((b: CryoBox) => ({
            ...b,
            name: b.name.replace(/\s*\(Tier[^)]*\)/i, '').trim(),
          }));
        }
      }
    } catch (e) {
      console.warn('Could not read cached boxes', e);
    }
    return INITIAL_BOXES;
  });
  const [selectedBox, setSelectedBox] = useState<CryoBox>(() => {
    const firstBox = INITIAL_BOXES[0];
    return {
      ...firstBox,
      name: firstBox.name.replace(/\s*\(Tier[^)]*\)/i, '').trim(),
    };
  });

  // Vials & Audit State (with local storage persistence v2)
  const [vials, setVials] = useState<CellVial[]>(() => {
    try {
      const saved = localStorage.getItem('cryocell_vials_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].boxId?.includes('-')) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read cached vials', e);
    }
    return INITIAL_VIALS;
  });

  const [auditLogs, setAuditLogs] = useState<ThawAuditRecord[]>(() => {
    try {
      const saved = localStorage.getItem('cryocell_audit_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read cached audit', e);
    }
    return INITIAL_AUDIT_LOGS;
  });

  // Google Sheets Config State
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig>(() => {
    try {
      const saved = localStorage.getItem('cryocell_sheet_config_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      spreadsheetId: '',
      spreadsheetName: '',
      sheetTitle: 'Cell_Stock',
      syncStatus: 'idle',
    };
  });

  // Auth State & Permissions
  const [user, setUser] = useState<User | null>(null);
  const [authorizedEmails, setAuthorizedEmails] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('cryocell_authorized_users_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    // Default authorized lab admin
    return ['sungil@jangslab.org'];
  });
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Check if current user is authorized to edit
  const isAuthorized = Boolean(
    user &&
    user.email &&
    authorizedEmails.some((auth) => auth.toLowerCase().trim() === user.email?.toLowerCase().trim())
  );

  // Modals State
  const [selectedVialForDetail, setSelectedVialForDetail] = useState<CellVial | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalSlot, setAddModalSlot] = useState<{ row: string; col: number }>({ row: 'A', col: 1 });
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Destructive Confirmation Modal
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'destructive' | 'warning' | 'info';
    itemsList?: string[];
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    actionType: 'warning',
    onConfirm: () => {},
  });

  // Show Toast Helper
  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('cryocell_vials_v2', JSON.stringify(vials));
    } catch (e) {}
  }, [vials]);

  useEffect(() => {
    try {
      localStorage.setItem('cryocell_audit_v2', JSON.stringify(auditLogs));
    } catch (e) {}
  }, [auditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('cryocell_sheet_config_v2', JSON.stringify(sheetConfig));
    } catch (e) {}
  }, [sheetConfig]);

  // Firebase Auth Lifecycle per Workspace Skill
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setUser(res.user);
        showToast(`${res.user.displayName || '사용자'}님 로그인되었습니다.`, 'success');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      const isDomainError =
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('auth/unauthorized-domain') ||
        err?.message?.includes('unauthorized-domain');

      if (isDomainError) {
        showToast(
          '로그인 실패 (auth/unauthorized-domain): Firebase Console > Authentication > Settings > Authorized domains에 현재 배포 도메인을 등록해주세요.',
          'error'
        );
      } else {
        showToast(`로그인 실패: ${err.message}`, 'error');
      }
    }
  };

  const handleLogout = async () => {
    await firebaseLogout();
    setUser(null);
    showToast('로그아웃 되었습니다.', 'info');
  };

  // Permission Management Handlers
  const handleAddAuthorizedEmail = (email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    setAuthorizedEmails((prev) => {
      if (prev.some((e) => e.toLowerCase() === normalized)) return prev;
      const next = [...prev, normalized];
      try {
        localStorage.setItem('cryocell_authorized_users_v2', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    showToast(`[${normalized}] 계정에 수정 권한이 부여되었습니다.`, 'success');
  };

  const handleRemoveAuthorizedEmail = (email: string) => {
    setAuthorizedEmails((prev) => {
      const next = prev.filter((e) => e.toLowerCase() !== email.toLowerCase());
      try {
        localStorage.setItem('cryocell_authorized_users_v2', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    showToast(`[${email}] 계정의 수정 권한이 제거되었습니다.`, 'info');
  };

  // Permission Check Guard
  const ensureCanEdit = (actionName: string = '이 작업'): boolean => {
    if (!user) {
      showToast(`${actionName}을(를) 수행하려면 먼저 구글 계정으로 로그인해야 합니다.`, 'error');
      setIsPermissionModalOpen(true);
      return false;
    }
    if (!isAuthorized) {
      showToast(`현재 로그인된 계정(${user.email})은 읽기 전용 계정입니다. 관리자에게 수정 권한을 요청하세요.`, 'error');
      setIsPermissionModalOpen(true);
      return false;
    }
    return true;
  };

  const handleSelectRack = (rackId: string) => {
    setSelectedRackId(rackId);
    // When rack changes, if current box is not in this rack, switch to the first box (e.g. rack 2 -> 2-A)
    const rackBoxes = boxes.filter((b) => b.rackId === rackId);
    if (rackBoxes.length > 0 && selectedBox.rackId !== rackId) {
      setSelectedBox(rackBoxes[0]);
    }
  };

  const handleSelectBox = (box: CryoBox) => {
    setSelectedBox(box);
    setSelectedRackId(box.rackId);
  };

  // Open Add Modal with permission guard
  const handleOpenAddModal = (row: string = 'A', col: number = 1) => {
    if (!ensureCanEdit('새 바이알 동결 등록')) return;
    setAddModalSlot({ row, col });
    setIsAddModalOpen(true);
  };

  // Add Vial
  const handleAddVial = (newVial: CellVial) => {
    if (!ensureCanEdit('바이알 등록')) return;
    setVials((prev) => [...prev, newVial]);
    const slotNum = ((newVial.row.charCodeAt(0) - 65) * 9) + newVial.col;
    showToast(`신규 바이알 [${newVial.cellLineName}] 등록 완료 (Box ${newVial.boxId} - ${slotNum}번 슬롯)`, 'success');
  };

  // Batch Add Vials
  const handleBatchAddVials = (newVials: CellVial[]) => {
    if (!ensureCanEdit('일괄 바이알 등록')) return;
    setVials((prev) => [...prev, ...newVials]);
    showToast(`총 ${newVials.length}개의 바이알이 일괄 입고되었습니다.`, 'success');
  };

  // Batch Thaw / Check-Out
  const handleBatchThawVials = (
    vialIds: string[],
    thawedBy: string,
    purpose: string,
    notes?: string
  ) => {
    if (!ensureCanEdit('일괄 바이알 출고')) return;
    const targetSet = new Set(vialIds);
    const targets = vials.filter((v) => targetSet.has(v.id));
    if (targets.length === 0) return;

    const timestamp = Date.now().toString().slice(-6);
    const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const newLogs: ThawAuditRecord[] = targets.map((target, idx) => {
      const slotNum = ((target.row.charCodeAt(0) - 65) * 9) + target.col;
      const sameBatch = getIdenticalBatchVials(vials, target);
      const remainingLotCount = Math.max(0, sameBatch.length - 1);
      return {
        id: `THAW-${timestamp}-${idx + 1}`,
        vialId: target.id,
        cellLineName: target.cellLineName,
        locationString: `Box ${target.boxId} > ${slotNum}번 슬롯`,
        thawedBy,
        thawedDate: dateStr,
        purpose,
        vialsRemaining: remainingLotCount,
        notes: notes || `일괄 출고 완료 (${vialIds.length}건 동시 출고)`,
      };
    });

    setVials((prev) =>
      prev.map((v) =>
        targetSet.has(v.id)
          ? { ...v, vialsStored: 0, status: 'Thawed' as const, updatedAt: new Date().toISOString() }
          : v
      )
    );
    setAuditLogs((prev) => [...newLogs, ...prev]);
    showToast(`총 ${vialIds.length}개의 바이알이 일괄 출고되었습니다.`, 'success');
  };

  // Batch Edit Vials
  const handleBatchEditVials = (params: {
    actionType: 'fill_or_update' | 'clear_all';
    newVialData?: Partial<CellVial>;
    thawedBy?: string;
    thawPurpose?: string;
    targetSlots: Array<{ row: string; col: number; existingVial?: CellVial }>;
    box: CryoBox;
  }) => {
    if (!ensureCanEdit('일괄 수정')) return;
    const { actionType, newVialData, thawedBy = 'Lab Researcher', thawPurpose = '일괄 수정', targetSlots, box } = params;

    const timestamp = Date.now().toString().slice(-6);
    const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    // If clear_all: thaw all occupied slots in target
    if (actionType === 'clear_all') {
      const occupied = targetSlots.filter((s) => s.existingVial && s.existingVial.status === 'Stored');
      if (occupied.length === 0) {
        showToast('선택된 슬롯 중 출고할 바이알이 없습니다.', 'info');
        return;
      }
      const occupiedIds = new Set(occupied.map((s) => s.existingVial!.id));
      const thawLogs: ThawAuditRecord[] = occupied.map((s, idx) => {
        const v = s.existingVial!;
        const slotNum = ((v.row.charCodeAt(0) - 65) * 9) + v.col;
        return {
          id: `THAW-${timestamp}-${idx + 1}`,
          vialId: v.id,
          cellLineName: v.cellLineName,
          locationString: `Box ${v.boxId} > ${slotNum}번 슬롯`,
          thawedBy,
          thawedDate: dateStr,
          purpose: thawPurpose,
          vialsRemaining: 0,
          notes: '일괄 수정 작업을 통한 비우기 출고',
        };
      });

      setVials((prev) =>
        prev.map((v) =>
          occupiedIds.has(v.id)
            ? { ...v, vialsStored: 0, status: 'Thawed' as const, updatedAt: new Date().toISOString() }
            : v
        )
      );
      setAuditLogs((prev) => [...thawLogs, ...prev]);
      showToast(`총 ${occupied.length}개의 바이알이 출고되어 슬롯이 비워졌습니다.`, 'info');
      return;
    }

    // fill_or_update
    // 1. Thaw any existing vials in these target slots
    const occupied = targetSlots.filter((s) => s.existingVial && s.existingVial.status === 'Stored');
    const occupiedIds = new Set(occupied.map((s) => s.existingVial!.id));
    const thawLogs: ThawAuditRecord[] = occupied.map((s, idx) => {
      const v = s.existingVial!;
      const slotNum = ((v.row.charCodeAt(0) - 65) * 9) + v.col;
      return {
        id: `THAW-${timestamp}-${idx + 1}`,
        vialId: v.id,
        cellLineName: v.cellLineName,
        locationString: `Box ${v.boxId} > ${slotNum}번 슬롯`,
        thawedBy,
        thawedDate: dateStr,
        purpose: thawPurpose,
        vialsRemaining: 0,
        notes: '일괄 수정을 통한 세포주 교체 출고',
      };
    });

    // 2. Create new Stored vials for all target slots
    const createdVials: CellVial[] = targetSlots.map((s, idx) => ({
      id: `VIAL-${timestamp}-${idx + 1}`,
      cellLineName: newVialData?.cellLineName || 'Unknown',
      cellType: newVialData?.cellType?.trim() || '미지정',
      tissueOrigin: newVialData?.tissueOrigin?.trim() || '',
      passage: Number(newVialData?.passage) || 1,
      tankId: box.tankId,
      rackId: box.rackId,
      boxId: box.id,
      row: s.row,
      col: s.col,
      freezeDate: newVialData?.freezeDate?.trim() || '',
      vialsStored: 1,
      cultureMedium: newVialData?.cultureMedium?.trim() || '미지정',
      freezingMedium: newVialData?.freezingMedium?.trim() || '미지정',
      geneModification: newVialData?.geneModification?.trim() || '',
      researcher: newVialData?.researcher?.trim() || '',
      notes: newVialData?.notes?.trim() || '',
      status: 'Stored',
      updatedAt: new Date().toISOString(),
    }));

    // Update state: mark replaced as Thawed, append new
    setVials((prev) => [
      ...prev.map((v) =>
        occupiedIds.has(v.id)
          ? { ...v, vialsStored: 0, status: 'Thawed' as const, updatedAt: new Date().toISOString() }
          : v
      ),
      ...createdVials,
    ]);
    if (thawLogs.length > 0) {
      setAuditLogs((prev) => [...thawLogs, ...prev]);
    }

    showToast(`총 ${targetSlots.length}개 슬롯에 일괄 수정이 완료되었습니다. (입고: ${targetSlots.length - occupied.length}건, 교체 출고: ${occupied.length}건)`, 'success');
  };

  // Copy / Paste / Drag-fill Vials
  const handleCopyPasteVials = (
    sourceVial: CellVial,
    targets: Array<{ row: string; col: number; existingVial?: CellVial }>,
    action: 'overwrite' | 'fill_empty_only',
    box: CryoBox
  ) => {
    if (!ensureCanEdit('바이알 복사/채우기')) return;
    const timestamp = Date.now().toString().slice(-6);
    const dateStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const slotsToFill: Array<{ row: string; col: number }> = [];
    const vialsToThaw: CellVial[] = [];

    targets.forEach((t) => {
      if (t.existingVial && t.existingVial.status === 'Stored') {
        if (action === 'overwrite') {
          vialsToThaw.push(t.existingVial);
          slotsToFill.push({ row: t.row, col: t.col });
        }
        // if fill_empty_only, ignore occupied
      } else {
        slotsToFill.push({ row: t.row, col: t.col });
      }
    });

    if (slotsToFill.length === 0) {
      showToast('채울 대상 빈 슬롯이 없습니다.', 'info');
      return;
    }

    const thawIds = new Set(vialsToThaw.map((v) => v.id));
    const thawLogs: ThawAuditRecord[] = vialsToThaw.map((v, idx) => {
      const slotNum = ((v.row.charCodeAt(0) - 65) * 9) + v.col;
      return {
        id: `THAW-${timestamp}-${idx + 1}`,
        vialId: v.id,
        cellLineName: v.cellLineName,
        locationString: `Box ${v.boxId} > ${slotNum}번 슬롯`,
        thawedBy: user?.displayName || user?.email?.split('@')[0] || 'Lab Researcher',
        thawedDate: dateStr,
        purpose: '연속 드래그 복사/붙여넣기 덮어쓰기',
        vialsRemaining: 0,
        notes: `새 바이알 [${sourceVial.cellLineName}]로 덮어쓰기 출고`,
      };
    });

    const newVials: CellVial[] = slotsToFill.map((s, idx) => ({
      ...sourceVial,
      id: `VIAL-${timestamp}-${idx + 1}`,
      boxId: box.id,
      rackId: box.rackId,
      tankId: box.tankId,
      row: s.row,
      col: s.col,
      vialsStored: 1,
      status: 'Stored',
      updatedAt: new Date().toISOString(),
    }));

    setVials((prev) => [
      ...prev.map((v) =>
        thawIds.has(v.id)
          ? { ...v, vialsStored: 0, status: 'Thawed' as const, updatedAt: new Date().toISOString() }
          : v
      ),
      ...newVials,
    ]);

    if (thawLogs.length > 0) {
      setAuditLogs((prev) => [...thawLogs, ...prev]);
    }

    showToast(`[${sourceVial.cellLineName}] ${newVials.length}개 슬롯에 채우기 완료!`, 'success');
  };

  // Update Vial
  const handleUpdateVial = (updatedVial: CellVial) => {
    if (!ensureCanEdit('세포주 정보 수정')) return;
    setVials((prev) => prev.map((v) => (v.id === updatedVial.id ? updatedVial : v)));
    setSelectedVialForDetail(updatedVial);
    showToast(`세포주 [${updatedVial.cellLineName}] 정보가 저장되었습니다.`, 'success');
  };

  // Update Box Description
  const handleUpdateBoxDescription = (boxId: string, description: string) => {
    if (!ensureCanEdit('박스 설명 수정')) return;
    setBoxes((prev) => {
      const updated = prev.map((b) => (b.id === boxId ? { ...b, description } : b));
      try {
        localStorage.setItem('cryocell_boxes_v2', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setSelectedBox((prev) => (prev.id === boxId ? { ...prev, description } : prev));
    showToast(`Box ${boxId} 설명이 저장되었습니다.`, 'success');
  };

  // Update Rack Description
  const handleUpdateRackDescription = (rackId: string, description: string) => {
    if (!ensureCanEdit('Rack 설명 수정')) return;
    setRacks((prev) => {
      const updated = prev.map((r) => (r.id === rackId ? { ...r, description } : r));
      try {
        localStorage.setItem('cryocell_racks_v2', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    showToast(`Rack ${rackId.replace('RACK-', '')} 설명이 저장되었습니다.`, 'success');
  };

  // Delete Vial
  const handleDeleteVial = (vialId: string) => {
    if (!ensureCanEdit('바이알 삭제')) return;
    const target = vials.find((v) => v.id === vialId);
    setConfirmModalData({
      isOpen: true,
      title: '바이알 슬롯 영구 삭제',
      message: `[${target?.cellLineName || vialId}] 슬롯을 인벤토리에서 완전히 삭제하시겠습니까? 빈 슬롯으로 복구됩니다.`,
      actionType: 'destructive',
      onConfirm: () => {
        setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
        setVials((prev) => prev.filter((v) => v.id !== vialId));
        setSelectedVialForDetail(null);
        showToast('바이알이 삭제되었습니다.', 'info');
      },
    });
  };

  // Thaw / Check-Out (Single vial per slot)
  const handleThawVial = (
    vialId: string,
    thawedBy: string,
    purpose: string
  ) => {
    if (!ensureCanEdit('세포주 해동 출고')) return;
    const target = vials.find((v) => v.id === vialId);
    if (!target) return;

    // Remaining count of identical lot vials across the entire tank
    const sameBatch = getIdenticalBatchVials(vials, target);
    const remainingLotCount = Math.max(0, sameBatch.length - 1);

    // Update target vial slot to Thawed & 0 stored
    const updated: CellVial = {
      ...target,
      vialsStored: 0,
      status: 'Thawed',
      updatedAt: new Date().toISOString(),
    };
    setVials((prev) => prev.map((v) => (v.id === vialId ? updated : v)));

    // Create Audit Log
    const slotNum = ((target.row.charCodeAt(0) - 65) * 9) + target.col;
    const newLog: ThawAuditRecord = {
      id: `THAW-${Date.now().toString().slice(-6)}`,
      vialId: target.id,
      cellLineName: target.cellLineName,
      locationString: `Box ${target.boxId} > ${slotNum}번 슬롯`,
      thawedBy,
      thawedDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
      purpose,
      vialsRemaining: remainingLotCount,
      notes: `1 vial 출고 완료 (동일 로트 Tank 전체 잔여: ${remainingLotCount}개)`,
    };
    setAuditLogs((prev) => [newLog, ...prev]);

    showToast(
      `[${target.cellLineName}] 1개 출고 완료 (동일 로트 잔여: ${remainingLotCount}개)`,
      remainingLotCount <= 2 ? 'error' : 'success'
    );
  };

  // Quick navigation to any vial slot in the tank
  const handleNavigateToVial = (targetVial: CellVial) => {
    const targetBox = boxes.find((b) => b.id === targetVial.boxId);
    if (targetBox) {
      setSelectedRackId(targetVial.rackId);
      setSelectedBox(targetBox);
    }
    setSelectedVialForDetail(targetVial);
    const slotNum = ((targetVial.row.charCodeAt(0) - 65) * 9) + targetVial.col;
    showToast(`Box ${targetVial.boxId} > ${slotNum}번 슬롯으로 이동했습니다.`, 'info');
  };

  // Quick Sync with connected Google Sheet
  const handleQuickSync = async () => {
    if (!sheetConfig.spreadsheetId || sheetConfig.spreadsheetId.startsWith('template-')) {
      setIsSyncModalOpen(true);
      return;
    }

    setConfirmModalData({
      isOpen: true,
      title: 'Google Sheet 데이터 동기화',
      message: `Google Sheet [${sheetConfig.spreadsheetName}]의 최신 데이터로 업데이트하시겠습니까?`,
      actionType: 'warning',
      onConfirm: async () => {
        setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
        try {
          setIsSyncing(true);
          let token = await getAccessToken();
          if (!token) {
            try {
              const res = await googleSignIn();
              token = res?.accessToken || null;
            } catch (e) {}
          }
          if (!token) throw new Error('Google 로그인이 필요합니다.');

          const imported = await readSpreadsheetVials(
            token,
            sheetConfig.spreadsheetId,
            sheetConfig.sheetTitle
          );
          if (imported.length > 0) {
            setVials(imported);
            setSheetConfig((prev) => ({
              ...prev,
              lastSyncedAt: new Date().toISOString(),
              syncStatus: 'success',
            }));
            showToast(`구글 시트로부터 ${imported.length}건 동기화 성공!`, 'success');
          }
        } catch (err: any) {
          console.error(err);
          showToast(`동기화 실패: ${err.message}`, 'error');
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Extract selected rack info
  const selectedRack = racks.find((r) => r.id === selectedRackId) || racks[0];
  const selectedRackNum = selectedRackId.replace('RACK-', '');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedTank={selectedTank}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        sheetConfig={sheetConfig}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenAddModal={() => handleOpenAddModal('A', 1)}
        onQuickSync={handleQuickSync}
        isSyncing={isSyncing}
        isAuthorized={isAuthorized}
        onOpenPermissionModal={() => setIsPermissionModalOpen(true)}
      />

      {/* Main Container with Left Sidebar & Right Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'tools' ? (
          <ToolsComparisonModal />
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left Sidebar: Vertical Rack 1..6 and Box 1-A..1-J Dropdown Explorer */}
            <RackSidebar
              tanks={tanks}
              selectedTank={selectedTank}
              racks={racks}
              selectedRackId={selectedRackId}
              onSelectRack={handleSelectRack}
              boxes={boxes}
              selectedBox={selectedBox}
              onSelectBox={handleSelectBox}
              vials={vials}
              onUpdateRackDescription={handleUpdateRackDescription}
              canEdit={isAuthorized}
            />

            {/* Right Main Content Area */}
            <div className="flex-1 min-w-0 w-full space-y-4">
              {/* Location Breadcrumb & Quick Actions Bar */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300 font-medium">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{selectedTank.name.split('(')[0].trim()}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-cyan-400 font-bold">Rack {selectedRackNum}</span>
                  {racks.find((r) => r.id === selectedRackId)?.description && (
                    <span className="text-slate-400 text-xs hidden md:inline truncate max-w-[180px]">
                      ({racks.find((r) => r.id === selectedRackId)?.description})
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  <span className="bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-800 font-mono font-bold">
                    Box {selectedBox.id}
                  </span>
                  {selectedBox.description && (
                    <span className="text-slate-400 text-xs hidden sm:inline truncate max-w-xs">
                      • {selectedBox.description}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAddModal('A', 1)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-xs cursor-pointer ${
                      isAuthorized
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    <span>이 박스에 바이알 등록</span>
                  </button>
                </div>
              </div>

              {/* Tab 1: 2D Cryo Box Grid View */}
              {currentTab === 'grid' && (
                <CryoBoxView
                  box={selectedBox}
                  vials={vials}
                  onSelectVial={(vial) => setSelectedVialForDetail(vial)}
                  onSelectEmptySlot={(row, col) => handleOpenAddModal(row, col)}
                  searchHighlightQuery={searchQuery}
                  onUpdateBoxDescription={handleUpdateBoxDescription}
                  canEdit={isAuthorized}
                  currentUser={user}
                  onBatchAddVials={handleBatchAddVials}
                  onBatchThawVials={handleBatchThawVials}
                  onBatchEditVials={handleBatchEditVials}
                  onCopyPasteVials={handleCopyPasteVials}
                  showToast={showToast}
                />
              )}

              {/* Tab 2: Full Database Table View */}
              {currentTab === 'table' && (
                <InventoryTableView
                  vials={vials}
                  onSelectVial={(vial) => setSelectedVialForDetail(vial)}
                  searchQuery={searchQuery}
                />
              )}

              {/* Tab 3: Thaw Audit Trail View */}
              {currentTab === 'audit' && <AuditTrailView logs={auditLogs} />}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>LN2 Tank Manager © 2026 | 6 Racks × 10 Boxes (1-A ~ 6-J) Vertical Storage</span>
          <div className="flex items-center gap-4">
            <span>Google Sheets 실시간 양방향 연동</span>
          </div>
        </div>
      </footer>

      {/* Vial Detail / Thaw Modal */}
      {selectedVialForDetail && (
        <VialDetailModal
          vial={selectedVialForDetail}
          isOpen={true}
          onClose={() => setSelectedVialForDetail(null)}
          onUpdateVial={handleUpdateVial}
          onThawVial={handleThawVial}
          onDeleteVial={handleDeleteVial}
          canEdit={isAuthorized}
          currentUser={user}
          onRequireLogin={() => setIsPermissionModalOpen(true)}
          allVials={vials}
          onNavigateToVial={handleNavigateToVial}
        />
      )}

      {/* Add New Vial Modal */}
      {isAddModalOpen && (
        <AddVialModal
          isOpen={true}
          onClose={() => setIsAddModalOpen(false)}
          onAddVial={handleAddVial}
          defaultTankId={selectedTank.id}
          defaultRackId={selectedRackId}
          defaultBoxId={selectedBox.id}
          defaultRow={addModalSlot.row}
          defaultCol={addModalSlot.col}
          availableBoxes={boxes}
          currentUser={user}
        />
      )}

      {/* Permission & User Management Modal */}
      {isPermissionModalOpen && (
        <PermissionManageModal
          isOpen={true}
          onClose={() => setIsPermissionModalOpen(false)}
          currentUser={user}
          onLogin={handleLogin}
          authorizedEmails={authorizedEmails}
          onAddAuthorizedEmail={handleAddAuthorizedEmail}
          onRemoveAuthorizedEmail={handleRemoveAuthorizedEmail}
          isAuthorized={isAuthorized}
        />
      )}

      {/* Google Sheets Sync Modal */}
      {isSyncModalOpen && (
        <GoogleSheetSyncModal
          isOpen={true}
          onClose={() => setIsSyncModalOpen(false)}
          user={user}
          getAccessToken={getAccessToken}
          onLogin={handleLogin}
          vials={vials}
          onUpdateAllVials={(newVials) => {
            setVials(newVials);
            showToast(`총 ${newVials.length}개의 바이알이 갱신되었습니다.`, 'success');
          }}
          sheetConfig={sheetConfig}
          onUpdateSheetConfig={setSheetConfig}
          racks={racks}
          boxes={boxes}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModalData.isOpen && (
        <ConfirmationModal
          isOpen={true}
          title={confirmModalData.title}
          message={confirmModalData.message}
          actionType={confirmModalData.actionType}
          itemsList={confirmModalData.itemsList}
          onConfirm={confirmModalData.onConfirm}
          onCancel={() => setConfirmModalData((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs font-semibold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
                : toastMessage.type === 'error'
                ? 'bg-rose-950 border-rose-700 text-rose-200'
                : 'bg-slate-900 border-slate-700 text-slate-100'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-cyan-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
