import { demoDataset } from './data/demo-dataset';

export default function App() {
  return (
    <main id="app-root" className="startup-shell">
      <header className="startup-header">
        <span className="brand-mark" aria-hidden="true">KPC</span>
        <span className="startup-header__product">CX</span>
      </header>

      <section className="startup-message" aria-labelledby="startup-title">
        <p className="eyebrow">CUSTOMER EXPERIENCE</p>
        <h1 id="startup-title">CX 분석 포털</h1>
        <p className="startup-message__description">
          분석 화면과 사용자 흐름을 준비하고 있습니다.
        </p>
        <p className="startup-dataset-status">
          2022 NCSI 집계 데이터 연결됨 · 기업 {demoDataset.companies.length}개 · 응답 {demoDataset.sourceRowCount}건
        </p>
      </section>
    </main>
  );
}
