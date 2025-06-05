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

let shadowFramebuffer, shadowTexture, lightViewMatrix, lightProjectionMatrix;
const SHADOW_MAP_SIZE = 10000;

window.onload = async function () {
    try {
        const canvas = initCanvas();
        gl = WebGLUtils.setupWebGL(canvas, null);
        if (!gl) {
            alert("Failed to load WebGL");
            return;
        }

        // Shadow map 리소스 생성
        shadowFramebuffer = gl.createFramebuffer();
        shadowTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, shadowTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shadowTexture, 0);

        const depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        // Light 시점 행렬 (직교 투영)
        lightViewMatrix = m4.lookAt([0, 0, 0], [10, 10, 10], [0, 0, 1]);
        const halfGround = groundSize / 2;
        lightProjectionMatrix = m4.orthographic(
            -halfGround, halfGround,   // left, right
            -halfGround, halfGround,   // bottom, top
            -10, 50                    // near, far (y축 기준, ground와 spider가 모두 포함되도록)
        );

        const { viewMatrix: vm, projectionMatrix: pm } = initRenderer(gl, eye, at);
        viewMatrix = vm;
        projectionMatrix = pm;

        gl.clearColor(1, 1, 1, 1.0);

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

// function drawShadowMapDebug(gl, shadowTexture) {
//     if (!drawShadowMapDebug.program) {
//         const vsSource = `
//             attribute vec2 aPosition;
//             varying vec2 vTexCoord;
//             void main() {
//                 vTexCoord = aPosition * 0.5 + 0.5;
//                 gl_Position = vec4(aPosition, 0, 1);
//             }
//         `;
//         const fsSource = `
//             precision mediump float;
//             varying vec2 vTexCoord;
//             uniform sampler2D uTexture;
//             void main() {
//                 float d = texture2D(uTexture, vTexCoord).r;
//                 gl_FragColor = vec4(d, d, d, 1.0);
//             }
//         `;
//         function compileShader(gl, src, type) {
//             const s = gl.createShader(type);
//             gl.shaderSource(s, src);
//             gl.compileShader(s);
//             return s;
//         }
//         const vs = compileShader(gl, vsSource, gl.VERTEX_SHADER);
//         const fs = compileShader(gl, fsSource, gl.FRAGMENT_SHADER);
//         const prog = gl.createProgram();
//         gl.attachShader(prog, vs);
//         gl.attachShader(prog, fs);
//         gl.linkProgram(prog);
//         drawShadowMapDebug.program = prog;
//         drawShadowMapDebug.aPosition = gl.getAttribLocation(prog, 'aPosition');
//         drawShadowMapDebug.uTexture = gl.getUniformLocation(prog, 'uTexture');
//         // fullscreen quad
//         drawShadowMapDebug.buffer = gl.createBuffer();
//         gl.bindBuffer(gl.ARRAY_BUFFER, drawShadowMapDebug.buffer);
//         gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
//             -1, -1, 1, -1, -1, 1, 1, 1
//         ]), gl.STATIC_DRAW);
//     }
//     // viewport를 우측 하단 작은 사각형으로 설정
//     const size = 200;
//     gl.viewport(gl.drawingBufferWidth - size, 0, size, size);
//     gl.useProgram(drawShadowMapDebug.program);
//     gl.bindBuffer(gl.ARRAY_BUFFER, drawShadowMapDebug.buffer);
//     gl.enableVertexAttribArray(drawShadowMapDebug.aPosition);
//     gl.vertexAttribPointer(drawShadowMapDebug.aPosition, 2, gl.FLOAT, false, 0, 0);
//     gl.activeTexture(gl.TEXTURE0);
//     gl.bindTexture(gl.TEXTURE_2D, shadowTexture);
//     gl.uniform1i(drawShadowMapDebug.uTexture, 0);
//     gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
//     // viewport 원래대로 복구는 renderScene에서 다시 설정됨
// }

function render() {
    update();

    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowFramebuffer);
    gl.viewport(0, 0, SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    gl.clearColor(1, 1, 1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.CULL_FACE);
    renderSpiderForShadow(gl, spiderRootNode, lightViewMatrix, lightProjectionMatrix);
    gl.enable(gl.CULL_FACE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // camera 시점에서 전체 scene 렌더, groundMesh에 shadow map 적용
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    renderScene(gl, sceneRootNode, {
        shadowTexture,
        lightViewMatrix,
        lightProjectionMatrix,
        shadowBias: 0.006
    });


    // shadow map 시각화
    // drawShadowMapDebug(gl, shadowTexture);


    updatePanel();
    requestAnimationFrame(render);
}

// spider shadow map으로 렌더
function renderSpiderForShadow(gl, rootNode, lightView, lightProj) {
    renderScene(gl, sceneRootNode, {
        shadowPass: true,
        lightViewMatrix: lightView,
        lightProjectionMatrix: lightProj
    });
}
