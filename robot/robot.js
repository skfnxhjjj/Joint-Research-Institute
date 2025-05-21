import {createBody} from "./body.js";
import {Leg} from "./leg.js";
import config from "./robotConfig.js";
import {SceneNode} from "../scene/SceneNode.js";

export async function buildSpider(gl) {
    const spiderRoot = new SceneNode({
        name: "spider_root",
        localMatrix: m4.identity()
    });

    const body = await createBody(gl);
    spiderRoot.addChild(body);

    // Create legs and attach them to the body
    for (let i = 0; i < config.mountPoints.length; i++) {
        const leg = await Leg.create(gl, i, config.mountPoints[i]);
        body.addChild(leg.root);
    }

    // Initialize world matrices
    spiderRoot.updateWorldMatrix();

    return spiderRoot;
}