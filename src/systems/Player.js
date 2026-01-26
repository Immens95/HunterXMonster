
export class Player {
    constructor(game) {
        this.game = game;
        this.mesh = null;
        this.mixer = null;
        this.speed = 100;
        this.rotationSpeed = 5;
        this.velocity = new THREE.Vector3();
        this.cameraAngle = 0;
        this.cameraPitch = 0.8;
        this.cameraDistance = 300;
    }

    async init() {
        try {
            const gltf = await this.game.assetManager.loadModel('player', 'assets/models/player.glb');
            this.mesh = gltf.scene;
            this.mesh.scale.set(30, 30, 30);
            this.mesh.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.mesh);
                const walkClip = gltf.animations.find(a => a.name.toLowerCase().includes('walk'));
                if (walkClip) this.mixer.clipAction(walkClip).play();
                else this.mixer.clipAction(gltf.animations[0]).play();
            }
        } catch (err) {
            console.warn("Fallback player mesh:", err);
            const geo = new THREE.CapsuleGeometry(15, 30, 4, 8);
            const mat = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
            this.mesh = new THREE.Mesh(geo, mat);
        }
        
        this.game.sceneManager.add(this.mesh);
    }

    update(deltaTime, terrain) {
        if (!this.mesh) return;

        const input = this.game.inputManager;
        let moveX = 0;
        let moveZ = 0;

        if (input.isPressed('KeyW')) moveZ -= 1;
        if (input.isPressed('KeyS')) moveZ += 1;
        if (input.isPressed('KeyA')) moveX -= 1;
        if (input.isPressed('KeyD')) moveX += 1;

        if (moveX !== 0 || moveZ !== 0) {
            const direction = new THREE.Vector3(moveX, 0, moveZ).normalize();
            direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraAngle);
            
            const nextPos = this.mesh.position.clone().add(direction.multiplyScalar(this.speed * deltaTime));
            this.mesh.position.copy(nextPos);
            
            // Rotazione mesh verso direzione movimento
            const targetRotation = Math.atan2(direction.x, direction.z);
            this.mesh.rotation.y = targetRotation;
        }

        // Grounding
        if (terrain) {
            const height = terrain.getHeight(this.mesh.position.x, this.mesh.position.z);
            this.mesh.position.y = height;
        }

        if (this.mixer) this.mixer.update(deltaTime);
        
        this.updateCamera();
    }

    updateCamera() {
        const camera = this.game.sceneManager.camera;
        const targetX = this.mesh.position.x + Math.sin(this.cameraAngle) * this.cameraDistance * Math.cos(this.cameraPitch);
        const targetZ = this.mesh.position.z + Math.cos(this.cameraAngle) * this.cameraDistance * Math.cos(this.cameraPitch);
        const targetY = this.mesh.position.y + Math.sin(this.cameraPitch) * this.cameraDistance;

        camera.position.set(targetX, targetY, targetZ);
        camera.lookAt(this.mesh.position.x, this.mesh.position.y + 40, this.mesh.position.z);
    }
}
