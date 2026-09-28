import React, { useState } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Trash2,
  Lock,
  LogIn,
  CheckCircle,
  AlertCircle,
  Mail,
  User as UserIcon,
} from 'lucide-react';
import type { User } from 'firebase/auth';

interface PermissionManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLogin: () => void;
  authorizedEmails: string[];
  onAddAuthorizedEmail: (email: string) => void;
  onRemoveAuthorizedEmail: (email: string) => void;
  isAuthorized: boolean;
}

export const PermissionManageModal: React.FC<PermissionManageModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  authorizedEmails,
  onAddAuthorizedEmail,
  onRemoveAuthorizedEmail,
  isAuthorized,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [inputError, setInputError] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setInputError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    if (authorizedEmails.some((e) => e.toLowerCase() === trimmed)) {
      setInputError('이미 권한이 부여된 이메일입니다.');
      return;
    }

    onAddAuthorizedEmail(trimmed);
    setNewEmail('');
    setInputError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                수정 권한 및 사용자 관리
              </h2>
              <p className="text-xs text-slate-400">
                승인된 구글 계정만 인벤토리 수정·출고·등록 가능
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Current User Status Box */}
          <div className="p-3.5 rounded-xl border bg-slate-950/70 border-slate-800">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              현재 로그인 상태
            </div>

            {currentUser ? (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-8 h-8 rounded-full border border-slate-700"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center font-bold text-xs text-white">
                      {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate">
                      {currentUser.email}
                    </div>
                  </div>
                </div>

                {isAuthorized ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    수정 권한 승인됨
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    읽기 전용 (미승인 계정)
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>로그인되어 있지 않습니다. (현재 읽기 전용)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogin();
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Google 로그인
                </button>
              </div>
            )}
          </div>

          {/* Policy Information */}
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-900/60 text-xs text-cyan-200/90 leading-relaxed">
            <p className="font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
              권한 정책 및 자동 이름 반영
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
              <li>
                <strong>수정 권한:</strong> 아래 등록된 구글 계정으로 로그인한 연구원만
                세포주 동결 등록, 정보 수정, 해동(출고), 박스/랙 설명 변경이 가능합니다.
              </li>
              <li>
                <strong>자동 계정명 입력:</strong> 신규 바이알 등록 시 및 출고 시, 구글 계정 이름이
                담당자 필드에 자동으로 채워집니다.
              </li>
              <li>비로그인 및 미승인 사용자는 실수 방지를 위해 안전한 읽기 전용 모드로 조회만 가능합니다.</li>
            </ul>
          </div>

          {/* Add Authorized User Form */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
              <span>새로운 연구원 수정 권한 부여</span>
            </label>
            <form onSubmit={handleAdd} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setInputError('');
                  }}
                  placeholder="연구원 구글 이메일 (예: researcher@jangslab.org)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>권한 부여</span>
              </button>
            </form>
            {inputError && <p className="text-[11px] text-rose-400">{inputError}</p>}
          </div>

          {/* Authorized Users List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>수정 권한 보유 구글 계정 목록</span>
              </span>
              <span className="font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">
                총 {authorizedEmails.length}명
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {authorizedEmails.map((email) => {
                const isCurrent = currentUser?.email?.toLowerCase() === email.toLowerCase();
                const isPrimaryAdmin = email.toLowerCase() === 'sungil@jangslab.org';

                return (
                  <div
                    key={email}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                      isCurrent
                        ? 'bg-cyan-950/40 border-cyan-800/80 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                        {email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-medium truncate">{email}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          {isPrimaryAdmin && (
                            <span className="text-amber-400 font-semibold">대표 관리자 (Admin)</span>
                          )}
                          {isCurrent && (
                            <span className="text-cyan-400 font-semibold">• 현재 로그인 계정</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Don't allow deleting the primary admin if it's the only one */}
                    {(!isPrimaryAdmin || authorizedEmails.length > 1) && (
                      <button
                        type="button"
                        onClick={() => onRemoveAuthorizedEmail(email)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        title="수정 권한 취소"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
