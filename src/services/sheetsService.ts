import Papa from 'papaparse';
import type { CellVial, LN2Tank, CanisterRack, CryoBox } from '../types/inventory';
import { formatIdToNumber, getSlotNumber } from './vialUtils';

export const SHEET_HEADERS = [
  'Cell_Line_Name',
  'Host_Species',
  'Passage',
  'Tank',
  'Rack',
  'Box',
  'Slot',
  'Freeze_Date',
  'Vials_Remaining',
  'Culture_Medium',
  'Freezing_Medium',
  'Tissue_Origin',
  'Gene_Modification',
  'Researcher',
  'Notes',
  'Status',
  'Updated_At',
];

export const TANK_GRID_HEADERS = [
  'Tank',
  'Rack',
  'Box',
  'Slot',
  'Status',
  'Cell_Line_Name',
  'Host_Species',
  'Tissue_Origin',
  'Passage',
  'Freeze_Date',
  'Researcher',
  'Culture_Medium',
  'Freezing_Medium',
  'Gene_Modification',
  'Notes',
];

export interface DriveSpreadsheetItem {
  id: string;
  name: string;
  modifiedTime?: string;
}

export const listGoogleSpreadsheets = async (
  accessToken: string
): Promise<DriveSpreadsheetItem[]> => {
  const url = `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet'&fields=files(id,name,modifiedTime)&orderBy=modifiedTime%20desc&pageSize=25`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Drive API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.files || [];
};

/**
 * Builds table rows for a single Rack tab:
 * For each box in this rack, slots 1 to 81:
 * - Stored vial: occupied info
 * - Empty slot: Status 'Empty', Cell_Line_Name 'empty'
 */
export const buildRackSlotRows = (
  rackNum: number,
  boxesInRack: CryoBox[],
  vials: CellVial[]
): (string | number)[][] => {
  const rows: (string | number)[][] = [
    [
      'Box',
      'Slot',
      'Status',
      'Cell_Line_Name',
      'Host_Species',
      'Tissue_Origin',
      'Passage',
      'Freeze_Date',
      'Researcher',
      'Culture_Medium',
      'Freezing_Medium',
      'Gene_Modification',
      'Notes',
    ],
  ];

  // Map of "boxId-slotNum" -> Stored CellVial
  const vialMap = new Map<string, CellVial>();
  vials.forEach((v) => {
    if (v.status === 'Stored') {
      const slotNum = getSlotNumber(v.row, v.col);
      vialMap.set(`${v.boxId}-${slotNum}`, v);
    }
  });

  boxesInRack.forEach((box) => {
    for (let slot = 1; slot <= 81; slot++) {
      const key = `${box.id}-${slot}`;
      const vial = vialMap.get(key);
      if (vial) {
        rows.push([
          box.id,
          slot,
          'Occupied',
          vial.cellLineName,
          vial.cellType || '미지정',
          vial.tissueOrigin || '',
          vial.passage,
          vial.freezeDate || '',
          vial.researcher || '',
          vial.cultureMedium || '미지정',
          vial.freezingMedium || '미지정',
          vial.geneModification || '',
          vial.notes || '',
        ]);
      } else {
        rows.push([
          box.id,
          slot,
          'Empty',
          'empty',
          '-',
          '-',
          '-',
          '-',
          '-',
          '-',
          '-',
          '-',
          '',
        ]);
      }
    }
  });

  return rows;
};

/**
 * Creates a complete LN2 Tank Google Spreadsheet with multi-rack tabs:
 * One file for the LN2 Tank, each Rack in its own tab,
 * boxes 1~81 slots ordered with empty slots marked 'empty'.
 */
