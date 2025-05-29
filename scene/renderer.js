let meshProgramInfo;
let viewMatrix;
let projectionMatrix;
let shadowProgramInfo;

// Matrix stack for hierarchical rendering
let matrixStack = [];

export function initRenderer(gl, eye, at) {
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    meshProgramInfo = {
        program,
        attribLocations: {
            a_position: gl.getAttribLocation(program, "a_position"),
            a_normal: gl.getAttribLocation(program, "a_normal"),
            a_texcoord: gl.getAttribLocation(program, "a_texcoord"),
            a_color: gl.getAttribLocation(program, "a_color"),
        },
        uniformLocations: {
            u_world: gl.getUniformLocation(program, "uWorld"),
            u_view: gl.getUniformLocation(program, "uView"),
            u_projection: gl.getUniformLocation(program, "uProjection"),
            u_lightDirection: gl.getUniformLocation(program, "uLightDirection"),
            u_diffuse: gl.getUniformLocation(program, "uDiffuse"),
            u_ambient: gl.getUniformLocation(program, "uAmbient"),
        },
    };

    // shadow 전용 shader 프로그램 준비 (shader는 추후 추가)
    const shadowProgram = initShaders(gl, "shadow-vertex-shader", "shadow-fragment-shader");
    shadowProgramInfo = {
        program: shadowProgram,
        attribLocations: {
            a_position: gl.getAttribLocation(shadowProgram, "a_position"),
        },
        uniformLocations: {
            u_world: gl.getUniformLocation(shadowProgram, "uWorld"),
            u_view: gl.getUniformLocation(shadowProgram, "uView"),
            u_projection: gl.getUniformLocation(shadowProgram, "uProjection"),
        },
    };

    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const cameraMatrix = m4.lookAt(eye, at, [0, 1, 0]);

    viewMatrix = m4.inverse(cameraMatrix);
    projectionMatrix = m4.perspective(Math.PI / 4, aspect, 0.1, 1000);

    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // Initial viewport and resize handling
    function resize() {
        const canvas = gl.canvas;
        // Resize canvas drawing buffer to match displayed size
        if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        // Recompute projection matrix with new aspect
        const aspect = canvas.clientWidth / canvas.clientHeight;
        projectionMatrix = m4.perspective(Math.PI / 4, aspect, 0.1, 1000);
    }

    // Set up resize listener and call once
    window.addEventListener("resize", resize);
    resize();

    return { viewMatrix, projectionMatrix };
}

// Matrix stack operations
function pushMatrix(matrix) {
    matrixStack.push(m4.copy(matrix));
}

function popMatrix() {
    if (matrixStack.length === 0) {
        console.warn("Matrix stack underflow!");
        return m4.identity();
    }
    return matrixStack.pop();
}

function getCurrentMatrix() {
    if (matrixStack.length === 0) {
        return m4.identity();
    }
    return matrixStack[matrixStack.length - 1];
}

