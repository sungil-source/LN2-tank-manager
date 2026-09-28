import type { CellVial } from '../types/inventory';

/**
 * Generates the standardized lot grouping key for identical cell stocks:
 * - '세포주 이름', 'passage', '동결 일자', '등록자'가 동일하면 같은 세포주로 간주
 */
export const getVialLotKey = (vial: {
  cellLineName?: string;
  passage?: number | string;
  freezeDate?: string;
  researcher?: string;
}): string => {
  const name = (vial.cellLineName || '').trim().toLowerCase();
  const passage = Number(vial.passage) || 0;
  const date = (vial.freezeDate || '').trim();
  const res = (vial.researcher || '').trim().toLowerCase();
  return `${name}__${passage}__${date}__${res}`;
};

/**
 * Checks if two vials are part of the identical freezing lot / batch:
 * - Both currently Stored
 * - Same cellLineName (case-insensitive)
 * - Same passage number
 * - Same freezeDate
 * - Same researcher
 */
export const isIdenticalVialBatch = (v1: CellVial, v2: CellVial): boolean => {
  if (v1.status !== 'Stored' || v2.status !== 'Stored') return false;
  return getVialLotKey(v1) === getVialLotKey(v2);
};

/**
 * Returns all active stored vials in the tank matching the given target vial batch
 */
export const getIdenticalBatchVials = (allVials: CellVial[], target: CellVial): CellVial[] => {
  if (target.status !== 'Stored') return [];
  const targetKey = getVialLotKey(target);
  return allVials.filter((v) => v.status === 'Stored' && getVialLotKey(v) === targetKey);
};

export const formatIdToNumber = (id: string | number | undefined | null): number => {
  if (id === undefined || id === null) return 1;
  if (typeof id === 'number') return id;
  const match = String(id).match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
};

/**
 * Formats slot display string: e.g. "Tank 1 > Rack 2 > Box 1 > 15번 슬롯"
 */
export const formatVialSlotPosition = (vial: CellVial): string => {
  const slotNumber = getSlotNumber(vial.row, vial.col);
  const tankNum = formatIdToNumber(vial.tankId);
  const rackNum = formatIdToNumber(vial.rackId);
  return `Tank ${tankNum} > Rack ${rackNum} > Box ${vial.boxId} > ${slotNumber}번 슬롯`;
};

export const getSlotNumber = (row?: string, col?: number): number => {
  const rIdx = ((row || 'A').toUpperCase().charCodeAt(0) - 65);
  const c = col || 1;
  return rIdx * 9 + c;
};