export const createLN2MultiRackTankSpreadsheet = async (
  accessToken: string,
  tankTitle: string = 'Lab_LN2_Tank_1_Inventory',
  racks: CanisterRack[],
  boxes: CryoBox[],
  vials: CellVial[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  // If racks empty, provide default 6 racks
  const effectiveRacks =
    racks.length > 0
      ? racks
      : [1, 2, 3, 4, 5, 6].map((i) => ({
          id: `RACK-${i}`,
          tankId: 'TANK-01',
          name: `Rack ${i}`,
          totalBoxes: 10,
        }));

  // Create sheet properties for each rack
  const sheets = effectiveRacks.map((rack, idx) => {
    const rackNum = formatIdToNumber(rack.id) || idx + 1;
    return {
      properties: {
        title: `Rack ${rackNum}`,
        gridProperties: {
          frozenRowCount: 1,
        },
      },
    };
  });

  // Step 1: Create spreadsheet with multiple tabs
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: tankTitle,
      },
      sheets,
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create Google Sheet: ${err}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // Step 2: Populate all Rack tabs using batchUpdate
  const dataPayload = effectiveRacks.map((rack, idx) => {
    const rackNum = formatIdToNumber(rack.id) || idx + 1;
    const rackBoxes = boxes.filter(
      (b) => formatIdToNumber(b.rackId) === rackNum || b.rackId === rack.id
    );
    // If no boxes assigned in state, generate 10 default boxes
    const effectiveBoxes =
      rackBoxes.length > 0
        ? rackBoxes
        : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((letter) => ({
            id: `${rackNum}-${letter}`,
            name: `Box ${rackNum}-${letter}`,
            tankId: 'TANK-01',
            rackId: rack.id,
            dimension: 9 as const,
            colorTag: '#3b82f6',
          }));

    const rows = buildRackSlotRows(rackNum, effectiveBoxes, vials);
    return {
      range: `'Rack ${rackNum}'!A1:M${rows.length}`,
      values: rows,
    };
  });

  const batchUpdateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataPayload,
      }),
    }
  );

  if (!batchUpdateRes.ok) {
    console.warn('Batch update warned:', await batchUpdateRes.text());
  }

  return { spreadsheetId, spreadsheetUrl };
};

export const createLN2TemplateSpreadsheet = async (
  accessToken: string,
  title: string = 'Lab_LN2_Tank_1_Inventory',
  initialVials: CellVial[] = [],
  racks: CanisterRack[] = [],
  boxes: CryoBox[] = []
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  return createLN2MultiRackTankSpreadsheet(accessToken, title, racks, boxes, initialVials);
};

/**
 * Reads vials from a Google Spreadsheet:
 * Supports reading multi-rack sheets or standard inventory sheets.
 * Filters out empty slots ('empty').
 */
