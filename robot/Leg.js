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

        // 관절 노드 - 각 관절은 이전 세그먼트의 끝에 위치
        this.coxaJoint = new Joint({name: `${name}_coxaJoint`, axis: [0, 1, 0], offset: [0, 0.1, 0]});
        this.femurJoint = new Joint({name: `${name}_femurJoint`, axis: [1, 0, 0], offset: [0, robotConfig.leg.coxa.size[1], 0]});
        this.tibiaJoint = new Joint({name: `${name}_tibiaJoint`, axis: [1, 0, 0], offset: [0, robotConfig.leg.femur.size[1], 0]});

        // 세그먼트(실제 limb 메쉬) 노드 - 각 세그먼트는 해당 관절에서 시작
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
        // 타겟 위치를 복사하여 원본을 보호
        let target = [...targetPosition];
        
        // 세그먼트 길이들
        const coxaLen = robotConfig.leg.coxa.size[1]; 
        const femurLen = robotConfig.leg.femur.size[1]; 
        const tibiaLen = robotConfig.leg.tibia.size[1]; 
        
        // 타겟 거리가 너무 멀면 제한
        const maxDistance = 2.0; // 최대 도달 거리 제한
        const targetDistance = Math.sqrt(target[0]**2 + target[1]**2 + target[2]**2);
        if (targetDistance > maxDistance) {
            const scale = maxDistance / targetDistance;
            target[0] *= scale;
            target[1] *= scale;
            target[2] *= scale;
        }
        
        // 1. Coxa (Hip) 관절: Y축 회전으로 좌우 방향 결정
        const coxaAngle = Math.atan2(target[0], target[2]);
        
        // 2. 수평 거리와 수직 거리 계산 (coxa 길이 제외)
        const horizontalDist = Math.sqrt(target[0]**2 + target[2]**2);
        const verticalDist = target[1] - coxaLen; // coxa 길이만큼 빼기
        
        // 3. Femur와 Tibia로 도달해야 할 2D 거리
        const targetDist2D = Math.sqrt(horizontalDist**2 + verticalDist**2);
        const maxReach = femurLen + tibiaLen;
        const minReach = Math.abs(femurLen - tibiaLen);
        
        let femurAngle = 0;
        let tibiaAngle = 0;
        
        if (targetDist2D > maxReach) {
            // 도달 불가능한 경우: 최대한 가까이 가도록 직선으로 펼침
            femurAngle = Math.atan2(verticalDist, horizontalDist);
            tibiaAngle = 0; // 직선으로 펼침
            
        } else if (targetDist2D < minReach) {
            // 너무 가까운 경우: 최소 구성
            if (verticalDist >= 0) {
                femurAngle = Math.PI / 2; // 90도 위로
                tibiaAngle = -Math.PI / 2; // 90도 아래로
            } else {
                femurAngle = -Math.PI / 2; // 90도 아래로
                tibiaAngle = Math.PI / 2; // 90도 위로
            }
            
        } else {
            // 정상적인 IK 계산
            // 코사인 법칙을 사용한 각도 계산
            const cosAngle = (femurLen**2 + targetDist2D**2 - tibiaLen**2) / (2 * femurLen * targetDist2D);
            const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
            
            const cosKneeAngle = (femurLen**2 + tibiaLen**2 - targetDist2D**2) / (2 * femurLen * tibiaLen);
            const clampedCosKneeAngle = Math.max(-1, Math.min(1, cosKneeAngle));
            
            femurAngle = Math.atan2(verticalDist, horizontalDist) + Math.acos(clampedCosAngle);
            tibiaAngle = Math.acos(clampedCosKneeAngle) - Math.PI;
        }
        
        // 각도가 유효한지 확인하고 적용
        if (!isNaN(coxaAngle) && !isNaN(femurAngle) && !isNaN(tibiaAngle)) {
            this.coxaJoint.transforms.ik = m4.yRotation(coxaAngle);
            this.femurJoint.transforms.ik = m4.xRotation(-femurAngle);
            this.tibiaJoint.transforms.ik = m4.xRotation(-tibiaAngle);
        }
    }
}