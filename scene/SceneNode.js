export class SceneNode {
    constructor({
        name,
        mesh = null,
        localMatrix = m4.identity(),
        children = [],
        visible = true
    }) {
        this.name = name;
        this.mesh = mesh;
        this.localMatrix = localMatrix;
        this.worldMatrix = m4.identity();
        this.children = children;
        this.visible = visible;
        this.transforms = {
            base: m4.identity(),
            gait: m4.identity(),
            ik: m4.identity(),
            user: m4.identity()
        };
    }

    addChild(node) {
        this.children.push(node);
    }

    updateLocalMatrix() {
        // Combine all transform components into the final localMatrix
        this.localMatrix = m4.multiply(
            this.transforms.base,
            m4.multiply(
                this.transforms.gait,
                m4.multiply(
                    this.transforms.ik,
                    this.transforms.user
                )
            )
        );
    }

    traverse(callback) {
        callback(this);
        for (const child of this.children) {
            if (typeof child.traverse === 'function') {
                child.traverse(callback);
            } else {
                console.warn("invalid child in traverse:", child);
            }
        }
    }

    computeWorld(parentMatrix = m4.identity()) {
        this.worldMatrix = m4.multiply(parentMatrix, this.localMatrix);
        for (const child of this.children) {
            child.computeWorld(this.worldMatrix);
        }
    }

    getWorldPosition() {
        const m = this.worldMatrix;
        return [m[12], m[13], m[14]];
    }
}