export const readSpreadsheetVials = async (
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string = 'Rack 1'
): Promise<CellVial[]> => {
  // Step 1: Fetch spreadsheet metadata to get all sheet names
  let sheetTitles: string[] = [];
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (metaRes.ok) {
      const metaData = await metaRes.json();
      sheetTitles = (metaData.sheets || []).map((s: any) => s.properties.title);
    }
  } catch (e) {
    console.warn('Could not list sheet titles:', e);
  }

  if (sheetTitles.length === 0) {
    sheetTitles = [sheetTitle, 'Rack 1', 'Cell_Stock', 'Sheet1'];
  }

  const allImportedVials: CellVial[] = [];
  const now = new Date().toISOString();

  for (const title of sheetTitles) {
    const range = `'${title}'!A1:Z5000`;
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) continue;

    const data = await res.json();
    const rows: any[][] = data.values || [];
    if (rows.length < 2) continue;

    const headers = rows[0].map((h: string) =>
      String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    );

    const findIdx = (possibleNames: string[]) => {
      return headers.findIndex((h: string) =>
        possibleNames.some((p) => h.includes(p.toLowerCase().replace(/[^a-z0-9]/g, '')))
      );
    };

    const nameIdx = findIdx(['celllinename', 'cellline', 'cellname', 'name']);
    const speciesIdx = findIdx(['hostspecies', 'celltype', 'species', 'type']);
    const tissueIdx = findIdx(['tissueorigin', 'tissue', 'origin']);
    const passageIdx = findIdx(['passage', 'p#', 'passage#']);
    const tankIdx = findIdx(['tank', 'tankid']);
    const rackIdx = findIdx(['rack', 'rackid', 'canister']);
    const boxIdx = findIdx(['box', 'boxid']);
    const slotIdx = findIdx(['slot', 'slot#', 'slotnumber', 'well']);
    const rowIdx = findIdx(['row', 'rowidx']);
    const colIdx = findIdx(['col', 'column']);
    const dateIdx = findIdx(['freezedate', 'date']);
    const countIdx = findIdx(['vialsremaining', 'vialsstored', 'quantity', 'count']);
    const cultIdx = findIdx(['culturemedium', 'medium', 'culture']);
    const medIdx = findIdx(['freezingmedium', 'cryomedium']);
    const geneIdx = findIdx(['genemodification', 'modification', 'gene']);
    const resIdx = findIdx(['researcher', 'user', 'depositor', 'author']);
    const notesIdx = findIdx(['notes', 'note', 'comment']);
    const statusIdx = findIdx(['status']);

    const rackNumFromTitle = formatIdToNumber(title);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rawName = nameIdx >= 0 && row[nameIdx] ? String(row[nameIdx]).trim() : '';
      const rawStatus = statusIdx >= 0 && row[statusIdx] ? String(row[statusIdx]).trim() : '';

      // Skip empty slot rows
      if (!rawName || rawName.toLowerCase() === 'empty' || rawStatus.toLowerCase() === 'empty') {
        continue;
      }

      // Slot and coordinates calculation
      let rowCoord = 'A';
      let colCoord = 1;
      if (slotIdx >= 0 && row[slotIdx]) {
        const slotNum = Math.min(81, Math.max(1, parseInt(row[slotIdx], 10) || 1));
        const rIdx = Math.floor((slotNum - 1) / 9);
        rowCoord = String.fromCharCode(65 + rIdx);
        colCoord = ((slotNum - 1) % 9) + 1;
      } else if (rowIdx >= 0 && colIdx >= 0) {
        rowCoord = String(row[rowIdx] || 'A').trim().toUpperCase();
        colCoord = parseInt(row[colIdx], 10) || 1;
      }

      const rawTank = tankIdx >= 0 && row[tankIdx] ? String(row[tankIdx]).trim() : '1';
      const tankId = `TANK-${String(formatIdToNumber(rawTank)).padStart(2, '0')}`;

      const rawRack =
        rackIdx >= 0 && row[rackIdx]
          ? String(row[rackIdx]).trim()
          : String(rackNumFromTitle);
      const rackId = `RACK-${formatIdToNumber(rawRack)}`;

      const boxId = boxIdx >= 0 && row[boxIdx] ? String(row[boxIdx]).trim() : '1-A';
      const cellType = speciesIdx >= 0 && row[speciesIdx] ? String(row[speciesIdx]).trim() : '미지정';
      const tissueOrigin = tissueIdx >= 0 && row[tissueIdx] ? String(row[tissueIdx]).trim() : '';
      const passage = passageIdx >= 0 ? parseInt(row[passageIdx], 10) || 1 : 1;
      const freezeDate = dateIdx >= 0 && row[dateIdx] ? String(row[dateIdx]).trim().replace(/-/g, '') : '';
      const vialsStored = countIdx >= 0 ? Math.max(1, parseInt(row[countIdx], 10) || 1) : 1;
      const cultureMedium = cultIdx >= 0 && row[cultIdx] ? String(row[cultIdx]).trim() : '미지정';
      const freezingMedium = medIdx >= 0 && row[medIdx] ? String(row[medIdx]).trim() : '미지정';
      const geneModification = geneIdx >= 0 && row[geneIdx] ? String(row[geneIdx]).trim() : '';
      const researcher = resIdx >= 0 && row[resIdx] ? String(row[resIdx]).trim() : '';
      const notes = notesIdx >= 0 && row[notesIdx] ? String(row[notesIdx]).trim() : '';

      allImportedVials.push({
        id: `VIAL-IMPORT-${Date.now()}-${allImportedVials.length + 1}`,
        cellLineName: rawName,
        cellType,
        tissueOrigin,
        passage,
        tankId,
        rackId,
        boxId,
        row: rowCoord,
        col: colCoord,
        freezeDate,
        vialsStored,
        cultureMedium,
        freezingMedium,
        geneModification,
        researcher,
        notes,
        status: 'Stored',
        updatedAt: now,
      });
    }
  }

  return allImportedVials;
};

