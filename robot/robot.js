import {createBody} from "./body.js";
import {Leg} from "./leg.js";
import config from "./robotConfig.js";

export async function buildSpider(gl) {
    const body = await createBody(gl);

    for (let i = 0; i < config.mountPoints.length; i++) {
        const leg = await Leg.create(gl, i, config.mountPoints[i]);
        body.addChild(leg.root);
    }

    body.localMatrix = m4.identity();

    return body;
}