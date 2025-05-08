"use strict";

import { loadOBJ } from "./utils/modelLoader.js";
import { initRenderer, renderScene } from "./scene/renderer.js";
import {createGround} from "./scene/worldInit.js";
import {raycast} from "./utils/raycast.js";

let gl;
const eye = [100, 100, 100];
const at = [0, 0, 0];

let objOffset = [0, 0, 0];
let viewMatrix, projectionMatrix;

window.onload = async function init() {
    const canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("Failed to load WebGL");
        return;
    }

    const {viewMatrix: vm, projectionMatrix: pm} = initRenderer(gl, eye, at);
    viewMatrix = vm;
    projectionMatrix = pm;

    gl.clearColor(0.2, 0.2, 0.2, 1.0);

    try {
        const ground = createGround(gl);
        const spider = await loadOBJ(gl, "./assets/models/spider.obj");
        spider.forEach(mesh => {
            mesh.name = 'spider';
            mesh.transform = m4.scaling(.3, .3, .3);
        });
        // Scene graph setup
        const scene = {
            meshes: [],
            addMesh(mesh) {
                this.meshes.push(mesh);
            }
        };
        scene.addMesh(ground);
        spider.forEach(mesh => scene.addMesh(mesh));

        // Mouse raycast -> update objOffset
        canvas.addEventListener("mousemove", e => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const hit = raycast(gl, x, y, viewMatrix, projectionMatrix, ground);
            if (hit) {
                objOffset = hit.position;
                // Update controller coordinate display
                document.getElementById('controllerX').textContent = hit.position[0].toFixed(2);
                document.getElementById('controllerY').textContent = hit.position[1].toFixed(2);
                document.getElementById('controllerZ').textContent = hit.position[2].toFixed(2);
            }
        });

        function animationLoop(now) {
            const timeInSeconds = now * 0.001;
            renderScene(gl, scene, timeInSeconds, objOffset);
            requestAnimationFrame(animationLoop);
        }
        requestAnimationFrame(animationLoop);
    } catch (error) {
        console.error("Failed to load .obj: ", error);
    }
};