import {SceneNode} from "../scene/SceneNode.js";
import config from "./robotConfig.js";
import {loadMesh} from "../utils/meshUtils.js";

// Leg class
export class Leg {
    static async create(gl, index, attach) {
        const leg = new Leg();
        await leg.init(gl, index, attach);
        return leg;
    }

    async init(gl, index, attach) {
        this.index = index;
        this.attach = attach;
        const isLeft = index >= 3;
        const {upper, lower, foot} = config.segmentConfig;

        const upperMesh = await loadMesh(gl, upper.mesh);
        const lowerMesh = await loadMesh(gl, lower.mesh);
        const footMesh = await loadMesh(gl, foot.mesh);

        const upperMatrix = m4.multiply(
            m4.translation(...attach),
            m4.identity()
        );

        const upperNode = new SceneNode({
            name: `leg${index}_upper`,
            mesh: upperMesh,
            pivot: upper.pivot,
            localMatrix: upperMatrix
        });
        upperNode.jointLimits = upper.jointLimits;

        const lowerNode = new SceneNode({
            name: `leg${index}_lower`,
            mesh: lowerMesh,
            pivot: lower.pivot,
            localMatrix: m4.multiply(
                m4.translation(0, upper.mesh.size[1], 0),
                m4.translation(...lower.pivot),
            )
        });
        lowerNode.jointLimits = lower.jointLimits;

        const footNode = new SceneNode({
            name: `leg${index}_foot`,
            mesh: footMesh,
            pivot: foot.pivot,
            localMatrix: m4.multiply(
                m4.translation(0, lower.mesh.size[1], 0),
                m4.translation(...foot.pivot)
            )
        });
        footNode.jointLimits = foot.jointLimits;

        upperNode.addChild(lowerNode);
        lowerNode.addChild(footNode);

        this.root = upperNode;
        this.footPosition = [0, 0, 0];
        this.isGrounded = false;
        this.phase = "support";
    }

    update(time) {
        // Placeholder for gait/IK updates
    }

    getFootWorldPosition() {
        return this.footPosition;
    }
}