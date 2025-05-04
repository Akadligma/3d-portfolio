import * as THREE from 'three';
import { Easing } from './utils.js';

/**
 * A simplified camera controller with smooth transitions
 */
export class CameraController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        
        // Core settings
        this.moveSpeed = 0.04;
        this.sprintSpeed = 0.06;
        this.mouseSensitivity = 0.001;
        this.playerHeight = 1.6;
        
        // State tracking
        this.keys = {};                   // Keyboard state
        this.pointerLocked = false;       // Is pointer locked
        this.lastActiveTime = Date.now();
        this.idleThreshold = 3000;        // Time until idle in ms
        
        // Camera mode
        this.isNaturalMode = false;       // Simple toggle between natural/manual mode
        this.naturalIntensity = 0;        // How much natural movement to apply (0-1)
        this.inTransition = false;        // Are we transitioning between modes
        this.transitionStartTime = 0;     // When the transition started
        this.transitionDuration = 800;    // Duration of transition in ms
        this.isTourMode = false;          // Is guided tour active
        
        // Camera orientation
        this.yaw = 0;                     // Horizontal rotation (y-axis)
        this.pitch = 0;                   // Vertical rotation (x-axis)
        
        // Natural movement parameters
        this.breathePhase = Math.random() * Math.PI * 2;  // Random starting phase
        this.wigglePhase = Math.random() * Math.PI * 2;   // Random starting phase
        this.breatheAmount = 0.008;
        this.wiggleAmount = 0.015;
        
        // Tour parameters
        this.tourPath = null;             // Spline for camera path
        this.tourLookPoints = [];         // Points to look at during tour
        this.tourProgress = 0;            // Progress along tour (0-1)
        this.tourDuration = 150;        // Tour duration in ms
        this.tourStartTime = null;        // When tour started
        
        // Artwork focus
        this.focusedArtwork = null;       // Currently focused artwork
        this.lastScanTime = 0;            // Last time we scanned for artworks
        this.scanInterval = 2000;         // How often to scan for artworks (ms)
        this.lookAwayTimer = 0;           // Time until look away
        this.lookBackTimer = 0;           // Time until look back
        this.lookAwayPoint = null;        // Point to look at when looking away
        this.userTriggeredBlur = false;   // Flag to indicate if blur was triggered by user
        
        // Look animation
        this.lookAnimation = {
            active: false,
            startTime: 0,
            duration: 0,
            startYaw: 0,
            startPitch: 0,
            targetYaw: 0, 
            targetPitch: 0
        };
        
        // Initialize camera orientation
        this.initOrientation();
        
        // Setup event listeners
        this.setupListeners();
    }
    
    /**
     * Extract current orientation from camera
     */
    initOrientation() {
        // Create a directional vector pointing forward
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        
        // Extract yaw and pitch angles
        this.yaw = Math.atan2(-direction.x, -direction.z);
        const xzLength = Math.sqrt(direction.z * direction.z + direction.x * direction.x);
        this.pitch = Math.atan2(direction.y, xzLength);
        
        // Apply orientation to camera to ensure consistency
        this.applyOrientationToCamera();
    }
    
    /**
     * Apply orientation to camera
     */
    applyOrientationToCamera() {
        // Create a quaternion for the orientation
        const quaternion = new THREE.Quaternion();
        
        // First rotate around Y (yaw), then around X (pitch)
        const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        const pitchQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
        
        // Combine rotations (order matters)
        quaternion.multiplyQuaternions(yawQ, pitchQ);
        
        // Apply to camera
        this.camera.quaternion.copy(quaternion);
    }
    
    /**
     * Set up event listeners
     */
    setupListeners() {
        // Keyboard input
        document.addEventListener('keydown', e => {
            this.keys[e.key.toLowerCase()] = true;
            // User activity should trigger artwork info fadeout
            if (this.focusedArtwork) {
                this.userTriggeredBlur = true;
            }
            this.registerActivity();
        });
        
        document.addEventListener('keyup', e => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse movement
        document.addEventListener('mousemove', e => {
            if (!this.pointerLocked) return;
            
            // When mouse moves, always switch to manual mode immediately
            if (this.isNaturalMode) {
                this.isNaturalMode = false;
                this.naturalIntensity = 0;
                this.inTransition = false;
                
                // Set flag that user triggered the blur
                if (this.focusedArtwork) {
                    this.userTriggeredBlur = true;
                }
                
                // Cancel any active look animation
                this.lookAnimation.active = false;
                
                // Clear focused artwork
                this.focusedArtwork = null;
                this.lookAwayTimer = 0;
                this.lookBackTimer = 0;
            }
            
            const movementX = e.movementX || e.mozMovementX || 0;
            const movementY = e.movementY || e.mozMovementY || 0;
            
            // Update orientation based on mouse movement
            this.yaw -= movementX * this.mouseSensitivity;
            this.pitch -= movementY * this.mouseSensitivity;
            
            // Clamp pitch to prevent flipping
            this.pitch = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05, this.pitch));
            
            // Apply the new orientation
            this.applyOrientationToCamera();
            this.registerActivity();
        });
        
        // Mouse click for pointer lock
        this.domElement.addEventListener('click', () => {
            if (!this.pointerLocked && !this.isTourMode) {
                this.domElement.requestPointerLock();
            }
        });
        
        // Pointer lock change
        document.addEventListener('pointerlockchange', () => {
            this.pointerLocked = document.pointerLockElement === this.domElement;
        });
        
        // ESC to toggle pointer lock
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                if (document.pointerLockElement === this.domElement) {
                    document.exitPointerLock();
                } else if (!this.isTourMode) {
                    this.domElement.requestPointerLock();
                }
            }
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            if (this.camera.aspect) {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
            }
        });
    }
    
    /**
     * Register user activity
     */
    registerActivity() {
        this.lastActiveTime = Date.now();
        // If in natural mode, switch to manual mode
        if (this.isNaturalMode && !this.inTransition) {
            // Set the user-triggered blur flag
            this.userTriggeredBlur = true;
            this.startTransition(false); // transition to manual mode
        }
    }
    
    /**
     * Start transition between manual and natural modes
     */
    startTransition(toNatural) {
        if (this.inTransition) return;
        
        this.inTransition = true;
        this.transitionStartTime = Date.now();
        this.isNaturalMode = toNatural;
        
        // If we're going to natural mode, read the current camera orientation
        // to ensure smooth transition
        if (toNatural) {
            // Read current orientation from camera
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(this.camera.quaternion);
            
            this.yaw = Math.atan2(-direction.x, -direction.z);
            const xzLength = Math.sqrt(direction.z * direction.z + direction.x * direction.x);
            this.pitch = Math.atan2(direction.y, xzLength);
        }
    }
    
    /**
     * Update transition between modes
     */
    updateTransition() {
        if (!this.inTransition) return;
        
        const elapsed = Date.now() - this.transitionStartTime;
        const progress = Math.min(1.0, elapsed / this.transitionDuration);
        
        if (this.isNaturalMode) {
            // Transitioning to natural mode - slow start
            this.naturalIntensity = Easing.easeInOutCubic(progress);
        } else {
            // Transitioning to manual mode - quick falloff
            this.naturalIntensity = 1 - progress * progress;
        }
        
        // End transition when complete
        if (progress >= 1.0) {
            this.inTransition = false;
            this.naturalIntensity = this.isNaturalMode ? 1 : 0;
        }
    }
    
    /**
     * Apply natural camera movements
     */
    applyNaturalMovement(delta) {
        // Skip if no natural movement
        if (this.naturalIntensity <= 0) return;
        
        // Update phases
        this.breathePhase += delta * 0.3;
        this.wigglePhase += delta * 0.2;
        
        // Wrap phases
        if (this.breathePhase > Math.PI * 2) this.breathePhase -= Math.PI * 2;
        if (this.wigglePhase > Math.PI * 2) this.wigglePhase -= Math.PI * 2;
        
        // Calculate movement offsets
        const intensity = this.naturalIntensity;
        const breathe = Math.sin(this.breathePhase) * this.breatheAmount * intensity;
        const wiggleX = Math.sin(this.wigglePhase) * this.wiggleAmount * intensity;
        const wiggleY = Math.cos(this.wigglePhase * 1.3) * this.wiggleAmount * 0.7 * intensity;
        
        // Create a temporary quaternion for the base orientation
        const baseQuat = new THREE.Quaternion();
        const yawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        const pitchQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
        baseQuat.multiplyQuaternions(yawQ, pitchQ);
        
        // Create quaternions for the offset
        const offsetYawQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), wiggleX);
        const offsetPitchQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), wiggleY + breathe);
        
        // Combine base orientation with offsets
        const finalQuat = new THREE.Quaternion().copy(baseQuat);
        finalQuat.multiply(offsetYawQ);
        finalQuat.multiply(offsetPitchQ);
        
        // Apply to camera
        this.camera.quaternion.copy(finalQuat);
        
        // Apply subtle position change for breathing
        this.camera.position.y += breathe * 0.05;
    }
    
    /**
     * Helper function for quintic easing - creates a very gradual curve
     */
    easeOutQuint(t) {
        return 1 - Math.pow(1 - t, 5);
    }
    
    /**
     * Update look animation
     */
    updateLookAnimation() {
        if (!this.lookAnimation.active) return;
        
        const elapsed = Date.now() - this.lookAnimation.startTime;
        const progress = Math.min(1.0, elapsed / this.lookAnimation.duration);
        
        if (progress >= 1.0) {
            // Animation complete
            this.yaw = this.lookAnimation.targetYaw;
            this.pitch = this.lookAnimation.targetPitch;
            this.lookAnimation.active = false;
        } else {
            // Calculate smooth progress using a more gradual easing function
            // Using a custom quintic easing for very slow, gentle movement
            const t = this.easeOutQuint(progress);
            
            // Find shortest path for yaw (handling wraparound)
            let yawDiff = this.lookAnimation.targetYaw - this.lookAnimation.startYaw;
            if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
            if (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
            
            // Interpolate angles
            this.yaw = this.lookAnimation.startYaw + yawDiff * t;
            this.pitch = this.lookAnimation.startPitch + (this.lookAnimation.targetPitch - this.lookAnimation.startPitch) * t;
        }
        
        // Apply the current animation frame
        this.applyOrientationToCamera();
    }
    
    /**
     * Add a smooth look transition to a target point
     */
    smoothLookAt(target, duration = 3.0) {
        // Calculate direction to target
        const direction = new THREE.Vector3().subVectors(target, this.camera.position).normalize();
        
        // Calculate target yaw and pitch
        const targetYaw = Math.atan2(-direction.x, -direction.z);
        const xzLength = Math.sqrt(direction.z * direction.z + direction.x * direction.x);
        const targetPitch = Math.atan2(direction.y, xzLength);
        
        // Create a simple animation
        this.lookAnimation = {
            startTime: Date.now(),
            duration: duration * 1000, // convert to ms
            startYaw: this.yaw,
            startPitch: this.pitch,
            targetYaw: targetYaw,
            targetPitch: targetPitch,
            active: true
        };
    }
    
    /**
     * Setup camera path for guided tour
     */
    setupCameraPath(pathPoints, lookPoints) {
        this.tourPath = new THREE.CatmullRomCurve3(pathPoints);
        this.tourLookPoints = lookPoints;
    }
    
    /**
     * Start the camera guided tour
     */
    startIntroAnimation() {
        this.tourStartTime = Date.now();
        this.isTourMode = true;
        this.tourProgress = 0;
    }
    
    /**
     * Update the camera tour animation
     */
    updateTour(delta) {
        if (!this.isTourMode || !this.tourPath) return;
        
        const elapsedTime = Date.now() - this.tourStartTime;
        const rawProgress = Math.min(elapsedTime / this.tourDuration, 1);
        this.tourProgress = Easing.easeInOutCubic(rawProgress);
        
        // Move camera along path
        const position = this.tourPath.getPointAt(this.tourProgress);
        this.camera.position.copy(position);
        
        // Determine which point to look at
        const lookIndex = Math.floor(this.tourProgress * this.tourLookPoints.length);
        const lookPoint = this.tourLookPoints[Math.min(lookIndex, this.tourLookPoints.length - 1)];
        
        // Look at the point
        this.lookAt(lookPoint);
        
        // End tour when complete
        if (rawProgress >= 1) {
            this.isTourMode = false;
        }
    }
    
    /**
     * Look at a specific point
     */
    lookAt(target) {
        // Calculate direction to target
        const direction = new THREE.Vector3().subVectors(target, this.camera.position).normalize();
        
        // Calculate yaw and pitch to look at target
        this.yaw = Math.atan2(-direction.x, -direction.z);
        const xzLength = Math.sqrt(direction.z * direction.z + direction.x * direction.x);
        this.pitch = Math.atan2(direction.y, xzLength);
        
        // Apply to camera
        this.applyOrientationToCamera();
    }
    
    /**
     * Check if an artwork is in the camera's field of view
     */
    isArtworkInView(artwork) {
        if (!artwork) return false;
        
        // Get camera forward direction
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.camera.quaternion);
        
        // Calculate direction to artwork
        const artworkDir = new THREE.Vector3().subVectors(artwork.position, this.camera.position).normalize();
        
        // Check if in field of view
        const dot = forward.dot(artworkDir);
        if (dot < 0.5) return false; // Not in ~60° cone of vision
        
        // Check distance
        const distance = this.camera.position.distanceTo(artwork.position);
        const viewDist = artwork.userData?.viewingDistance || 5;
        if (distance > viewDist * 2) return false;
        
        return true;
    }
    
    /**
     * Find artwork in view
     */
    findArtworkInView(artworks) {
        if (!artworks || !artworks.length) return null;
        
        let bestArtwork = null;
        let bestScore = -1;
        
        for (const art of artworks) {
            if (!this.isArtworkInView(art)) continue;
            
            // Calculate score based on distance and how centered it is
            const distance = this.camera.position.distanceTo(art.position);
            
            // Get direction to artwork
            const artworkDir = new THREE.Vector3().subVectors(
                art.position, 
                this.camera.position
            ).normalize();
            
            // Get camera forward direction
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(this.camera.quaternion);
            
            // Calculate centeredness
            const centeredness = forward.dot(artworkDir);
            
            // Score: centeredness is more important than distance
            const score = centeredness * 3 - (distance * 0.1);
            
            if (score > bestScore) {
                bestScore = score;
                bestArtwork = art;
            }
        }
        
        return bestArtwork;
    }
    
    /**
     * Update artwork focus behavior
     */
    updateArtworkFocus(delta, artworks, onFocusArtwork, onBlurArtwork) {
        // Only active in natural mode
        if (!this.isNaturalMode) {
            // Clear any focused artwork when leaving natural mode
            if (this.focusedArtwork) {
                // Only fade out the UI if triggered by user interaction
                if (this.userTriggeredBlur && onBlurArtwork) {
                    onBlurArtwork(this.focusedArtwork);
                }
                this.focusedArtwork = null;
                this.lookAwayTimer = 0;
                this.lookBackTimer = 0;
                this.lookAwayPoint = null;
                this.userTriggeredBlur = false;
            }
            return;
        }
        
        // If we already have a focused artwork, just maintain that focus
        // and don't search for a new one
        if (this.focusedArtwork) {
            // Update timers
            this.lookAwayTimer -= delta;
            
            // Handle looking away from artwork briefly
            if (this.lookAwayTimer <= 0 && this.lookBackTimer <= 0) {
                // Time to look slightly away
                const artwork = this.focusedArtwork;
                const lookAwayPoint = artwork.position.clone();
                
                // Add random offset (subtle)
                lookAwayPoint.x += (Math.random() - 0.5) * 0.7;
                lookAwayPoint.y += (Math.random() - 0.5) * 0.3;
                lookAwayPoint.z += (Math.random() - 0.5) * 0.2;
                
                this.lookAwayPoint = lookAwayPoint;
                this.lookBackTimer = 1 + Math.random() * 1.5;
                
                // Gradually look at the offset point (slow transition)
                this.smoothLookAt(lookAwayPoint, 3.0);
            } 
            // Handle looking back at artwork
            else if (this.lookBackTimer > 0) {
                this.lookBackTimer -= delta;
                
                if (this.lookBackTimer <= 0) {
                    // Time to look back at artwork
                    this.lookAwayTimer = 3 + Math.random() * 4;
                    
                    // Gradually look back at the artwork (slow transition)
                    this.smoothLookAt(this.focusedArtwork.position, 3.0);
                }
            }
            return;
        }
        
        // Only search for artwork if we don't already have one focused
        // This runs just once when entering natural mode
        const currentTime = Date.now();
        const timeSinceLastScan = currentTime - this.lastScanTime;
        
        if (timeSinceLastScan > this.scanInterval) {
            this.lastScanTime = currentTime;
            
            const bestArtwork = this.findArtworkInView(artworks);
            
            // Handle focus change (only if we don't already have an artwork)
            if (bestArtwork) {
                // Set new focused artwork
                this.focusedArtwork = bestArtwork;
                this.userTriggeredBlur = false;
                
                // Notify about gaining focus
                if (onFocusArtwork) {
                    onFocusArtwork(bestArtwork);
                }
                
                // Reset timers for natural viewing pattern
                this.lookAwayTimer = 4 + Math.random() * 3;
                this.lookBackTimer = 0;
                
                // Gradually look at the artwork (very slow to prevent jumping)
                this.smoothLookAt(bestArtwork.position, 4.0);
            }
        }
    }
    
    /**
     * Handle camera movement based on keyboard input
     */
    handleMovement(delta, collisionCheck) {
        if (this.isTourMode || (!this.pointerLocked && !this.isNaturalMode)) return;
        
        // Determine movement speed
        const currentSpeed = this.keys['shift'] ? this.sprintSpeed : this.moveSpeed;
        const stepDistance = currentSpeed * delta * 100;
        
        // Calculate movement direction
        const direction = new THREE.Vector3(0, 0, 0);
        if (this.keys['w']) direction.z -= 1;
        if (this.keys['s']) direction.z += 1;
        if (this.keys['a']) direction.x -= 1;
        if (this.keys['d']) direction.x += 1;
        
        // Skip if no movement
        if (direction.length() === 0) return;
        
        // Normalize for consistent diagonal speed
        direction.normalize();
        
        // Apply camera yaw to movement (but not pitch)
        // This ensures we always move parallel to the ground
        const yawOnlyQuaternion = new THREE.Quaternion();
        yawOnlyQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        direction.applyQuaternion(yawOnlyQuaternion);
        
        // Save original position for collision detection
        const originalPos = this.camera.position.clone();
        
        // Apply movement
        this.camera.position.x += direction.x * stepDistance;
        this.camera.position.z += direction.z * stepDistance;
        
        // Check for collisions
        if (collisionCheck && collisionCheck(this.camera.position, 0.5)) {
            // Revert to original position on collision
            this.camera.position.copy(originalPos);
        }
        
        // Register as activity
        this.registerActivity();
    }
    
    /**
     * Main update method called every frame
     */
    update(delta, artPieces, collisionCheck, onFocusArtwork, onBlurArtwork) {
        // Check for state transitions
        const currentTime = Date.now();
        const isIdle = (currentTime - this.lastActiveTime) > this.idleThreshold;
        
        // Handle guided tour if active
        if (this.isTourMode) {
            this.updateTour(delta);
            return;
        }
        
        // Start natural movement when idle (only if not already in natural mode or transitioning)
        if (isIdle && !this.isNaturalMode && !this.inTransition) {
            this.startTransition(true);
        }
        
        // Update any active transition
        this.updateTransition();
        
        // Update look animation if active
        this.updateLookAnimation();
        
        // Apply natural movement if active or transitioning
        if (this.isNaturalMode || this.naturalIntensity > 0) {
            this.applyNaturalMovement(delta);
        } else {
            // In full manual mode, apply direct orientation
            this.applyOrientationToCamera();
        }
        
        // Update artwork focus in natural mode
        if (this.isNaturalMode) {
            this.updateArtworkFocus(delta, artPieces, onFocusArtwork, onBlurArtwork);
        }
        
        // Handle movement from keyboard
        this.handleMovement(delta, collisionCheck);
    }
}