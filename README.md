# 관절연구소

Computer Graphics 조별 과제

## 📁 프로젝트 구조

```
Joint-Research-Institute/
├── assets/                  # 모델 및 리소스 파일
│   └── models/              # .obj 모델
│       ├── box.obj
│       └── spider.obj
├── common/                  # 공통 유틸리티
│   ├── initShaders.js       # 셰이더 초기화
│   ├── m4.js                # 행렬 연산
│   ├── objParser.js         # OBJ 파서
│   └── webgl-utils.js       # WebGL 환경 설정
├── scene/                   # 씬 구성 / 렌더링 처리
│   ├── renderer.js          # 렌더링 루프
│   └── worldInit.js         # 지형 초기화
│   ├── worldInit.js         # 지형 초기화
│   └── SceneNode.js         # SceneNode 클래스 정의
├── test/                    # 테스트
│   └── fab_testt.html       # Fabrik Solver 테스트
├── robot/                   # 로봇 관련 로직
│   ├── gait.js              # 애니메이션 계획 생성
│   ├── ik.js                # IK 적용
│   ├── robot.js             # 로봇 계층 구조 / leg를 body의 자식으로 추가
│   ├── robotConfig.js       # 로봇 config 설정
│   ├── body.js              # body를 SceneNode로 생성
│   └── leg.js               # Leg 클래스 정의
├── utils/                   # 기타 유틸
│   ├── meshUtils.js         # 메쉬 타입에 따라 생성 / 불러오기
├   ├── fabrikSolver.js      # fabrik 알고리즘
│   ├── modelLoader.js       # .obj 로드
│   └── raycast.js           # 마우스 레이캐스트
├── index.html               # HTML 진입점
├── main.js                  # 프로그램 메인 초기화 / 실행 루프
├── style.css                # 스타일
└── README.md                # README
```
