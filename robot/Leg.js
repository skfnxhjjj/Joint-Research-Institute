import { SceneNode } from '../scene/SceneNode.js';
import { Joint } from './Joint.js';
import { createBoxMesh } from '../utils/meshUtils.js';
import { robotConfig } from './robotConfig.js';
import { solveLegIK, applyLegIK } from '../utils/ik.js';

export class Leg {
    constructor(gl, name, meshConfigs = {}) {
        const coxaMesh = meshConfigs.coxa ||
            createBoxMesh(gl, robotConfig.leg.coxa.size, robotConfig.leg.coxa.color);
        const femurMesh = meshConfigs.femur ||
            createBoxMesh(gl, robotConfig.leg.femur.size, robotConfig.leg.femur.color);
        const tibiaMesh = meshConfigs.tibia ||
            createBoxMesh(gl, robotConfig.leg.tibia.size, robotConfig.leg.tibia.color);

        // 기준 위치/방향용 dummy node
        this.legRoot = new SceneNode({ name: `${name}_legRoot` });

        // 관절 노드 - 각 관절은 이전 세그먼트의 끝에 위치
        this.coxaJoint = new Joint({
            name: `${name}_coxaJoint`,
            axis: [0, 1, 0],
            offset: [0, 0, 0]
        });
        this.femurJoint = new Joint({
            name: `${name}_femurJoint`,
            axis: [1, 0, 0],
            offset: [0, robotConfig.leg.coxa.size[1], 0]
        });
        this.tibiaJoint = new Joint({
            name: `${name}_tibiaJoint`,
            axis: [1, 0, 0],
            offset: [0, robotConfig.leg.femur.size[1], 0]
        });

        // 세그먼트(실제 limb 메쉬) 노드 - 각 세그먼트는 해당 관절에서 시작
        this.coxaSegment = new SceneNode({
            name: `${name}_coxaSegment`,
            mesh: coxaMesh
        });
        this.femurSegment = new SceneNode({
            name: `${name}_femurSegment`,
            mesh: femurMesh
        });
        this.tibiaSegment = new SceneNode({
            name: `${name}_tibiaSegment`,
            mesh: tibiaMesh
        });

        // endPoint
        // 디버그용 좌표 저장
        this.footEnd = new Joint({
            name: `${name}_footEnd`,
            offset: [0, robotConfig.leg.tibia.size[1], 0]
        });

        // 실제 IK foot 좌표 저장용
        // 월드 좌표 기준: Parent = SceneNode!
        this.foot = new SceneNode({ name: `${name}_foot` });

        // 트리 구조 연결: legRoot → coxaJoint → coxaSegment → femurJoint ... → tibiaSegment → footEnd
        this.legRoot.addChild(this.coxaJoint);
        this.coxaJoint._parent = this.legRoot;
        this.coxaJoint.addChild(this.coxaSegment);
        this.coxaSegment.addChild(this.femurJoint);
        this.femurJoint.addChild(this.femurSegment);
        this.femurSegment.addChild(this.tibiaJoint);
        this.tibiaJoint.addChild(this.tibiaSegment);
        this.tibiaSegment.addChild(this.footEnd);

        // leg 트리의 루트노드
        this.rootNode = this.legRoot;
    }

    // 예시: gait/IK update용 메서드
    updateGait(gaitParams) {
        // gaitParams에 따라 각 joint의 transforms.gait 수정
    }

    solveIK(targetPosition) {
        // IK 솔버를 사용하여 각도 계산
        const angles = solveLegIK(
            this.coxaJoint,
            this.femurJoint,
            this.tibiaJoint,
            targetPosition
        );
        applyLegIK(this.coxaJoint, this.femurJoint, this.tibiaJoint, angles);
        // 트리 갱신
        this.legRoot.traverse(node => node.updateLocalMatrix());
        this.legRoot.computeWorld();
        return angles;
    }
}