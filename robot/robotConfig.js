const robotScale = 1;

// Body mount points for each leg (hexagonal layout)
// export const mountPoints = [
//     [.8, 0, 1],
//     [.8, 0, 0],
//     [.8, 0, -1],
//     [-.8, 0, 1],
//     [-.8, 0, 0],
//     [-.8, 0, -1],
// ];

export const mountPoints = [
    [.8, 0, 1],
    [.8, 0, 0],
    [.8, 0, -1],
    [-.8, 0, 1],
    [-.8, 0, 0],
    [-.8, 0, -1],
];

// Shared config for each segment type
export const segmentConfig = {
    // body: {
    //     mesh: {type: "box", size: [.6, .4, 1]},
    //     pivot: [0, 0, 0]
    // },
    // upper: {
    //     mesh: {type: "box", size: [0.1, 0.3, 0.1]},
    //     pivot: [0, 0, 0],
    //     jointLimits: {
    //         x: [-45, 45],
    //         y: [0, 0],
    //         z: [0, 0]
    //     }
    // },
    // lower: {
    //     mesh: {type: "box", size: [0.1, 0.5, 0.1]},
    //     pivot: [0, 0.6, 0],
    //     jointLimits: {
    //         x: [0, 90],
    //         y: [0, 0],
    //         z: [0, 0]
    //     }
    // },
    // foot: {
    //     mesh: {type: "box", size: [0.1, 0.1, 0.1]},
    //     pivot: [0, .2, 0],
    //     jointLimits: {
    //         x: [-30, 30],
    //         y: [0, 0],
    //         z: [0, 0]
    //     }
    // }


    body: {
        mesh: {type: "obj", path: "assets/models/Core.obj"},
        pivot: [0, 0, 0]
    },
    upper: {
        mesh: {type: "obj", path: "assets/models/Leg_upper.obj"},
        pivot: [0, 0, 0],
        jointLimits: {
            x: [-45, 45],
            y: [0, 0],
            z: [0, 0]
        }
    },
    lower: {
        mesh: {type: "obj", path: "assets/models/Leg_lower.obj"},
        pivot: [0, 0.6, 0],
        jointLimits: {
            x: [0, 90],
            y: [0, 0],
            z: [0, 0]
        }
    },
    foot: {
        mesh: {type: "obj", path: "assets/models/Leg_foot.obj"},
        pivot: [0, .2, 0],
        jointLimits: {
            x: [-30, 30],
            y: [0, 0],
            z: [0, 0]
        }
    }
};

export default {
    scale: robotScale,
    mountPoints,
    segmentConfig
};