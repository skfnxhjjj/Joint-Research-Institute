// Utils for Inverse Kinematics
import config from "./robotConfig.js";

/**
 * 각 다리의 IK를 해결합니다
 * @param {Object} spiderRoot - 스파이더 루트 노드
 * @param {Array} legs - 다리 배열 (Joint 시스템이 포함된)
 */
export function solve(spiderRoot, legs) {
    if (!legs || !Array.isArray(legs)) return;

    legs.forEach((leg, index) => {
        if (!leg.footTarget || !leg.hipJoint) return;
        
        // 각 다리의 IK 해결
        solveLegIK(leg, leg.footTarget);
    });
}

/**
 * 단일 다리의 IK를 해결합니다
 * @param {Object} leg - 다리 객체 (Joint들 포함)
 * @param {Array} targetPosition - 목표 위치 [x, y, z]
 */
function solveLegIK(leg, targetPosition) {
    const {segmentLengths} = config;
    const upperLength = segmentLengths.upper;
    const lowerLength = segmentLengths.lower;
    const footLength = segmentLengths.foot;
    
    // Body에서 target까지의 벡터
    const hipPosition = leg.hipJoint.position;
    const dx = targetPosition[0] - hipPosition[0];
    const dy = targetPosition[1] - hipPosition[1];
    const dz = targetPosition[2] - hipPosition[2];
    
    // Hip 조인트 회전 (Y축 - 좌우 회전)
    const hipYaw = Math.atan2(dx, dz);
    
    // 2D 평면에서의 거리 (XZ 평면에서 Y축으로 투영)
    const distanceXZ = Math.sqrt(dx * dx + dz * dz);
    const totalDistance = Math.sqrt(distanceXZ * distanceXZ + dy * dy);
    
    // 다리 총 길이
    const totalLegLength = upperLength + lowerLength;
    
    // 목표가 도달 가능한 범위 내에 있는지 확인
    if (totalDistance > totalLegLength) {
        // 목표가 너무 멀면 다리를 최대한 뻗어서 그 방향으로 향하게 함
        const scale = totalLegLength / totalDistance;
        solveReachableIK(leg, distanceXZ * scale, dy * scale, hipYaw, upperLength, lowerLength);
    } else {
        // 목표가 도달 가능한 범위 내에 있음
        solveReachableIK(leg, distanceXZ, dy, hipYaw, upperLength, lowerLength);
    }
}

/**
 * 도달 가능한 범위 내의 IK를 해결합니다
 */
function solveReachableIK(leg, distanceXZ, dy, hipYaw, upperLength, lowerLength) {
    // 2D IK 해결 (YZ 평면에서)
    const distance2D = Math.sqrt(distanceXZ * distanceXZ + dy * dy);
    
    // Law of cosines를 사용하여 조인트 각도 계산
    const cosKnee = (upperLength * upperLength + lowerLength * lowerLength - distance2D * distance2D) / 
                    (2 * upperLength * lowerLength);
    
    // 무릎 각도
    let kneeAngle = 0;
    if (Math.abs(cosKnee) <= 1) {
        kneeAngle = Math.acos(cosKnee) - Math.PI; // 무릎이 뒤로 굽도록
    }
    
    // 어깨 각도
    const shoulderAngle1 = Math.atan2(dy, distanceXZ);
    const shoulderAngle2 = Math.acos(
        (upperLength * upperLength + distance2D * distance2D - lowerLength * lowerLength) /
        (2 * upperLength * distance2D)
    );
    const shoulderAngle = shoulderAngle1 - shoulderAngle2;
    
    // 발목 각도 (발을 수평으로 유지)
    const ankleAngle = -(shoulderAngle + kneeAngle);
    
    // 조인트 각도 적용
    leg.hipJoint.setAngle('y', hipYaw);
    leg.kneeJoint.setAngle('x', kneeAngle);
    leg.ankleJoint.setAngle('x', ankleAngle);
    
    // 월드 매트릭스 업데이트
    leg.root.updateWorldMatrix();
}

/**
 * 간단한 IK 테스트 함수
 * @param {Object} leg - 테스트할 다리
 * @param {number} time - 시간 (애니메이션용)
 */
export function testLegMovement(leg, time) {
    // 간단한 사인파 움직임으로 테스트
    const amplitude = 0.3;
    const frequency = 0.5;
    
    const hipAngle = Math.sin(time * frequency) * amplitude;
    const shoulderAngle = Math.sin(time * frequency + Math.PI/4) * amplitude;
    const kneeAngle = Math.sin(time * frequency + Math.PI/2) * amplitude;
    
    leg.hipJoint.setAngle('y', hipAngle);
    leg.kneeJoint.setAngle('x', kneeAngle);
    leg.ankleJoint.setAngle('x', ankleAngle);
    
    leg.root.updateWorldMatrix();
}