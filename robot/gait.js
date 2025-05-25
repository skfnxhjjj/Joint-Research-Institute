// 삼각보행을 위한 다리 그룹 정의
const TRIPOD_GROUP_A = [0, 2, 4]; // 한 쪽 그룹
const TRIPOD_GROUP_B = [1, 3, 5]; // 다른 쪽 그룹

let gaitTime = 0;
let currentMovingGroup = null;

// 각 다리의 이전 목표 위치 저장
const legPreviousTargets = new Map();

/**
 * 벡터 평활화 함수
 */
function smoothVector3(current, previous, alpha = 0.3) {
    if (!previous) return current;
    
    return [
        previous[0] + (current[0] - previous[0]) * alpha,
        previous[1] + (current[1] - previous[1]) * alpha,
        previous[2] + (current[2] - previous[2]) * alpha
    ];
}

export function update(time, legs, robotPosition, controllerPosition, spiderYaw = 0) {
    if (!legs || !Array.isArray(legs)) return false;
    
    const dx = controllerPosition[0] - robotPosition[0];
    const dz = controllerPosition[2] - robotPosition[2];
    const isMoving = Math.hypot(dx, dz) > 0.05;
    
    if (!isMoving) {
        // 로봇이 정지 상태일 때는 모든 다리를 기본 위치로 설정
        const groundHeight = -0.8; // 다리가 자연스럽게 닿을 수 있는 높이
        
        legs.forEach((leg, index) => {
            leg.phase = "support";
            leg.isMoving = false;
            
            // 기본 위치 계산 (body 회전 고려)
            if (leg.attachWorld) {
                const localOffset = [leg.attach[0] * 0.3, 0, leg.attach[2] * 0.3];
                const cosYaw = Math.cos(spiderYaw);
                const sinYaw = Math.sin(spiderYaw);
                
                // 기본 발 위치 (다리 길이를 고려한 현실적인 위치)
                const defaultFootPos = [
                    leg.attachWorld[0] + localOffset[0] * cosYaw - localOffset[2] * sinYaw,
                    groundHeight, // 현실적인 지면 높이
                    leg.attachWorld[2] + localOffset[0] * sinYaw + localOffset[2] * cosYaw
                ];
                
                // footTarget이 없거나 원점에 있으면 기본 위치로 설정
                if (!leg.footTarget || (leg.footTarget[0] === 0 && leg.footTarget[1] === 0 && leg.footTarget[2] === 0)) {
                    leg.footTarget = [...defaultFootPos];
                    console.log(`다리 ${index} 기본 위치 설정: [${defaultFootPos[0].toFixed(2)}, ${defaultFootPos[1].toFixed(2)}, ${defaultFootPos[2].toFixed(2)}]`);
                }
            }
        });
        return false;
    }
    
    calculate(time, legs, spiderYaw, dx, dz);
    return true;
}

