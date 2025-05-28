"use strict";

import {initRenderer, renderScene} from "./scene/renderer.js";
import {createGround} from "./scene/worldInit.js";
import {raycast} from "./utils/raycast.js";
import {createBoxMesh} from './utils/meshUtils.js';
import {Spider} from "./robot/Spider.js";
import {SceneNode} from "./scene/SceneNode.js";
import {TripodGait} from "./robot/gait.js";

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
let spiderHeight = 0.4;
let spiderYaw = 0;

let gait;
let lastTime = performance.now();

// gait 타겟 시각화용 노드 배열
let gaitTargetNodes = [];

window.onload = async function () {
    try {
        const canvas = initCanvas();
        gl = WebGLUtils.setupWebGL(canvas, null);
        if (!gl) {
            alert("Failed to load WebGL");
            return;
        }

        const {viewMatrix: vm, projectionMatrix: pm} = initRenderer(gl, eye, at);
        viewMatrix = vm;
        projectionMatrix = pm;

        gl.clearColor(0.2, 0.2, 0.2, 1.0);

        initScene(gl, canvas);
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
    sceneRootNode = new SceneNode({name: "sceneRoot"});

    const groundMesh = createGround(gl, ground_size, ground_divisions);
    const groundNode = new SceneNode({
        name: "ground",
        mesh: groundMesh
    });

    // spiderRootNode와 body는 별개!! spiderRootNode 위치 확인: 노란색, body: 하얀색
    spider = new Spider(gl, 6);
    spiderRootNode = spider.root;

    const controllerMesh = createBoxMesh(gl, [.1, .1, .1], [1, 0, 0]);
    controllerNode = new SceneNode({
        name: "controller",
        mesh: controllerMesh
    });

    sceneRootNode.addChild(groundNode);
    sceneRootNode.addChild(spiderRootNode);
    sceneRootNode.addChild(controllerNode);

    // gait 타겟 시각화용 노드 생성 및 추가
    gaitTargetNodes = [];
    for (let i = 0; i < 6; i++) {
        const mesh = createBoxMesh(gl, [0.1, 0.1, 0.1], [0, 1, 1]); // 작은 청록색 박스
        const node = new SceneNode({
            name: `gaitTarget${i}`,
            mesh: mesh
        });
        gaitTargetNodes.push(node);
        sceneRootNode.addChild(node);
    }

    // 거미 높이를 월드 바닥에 닿게 올렸습니다 05.27
    spiderRootNode.transforms.user = m4.translation(0, 0.9, 0);

    // TripodGait 초기화
    // body 기준 각 다리의 base 위치 계산
    const legBasePositions = [];
    const R = 0.9; // gait 타겟 반지름
    const stepLength = 0.5;
    const stepHeight = 0.2;
    const stepForward = 0.1;
    for (let i = 0; i < 6; i++) {
        let theta = i * 2 * Math.PI / 6;
    
        if(i == 0 || i == 3) {
            theta = +theta;
        }
        else {
            theta = -theta;
        }
        

        legBasePositions.push([R * Math.cos(theta), 0, R * Math.sin(theta)]);
    }
    gait = new TripodGait(6, [0, 0.4, 0], legBasePositions, stepLength, stepHeight, 1.0, stepForward);

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

/* index.html에 실시간 디버그 내용 반영
function updatePanel() {
    // spider 월드 좌표 반영
    const spiderPos = spiderRootNode.getWorldPosition();

    document.getElementById('rotY').textContent = spider.yaw.toFixed(2);
    document.getElementById('posX').textContent = spiderPos[0].toFixed(2);
    document.getElementById('posY').textContent = spiderPos[1].toFixed(2);
    document.getElementById('posZ').textContent = spiderPos[2].toFixed(2);

    // Joint 월드 좌표 반영
    spider.legs.forEach(leg => {
        const names = ["coxa", "femur", "tibia"];
        const joints = [
            leg.coxaJoint,
            leg.femurJoint,
            leg.tibiaJoint
        ];
        joints.forEach((joint, i) => {
            const m = joint.worldMatrix;
            const x = m[12], y = m[13], z = m[14];
            document.getElementById(`${names[i]}X`).textContent = x.toFixed(2);
            document.getElementById(`${names[i]}Y`).textContent = y.toFixed(2);
            document.getElementById(`${names[i]}Z`).textContent = z.toFixed(2);
        });
    })
}*/

// 실시간으로 적용되는 기능은 전부 여기로
function update() {
    sceneRootNode.traverse(node => node.updateLocalMatrix());
    sceneRootNode.computeWorld();

    let spiderPos = spiderRootNode.getWorldPosition();
    if (!spiderPos || spiderPos.some(v => isNaN(v))) {
        spiderPos = [0, spiderHeight, 0];
    }

    let targetPos = [cx, cy, cz];
    if (!targetPos || targetPos.some(v => isNaN(v))) {
        targetPos = [0, spiderHeight, 0];
    }

    const dx = targetPos[0] - spiderPos[0];
    const dz = targetPos[2] - spiderPos[2];
    const dist = Math.sqrt(dx * dx + dz * dz);

    // TripodGait 업데이트 및 각 다리별 타겟 계산
    const now = performance.now();
    let dt = (now - lastTime) / 1000;
    lastTime = now;

    // 거리 기반 gait 활성화 및 이동
    let gaitSpeedScale = 1.0;
    if (dist > 0.05) {
        const speed = 0.005;
        const dir = [dx / dist, 0, dz / dist];
        const newPos = [
            spiderPos[0] + dir[0] * speed,
            spiderHeight,
            spiderPos[2] + dir[2] * speed
        ];

        // 부드러운 회전
        const targetYaw = Math.atan2(dir[0], dir[2]);
        let deltaYaw = targetYaw - spiderYaw;

        // [-π, π] 범위로 클램핑
        deltaYaw = ((deltaYaw + Math.PI) % (2 * Math.PI)) - Math.PI;

        const maxTurn = 0.05; // 프레임당 최대 회전 각도
        const turn = Math.max(-maxTurn, Math.min(maxTurn, deltaYaw));
        spiderYaw += turn;

        let transform = m4.multiply(m4.translation(...newPos), m4.yRotation(spiderYaw));
        spiderRootNode.transforms.user = transform;
    } else {
        // 정지 상태에서는 gait 속도 감쇠
        gaitSpeedScale = 0;
    }

    dt *= gaitSpeedScale;

    const gaitParamsList = gait.update(dt, spiderPos, spiderYaw);
    spider.update(gaitParamsList);

    // gait 타겟 시각화 노드 위치 갱신
    for (let i = 0; i < gaitTargetNodes.length; i++) {
        const pos = gaitParamsList[i].targetPosition;
        gaitTargetNodes[i].transforms.user = m4.translation(pos[0], pos[1], pos[2]);
    }
}

function render() {
    update();
    renderScene(gl, sceneRootNode);
    requestAnimationFrame(render);
}