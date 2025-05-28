import { SceneNode } from '../scene/SceneNode.js';
import { createBoxMesh } from '../utils/meshUtils.js';
import { robotConfig } from './robotConfig.js';

export class TripodGait {
    constructor(gl, spider) {
        this.gl = gl;
        this.spider = spider;

        // footNode들 (IK target이 되는 노드들) - sceneRoot의 자식
        this.footNodes = [];

        // footTargetNode들 (미래 위치를 나타내는 노드들) - spiderRoot의 자식
        this.footTargetNodes = [];

        // 각 다리의 lerp 상태 관리
        this.legStates = [];

        // Tripod gait 그룹 정의
        this.tripodGroups = {
            groupA: [0, 2, 4], // 첫 번째 tripod (우전, 좌중, 우후)
            groupB: [1, 3, 5]  // 두 번째 tripod (좌전, 우중, 좌후)
        };

        // 현재 활성 그룹 (움직일 수 있는 그룹)
        this.activeGroup = null; // 'groupA' 또는 'groupB' 또는 null

        this.initializeGait();
    }

    initializeGait() {
        const numLegs = this.spider.legs.length;

        // 각 다리의 lerp 상태 초기화
        for (let i = 0; i < numLegs; i++) {
            this.legStates.push({
                isGround: true, // 다리가 지면에 있는지 여부
                isLerping: false, // lerp 진행 중인지 여부
                lerpTime: 0, // 현재 lerp 진행 시간
                lerpStartOffset: [0, 0, 0], // lerp 시작 시 gait 오프셋
                lerpEndOffset: [0, 0, 0], // lerp 목표 gait 오프셋
                phase: 'support' // 'support' 또는 'swing'
            });
        }

        // footNode 생성 (노란색 - IK target)
        for (let i = 0; i < numLegs; i++) {
            const footNode = new SceneNode({
                name: `foot_${i}`,
                mesh: createBoxMesh(this.gl, [0.1, 0.1, 0.1], [1, 1, 0]) // 노란색
            });

            // 초기 위치 설정 (다리 끝 위치 기준) - base transform에만 설정
            const initialPos = this.calculateInitialFootPosition(i);
            footNode.transforms.base = m4.translation(...initialPos);
            // gait transform은 identity로 시작
            footNode.transforms.gait = m4.identity();

            this.footNodes.push(footNode);

            // leg에 footNode 할당
            this.spider.legs[i].foot = footNode;
        }

        // footTargetNode 생성 (청록색 - 미래 목표 위치)
        for (let i = 0; i < numLegs; i++) {
            const footTargetNode = new SceneNode({
                name: `footTarget_${i}`,
                mesh: createBoxMesh(this.gl, [0.1, 0.1, 0.1], [0, 1, 1])
            });

            // 초기 위치 설정 (spider 로컬 좌표계에서)
            const initialPos = this.calculateInitialFootPosition(i);
            footTargetNode.transforms.base = m4.translation(...initialPos);

            this.footTargetNodes.push(footTargetNode);
        }
    }

    calculateInitialFootPosition(legIndex) {
        const [x, , z] = robotConfig.body.size;

        const footPosition = [
            [x, 0, z],
            [x * 1.5, 0, 0],
            [x, 0, -z],
            [-x, 0, z],
            [-x * 1.5, 0, 0],
            [-x, 0, -z]
        ]

        return footPosition[legIndex];
    }

    update(deltaTime, controllerPosition) {
        // footTargetNode들의 y 좌표만 0으로 고정 (spider와 함께 움직이되 y만 조정)
        this.footTargetNodes.forEach(footTargetNode => {
            // spider의 월드 위치에서 지면까지의 거리 계산
            const spiderWorldPos = this.spider.root.getWorldPosition();
            const yOffset = - spiderWorldPos[1]; // 지면(y=0)까지의 오프셋

            // user transform으로 y 오프셋 적용
            footTargetNode.transforms.user = m4.translation(0, yOffset, 0);
        });

        // tripod gait 상태 업데이트
        this.updateTripodState();

        // 각 다리에 대해 foot과 footTarget 사이의 거리 확인 및 lerp 처리
        for (let i = 0; i < this.spider.legs.length; i++) {
            this.updateLegLerp(i, deltaTime);
        }
    }

