import {createBody} from "./body.js";
import {Leg} from "./leg.js";
import config from "./robotConfig.js";

export async function buildSpider(gl) {
    const body = await createBody(gl);
    body.legs = [];
    for (let i = 0; i < config.mountPoints.length; i++) {
        const leg = await Leg.create(gl, i, config.mountPoints[i]);
        leg.attach = config.mountPoints[i];
        body.addChild(leg.root);
        body.legs.push(leg);
    }

    body.transforms.base = m4.translation(0, 0, 0);
    body.traverse(node => node.updateLocalMatrix?.());

    for (let i = 0; i < body.legs.length; i++) {
        const leg = body.legs[i];
        const worldAttach = m4.transformPoint(body.worldMatrix, leg.attach);
        leg.footPosition = worldAttach;
        leg.footTarget = worldAttach.slice();
        leg.isMoving = false;
        leg.isGrounded = true;
        leg.phase = "support";
    }

    return body;
}