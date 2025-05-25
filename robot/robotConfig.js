const robotScale = 1;
const upperLength = .4;
const lowerLength = .5;
const footLength = .1;

// Body mount points for each leg (hexagonal layout)
export const mountPoints = [
    [0.4, 0, 1],
    [0.4, 0, 0],
    [0.4, 0, -1],
    [-0.4, 0, 1],
    [-0.4, 0, 0],
    [-0.4, 0, -1]
];

// Joint configurations for each leg
export const jointConfig = {
    hip: {
        type: "revolute",
        axis: "y", // 좌우 회전 (yaw)
        limits: { min: -Math.PI/2, max: Math.PI/2 }
    },
    knee: {
        type: "revolute",
        axis: "x", // 무릎 굽힘 (pitch)
        limits: { min: -Math.PI/2, max: Math.PI/2 }
    },
    ankle: {
        type: "revolute",
        axis: "x", // 발목 회전 (pitch)
        limits: { min: -Math.PI/4, max: Math.PI/4 }
    }
};

// Shared config for each segment type
export const segmentConfig = {
    body: {
        mesh: {type: "box", size: [.4, .3, 1]},
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