    updateLegLerp(legIndex, deltaTime) {
        const footNode = this.footNodes[legIndex];
        const footTargetNode = this.footTargetNodes[legIndex];
        const legState = this.legStates[legIndex];

        const footPos = footNode.getWorldPosition();
        const targetPos = footTargetNode.getWorldPosition();

        // foot과 footTarget 사이의 거리 계산
        const distance = Math.sqrt(
            Math.pow(targetPos[0] - footPos[0], 2) +
            Math.pow(targetPos[2] - footPos[2], 2) // 높이 차이는 무시
        );

        // 디버그 로그 (첫 번째 다리만)
        if (legIndex === 0) {
            console.log(`[Leg ${legIndex}] Distance: ${distance.toFixed(3)}, isGround: ${legState.isGround}, isLerping: ${legState.isLerping}, canStart: ${this.canStartLerp(legIndex)}`);
            console.log(`[Leg ${legIndex}] FootPos: [${footPos[0].toFixed(2)}, ${footPos[1].toFixed(2)}, ${footPos[2].toFixed(2)}]`);
            console.log(`[Leg ${legIndex}] TargetPos: [${targetPos[0].toFixed(2)}, ${targetPos[1].toFixed(2)}, ${targetPos[2].toFixed(2)}]`);
        }

        if (legState.isLerping) {
            // 현재 lerp 중인 경우
            legState.lerpTime += deltaTime;
            const t = Math.min(legState.lerpTime / robotConfig.gait.lerpDuration, 1.0);

            // 현재 gait 오프셋 계산 (포물선 높이 포함)
            const currentOffset = this.calculateLerpOffset(
                legState.lerpStartOffset,
                legState.lerpEndOffset,
                t
            );

            // gait transform 업데이트
            footNode.transforms.gait = m4.translation(...currentOffset);
            footNode.updateLocalMatrix();

            // 디버그 로그 (첫 번째 다리만)
            if (legIndex === 0) {
                console.log(`[Leg ${legIndex}] LERPING - Progress: ${(t * 100).toFixed(1)}%, Time: ${legState.lerpTime.toFixed(3)}s`);
                console.log(`[Leg ${legIndex}] Current offset: [${currentOffset[0].toFixed(2)}, ${currentOffset[1].toFixed(2)}, ${currentOffset[2].toFixed(2)}]`);
            }

            // lerp 완료 확인
            if (t >= 1.0) {
                legState.isLerping = false;
                legState.isGround = true;
                legState.lerpTime = 0;

                // 최종 위치를 정확히 설정
                footNode.transforms.gait = m4.translation(...legState.lerpEndOffset);
                footNode.updateLocalMatrix();

                // 디버그 로그 (첫 번째 다리만)
                if (legIndex === 0) {
                    console.log(`[Leg ${legIndex}] LERP COMPLETED! Final offset: [${legState.lerpEndOffset[0].toFixed(2)}, ${legState.lerpEndOffset[1].toFixed(2)}, ${legState.lerpEndOffset[2].toFixed(2)}]`);
                }
            }
        } else {
            // lerp 조건 확인 및 시작
            if (this.canStartLerp(legIndex) && distance > robotConfig.gait.maxFootDistance) {
                this.startLerp(legIndex, targetPos);
            }
        }
    }

    /**
     * 특정 다리가 lerp를 시작할 수 있는 상태인지 검사
     * @param {number} legIndex - 검사할 다리의 인덱스
     * @returns {boolean} - lerp 시작 가능 여부
     */
    canStartLerp(legIndex) {
        const legState = this.legStates[legIndex];

        // 다리가 지면에 있고 lerp 중이 아니며, tripod gait 조건을 만족할 때만 가능
        return legState.isGround && !legState.isLerping && this.canLegMoveInTripod(legIndex);
    }

    /**
     * tripod gait 규칙에 따라 특정 다리가 움직일 수 있는지 확인
     * @param {number} legIndex - 검사할 다리의 인덱스
     * @returns {boolean} - 움직일 수 있는지 여부
     */
    canLegMoveInTripod(legIndex) {
        // 현재 활성 그룹이 없으면 어느 그룹이든 움직일 수 있음
        if (this.activeGroup === null) {
            return true;
        }

        // 현재 활성 그룹에 속한 다리만 움직일 수 있음
        return this.tripodGroups[this.activeGroup].includes(legIndex);
    }

    /**
     * 특정 다리가 속한 tripod 그룹 반환
     * @param {number} legIndex - 다리 인덱스
     * @returns {string} - 'groupA' 또는 'groupB'
     */
    getLegGroup(legIndex) {
        if (this.tripodGroups.groupA.includes(legIndex)) {
            return 'groupA';
        } else {
            return 'groupB';
        }
    }

    /**
     * 현재 support phase인 다리 개수 확인
     * @returns {number} - support phase 다리 개수
     */
    getSupportLegCount() {
        return this.legStates.filter(state => state.phase === 'support').length;
    }

    /**
     * 특정 그룹의 모든 다리가 support phase인지 확인
     * @param {string} groupName - 'groupA' 또는 'groupB'
     * @returns {boolean} - 모든 다리가 support인지 여부
     */
    isGroupInSupport(groupName) {
        const groupLegs = this.tripodGroups[groupName];
        return groupLegs.every(legIndex => this.legStates[legIndex].phase === 'support');
    }

