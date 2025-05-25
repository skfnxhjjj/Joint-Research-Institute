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
    
    // 각 다리의 초기 hip 각도 가져오기 (다리별 기본 방향)
    const initialHipAngle = getInitialHipAngle(legIndex, leg.attach);
    
    // 이전 각도 가져오기 (초기 각도를 기본값으로 사용)
    const prevAngles = legPreviousAngles.get(legIndex) || {
        hip: initialHipAngle,
        knee: 0,
        ankle: 0
    };
    
    // 너무 가까운 목표거나 변화가 작으면 이전 각도 유지 (안정성 증대)
    if (targetDistance < 0.05) {
        // 이전 각도를 그대로 적용
        leg.hipJoint.setAngle('y', prevAngles.hip);
        leg.kneeJoint.setAngle('x', prevAngles.knee);
        leg.ankleJoint.setAngle('x', prevAngles.ankle);
        leg.root.updateWorldMatrix();
        return;
    }
    
    // Hip에서 목표까지의 방향 벡터 계산
    const directionToTarget = [
        targetPosition[0] - hipWorldPos[0],
        targetPosition[1] - hipWorldPos[1],
        targetPosition[2] - hipWorldPos[2]
    ];
    
    // Hip 각도 계산 (목표 방향을 향하도록)
    let hipAngle = Math.atan2(directionToTarget[0], directionToTarget[2]);
    
    // 각 다리의 제한 범위 내에서 조정
    const hipLimits = getLegHipLimits(legIndex, leg.attach);
    
    // 각도 제한 적용 시 wrapping 고려
    if (hipLimits.max < hipLimits.min) {
        // 범위가 -π와 π를 넘나드는 경우 (예: 150도 ~ 270도)
        if (hipAngle < 0) hipAngle += 2 * Math.PI; // 음수 각도를 양수로 변환
        if (hipAngle < hipLimits.min) {
            // 최소값보다 작으면 가장 가까운 경계로
            const distToMin = Math.abs(hipAngle - hipLimits.min);
            const distToMax = Math.abs(hipAngle - (hipLimits.max - 2 * Math.PI));
            hipAngle = distToMin < distToMax ? hipLimits.min : hipLimits.max;
        } else if (hipAngle > hipLimits.max) {
            hipAngle = hipLimits.max;
        }
    } else {
        // 일반적인 경우
        hipAngle = Math.max(hipLimits.min, Math.min(hipLimits.max, hipAngle));
    }
    
    // Hip 각도 평활화
    hipAngle = smoothAngle(hipAngle, prevAngles.hip, 0.02, 0.15);
    
    // Hip 각도를 적용한 상태에서 FABRIK 계산
    leg.hipJoint.setAngle('y', hipAngle);
    leg.root.updateWorldMatrix();
    
    // 업데이트된 hip 위치에서 FABRIK 솔버 생성
    const updatedHipPos = leg.hipJoint.node.getWorldPosition();
    const fabrik = new FabrikSolver(
        updatedHipPos[0], 
        updatedHipPos[1], 
        updatedHipPos[2], 
        0.001  // 더 정확한 margin of error
    );
    
    // 세그먼트 추가: Upper -> Lower -> Foot
    fabrik.addSegment(upperLength, 0, 0);
    fabrik.addSegment(lowerLength, 0, 0);
    fabrik.addSegment(footLength, 0, 0);
    
    // FABRIK 계산 실행 (더 많은 반복)
    const converged = fabrik.compute(
        targetPosition[0], 
        targetPosition[1], 
        targetPosition[2],
        15  // 반복 횟수 증가
    );
    
    // 수렴 여부와 관계없이 결과 적용 (최선의 결과 사용)
    // FABRIK 결과를 Joint 각도로 변환
    const jointAngles = fabrik.getJointAngles();
    
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
    leg.kneeJoint.setAngle('x', kneeAngle);
    leg.ankleJoint.setAngle('x', ankleAngle);
    
    // Joint 변환 업데이트 (중요!)
    leg.updateJoints();
    
    // 월드 매트릭스 업데이트
    leg.root.updateWorldMatrix();
    
    // 실제 foot 위치 계산 및 업데이트
    const actualFootPosition = leg.calculateFootWorldPosition();
    leg.footPosition = actualFootPosition;
    
    // 현재 각도를 이전 각도로 저장
    legPreviousAngles.set(legIndex, {
        hip: hipAngle,
        knee: kneeAngle,
        ankle: ankleAngle
    });
    
    // 목표와 실제 위치 간의 오차 계산
    const error = Math.sqrt(
        Math.pow(actualFootPosition[0] - targetPosition[0], 2) +
        Math.pow(actualFootPosition[1] - targetPosition[1], 2) +
        Math.pow(actualFootPosition[2] - targetPosition[2], 2)
    );
    
    // 디버깅 출력 (모든 다리에 대해)
    if (legIndex === 2 || legIndex === 3) { // 다리 2(오른쪽 뒤), 다리 3(왼쪽 앞)
        console.log(`다리 ${legIndex} IK: Hip=${(hipAngle * 180/Math.PI).toFixed(1)}°, Knee=${(kneeAngle * 180/Math.PI).toFixed(1)}°, Ankle=${(ankleAngle * 180/Math.PI).toFixed(1)}°`);
        console.log(`다리 ${legIndex} Foot 위치: [${actualFootPosition[0].toFixed(2)}, ${actualFootPosition[1].toFixed(2)}, ${actualFootPosition[2].toFixed(2)}]`);
        console.log(`다리 ${legIndex} Target: [${targetPosition[0].toFixed(2)}, ${targetPosition[1].toFixed(2)}, ${targetPosition[2].toFixed(2)}]`);
        console.log(`다리 ${legIndex} 오차: ${error.toFixed(3)}, 수렴: ${converged}`);
    }
}

