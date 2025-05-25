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
        // 로봇이 정지 상태일 때는 모든 다리를 지지 상태로
        legs.forEach(leg => {
            leg.phase = "support";
            leg.isMoving = false;
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
        
        // 다리의 기본 위치 (로봇 중심에서의 상대적 위치)
        const defaultFootPos = [
            leg.attachWorld[0] + strideDir[0] * strideLength * 0.3,
            0,
            leg.attachWorld[2] + strideDir[2] * strideLength * 0.3
        ];
        
        let newTarget;
        
        if (legPhase < 0.5) {
            // 지지 단계: 다리가 땅에 있으면서 뒤로 밀어냄
            leg.phase = "support";
            leg.isMoving = true;
            
            const supportProgress = legPhase * 2; // 0-1
            newTarget = [
                defaultFootPos[0] + strideDir[0] * strideLength * (0.5 - supportProgress),
                0,
                defaultFootPos[2] + strideDir[2] * strideLength * (0.5 - supportProgress)
            ];
        } else {
            // 스윙 단계: 다리가 공중에서 앞으로 이동
            leg.phase = "swing";
            leg.isMoving = true;
            
            const swingProgress = (legPhase - 0.5) * 2; // 0-1
            
            // 시작점과 끝점
            const startPos = [
                defaultFootPos[0] + strideDir[0] * strideLength * 0.5,
                0,
                defaultFootPos[2] + strideDir[2] * strideLength * 0.5
            ];
            const endPos = [
                defaultFootPos[0] - strideDir[0] * strideLength * 0.5,
                0,
                defaultFootPos[2] - strideDir[2] * strideLength * 0.5
            ];
            
            // 포물선 궤적으로 발을 들어올림
            const height = Math.sin(swingProgress * Math.PI) * liftHeight;
            
            newTarget = [
                startPos[0] + (endPos[0] - startPos[0]) * swingProgress,
                height,
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
        
        // 현재 목표를 이전 목표로 저장
        legPreviousTargets.set(index, [...leg.footTarget]);
    });
}