    /**
     * tripod gait 상태 업데이트
     */
    updateTripodState() {
        const groupAInSupport = this.isGroupInSupport('groupA');
        const groupBInSupport = this.isGroupInSupport('groupB');

        // 모든 다리가 support이면 활성 그룹 초기화
        if (groupAInSupport && groupBInSupport) {
            this.activeGroup = null;
        }

        // 디버그 로그
        console.log(`[Tripod] ActiveGroup: ${this.activeGroup}, GroupA_Support: ${groupAInSupport}, GroupB_Support: ${groupBInSupport}, Total_Support: ${this.getSupportLegCount()}`);
    }

    /**
     * 모든 다리의 상태를 반환 (디버깅용)
     * @returns {Array} - 각 다리의 상태 정보
     */
    getLegStates() {
        return this.legStates.map((state, index) => ({
            legIndex: index,
            isGround: state.isGround,
            isLerping: state.isLerping,
            canStartLerp: this.canStartLerp(index),
            lerpProgress: state.isLerping ? (state.lerpTime / robotConfig.gait.lerpDuration) : 0
        }));
    }

    /**
     * lerp 시작
     * @param {number} legIndex - 다리 인덱스
     * @param {Array} targetPos - 목표 월드 위치
     */
    startLerp(legIndex, targetPos) {
        const legState = this.legStates[legIndex];
        const footNode = this.footNodes[legIndex];

        // 현재 gait 오프셋 가져오기 (시작점)
        const currentGaitMatrix = footNode.transforms.gait;
        const currentOffset = [currentGaitMatrix[12], currentGaitMatrix[13], currentGaitMatrix[14]];

        // 목표 gait 오프셋 계산
        const initialPos = this.calculateInitialFootPosition(legIndex);
        const targetOffset = [
            targetPos[0] - initialPos[0],
            0 - initialPos[1], // y는 항상 0
            targetPos[2] - initialPos[2]
        ];

        // lerp 상태 설정
        legState.isLerping = true;
        legState.isGround = false;
        legState.phase = 'swing'; // swing phase로 변경
        legState.lerpTime = 0;
        legState.lerpStartOffset = [...currentOffset];
        legState.lerpEndOffset = [...targetOffset];

        // 활성 그룹 설정 (첫 번째 다리가 움직이기 시작할 때)
        if (this.activeGroup === null) {
            this.activeGroup = this.getLegGroup(legIndex);
        }

        // 디버그 로그 (첫 번째 다리만)
        if (legIndex === 0) {
            console.log(`[Leg ${legIndex}] ===== LERP STARTED =====`);
            console.log(`[Leg ${legIndex}] Group: ${this.getLegGroup(legIndex)}, ActiveGroup: ${this.activeGroup}`);
            console.log(`[Leg ${legIndex}] Phase: ${legState.phase}`);
            console.log(`[Leg ${legIndex}] Start offset: [${currentOffset[0].toFixed(2)}, ${currentOffset[1].toFixed(2)}, ${currentOffset[2].toFixed(2)}]`);
            console.log(`[Leg ${legIndex}] End offset: [${targetOffset[0].toFixed(2)}, ${targetOffset[1].toFixed(2)}, ${targetOffset[2].toFixed(2)}]`);
            console.log(`[Leg ${legIndex}] Duration: ${robotConfig.gait.lerpDuration}s, StepHeight: ${robotConfig.gait.stepHeight}`);
        }
    }

    /**
     * lerp 중간값 계산 (포물선 높이 포함)
     * @param {Array} startOffset - 시작 오프셋
     * @param {Array} endOffset - 끝 오프셋
     * @param {number} t - 진행률 (0~1)
     * @returns {Array} - 현재 오프셋
     */
    calculateLerpOffset(startOffset, endOffset, t) {
        // 선형 보간
        const x = startOffset[0] + (endOffset[0] - startOffset[0]) * t;
        const z = startOffset[2] + (endOffset[2] - startOffset[2]) * t;

        // 포물선 높이 (중간에 최대 높이)
        const heightCurve = 4 * t * (1 - t); // 0에서 1까지 포물선
        const baseY = startOffset[1] + (endOffset[1] - startOffset[1]) * t;
        const y = baseY + robotConfig.gait.stepHeight * heightCurve;

        return [x, y, z];
    }

    // scene에 footNode들과 footTargetNode들을 추가하는 헬퍼 메서드
    addNodesToScene(sceneRootNode, spiderRootNode) {
        // footNode들은 sceneRoot의 자식으로 추가
        this.footNodes.forEach(footNode => {
            sceneRootNode.addChild(footNode);
        });

        // footTargetNode들은 spiderRoot의 자식으로 추가
        this.footTargetNodes.forEach(footTargetNode => {
            spiderRootNode.addChild(footTargetNode);
        });
    }
}