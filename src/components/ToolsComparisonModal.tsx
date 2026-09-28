import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  Zap,
  Layers,
  Sparkles,
  Server,
  FileSpreadsheet,
} from 'lucide-react';

export const ToolsComparisonModal: React.FC = () => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              실험실 LN2 세포주 관리 도구 추천 및 아키텍처 비교 분석
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Google Sheet 기반 입력과 직관적인 2D 크라이오 박스 GUI 연동을 위한 최적의 솔루션 비교
            </p>
          </div>
        </div>
      </div>

      {/* 1. Comparison Matrix Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>주요 세포주/시약 관리 툴 비교 (Feature Matrix)</span>
        </h3>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-300 font-mono border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">솔루션 구분</th>
                <th className="py-3 px-3">Google Sheet 연동</th>
                <th className="py-3 px-3">2D/3D 크라이오 박스 맵</th>
                <th className="py-3 px-3">도입 비용</th>
                <th className="py-3 px-3">학습 곡선 & 구축 난이도</th>
                <th className="py-3 px-3">추천 연구실 규모</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 bg-slate-900/50">
              {/* Custom Web App (This) */}
              <tr className="bg-cyan-950/20 border-l-4 border-l-cyan-500 font-medium">
                <td className="py-3.5 px-4">
                  <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <span>전용 웹 GUI + Google Sheets</span>
                    <span className="text-[10px] bg-cyan-900 text-cyan-200 px-1.5 py-0.5 rounded font-mono">
                      현재 구축 시스템
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Google Sheets API 실시간 양방향 동기화
                  </div>
                </td>
                <td className="py-3 px-3 text-emerald-400 flex items-center gap-1 pt-4">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>완전 연동 (양방향)</span>
                </td>
                <td className="py-3 px-3 text-emerald-400 font-semibold">
                  ✓ 9x9 / 10x10 격자 완벽 지원
                </td>
                <td className="py-3 px-3 text-emerald-400 font-bold">무료 (오픈소스)</td>
                <td className="py-3 px-3 text-emerald-400">즉시 사용 가능 (0일)</td>
                <td className="py-3 px-3 text-slate-200">대학 랩, 스타트업, 바이오텍</td>
              </tr>

              {/* AppSheet */}
              <tr>
                <td className="py-3.5 px-4">
                  <div className="font-bold text-white">AppSheet (Google 공식)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Google Workspace 노코드 앱</div>
                </td>
                <td className="py-3 px-3 text-emerald-400">✓ 네이티브 연동</td>
                <td className="py-3 px-3 text-rose-400 font-medium">
                  ✗ 단순 리스트/폼 위주 (좌표 격자 구현 불가)
                </td>
                <td className="py-3 px-3 text-slate-300">사용자당 월 $5~$10</td>
                <td className="py-3 px-3 text-amber-400">보통 (수식/뷰 커스텀 필요)</td>
                <td className="py-3 px-3 text-slate-400">단순 검체 목록 관리팀</td>
              </tr>

              {/* Benchling */}
              <tr>
                <td className="py-3.5 px-4">
                  <div className="font-bold text-white">Benchling (Registry / Inventory)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">글로벌 표준 바이오 R&D 플랫폼</div>
                </td>
                <td className="py-3 px-3 text-slate-400">△ 자체 DB 기반 (시트 별도 연동 필요)</td>
                <td className="py-3 px-3 text-emerald-400">✓ 최상급 Freezer 맵 지원</td>
                <td className="py-3 px-3 text-rose-400">고비용 (기관/기업 라이선스)</td>
                <td className="py-3 px-3 text-rose-400">높음 (전사 온보딩 및 교육 필요)</td>
                <td className="py-3 px-3 text-slate-400">대형 바이오 제약사 / 공공 연구소</td>
              </tr>

              {/* Quartzy */}
              <tr>
                <td className="py-3.5 px-4">
                  <div className="font-bold text-white">Quartzy</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">실험실 시약/소모품 구매 및 재고</div>
                </td>
                <td className="py-3 px-3 text-slate-400">△ Excel/CSV 가져오기 지원</td>
                <td className="py-3 px-3 text-rose-400">✗ 좌표 격자 시각화 미지원</td>
                <td className="py-3 px-3 text-slate-300">기본 무료 / 유료 플랜</td>
                <td className="py-3 px-3 text-emerald-400">낮음</td>
                <td className="py-3 px-3 text-slate-400">시약 주문 및 소모품 재고 랩</td>
              </tr>

              {/* OpenSpecimen */}
              <tr>
                <td className="py-3.5 px-4">
                  <div className="font-bold text-white">OpenSpecimen / Freezerworks</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">전문 바이오뱅크 검체 관리</div>
                </td>
                <td className="py-3 px-3 text-slate-400">✗ 자체 RDBMS 저장소</td>
                <td className="py-3 px-3 text-emerald-400">✓ 극저온 냉동고 특화</td>
                <td className="py-3 px-3 text-rose-400">고비용 (서버 구축비 발생)</td>
                <td className="py-3 px-3 text-rose-400">매우 높음 (서버/DB 관리자 필요)</td>
                <td className="py-3 px-3 text-slate-400">병원 인체유래물은행, 임상 CRO</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Why this Google Sheet + Dedicated GUI Architecture is the Best Choice */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>연구실 실무 관점: 왜 'Google Sheets + 전용 웹 GUI'가 최선인가?</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="font-bold text-cyan-300 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4" />
              <span>1. 입력 편의성과 협업</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              연구원들은 새로운 세포주를 동결할 때 엑셀이나 구글 시트에 복사-붙여넣기(대량 입력)하는 것이
              가장 빠릅니다. 구글 시트를 백엔드 DB로 사용하므로 기존 랩 구성원들이 새로운 툴을 배우지
              않아도 됩니다.
            </p>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>2. LN2 탱크 안전과 동결사고 예방</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              -196°C 액체질소 탱크는 뚜껑을 열고 캐니스터를 꺼내면 즉시 서리가 끼고 온도가 상승합니다. GUI
              화면에서 <strong>"Tank 1 &gt; Rack A &gt; Box 1의 C4 슬롯"</strong> 위치를 미리 확인하고
              동결 튜브를 꺼내면 냉해동 충격을 최소화할 수 있습니다.
            </p>
          </div>

          <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4" />
              <span>3. 실시간 재고와 해동 감사 로그</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              누가 몇 번 passage의 바이알을 출고해 실험했는지 자동으로 감사 로그(Audit Log)가 남고, 잔여량이
              2개 이하로 떨어지면 <strong>재고 부족 경고</strong>를 띄워 소중한 마스터 스톡 고갈을 사전에 방지합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 3. LN2 BioBanking Best Practices Guide */}
      <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-5 space-y-3 text-xs">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>실험실 LN2 세포주 관리 핵심 체크리스트 (Lab Protocol Guide)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-300">
          <div className="space-y-1.5">
            <div className="font-semibold text-white">1) 2-Tank 분산 보관 전략 (Two-Tank Backup)</div>
            <p className="text-slate-400">
              중요 마스터 스톡(Master Stock)은 탱크 한 대 고장이나 LN2 누출 시 전체 소실을 방지하기 위해 반드시
              Tank 1과 Tank 2에 바이알을 분산 보관해야 합니다.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="font-semibold text-white">2) 마이코플라즈마 정기 스크리닝 의무화</div>
            <p className="text-slate-400">
              세포주를 LN2에 동결하기 전 반드시 PCR 또는 MycoAlert 테스트를 실시하고 음성 확인 일자를 기록해야
              교차 오염을 방지할 수 있습니다.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="font-semibold text-white">3) Passage 번호 제한 (P# 관행)</div>
            <p className="text-slate-400">
              암세포주나 형질전환 세포주는 Passage 20-25회 이상 계대 시 유전적 변이가 축적되므로, 초기 저계대
              (P5 이하) 마스터 스톡을 보존하고 워킹 스톡을 분주 사용합니다.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="font-semibold text-white">4) 동결 프로토콜 표준화</div>
            <p className="text-slate-400">
              완만 동결 용기(Mr. Frosty, -1°C/min)를 사용해 -80°C 초저온 냉동고에서 24시간 동결 후 즉시 LN2 기상/액상으로
              이송하는 일련의 과정을 타임스탬프로 기록합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
