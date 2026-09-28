import React from 'react';
import { History, Flame, Download, User, Calendar, MapPin, FileText } from 'lucide-react';
import type { ThawAuditRecord } from '../types/inventory';
import Papa from 'papaparse';

interface AuditTrailViewProps {
  logs: ThawAuditRecord[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ logs }) => {
  const handleExportLogs = () => {
    const csv = Papa.unparse(logs);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `LN2_Thaw_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              세포주 해동 및 출고 감사 로그 (Thaw Audit Trail)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            누가 어떤 세포주를 언제 어떤 목적으로 해동·출고했는지 투명하게 추적 관리합니다.
          </p>
        </div>

        <button
          onClick={handleExportLogs}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>감사 기록 CSV 내보내기</span>
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="py-12 text-center text-slate-500">
          <History className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
          <p className="text-xs">아직 기록된 해동/출고 이력이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition-all"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-white tracking-tight">
                    {log.cellLineName}
                  </span>
                  <span className="text-xs font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    {log.locationString}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    로그ID: {log.id}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-200 font-medium">{log.thawedBy}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono">{log.thawedDate}</span>
                  </div>
                  <div>
                    잔여 수량: <strong className="text-emerald-400 font-mono">{log.vialsRemaining} vials</strong>
                  </div>
                </div>

                <div className="text-xs text-slate-300 flex items-start gap-1.5 pt-1">
                  <FileText className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>실험 목적: {log.purpose}</span>
                </div>
              </div>

              {log.notes && (
                <div className="text-xs text-slate-400 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800/80 max-w-xs italic">
                  "{log.notes}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
