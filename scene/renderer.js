let meshProgramInfo;
let viewMatrix;
let projectionMatrix;

export function initRenderer(gl, eye, at) {
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    meshProgramInfo = {
        program,
        attribLocations: {
            a_position: gl.getAttribLocation(program, "vPosition"),
            a_normal: gl.getAttribLocation(program, "vNormal"),
            a_texcoord: gl.getAttribLocation(program, "vTexCoord"),
            a_color: gl.getAttribLocation(program, "vColor"),
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

    return {viewMatrix, projectionMatrix};
}

export function renderScene(gl, scene) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(meshProgramInfo.program);

    gl.uniformMatrix4fv(meshProgramInfo.uniformLocations.u_view, false, viewMatrix);
    gl.uniformMatrix4fv(meshProgramInfo.uniformLocations.u_projection, false, projectionMatrix);
    gl.uniform3fv(meshProgramInfo.uniformLocations.u_lightDirection, m4.normalize([-1, 3, 5]));
    gl.uniform4fv(meshProgramInfo.uniformLocations.u_diffuse, [1, 1, 1, 1]);
    gl.uniform3fv(meshProgramInfo.uniformLocations.u_ambient, [0.2, 0.2, 0.2]);

    gl.enable(gl.DEPTH_TEST);

    for (const mesh of scene.meshes) {
        gl.useProgram(meshProgramInfo.program);
        let worldMatrix = mesh.transform || m4.identity();
        gl.uniformMatrix4fv(meshProgramInfo.uniformLocations.u_world, false, worldMatrix);
        bindAttrib(gl, mesh.buffers.position, meshProgramInfo.attribLocations.a_position, 3);
        bindAttrib(gl, mesh.buffers.normal, meshProgramInfo.attribLocations.a_normal, 3);
        bindAttrib(gl, mesh.buffers.texcoord, meshProgramInfo.attribLocations.a_texcoord, 2);
        bindAttrib(gl, mesh.buffers.color, meshProgramInfo.attribLocations.a_color, 3);

        gl.drawArrays(gl.TRIANGLES, 0, mesh.numElements);
    }
}

function bindAttrib(gl, buffer, attrib, size) {
    if (buffer && attrib >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(attrib, size, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(attrib);
    }
}