"use strict";

import {initRenderer, renderScene} from "./scene/renderer.js";
import {createGround} from "./scene/worldInit.js";
import {raycast} from "./utils/raycast.js";
import {createBoxMesh} from './utils/meshUtils.js';
import {buildSpider} from "./robot/robot.js";
import {SceneNode} from "./scene/SceneNode.js";

let gl;
const eye = [5, 5, 5];
const at = [0, 0, 0];

const ground_size = 0
const ground_divisions = 20

let objOffset = [0.5, 0.5, 0.5];
let viewMatrix, projectionMatrix;
let legs = []; // legs를 전역으로 이동

let sceneRoot; // 전체 scene 트리의 루트

window.onload = async function init() {
    const canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas, null);
    if (!gl) {
        alert("Failed to load WebGL");
        return;
    }

    const {viewMatrix: vm, projectionMatrix: pm} = initRenderer(gl, eye, at);
    viewMatrix = vm;
    projectionMatrix = pm;

    gl.clearColor(0.2, 0.2, 0.2, 1.0);

    try {
        const groundMesh = createGround(gl, ground_size, ground_divisions);
        const groundNode = new SceneNode({name: "ground", mesh: groundMesh});

        const {root: spiderRoot, legs: spiderLegs} = buildSpider(gl, 1); 
        legs = spiderLegs;

        const controllerMesh = createBoxMesh(gl, [.1, .1, .1], [1, 0, 0]);
        const controllerNode = new SceneNode({name: "controller", mesh: controllerMesh});


        sceneRoot = new SceneNode({name: "sceneRoot"});
        sceneRoot.addChild(groundNode);
        sceneRoot.addChild(spiderRoot);
        sceneRoot.addChild(controllerNode);

        canvas.addEventListener("mousemove", e => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const hit = raycast(gl, x, y, viewMatrix, projectionMatrix, groundMesh);
            if (hit) {
                objOffset = hit.position;
                document.getElementById('controllerX').textContent = objOffset[0].toFixed(2);
                document.getElementById('controllerY').textContent = objOffset[1].toFixed(2);
                document.getElementById('controllerZ').textContent = objOffset[2].toFixed(2);
                
                // IK 계산을 여기서만 수행
                if (legs.length > 0 && legs[0].solveIK) {
                    legs[0].solveIK([objOffset[0], objOffset[1], objOffset[2]]);
                }
            }
        });

        function update() {
            sceneRoot.traverse(node => {
                node.updateLocalMatrix();
            });

            function computeWorld(node, parentMatrix) {
                node.worldMatrix = m4.multiply(parentMatrix, node.localMatrix);
                node.children.forEach(child => computeWorld(child, node.worldMatrix));
            }

            computeWorld(sceneRoot, m4.identity());
        }

        function render() {
            const [cx, cy, cz] = objOffset
            controllerNode.transforms.user = m4.translation(cx, cy, cz);

            update();
            renderScene(gl, sceneRoot);
            requestAnimationFrame(render);
        }

        requestAnimationFrame(render);
    } catch (error) {
        console.error("Failed to load .obj: ", error);
    }
};