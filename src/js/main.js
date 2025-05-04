import * as THREE from 'three';
import '../css/style.css';
import { AssetLoader } from './assetLoader.js';
import { GalleryEnvironment } from './galleryEnvironment.js';
import { CameraController } from './cameraController.js';
import { ArtworkManager } from './artworkManager.js';
import { ModelLoader } from './modelLoader.js'; // Add the model loader import
import { UI } from './utils.js';

/**
 * Main application class for the 3D Art Portfolio
 */
class ArtPortfolioApp {
    constructor() {
        // Initialize properties
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = null;
        this.loadingManager = null;
        
        // DOM elements
        this.loadingScreen = null;
        this.loadingTitle = null;
        this.canvasContainer = null;
        this.artworkInfo = null;
        
        // Component classes
        this.assetLoader = null;
        this.galleryEnvironment = null;
        this.cameraController = null;
        this.artworkManager = null;
        this.modelLoader = null; // Add model loader property
        
        // Scene objects
        this.walls = [];
        this.artPieces = [];
        
        // State tracking
        this.experienceStarted = false;
        this.progressInterval = null;
        
        // Initialize the application
        this.init();
    }
    
    /**
     * Initialize the application
     */
    init() {
        console.log("Initializing Art Portfolio App");
        
        // Setup DOM elements
        this.canvasContainer = document.getElementById('canvas-container');
        
        // Setup loading screen
        this.setupLoadingScreen();
        
        // Initialize Three.js components
        this.initScene();
        this.initCamera();
        this.initRenderer();
        
        // Create asset loader
        this.assetLoader = new AssetLoader(this.loadingManager);

               // Create and initialize model loader - THIS IS THE ADDED CODE
               this.modelLoader = new ModelLoader(this.loadingManager, this.scene);
               this.modelLoader.loadAllModels();
               console.log("Started loading 3D models");
        
        // Create gallery environment
        this.galleryEnvironment = new GalleryEnvironment(this.scene);
        this.walls = this.galleryEnvironment.createEnvironment();
        
        // Create camera controller
        this.cameraController = new CameraController(this.camera, this.renderer.domElement);
        
        // Setup camera path for intro animation
        const cameraPathPoints = [
            new THREE.Vector3(0, 1.6, 10),       // Starting position
            new THREE.Vector3(-3, 1.6, 5),       // Move toward left wall
            new THREE.Vector3(-5, 1.6, 0),       // View left wall artwork
            new THREE.Vector3(0, 1.6, -3),       // Move to center of gallery
            new THREE.Vector3(5, 1.6, 0),        // View right wall artwork
            new THREE.Vector3(0, 1.6, 3)         // Final position in center
        ];
        
        const lookAtPoints = [
            new THREE.Vector3(-5, 1.6, -5),     // Left wall art
            new THREE.Vector3(0, 1.6, -7),      // Back wall art
            new THREE.Vector3(5, 1.6, -5)       // Right wall art
        ];
        
        this.cameraController.setupCameraPath(cameraPathPoints, lookAtPoints);
        
        // Create artwork manager and load artwork immediately
        this.artworkManager = new ArtworkManager(this.scene, this.assetLoader);
        this.loadArtwork();
        
        // Start animation loop
        this.clock = new THREE.Clock();
        this.animate();
        
        console.log("Initialization complete");
    }
    
  
/**
 * Setup loading screen with guaranteed progressive animation
 */
setupLoadingScreen() {
    this.loadingScreen = document.getElementById('loading-screen');
    this.loadingTitle = document.getElementById('loading-title');
    
    // Setup glitchy figlet text
    this.setupGlitchyFigletText();
    
    // Force initial reveal of at least one line
    this.updateGlitchyText(0.1);
    
    // Set up loading manager for actual asset loading
    this.loadingManager = new THREE.LoadingManager();
    
    // Track whether actual loading is complete
    let assetsLoaded = false;
    
    this.loadingManager.onProgress = (url, loaded, total) => {
        console.log(`Loading: ${url} - ${loaded}/${total}`);
        // Note: We don't update the glitchy text progress here anymore
    };
    
    this.loadingManager.onError = (url) => {
        console.error(`Error loading: ${url}`);
    };
    
    this.loadingManager.onLoad = () => {
        console.log('All resources loaded successfully');
        assetsLoaded = true;
        // We don't start the experience here anymore - we'll let the simulation handle it
    };
    
    // Always simulate progressive loading regardless of actual asset loading
    let simulatedProgress = 0.1;
    const totalLoadingTime = 350; // 350ms total loading time
    const stepInterval = 100; // Update every 100ms for smoother animation
    const progressStep = 0.1 / (totalLoadingTime / stepInterval); // Smaller steps for smoother progress
    
    this.progressInterval = setInterval(() => {
        // Increment progress
        simulatedProgress += progressStep;
        
        if (simulatedProgress <= 1.0) {
            // Update the loading screen
            this.updateGlitchyText(simulatedProgress);
        } else {
            // We've reached 100% in our simulation
            clearInterval(this.progressInterval);
            this.progressInterval = null;
            
            // Ensure all lines are shown
            this.updateGlitchyText(1.0);
            
            // Update loading message
            const loadingMessage = document.getElementById('loading-message');
            if (loadingMessage) {
                loadingMessage.textContent = 'Starting experience...';
            }
            
            // Check if assets are actually loaded
            if (!assetsLoaded) {
                console.log('Simulated loading complete, waiting for actual assets to finish loading...');
                
                // Check every 100ms if assets have loaded
                const checkLoadingInterval = setInterval(() => {
                    if (assetsLoaded) {
                        clearInterval(checkLoadingInterval);
                        // No extra delay here since we've already been waiting for assets
                        this.startExperience();
                    }
                }, 100);
                
                // Failsafe: Start experience after maximum wait time even if assets aren't loaded
                setTimeout(() => {
                    if (!this.experienceStarted) {
                        console.warn('Starting experience despite assets not being fully loaded (timeout)');
                        clearInterval(checkLoadingInterval);
                        this.startExperience();
                    }
                }, 5000); // Maximum 5 additional seconds to wait for assets
            } else {
                // Assets already loaded, add a 1-second delay before starting the experience
                console.log('Assets already loaded, will start experience after 1 second delay...');
                setTimeout(() => {
                    this.startExperience();
                }, 1000);
            }
        }
    }, stepInterval);
}
    
