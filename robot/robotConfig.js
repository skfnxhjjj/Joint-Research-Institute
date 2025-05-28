export const robotConfig = {
    body: {
        size: [.5, .3, .7],
        color: [1, 1, 1]
    },
    leg: {
        coxa: {
            size: [.1, .3, .1],
            color: [1, 0, 0],
            jointLimit: { min: -Math.PI / 4, max: Math.PI / 4 }
        },
        femur: {
            size: [.1, .5, .1],
            color: [0, 1, 0],
            jointLimit: { min: -Math.PI / 3, max: Math.PI / 3 }
        },
        tibia: {
            size: [.1, .7, .1],
            color: [0, 0, 1],
            jointLimit: { min: -Math.PI / 2, max: Math.PI / 6 }
        },
        swingSpeed: 1.8,
        stepHeight: 0.35
    },
    gait: {
        // foot과 footTarget 사이의 최대 허용 거리
        maxFootDistance: 0.2,
        // lerp 애니메이션 지속 시간 (초)
        lerpDuration: 0.3,
        // lerp 시 발이 들어올리는 높이
        stepHeight: 0.1,
        // 로봇 이동 속도 (테스트용)
        moveSpeed: 2.0
    }
};