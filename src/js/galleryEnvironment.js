import * as THREE from 'three';

/**
 * GalleryEnvironment class for creating and managing the gallery space
 */
export class GalleryEnvironment {
    constructor(scene) {
        this.scene = scene;
        this.walls = [];
        this.lights = [];
    }

    /**
     * Create the basic gallery environment
     */
    createEnvironment() {
        this.createFloor();
        this.createWalls();
        this.createLighting();
        
        return this.walls;
    }

    /**
     * Create the gallery floor
     */
    createFloor() {
        const floorGeometry = new THREE.PlaneGeometry(30, 30);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222, 
            roughness: 0.8 
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        
        this.scene.add(floor);
        return floor;
    }

    /**
     * Create the gallery walls
     */
    createWalls() {
        const wallHeight = 4;
        const wallMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xeeeeee, 
            roughness: 0.7 
        });
        
        // Gallery layout - simple room with three wall sections
        const wallSegments = [
            // Back wall
            { pos: new THREE.Vector3(0, wallHeight/2, -10), size: new THREE.Vector3(20, wallHeight, 0.2), rot: new THREE.Vector3(0, 0, 0) },
            // Left wall
            { pos: new THREE.Vector3(-10, wallHeight/2, 0), size: new THREE.Vector3(20, wallHeight, 0.2), rot: new THREE.Vector3(0, Math.PI/2, 0) },
            // Right wall
            { pos: new THREE.Vector3(10, wallHeight/2, 0), size: new THREE.Vector3(20, wallHeight, 0.2), rot: new THREE.Vector3(0, -Math.PI/2, 0) }
        ];
        
        wallSegments.forEach(segment => {
            const wallGeometry = new THREE.BoxGeometry(segment.size.x, segment.size.y, segment.size.z);
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            
            wall.position.copy(segment.pos);
            wall.rotation.setFromVector3(segment.rot);
            wall.receiveShadow = true;
            
            this.scene.add(wall);
            this.walls.push(wall);
        });
        
        return this.walls;
    }

    /**
     * Create gallery lighting
     */
    createLighting() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        directionalLight.castShadow = true;
        
        // Setup shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        
        this.scene.add(directionalLight);
        this.lights.push(directionalLight);
        
        // Add spotlights for each major wall section
        const spotLightPositions = [
            { pos: new THREE.Vector3(-5, 3, 0), target: new THREE.Vector3(-5, 1.5, 0) },
            { pos: new THREE.Vector3(0, 3, -5), target: new THREE.Vector3(0, 1.5, -5) },
            { pos: new THREE.Vector3(5, 3, 0), target: new THREE.Vector3(5, 1.5, 0) }
        ];
        
        spotLightPositions.forEach(lightData => {
            const spotLight = new THREE.SpotLight(0xffffee, 1);
            spotLight.position.copy(lightData.pos);
            spotLight.target.position.copy(lightData.target);
            spotLight.angle = Math.PI / 6;
            spotLight.penumbra = 0.2;
            spotLight.decay = 2;
            spotLight.distance = 15;
            spotLight.castShadow = true;
            
            this.scene.add(spotLight);
            this.scene.add(spotLight.target);
            this.lights.push(spotLight);
        });
        
        return this.lights;
    }
    
    /**
     * Get recommended artwork positions based on the gallery layout
     * @returns {Array} - Array of position and orientation pairs for artwork
     */
    getArtworkPositions() {
        // Create recommended positions for artwork based on the gallery layout
        return [
            { 
                position: new THREE.Vector3(-5, 1.6, -5), 
                orientation: 'left',
            },
            { 
                position: new THREE.Vector3(0, 1.6, -7), 
                orientation: 'front',
            },
            { 
                position: new THREE.Vector3(5, 1.6, -5), 
                orientation: 'right',
            },
            {
                position: new THREE.Vector3(-7, 1.6, 0),
                orientation: 'left',
            },
            {
                position: new THREE.Vector3(7, 1.6, 0),
                orientation: 'right',
            }
        ];
    }
}