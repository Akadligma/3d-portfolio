import * as THREE from 'three';

/**
 * Mathematical easing functions for animations
 */
export const Easing = {
    /**
     * Cubic ease-in-out function
     * @param {number} t - Input value between 0 and 1
     * @returns {number} - Eased value between 0 and 1
     */
    easeInOutCubic: (t) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    
    /**
     * Quadratic ease-in-out function
     * @param {number} t - Input value between 0 and 1
     * @returns {number} - Eased value between 0 and 1
     */
    easeInOutQuad: (t) => {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    },
    
    /**
     * Sinusoidal ease-in-out function
     * @param {number} t - Input value between 0 and 1
     * @returns {number} - Eased value between 0 and 1
     */
    easeInOutSine: (t) => {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }
};

/**
 * Collision detection utility functions
 */
export const Collision = {
    /**
     * Check if a position is within a box
     * @param {THREE.Vector3} position - Position to check
     * @param {THREE.Box3} box - Bounding box
     * @param {number} margin - Margin to add around the box
     * @returns {boolean} - True if position is within box
     */
    isPositionInBox: (position, box, margin = 0) => {
        return (
            position.x >= box.min.x - margin &&
            position.x <= box.max.x + margin &&
            position.y >= box.min.y - margin &&
            position.y <= box.max.y + margin &&
            position.z >= box.min.z - margin &&
            position.z <= box.max.z + margin
        );
    },
    
    /**
     * Find closest point on a box to a position
     * @param {THREE.Vector3} position - Position to check
     * @param {THREE.Box3} box - Bounding box
     * @returns {THREE.Vector3} - Closest point on the box
     */
    closestPointOnBox: (position, box) => {
        const clampedPoint = new THREE.Vector3();
        
        clampedPoint.x = Math.max(box.min.x, Math.min(position.x, box.max.x));
        clampedPoint.y = Math.max(box.min.y, Math.min(position.y, box.max.y));
        clampedPoint.z = Math.max(box.min.z, Math.min(position.z, box.max.z));
        
        return clampedPoint;
    },
    
    /**
     * Check if a sphere intersects with a box
     * @param {THREE.Vector3} sphereCenter - Center of the sphere
     * @param {number} sphereRadius - Radius of the sphere
     * @param {THREE.Box3} box - Bounding box
     * @returns {boolean} - True if sphere intersects box
     */
    sphereIntersectsBox: (sphereCenter, sphereRadius, box) => {
        const closestPoint = Collision.closestPointOnBox(sphereCenter, box);
        const distance = closestPoint.distanceTo(sphereCenter);
        
        return distance < sphereRadius;
    }
};

/**
 * UI helper functions
 */
export const UI = {
    /**
     * Show an element with fade-in animation
     * @param {HTMLElement} element - Element to show
     * @param {number} duration - Duration of fade-in animation in ms
     */
    fadeIn: (element, duration = 300) => {
        element.style.opacity = 0;
        element.style.display = 'block';
        element.classList.remove('hidden');
        
        let start = null;
        
        function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            
            element.style.opacity = Math.min(progress / duration, 1);
            
            if (progress < duration) {
                window.requestAnimationFrame(animate);
            }
        }
        
        window.requestAnimationFrame(animate);
    },
    
    /**
     * Hide an element with fade-out animation
     * @param {HTMLElement} element - Element to hide
     * @param {number} duration - Duration of fade-out animation in ms
     */
    fadeOut: (element, duration = 300) => {
        let start = null;
        
        function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            
            element.style.opacity = Math.max(1 - progress / duration, 0);
            
            if (progress < duration) {
                window.requestAnimationFrame(animate);
            } else {
                element.classList.add('hidden');
            }
        }
        
        window.requestAnimationFrame(animate);
    }
};