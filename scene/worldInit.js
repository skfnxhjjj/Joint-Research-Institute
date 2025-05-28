export function createGround(gl, size, divisions) {
    const positions = [];
    const colors = [];
    const normals = [];

    for (let i = 0; i < divisions; i++) {
        for (let j = 0; j < divisions; j++) {
            const x0 = -size / 2 + (i / divisions) * size;
            const x1 = -size / 2 + ((i + 1) / divisions) * size;
            const z0 = -size / 2 + (j / divisions) * size;
            const z1 = -size / 2 + ((j + 1) / divisions) * size;

            // Two triangles per cell (CCW winding order for correct facing)
            positions.push(
                x0, 0, z0,
                x0, 0, z1,
                x1, 0, z0,

                x1, 0, z0,
                x0, 0, z1,
                x1, 0, z1
            );

            const color = ((i + j) % 2 === 0) ? [1.0, 1.0, 1.0, 1.0] : [0.8, 0.8, 0.8, 1.0];
            for (let k = 0; k < 6; k++) {
                colors.push(...color);
                normals.push(0, 1, 0);
            }
        }
    }

    const buffer = (data) => {
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        return b;
    };

    return {
        numElements: divisions * divisions * 6,
        buffers: {
            position: buffer(positions),
            color: buffer(colors),
            normal: buffer(normals),
            texcoord: null
        },
        transform: [1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1]
    };
}