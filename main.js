"use strict";

import {initRenderer, renderScene} from "./scene/renderer.js";
import {SceneNode} from "./scene/SceneNode.js";
import {createGround} from "./scene/worldInit.js";
import {buildSpider} from "./robot/robot.js";
import {raycast} from "./utils/raycast.js";
import * as gait from "./robot/gait.js";
import * as ik from "./robot/ik.js";
import config from "./robot/robotConfig.js";
import {createBoxMesh} from "./utils/meshUtils.js";

let gl;
const eye = [10, 10, 10];
const at = [0, 0, 0];

const ground_size = 100
const ground_divisions = 20

let objOffset = [0, 0, 0];
let viewMatrix, projectionMatrix;

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
        const spiderRoot = await buildSpider(gl);

        const sceneRoot = new SceneNode({name: "root"});
        const groundNode = new SceneNode({
            name: "ground",
            mesh: groundMesh,
            pivot: [0, 0, 0],
            localMatrix: m4.identity()
        });
        const controller = new SceneNode({
            name: "controller",
            mesh: createBoxMesh(gl, [0.1, 0.1, 0.1]),
            pivot: [0, 0, 0],
            localMatrix: m4.identity()
        })

        sceneRoot.addChild(groundNode);
        sceneRoot.addChild(spiderRoot);
        sceneRoot.addChild(controller);

        canvas.addEventListener("mousemove", e => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const hit = raycast(gl, x, y, viewMatrix, projectionMatrix, groundMesh);
            if (hit) {
                objOffset = hit.position;
                document.getElementById('controllerX').textContent = hit.position[0].toFixed(2);
                document.getElementById('controllerY').textContent = hit.position[1].toFixed(2);
                document.getElementById('controllerZ').textContent = hit.position[2].toFixed(2);
            }
        });

        function update(time) {
            // Spider lookAt (yaw-only)
            const [cx, , cz] = objOffset;
            const yaw = Math.atan2(cx, cz);
            spiderRoot.localMatrix = m4.multiply(
                m4.translation(0, 2, 0),
                m4.yRotation(yaw),
                m4.scaling(config.scale, config.scale, config.scale),
            );

            // Controller
            controller.localMatrix = m4.translation(cx, 0, cz);

            // Tripod gait and IK
            const footTargets = gait.calculate(time);
            ik.solve(spiderRoot, footTargets);

            // Update the scene graph
            sceneRoot.updateWorldMatrix();
        }

        function loop(now) {
            const t = now * 0.001;
            update(t);
            renderScene(gl, sceneRoot);
            requestAnimationFrame(loop);
        }

        requestAnimationFrame(loop);
    } catch (error) {
        console.error("Failed to load .obj: ", error);
    }
};