export const writeSpreadsheetVials = async (
  accessToken: string,
  spreadsheetId: string,
  vials: CellVial[],
  sheetTitle: string = 'Cell_Stock'
): Promise<void> => {
  const rows = [
    SHEET_HEADERS,
    ...vials.map((v) => [
      v.cellLineName,
      v.cellType || '미지정',
      v.passage,
      formatIdToNumber(v.tankId),
      formatIdToNumber(v.rackId),
      v.boxId,
      getSlotNumber(v.row, v.col),
      v.freezeDate || '',
      v.vialsStored,
      v.cultureMedium || '미지정',
      v.freezingMedium || '미지정',
      v.tissueOrigin || '',
      v.geneModification || '',
      v.researcher || '',
      v.notes || '',
      v.status,
      new Date().toISOString(),
    ]),
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:Z5000:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  ).catch(() => {});

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetTitle)}!A1:Q${rows.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!updateRes.ok) {
    const errorText = await updateRes.text();
    throw new Error(`Failed to update Google Sheet: ${errorText}`);
  }
};

/**
 * Exports stored vials to CSV without Vial_ID, using Slot (1~81) and clean Tank/Rack numbers (1, 2, 3...)
 */
export const exportToCSV = (vials: CellVial[]): string => {
  const stored = vials.filter((v) => v.status === 'Stored');
  const data = stored.map((v) => ({
    Cell_Line_Name: v.cellLineName,
    Host_Species: v.cellType || '미지정',
    Passage: v.passage,
    Tank: formatIdToNumber(v.tankId),
    Rack: formatIdToNumber(v.rackId),
    Box: v.boxId,
    Slot: getSlotNumber(v.row, v.col),
    Freeze_Date: v.freezeDate || '',
    Vials_Remaining: v.vialsStored,
    Culture_Medium: v.cultureMedium || '미지정',
    Freezing_Medium: v.freezingMedium || '미지정',
    Tissue_Origin: v.tissueOrigin || '',
    Gene_Modification: v.geneModification || '',
    Researcher: v.researcher || '',
    Notes: v.notes || '',
    Status: v.status,
    Updated_At: v.updatedAt || new Date().toISOString(),
  }));

  return Papa.unparse(data);
};

/**
 * Generates the complete Tank Grid CSV across all Racks and Boxes:
 * Contains every single slot from 1 to 81; empty slots have Status 'Empty' and Cell_Line_Name 'empty'.
 */
