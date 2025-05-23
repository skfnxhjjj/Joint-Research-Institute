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

// Shared config for each segment type
export const segmentConfig = {
    body: {
        mesh: {type: "box", size: [.2, .2, .2]},
        pivot: [0, 0, 0]
    },
    upper: {
        mesh: {type: "box", size: [0, 0, 0]},
        pivot: [0, 0, 0],
        jointLimits: {
            x: [0, 0],
            y: [0, 0],
            z: [0, 0]
        }
    },
    lower: {
        mesh: {type: "box", size: [0, 0, 0]},
        pivot: [0, 0.5, 0],
        jointLimits: {
            x: [0, 0],
            y: [0, 0],
            z: [0, 0]
        }
    },
    foot: {
        mesh: {type: "box", size: [0.1, 0.1, 0.1]},
        pivot: [0, 0.1, 0],
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
    segmentConfig,
    gaitSettings,
    segmentLengths
};