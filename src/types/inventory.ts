export interface CellVial {
  id: string; // e.g., 'VIAL-2024-001'
  cellLineName: string; // e.g., 'HEK293T'
  cellType: string; // Host Species (e.g. 'Human', 'Mouse', 'Rat', etc.)
  tissueOrigin?: string; // Origin Tissue (e.g. 'Kidney', 'Brain', 'Blood', 'Liver', etc.)
  passage: number; // e.g., 12
  tankId: string; // e.g., 'TANK-01'
  rackId: string; // e.g., 'RACK-A'
  boxId: string; // e.g., 'BOX-01'
  row: string; // 'A' - 'I' (or 'J')
  col: number; // 1 - 9 (or 10)
  freezeDate: string; // 'YYYY-MM-DD'
  vialsStored: number; // Current remaining in this batch
  cultureMedium?: string; // e.g. 'DMEM + 10% FBS + 1% P/S'
  freezingMedium: string; // e.g. '90% FBS + 10% DMSO'
  cellConcentration?: string; // e.g., '2.5 x 10^6 cells/mL'
  viability?: number; // Percentage e.g. 95%
  bsl?: 'BSL-1' | 'BSL-2' | 'BSL-3';
  mycoplasmaStatus?: 'Negative' | 'Pending' | 'Positive';
  mycoplasmaTestDate?: string;
  geneModification?: string; // e.g., 'CRISPR Cas9-GFP knock-in'
  researcher: string; // e.g., 'Dr. Kim'
  researcherEmail?: string;
  notes?: string;
  status: 'Stored' | 'Thawed' | 'Reserved';
  updatedAt: string;
}

export interface CryoBox {
  id: string; // 'BOX-01'
  name: string; // 'Box 1: Primary Cancer Lines'
  tankId: string;
  rackId: string;
  dimension: 9 | 10; // 9x9 (81) or 10x10 (100)
  colorTag: string; // hex or tailwind class
  description?: string;
}

export interface CanisterRack {
  id: string; // 'RACK-A'
  tankId: string;
  name: string; // 'Rack 1'
  totalBoxes: number;
  description?: string;
}

export interface LN2Tank {
  id: string; // 'TANK-01'
  name: string; // 'Main LN2 Tank #1 (MVE CryoSystem 4000)'
  location: string; // 'Room 304 - BioBank Facility'
  temperature: number; // -196.0 °C
  ln2LevelPercentage: number; // 88%
  lastRefilled: string; // '2026-09-20'
  totalCapacityVials: number;
  status: 'Normal' | 'Warning' | 'Maintenance';
}

export interface ThawAuditRecord {
  id: string;
  vialId: string;
  cellLineName: string;
  locationString: string; // 'Tank 1 > Rack A > Box 1 > C4'
  thawedBy: string;
  thawedDate: string;
  purpose: string;
  vialsRemaining: number;
  notes?: string;
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  spreadsheetName: string;
  sheetTitle: string;
  lastSyncedAt?: string;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  errorMessage?: string;
}
