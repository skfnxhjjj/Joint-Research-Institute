export function raycast(gl, x, y, viewMatrix, projectionMatrix, ground) {
    // Compute inverse of projection * view
    const pvMatrix = m4.multiply(projectionMatrix, viewMatrix);
    const invPV = m4.inverse(pvMatrix);

    // Convert canvas xy to normalized device coordinates
    const rect = gl.canvas.getBoundingClientRect();
    const ndcX = (x / rect.width) * 2 - 1;
    const ndcY = ((rect.height - y) / rect.height) * 2 - 1;

    // Unproject to world space (near and far points)
    const near = m4.transformPoint(invPV, [ndcX, ndcY, -1]);
    const far = m4.transformPoint(invPV, [ndcX, ndcY, 1]);

    // Ray direction
    const dir = m4.normalize(m4.subtractVectors(far, near));
    const origin = near;
    const groundHeight = 0.5;

    // Intersect with horizontal ground plane (y = groundY)
    // const groundY = ground.transform
    //     ? ground.transform[13]  // extract translate Y
    //     : 0;
    const groundY = groundHeight;
    const t = (groundY - origin[1]) / dir[1];
    if (t <= 0) {
        return null;
    }

    // Intersection point
    const position = m4.addVectors(origin, m4.scaleVector(dir, t));
    const normal = [0, 1, 0];

    return {position, normal, node: ground};
}