function calculate(time, legs, spiderYaw, dx, dz) {
    const liftHeight = 0.3;
    const strideLength = 0.8;
    const cycleTime = 2.0; // 한 사이클당 시간(초)
    
    // 다리 길이 정보 (robotConfig에서 가져옴)
    const totalLegLength = 1.0; // upper(0.4) + lower(0.5) + foot(0.1)
    const groundHeight = -0.8; // 다리가 자연스럽게 닿을 수 있는 높이
    
    // 이동 방향 계산 (로봇이 이동할 방향)
    const moveDistance = Math.hypot(dx, dz);
    const moveDir = moveDistance > 0 ? [dx / moveDistance, 0, dz / moveDistance] : [0, 0, 1];
    
    // 보폭 방향 (이동 방향의 반대, 다리가 뒤로 밀어내는 방향)
    const strideDir = [-moveDir[0], 0, -moveDir[2]];
    
    gaitTime += 0.016; // 대략 60fps 기준
    const phase = (gaitTime % cycleTime) / cycleTime; // 0-1 사이의 값
    
    legs.forEach((leg, index) => {
        if (!leg.attachWorld) return;
        
        const isGroupA = TRIPOD_GROUP_A.includes(index);
        let legPhase;
        
        // 그룹 A와 B의 위상을 반대로 설정
        if (isGroupA) {
            legPhase = phase;
        } else {
            legPhase = (phase + 0.5) % 1.0;
        }
        
        // 다리의 기본 위치를 body의 회전을 고려하여 계산
        // 1. 다리의 로컬 오프셋 (body 중심에서의 상대적 위치)
        const localOffset = [
            leg.attach[0],
            0,
            leg.attach[2]
        ];
        
        // 2. body 회전을 적용한 오프셋
        const cosYaw = Math.cos(spiderYaw);
        const sinYaw = Math.sin(spiderYaw);
        const rotatedOffset = [
            localOffset[0] * cosYaw - localOffset[2] * sinYaw,
            0,
            localOffset[0] * sinYaw + localOffset[2] * cosYaw
        ];
        
        // 3. body의 월드 위치에 회전된 오프셋을 더해서 다리의 기본 위치 계산
        const robotWorldPos = leg.attachWorld; // 이미 body의 월드 변환이 적용된 위치
        
        // 4. 보폭 방향도 body 회전을 고려하여 계산
        const rotatedStrideDir = [
            strideDir[0] * cosYaw - strideDir[2] * sinYaw,
            0,
            strideDir[0] * sinYaw + strideDir[2] * cosYaw
        ];
        
        // 기본 발 위치 (다리 길이를 고려한 현실적인 위치)
        const defaultFootPos = [
            robotWorldPos[0] + rotatedStrideDir[0] * strideLength * 0.2,
            groundHeight, // 현실적인 지면 높이
            robotWorldPos[2] + rotatedStrideDir[2] * strideLength * 0.2
        ];
        
        let newTarget;
        
        if (legPhase < 0.5) {
            // 지지 단계: 다리가 땅에 있으면서 뒤로 밀어냄
            leg.phase = "support";
            leg.isMoving = true;
            
            const supportProgress = legPhase * 2; // 0-1
            newTarget = [
                defaultFootPos[0] + rotatedStrideDir[0] * strideLength * (0.3 - supportProgress * 0.6),
                groundHeight,
                defaultFootPos[2] + rotatedStrideDir[2] * strideLength * (0.3 - supportProgress * 0.6)
            ];
        } else {
            // 스윙 단계: 다리가 공중에서 앞으로 이동
            leg.phase = "swing";
            leg.isMoving = true;
            
            const swingProgress = (legPhase - 0.5) * 2; // 0-1
            
            // 시작점과 끝점
            const startPos = [
                defaultFootPos[0] + rotatedStrideDir[0] * strideLength * 0.3,
                groundHeight,
                defaultFootPos[2] + rotatedStrideDir[2] * strideLength * 0.3
            ];
            const endPos = [
                defaultFootPos[0] - rotatedStrideDir[0] * strideLength * 0.3,
                groundHeight,
                defaultFootPos[2] - rotatedStrideDir[2] * strideLength * 0.3
            ];
            
            // 포물선 궤적으로 발을 들어올림
            const height = Math.sin(swingProgress * Math.PI) * liftHeight;
            
            newTarget = [
                startPos[0] + (endPos[0] - startPos[0]) * swingProgress,
                groundHeight + height,
                startPos[2] + (endPos[2] - startPos[2]) * swingProgress
            ];
        }
        
        // 이전 목표 위치와 평활화
        const prevTarget = legPreviousTargets.get(index);
        const smoothingAlpha = leg.phase === "swing" ? 0.6 : 0.4; // 스윙 시에는 더 빠르게 반응
        const smoothedTarget = smoothVector3(newTarget, prevTarget, smoothingAlpha);
        
        // NaN 체크
        if (smoothedTarget.some(val => isNaN(val))) {
            leg.footTarget = leg.footPosition ? [...leg.footPosition] : [...defaultFootPos];
        } else {
            leg.footTarget = smoothedTarget;
        }
        
        // 디버깅: 일부 다리의 target 변경 사항 출력
        if (index === 0 || index === 3) { // 다리 0과 3만 출력
            console.log(`다리 ${index} Target 업데이트: [${leg.footTarget[0].toFixed(2)}, ${leg.footTarget[1].toFixed(2)}, ${leg.footTarget[2].toFixed(2)}] (${leg.phase})`);
        }
        
        // 현재 목표를 이전 목표로 저장
        legPreviousTargets.set(index, [...leg.footTarget]);
    });
}