// Utils for Inverse Kinematics using FABRIK Algorithm
import config from "./robotConfig.js";
import FabrikSolver from '../utils/fabrikSolver.js';

// 각 다리의 이전 각도를 저장하는 맵
const legPreviousAngles = new Map();

/**
 * 각도를 -π와 π 사이로 정규화
 */
function normalizeAngle(angle) {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
}

/**
 * 두 각도 사이의 최단 거리 계산 (wrapping 고려) - 수정된 버전
 */
function angleDistance(from, to) {
    let diff = to - from;
    
    // 차이가 π보다 크면 반대 방향으로 돌아가는 것이 더 가까움
    if (diff > Math.PI) {
        diff -= 2 * Math.PI;
    } else if (diff < -Math.PI) {
        diff += 2 * Math.PI;
    }
    
    return diff;
}

/**
 * 각도 평활화 및 제한 - 개선된 버전
 */
function smoothAngle(currentAngle, previousAngle, maxDelta = 0.05, smoothingFactor = 0.2) {
    if (previousAngle === undefined) return normalizeAngle(currentAngle);
    
    // 현재 각도를 정규화
    currentAngle = normalizeAngle(currentAngle);
    previousAngle = normalizeAngle(previousAngle);
    
    // 두 각도가 π 경계 근처에 있는지 확인
    const nearBoundary = Math.abs(Math.abs(currentAngle) - Math.PI) < 0.5 || 
                        Math.abs(Math.abs(previousAngle) - Math.PI) < 0.5;
    
    if (nearBoundary) {
        // π 경계 근처에서는 더 강한 평활화 적용
        smoothingFactor *= 0.3;
        maxDelta *= 0.5;
    }
    
    const delta = angleDistance(previousAngle, currentAngle);
    
    // 최대 변화량 제한
    const clampedDelta = Math.max(-maxDelta, Math.min(maxDelta, delta));
    
    // 평활화 적용
    const smoothedAngle = previousAngle + clampedDelta * smoothingFactor;
    
    return normalizeAngle(smoothedAngle);
}

/**
 * 각 다리의 IK를 FABRIK 알고리즘으로 해결합니다
 * @param {Object} spiderRoot - 스파이더 루트 노드
 * @param {Array} legs - 다리 배열 (Joint 시스템이 포함된)
 */
export function solve(spiderRoot, legs) {
    if (!legs || !Array.isArray(legs)) return;

    legs.forEach((leg, index) => {
        if (!leg.footTarget || !leg.hipJoint) return;
        
        // FABRIK을 사용하여 각 다리의 IK 해결
        solveLegIKWithFabrik(leg, leg.footTarget, index);
    });
}

/**
 * FABRIK 알고리즘을 사용하여 단일 다리의 IK를 해결합니다
 * @param {Object} leg - 다리 객체 (Joint들 포함)
 * @param {Array} targetPosition - 목표 위치 [x, y, z]
 * @param {number} legIndex - 다리 인덱스 (이전 각도 저장용)
 */
