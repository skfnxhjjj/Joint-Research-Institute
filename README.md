# 관절연구소
Computer Graphics 조별 과제 - WebGL 기반 3D 로봇 시뮬레이션

## 프로젝트 개요
이 프로젝트는 WebGL을 사용하여 3D 로봇 시뮬레이션을 구현한 웹 애플리케이션입니다.
- 3D 로봇 모델링 및 렌더링
- IK 기반 로봇 다리 제어
- Tripod Gait 패턴을 이용한 보행
- 실시간 마우스 인터랙션을 통한 로봇 제어
- 3D 씬 그래프 기반 렌더링 시스템

## 주요 기능
- 마우스로 로봇의 이동 목표점 지정
- 실시간 로봇 관절 각도 및 위치 정보 표시
- WebGL 셰이더를 통한 3D 렌더링
- 계층적 씬 그래프 시스템
- Tripod Gait 알고리즘을 통한 안정적인 6족 보행

## 📁 프로젝트 구조

```
Joint-Research-Institute/
├── assets/                  # 모델 및 리소스 파일
│   └── models/              # .obj 모델
│       ├── box.obj
│       └── spider.obj
├── common/                  # 공통 유틸리티
│   ├── initShaders.js       # 셰이더 초기화
│   ├── m4.js                # 행렬 연산 라이브러리
│   ├── objParser.js         # OBJ 파일 파서
│   └── webgl-utils.js       # WebGL 환경 설정
├── scene/                   # 씬 구성 / 렌더링 처리
│   ├── renderer.js          # 렌더링 루프 및 셰이더 관리
│   ├── worldInit.js         # 지형 초기화
│   └── SceneNode.js         # 씬 그래프 노드 구현
├── robot/                   # 로봇 관련 로직
│   ├── Spider.js            # 거미 로봇 메인 클래스
│   ├── Leg.js               # 로봇 다리 구현
│   ├── Joint.js             # 관절 구현
│   ├── robotConfig.js       # 로봇 설정 및 파라미터
│   └── gait.js              # Tripod Gait 보행 패턴
├── utils/                   # 기타 유틸리티
│   ├── ik.js                # 역운동학(IK) 솔버
│   ├── meshUtils.js         # 메시 생성 유틸리티
│   ├── modelLoader.js       # .obj 모델 로더
│   └── raycast.js           # 마우스 레이캐스트
├── index.html               # HTML 진입점
├── main.js                  # 프로그램 메인 초기화 / 실행 루프
├── style.css                # 스타일시트
└── README.md                # 프로젝트 문서
```