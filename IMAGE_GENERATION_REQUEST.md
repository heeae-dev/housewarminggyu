# 병규의 집들이 — 실제 사진 편집 요청

## 확정 방향

사용자는 애니메이션 일러스트가 아니라 병규의 실제 사진과 실제 얼굴을 원한다.
미연시 분위기는 HTML 대화창과 선택지로 표현한다. 기존 일러스트 프롬프트는 폐기했다.

## 첫 단계

- 원본: `assets/references/byunggyu4.jpg` (정면 전신사진).
- 얼굴을 새로 생성하지 않는다. 원본 사진의 실제 얼굴과 머리 부분을 최종 결과에 합성한다.
- GMS에는 회색 후드·청바지를 핑크색 파자마로, 교실을 가상의 아늑한 거실로 편집하도록 요청한다.
- 체형, 자세, 인물 위치, 머리 크기와 위치를 유지한다.
- 신분증과 목걸이 줄은 제거한다.
- 원본 사진은 수정하지 않는다. 전송·합성용 복사본만 864×1536으로 리사이즈한다.
- API 편집 결과의 머리 위치를 확인한 뒤 원본 머리를 합성한다. 보호 영역의 픽셀 일치도 검증한다.
- 얼굴 주변 경계와 목·의상의 연결은 육안으로 확인한다. 위치가 다르면 그대로 최종본으로 쓰지 않는다.

## 파일

- GMS 편집 프롬프트: `PHOTO_EDIT_REQUEST.txt`
- 실행 스크립트: `scripts/edit_photo.py`
- 응답 캐시: `.local/gms-photo-edit-response.json` (Git 제외)
- 합성 전 편집 이미지: `.local/byeonggyu-photo-edit.png` (Git 제외)
- 최종 미리보기: `assets/images/byeonggyu-photo-welcome.png`

```powershell
python scripts/edit_photo.py --dry-run
python scripts/edit_photo.py
# 합성 전 이미지의 머리 위치를 확인한 다음 로컬 처리:
python scripts/edit_photo.py --composite
```

응답 캐시나 편집 이미지가 있으면 API를 재호출하지 않는다. 키는 `.env`에서 읽고 출력하지 않는다.
예전 `scripts/generate_welcome.py`는 일러스트 재생성 용도로 실행하지 않는다.

## 다음 단계

첫 실사 결과는 사용자 확인을 마쳤다. 사용자의 추가 이미지 요청에 따라 `scripts/edit_pose.py`로 수줍게 두 손을 모은 자세(`shy`), 손가락으로 설명하는 자세(`schedule`)를 추가한다.
기존 실사 편집 사진의 방과 의상을 유지하며 팔·손 자세만 바꾼다. 실제 얼굴을 보존해야 하므로 원본 머리 영역을 다시 합성한다. 생성 결과의 위치 확인 후 `--composite`로 처리하며 각 요청 결과는 `.local/`에 캐시한다.
각 결과는 `assets/images/byeonggyu-photo-shy.png`, `assets/images/byeonggyu-photo-schedule.png`에 저장하고 해당 선택지와 연결한다.

## 초대장 내용

- 핑크색 파자마의 병규가 반기는 첫 화면.
- “어디로 가면 돼?” → “그, 그런 건 개인 정보니까… 개인적으로 물어봐줘.”
- “언제 하는 거야?” → 2026년 10월 31일 19시부터 11월 2일 오전 8시까지.
- 확정 문구: “0박 3일”.
- GitHub Pages로 배포. API 키와 원본 사진은 배포하지 않는다.
