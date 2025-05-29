import { SceneNode } from '../scene/SceneNode.js';
import { createBoxMesh } from '../utils/meshUtils.js';
import { robotConfig } from './robotConfig.js';

export class TripodGait {
    constructor(gl, spider) {
        this.gl = gl;
        this.spider = spider;

        this.footNodes = []; // IK target nodes
        this.footTargetNodes = []; // Future position nodes
        this.legStates = []; // Lerp state management

        // Tripod gait groups
        this.tripodGroups = {
            groupA: [0, 2, 4], // 우전, 좌중, 우후
            groupB: [1, 3, 5]  // 좌전, 우중, 좌후
        };

        this.activeGroup = null;
        this.gaitQueue = [];
        this.currentPlan = null;
        this.planIdCounter = 0;

        this.initializeGait();
    }

    initializeGait() {
        const numLegs = this.spider.legs.length;

        // Initialize leg states
        for (let i = 0; i < numLegs; i++) {
            this.legStates.push({
                isGround: true,
                isLerping: false,
                lerpTime: 0,
                lerpStartOffset: [0, 0, 0],
                lerpEndOffset: [0, 0, 0],
                phase: 'support'
            });
        }

        // Create foot nodes (yellow - IK targets)
        for (let i = 0; i < numLegs; i++) {
            const footNode = new SceneNode({
                name: `foot_${i}`,
                mesh: createBoxMesh(this.gl, robotConfig.debug.foot.size, robotConfig.debug.foot.color),
                visible: true
            });

            const initialPos = this.calculateInitialFootPosition(i);
            footNode.transforms.base = m4.translation(...initialPos);
            footNode.transforms.gait = m4.identity();

            this.footNodes.push(footNode);
            this.spider.legs[i].foot = footNode;
        }

        // Create foot target nodes (cyan - future positions)
        for (let i = 0; i < numLegs; i++) {
            const footTargetNode = new SceneNode({
                name: `footTarget_${i}`,
                mesh: createBoxMesh(this.gl, robotConfig.debug.footTarget.size, robotConfig.debug.footTarget.color),
                visible: true
            });

            const initialPos = this.calculateInitialFootPosition(i);
            footTargetNode.transforms.base = m4.translation(...initialPos);

            this.footTargetNodes.push(footTargetNode);
        }
    }

    calculateInitialFootPosition(legIndex) {
        const [x, , z] = robotConfig.body.size;

        const footPosition = [
            [x, 0, z - 0.1],
            [x * 1.8, 0, 0.1],
            [x, 0, -z + 0.2],
            [-x, 0, z - 0.1],
            [-x * 1.8, 0, 0.1],
            [-x, 0, -z + 0.2]
        ]

        return footPosition[legIndex];
    }

    update(deltaTime, controllerPosition) {
        // Keep footTargetNodes at ground level
        this.footTargetNodes.forEach(footTargetNode => {
            const spiderWorldPos = this.spider.root.getWorldPosition();
            const yOffset = - spiderWorldPos[1];
            footTargetNode.transforms.user = m4.translation(0, yOffset, 0);
        });

        this.planMovements();
        this.updateTripodState();

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

        const distance = Math.sqrt(
            Math.pow(targetPos[0] - footPos[0], 2) +
            Math.pow(targetPos[2] - footPos[2], 2)
        );

        if (legState.isLerping) {
            legState.lerpTime += deltaTime;
            const t = Math.min(legState.lerpTime / robotConfig.gait.lerpDuration, 1.0);

            const currentOffset = this.calculateLerpOffset(
                legState.lerpStartOffset,
                legState.lerpEndOffset,
                t
            );

            footNode.transforms.gait = m4.translation(...currentOffset);
            footNode.updateLocalMatrix();

            if (t >= 1.0) {
                legState.isLerping = false;
                legState.isGround = true;
                legState.phase = 'support';
                legState.lerpTime = 0;

                footNode.transforms.gait = m4.translation(...legState.lerpEndOffset);
                footNode.updateLocalMatrix();
            }
        } else {
            if (this.canStartLerp(legIndex) && distance > robotConfig.gait.maxFootDistance) {
                this.startLerp(legIndex, targetPos);
            }
        }
    }

    canStartLerp(legIndex) {
        const legState = this.legStates[legIndex];
        return legState.isGround && !legState.isLerping && this.canLegMoveInTripod(legIndex);
    }

    canLegMoveInTripod(legIndex) {
        if (this.activeGroup === null) {
            return true;
        }
        return this.tripodGroups[this.activeGroup].includes(legIndex);
    }

    getLegGroup(legIndex) {
        if (this.tripodGroups.groupA.includes(legIndex)) {
            return 'groupA';
        } else {
            return 'groupB';
        }
    }

    getSupportLegCount() {
        return this.legStates.filter(state => state.phase === 'support').length;
    }

    isGroupInSupport(groupName) {
        const groupLegs = this.tripodGroups[groupName];
        return groupLegs.every(legIndex => this.legStates[legIndex].phase === 'support');
    }

