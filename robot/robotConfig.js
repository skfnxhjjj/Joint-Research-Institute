export const robotConfig = {
    body: {
        size: [.5, .3, .9],
        color: [.2, .2, .2],
        shell: {
            size: [.6, .2, .95],
            color: [1, 1, 1]
        },
        // 로봇이 지면에서 떠있는 높이
        groundHeight: 1.0
    },
    leg: {
        coxa: {
            size: [.1, .3, .1],
            color: [.2, .2, .2],
        },
        femur: {
            size: [.1, .5, .1],
            color: [.2, .2, .2],
            shell: {
                size: [.2, .4, .1],
                color: [1, 1, 1]
            }
        },
        tibia: {
            size: [.1, .7, .1],
            color: [.2, .2, .2],
            shell: {
                size: [.2, .45, .1],
                color: [1, 1, 1]
            }
        },
    },
    eye: {
        size: [.1, .1, .1],
        color: [1, 0, 0]
    },
    debug: {
        controller: {
            size: [.1, .1, .1],
            color: [1, 0, 0]
        },
        spiderRoot: {
            size: [.1, .1, .1],
            color: [0, 0, 1]
        },
        foot: {
            size: [.1, .1, .1],
            color: [1, 1, 0]
        },
        footTarget: {
            size: [.1, .1, .1],
            color: [0, 1, 1]
        },
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