function solveLegIKWithFabrik(leg, targetPosition, legIndex) {
    const {segmentLengths} = config;
    const upperLength = segmentLengths.upper;
    const lowerLength = segmentLengths.lower;
    const footLength = segmentLengths.foot;
    
    // Hip 조인트의 월드 위치를 계산
    const hipWorldPos = leg.hipJoint.node.getWorldPosition();
    
    // 목표와 현재 위치 사이의 거리 체크
    const targetDistance = Math.sqrt(
        Math.pow(targetPosition[0] - hipWorldPos[0], 2) +
        Math.pow(targetPosition[1] - hipWorldPos[1], 2) +
        Math.pow(targetPosition[2] - hipWorldPos[2], 2)
    );
    
    // 이전 각도 가져오기
    const prevAngles = legPreviousAngles.get(legIndex) || {
        hip: 0,
        knee: 0,
        ankle: 0
    };
    
    // 너무 가까운 목표거나 변화가 작으면 이전 각도 유지 (안정성 증대)
    if (targetDistance < 0.1) {
        // 이전 각도를 그대로 적용
        leg.hipJoint.setAngle('y', prevAngles.hip);
        leg.kneeJoint.setAngle('x', prevAngles.knee);
        leg.ankleJoint.setAngle('x', prevAngles.ankle);
        leg.root.updateWorldMatrix();
        return;
    }
    
    // FABRIK 솔버 생성 (Hip 위치를 base로 설정)
    const fabrik = new FabrikSolver(
        hipWorldPos[0], 
        hipWorldPos[1], 
        hipWorldPos[2], 
        0.003 // margin of error를 더 크게
    );
    
    // 세그먼트 추가: Upper -> Lower -> Foot
    fabrik.addSegment(upperLength, 0, 0);  // Upper segment
    fabrik.addSegment(lowerLength, 0, 0);  // Lower segment  
    fabrik.addSegment(footLength, 0, 0);   // Foot segment
    
    // FABRIK 계산 실행
    const converged = fabrik.compute(
        targetPosition[0], 
        targetPosition[1], 
        targetPosition[2],
        5 // max iterations 더 줄임
    );
    
    if (converged) {
        // FABRIK 결과를 Joint 각도로 변환
        const jointAngles = fabrik.getJointAngles();
        
        // Hip 각도 계산 및 평활화 - 더 강한 평활화
        let hipAngle = jointAngles[0]?.y || 0;
        hipAngle = smoothAngle(hipAngle, prevAngles.hip, 0.02, 0.15); // 매우 강한 평활화
        
        // Knee 각도 계산 (upper와 lower 사이의 각도)
        let kneeAngle = 0;
        if (jointAngles.length > 1) {
            const relativeAngle = calculateRelativeAngle(
                fabrik.basePoint,
                fabrik.segments[0].point, 
                fabrik.segments[1].point
            );
            kneeAngle = smoothAngle(relativeAngle, prevAngles.knee, 0.05, 0.2);
        }
        
        // Ankle 각도 계산 (lower와 foot 사이의 각도)
        let ankleAngle = 0;
        if (jointAngles.length > 2) {
            const ankleRelativeAngle = calculateRelativeAngle(
                fabrik.segments[0].point,
                fabrik.segments[1].point,
                fabrik.segments[2].point
            );
            ankleAngle = smoothAngle(ankleRelativeAngle, prevAngles.ankle, 0.05, 0.2);
        }
        
        // 각도 적용
        leg.hipJoint.setAngle('y', hipAngle);
        leg.kneeJoint.setAngle('x', kneeAngle);
        leg.ankleJoint.setAngle('x', ankleAngle);
        
        // 현재 각도를 이전 각도로 저장
        legPreviousAngles.set(legIndex, {
            hip: hipAngle,
            knee: kneeAngle,
            ankle: ankleAngle
        });
        
        // 디버그 출력 (첫 번째 다리만, 빈도 줄임)
        // if (legIndex === 0 && Math.random() < 0.1) { // 10%만 출력
        //     console.log(`Leg ${legIndex} - Hip: ${(hipAngle * 180/Math.PI).toFixed(1)}°, Knee: ${(kneeAngle * 180/Math.PI).toFixed(1)}°`);
        // }
        
        // 월드 매트릭스 업데이트
        leg.root.updateWorldMatrix();
    }
}

/**
 * 세 점 사이의 상대 각도를 계산합니다 (무릎 관절용)
 * @param {Array} p1 - 첫 번째 점 (hip)
 * @param {Array} p2 - 두 번째 점 (knee)  
 * @param {Array} p3 - 세 번째 점 (ankle)
 * @returns {number} 라디안 단위의 각도
 */
function calculateRelativeAngle(p1, p2, p3) {
    // 벡터 계산
    const v1 = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]]; // knee에서 hip으로
    const v2 = [p3[0] - p2[0], p3[1] - p2[1], p3[2] - p2[2]]; // knee에서 ankle으로
    
    // 벡터 정규화
    const len1 = Math.sqrt(v1[0]**2 + v1[1]**2 + v1[2]**2);
    const len2 = Math.sqrt(v2[0]**2 + v2[1]**2 + v2[2]**2);
    
    if (len1 === 0 || len2 === 0) return 0;
    
    const norm1 = [v1[0]/len1, v1[1]/len1, v1[2]/len1];
    const norm2 = [v2[0]/len2, v2[1]/len2, v2[2]/len2];
    
    // 내적으로 각도 계산
    const dot = norm1[0]*norm2[0] + norm1[1]*norm2[1] + norm1[2]*norm2[2];
    const clampedDot = Math.max(-1, Math.min(1, dot));
    
    // 무릎은 뒤로 굽어야 하므로 π에서 빼줌
    return Math.PI - Math.acos(clampedDot);
}

/**
 * FABRIK 기반 테스트 함수
 * @param {Object} leg - 테스트할 다리
 * @param {number} time - 시간 (애니메이션용)
 */
export function testLegMovementFabrik(leg, time) {
    // 원형 궤도로 발 움직이기
    const radius = 0.5;
    const height = -0.3;
    const frequency = 0.5;
    
    const x = leg.hipJoint.position[0] + Math.cos(time * frequency) * radius;
    const y = height;
    const z = leg.hipJoint.position[2] + Math.sin(time * frequency) * radius;
    
    solveLegIKWithFabrik(leg, [x, y, z]);
}

/**
 * 기존 호환성을 위한 래퍼 함수
 */
export function testLegMovement(leg, time) {
    testLegMovementFabrik(leg, time);
}