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
        const isLeft1 = 0;
        const isLeft2 = 1;
        const {upper, lower, foot} = config.segmentConfig;

        const upperMesh = await loadMesh(gl, upper.mesh);
        const lowerMesh = await loadMesh(gl, lower.mesh);
        const footMesh = await loadMesh(gl, foot.mesh);

        // Upper segment positioning and rotation
        let upperMatrix = m4.translation(...attach);
        
        // Apply rotation based on left/right
        if(index === isLeft1 || index === isLeft2) {
            // 왼쪽 다리: 바깥쪽으로 -90도, 아래쪽으로 -30도
            upperMatrix = m4.multiply(
                upperMatrix,
                m4.multiply(
                    m4.yRotation(-Math.PI / 2),
                    m4.xRotation(Math.PI / 2)
                )
            );
        } else {
            // 오른쪽 다리: 바깥쪽으로 90도, 아래쪽으로 -30도
            upperMatrix = m4.multiply(
                upperMatrix,
                m4.multiply(
                    m4.yRotation(-Math.PI / 2),
                    m4.xRotation(-Math.PI / 2)
                )
            );
        }

        const upperNode = new SceneNode({
            name: `leg${index}_upper`,
            mesh: upperMesh,
            pivot: upper.pivot,
            localMatrix: upperMatrix
        });
        upperNode.jointLimits = upper.jointLimits;


        // if(index === isLeft1 || index === isLeft2) {
        //     // 왼쪽 다리: 바깥쪽으로 -90도, 아래쪽으로 -30도
        //     upperMatrix = m4.multiply(
        //         upperMatrix,
        //         m4.multiply(
        //             m4.yRotation(-Math.PI / 2),
        //             m4.xRotation(Math.PI / 2)
        //         )
        //     );
        // } else {
        //     // 오른쪽 다리: 바깥쪽으로 90도, 아래쪽으로 -30도
        //     upperMatrix = m4.multiply(
        //         upperMatrix,
        //         m4.multiply(
        //             m4.yRotation(-Math.PI / 2),
        //             m4.xRotation(-Math.PI / 2)
        //         )
        //     );
        // }

        // Lower segment - positioned at the end of upper segment
        const lowerNode = new SceneNode({
            name: `leg${index}_lower`,
            mesh: lowerMesh,
            pivot: lower.pivot,
            localMatrix: m4.multiply(
                m4.translation(0, 0.4, 0), // upper.mesh.size[1] = 0.4
                m4.xRotation(Math.PI / 4) // 45도 앞쪽으로 굽힘
            )
        });
        lowerNode.jointLimits = lower.jointLimits;

        // Foot segment - positioned at the end of lower segment  
        const footNode = new SceneNode({
            name: `leg${index}_foot`,
            mesh: footMesh,
            pivot: foot.pivot,
            localMatrix: m4.translation(0, 0.5, 0)
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