/**
 * 각 다리의 초기 hip 각도를 반환
 */
function getInitialHipAngle(legIndex, attachPoint) {
    const [x, y, z] = attachPoint;
    
    if (x > 0) {
        // 오른쪽 다리들 - IK가 선호하는 방향으로 설정
        if (z > 0.5) return Math.PI / 6;      // 앞쪽: 30도 (오른쪽 앞으로)
        else if (z < -0.5) return 0;          // 뒤쪽: 0도 (정면으로)
        else return Math.PI / 2;              // 중간: 90도 (완전히 오른쪽으로)
    } else {
        // 왼쪽 다리들 - IK가 선호하는 방향으로 설정
        if (z > 0.5) return 2 * Math.PI / 3;     // 앞쪽: 120도 (왼쪽 앞으로)
        else if (z < -0.5) return Math.PI + Math.PI / 6; // 뒤쪽: 210도 (왼쪽 뒤로)
        else return -Math.PI / 2;                       // 중간: -90도 (완전히 왼쪽으로)
    }
}

/**
 * 각 다리의 hip 각도 제한 범위를 반환
 */
function getLegHipLimits(legIndex, attachPoint) {
    const [x, y, z] = attachPoint;
    const angleRange = Math.PI / 3; // 60도 범위
    
    if (x > 0) {
        // 오른쪽 다리들
        if (z > 0.5) {
            // 앞쪽 다리 (다리 0): 30도 ± 60도 = -30도 ~ +90도
            return { min: -Math.PI/6, max: Math.PI/2 };
        } else if (z < -0.5) {
            // 뒤쪽 다리 (다리 2): 0도 ± 60도 = -60도 ~ +60도
            return { min: -Math.PI/3, max: Math.PI/3 };
        } else {
            // 중간 다리 (다리 1): 90도 ± 60도 = 30도 ~ 150도
            return { min: Math.PI/6, max: Math.PI - Math.PI/6 };
        }
    } else {
        // 왼쪽 다리들
        if (z > 0.5) {
            // 앞쪽 다리 (다리 3): 120도 ± 60도 = 60도 ~ 180도
            return { min: Math.PI/3, max: Math.PI };
        } else if (z < -0.5) {
            // 뒤쪽 다리 (다리 5): 210도 ± 60도 = 150도 ~ 270도 (270도 = -90도)
            return { min: Math.PI - Math.PI/6, max: Math.PI + angleRange };
        } else {
            // 중간 다리 (다리 4): -90도 ± 60도 = -150도 ~ -30도
            return { min: -Math.PI + Math.PI/6, max: -Math.PI/6 };
        }
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