export const exportTankFullGridCSV = (
  racks: CanisterRack[],
  boxes: CryoBox[],
  vials: CellVial[]
): string => {
  const effectiveRacks =
    racks.length > 0
      ? racks
      : [1, 2, 3, 4, 5, 6].map((i) => ({
          id: `RACK-${i}`,
          tankId: 'TANK-01',
          name: `Rack ${i}`,
          totalBoxes: 10,
        }));

  const rows: Record<string, any>[] = [];

  const vialMap = new Map<string, CellVial>();
  vials.forEach((v) => {
    if (v.status === 'Stored') {
      const slotNum = getSlotNumber(v.row, v.col);
      vialMap.set(`${v.boxId}-${slotNum}`, v);
    }
  });

  effectiveRacks.forEach((rack, rIdx) => {
    const rackNum = formatIdToNumber(rack.id) || rIdx + 1;
    const rackBoxes = boxes.filter(
      (b) => formatIdToNumber(b.rackId) === rackNum || b.rackId === rack.id
    );
    const effectiveBoxes =
      rackBoxes.length > 0
        ? rackBoxes
        : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((letter) => ({
            id: `${rackNum}-${letter}`,
            name: `Box ${rackNum}-${letter}`,
            tankId: 'TANK-01',
            rackId: rack.id,
            dimension: 9 as const,
            colorTag: '#3b82f6',
          }));

    effectiveBoxes.forEach((box) => {
      for (let slot = 1; slot <= 81; slot++) {
        const key = `${box.id}-${slot}`;
        const vial = vialMap.get(key);
        if (vial) {
          rows.push({
            Tank: 1,
            Rack: rackNum,
            Box: box.id,
            Slot: slot,
            Status: 'Occupied',
            Cell_Line_Name: vial.cellLineName,
            Host_Species: vial.cellType || '미지정',
            Tissue_Origin: vial.tissueOrigin || '',
            Passage: vial.passage,
            Freeze_Date: vial.freezeDate || '',
            Researcher: vial.researcher || '',
            Culture_Medium: vial.cultureMedium || '미지정',
            Freezing_Medium: vial.freezingMedium || '미지정',
            Gene_Modification: vial.geneModification || '',
            Notes: vial.notes || '',
          });
        } else {
          rows.push({
            Tank: 1,
            Rack: rackNum,
            Box: box.id,
            Slot: slot,
            Status: 'Empty',
            Cell_Line_Name: 'empty',
            Host_Species: '-',
            Tissue_Origin: '-',
            Passage: '-',
            Freeze_Date: '-',
            Researcher: '-',
            Culture_Medium: '-',
            Freezing_Medium: '-',
            Gene_Modification: '-',
            Notes: '',
          });
        }
      }
    });
  });

  return Papa.unparse(rows);
};

export const parseCSVToVials = (csvText: string): CellVial[] => {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data as any[];
  const validVials: CellVial[] = [];
  const now = new Date().toISOString();

  rows.forEach((r, idx) => {
    const rawName = r.Cell_Line_Name || r.cell_line || r.Name || '';
    if (!rawName || rawName.trim().toLowerCase() === 'empty' || r.Status === 'Empty') {
      return;
    }

    let rowCoord = 'A';
    let colCoord = 1;
    if (r.Slot !== undefined && r.Slot !== '') {
      const slotNum = Math.min(81, Math.max(1, parseInt(r.Slot, 10) || 1));
      const rIdx = Math.floor((slotNum - 1) / 9);
      rowCoord = String.fromCharCode(65 + rIdx);
      colCoord = ((slotNum - 1) % 9) + 1;
    } else if (r.Row && r.Col) {
      rowCoord = String(r.Row).trim().toUpperCase();
      colCoord = parseInt(r.Col, 10) || 1;
    }

    const rawTank = r.Tank || r.Tank_ID || '1';
    const tankId = `TANK-${String(formatIdToNumber(rawTank)).padStart(2, '0')}`;

    const rawRack = r.Rack || r.Rack_ID || '1';
    const rackId = `RACK-${formatIdToNumber(rawRack)}`;

    const boxId = r.Box || r.Box_ID || '1-A';
    const cellType = r.Host_Species || r.Cell_Type || '미지정';
    const tissueOrigin = r.Tissue_Origin || '';
    const passage = parseInt(r.Passage, 10) || 1;
    const freezeDate = r.Freeze_Date ? String(r.Freeze_Date).replace(/[^0-9]/g, '') : '';
    const vialsStored = parseInt(r.Vials_Remaining, 10) || 1;
    const cultureMedium = r.Culture_Medium || '미지정';
    const freezingMedium = r.Freezing_Medium || '미지정';
    const geneModification = r.Gene_Modification || '';
    const researcher = r.Researcher || '';
    const notes = r.Notes || '';

    validVials.push({
      id: `VIAL-CSV-${Date.now()}-${idx + 1}`,
      cellLineName: rawName.trim(),
      cellType: cellType.trim(),
      tissueOrigin: tissueOrigin.trim(),
      passage,
      tankId,
      rackId,
      boxId,
      row: rowCoord,
      col: colCoord,
      freezeDate,
      vialsStored,
      cultureMedium,
      freezingMedium,
      geneModification,
      researcher,
      notes,
      status: 'Stored',
      updatedAt: now,
    });
  });

  return validVials;
};
