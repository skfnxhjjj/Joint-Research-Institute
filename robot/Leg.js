import {SceneNode} from '/scene/SceneNode.js';
import {Joint} from '/robot/Joint.js';
import {createBoxMesh} from '/utils/meshUtils.js';
import {robotConfig} from './robotConfig.js';
import {AnalyticalIkWithFabrikSolver} from '/utils/fabrikSolver.js';

export class Leg {
    constructor(gl, name, meshConfigs = {}) {
        const coxaMesh = meshConfigs.coxa || createBoxMesh(gl, robotConfig.leg.coxa.size, robotConfig.leg.coxa.color);
        const femurMesh = meshConfigs.femur || createBoxMesh(gl, robotConfig.leg.femur.size, robotConfig.leg.femur.color);
        const tibiaMesh = meshConfigs.tibia || createBoxMesh(gl, robotConfig.leg.tibia.size, robotConfig.leg.tibia.color);

        // 관절 노드 - 각 관절은 이전 세그먼트의 끝에 위치
        this.coxaJoint = new Joint({name: `${name}_coxaJoint`, axis: [0, 1, 0], offset: [0, 0.1, 0]});
        this.femurJoint = new Joint({name: `${name}_femurJoint`, axis: [1, 0, 0], offset: [0, robotConfig.leg.coxa.size[1], 0]});
        this.tibiaJoint = new Joint({name: `${name}_tibiaJoint`, axis: [1, 0, 0], offset: [0, robotConfig.leg.femur.size[1], 0]});

        // 세그먼트(실제 limb 메쉬) 노드 - 각 세그먼트는 해당 관절에서 시작
        this.coxaSegment = new SceneNode({name: `${name}_coxaSegment`, mesh: coxaMesh});
        this.femurSegment = new SceneNode({name: `${name}_femurSegment`, mesh: femurMesh});
        this.tibiaSegment = new SceneNode({name: `${name}_tibiaSegment`, mesh: tibiaMesh});

        // 트리 구조 연결: joint → segment → joint
        this.coxaJoint.addChild(this.coxaSegment);
        this.coxaSegment.addChild(this.femurJoint);
        this.femurJoint.addChild(this.femurSegment);
        this.femurSegment.addChild(this.tibiaJoint);
        this.tibiaJoint.addChild(this.tibiaSegment);

        // IK 솔버 초기화
        this.ikSolver = new AnalyticalIkWithFabrikSolver(
            robotConfig.leg.coxa.size[1],  
            robotConfig.leg.femur.size[1], 
            robotConfig.leg.tibia.size[1] 
        );

        // leg 트리의 루트노드 (body에 연결)
        this.rootNode = this.coxaJoint;
    }

    // 예시: gait/IK update용 메서드
    updateGait(gaitParams) {
        // gaitParams에 따라 각 joint의 transforms.gait 수정
    }

    solveIK(targetPosition) {
        // IK 솔버를 사용하여 각도 계산
        const result = this.ikSolver.solve(targetPosition);
        
        // 디버깅용
        // if (Math.random() < 0.05) { // 5%만 출력
        //     const degrees = this.ikSolver.solveDegrees(targetPosition);
        //     console.log('IK Target:', targetPosition);
        //     console.log('Calculated angles (deg):', {
        //         coxa: degrees.coxa.toFixed(1),
        //         femur: degrees.femur.toFixed(1),
        //         tibia: degrees.tibia.toFixed(1)
        //     });
        //     console.log('Reachable:', result.reachable, 'Distance:', result.distance.toFixed(3));
        // }
        
        // 각도가 유효한지 확인하고 적용
        if (!isNaN(result.coxa) && !isNaN(result.femur) && !isNaN(result.tibia)) {
            this.coxaJoint.transforms.ik = m4.yRotation(result.coxa);
            this.femurJoint.transforms.ik = m4.xRotation(result.femur);
            this.tibiaJoint.transforms.ik = m4.xRotation(result.tibia);
        }
    }
}