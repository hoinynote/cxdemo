import { useLocation } from 'react-router-dom';
import { createServiceContainer } from '../services/container';
import { adminMenu } from '../navigation/menu';

const analytics = createServiceContainer().analytics;

function titleForPath(path: string): string {
  return adminMenu.find((item) => item.path === path)?.label ?? '운영 현황';
}

export function AdminPage() {
  const location = useLocation();
  const title = titleForPath(location.pathname);
  const readiness = analytics.getDatasetStatus();
  return <div className="admin-page"><p className="admin-eyebrow">KPC CX ADMINISTRATION</p><h1>{title}</h1><p className="admin-intro">CX 서비스 운영을 위한 관리 포털입니다.</p>
    {location.pathname === '/admin' ? <div className="admin-summary"><section><span>등록된 사용자 영역</span><strong>3</strong><small>기업 고객 · 컨설턴트 · 관리자</small></section><section><span>데이터셋 상태</span><strong>{readiness.ready ? '정상' : '확인 필요'}</strong><small>{readiness.rowCount}개 응답 · 2022 NCSI</small></section><section><span>운영 프로젝트</span><strong>1</strong><small>2022 면세점 NCSI 진단</small></section></div> : <section className="admin-table-panel"><div className="admin-table-heading"><h2>{title}</h2><span>프로토타입 운영 정보</span></div><table><thead><tr><th>항목</th><th>상태</th><th>설명</th></tr></thead><tbody><tr><td>{title}</td><td><span className="admin-status">준비됨</span></td><td>실제 운영 연동 전 프로토타입 화면</td></tr><tr><td>2022 면세점 NCSI 진단</td><td><span className="admin-status">사용 중</span></td><td>검증된 집계 데이터 기반</td></tr></tbody></table></section>}
  </div>;
}
