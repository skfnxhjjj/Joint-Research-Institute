export const robotConfig = {
    body: {
        size: [.5, .3, .7],
        color: [1, 1, 1]
    },
    leg: {
        coxa: {
            size: [.1, .3, .1],
            color: [1, 1, 1],
            jointLimit: { min: -Math.PI / 4, max: Math.PI / 4 }
        },
        femur: {
            size: [.1, .5, .1],
            color: [1, 1, 1],
            jointLimit: { min: -Math.PI / 3, max: Math.PI / 3 }
        },
        tibia: {
            size: [.1, .7, .1],
            color: [1, 1, 1],
            jointLimit: { min: -Math.PI / 2, max: Math.PI / 6 }
        },
        swingSpeed: 1.8,
        stepHeight: 0.35
    },
    gait: {
        // foot과 footTarget 사이의 최대 허용 거리
        maxFootDistance: 0.3,
        // lerp 애니메이션 지속 시간 (초)
        lerpDuration: 0.15,
        // lerp 시 발이 들어올리는 높이
        stepHeight: 0.3
    },
    movement: {
        // spider 이동 속도 (단위/초)
        walkSpeed: .5,
        // spider 회전 속도 (라디안/초)
        turnSpeed: Math.PI / 4,
        // 목표 지점에 도달했다고 판단하는 거리
        arrivalThreshold: 0.1
    }
};