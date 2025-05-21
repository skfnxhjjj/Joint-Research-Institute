import {SceneNode} from "../scene/SceneNode.js";
import config from "./robotConfig.js";
import {loadMesh} from "../utils/meshUtils.js";

export async function createBody(gl) {
    const {mesh, pivot} = config.segmentConfig.body;
    const bodyMeshArray = await loadMesh(gl, mesh);
    
    if (!bodyMeshArray?.[0]?.buffers?.position) {
        throw new Error("Failed to load body mesh properly");
    }

    const bodyMesh = bodyMeshArray[0];
    console.log("Body mesh loaded:", bodyMesh);

    const node = new SceneNode({
        name: "body",
        mesh: bodyMesh,
        pivot: pivot || [0, 0, 0],
        localMatrix: m4.multiply(m4.scaling(0.05, 0.05, 0.05), m4.identity())
    });

    // Initialize world matrix
    node.updateWorldMatrix();

    return node;
}