import {SceneNode} from "../scene/SceneNode.js";
import config from "./robotConfig.js";
import {loadMesh} from "../utils/meshUtils.js";

// Leg class
export class Leg {
    static async create(gl, index, attach) {
        const leg = new Leg();
        await leg.init(gl, index, attach);
        return leg;
    }

    async init(gl, index, attach) {
        try {
            this.index = index;
            this.attach = attach;
            const isLeft = index >= 3;
            const {upper, lower, foot} = config.segmentConfig;

            console.log("Loading meshes with config:", {upper, lower, foot});

            // Load all meshes first
            const [upperMeshArray, lowerMeshArray, footMeshArray] = await Promise.all([
                loadMesh(gl, upper.mesh),
                loadMesh(gl, lower.mesh),
                loadMesh(gl, foot.mesh)
            ]);

            // Validate and extract first mesh from each array
            if (!upperMeshArray?.[0]?.buffers?.position) {
                throw new Error(`Failed to load upper mesh properly for leg ${index}`);
            }
            if (!lowerMeshArray?.[0]?.buffers?.position) {
                throw new Error(`Failed to load lower mesh properly for leg ${index}`);
            }
            if (!footMeshArray?.[0]?.buffers?.position) {
                throw new Error(`Failed to load foot mesh properly for leg ${index}`);
            }

            const upperMesh = upperMeshArray[0];
            const lowerMesh = lowerMeshArray[0];
            const footMesh = footMeshArray[0];

            console.log(`Leg ${index} meshes loaded:`, {
                upper: upperMesh,
                lower: lowerMesh,
                foot: footMesh
            });

            // Get mesh sizes safely
            const upperSize = upperMesh.size || [1, 1, 1];
            const lowerSize = lowerMesh.size || [1, 1, 1];
            const footSize = footMesh.size || [1, 1, 1];

            console.log("Mesh sizes:", {
                upper: upperSize,
                lower: lowerSize,
                foot: footSize
            });

            const upperMatrix = m4.multiply(
                m4.translation(...attach),
                m4.identity()
            );

            const upperNode = new SceneNode({
                name: `leg${index}_upper`,
                mesh: upperMesh,
                pivot: upper.pivot || [0, 0, 0],
                localMatrix: upperMatrix
            });
            upperNode.jointLimits = upper.jointLimits;

            const lowerNode = new SceneNode({
                name: `leg${index}_lower`,
                mesh: lowerMesh,
                pivot: lower.pivot || [0, 0, 0],
                localMatrix: m4.multiply(
                    m4.translation(0, upperSize[1], 0),
                    m4.translation(...(lower.pivot || [0, 0, 0])),
                )
            });
            lowerNode.jointLimits = lower.jointLimits;

            const footNode = new SceneNode({
                name: `leg${index}_foot`,
                mesh: footMesh,
                pivot: foot.pivot || [0, 0, 0],
                localMatrix: m4.multiply(
                    m4.translation(0, lowerSize[1], 0),
                    m4.translation(...(foot.pivot || [0, 0, 0]))
                )
            });
            footNode.jointLimits = foot.jointLimits;

            upperNode.addChild(lowerNode);
            lowerNode.addChild(footNode);

            // Initialize world matrices
            upperNode.updateWorldMatrix();

            this.root = upperNode;
            this.footPosition = [0, 0, 0];
            this.isGrounded = false;
            this.phase = "support";
        } catch (error) {
            console.error(`Error in Leg ${index} initialization:`, error);
            console.error("Config used:", config.segmentConfig);
            throw error;
        }
    }

    update(time) {
        // Update world matrices before rendering
        this.root.updateWorldMatrix();
    }

    getFootWorldPosition() {
        return this.footPosition;
    }
}