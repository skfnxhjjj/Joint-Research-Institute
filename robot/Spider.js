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
            const theta = i * 2 * Math.PI / numLegs;
            const x = R * Math.cos(theta);
            const z = R * Math.sin(theta);
            const leg = new Leg(gl, `leg${i + 1}`, meshConfigsPerLeg[i] || {});
            // 기준 위치/방향은 legRoot에만 적용
            leg.legRoot.transforms.base = m4.multiply(
                m4.translation(0, 0, 0.15),
                m4.xRotation(Math.PI / 4)
            )
            // coxaJoint에는 base transform 적용하지 않음 (identity)
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
            leg.solveIK([0, 0, 0]);
        }
        ));

        this.root.transforms.user = m4.translation(cx, cy, cz);
    }
}