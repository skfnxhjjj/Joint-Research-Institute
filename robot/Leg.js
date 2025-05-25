import {SceneNode} from '/scene/SceneNode.js';
import {Joint} from '/robot/Joint.js';
import {createBoxMesh} from '/utils/meshUtils.js';
import {robotConfig} from './robotConfig.js';

export class Leg {
    constructor(gl, name, meshConfigs = {}) {
        // mesh 준비
        const coxaMesh = meshConfigs.coxa || createBoxMesh(gl, robotConfig.leg.coxa.size, robotConfig.leg.coxa.color);
        const femurMesh = meshConfigs.femur || createBoxMesh(gl, robotConfig.leg.femur.size, robotConfig.leg.femur.color);
        const tibiaMesh = meshConfigs.tibia || createBoxMesh(gl, robotConfig.leg.tibia.size, robotConfig.leg.tibia.color);

        // 관절 노드
        this.coxaJoint = new Joint({name: `${name}_coxaJoint`, axis: [0, 1, 0], offset: [0, .1, 0]});
        this.femurJoint = new Joint({name: `${name}_femurJoint`, axis: [0, 0, 1], offset: [0, .3, 0]});
        this.tibiaJoint = new Joint({name: `${name}_tibiaJoint`, axis: [0, 0, 1], offset: [0, .5, 0]});

        // 세그먼트(실제 limb 메쉬) 노드
        this.coxaSegment = new SceneNode({name: `${name}_coxaSegment`, mesh: coxaMesh});
        this.femurSegment = new SceneNode({name: `${name}_femurSegment`, mesh: femurMesh});
        this.tibiaSegment = new SceneNode({name: `${name}_tibiaSegment`, mesh: tibiaMesh});

        // 트리 구조 연결: joint → segment → joint ...
        this.coxaJoint.addChild(this.coxaSegment);
        this.coxaSegment.addChild(this.femurJoint);
        this.femurJoint.addChild(this.femurSegment);
        this.femurSegment.addChild(this.tibiaJoint);
        this.tibiaJoint.addChild(this.tibiaSegment);

        // leg 트리의 루트노드 (body에 연결)
        this.rootNode = this.coxaJoint;
    }

    // 예시: gait/IK update용 메서드
    updateGait(gaitParams) {
        // gaitParams에 따라 각 joint의 transforms.gait 수정
    }

    solveIK(targetPosition) {
        // targetPosition(x, y, z)에 맞춰 각 joint의 transforms.ik 수정
        // IK 알고리즘 구현 필요
    }
}