    /**
     * Setup glitchy figlet ASCII art text
     */
    setupGlitchyFigletText() {
        // The figlet ASCII art text for "akadolypse"
        const figletLines = [
            "       _             _       _                      ",
            "  __ _| | ____ _  __| | ___ | |_   _ _ __  ___  ___ ",
            " / _` | |/ / _` |/ _` |/ _ \\| | | | | '_ \\/ __|/ _ \\",
            "| (_| |   < (_| | (_| | (_) | | |_| | |_) \\__ \\  __/",
            " \\__,_|_|\\_\\__,_|\\__,_|\\___/|_|\\__, | .__/|___/\\___|",
            "                               |___/|_|             "
        ];
        
        // Store the lines for use in animation
        this.figletLines = figletLines;
        this.revealedLines = 0;
        
        // Clear existing content
        this.loadingTitle.innerHTML = '';
        
        // Create wrapper div with glitch text effect
        this.loadingTitle.setAttribute('data-text', figletLines.join('\n'));
        this.loadingTitle.className = 'glitch-text horizontal-glitch';
        
        // Initially the content is empty - will be added line by line
        this.loadingTitle.textContent = '';
    }
    
    /**
     * Update glitchy figlet text based on loading progress
     * @param {number} progress - Loading progress from 0 to 1
     */
    updateGlitchyText(progress) {
        // Calculate how many lines should be visible based on progress
        const lineCount = this.figletLines.length;
        const linesToShow = Math.max(1, Math.ceil(progress * lineCount));
        
        if (linesToShow > this.revealedLines || linesToShow < this.revealedLines) {
            console.log(`Updating glitchy text: ${linesToShow}/${lineCount} lines`);
            
            // Build text with all revealed lines
            const visibleLines = this.figletLines.slice(0, linesToShow);
            const textContent = visibleLines.join('\n');
            
            // Update the text content
            this.loadingTitle.textContent = textContent;
            
            // Also update the data-text attribute for the glitch effect
            this.loadingTitle.setAttribute('data-text', textContent);
            
            // Add random glitches
            if (Math.random() < 0.3) {
                this.addRandomGlitch();
            }
            
            this.revealedLines = linesToShow;
        }
    }
    
    /**
     * Add random glitch effect
     */
    addRandomGlitch() {
        // Temporarily intensify glitch effect
        this.loadingTitle.style.animation = 'none';
        
        // Create a corrupted version of the current text
        const currentText = this.loadingTitle.textContent;
        let glitchedText = currentText;
        
        // Choose a random line to corrupt
        const lines = currentText.split('\n');
        if (lines.length > 0) {
            const randomLineIndex = Math.floor(Math.random() * lines.length);
            
            // Corrupt characters in the line
            let corruptedLine = '';
            const originalLine = lines[randomLineIndex];
            
            for (let i = 0; i < originalLine.length; i++) {
                if (Math.random() < 0.1) {
                    // Replace with a random glitchy character
                    const glitchChars = '_/\\|=-+*%$#@!?';
                    corruptedLine += glitchChars.charAt(Math.floor(Math.random() * glitchChars.length));
                } else {
                    corruptedLine += originalLine.charAt(i);
                }
            }
            
            // Replace the line in the array
            lines[randomLineIndex] = corruptedLine;
            glitchedText = lines.join('\n');
        }
        
        // Apply the glitched text briefly
        this.loadingTitle.textContent = glitchedText;
        
        // Reset after a brief moment
        setTimeout(() => {
            // Restore original text
            this.loadingTitle.textContent = currentText;
            
            // Restart animation
            void this.loadingTitle.offsetWidth; // Trigger reflow
            this.loadingTitle.style.animation = '';
        }, 50 + Math.random() * 200);
    }
    