    updateTripodState() {
        const groupAInSupport = this.isGroupInSupport('groupA');
        const groupBInSupport = this.isGroupInSupport('groupB');

        if (this.currentPlan && this.isPlanCompleted(this.currentPlan)) {
            this.currentPlan = null;
            this.activeGroup = null;
        }

        if (!this.currentPlan && this.gaitQueue.length > 0) {
            this.currentPlan = this.gaitQueue.shift();
            this.activeGroup = this.currentPlan.group;
        }
    }

    createGaitPlan(groupName, legTargets) {
        const plan = {
            id: ++this.planIdCounter,
            group: groupName,
            targets: legTargets,
            createdAt: Date.now()
        };

        this.gaitQueue.push(plan);
        return plan;
    }

    isPlanCompleted(plan) {
        const groupLegs = this.tripodGroups[plan.group];
        return groupLegs.every(legIndex => {
            const legState = this.legStates[legIndex];
            return legState.phase === 'support' && !legState.isLerping;
        });
    }

    planGroupMovement(groupName) {
        const groupLegs = this.tripodGroups[groupName];
        const legTargets = [];

        groupLegs.forEach(legIndex => {
            const footNode = this.footNodes[legIndex];
            const footTargetNode = this.footTargetNodes[legIndex];
            const footPos = footNode.getWorldPosition();
            const targetPos = footTargetNode.getWorldPosition();

            const distance = Math.sqrt(
                Math.pow(targetPos[0] - footPos[0], 2) +
                Math.pow(targetPos[2] - footPos[2], 2)
            );

            if (distance > robotConfig.gait.maxFootDistance) {
                legTargets.push({
                    legIndex: legIndex,
                    targetPos: [targetPos[0], targetPos[1], targetPos[2]]
                });
            }
        });

        if (legTargets.length > 0) {
            this.createGaitPlan(groupName, legTargets);
        }
    }

    getLegStates() {
        const legStates = this.legStates.map((state, index) => ({
            legIndex: index,
            group: this.getLegGroup(index),
            phase: state.phase,
            isGround: state.isGround,
            isLerping: state.isLerping,
            canStartLerp: this.canStartLerp(index),
            lerpProgress: state.isLerping ? (state.lerpTime / robotConfig.gait.lerpDuration) : 0
        }));

        return {
            legs: legStates,
            gaitPlan: {
                currentPlan: this.currentPlan ? {
                    id: this.currentPlan.id,
                    group: this.currentPlan.group,
                    targetCount: this.currentPlan.targets.length
                } : null,
                queueLength: this.gaitQueue.length,
                activeGroup: this.activeGroup
            }
        };
    }

    startLerp(legIndex, targetPos) {
        const legState = this.legStates[legIndex];
        const footNode = this.footNodes[legIndex];

        const currentGaitMatrix = footNode.transforms.gait;
        const currentOffset = [currentGaitMatrix[12], currentGaitMatrix[13], currentGaitMatrix[14]];

        const initialPos = this.calculateInitialFootPosition(legIndex);
        const targetOffset = [
            targetPos[0] - initialPos[0],
            0 - initialPos[1],
            targetPos[2] - initialPos[2]
        ];

        legState.isLerping = true;
        legState.isGround = false;
        legState.phase = 'swing';
        legState.lerpTime = 0;
        legState.lerpStartOffset = [...currentOffset];
        legState.lerpEndOffset = [...targetOffset];

        if (this.activeGroup === null) {
            this.activeGroup = this.getLegGroup(legIndex);
        }
    }

    calculateLerpOffset(startOffset, endOffset, t) {
        const x = startOffset[0] + (endOffset[0] - startOffset[0]) * t;
        const z = startOffset[2] + (endOffset[2] - startOffset[2]) * t;

        const heightCurve = 4 * t * (1 - t);
        const baseY = startOffset[1] + (endOffset[1] - startOffset[1]) * t;
        const y = baseY + robotConfig.gait.stepHeight * heightCurve;

        return [x, y, z];
    }

    addNodesToScene(sceneRootNode, spiderRootNode) {
        this.footNodes.forEach(footNode => {
            sceneRootNode.addChild(footNode);
        });

        this.footTargetNodes.forEach(footTargetNode => {
            spiderRootNode.addChild(footTargetNode);
        });
    }

    planMovements() {
        if (this.currentPlan || this.gaitQueue.length > 0) {
            return;
        }

        const groupANeedsMovement = this.groupNeedsMovement('groupA');
        const groupBNeedsMovement = this.groupNeedsMovement('groupB');

        if (groupANeedsMovement && groupBNeedsMovement) {
            this.planGroupMovement('groupA');
            this.planGroupMovement('groupB');
        } else if (groupANeedsMovement) {
            this.planGroupMovement('groupA');
        } else if (groupBNeedsMovement) {
            this.planGroupMovement('groupB');
        }
    }

    groupNeedsMovement(groupName) {
        const groupLegs = this.tripodGroups[groupName];

        return groupLegs.some(legIndex => {
            const footNode = this.footNodes[legIndex];
            const footTargetNode = this.footTargetNodes[legIndex];
            const footPos = footNode.getWorldPosition();
            const targetPos = footTargetNode.getWorldPosition();

            const distance = Math.sqrt(
                Math.pow(targetPos[0] - footPos[0], 2) +
                Math.pow(targetPos[2] - footPos[2], 2)
            );

            return distance > robotConfig.gait.maxFootDistance;
        });
    }
}