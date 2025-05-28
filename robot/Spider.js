import { SceneNode } from '/scene/SceneNode.js';
import { Leg } from '/robot/Leg.js';
import { createBoxMesh } from "../utils/meshUtils.js";
import { robotConfig } from "./robotConfig.js";

export class Spider {
    constructor(gl, numLegs = 6, meshConfigsPerLeg = []) {
        this.gl = gl;
        // Create root node
        this.root = new SceneNode({
            name: "spiderRoot",
            mesh: createBoxMesh(gl, [.1, .1, .1], [1, 1, 0])
        });
        // Body node
        this.body = new SceneNode({
            name: "body",
            mesh: createBoxMesh(gl, robotConfig.body.size, robotConfig.body.color)
        });
        this.root.addChild(this.body);

        // Initialize legs
        this.legs = [];
        const R = robotConfig.body.radius || (robotConfig.body.size[2] / 2);
        for (let i = 0; i < numLegs; i++) {
            const [x, , z] = robotConfig.body.size;
            const legPosition = [
                [x / 2, 0, z / 2],
                [x / 2, 0, 0],
                [x / 2, 0, -z / 2],
                [-x / 2, 0, z / 2],
                [-x / 2, 0, 0],
                [-x / 2, 0, -z / 2]
            ]
            const leg = new Leg(gl, `leg${i}`, meshConfigsPerLeg[i] || {});
            // 기준 위치/방향은 legRoot에만 적용
            leg.legRoot.transforms.base = m4.translation(...legPosition[i])
            this.root.addChild(leg.rootNode);
            this.legs.push(leg);
        }

        // root 지면에서 띄우기
        this.root.transforms.base = m4.translation(0, .5, 0);
    }

    update(controllerNode) {
        const controllerPosition = controllerNode.getWorldPosition();
        const [cx, cy, cz] = controllerPosition;

        // Solve IK for each leg (각도만 갱신)
        this.legs.forEach(((leg, i) => {
            // leg.foot가 있으면 그 위치를 IK 타겟으로 사용
            if (leg.foot) {
                const footPosition = leg.foot.getWorldPosition();
                // spider의 로컬 좌표계로 변환
                const spiderWorldMatrix = this.root.worldMatrix;
                const spiderInverseMatrix = m4.inverse(spiderWorldMatrix);
                const localFootPosition = m4.transformPoint(spiderInverseMatrix, footPosition);
                leg.solveIK(footPosition);
            } else {
                // 기본 IK 타겟
                leg.solveIK([0, 0, 0]);
            }
        }
        ));

        this.root.transforms.user = m4.translation(cx, cy, cz);
    }
}