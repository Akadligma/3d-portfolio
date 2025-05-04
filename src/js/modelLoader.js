import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

/**
 * A very simple model loader for loading 3D models
 */
export class ModelLoader {
    /**
     * Create a model loader
     * @param {THREE.LoadingManager} loadingManager - The loading manager
     * @param {THREE.Scene} scene - The scene to add models to
     */
    constructor(loadingManager, scene) {
        this.loadingManager = loadingManager;
        this.scene = scene;
        this.gltfLoader = new GLTFLoader(loadingManager);
        this.objLoader = new OBJLoader(loadingManager);
        console.log("ModelLoader initialized");
    }

    /**
     * Load all models
     */
    loadAllModels() {
        // Try to load the GLB file first (more common format)
        this.loadModel('assets/models/start/start.glb');
        
        // As a backup, try the OBJ file
        // this.loadModel('assets/models/start/01.obj');
    }

    /**
     * Load a single model
     * @param {string} path - Path to the model file
     */
    loadModel(path) {
        console.log(`Attempting to load: ${path}`);
        
        const extension = path.split('.').pop().toLowerCase();
        
        if (extension === 'glb' || extension === 'gltf') {
            this.gltfLoader.load(
                path,
                (gltf) => {
                    const model = gltf.scene;
                    
                    // Apply shadows
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    
                    // Add to scene
                    this.scene.add(model);
                    console.log(`Successfully loaded: ${path}`);
                },
                (xhr) => {
                    console.log(`${path}: ${(xhr.loaded / xhr.total * 100).toFixed(0)}% loaded`);
                },
                (error) => {
                    console.error(`Error loading: ${path}`, error);
                }
            );
        } else if (extension === 'obj') {
            this.objLoader.load(
                path,
                (obj) => {
                    // Apply shadows
                    obj.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    
                    // Add to scene
                    this.scene.add(obj);
                    console.log(`Successfully loaded: ${path}`);
                },
                (xhr) => {
                    console.log(`${path}: ${(xhr.loaded / xhr.total * 100).toFixed(0)}% loaded`);
                },
                (error) => {
                    console.error(`Error loading: ${path}`, error);
                }
            );
        }
    }
}