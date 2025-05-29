import { SceneNode } from '/scene/SceneNode.js';
import { Leg } from '/robot/Leg.js';
import { createBoxMesh } from "../utils/meshUtils.js";
import { robotConfig } from "./robotConfig.js";

export class Spider {
    constructor(gl, numLegs = 6, meshConfigsPerLeg = []) {
        this.gl = gl;

        // 현재 위치와 회전 상태
        this.currentPosition = [0, robotConfig.body.groundHeight, 0]; // 현재 위치 (y는 고정)
        this.currentRotation = 0; // 현재 Y축 회전 (라디안)
        this.targetPosition = [0, robotConfig.body.groundHeight, 0]; // 목표 위치
        this.targetRotation = 0; // 목표 회전

        // Create root node (no mesh)
        this.root = new SceneNode({
            name: "spiderRoot"
        });

        // Create debug node for spider root
        const spiderRootDebugMesh = createBoxMesh(gl, robotConfig.debug.spiderRoot.size, robotConfig.debug.spiderRoot.color);
        this.debugRootNode = new SceneNode({
            name: "spiderRootDebug",
            mesh: spiderRootDebugMesh,
            visible: true
        });
        this.root.addChild(this.debugRootNode);

        // Body node
        const bodyMesh = createBoxMesh(gl, robotConfig.body.size, robotConfig.body.color);
        this.body = new SceneNode({
            name: "body",
            mesh: bodyMesh
        });
        this.root.addChild(this.body);

        // Decorations
        this.eye = new SceneNode({
            name: "eye",
            mesh: createBoxMesh(gl, robotConfig.eye.size, robotConfig.eye.color)
        });
        this.body.addChild(this.eye);
        this.eye.transforms.base = m4.translation(0,
            0.1,
            robotConfig.body.size[2] / 2);

        this.bodyShell = new SceneNode({
            name: "bodyShell",
            mesh: createBoxMesh(gl, robotConfig.body.shell.size, robotConfig.body.shell.color)
        });
        this.body.addChild(this.bodyShell);
        this.bodyShell.transforms.base = m4.translation(0, .15, 0);

        // Initialize legs
        this.legs = [];
        const R = robotConfig.body.radius || (robotConfig.body.size[2] / 2);
        for (let i = 0; i < numLegs; i++) {
            const [x, , z] = robotConfig.body.size;
            const d = 0.05;
            const legPosition = [
                [x / 2 - d, 0, z / 2 - d],
                [x / 2 - d, 0, 0],
                [x / 2 - d, 0, -z / 2 + d],
                [-x / 2 + d, 0, z / 2 - d],
                [-x / 2 + d, 0, 0],
                [-x / 2 + d, 0, -z / 2 + d]
            ]

            const coxaRotations = [
                -Math.PI / 4,
                -Math.PI / 3,
                -Math.PI / 4,
                Math.PI / 4,
                Math.PI / 3,
                Math.PI / 4
            ];

            const leg = new Leg(gl, `leg${i}`, meshConfigsPerLeg[i] || {});

            // 기준 위치와 회전을 legRoot에 적용
            const translation = m4.translation(...legPosition[i]);
            const rotation = m4.zRotation(coxaRotations[i]);
            leg.legRoot.transforms.base = m4.multiply(translation, rotation);

            this.root.addChild(leg.rootNode);
            this.legs.push(leg);
        }
        this.updateTransform();
    }

    update(controllerNode, deltaTime) {
        const controllerPosition = controllerNode.getWorldPosition();
        const [cx, cy, cz] = controllerPosition;

        // 목표 위치 설정 (y는 고정)
        this.targetPosition = [cx, robotConfig.body.groundHeight, cz];

        // 현재 위치에서 목표 위치로의 방향 벡터 계산
        const direction = [
            this.targetPosition[0] - this.currentPosition[0],
            0,
            this.targetPosition[2] - this.currentPosition[2]
        ];

        const distance = Math.sqrt(direction[0] * direction[0] + direction[2] * direction[2]);

        // 목표 지점에 도달했는지 확인
        if (distance > robotConfig.movement.arrivalThreshold) {
            // 방향 정규화
            direction[0] /= distance;
            direction[2] /= distance;

            // 목표 회전각 계산 (Z축이 앞 방향)
            this.targetRotation = Math.atan2(direction[0], direction[2]);

            // 부드러운 회전
            this.updateRotation(deltaTime);

            // 부드러운 이동 (회전이 어느 정도 완료되면)
            const rotationDiff = Math.abs(this.targetRotation - this.currentRotation);
            const normalizedRotDiff = Math.min(rotationDiff, 2 * Math.PI - rotationDiff);

            if (normalizedRotDiff < Math.PI / 8) { // 회전했으면 이동 시작
                this.updatePosition(deltaTime, direction);
            }
        }

        // transform 업데이트
        this.updateTransform();

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
    }

    updateRotation(deltaTime) {
        const rotationDiff = this.targetRotation - this.currentRotation;

        // 최단 회전 경로 계산 (-π ~ π 범위로 정규화)
        let normalizedDiff = rotationDiff;
        while (normalizedDiff > Math.PI) normalizedDiff -= 2 * Math.PI;
        while (normalizedDiff < -Math.PI) normalizedDiff += 2 * Math.PI;

        // 부드러운 회전
        const maxRotationStep = robotConfig.movement.turnSpeed * deltaTime;
        const rotationStep = Math.sign(normalizedDiff) * Math.min(Math.abs(normalizedDiff), maxRotationStep);

        this.currentRotation += rotationStep;

        // 회전각을 0 ~ 2π 범위로 정규화
        while (this.currentRotation < 0) this.currentRotation += 2 * Math.PI;
        while (this.currentRotation >= 2 * Math.PI) this.currentRotation -= 2 * Math.PI;
    }

    updatePosition(deltaTime, direction) {
        const moveStep = robotConfig.movement.walkSpeed * deltaTime;

        this.currentPosition[0] += direction[0] * moveStep;
        this.currentPosition[2] += direction[2] * moveStep;
    }

    updateTransform() {
        this.root.transforms.base = m4.translation(...this.currentPosition);
        this.root.transforms.user = m4.yRotation(this.currentRotation);
    }
}