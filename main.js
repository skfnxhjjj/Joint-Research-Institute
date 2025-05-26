"use strict";

import {initRenderer, renderScene} from "./scene/renderer.js";
import {createGround} from "./scene/worldInit.js";
import {raycast} from "./utils/raycast.js";
import {createBoxMesh} from './utils/meshUtils.js';
import {Spider} from "./robot/Spider.js";
import {SceneNode} from "./scene/SceneNode.js";

let gl;
const eye = [5, 5, 5];
const at = [0, 0, 0];

const ground_size = 0
const ground_divisions = 20

let viewMatrix, projectionMatrix;

let sceneRootNode; // 전체 scene 트리의 루트

let cx, cy, cz; // controller 좌표
let controllerNode;

let spider;
let spiderRootNode;

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

    const controllerMesh = createBoxMesh(gl, [.1, .1, .1], [1, 1, 1]);
    controllerNode = new SceneNode({
        name: "controller",
        mesh: controllerMesh
    });

    sceneRootNode.addChild(groundNode);
    sceneRootNode.addChild(spiderRootNode);
    sceneRootNode.addChild(controllerNode);

    // 거미 높이를 월드 바닥에 닿게 올렸습니다 05.27
    spiderRootNode.transforms.user = m4.translation(0, 0.4, 0);

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
    spider.update([1, 0, 0]);
    //updatePanel();
}

function render() {
    update();
    renderScene(gl, sceneRootNode);
    requestAnimationFrame(render);
}