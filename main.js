"use strict";

import { initRenderer, renderScene } from "./scene/renderer.js";
import { createGround } from "./scene/worldInit.js";
import { raycast } from "./utils/raycast.js";
import { createBoxMesh } from './utils/meshUtils.js';
import { Spider } from "./robot/Spider.js";
import { SceneNode } from "./scene/SceneNode.js";
import { TripodGait } from "./robot/gait.js";

let gl;
const eye = [5, 5, 5];
const at = [0, 0, 0];

const ground_size = 50
const ground_divisions = 20

let viewMatrix, projectionMatrix;

let sceneRootNode; // 전체 scene 트리의 루트

let cx, cy, cz; // controller 좌표
let controllerNode;

let spider;
let spiderRootNode;
let gait; // TripodGait 인스턴스
let lastTime = 0; // deltaTime 계산용
let debugLogTime = 0; // 디버그 로그 출력 간격 제어

window.onload = async function () {
    try {
        const canvas = initCanvas();
        gl = WebGLUtils.setupWebGL(canvas, null);
        if (!gl) {
            alert("Failed to load WebGL");
            return;
        }

        const { viewMatrix: vm, projectionMatrix: pm } = initRenderer(gl, eye, at);
        viewMatrix = vm;
        projectionMatrix = pm;

        gl.clearColor(0.2, 0.2, 0.2, 1.0);

        initScene(gl, canvas);
        lastTime = Date.now() / 1000; // 초기 시간 설정
        requestAnimationFrame(render);
    } catch (error) {
        console.error(error);
    }
};

function initCanvas() {
    return document.getElementById("gl-canvas");
}

// 처음에 실행되는 기능만 여기로
function initScene(gl, canvas) {
    sceneRootNode = new SceneNode({ name: "sceneRoot" });

    const groundMesh = createGround(gl, ground_size, ground_divisions);
    const groundNode = new SceneNode({
        name: "ground",
        mesh: groundMesh
    });

    // spiderRootNode와 body는 별개!! spiderRootNode 위치 확인: 노란색, body: 하얀색
    spider = new Spider(gl, 6);
    spiderRootNode = spider.root;

    // controller 자주색
    const controllerMesh = createBoxMesh(gl, [.1, .1, .1], [1, 0, 1]);
    controllerNode = new SceneNode({
        name: "controller",
        mesh: controllerMesh
    });
    sceneRootNode.addChild(groundNode);
    sceneRootNode.addChild(spiderRootNode);
    sceneRootNode.addChild(controllerNode);

    // TripodGait 초기화 및 노드들을 scene에 추가
    gait = new TripodGait(gl, spider);
    gait.addNodesToScene(sceneRootNode, spiderRootNode);

    userControl(canvas, groundMesh, controllerNode);
}

// user 마우스 컨트롤 (controller)
function userControl(canvas, groundMesh) {
    canvas.addEventListener("mousemove", e => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hit = raycast(gl, x, y, viewMatrix, projectionMatrix, groundMesh);
        if (hit) {
            [cx, cy, cz] = hit.position;
            document.getElementById('controllerX').textContent = cx.toFixed(2);
            document.getElementById('controllerY').textContent = cy.toFixed(2);
            document.getElementById('controllerZ').textContent = cz.toFixed(2);

            controllerNode.transforms.user = m4.translation(cx, cy, cz);
        }
    });
    requestAnimationFrame(render);
}

function updatePanel() {
    // spider 월드 좌표 반영 (임시)
    const spiderPos = spiderRootNode.getWorldPosition();
    document.getElementById('posX').textContent = spiderPos[0].toFixed(2);
    document.getElementById('posY').textContent = spiderPos[1].toFixed(2);
    document.getElementById('posZ').textContent = spiderPos[2].toFixed(2);

    // 첫 번째 다리의 각 관절 정보만 표시
    const leg = spider.legs[0];
    const names = ['coxa', 'femur', 'tibia'];
    const joints = [leg.coxaJoint, leg.femurJoint, leg.tibiaJoint];
    joints.forEach((joint, i) => {
        const m = joint.worldMatrix;
        const x = m[12], y = m[13], z = m[14];
        document.getElementById(`${names[i]}X`).textContent = x.toFixed(2);
        document.getElementById(`${names[i]}Y`).textContent = y.toFixed(2);
        document.getElementById(`${names[i]}Z`).textContent = z.toFixed(2);
        // 회전값 추출 (y, x, x 순서)
        let rad = 0;
        if (names[i] === 'coxa') {
            // y축 회전 추정
            rad = Math.atan2(m[8], m[0]);
        } else {
            // x축 회전 추정
            rad = Math.atan2(-m[9], m[5]);
        }
        document.getElementById(`${names[i]}R`).textContent = (rad * 180 / Math.PI).toFixed(1);
    });

    // foot(endPoint)의 world 좌표 표시
    if (leg.footEnd && typeof leg.footEnd.getWorldPosition === 'function') {
        const [x, y, z] = leg.footEnd.getWorldPosition();
        if (document.getElementById('footX')) {
            document.getElementById('footX').textContent = x.toFixed(2);
            document.getElementById('footY').textContent = y.toFixed(2);
            document.getElementById('footZ').textContent = z.toFixed(2);
        }
    }
}

// 실시간으로 적용되는 기능은 전부 여기로
function update() {
    // deltaTime 계산
    const currentTime = Date.now() / 1000; // 초 단위로 변환
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // 1. sceneRootNode의 localMatrix, worldMatrix를 먼저 갱신
    sceneRootNode.traverse(node => node.updateLocalMatrix());
    sceneRootNode.computeWorld();

    // 2. gait 업데이트 (footNode 위치 갱신)
    if (gait && controllerNode) {
        const controllerPosition = controllerNode.getWorldPosition();
        gait.update(deltaTime, controllerPosition);

        // 디버그: 1초마다 gait 상태 출력
        debugLogTime += deltaTime;
        if (debugLogTime > 1.0) {
            debugLogTime = 0;
            const gaitStatus = gait.getLegStates();
            console.log("=== GAIT STATUS ===");
            console.log(`Plan: ${gaitStatus.gaitPlan.currentPlan?.id || 'none'} (${gaitStatus.gaitPlan.currentPlan?.group || 'none'}), Queue: ${gaitStatus.gaitPlan.queueLength}, Active: ${gaitStatus.gaitPlan.activeGroup || 'none'}`);
            gaitStatus.legs.forEach(state => {
                console.log(`Leg ${state.legIndex} (${state.group}): Phase=${state.phase}, Ground=${state.isGround}, Lerping=${state.isLerping}, CanStart=${state.canStartLerp}, Progress=${(state.lerpProgress * 100).toFixed(1)}%`);
            });
            console.log("==================");
        }
    }

    // 3. spider.update(controllerNode)에서 solveIK로 각도 갱신 (worldMatrix 갱신 X)
    spider.update(controllerNode, deltaTime);

    // 4. spider 트리의 localMatrix만 갱신 (worldMatrix는 sceneRootNode에서 다시 갱신)
    spider.root.traverse(node => node.updateLocalMatrix());

    // 5. 마지막에 sceneRootNode.computeWorld()로 전체 트리 worldMatrix 갱신
    sceneRootNode.computeWorld();
}

function render() {
    update();
    renderScene(gl, sceneRootNode);
    updatePanel();
    requestAnimationFrame(render);
}
