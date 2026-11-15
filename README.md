# 안락온실 인터랙티브 포트폴리오

스크롤할수록 '안락 수치'가 떨어지며 방이 변하는, 1인칭 심리 공포 방탈출 "안락온실"의 소개 페이지입니다.

### ▶ [페이지 바로가기](https://kkng932.github.io/Greenhouse-site/)

- 게임: Unity 6, C# · 4인 팀 · 약 7주 · STOVE PC·VR 출시
- 역할: 팀 총괄, 프로그래밍 80%
- 스토어: [PC](https://store.onstove.com/games/105915) · [VR](https://store.onstove.com/games/106032)

## 구조

```
index.html        페이지 마크업
css/style.css     스타일 (색·연출 값은 CSS 변수)
js/plants.js      배경 식물 SVG 패스 생성 (시드 고정, 잎 겹침 검사)
js/main.js        스크롤 → 안락 수치 연동, 건반 내비, 전후 비교, 영상, 이메일 복사
assets/           이미지, 협업 문서 PDF
```

빌드 도구 없이 정적 파일로만 동작하며, GitHub Pages로 배포합니다.
