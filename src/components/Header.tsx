import React from 'react';
import {
  Layers,
  Table as TableIcon,
  History,
  FileSpreadsheet,
  Plus,
  Search,
  BookOpen,
  LogOut,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { LN2Tank, GoogleSheetConfig } from '../types/inventory';

interface HeaderProps {
  currentTab: 'grid' | 'table' | 'audit' | 'tools';
  setCurrentTab: (tab: 'grid' | 'table' | 'audit' | 'tools') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTank: LN2Tank;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  sheetConfig: GoogleSheetConfig;
  onOpenSyncModal: () => void;
  onOpenAddModal: () => void;
  onQuickSync?: () => void;
  isSyncing?: boolean;
  isAuthorized: boolean;
  onOpenPermissionModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  searchQuery,
  setSearchQuery,
  selectedTank,
  user,
  onLogin,
  onLogout,
  sheetConfig,
  onOpenSyncModal,
  onOpenAddModal,
  onQuickSync,
  isSyncing,
  isAuthorized,
  onOpenPermissionModal,
}) => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner / Status Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Lab Info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 min-w-[44px] min-h-[44px] aspect-square rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-950/50 text-white font-black text-base border border-cyan-400/40 select-none">
              <span className="tracking-tight flex items-baseline">
                <span>LN</span>
                <span className="text-xs translate-y-0.5">2</span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">LN2 Tank Manager</h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-mono">
                  Beta
                </span>
              </div>
              <p className="text-xs text-slate-400">
                실험실 액체질소 세포주 보관 및 Google Sheets 연동
              </p>
            </div>
          </div>

          {/* Quick Action Tools & Auth */}
          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            {/* Google Sheets Connection Status Button */}
            <button
              onClick={onOpenSyncModal}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                sheetConfig.spreadsheetId
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="max-w-[130px] truncate">
                {sheetConfig.spreadsheetName || '구글 시트 연동'}
              </span>
              {sheetConfig.spreadsheetId ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              ) : (
                <span className="text-[10px] text-slate-400 bg-slate-700 px-1 rounded">미연결</span>
              )}
            </button>

            {sheetConfig.spreadsheetId && onQuickSync && (
              <button
                onClick={onQuickSync}
                disabled={isSyncing}
                title="Google Sheets 즉시 동기화"
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            )}

            {/* Permission Status Button */}
            <button
              onClick={onOpenPermissionModal}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                user && isAuthorized
                  ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/60 shadow-xs'
                  : user && !isAuthorized
                  ? 'bg-amber-950/70 border-amber-700/80 text-amber-300 hover:bg-amber-900/60 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="수정 권한 관리 및 사용자 설정"
            >
              {user && isAuthorized ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold">수정 권한 보유</span>
                </>
              ) : user && !isAuthorized ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold">읽기 전용 (미승인)</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">권한 관리</span>
                </>
              )}
            </button>

            {/* Google User Auth */}
            {user ? (
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-5 h-5 rounded-full border border-slate-600"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                    {user.email ? user.email[0].toUpperCase() : 'U'}
                  </div>
                )}
                <span className="text-slate-200 max-w-[100px] truncate font-medium">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={onLogout}
                  title="로그아웃"
                  className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                Google 로그인
              </button>
            )}

            {/* Add New Vial Action */}
            <button
              onClick={onOpenAddModal}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer ${
                isAuthorized
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/30 hover:scale-[1.02]'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
              title={isAuthorized ? '새 바이알 동결 등록' : '수정 권한 확인 후 등록'}
            >
              {isAuthorized ? (
                <Plus className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>새 바이알 동결 등록</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs & Search Toolbar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 w-fit">
            <button
              onClick={() => setCurrentTab('grid')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'grid'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>크라이오 박스 그리드 (2D 맵)</span>
            </button>

            <button
              onClick={() => setCurrentTab('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'table'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>전체 재고 목록표 (DB)</span>
            </button>

            <button
              onClick={() => setCurrentTab('audit')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'audit'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>해동/출고 이력 (Audit)</span>
            </button>

            <button
              onClick={() => setCurrentTab('tools')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'tools'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-indigo-300 hover:text-indigo-200 hover:bg-indigo-950/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>추천 툴 비교 및 가이드</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="세포주, 연구원, 구역(A1), BSL 검색..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
