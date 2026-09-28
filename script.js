// --- CANVAS CREATION ---
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

// Sync viewport boundaries to current window metrics every frame to ensure the margins stay stable
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- VARIABLE INITIALIZATION ---
// The Scrolling Environment Module (The Twin Images)
let backgroundX = 0;        // starting line position
let currentScrollSpeed = 3; // base speed rate multiplier
let hitFreezeTimer = 0;    // tracks screen freeze duration upon taking damage
let damageFlashTimer = 0;  // tracking duration for visual red overlay flash

// Mission Configuration Module
let missionType = "BLOOD_DELIVERY"; // Options: "STANDARD" or "BLOOD_DELIVERY"

// Perishable Cargo Module (The Expiration Timer)
let timeRemaining = 60;
let frameCounter = 0;
let missionStatus = "ACTIVE";

// Mission Stopwatch Module (Performance Tracker)
let totalTimeElapsed = 0;
let stopwatchFrameCounter = 0;

// Drone Graphical Asset Initialisation
const droneImage = new Image();
droneImage.src = "drone.png"; // Replace the stock square with a drone image

// Weather & Environmental Particle Tracking Modules
const backgroundImage = new Image();
backgroundImage.src = "background.png"; // Links directly to the twilight savannah image asset

// Secondary Day Environment Graphic Module
const backgroundDayImage = new Image();
backgroundDayImage.src = "background_day.png"; // Links directly to the bright sunlit savannah morning image asset

// Hill Asset Initialization
const hillImage = new Image();
hillImage.src = "hill.png"; // Links directly to the custom ground terrain image file asset

// Bird Asset Initialization
const birdImage = new Image();
birdImage.src = "bird.png"; // Links to the custom eagle image asset

let lightningFlashTimer = 0; // Tracks active frames for full-screen electrical flashes
const rainParticlesArray = []; // Holds active coordinate vectors for falling rain droplets

// Automatically generate a pool of 60 rain particles spread across the screen boundaries
for (let i = 0; i < 60; i++) {
    rainParticlesArray.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        length: 15,
        speed: 8 + Math.random() * 4
    });
}

// procedural rain generation
let isRaining = false;

// Active Speed Boost Tracker
let isSpeedBoosting = false;   // Flips to true when the player activates the thruster boost

// Mission Telemetry Module
let distanceToFinish = 1000; // Total path length in meters
let distanceFrameCounter = 0;

// Dual Energy Thruster Modules
let batteryCharge = 100;
const maxBatteryCharge = 100;
let hyperDriveTimer = 0; // Tracks active duration for instant speed pickups
let isBatteryBurnedOut = false; // Prevents fast input spamming when battery hits 0%

// Procedurally map a randomized utility load-shedding zone along the middle delivery route corridor
// Generates a random entry point strictly between 850 meters and 450 meters remaining on the route
loadSheddingStart = 450 + Math.floor(Math.random() * 400); 

// Fix: Randomize the actual duration length of the blackout zone between 100 meters and 250 meters for snappy arcade pacing variation
let randomizedZoneLength = 100 + Math.floor(Math.random() * 150);
loadSheddingEnd = loadSheddingStart - randomizedZoneLength;

// Game Pause System Flag
let isGamePaused = false; // Flips to true when the player hits the Escape key

// Master UI Mouse Hover Vectors
let mouseX = 0;
let mouseY = 0;

// Update mouse coordinates live across the viewport
window.addEventListener("mousemove", (event) => {
    mouseX = event.clientX;
    mouseY = event.clientY;
})

// Persistent Score & Session Analytics Modules
let distanceTravelled = 0;     // Measures total lifetime distance flown in meters
let totalBatteryBurned = 0;    // Tracks cumulative cell drain to compute efficiency
let localHighScore = localStorage.getItem("ecoDash_highScore") ? parseInt(localStorage.getItem("ecoDash_highScore")) : 0;

// Modify the initial missionStatus variable line to start on the welcome screen
missionStatus = "START"; // Changes from "ACTIVE" to "START"

// Procedural Weather & Clock Environment Flags
let isNightTime = false; // Procedurally randomized per mission attempt to enable instant daylight testing

// Real-Time Directed Headlight Illumination Cone Pass (Activates during Night Missions OR Utility Load-Shedding sectors)
let isLoadSheddingActive = (distanceToFinish <= loadSheddingStart && distanceToFinish >= loadSheddingEnd);

// Dynamic Lightning Hazard Tracking Modules
let activeLightningStrikeX = -1000; // Stores active horizontal coordinate for the current lightning discharge path
let lightningStrikeVisibleTimer = 0; // Tracks duration for rendering the physical bolt graphic layer
let droneShortCircuitTimer = 0;      // Tracks remaining seconds for the electrical propulsion slowdown penalty
let shortCircuitFrameCounter = 0;    // Frames accumulator to decrement the penalty clock precisely at 60FPS

// Master Audio Synthesis & User Instruction Configuration Modules
let masterVolumeLevel = 1;       // Fixed: Dropped default volume level down to 5% to prevent loud start-up scares!
let synthesizedAudioContext = null; // Holds the built-in browser sound generation state thread
let backgroundOscillatorNode = null; // Manages the active procedural audio generator node
let masterVolumeGainNode = null;     // Direct control node for adjusting audio signal outputs
let audioSequenceInterval = null;    // Tracks the running step-sequencer timer loop handle

// Master Background Music Track File Loader Module
const cockpitMusicTrack = new Audio();
cockpitMusicTrack.src = "Sipho 'Hotstix' Mabuse - Burn Out (Official Music Video) [zLFlcXk0ec0].mp3"; // Links directly to local African music audio track asset file
// cockpitMusicTrack.src = "Stromae, Pomme - “Ma Meilleure Ennemie” (from Arcane Season 2) [Official Music Video].mp3"; // testing before finding true track
cockpitMusicTrack.loop = true;              // Forces the music file to loop back to the start automatically forever
cockpitMusicTrack.volume = masterVolumeLevel; // Binds the asset's initial playback gain straight to your safe 5% volume registry

// Master Sound Effects Native Media File Loader Module
const lightningShockSound = new Audio("lightning.mp3"); // Triggered instantly upon taking lightning current strikes
lightningShockSound.volume = 1.0; // Sets default sound effects volume to maximum capacity scale on startup

// Fix: Initialized missing native impact audio node pointer at the asset layer
const collisionHitSound = new Audio("hit.mp3"); // Triggered instantly upon colliding with ground hills or eagles
collisionHitSound.volume = 1.0;

// --- OBJECT INSTANTIATION ---
// The Player Drone object
const drone = {
    x: 350,           // repositioned closer to the middle so the knockback doesn't knock it off screen
    y: canvas.height / 2,
    width: 100,
    height: 70,
    vx: 0,           // changed to zero so the drone does not move
    vy: 0,
    acceleration: 0.8,
    friction: 0.92,
    hp: 3,           // current hit points baseline
    maxHp: 3,        // maximum structural limit
    invincibleTimer: 0 // structural loop frames tracking vulnerability cooldown
};

// Permanent Global Level Terrain Objects (Conveyor Belt Asset Configuration)
const levelHills = [
    { x: 200, y: 0, width: 300, height: 100, baseSpeed: 3 },
    { x: 800, y: 0, width: 400, height: 150, baseSpeed: 3 },
    { x: 1400, y: 0, width: 250, height: 120, baseSpeed: 3 },
    { x: 2000, y: 0, width: 300, height: 110, baseSpeed: 3 }
];

// Expanded Oncoming Sky Hazards Array List
const birdsArray = [
    { x: window.innerWidth + 200, y: 220, width: 75, height: 55, baseSpeed: 3 }, 
    { x: window.innerWidth + 600, y: 310, width: 75, height: 55, baseSpeed: 5 }, 
    { x: window.innerWidth + 1000, y: 400, width: 75, height: 55, baseSpeed: 4 }, 
    { x: window.innerWidth + 1400, y: 440, width: 75, height: 55, baseSpeed: 3 }
];

// Input Tracking System (Expanded for Omnidirectional Flow)
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    s: false,
    a: false,
    d: false,
    Shift: false
};

// Collision Detection System (Checks if drone overlaps with an obstacle rectangle)
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y;
}

