import { parseOBJ } from "../common/objParser.js";

function createBuffer(gl, data, name = "", numComponents = 3) {
    if (!data || data.length === 0) {
        console.warn(`Empty buffer data for ${name}`);
        return null;
    }
    try {
        const buffer = gl.createBuffer();
        if (!buffer) {
            throw new Error("Failed to create WebGL buffer");
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        const typedArray = new Float32Array(data);
        gl.bufferData(gl.ARRAY_BUFFER, typedArray, gl.STATIC_DRAW);
        buffer.numComponents = numComponents;
        console.log(`Created buffer ${name}:`, {
            length: data.length,
            byteLength: typedArray.byteLength,
            numComponents
        });
        return buffer;
    } catch (error) {
        console.error(`Failed to create buffer ${name}:`, error);
        return null;
    }
}

function createIndexBuffer(gl, indices, name = "") {
    if (!indices || indices.length === 0) {
        console.warn(`Empty index buffer data for ${name}`);
        return null;
    }
    try {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        const typedArray = new Uint16Array(indices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, typedArray, gl.STATIC_DRAW);
        console.log(`Created index buffer ${name}:`, {
            length: indices.length,
            byteLength: typedArray.byteLength
        });
        return buffer;
    } catch (error) {
        console.error(`Failed to create index buffer ${name}:`, error);
        return null;
    }
}

function calculateBoundingBox(positions) {
    if (!positions || positions.length === 0) return { min: [0, 0, 0], max: [0, 0, 0] };
    
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    
    for (let i = 0; i < positions.length; i += 3) {
        for (let j = 0; j < 3; j++) {
            min[j] = Math.min(min[j], positions[i + j]);
            max[j] = Math.max(max[j], positions[i + j]);
        }
    }
    
    return { min, max };
}

function dedupeVertices(positions, normals, texcoords, colors) {
    if (!positions || positions.length === 0) {
        console.warn("No positions data to deduplicate");
        return null;
    }

    console.log("Deduplicating vertices:", {
        positions: positions.length,
        normals: normals?.length,
        texcoords: texcoords?.length,
        colors: colors?.length
    });

    const vertexMap = new Map();
    const uniquePositions = [];
    let uniqueNormals = [];
    let uniqueTexcoords = [];
    let uniqueColors = [];
    const indices = [];

    // 버텍스당 속성 개수
    const stride = 3;  // position XYZ
    const numVertices = positions.length / stride;

    for (let i = 0; i < numVertices; i++) {
        let key = positions.slice(i * stride, (i + 1) * stride).join(',');
        if (normals) key += '|' + normals.slice(i * stride, (i + 1) * stride).join(',');
        if (texcoords) key += '|' + texcoords.slice(i * 2, (i + 1) * 2).join(',');
        if (colors) key += '|' + colors.slice(i * 4, (i + 1) * 4).join(',');

        let index = vertexMap.get(key);
        if (index === undefined) {
            index = uniquePositions.length / stride;
            vertexMap.set(key, index);

            uniquePositions.push(...positions.slice(i * stride, (i + 1) * stride));
            if (normals) uniqueNormals.push(...normals.slice(i * stride, (i + 1) * stride));
            if (texcoords) uniqueTexcoords.push(...texcoords.slice(i * 2, (i + 1) * 2));
            if (colors) uniqueColors.push(...colors.slice(i * 4, (i + 1) * 4));
        }
        indices.push(index);
    }

    // 메모리 정리
    vertexMap.clear();

    // 데이터가 없는 경우 null로 설정
    uniqueNormals = uniqueNormals.length > 0 ? uniqueNormals : null;
    uniqueTexcoords = uniqueTexcoords.length > 0 ? uniqueTexcoords : null;
    uniqueColors = uniqueColors.length > 0 ? uniqueColors : null;

    console.log("Deduplication results:", {
        originalVertices: numVertices,
        uniqueVertices: uniquePositions.length / stride,
        indices: indices.length
    });

    return {
        positions: uniquePositions,
        normals: uniqueNormals,
        texcoords: uniqueTexcoords,
        colors: uniqueColors,
        indices
    };
}

export async function loadOBJ(gl, url) {
    try {
        console.log("Loading OBJ from URL:", url);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch OBJ file: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        const obj = parseOBJ(text);
        
        if (!obj || !obj.geometries || obj.geometries.length === 0) {
            throw new Error("Invalid OBJ file: No geometries found");
        }

        return obj.geometries.map(({ data }, index) => {
            if (!data.position || data.position.length === 0) {
                throw new Error("Invalid OBJ file: No position data found");
            }

            console.log(`Processing geometry ${index}:`, {
                positions: data.position.length,
                normals: data.normal?.length,
                texcoords: data.texcoord?.length,
                colors: data.color?.length
            });

            // Deduplicate vertices
            const deduped = dedupeVertices(
                data.position,
                data.normal,
                data.texcoord,
                data.color
            );

            if (!deduped) {
                throw new Error("Failed to deduplicate vertices");
            }

            let colors = deduped.colors;
            if (!colors || colors.length !== deduped.positions.length / 3 * 4) {
                // positions.length / 3 만큼 버텍스가 있으니, 4개씩 곱해서 RGBA로 채워야 함
                const nVerts = deduped.positions.length / 3;
                colors = [];
                for (let i = 0; i < nVerts; ++i) {
                    colors.push(1, 1, 1, 1); // RGBA
                }
            }

            const bbox = calculateBoundingBox(deduped.positions);
            const size = [
                bbox.max[0] - bbox.min[0],
                bbox.max[1] - bbox.min[1],
                bbox.max[2] - bbox.min[2]
            ];

            const buffers = {
                position: createBuffer(gl, deduped.positions, `${url}_position`, 3),
                normal: createBuffer(gl, deduped.normals, `${url}_normal`, 3),
                texcoord: createBuffer(gl, deduped.texcoords, `${url}_texcoord`, 2),
                color: createBuffer(gl, colors, `${url}_color`, 4),
                indices: createIndexBuffer(gl, deduped.indices, `${url}_indices`)
            };

            if (!buffers.position || !buffers.indices) {
                throw new Error("Failed to create essential buffers");
            }

            return {
                numElements: deduped.indices.length,
                size: size,
                boundingBox: bbox,
                buffers,
                indexed: true
            };
        });
    } catch (error) {
        console.error("Error loading OBJ file:", url, error);
        throw error;
    }
}