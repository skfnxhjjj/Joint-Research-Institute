export function update(time, legs, robotPosition, controllerPosition, spiderYaw) {
    const dx = controllerPosition[0] - robotPosition[0];
    const dz = controllerPosition[2] - robotPosition[2];
    calculate(time, legs, spiderYaw);
    return true;
}

function calculate(time, legs, spiderYaw) {
    const liftHeight = 0.2;
    const strideLength = 0.5;

    const strideDir = [0, 0, -1]; // local backward
    const rot = m4.yRotation(spiderYaw);
    const strideWorld = m4.transformDirection(rot, strideDir);

    if (!legs || !Array.isArray(legs)) return;

    for (const leg of legs) {
        if (!leg.attachWorld) continue;

        const dx = leg.footPosition[0] - leg.footTarget[0];
        const dy = leg.footPosition[1] - leg.footTarget[1];
        const dz = leg.footPosition[2] - leg.footTarget[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (leg.phase === "support") {
            leg.footTarget = [
                leg.attachWorld[0] + strideWorld[0] * strideLength,
                0,
                leg.attachWorld[2] + strideWorld[2] * strideLength
            ];
            leg.phase = "swing";
            leg.isMoving = true;
        } else if (leg.phase === "swing" && dist < 0.05) {
            leg.footTarget = [
                leg.attachWorld[0] + strideWorld[0] * strideLength,
                0,
                leg.attachWorld[2] + strideWorld[2] * strideLength
            ];
            leg.phase = "support";
        }
    }
}