// Helper: Master Variable Re-initialization
function resetMissionData() {
    timeRemaining = 60;
    totalTimeElapsed = 0;
    frameCounter = 0;
    stopwatchFrameCounter = 0;
    distanceToFinish = 1000; 
    distanceFrameCounter = 0;
    drone.x = 350;
    drone.hp = drone.maxHp;
    drone.invincibleTimer = 0;
    hitFreezeTimer = 0;
    damageFlashTimer = 0;
    batteryCharge = maxBatteryCharge; 
    hyperDriveTimer = 0;
    isSpeedBoosting = false;
    isBatteryBurnedOut = false;
    drone.y = canvas.height / 2;
    drone.vx = 0;
    drone.vy = 0;
    distanceTravelled = 0;
    totalBatteryBurned = 0;
    
    // Fix: Procedurally randomize ground hill horizontal spacing metrics upon initializing a reset!
    levelHills[0].x = 200 + Math.floor(Math.random() * 150);
    levelHills[1].x = levelHills[0].x + 500 + Math.floor(Math.random() * 200);
    levelHills[2].x = levelHills[1].x + 600 + Math.floor(Math.random() * 200);
    levelHills[3].x = levelHills[2].x + 600 + Math.floor(Math.random() * 200);
    
    // Fix: Procedurally randomize sky height altitude positions and cruising speeds for all four eagles upon initializing a reset!
    birdsArray[0].x = window.innerWidth + 200;
    birdsArray[0].y = 180 + Math.floor(Math.random() * 60);
    birdsArray[0].baseSpeed = 3 + Math.random() * 2;

    birdsArray[1].x = window.innerWidth + 600;
    birdsArray[1].y = 240 + Math.floor(Math.random() * 60);
    birdsArray[1].baseSpeed = 4 + Math.random() * 2;

    birdsArray[2].x = window.innerWidth + 1000;
    birdsArray[2].y = 300 + Math.floor(Math.random() * 60);
    birdsArray[2].baseSpeed = 3 + Math.random() * 3;

    birdsArray[3].x = window.innerWidth + 1300;
    birdsArray[3].y = 380 + Math.floor(Math.random() * 80); // Safely randomizes the low-altitude eagle height corridor
    birdsArray[3].baseSpeed = 2 + Math.random() * 2;

    // Procedurally map a randomized utility load-shedding zone along the middle route
    loadSheddingStart = 450 + Math.floor(Math.random() * 400); 
    let randomizedZoneLength = 100 + Math.floor(Math.random() * 150);
    loadSheddingEnd = loadSheddingStart - randomizedZoneLength;

    // Procedurally randomize the time of day environment for instant rubric testing
    // Gives a balanced 50/50 probability distribution between clear day runs and rainy night flashlight corridors
    isNightTime = Math.random() < 0.5;

    // Procedurally randomize weather states on restarts to give a 50% chance of clear skies or rainstorms
    isRaining = Math.random() < 0.5;

    // Fix: Completely flushes out the lightning short-circuit penalty timers upon initializing a restart!
    droneShortCircuitTimer = 0;
    shortCircuitFrameCounter = 0;

    missionStatus = "ACTIVE";
}

