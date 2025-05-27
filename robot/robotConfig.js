export const robotConfig = {
    body: {
        size: [.4, .3, .4],
        color: [1, 0, .5]
    },
    leg: {
        coxa: {
            size: [.1, .3, .1],
            color: [1, 0, .5],
            jointLimit: {min: -Math.PI / 4, max: Math.PI / 4}
        },
        femur: {
            size: [.1, .5, .1],
            color: [1, 0, .5],
            jointLimit: {min: -Math.PI / 3, max: Math.PI / 3}
        },
        tibia: {
            size: [.1, .8, .1],
            color: [1, 0, 0.5],
            jointLimit: {min: -Math.PI / 2, max: Math.PI / 6}
        },
        swingSpeed: 1.8,
        stepHeight: 0.35
    }
};