"use strict";

import { loadOBJ } from "./utils/modelLoader.js";
import { initRenderer, renderScene } from "./scene/renderer.js";
import {createGround} from "./scene/worldInit.js";

let gl;
const eye = [10, 10, 10];
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

    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    const result = initRenderer(gl, program, eye, at);
    viewMatrix = result.viewMatrix;
    projectionMatrix = result.projectionMatrix;

    gl.clearColor(0.2, 0.2, 0.2, 1.0);

    try {
        const ground = createGround(gl);
        const spider = await loadOBJ(gl, "./assets/models/spider.obj");
        spider.forEach(mesh => {
            mesh.name = 'spider';
            mesh.transform = m4.scaling(.3, .3, .3);
        });
        const meshes = [ground, ...spider];

        function animationLoop(now) {
            const timeInSeconds = now * 0.001;
            renderScene(gl, meshes, timeInSeconds, objOffset);
            requestAnimationFrame(animationLoop);
        }
        requestAnimationFrame(animationLoop);
    } catch (error) {
        console.error("Failed to load .obj: ", error);
    }
};