    /**
     * Start the gallery experience
     */
    startExperience() {
        // Prevent multiple calls to startExperience
        if (this.experienceStarted) {
            return;
        }
        
        console.log("Starting gallery experience");
        this.experienceStarted = true;
        
        // Clean up the progress interval if it's still running
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        
        // Fade out loading screen
        this.loadingScreen.style.opacity = '0';
        setTimeout(() => {
            this.loadingScreen.style.display = 'none';
        }, 500);
        
        // Start intro camera path
        this.cameraController.startIntroAnimation();
    }
    
    /**
     * Initialize Three.js scene
     */
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
    }
    
    /**
     * Initialize camera
     */
    initCamera() {
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 10);
        this.camera.lookAt(0, 1.6, 0);
    }
    
    /**
     * Initialize renderer
     */
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.canvasContainer.appendChild(this.renderer.domElement);
    }
    
    /**
     * Load artwork into the gallery
     */
    async loadArtwork() {
        // Get sample artwork data
        const artworkData = this.artworkManager.getSampleArtworkData();
        
        // Load artwork
        this.artPieces = await this.artworkManager.loadArtwork(artworkData);
    }
    
    /**
     * Show artwork information when focusing on an artwork
     * @param {THREE.Object3D} artwork - The artwork being focused on
     */
    showArtworkInfo(artwork) {
        this.artworkInfo = document.getElementById('artwork-info');
        const titleElement = this.artworkInfo.querySelector('.artwork-title');
        const yearElement = this.artworkInfo.querySelector('.artwork-year');
        const descriptionElement = this.artworkInfo.querySelector('.artwork-description');
        
        titleElement.textContent = artwork.userData.title;
        yearElement.textContent = artwork.userData.year;
        descriptionElement.textContent = artwork.userData.description;
        
        UI.fadeIn(this.artworkInfo);


    }
    
    
/**
 * Hide artwork information when looking away
 */
hideArtworkInfo() {
    // Make sure we have a reference to the artwork info element
    if (!this.artworkInfo) {
        this.artworkInfo = document.getElementById('artwork-info');
    }
    
    // Only proceed if the element exists and is not already hidden
    if (this.artworkInfo && !this.artworkInfo.classList.contains('hidden')) {
        console.log('Fading out artwork info'); // Debug log
        UI.fadeOut(this.artworkInfo);
    }
}

    
    /**
     * Check for collisions with walls and artwork
     * @param {THREE.Vector3} position - Position to check
     * @param {number} radius - Collision radius
     * @returns {boolean} - True if collision detected
     */
    checkCollisions(position, radius) {
        // Check wall collisions
        for (const wall of this.walls) {
            const wallBox = new THREE.Box3().setFromObject(wall);
            const wallCenter = new THREE.Vector3();
            wallBox.getCenter(wallCenter);
            
            const closestPoint = new THREE.Vector3().copy(position);
            
            closestPoint.x = Math.max(wallBox.min.x, Math.min(closestPoint.x, wallBox.max.x));
            closestPoint.y = Math.max(wallBox.min.y, Math.min(closestPoint.y, wallBox.max.y));
            closestPoint.z = Math.max(wallBox.min.z, Math.min(closestPoint.z, wallBox.max.z));
            
            const distance = closestPoint.distanceTo(position);
            
            if (distance < radius) {
                return true;
            }
        }
        
        // Check artwork collisions
        return this.artworkManager.checkCollisions(position, radius);
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const delta = this.clock.getDelta();
        
        // Update camera controller
        this.cameraController.update(
            delta,
            this.artPieces,
            this.checkCollisions.bind(this),
            this.showArtworkInfo.bind(this),
            this.hideArtworkInfo.bind(this)
        );
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}


// Hide artwork info on keyboard input
document.addEventListener('keydown', function(e) {
    const artworkInfo = document.getElementById('artwork-info');
    if (artworkInfo && !artworkInfo.classList.contains('hidden')) {
        console.log('Hiding artwork info - keyboard input');
        // Direct DOM manipulation
        artworkInfo.style.opacity = 0;
        setTimeout(function() {
            artworkInfo.classList.add('hidden');
        }, 300);
    }
});

// Hide artwork info on mouse movement
document.addEventListener('mousemove', function(e) {
    if (document.pointerLockElement) {
        const artworkInfo = document.getElementById('artwork-info');
        if (artworkInfo && !artworkInfo.classList.contains('hidden')) {
            console.log('Hiding artwork info - mouse movement');
            // Direct DOM manipulation
            artworkInfo.style.opacity = 0;
            setTimeout(function() {
                artworkInfo.classList.add('hidden');
            }, 300);
        }
    }
});

// Create and initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create a single instance of the app and make it globally accessible for debugging
    window.artPortfolioApp = new ArtPortfolioApp();
});