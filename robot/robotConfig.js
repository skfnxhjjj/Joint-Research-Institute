export const robotConfig = {
    body: {
        size: [.1, .1, .1],
        color: [1, 1, 1]
    },
    leg: {
        coxa: {
            size: [.1, .3, .1],
            color: [1, 0, 0],
            radius: 0.18,
            jointLimit: {min: -Math.PI / 4, max: Math.PI / 4}
        },
        femur: {
            size: [.1, .9, .1],
            color: [0, 1, 0],
            radius: 0.15,
            jointLimit: {min: -Math.PI / 3, max: Math.PI / 3}
        },
        tibia: {
            size: [.1, .8, .1],
            color: [0, 0, 1],
            radius: 0.11,
            jointLimit: {min: -Math.PI / 2, max: Math.PI / 6}
        },
        swingSpeed: 1.8,
        stepHeight: 0.35
    }
};