import * as THREE from 'three';

/**
 * Asset Loader class for managing the loading of various assets
 */
export class AssetLoader {
    constructor(loadingManager) {
        this.loadingManager = loadingManager;
        this.textureLoader = new THREE.TextureLoader(loadingManager);
        this.placeholderTextures = {};
    }

    /**
     * Load a texture from a URL
     * @param {string} url - URL of the texture to load
     * @returns {Promise<THREE.Texture>} - Promise resolving to the loaded texture
     */
    loadTexture(url) {
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                url, 
                texture => resolve(texture),
                undefined,
                err => reject(err)
            );
        });
    }

    /**
     * Create a placeholder texture with text
     * @param {string} title - Title to display on placeholder
     * @param {string} colorHex - Background color in hex
     * @returns {THREE.Texture} - Generated placeholder texture
     */
    createPlaceholderTexture(title, colorHex = null) {
        // Check if we've already created this placeholder
        const key = `${title}-${colorHex}`;
        if (this.placeholderTextures[key]) {
            return this.placeholderTextures[key];
        }

        // Create a canvas with text for the placeholder
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // Fill background
        const bgColor = colorHex || '#' + Math.floor(Math.random()*16777215).toString(16);
        context.fillStyle = bgColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add text
        context.fillStyle = 'white';
        context.font = 'bold 40px Arial';
        context.textAlign = 'center';
        context.fillText(title, canvas.width/2, canvas.height/2);
        
        // Draw a frame
        context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        context.lineWidth = 10;
        context.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
        
        // Convert canvas to texture
        const texture = new THREE.CanvasTexture(canvas);
        
        // Store for reuse
        this.placeholderTextures[key] = texture;
        
        return texture;
    }

    /**
     * Load artwork data and create textures
     * @param {Array} artworkData - Array of artwork objects
     * @returns {Promise<Array>} - Promise resolving to array of artwork objects with textures
     */
    loadArtworks(artworkData) {
        console.log('Loading artwork data:', artworkData);
        
        return Promise.all(
            artworkData.map(async (artwork, index) => {
                // Create placeholder for development regardless of URL
                // This ensures we always have a texture even if file loading fails
                const placeholderTexture = this.createPlaceholderTexture(artwork.metadata.title);
                artwork.texture = placeholderTexture;
                
                // Only try to load real textures if URL exists and isn't placeholder
                if (artwork.url && !artwork.url.includes('placeholder')) {
                    try {
                        console.log(`Attempting to load artwork texture: ${artwork.url}`);
                        const texture = await this.loadTexture(artwork.url);
                        artwork.texture = texture;
                        console.log(`Successfully loaded texture for: ${artwork.metadata.title}`);
                    } catch (error) {
                        console.warn(`Failed to load artwork: ${artwork.url}`, error);
                        // Keep using the placeholder we already set
                    }
                } else {
                    console.log(`Using placeholder for: ${artwork.metadata.title}`);
                }
                
                return artwork;
            })
        );
    }
}