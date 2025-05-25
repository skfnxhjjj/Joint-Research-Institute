import {SceneNode} from '/scene/SceneNode.js';
import {Joint} from '/robot/Joint.js';
import {createBoxMesh} from '/utils/meshUtils.js';
import {robotConfig} from './robotConfig.js';
import FabrikSolver from '/utils/fabrikSolver.js';

export class Leg {
    constructor(gl, name, meshConfigs = {}) {
        // mesh 준비
        const coxaMesh = meshConfigs.coxa || createBoxMesh(gl, robotConfig.leg.coxa.size, robotConfig.leg.coxa.color);
        const femurMesh = meshConfigs.femur || createBoxMesh(gl, robotConfig.leg.femur.size, robotConfig.leg.femur.color);
        const tibiaMesh = meshConfigs.tibia || createBoxMesh(gl, robotConfig.leg.tibia.size, robotConfig.leg.tibia.color);

        // 관절 노드
        this.coxaJoint = new Joint({name: `${name}_coxaJoint`, axis: [0, 1, 0], offset: [0, .1, 0]});
        this.femurJoint = new Joint({name: `${name}_femurJoint`, axis: [1, 0, 0], offset: [0, .3, 0]});
        this.tibiaJoint = new Joint({name: `${name}_tibiaJoint`, axis: [1, 0, 0], offset: [0, .5, 0]});

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
        // targetPosition: [x, y, z]
        const adjustedTarget = [
            targetPosition[0], 
            targetPosition[1] - 0.5,
            targetPosition[2]
        ];
        
        const base = [0, 0, 0]; 
        const coxaLen = robotConfig.leg.coxa.size[1]; 
        const femurLen = robotConfig.leg.femur.size[1]; 
        const tibiaLen = robotConfig.leg.tibia.size[1]; 

        console.log('Original Target:', targetPosition, 'Adjusted:', adjustedTarget);


        const solver = new FabrikSolver(base[0], base[1], base[2], 0.001);
        solver.addSegment(coxaLen, 0, 0);
        solver.addSegment(femurLen, 0, 0);
        solver.addSegment(tibiaLen, 0, 0);
        
        const success = solver.compute(adjustedTarget[0], adjustedTarget[1], adjustedTarget[2], 20);
        const angles = solver.getJointAngles();
        console.log('Angles:', angles.map(a => `x:${a.x.toFixed(2)} y:${a.y.toFixed(2)}`));
        
        if (angles.length >= 3) {
            // coxa: y축 회전 (좌우), femur: x축 회전 (상하), tibia: x축 회전 (상하)
            this.coxaJoint.transforms.ik = m4.yRotation(angles[0].y);
            this.femurJoint.transforms.ik = m4.xRotation(angles[1].x);
            this.tibiaJoint.transforms.ik = m4.xRotation(angles[2].x);
        }
    }
}