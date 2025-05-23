const robotScale = 1;
const upperLength = .4;
const lowerLength = .5;
const footLength = .1;

// Body mount points for each leg (hexagonal layout)
export const mountPoints = [
    [1, 0, 1],
    [1, 0, 0],
    [1, 0, -1],
    [-1, 0, 1],
    [-1, 0, 0],
    [-1, 0, -1]
];

// Joint configurations for each leg
export const jointConfig = {
    hip: {
        type: "revolute",
        axis: "y", // 좌우 회전 (yaw)
        limits: { min: -Math.PI/2, max: Math.PI/2 },
        position: [0, 0, 0] // body에서의 상대 위치
    },
    shoulder: {
        type: "revolute", 
        axis: "x", // 상하 회전 (pitch)
        limits: { min: -Math.PI/3, max: Math.PI/3 },
        position: [0, 0, 0] // hip에서의 상대 위치
    },
    knee: {
        type: "revolute",
        axis: "x", // 무릎 굽힘 (pitch)
        limits: { min: -Math.PI/2, max: Math.PI/2 },
        position: [0, upperLength, 0] // upper 끝에서의 상대 위치
    },
};

// Shared config for each segment type
export const segmentConfig = {
    body: {
        mesh: {type: "box", size: [.2, .2, .2]},
        pivot: [0, 0, 0]
    },
    upper: {
        mesh: {type: "box", size: [0.1, upperLength, 0.1]},
        pivot: [0, 0, 0],
        jointLimits: {
            x: [0, 0],
            y: [0, 0],
            z: [0, 0]
        }
    },
    lower: {
        mesh: {type: "box", size: [0.1, lowerLength, 0.1]},
        pivot: [0, 0.5, 0],
        jointLimits: {
            x: [0, 0],
            y: [0, 0],
            z: [0, 0]
        }
    },
    foot: {
        mesh: {type: "box", size: [0.1, footLength, 0.1]},
        pivot: [0, 0, 0],
        jointLimits: {
            x: [0, 0],
            y: [0, 0],
            z: [0, 0]
        }
    }
};

export const gaitSettings = {
    stepDuration: 1.0,
    liftHeight: 0.2,
    strideLength: 0.3
};

export const segmentLengths = {
    upper: segmentConfig.upper.mesh.size[1],
    lower: segmentConfig.lower.mesh.size[1],
    foot: segmentConfig.foot.mesh.size[1]
};

export default {
    scale: robotScale,
    mountPoints,
    jointConfig,
    segmentConfig,
    gaitSettings,
    segmentLengths
};