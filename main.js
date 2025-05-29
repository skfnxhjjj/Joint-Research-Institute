"use strict";

import { initRenderer, renderScene } from "./scene/renderer.js";
import { createGround } from "./scene/worldInit.js";
import { raycast } from "./utils/raycast.js";
import { createBoxMesh } from './utils/meshUtils.js';
import { Spider } from "./robot/Spider.js";
import { SceneNode } from "./scene/SceneNode.js";
import { TripodGait } from "./robot/gait.js";
import { robotConfig } from "./robot/robotConfig.js";

let gl;
const eye = [5, 5, 5];
const at = [0, 0, 0];

const groundSize = 50;
const groundDivisions = 20;

let viewMatrix, projectionMatrix;

let sceneRootNode;
let cx, cy, cz;
let controllerNode;
let spider;
let spiderRootNode;
let gait;
let lastTime = 0;

let debugMode = true;

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
        lastTime = Date.now() / 1000;
        requestAnimationFrame(render);
    } catch (error) {
        console.error(error);
    }
};

function initCanvas() {
    return document.getElementById("gl-canvas");
}

function initScene(gl, canvas) {
    sceneRootNode = new SceneNode({ name: "sceneRoot" });

    const groundMesh = createGround(gl, groundSize, groundDivisions);
    const groundNode = new SceneNode({
        name: "ground",
        mesh: groundMesh
    });

    spider = new Spider(gl, 6);
    spiderRootNode = spider.root;

    const controllerMesh = createBoxMesh(gl, robotConfig.debug.controller.size, robotConfig.debug.controller.color);
    controllerNode = new SceneNode({
        name: "controller",
        mesh: controllerMesh
    });

    sceneRootNode.addChild(groundNode);
    sceneRootNode.addChild(spiderRootNode);
    sceneRootNode.addChild(controllerNode);

    gait = new TripodGait(gl, spider);
    gait.addNodesToScene(sceneRootNode, spiderRootNode);

    setDebugVisibility(debugMode);

    userControl(canvas, groundMesh, controllerNode);
}

function userControl(canvas, groundMesh, controllerNode) {
    canvas.addEventListener("click", e => {
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

    const groundHeightSlider = document.getElementById('groundHeightSlider');
    const groundHeightValue = document.getElementById('groundHeightValue');

    groundHeightSlider.addEventListener('input', (e) => {
        const newHeight = parseFloat(e.target.value);
        robotConfig.body.groundHeight = newHeight;
        groundHeightValue.textContent = newHeight.toFixed(1);

        // Update spider's current and target positions
        spider.currentPosition[1] = newHeight;
        spider.targetPosition[1] = newHeight;
        spider.updateTransform();
    });

    const debugToggle = document.getElementById('debugToggle');
    debugToggle.addEventListener('change', (e) => {
        debugMode = e.target.checked;
        setDebugVisibility(debugMode);
        console.log("Debug mode:", debugMode ? "enabled" : "disabled");
    });
}

function setDebugVisibility(visible) {
    if (controllerNode) {
        controllerNode.visible = visible;
    }

    if (spider && spider.debugRootNode) {
        spider.debugRootNode.visible = visible;
    }

    if (gait) {
        gait.footNodes.forEach(footNode => {
            footNode.visible = visible;
        });
        gait.footTargetNodes.forEach(footTargetNode => {
            footTargetNode.visible = visible;
        });
    }
}

function updatePanel() {
    const spiderPos = spiderRootNode.getWorldPosition();
    document.getElementById('posX').textContent = spiderPos[0].toFixed(2);
    document.getElementById('posY').textContent = spiderPos[1].toFixed(2);
    document.getElementById('posZ').textContent = spiderPos[2].toFixed(2);

    // Update robot yaw value
    const yawDegrees = (spider.currentRotation * 180 / Math.PI).toFixed(1);
    document.getElementById('yaw').textContent = yawDegrees;

    const leg = spider.legs[0];
    const names = ['coxa', 'femur', 'tibia'];
    const joints = [leg.coxaJoint, leg.femurJoint, leg.tibiaJoint];
    joints.forEach((joint, i) => {
        const m = joint.worldMatrix;
        const x = m[12], y = m[13], z = m[14];
        document.getElementById(`${names[i]}X`).textContent = x.toFixed(2);
        document.getElementById(`${names[i]}Y`).textContent = y.toFixed(2);
        document.getElementById(`${names[i]}Z`).textContent = z.toFixed(2);

        let rad = 0;
        if (names[i] === 'coxa') {
            rad = Math.atan2(m[8], m[0]);
        } else {
            rad = Math.atan2(-m[9], m[5]);
        }
        document.getElementById(`${names[i]}R`).textContent = (rad * 180 / Math.PI).toFixed(1);
    });

    if (leg.footEnd && typeof leg.footEnd.getWorldPosition === 'function') {
        const [x, y, z] = leg.footEnd.getWorldPosition();
        if (document.getElementById('footX')) {
            document.getElementById('footX').textContent = x.toFixed(2);
            document.getElementById('footY').textContent = y.toFixed(2);
            document.getElementById('footZ').textContent = z.toFixed(2);
        }
    }
}

function update() {
    const currentTime = Date.now() / 1000;
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    sceneRootNode.traverse(node => node.updateLocalMatrix());
    sceneRootNode.computeWorld();

    if (gait && controllerNode) {
        const controllerPosition = controllerNode.getWorldPosition();
        gait.update(deltaTime, controllerPosition);
    }

    spider.update(controllerNode, deltaTime);
    spider.root.traverse(node => node.updateLocalMatrix());
    sceneRootNode.computeWorld();
}

function render() {
    update();
    renderScene(gl, sceneRootNode);
    updatePanel();
    requestAnimationFrame(render);
}
