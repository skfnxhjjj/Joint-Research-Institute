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

        // End Effector - tibia의 끝 부분을 나타내는 노드
        this.endEffector = new SceneNode({
            name: `${name}_endEffector`, 
            mesh: null // 시각적 메쉬 없음, 위치 계산용
        });
        // End effector를 tibia 끝에 위치시킴
        this.endEffector.transforms.base = m4.translation(0, robotConfig.leg.tibia.size[1], 0);

        // 트리 구조 연결: joint → segment → joint ... → endEffector
        this.coxaJoint.addChild(this.coxaSegment);
        this.coxaSegment.addChild(this.femurJoint);
        this.femurJoint.addChild(this.femurSegment);
        this.femurSegment.addChild(this.tibiaJoint);
        this.tibiaJoint.addChild(this.tibiaSegment);
        this.tibiaSegment.addChild(this.endEffector);

        // leg 트리의 루트노드 (body에 연결)
        this.rootNode = this.coxaJoint;
    }

    // End Effector의 현재 월드 위치를 계산
    getEndEffectorPosition() {
        // 월드 매트릭스가 업데이트된 후 호출되어야 함
        if (this.endEffector.worldMatrix) {
            return [
                this.endEffector.worldMatrix[12],
                this.endEffector.worldMatrix[13], 
                this.endEffector.worldMatrix[14]
            ];
        }
        return [0, 0, 0];
    }

    // 예시: gait/IK update용 메서드
    updateGait(gaitParams) {
        // gaitParams에 따라 각 joint의 transforms.gait 수정
    }

    solveIK(targetPosition) {
        // 타겟 위치를 복사하여 원본을 보호
        let target = [...targetPosition];
        
        // 세그먼트 길이들
        const coxaLen = robotConfig.leg.coxa.size[1]; // 0.3
        const femurLen = robotConfig.leg.femur.size[1]; // 0.5
        const tibiaLen = robotConfig.leg.tibia.size[1]; // 0.8
        
        console.log('IK Target:', target);
        console.log('Leg lengths:', {coxa: coxaLen, femur: femurLen, tibia: tibiaLen});
        
        // 1. Coxa 관절 (Hip): Y축 회전으로 다리 방향 결정
        const coxaAngle = Math.atan2(target[0], target[2]);
        
        // 2. Coxa 회전 후의 로컬 좌표계에서 타겟 위치 계산
        const cosCoxa = Math.cos(coxaAngle);
        const sinCoxa = Math.sin(coxaAngle);
        
        // 타겟을 coxa 로컬 좌표계로 변환
        const localTarget = [
            target[0] * cosCoxa + target[2] * sinCoxa,
            target[1],
            -target[0] * sinCoxa + target[2] * cosCoxa
        ];
        
        // 3. Coxa 길이를 고려한 femur 시작점에서 타겟까지의 벡터
        const femurStart = [0, coxaLen, 0]; // Coxa 끝점 = Femur 시작점
        const targetFromFemur = [
            localTarget[0] - femurStart[0],
            localTarget[1] - femurStart[1], 
            localTarget[2] - femurStart[2]
        ];
        
        // 4. 2D 평면에서 IK 계산 (XZ 평면 무시하고 YZ 평면에서)
        const horizontalDist = Math.sqrt(targetFromFemur[0]**2 + targetFromFemur[2]**2);
        const verticalDist = targetFromFemur[1];
        const targetDist2D = Math.sqrt(horizontalDist**2 + verticalDist**2);
        
        console.log('Target from femur:', targetFromFemur);
        console.log('2D distances:', {horizontal: horizontalDist, vertical: verticalDist, total: targetDist2D});
        
        const maxReach = femurLen + tibiaLen; // 1.3
        const minReach = Math.abs(femurLen - tibiaLen); // 0.3
        
        let femurAngle = 0;
        let tibiaAngle = 0;
        
        if (targetDist2D > maxReach * 0.99) {
            // 도달 불가능: 최대한 펼침
            console.log('Target unreachable, extending to max');
            femurAngle = Math.atan2(horizontalDist, -verticalDist); // 아래쪽을 향하도록
            tibiaAngle = 0;
            
        } else if (targetDist2D < minReach * 1.1) {
            // 너무 가까움: 접힌 상태
            console.log('Target too close, folding');
            femurAngle = -Math.PI / 4; // -45도 (아래쪽)
            tibiaAngle = Math.PI / 2; // 90도 (접힘)
            
        } else {
            // 정상적인 2-link IK
            console.log('Normal IK calculation');
            
            // 코사인 법칙으로 각도 계산
            const cosAngle = (femurLen**2 + targetDist2D**2 - tibiaLen**2) / (2 * femurLen * targetDist2D);
            const clampedCosAngle = Math.max(-1, Math.min(1, cosAngle));
            
            const cosKneeAngle = (femurLen**2 + tibiaLen**2 - targetDist2D**2) / (2 * femurLen * tibiaLen);
            const clampedCosKneeAngle = Math.max(-1, Math.min(1, cosKneeAngle));
            
            // Femur 각도: 타겟 방향 + 삼각형 내부 각도
            const targetAngle = Math.atan2(horizontalDist, -verticalDist); // 아래쪽이 양수
            const triangleAngle = Math.acos(clampedCosAngle);
            femurAngle = targetAngle - triangleAngle;
            
            // Tibia 각도: 무릎 각도에서 180도 빼기
            tibiaAngle = Math.acos(clampedCosKneeAngle) - Math.PI;
        }
        
        console.log('Calculated angles (deg):', {
            coxa: (coxaAngle * 180 / Math.PI).toFixed(1),
            femur: (femurAngle * 180 / Math.PI).toFixed(1),
            tibia: (tibiaAngle * 180 / Math.PI).toFixed(1)
        });
        
        // 각도가 유효한지 확인하고 적용
        if (!isNaN(coxaAngle) && !isNaN(femurAngle) && !isNaN(tibiaAngle)) {
            this.coxaJoint.transforms.ik = m4.yRotation(coxaAngle);
            this.femurJoint.transforms.ik = m4.xRotation(femurAngle);
            this.tibiaJoint.transforms.ik = m4.xRotation(tibiaAngle);
        }
    }
}