export function renderScene(gl, root, options = {}) {
    const shadowPass = options.shadowPass;
    if (shadowPass) {
        // shadow 전용 shader 사용
        gl.useProgram(shadowProgramInfo.program);
        // light view/proj matrix 전달
        gl.uniformMatrix4fv(shadowProgramInfo.uniformLocations.u_view, false, options.lightViewMatrix);
        gl.uniformMatrix4fv(shadowProgramInfo.uniformLocations.u_projection, false, options.lightProjectionMatrix);
        gl.enable(gl.DEPTH_TEST);
        matrixStack = [];
        pushMatrix(m4.identity());
        renderNodeForShadow(gl, root);
        return;
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(meshProgramInfo.program);

    gl.uniformMatrix4fv(meshProgramInfo.uniformLocations.u_view, false, viewMatrix);
    gl.uniformMatrix4fv(meshProgramInfo.uniformLocations.u_projection, false, projectionMatrix);
    gl.uniform3fv(meshProgramInfo.uniformLocations.u_lightDirection, m4.normalize([-1, 3, 5]));
    gl.uniform4fv(meshProgramInfo.uniformLocations.u_diffuse, [1, 1, 1, 1]);
    gl.uniform3fv(meshProgramInfo.uniformLocations.u_ambient, [0.2, 0.2, 0.2]);

    gl.enable(gl.DEPTH_TEST);

    // Initialize matrix stack with identity matrix
    matrixStack = [];
    pushMatrix(m4.identity());

    // Render the scene using matrix stack
    renderNodeWithStack(gl, root, options);
}

function renderNodeWithStack(gl, node, options = {}) {
    // Skip rendering if node is not visible
    if (!node.visible) {
        return;
    }

    // Save current matrix state
    const currentMatrix = getCurrentMatrix();

    // Apply this node's local transformation
    const nodeMatrix = m4.multiply(currentMatrix, node.localMatrix);
    pushMatrix(nodeMatrix);

    // Render this node's mesh if it exists
    if (node.mesh) {
        gl.useProgram(meshProgramInfo.program);
        gl.uniformMatrix4fv(meshProgramInfo.uniformLocations.u_world, false, nodeMatrix);

        // groundMesh일 때만 shadow map uniform 전달
        if (node.name === 'ground' && options.shadowTexture) {
            // shadow map 관련 uniform 전달
            const uShadowMap = gl.getUniformLocation(meshProgramInfo.program, 'uShadowMap');
            const uLightView = gl.getUniformLocation(meshProgramInfo.program, 'uLightView');
            const uLightProjection = gl.getUniformLocation(meshProgramInfo.program, 'uLightProjection');
            const uShadowBias = gl.getUniformLocation(meshProgramInfo.program, 'uShadowBias');
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, options.shadowTexture);
            gl.uniform1i(uShadowMap, 1);
            gl.uniformMatrix4fv(uLightView, false, options.lightViewMatrix);
            gl.uniformMatrix4fv(uLightProjection, false, options.lightProjectionMatrix);
            if (uShadowBias && options.shadowBias !== undefined) {
                gl.uniform1f(uShadowBias, options.shadowBias);
            }
        }

        const buf = node.mesh.buffers;
        bindAttrib(gl, buf.position, meshProgramInfo.attribLocations.a_position, 3);
        bindAttrib(gl, buf.normal, meshProgramInfo.attribLocations.a_normal, 3);
        if (buf.texcoord) {
            bindAttrib(gl, buf.texcoord, meshProgramInfo.attribLocations.a_texcoord, 2);
        } else {
            gl.disableVertexAttribArray(meshProgramInfo.attribLocations.a_texcoord);
        }
        bindAttrib(gl, buf.color, meshProgramInfo.attribLocations.a_color, 4);
        gl.drawArrays(gl.TRIANGLES, 0, node.mesh.numElements);
    }

    // Render all children
    for (const child of node.children) {
        renderNodeWithStack(gl, child, options);
    }

    // Restore previous matrix state
    popMatrix();
}

function renderNodeForShadow(gl, node) {
    if (!node.visible) return;
    const currentMatrix = getCurrentMatrix();
    const nodeMatrix = m4.multiply(currentMatrix, node.localMatrix);
    pushMatrix(nodeMatrix);
    if (node.mesh) {
        if (node.name === 'ground') {
            console.log('shadow pass: drawing ground');
        }
        gl.useProgram(shadowProgramInfo.program);
        gl.uniformMatrix4fv(shadowProgramInfo.uniformLocations.u_world, false, nodeMatrix);
        // light view/proj matrix는 renderScene에서 이미 설정됨
        const buf = node.mesh.buffers;
        bindAttrib(gl, buf.position, shadowProgramInfo.attribLocations.a_position, 3);
        gl.drawArrays(gl.TRIANGLES, 0, node.mesh.numElements);
    }
    for (const child of node.children) {
        renderNodeForShadow(gl, child);
    }
    popMatrix();
}

function bindAttrib(gl, buffer, attrib, size) {
    if (buffer && attrib >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(attrib, size, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attrib);
    }
}