import * as THREE from 'three';

/**
 * ArtworkManager class for managing artwork in the gallery
 */
export class ArtworkManager {
    /**
     * Create an artwork manager
     * @param {THREE.Scene} scene - The scene to add artwork to
     * @param {AssetLoader} assetLoader - The asset loader instance
     */
    constructor(scene, assetLoader) {
        this.scene = scene;
        this.assetLoader = assetLoader;
        this.artPieces = [];
    }
    
    /**
     * Load and place artwork in the gallery
     * @param {Array} artworkData - Array of artwork data objects
     * @returns {Promise<Array>} - Promise resolving to array of artwork objects
     */
    async loadArtwork(artworkData) {
        // Load artwork textures
        const processedArtwork = await this.assetLoader.loadArtworks(artworkData);
        
        // Create and place artwork in the scene
        processedArtwork.forEach((artwork, index) => {
            this.addArtPiece(
                artwork.texture,
                artwork.position,
                artwork.orientation,
                artwork.metadata,
                index
            );
        });
        
        return this.artPieces;
    }
    
    /**
     * Add an art piece to the scene
     * @param {THREE.Texture} texture - The texture for the artwork
     * @param {THREE.Vector3} position - Position in the scene
     * @param {string} orientation - Orientation ('front', 'left', 'right')
     * @param {Object} metadata - Metadata about the artwork
     * @param {number} index - Index of the artwork
     * @returns {THREE.Mesh} - The created artwork mesh
     */
    addArtPiece(texture, position, orientation, metadata, index) {
        // Calculate aspect ratio (default to 1:1 if not available)
        const aspectRatio = texture.image ? texture.image.width / texture.image.height : 1;
        const width = 2;
        const height = width / aspectRatio;
        
        const artGeometry = new THREE.PlaneGeometry(width, height);
        const artMaterial = new THREE.MeshStandardMaterial({ 
            map: texture,
            side: THREE.DoubleSide
        });
        
        const artPiece = new THREE.Mesh(artGeometry, artMaterial);
        artPiece.position.copy(position);
        
        // Set rotation based on orientation
        if (orientation === 'front') {
            artPiece.rotation.y = 0;
        } else if (orientation === 'left') {
            artPiece.rotation.y = Math.PI / 2;
        } else if (orientation === 'right') {
            artPiece.rotation.y = -Math.PI / 2;
        }
        
        // Add a frame
        this.addFrame(artPiece, width, height);
        
        // Store artwork metadata
        artPiece.userData = {
            title: metadata.title,
            description: metadata.description,
            year: metadata.year,
            type: metadata.type || 'painting',
            viewingDistance: metadata.viewingDistance || 2.5,
            viewingDuration: metadata.viewingDuration || { min: 5, max: 10 },
            index: index
        };
        
        // Calculate and store normal vector (for viewing direction)
        artPiece.normal = new THREE.Vector3(0, 0, 1).applyQuaternion(artPiece.quaternion);
        
        artPiece.castShadow = true;
        artPiece.receiveShadow = true;
        
        this.scene.add(artPiece);
        this.artPieces.push(artPiece);
        
        return artPiece;
    }
    
    /**
     * Add a frame around an artwork
     * @param {THREE.Mesh} artPiece - The artwork to frame
     * @param {number} width - Width of the artwork
     * @param {number} height - Height of the artwork
     */
    addFrame(artPiece, width, height) {
        const frameDepth = 0.05;
        const frameWidth = 0.1;
        
        // Frame material
        const frameMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.5,
            metalness: 0.5
        });
        
        // Create frame segments
        const frameSegments = [
            // Top
            {
                size: new THREE.Vector3(width + frameWidth * 2, frameWidth, frameDepth),
                position: new THREE.Vector3(0, height/2 + frameWidth/2, -frameDepth/2)
            },
            // Bottom
            {
                size: new THREE.Vector3(width + frameWidth * 2, frameWidth, frameDepth),
                position: new THREE.Vector3(0, -height/2 - frameWidth/2, -frameDepth/2)
            },
            // Left
            {
                size: new THREE.Vector3(frameWidth, height, frameDepth),
                position: new THREE.Vector3(-width/2 - frameWidth/2, 0, -frameDepth/2)
            },
            // Right
            {
                size: new THREE.Vector3(frameWidth, height, frameDepth),
                position: new THREE.Vector3(width/2 + frameWidth/2, 0, -frameDepth/2)
            }
        ];
        
        // Create frame group
        const frameGroup = new THREE.Group();
        
        // Add each frame segment
        frameSegments.forEach(segment => {
            const geometry = new THREE.BoxGeometry(segment.size.x, segment.size.y, segment.size.z);
            const mesh = new THREE.Mesh(geometry, frameMaterial);
            mesh.position.copy(segment.position);
            mesh.castShadow = true;
            frameGroup.add(mesh);
        });
        
        // Add frame to artwork
        artPiece.add(frameGroup);
    }
    
    /**
     * Get sample artwork data
     * @returns {Array} - Array of sample artwork data
     */
    getSampleArtworkData() {
        return [
            { 
                url: 'placeholder-artwork-1.jpg', 
                position: new THREE.Vector3(-5, 1.6, -5), 
                orientation: 'left',
                metadata: { 
                    title: 'Abstract Composition #1', 
                    description: 'A dynamic exploration of form and color, representing the chaos of modern life.',
                    year: '2023'
                } 
            },
            { 
                url: 'placeholder-artwork-2.jpg', 
                position: new THREE.Vector3(0, 1.6, -7), 
                orientation: 'front',
                metadata: { 
                    title: 'Serenity', 
                    description: 'Minimalist landscape capturing the essence of tranquility and space.',
                    year: '2022'
                } 
            },
            { 
                url: 'placeholder-artwork-3.jpg', 
                position: new THREE.Vector3(5, 1.6, -5), 
                orientation: 'right',
                metadata: { 
                    title: 'Urban Fragments', 
                    description: 'A collage of city elements showing the relationship between structure and humanity.',
                    year: '2024'
                } 
            }
        ];
    }
    
    /**
     * Check for collisions with artwork
     * @param {THREE.Vector3} position - Position to check
     * @param {number} radius - Collision radius
     * @returns {boolean} - True if collision detected
     */
    checkCollisions(position, radius) {
        for (const art of this.artPieces) {
            const artBox = new THREE.Box3().setFromObject(art);
            
            // Expand box a bit to account for frames
            artBox.min.x -= 0.1;
            artBox.min.y -= 0.1;
            artBox.min.z -= 0.1;
            artBox.max.x += 0.1;
            artBox.max.y += 0.1;
            artBox.max.z += 0.1;
            
            const artCenter = new THREE.Vector3();
            artBox.getCenter(artCenter);
            
            const closestPoint = new THREE.Vector3().copy(position);
            
            closestPoint.x = Math.max(artBox.min.x, Math.min(closestPoint.x, artBox.max.x));
            closestPoint.y = Math.max(artBox.min.y, Math.min(closestPoint.y, artBox.max.y));
            closestPoint.z = Math.max(artBox.min.z, Math.min(closestPoint.z, artBox.max.z));
            
            const distance = closestPoint.distanceTo(position);
            
            if (distance < radius) {
                return true;
            }
        }
        
        return false;
    }
}