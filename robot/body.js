import {SceneNode} from "../scene/SceneNode.js";
import config from "./robotConfig.js";
import {loadMesh} from "../utils/meshUtils.js";

export async function createBody(gl) {
    const {mesh, pivot} = config.segmentConfig.body;
    const bodyMesh = await loadMesh(gl, mesh);

    return new SceneNode({
        name: "body",
        mesh: bodyMesh,
        pivot: pivot || [0, 0, 0],
        localMatrix: m4.identity()
    });
}