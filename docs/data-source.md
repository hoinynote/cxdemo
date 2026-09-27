# NCSI 원천 데이터 준비

프로토타입의 NCSI 수치는 첨부된 `22Q4_면세점_분석용_변환.xlsx`에서 생성합니다. 원본 파일과 압축 해제 자료는 Git에 올리지 않고 `.local/source/`에서만 사용합니다.

PowerShell에서 원본 ZIP의 해당 엑셀 항목만 추출합니다.

```powershell
New-Item -ItemType Directory -Force .local\source | Out-Null
python -c "import os,zipfile; p=os.path.join(os.environ['USERPROFILE'],'Desktop','KPC','cxgrillme.zip'); z=zipfile.ZipFile(p); n=next(x for x in z.namelist() if x.endswith('22Q4_면세점_분석용_변환.xlsx')); open(os.path.join('.local','source','22Q4_면세점_분석용_변환.xlsx'),'wb').write(z.read(n))"
$env:CX_NCSI_SOURCE='.local/source/22Q4_면세점_분석용_변환.xlsx'
npm.cmd run data:build
```

생성되는 `src/data/generated/ncsi-2022.json`에는 기업·응답자 조건별 집계 수치, 요인 합계/유효 표본수, 출처 해시와 변수 매핑 메타데이터만 들어갑니다. 응답자 ID, 원시 행, 자유서술은 포함하지 않습니다. 원본 파일을 `public/`에 복사하거나 Git에 추가하지 마세요.