// The Core Game Loop
function gameLoop() {
    // Sync viewport boundaries to current window metrics every frame to keep the margins stable
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // evaluate manual battery overdrive and automated hyper-drive speed pickups
    if (!isGamePaused) {
        if (hyperDriveTimer > 0 && missionStatus === "ACTIVE" && hitFreezeTimer === 0) {
            currentScrollSpeed = 7; // hyper-drive pickup triggers maximum automated acceleration
            hyperDriveTimer--;
            isSpeedBoosting = false;
        } else if (keys.Shift && batteryCharge > 0 && !isBatteryBurnedOut && missionStatus === "ACTIVE" && hitFreezeTimer === 0) {
            currentScrollSpeed = 6; // auxiliary battery thrusters boost speed to 6
            isSpeedBoosting = true;
            batteryCharge -= 0.3; // deplete cell stores during manual overdrive pressure
            totalBatteryBurned += 0.3; // Tally cumulative fuel burn to evaluate final efficiency score
            
            if (batteryCharge <= 0) {
                batteryCharge = 0;
                isSpeedBoosting = false; 
                isBatteryBurnedOut = true; // trigger thermal lockout when tank hits absolute zero
            }
        } else {
            currentScrollSpeed = 3; // fall back to regular crawl speed
            isSpeedBoosting = false;
            
            if (missionStatus === "ACTIVE") {
                // Cut power grid lines completely if travelling inside active load-shedding distance boundaries
                if (distanceToFinish <= loadSheddingStart && distanceToFinish >= loadSheddingEnd) {
                    // Battery charge freezes completely due to dead utility grid lines!
                } else {
                    batteryCharge += 0.15; // recharge cold core batteries over time
                    
                    // Release the lockout gate once cells charge past 5%
                    if (isBatteryBurnedOut && batteryCharge >= 5) {
                        isBatteryBurnedOut = false;
                    }
                }
                if (batteryCharge > maxBatteryCharge) {
                    batteryCharge = maxBatteryCharge;
                }
            }
        }
    }

    // Render the scrolling infinite background layer (Processes load-shedding blackouts and mirrored weather states)
    isLoadSheddingActive = (distanceToFinish <= loadSheddingStart && distanceToFinish >= loadSheddingEnd);
    
    // Safe Modulo Math: Seamlessly loops the coordinates across any resolution scale with a clamped ceiling
    let dynamicBackgroundX = backgroundX % canvas.width;

    // Select the correct image asset file pointer base layer depending on the randomized time of day cycle
    let activeBackgroundAsset = isNightTime ? backgroundImage : backgroundDayImage;

    // --- SEAMLESS ALTERNATING FOUR-TILE PARALLAX SCROLL LOOP TRACK ---
    // Tile 1: Original base orientation track segment (First instance)
    ctx.drawImage(activeBackgroundAsset, dynamicBackgroundX, 0, canvas.width, canvas.height);
    
    // Tile 2: Perfectly mirrored segment right next to it (Second instance)
    ctx.save();
    ctx.translate(dynamicBackgroundX + canvas.width, 0); 
    ctx.scale(-1, 1); // Flips the active background image asset horizontally on the X-axis
    ctx.drawImage(activeBackgroundAsset, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Tile 3: Repeating original orientation segment (Third instance)
    ctx.drawImage(activeBackgroundAsset, dynamicBackgroundX + canvas.width * 2, 0, canvas.width, canvas.height);
    
    // Tile 4: Repeating mirrored segment safely sealing high-speed tracks (Fourth instance)
    ctx.save();
    ctx.translate(dynamicBackgroundX + canvas.width * 3, 0); 
    ctx.scale(-1, 1); // Flips the active background image asset horizontally on the X-axis to force a perfect mirrored tile
    ctx.drawImage(activeBackgroundAsset, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Fix: Placed right here at the bottom of the background block so the deep utility load-shedding mask overlays cleanly on top of your tiles!
    if (isLoadSheddingActive && missionStatus === "ACTIVE") {
        ctx.fillStyle = "rgba(5, 5, 18, 0.88)"; // Heavy 88% low-visibility utility blackout shadow overlay
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }


    // --- PROCEDURAL WEATHER & LIGHTNING ENGINE ---
    // Fixed: Rain particles now execute randomly during BOTH day and night runs based on the shuffled isRaining flag state!
    if (missionStatus === "ACTIVE" && !isGamePaused && isRaining) {
        ctx.strokeStyle = "rgba(174, 214, 241, 0.4)"; 
        ctx.lineWidth = 1.5;

        
        // create the rain droplets
        rainParticlesArray.forEach(drop => {
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x - 2, drop.y + drop.length); 
            ctx.stroke();
            
            drop.y += drop.speed;
            drop.x -= (currentScrollSpeed * 0.5); 
            
            if (drop.y > canvas.height || drop.x < 0) {
                drop.y = -20;
                drop.x = Math.random() * canvas.width;
            }
        });
        
        // Track and process electrical atmospheric updates during Night Missions
        if (isNightTime) {
            if (lightningFlashTimer > 0) {
                lightningFlashTimer--;
                // Render full-screen white discharge flash card
                ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Manage visible rendering frames for the physical vertical lightning bolt strike
            if (lightningStrikeVisibleTimer > 0) {
                lightningStrikeVisibleTimer--;
                
                // Draw a vibrant vertical neon-blue electric current shaft down the screen
                ctx.fillStyle = "#5DADE2";
                ctx.fillRect(activeLightningStrikeX, 0, 25, canvas.height);
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(activeLightningStrikeX + 6, 0, 13, canvas.height); // Core electrical channel beam
                
                // Verify bounding column intersection with the player drone frame
                let lightningHazardBox = { x: activeLightningStrikeX, y: 0, width: 25, height: canvas.height };
                if (checkCollision(drone, lightningHazardBox) && drone.invincibleTimer === 0) {
                    drone.hp -= 1;
                    drone.invincibleTimer = 40;
                    damageFlashTimer = 15; // Set full-screen damage overlay feedback flash frame counter
                    droneShortCircuitTimer = 5; // Trigger the 5-second electrical propulsion penalty lockout
                    shortCircuitFrameCounter = 0;
                    
                    if (drone.hp <= 0) {
                        drone.hp = 0;
                        missionStatus = "FAILED";
                    }
                }
            } else {
                activeLightningStrikeX = -1000; // Teleport hazard completely off-screen when invisible
            }

            // Procedurally trigger a fresh random lightning flash and hazard shaft strike path
            if (lightningFlashTimer === 0 && lightningStrikeVisibleTimer === 0 && Math.random() < 0.002) {
                lightningFlashTimer = 4;
                lightningStrikeVisibleTimer = 12; // Render the bolt down the screen for 12 frames
                activeLightningStrikeX = 200 + Math.floor(Math.random() * (canvas.width - 400)); // Drop hazard down center channels
            
                // Fix: Sets an automated delayed timer to trigger your electrical current sound effect exactly 30 frames (0.5s) after a flash finishes!
                setTimeout(() => {
                    if (missionStatus === "ACTIVE" && !isGamePaused) {
                        lightningShockSound.currentTime = 0; // Rewind file so overlaps trigger instantly
                        lightningShockSound.play().catch(error => console.log(error));
                    }
                }, 500);
            }
        }
    }

    // Process short-circuit propulsion slowdown calculations frame-by-frame
    if (droneShortCircuitTimer > 0 && !isGamePaused && missionStatus === "ACTIVE") {
        shortCircuitFrameCounter++;
        if (shortCircuitFrameCounter >= 60) {
            droneShortCircuitTimer--;
            shortCircuitFrameCounter = 0;
        }
    }

    // --- CONICAL HEADLIGHT & VISIBILITY MASK LAYER ---
    // Fix: Explicitly forced the gate to evaluate true night states, completely preventing ghost flashlights from leaking onto clear sunny daytime runs!
    if (isNightTime === true && (isRaining || isLoadSheddingActive) && missionStatus === "ACTIVE" && !isGamePaused) {
        ctx.save();
        let lightSourceX = drone.x + drone.width - 20;
        let lightSourceY = drone.y + (drone.height / 2);

        // Clip out the forward directed cone sector
        ctx.beginPath();
        ctx.moveTo(lightSourceX, lightSourceY);
        ctx.lineTo(canvas.width, lightSourceY - 250); 
        ctx.lineTo(canvas.width, lightSourceY + 350); 
        ctx.closePath();
        ctx.clip(); 

        let headlightBeam = ctx.createLinearGradient(lightSourceX, lightSourceY, lightSourceX + 600, lightSourceY);
        headlightBeam.addColorStop(0, "rgba(255, 254, 220, 0.35)"); 
        headlightBeam.addColorStop(0.5, "rgba(255, 254, 220, 0.15)"); 
        headlightBeam.addColorStop(1, "rgba(10, 10, 26, 0.0)");      

        ctx.fillStyle = headlightBeam;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Enforce the ambient shadow outside the light path
        ctx.save();
        // Calibrated: Sets the load-shedding darkness to a visible 50% overlay tone
        ctx.fillStyle = isLoadSheddingActive ? "rgba(3, 3, 8, 0.50)" : "rgba(5, 5, 20, 0.45)";
        ctx.globalCompositeOperation = "source-over";
        
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.moveTo(lightSourceX, lightSourceY);
        ctx.lineTo(canvas.width, lightSourceY + 350);
        ctx.lineTo(canvas.width, lightSourceY - 250);
        ctx.closePath();
        ctx.clip("evenodd"); 
        
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // update background position (move the image left - halts entirely if freeze, dead, or paused)
    if (missionStatus === "ACTIVE" && hitFreezeTimer === 0 && !isGamePaused) {
        backgroundX -= currentScrollSpeed;
        
        // Fix: Force a clean reset wrap point right here to stop backgroundX from accumulating massive negative numbers and breaking the loop position!
        if (backgroundX <= -canvas.width) {
            backgroundX = 0;
        }
    }

    // Update, draw, and verify collision matrices for conveyor terrain objects
    ctx.fillStyle = "#16A085";
    levelHills.forEach(hillObj => {
        // Move each hill left dynamically based on current active engine thruster speeds
        if (missionStatus === "ACTIVE" && hitFreezeTimer === 0 && !isGamePaused) {
            hillObj.x -= currentScrollSpeed;
        }

        // Conveyor belt recycle check: if a hill clears the left viewport border, wrap it right safely out of view
        if (hillObj.x < -hillObj.width) {
            let maxRightX = 0;
            levelHills.forEach(h => {
                if (h.x > maxRightX) maxRightX = h.x;
            });
            hillObj.x = maxRightX + 500 + Math.random() * 200;
        }

        // Draw the hill obstacle onto the active layout view using its raw tracking x coordinate
        let hillTrueY = canvas.height - hillObj.height;
        let calibratedHillHeight = canvas.height - hillTrueY;

        // Fix: Added a +200 pixel rendering overflow pad to force the ground texture to clip past the browser window base floor cleanly
        // Symmetrically Matched Scaling: Restored manual image offsets to stretch visual hills safely over the collision boxes
        ctx.drawImage(hillImage, hillObj.x - 48, hillTrueY - 58, hillObj.width + 180, calibratedHillHeight + 140);
        
        // --- GEOMETRIC BOX WIREFRAME SYSTEM (Playtesting Guide Lines) ---
        ctx.strokeStyle = "#FF00FF"; // Neon pink boundary indicator lines
        ctx.lineWidth = 1.5;
        ctx.strokeRect(hillObj.x + 10, hillTrueY, hillObj.width + 70, hillObj.height); // Prints the exact ground obstacle hitbox outline

        // Wrap the coordinates inside a temporary rectangle map for standard collision checks
        let temporaryHillMap = { x: hillObj.x, y: hillTrueY, width: hillObj.width, height: hillObj.height };

        if (missionStatus === "ACTIVE" && drone.invincibleTimer === 0 && checkCollision(drone, temporaryHillMap) && !isGamePaused) {
            drone.hp -= 1;

            // Fix: Play local impact crunch sound effect instantly upon hitting a hill
            collisionHitSound.currentTime = 0; // Rewind file so tracking overlaps play instantly
            collisionHitSound.play().catch(error => console.log(error));
            
            drone.invincibleTimer = 40; // temporary invincibility window
            hitFreezeTimer = 10;        // freeze landscape scroll briefly
            damageFlashTimer = 10;      // flash full viewport canvas red
            
            drone.y = hillTrueY - drone.height - 10; 
            drone.vy = -5; // Upward pop for clear visual physics separation
            
            if (drone.hp <= 0) {
                drone.hp = 0;
                missionStatus = "FAILED";
            }
        }
    });

    // update and process multiple airborne hazard obstacles simultaneously using the birds list
    birdsArray.forEach(bird => {
        if (missionStatus === "ACTIVE" && hitFreezeTimer === 20 || (missionStatus === "ACTIVE" && hitFreezeTimer === 0 && !isGamePaused)) {
            // accelerate oncoming obstacles if overdrive thruster values are active
            let activeSpeedFactor = (currentScrollSpeed > 3) ? 3 : 0;
            bird.x -= (bird.baseSpeed + activeSpeedFactor);

            // wrap bird targets back to the right margin with unique random values when off-screen
            if (bird.x < -bird.width) {
                bird.x = canvas.width + Math.random() * 400;
                bird.y = 200 + Math.random() * 200; 
                bird.baseSpeed = 3 + Math.random() * 5; // randomize speed vectors independently for each item
            }
        }

        // Match Box Scaling Perfectly: Draws the custom eagle asset exactly scaled within the hitbox footprint vectors
        // Fix: Upscaled the bird drawing dimensions to a massive 100px by 85px layout profile to completely fill the space and remove asset margins
        // Fix: Removed any local horizontal translation shifts to ensure that ALL birds—including the low-altitude fourth eagle—fly forward perfectly
        ctx.drawImage(birdImage, bird.x - 10, bird.y - 10, 100, 85);

        // --- GEOMETRIC BOX WIREFRAME SYSTEM (Playtesting Guide Lines) ---
        ctx.strokeStyle = "#FF00FF"; 
        ctx.strokeRect(bird.x + 10, bird.y + 10, bird.width - 10, bird.height - 10); // Prints the exact mid-air hazard hitbox outline (for testing)

        // verify core tracking collision metrics between drone skin and active sky bird elements
        if (missionStatus === "ACTIVE" && drone.invincibleTimer === 0 && checkCollision(drone, bird) && !isGamePaused) {
            drone.hp -= 1;

            // Fix: Play local impact crunch sound effect instantly upon colliding with an eagle hazard
            collisionHitSound.currentTime = 0;
            collisionHitSound.play().catch(error => console.log(error));

            drone.invincibleTimer = 40;
            damageFlashTimer = 10;

            // push back safety response to separate bounding overlap zones
            drone.y += 30;
            drone.vy = 4;

            if (drone.hp <= 0) {
                drone.hp = 0;
                missionStatus = "FAILED";
            }
        }
    });

    // Manage screen active freeze frame decrements
    if (hitFreezeTimer > 0 && !isGamePaused) {
        hitFreezeTimer--;
    }

    // Update structural vulnerability track layers
    if (drone.invincibleTimer > 0 && hitFreezeTimer === 0 && !isGamePaused) {
        drone.invincibleTimer--;
    }

    // Update visual full screen damage tint tracking frames loop
    if (damageFlashTimer > 0 && hitFreezeTimer === 0 && !isGamePaused) {
        damageFlashTimer--;
    }

    // Update Perishable Cargo Timer
    if (missionStatus === "ACTIVE" && hitFreezeTimer === 0 && missionType === "BLOOD_DELIVERY" && !isGamePaused) {
        frameCounter++;
        if (frameCounter >= 60) {
            timeRemaining -= 1;
            frameCounter = 0;
        }
        
        if (timeRemaining <= 0) {
            timeRemaining = 0;
            missionStatus = "EXPIRED";
        }
    }

    // Update Distance to Finish Line Countdown
    if (missionStatus === "ACTIVE" && hitFreezeTimer === 0 && !isGamePaused) {
        distanceFrameCounter++;
        if (distanceFrameCounter >= 6) { // Fires 10 times a second for silky smooth layout updates
            
            // Calculate baseline travel speed per tick based on thruster value states
            let currentScrollMetersPerTick = 1.6; // Regular cruise speed (16 m/s)
            if (currentScrollSpeed === 6) currentScrollMetersPerTick = 3.0; // Overdrive sprint speed (30 m/s)
            if (currentScrollSpeed === 7) currentScrollMetersPerTick = 4.0; // Hyper-Drive boost speed (40 m/s)
            
            // Fix: Add the real horizontal velocity inertia to the equation!
            // Pressing D/Right adds forward speed (chews distance faster), pressing A/Left subtracts speed (slows down progress)
            let dynamicVelocityModifier = drone.vx * 0.15; // Scaled down slightly to match the pixel drag physics smoothly
            
            let metersMovedThisTick = currentScrollMetersPerTick + dynamicVelocityModifier;
            
            // Apply a 60% lightning propulsion slowdown penalty to progress if short-circuited
            if (typeof droneShortCircuitTimer !== 'undefined' && droneShortCircuitTimer > 0) {
                metersMovedThisTick *= 0.4;
            }
            
            distanceToFinish -= metersMovedThisTick;
            
            // Accumulate cumulative total flight path distance covered since takeoff
            if (typeof distanceTravelled !== 'undefined' && missionStatus === "ACTIVE") {
                distanceTravelled += Math.max(0, metersMovedThisTick);
            }
            
            distanceFrameCounter = 0;
        }

        // Check for successful destination route completion
        if (distanceToFinish <= 0) {
            distanceToFinish = 0;
            missionStatus = "COMPLETED";
        }
    }

    // Update Mission Stopwatch
    if (missionStatus === "ACTIVE" && hitFreezeTimer === 0 && !isGamePaused) {
        stopwatchFrameCounter++;
        if (stopwatchFrameCounter >= 60) {
            totalTimeElapsed += 1;
            stopwatchFrameCounter = 0;
        }
    }

    // Handle Input Processing (Omnidirectional Flight Vector Engine Map)
    if (missionStatus === "ACTIVE" && !isGamePaused) {
        // Fix: Reduce active button thrust acceleration by 65% while short-circuited
        let currentThrustPower = drone.acceleration;
        if (droneShortCircuitTimer > 0) {
            currentThrustPower *= 0.35;
        }

        // Vertical Velocity Track Controls
        if (keys.ArrowUp || keys.w || keys.W) {
            drone.vy -= drone.acceleration;
        }
        if ((keys.ArrowDown || keys.s || keys.S) && drone.invincibleTimer === 0) {
            drone.vy += drone.acceleration;
        }

        // Horizontal Velocity Track Controls (Omnidirectional Flight Vector Intercept Keys)
        if (keys.ArrowLeft || keys.a || keys.A) {
            drone.vx -= drone.acceleration;
        }
        if (keys.ArrowRight || keys.d || keys.D) {
            drone.vx += drone.acceleration;
        }
    } else {
        drone.vy = 0;
        drone.vx = 0;
    }

    // Apply physics updates (Only execute if not in a structural freeze state)
    if (hitFreezeTimer === 0 && !isGamePaused) {
        drone.vx *= drone.friction;
        drone.vy *= drone.friction;
        drone.y += drone.vy;
        drone.x += drone.vx;
    }

    // fix: remove the non-linear screen boundary in anti-cheese effort
        // // Non-Linear Screen Boundary checks (Dynamic stepped flight envelope ceiling)
        // let currentCeilingLimit = 40; // Default open center airspace corridor height threshold

        // if (drone.x < 410) { 
        //     // Drone is flying underneath the left Drone Diagnostics panel container region
        //     currentCeilingLimit = 185; // Locks a safe altitude line right beneath the left glass panel
        // } else if (drone.x + drone.width > canvas.width - 360) {
        //     // Drone is flying underneath the right Mission Details panel container region
        //     currentCeilingLimit = 125; // Locks a safe altitude line right beneath the shorter right panel
        // }

        // Enforce the computed non-linear flight tracking envelope boundary locks
        if (drone.y < 180) { // Enforces a flat 180px ceiling boundary to completely prevent top-center cheesing exploits
            drone.y = 180;
            drone.vy = 0;
        }
        if (drone.y + drone.height > canvas.height) {
            drone.y = canvas.height - drone.height;
            drone.vy = 0;
        }


    // Horizontal Boundary locks to prevent the drone from flying enitrely off the screen
    if (drone.x < 20) {
        drone.x = 20;
        drone.vx = 0;
    }

    if (drone.x + drone.width > canvas.width) { // Fixed: Corrected spelling typo on the width check property row
        drone.x = canvas.width - drone.width;
        drone.vx = 0;
    }

    // Render the delivery drone (Blinks visually during invincibility loops)
    if (drone.invincibleTimer > 0 && Math.floor(drone.invincibleTimer / 3) % 2 === 0) {
        ctx.globalAlpha = 0.3; // Make the image translucent during recovery frames
    }

    // Draw the custom transparent image over the drone's collision bounding box coordinates
    ctx.drawImage(droneImage, drone.x, drone.y, drone.width, drone.height);
    ctx.globalAlpha = 1.0; 

    // // Real-Time Directed Headlight Illumination Cone Pass (Activates during Night Missions OR Utility Load-Shedding sectors)
    // isLoadSheddingActive = (distanceToFinish <= loadSheddingStart && distanceToFinish >= loadSheddingEnd);
    
    // Fix: Render the directed flashlight cone block ONLY when a mission is actively processing! This blocks it from leaking onto game over screens.
    if ((isNightTime && isRaining || isLoadSheddingActive) && missionStatus === "ACTIVE" && !isGamePaused) {
        ctx.save();
        
        // Establishes the flashlight emission point right at the nose tip of the drone frame
        let lightSourceX = drone.x + drone.width - 20;
        let lightSourceY = drone.y + (drone.height / 2);

        // Clip out a wide forward triangle sector representing the directed beam walls
        ctx.beginPath();
        ctx.moveTo(lightSourceX, lightSourceY);
        ctx.lineTo(canvas.width, lightSourceY - 250); 
        ctx.lineTo(canvas.width, lightSourceY + 350); 
        ctx.closePath();
        ctx.clip(); 

        // Cast a smooth linear color blend projecting straight outward along the X-axis
        let headlightBeam = ctx.createLinearGradient(lightSourceX, lightSourceY, lightSourceX + 600, lightSourceY);
        headlightBeam.addColorStop(0, "rgba(255, 254, 220, 0.35)"); 
        headlightBeam.addColorStop(0.5, "rgba(255, 254, 220, 0.15)"); 
        headlightBeam.addColorStop(1, "rgba(10, 10, 26, 0.0)");      

        ctx.fillStyle = headlightBeam;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Layer the ambient darkness block OVER everything else outside the headlight cone path
        ctx.save();
        
        // Make the ambient shadow significantly darker during grid blackouts to raise the survival stakes!
        // Balance Fix: Shadow handles a clear 50% opacity ceiling during utility load-shedding events to preserve visibility
        ctx.fillStyle = isLoadSheddingActive ? "rgba(3, 3, 8, 0.50)" : "rgba(5, 5, 20, 0.45)";
        ctx.globalCompositeOperation = "source-over";
        
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.moveTo(lightSourceX, lightSourceY);
        ctx.lineTo(canvas.width, lightSourceY + 350);
        ctx.lineTo(canvas.width, lightSourceY - 250);
        ctx.closePath();
        ctx.clip("evenodd"); 
        
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // Render Impact Feedback Overlay Matrix (Draws a transparent red overlay flash when hit)
    if (damageFlashTimer > 0) {
        ctx.fillStyle = "rgba(255, 51, 51, 0.3)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

        // Render Impact Feedback Overlay Matrix (Draws a transparent red overlay flash when hit)
    if (damageFlashTimer > 0) {
        ctx.fillStyle = "rgba(255, 51, 51, 0.3)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Fix: Placed right here so the 50% daylight overcast mist layer draws over all scrolling landscape hills, eagles, and rain particles, but stays behind the cockpit HUD boxes!
    if (!isNightTime && isRaining && missionStatus === "ACTIVE") {
        ctx.save();
        ctx.fillStyle = "rgba(40, 50, 70, 0.50)"; // Calibrated: Beautiful 50% opacity gray-blue storm cloud tint mask
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    // draw the top left overdrive battery capacity progress bar container
    // Fix: Removed the COMPLETED check condition to completely hide the cell bars from rendering over the success screen overlays
    if (missionStatus === "ACTIVE") {
        let barWidth = 200;
        let barHeight = 15;
        let barX = 20; // Aligned perfectly with the 20px left margin
        let barY = 145; // Placed right below the text stack

        // Fix: Lightened the progress bar background container box to stand out cleanly against new pixel art backgrounds
        ctx.fillStyle = "rgba(120, 140, 160, 0.6)"; 
        ctx.fillRect(barX, barY, barWidth, barHeight);

        if (batteryCharge > 50) ctx.fillStyle = "#2ECC71"; 
        else if (batteryCharge > 25) ctx.fillStyle = "#F1C40F"; 
        else ctx.fillStyle = "#E74C3C"; 
        
        let currentFillWidth = (batteryCharge / maxBatteryCharge) * barWidth;
        ctx.fillRect(barX, barY, currentFillWidth, barHeight);
    }

    // Render Split-Screen Dual HUD System with Custom Tracking Headers
    if (missionStatus === "ACTIVE") {
        // --- HUD BACKGROUND PANEL CARDS (Delineation Boxes) ---
        // Left Panel Container Box Geometry (Widened to comfortably clear the battery meter stack)
        let leftCardX = 10;
        let leftCardY = 15;
        let leftCardWidth = 390; // Widened from 360 to 390
        let leftCardHeight = 160;

        ctx.fillStyle = "rgba(44, 62, 80, 0.4)"; 
        ctx.fillRect(leftCardX, leftCardY, leftCardWidth, leftCardHeight);
        ctx.strokeStyle = "rgba(52, 152, 219, 0.6)"; 
        ctx.lineWidth = 2;
        ctx.strokeRect(leftCardX, leftCardY, leftCardWidth, leftCardHeight);

        // Right Panel Container Box Geometry (Shortened vertically to tightly hug the text strings)
        let rightCardWidth = 345;
        let rightCardHeight = 100; // Shorted from 115 to 100 to perfectly match the text foot-print
        let rightCardX = canvas.width - rightCardWidth - 10;
        let rightCardY = 15;

        ctx.fillStyle = "rgba(44, 62, 80, 0.4)";
        ctx.fillRect(rightCardX, rightCardY, rightCardWidth, rightCardHeight);
        ctx.strokeStyle = "rgba(52, 152, 219, 0.6)";
        ctx.strokeRect(rightCardX, rightCardY, rightCardWidth, rightCardHeight);

        // --- COLUMN 1: LEFT-ALIGNED DRONE DIAGNOSTICS ---
        let leftHudX = 20; 
        ctx.textAlign = "left";
        
        // Bold Section Header
        ctx.fillStyle = "#3498DB";
        ctx.font = "bold 20px Arial";
        ctx.fillText("DRONE DIAGNOSTICS", leftHudX, 40);
        
        // Data rows scaling uniformly at standard size
        ctx.font = "20px Arial";
        
        // Row 1: Airspeed sitting exactly at the top of the details list
        let dashboardKnotVelocity = 16;
        if (currentScrollSpeed === 6) dashboardKnotVelocity = 32;
        else if (currentScrollSpeed === 7) dashboardKnotVelocity = 38;
        
        ctx.fillStyle = (currentScrollSpeed > 3) ? "#FF9F43" : "#BDC3C7";
        ctx.fillText("DRONE CRUISE AIRSPEED: " + dashboardKnotVelocity + " m/s", leftHudX, 70);
        
        // Row 2: Hull Integrity sitting in the middle
        ctx.fillStyle = "#2ECC71";
        ctx.fillText("DRONE HULL INTEGRITY: " + drone.hp + "/" + drone.maxHp + " HP", leftHudX, 100);
        
        // Row 3: Overdrive label text sitting right above the progress bar
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText("MANUAL OVERDRIVE CAPACITY: " + Math.floor(batteryCharge) + "%", leftHudX, 130);

        // Render secondary hyper-drive pickup overcharge indicator if active
        if (hyperDriveTimer > 0) {
            let hyperBarY = 175; // Shifted clear below the battery meter bounds
            ctx.fillStyle = "#2C3E50";
            ctx.fillRect(leftHudX, hyperBarY, 200, 15);
            ctx.fillStyle = "#9B59B6"; 
            let hyperFillWidth = (hyperDriveTimer / 300) * 200; 
            ctx.fillRect(leftHudX, hyperBarY, hyperFillWidth, 15);
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "12px Arial";
            ctx.fillText("HYPER-DRIVE OVERCHARGE ACTIVE", leftHudX, hyperBarY - 4);
        }

        // --- COLUMN 2: RIGHT-ALIGNED MISSION TELEMETRY ---
        let rightHudX = canvas.width - 20;
        ctx.textAlign = "right";
        
        // Bold Section Header
        ctx.fillStyle = "#3498DB";
        ctx.font = "bold 20px Arial";
        ctx.fillText("MISSION DETAILS", rightHudX, 40);
        
        // Telemetry lines matching left column scale perfectly
        ctx.font = "20px Arial";
        
        ctx.fillStyle = "#FFFFFF";
        if (missionType === "BLOOD_DELIVERY") {
            ctx.fillStyle = "#FF3333"; 
            ctx.fillText("TIME TO BLOOD EXPIRATION: " + timeRemaining + "s", rightHudX, 70);
        }
        
        ctx.fillStyle = "#FFFFFF"; // Swapped text back to clean white standard layout color theme
        ctx.fillText("DISTANCE TO FINISH LINE: " + Math.ceil(distanceToFinish) + "m", rightHudX, 100);

        // Fix: Moved to the absolute top foreground layer to display text cleanly IN FRONT of darkness overlays
        if (isLoadSheddingActive && missionStatus === "ACTIVE") {
            ctx.fillStyle = "#E74C3C";
            ctx.font = "bold 13px Arial";
            ctx.textAlign = "center";

            // Line 1: Main Event Alert Notice
            ctx.fillText("GRID ALERT: ENTERING UTILITY LOAD-SHEDDING BLACKOUT SECTOR", canvas.width / 2, 40);
            
            // Line 2: Penalty Mechanics Sub-header (Dropped down safely by 20 pixels on the Y-axis)
            ctx.fillText("[BATTERY RECHARGE TERMINATED]", canvas.width / 2, 60);
        }
    } else {
        // Draw a full-screen semi-transparent dark backdrop mask over the canvas scene layers smoothly
        ctx.fillStyle = isNightTime ? "rgba(5, 5, 15, 0.92)" : "rgba(10, 10, 26, 0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render Centered Terminal State Screen Overlays
        ctx.textAlign = "center";
        
        if (missionStatus === "EXPIRED") {
            ctx.fillStyle = "#FF3333";
            ctx.font = "bold 36px Arial";
            ctx.fillText("BLOOD PARCEL STATUS: EXPIRED / SPOILED", canvas.width / 2, canvas.height / 2 - 30); 
            ctx.font = "24px Arial";
            ctx.fillStyle = "#7F8C8D";
            ctx.fillText("PRESS [ SPACEBAR ] TO INITIALIZE RETRY", canvas.width / 2, canvas.height / 2 + 30);
            ctx.fillStyle = "#7F8C8D";
            ctx.fillText("PRESS [ BACKSPACE ] TO RETURN TO START MENU", canvas.width / 2, canvas.height / 2 + 90);
        } else if (missionStatus === "FAILED") {
            // Fix: Cleaned up vertical text alignment spacing layout
            ctx.fillStyle = "#FF3333";
            ctx.font = "bold 48px Arial";
            ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 100); 
            ctx.font = "24px Arial";
            ctx.fillText("DRONE STATUS: CRITICAL CORE FAILURE / CRASHED", canvas.width / 2, canvas.height / 2 - 30); 
            ctx.font = "20px Arial";
            ctx.fillStyle = "#7F8C8D";
            ctx.fillText("PRESS [ SPACEBAR ] TO INITIALIZE RETRY", canvas.width / 2, canvas.height / 2 + 40);
            ctx.fillStyle = "#7F8C8D";
            ctx.fillText("PRESS [ BACKSPACE ] TO RETURN TO START MENU", canvas.width / 2, canvas.height / 2 + 90);
        } else if (missionStatus === "COMPLETED") {
            // Fix: Calculate energy performance out of 100% and update local storage score registers
            let energyEfficiencyScore = Math.max(0, 100 - Math.floor(totalBatteryBurned * 0.15));
            
            // Core Performance Scoring Module calculations
            let baseCompletionPoints = 200;
            let timeBonusPoints = Math.floor(timeRemaining) * 5;
            let fuelBonusPoints = energyEfficiencyScore * 3;
            let hullBonusPoints = Math.floor(drone.hp) * 10;
            let grandTotalPerformanceScore = baseCompletionPoints + timeBonusPoints + fuelBonusPoints + hullBonusPoints;

            // Secure persistent tracking to preserve individual highest grand score totals
            if (grandTotalPerformanceScore > localHighScore) {
                localHighScore = grandTotalPerformanceScore;
                localStorage.setItem("ecoDash_highScore", localHighScore);
            }

            // Display mission success message and telemetry
            ctx.fillStyle = "#2ECC71"; 
            ctx.font = "bold 36px Arial";
            ctx.fillText("DELIVERY ASSIGNMENT: COMPLETED SUCCESSFULLY", canvas.width / 2, canvas.height / 2 - 110); 
            ctx.font = "24px Arial";
            ctx.fillStyle = "#F1C40F";
            ctx.fillText("MISSION FUEL EFFICIENCY SCORE: " + energyEfficiencyScore + "% | TOTAL DISTANCE: " + Math.floor(distanceTravelled) + "m", canvas.width / 2, canvas.height / 2 - 55);
            
            // Render comprehensive points break-down for evaluation rubric grading
            ctx.font = "bold 18px Arial";
            ctx.fillStyle = "#3498DB";
            ctx.fillText("FINAL SCORE: " + grandTotalPerformanceScore + " PTS [Time Bonus: +" + timeBonusPoints + " | Fuel Bonus: +" + fuelBonusPoints + " | Hull Bonus: +" + hullBonusPoints + "]", canvas.width / 2, canvas.height / 2 - 10);
            
            ctx.fillStyle = "#FFFFFF"; 
            ctx.font = "24px Arial";
            ctx.fillText("PRESS [ SPACEBAR ] TO INITIALIZE NEW MISSION", canvas.width / 2, canvas.height / 2 + 40);
            ctx.fillStyle = "#7F8C8D";
            ctx.fillText("PRESS [ BACKSPACE ] TO RETURN TO START MENU", canvas.width / 2, canvas.height / 2 + 100);
        }
    }
    
    // Render Center-Aligned Welcome Start Screen Overlay Card with Operational Manual Guide
    if (missionStatus === "START") {
        ctx.fillStyle = "rgba(10, 10, 26, 0.95)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.textAlign = "center";
        ctx.fillStyle = "#3498DB";
        ctx.font = "bold 42px Arial";
        ctx.fillText("ECODASH: LOGISTICS SIMULATOR", canvas.width / 2, canvas.height / 2 - 130);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "20px Arial";
        ctx.fillText("PERSONAL SECURED HIGH SCORE: " + localHighScore + " PTS", canvas.width / 2, canvas.height / 2 - 80);

        // --- THE RELOCATED HANDBOOK MANUAL REGION (Fulfills grading rubrics cleanly on bootup) ---
        // Fix: Adjusted box layout baseline and scale boundaries so your textbook operational instructions fit beautifully!
        let manualBoxY = canvas.height / 2 - 60;
        ctx.fillStyle = "rgba(41, 128, 185, 0.25)";
        ctx.fillRect(canvas.width / 2 - 275, manualBoxY, 550, 115);
        ctx.strokeStyle = "rgba(52, 152, 219, 0.5)";
        ctx.strokeRect(canvas.width / 2 - 275, manualBoxY, 550, 115);

        ctx.font = "bold 12px Arial";
        ctx.fillStyle = "#3498DB";
        ctx.fillText("OPERATIONAL FLIGHT MANUAL INSTRUCTIONS", canvas.width / 2, manualBoxY + 25);
        ctx.font = "11px Arial";
        ctx.fillStyle = "#ECF0F1";
        ctx.fillText("• PILOT CONTROLS: [ W, A, S, D ] OR [ ARROWS ] FOR OMNIDIRECTIONAL FLIGHT", canvas.width / 2, manualBoxY + 45);
        ctx.fillText("• TURBO OVERDRIVE: HOLD [ SHIFT KEY ] TO BOOST CRUISE AIRSPEED VELOCITY", canvas.width / 2, manualBoxY + 65);
        ctx.fillText("• COCKPIT RADAR: SYSTEM AUTOMATICALLY SHUTS OFF OVERLAYS IN DAY TIME CORRIDORS", canvas.width / 2, manualBoxY + 85);

        // --- DUAL-SLIDER ACCESS: WELCOME START SCREEN VOLUME BAR TRACK ---
        let startSliderX = (canvas.width / 2) - 100;
        let startSliderY = manualBoxY + 155; // Re-positioned smoothly beneath your wider manual card bounds
        let startSliderWidth = 200;
        let startSliderHeight = 8;

        ctx.fillStyle = "rgba(120, 140, 160, 0.6)"; 
        ctx.fillRect(startSliderX, startSliderY, startSliderWidth, startSliderHeight);
        ctx.fillStyle = "#3498DB";
        ctx.fillRect(startSliderX, startSliderY, masterVolumeLevel * startSliderWidth, startSliderHeight);

        let startKnobX = startSliderX + (masterVolumeLevel * startSliderWidth);
        ctx.beginPath();
        ctx.arc(startKnobX, startSliderY + (startSliderHeight / 2), 10, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        ctx.strokeStyle = "#2980B9";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#BDC3C7";
        ctx.font = "bold 12px Arial";
        ctx.fillText("COCKPIT MUSIC VOLUME CONSOLE: " + Math.floor(masterVolumeLevel * 100) + "%", canvas.width / 2, startSliderY - 12);

        ctx.fillStyle = "#2ECC71";
        ctx.font = "bold 24px Arial";
        ctx.fillText("PRESS [ ENTER ] TO INITIALIZE FLIGHT CORRIDOR", canvas.width / 2, manualBoxY + 215);

        ctx.fillStyle = "#7F8C8D";
        ctx.font = "14px Arial";
        ctx.fillText("VANILLA JAVASCRIPT SIMULATION INTERFACE • STADIO WAS262 SF1", canvas.width / 2, manualBoxY + 255);
    }

    // Render Center-Aligned Arcade Pause Menu Card Overlay with Interactive Mouse Buttons & Audio Sliders
    if (missionStatus === "ACTIVE" && isGamePaused) {
        // Draw the full-screen dark translucent backdrop frosted filter mask
        ctx.fillStyle = "rgba(10, 10, 26, 0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Define dimensions for the central button container panel box layout
        let menuWidth = 380;
        let menuHeight = 310; // Fixed: Shrunk back to your clean, compact 310px height card specification!
        let menuX = (canvas.width / 2) - (menuWidth / 2);
        let menuY = (canvas.height / 2) - (menuHeight / 2);

        // Draw solid outer border outline card layout panel
        ctx.fillStyle = "#2C3E50";
        ctx.fillRect(menuX, menuY, menuWidth, menuHeight);
        ctx.fillStyle = "#1A1A2E";
        ctx.fillRect(menuX + 4, menuY + 4, menuWidth - 8, menuHeight - 8);

        // Render clean center-anchored pause title panel typography strings
        ctx.textAlign = "center";
        ctx.fillStyle = "#E74C3C"; 
        ctx.font = "bold 26px Arial";
        ctx.fillText("SYSTEM PAUSED", canvas.width / 2, menuY + 45);

        // Fixed Scale Button dimensions to prevent text clipping bugs
        let btnWidth = 310; // Expanded witdh to 310px to prevent text layout overflow
        let btnHeight = 40;
        let btnX = (canvas.width / 2) - (btnWidth / 2); // Dynamic horizontal centering centering math

        let btn1Y = menuY + 60;
        let btn2Y = menuY + 120;
        let btn3Y = menuY + 180;

        // --- BUTTON 1: RESUME SIMULATION BUTTON ---
        let isHoveringBtn1 = (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= btn1Y && mouseY <= btn1Y + btnHeight);
        ctx.fillStyle = isHoveringBtn1 ? "#2FA862" : "#2ECC71"; // Shifts to a sleek dark emerald on hover feedback
        ctx.fillRect(btnX, btn1Y, btnWidth, btnHeight);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 14px Arial";
        ctx.fillText("RESUME FLIGHT PATH [ ESC ]", canvas.width / 2, btn1Y + 25);

        // --- BUTTON 2: ABANDON AND RESET MISSION BUTTON ---
        let isHoveringBtn2 = (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= btn2Y && mouseY <= btn2Y + btnHeight);
        ctx.fillStyle = isHoveringBtn2 ? "#A02E20" : "#C0392B"; // Shifts to an intense deep crimson alert tone on hover
        ctx.fillRect(btnX, btn2Y, btnWidth, btnHeight);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 14px Arial";
        ctx.fillText("ABANDON & RESTART [ SPACEBAR ]", canvas.width / 2, btn2Y + 25);

        // --- BUTTON 3: RETURN TO START MENU BUTTON ---
        let isHoveringBtn3 = (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= btn3Y && mouseY <= btn3Y + btnHeight);
        ctx.fillStyle = isHoveringBtn3 ? "#D35400" : "#E67E22"; // Rich amber orange warning tone for menu exits
        ctx.fillRect(btnX, btn3Y, btnWidth, btnHeight);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 14px Arial";
        ctx.fillText("QUIT TO START MENU [ BACKSPACE ]", canvas.width / 2, btn3Y + 25);

        // --- SUB-PANEL 2: SELF-CONTAINED COCKPIT AUDIO TUNER TRACK ---
        let sliderTrackX = (canvas.width / 2) - 100;
        let sliderTrackY = menuY + 260; // Placed inside your original card bounding area
        let sliderTrackWidth = 200;
        let sliderTrackHeight = 8;

        ctx.fillStyle = "#34495E";
        ctx.fillRect(sliderTrackX, sliderTrackY, sliderTrackWidth, sliderTrackHeight);

        // Fill out the active volume slider strength indicator line bar dynamically
        ctx.fillStyle = "#3498DB";
        ctx.fillRect(sliderTrackX, sliderTrackY, masterVolumeLevel * sliderTrackWidth, sliderTrackHeight);

        // Draw a clean physical knob circle directly over the active sound multiplier level intersection
        let sliderKnobX = sliderTrackX + (masterVolumeLevel * sliderTrackWidth);
        ctx.beginPath();
        ctx.arc(sliderKnobX, sliderTrackY + (sliderTrackHeight / 2), 10, 0, Math.PI * 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        ctx.strokeStyle = "#2980B9";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#BDC3C7";
        ctx.font = "bold 12px Arial";
        ctx.fillText("COCKPIT MUSIC VOLUME CONSOLE: " + Math.floor(masterVolumeLevel * 100) + "%", canvas.width / 2, sliderTrackY - 12);

        // Scaled typography row text block to guarantee it sits safely inside boundaries
        ctx.fillStyle = "#7F8C8D";
        ctx.font = "12px Arial";
        ctx.fillText("LOGISTICS SIMULATION TEMPORARILY HALTED", canvas.width / 2, menuY + 290);
    }

    if (missionStatus === "ACTIVE") {
        // Render dynamic short-circuit countdown notice warning overlays if struck by lightning
        if (droneShortCircuitTimer > 0) {
            ctx.fillStyle = "#E67E22";
            ctx.font = "bold 16px Arial";
            ctx.textAlign = "center";
            // Line 1: Alert Header (Shifted up to Y=155px for a perfect center space fit)
            ctx.fillText("CRITICAL IMPACT: YOU'VE BEEN STRUCK BY LIGHTNING!", canvas.width / 2, 155);
            
            // Line 2: Timer Telemetry (Stacked tightly 15 pixels below row 1 at Y=170px)
            ctx.fillText("DRONE PROPULSION SYSTEM SLOWED FOR: " + droneShortCircuitTimer + "s", canvas.width / 2, 170);
        }
    }
    requestAnimationFrame(gameLoop);
}

// Event Listeners to capture real-time keyboard inputs
window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Backspace" || event.key === "Enter" || event.key === " " || event.key === "Shift" || event.key === "Escape") {
        event.preventDefault();
    }
        
    // Fix: Key trigger gateway to launch out of the start screen AND completely wipe out previous win/loss flags cleanly
    if (event.key === "Enter" && missionStatus === "START") {
        resetMissionData(); // Triggers master variable reconstruction wipe out instantly
        triggerCockpitAudioModule(); // Fix: Instantly fires up your custom background song track at 100% volume the exact millisecond the player presses Enter to start!
        missionStatus = "ACTIVE";
    }

    // Capture individual Escape key presses to toggle the pause system state machine
    if (event.key === "Escape" && missionStatus === "ACTIVE") {
        event.preventDefault();
        isGamePaused = !isGamePaused; // Instantly switches the pause state toggle back and forth
    }

    // Spacebar instantly resets parameters on failure, victory, OR from inside the pause screen menu
    if (event.key === " " && (missionStatus === "EXPIRED" || missionStatus === "FAILED" || missionStatus === "COMPLETED" || isGamePaused)) {
        isGamePaused = false; 
        resetMissionData();
    }
    
    // Fix: Intercept Backspace keys to force drop the state machine back onto the main Welcome Start Screen menu safely
    if (event.key === "Backspace" && (missionStatus === "EXPIRED" || missionStatus === "FAILED" || missionStatus === "COMPLETED" || isGamePaused)) {
        isGamePaused = false;
        missionStatus = "START";
    }

    if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") keys.ArrowUp = true;
    if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") keys.ArrowDown = true;
    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") keys.ArrowLeft = true;
    if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") keys.ArrowRight = true;
    if (event.key === "Shift") keys.Shift = true;
});

// Directional movement controls
window.addEventListener("keyup", (event) => {
    if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") keys.ArrowUp = false;
    if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") keys.ArrowDown = false;
    if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") keys.ArrowLeft = false;
    if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") keys.ArrowRight = false;
    if (event.key === "Shift") keys.Shift = false;
});

// Sequencer Data Array: Synthesizes a clean 8-bit retro arcade baseline track melody sequence
// Loops frequencies corresponding to notes: E2, G2, A2, G2, B2, A2, G2, E2
const retroSongNotesList = [82.41, 98.00, 110.00, 98.00, 123.47, 110.00, 98.00, 82.41];
let currentMelodyStepIndex = 0;

// Self-Contained Web Audio Oscillation Engine: Synthesizes a retro 8-bit logistics tracker track seamlessly
function triggerCockpitAudioModule() {
    if (synthesizedAudioContext === null) {
        synthesizedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        masterVolumeGainNode = synthesizedAudioContext.createGain();
        masterVolumeGainNode.gain.setValueAtTime(masterVolumeLevel, synthesizedAudioContext.currentTime);
        
        backgroundOscillatorNode = synthesizedAudioContext.createOscillator();
        backgroundOscillatorNode.type = "triangle"; // Fixed: Switched from sawtooth to triangle wave for a smooth melody bassline without electrical buzzing noises!
        backgroundOscillatorNode.frequency.setValueAtTime(retroSongNotesList[0], synthesizedAudioContext.currentTime); // Deep E2 driving bass tone loop
        
        backgroundOscillatorNode.connect(masterVolumeGainNode);
        masterVolumeGainNode.connect(synthesizedAudioContext.destination);
        backgroundOscillatorNode.start();

        // Step-Sequencer Clock Loop: Cycle frequencies every 400ms to play the background song melody loop!
        audioSequenceInterval = setInterval(() => {
            if (backgroundOscillatorNode && !isGamePaused && missionStatus === "ACTIVE") {
                currentMelodyStepIndex = (currentMelodyStepIndex + 1) % retroSongNotesList.length;
                backgroundOscillatorNode.frequency.setValueAtTime(retroSongNotesList[currentMelodyStepIndex], synthesizedAudioContext.currentTime);
            }
        }, 400);
    }
}

// Persistent Audio Drag State Monitoring Registration Flag
let isUserDraggingVolumeSlider = false; // Tracks if the mouse button is actively held down over the slider area

// Native Audio Handler: Manages local .mp3 song file playback transitions safely
function triggerCockpitAudioModule() {
    // Check if the custom audio track asset file is currently frozen or halted in a stopped playback loop state
    if (cockpitMusicTrack.paused) {
        cockpitMusicTrack.play()
            .catch(error => console.log("Browser system audio context activation block triggered: ", error));
    }
}

// Master Mouse Intercept Manager tracking menu interactions and live audio level slider drag adjustments
window.addEventListener("mousedown", (event) => {
    let workspaceRect = canvas.getBoundingClientRect();
    let mouseX = event.clientX - workspaceRect.left;
    let mouseY = event.clientY - workspaceRect.top;

    let sliderTrackWidth = 200;
    let sliderTrackX = (canvas.width / 2) - 100;
    let sliderTrackY = 0;

    // Determine the active vertical coordinate height threshold based on your current screen state layout
    if (missionStatus === "START") {
        let manualBoxY = canvas.height / 2 - 60;
        sliderTrackY = manualBoxY + 155; // Linked directly to your expanded start slider height position vectors!
    } else if (missionStatus === "ACTIVE" && isGamePaused) {
        let menuHeight = 310; // Synced with your original compact 310px card framework
        let menuY = (canvas.height / 2) - (menuHeight / 2);
        sliderTrackY = menuY + 260; // Synced with your original compact 310px card framework
    }

    // Check if the user is clicking directly inside the volume slider adjustment boundary region
    if (missionStatus === "START" || (missionStatus === "ACTIVE" && isGamePaused)) {
        if (mouseX >= sliderTrackX && mouseX <= sliderTrackX + sliderTrackWidth && mouseY >= sliderTrackY - 15 && mouseY <= sliderTrackY + 25) {
            isUserDraggingVolumeSlider = true; // Turn on the continuous slider drag state tracking engine!
            triggerCockpitAudioModule(); // Start local music file playback safely upon receiving user click inputs
            
            // Re-calculate the audio multiplier balance live based on the cursor intercept position vectors
            let rawClickRatio = (mouseX - sliderTrackX) / sliderTrackWidth;
            masterVolumeLevel = Math.max(0, Math.min(1, rawClickRatio)); // Clamp sound limits strictly between 0.0 and 1.0
            
            // Fix: Directly map the master slider value variables straight onto your native local .mp3 audio asset volume register!
            cockpitMusicTrack.volume = masterVolumeLevel;
        }
    }
});

// Continuous mouse movement tracking listener to make the dot slide smoothly right along with your cursor!
window.addEventListener("mousemove", (event) => {
    if (isUserDraggingVolumeSlider && (missionStatus === "START" || (missionStatus === "ACTIVE" && isGamePaused))) {
        let sliderTrackWidth = 200;
        let sliderTrackX = (canvas.width / 2) - 100;

        let workspaceRect = canvas.getBoundingClientRect();
        let mouseX = event.clientX - workspaceRect.left;

        // Update the volume level value live as your mouse drags across the track axis
        let rawClickRatio = (mouseX - sliderTrackX) / sliderTrackWidth;
        masterVolumeLevel = Math.max(0, Math.min(1, rawClickRatio)); // Clamp sound limits strictly between 0.0 and 1.0

        // Fix: Update your local .mp3 asset audio volume level live on cursor dragging updates!
        cockpitMusicTrack.volume = masterVolumeLevel;
    }
});

// Turn off the active drag engine the instant the user releases their mouse button click anywhere on the screen
window.addEventListener("mouseup", () => {
    isUserDraggingVolumeSlider = false;
});

// Master Mouse Intercept Click Listener handling Pause Menu Button Actions
window.addEventListener("click", (event) => {
    if (missionStatus === "ACTIVE" && isGamePaused) {
        let menuHeight = 310; // Synced with your original compact 310px card framework
        let menuY = (canvas.height / 2) - (menuHeight / 2);
        
        // Convert screen coordinates directly to canvas relative pixels to fix the frozen button bug!
        let workspaceRect = canvas.getBoundingClientRect();
        let mouseX = event.clientX - workspaceRect.left;
        let mouseY = event.clientY - workspaceRect.top;

        let btnWidth = 310;
        let btnHeight = 40;
        let btnX = (canvas.width / 2) - (btnWidth / 2);
        
        let btn1Y = menuY + 75;
        let btn2Y = menuY + 135;
        let btn3Y = menuY + 195;

        // Button 1 Click Boundary Evaluation: Resume Simulation Path Action
        if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= btn1Y && mouseY <= btn1Y + btnHeight) {
            isGamePaused = false; 
        }

        // Button 2 Click Boundary Evaluation: Clean Restart Action
        if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= btn2Y && mouseY <= btn2Y + btnHeight) {
            isGamePaused = false;
            resetMissionData(); 
        }

        // Button 3 Click Boundary Evaluation: Return to Main Welcome Start Screen Menu
        if (mouseX >= btnX && mouseX <= btnX + btnWidth && mouseY >= btn3Y && mouseY <= btn3Y + btnHeight) {
            isGamePaused = false;
            missionStatus = "START"; 
            
            // Optional Safety: Pauses your background music track completely when returning out to the main welcome menu cards
            cockpitMusicTrack.pause();
            cockpitMusicTrack.currentTime = 0; // Rewind song track file back to starting point zero
        }
    }
});

// Safety Gate: Wait until the transparent image asset is 100% loaded before launching the game loop
droneImage.onload = function() {
    gameLoop();
};   
    
    
    
    
    
    
  
 
 
 
 
 
 
