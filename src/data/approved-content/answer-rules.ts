export const APPROVED_ANSWER_RULES = {
  unsupportedMessage: '현재는 NCSI 점수, 선택 기업 비교, 필터 응답자 집계, 품질요인 순위와 등록된 검토 완료 자료를 바탕으로 답변할 수 있습니다.',
  subgroupLabel: '필터 응답자 집계',
  noDataMessage: '선택한 조건에 일치하는 원천 데이터가 없어 수치를 제시하지 않았습니다.',
  suggestions: [
    '현재 기업의 NCSI와 비교 기업을 알려줘',
    '선택한 고객군의 NCSI는 얼마야?',
    '점수가 높은 품질요인과 낮은 품질요인은?',
  ],
} as const;
