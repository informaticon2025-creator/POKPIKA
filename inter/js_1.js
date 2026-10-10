        function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
        function closeModal(id) {
            document.getElementById(id).classList.add('hidden');
            if (id === 'shopModal' && resumeGameAfterShop) {
                resumeGameAfterShop = false;
                resumeGame();
            }
        }
        let resumeGameAfterShop = false;
        function updateHeaderShopVisibility() {
            const visible = !document.getElementById('gameHud').classList.contains('hidden');
            document.getElementById('headerShopLink').classList.toggle('header-shop-hidden', !visible);
            document.getElementById('headerShopButton').classList.toggle('header-shop-hidden', !visible);
        }

        let soundEnabled = true;
        let effectsEnabled = true;
        let musicEnabled = true;
        let effectsVolume = 0.65;
        let musicVolume = 0.3;
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        let backgroundMusicTimer = null;
        let nextMusicNoteTime = 0;
        let musicStep = 0;
        const musicVoices = new Set();
        const backgroundMelody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46, 523.25, 659.25, 783.99, 987.77, 880, 783.99, 659.25, 587.33];
        const backgroundBass = [130.81, 146.83, 110, 98];

        function playSynthTone(freq, type, duration, vol = 0.1) {
            if (!soundEnabled || !effectsEnabled) return;
            try {
                if (audioCtx.state === 'suspended') audioCtx.resume();
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
                gain.gain.setValueAtTime(Math.max(0.0001, vol * effectsVolume), audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + duration);
            } catch (e) {}
        }

        function playJumpSound() { playSynthTone(300, 'square', 0.15, 0.1); setTimeout(() => playSynthTone(550, 'square', 0.15, 0.1), 80); }
        function playCoinSound() { playSynthTone(987.77, 'sine', 0.1, 0.1); setTimeout(() => playSynthTone(1318.51, 'sine', 0.2, 0.1), 80); }
        function playHitSound() { playSynthTone(120, 'sawtooth', 0.3, 0.2); setTimeout(() => playSynthTone(60, 'sawtooth', 0.4, 0.2), 100); }
        function playFireballSound() { playSynthTone(600, 'triangle', 0.2, 0.15); setTimeout(() => playSynthTone(200, 'sawtooth', 0.25, 0.15), 50); }
        function playPowerupSound() { playSynthTone(440, 'sine', 0.1, 0.1); setTimeout(() => playSynthTone(880, 'sine', 0.2, 0.15), 100); }

        function scheduleMusicNote(frequency, startTime, duration, type, volume) {
            const oscillator = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const voice = { oscillator, gain, stopped: false };
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, startTime);
            gain.gain.setValueAtTime(0.0001, startTime);
            gain.gain.linearRampToValueAtTime(Math.max(0.0001, volume * musicVolume), startTime + 0.025);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
            oscillator.connect(gain);
            gain.connect(audioCtx.destination);
            oscillator.onended = () => {
                voice.stopped = true;
                musicVoices.delete(voice);
            };
            musicVoices.add(voice);
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        }

        function scheduleBackgroundMusic() {
            const beatLength = 0.3;
            const lookAhead = 0.2;
            while (nextMusicNoteTime < audioCtx.currentTime + lookAhead) {
                const note = backgroundMelody[musicStep % backgroundMelody.length];
                scheduleMusicNote(note, nextMusicNoteTime, beatLength * 0.85, 'triangle', 0.035);
                if (musicStep % 4 === 0) {
                    const bass = backgroundBass[Math.floor(musicStep / 4) % backgroundBass.length];
                    scheduleMusicNote(bass, nextMusicNoteTime, beatLength * 3.5, 'sine', 0.025);
                }
                nextMusicNoteTime += beatLength;
                musicStep++;
            }
        }

        function startBackgroundMusic() {
            if (!soundEnabled || !musicEnabled || backgroundMusicTimer !== null) return;
            if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(error => console.error('No se pudo iniciar la música de fondo:', error));
            }
            nextMusicNoteTime = audioCtx.currentTime + 0.05;
            scheduleBackgroundMusic();
            backgroundMusicTimer = setInterval(scheduleBackgroundMusic, 80);
        }

        function stopBackgroundMusic() {
            if (backgroundMusicTimer !== null) {
                clearInterval(backgroundMusicTimer);
                backgroundMusicTimer = null;
            }
            const stopTime = audioCtx.currentTime + 0.03;
            musicVoices.forEach(voice => {
                if (voice.stopped) return;
                voice.gain.gain.cancelScheduledValues(audioCtx.currentTime);
                voice.gain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.008);
                voice.oscillator.stop(stopTime);
                voice.stopped = true;
            });
            musicVoices.clear();
        }

        function toggleSound() {
            soundEnabled = !soundEnabled;
            const modalToggle = document.getElementById('modalSoundToggle');
            if (soundEnabled) {
                modalToggle.textContent = "Activado";
                modalToggle.className = "px-4 py-1.5 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold";
            } else {
                modalToggle.textContent = "Silenciado";
                modalToggle.className = "px-4 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs font-bold";
            }
            if (soundEnabled && gameRunning) startBackgroundMusic();
            else stopBackgroundMusic();
        }

        function updateAudioSettings() {
            document.getElementById('musicToggle').checked = musicEnabled;
            document.getElementById('effectsToggle').checked = effectsEnabled;
            document.getElementById('musicVolume').value = String(Math.round(musicVolume * 100));
            document.getElementById('effectsVolume').value = String(Math.round(effectsVolume * 100));
            document.getElementById('musicVolumeValue').textContent = `${Math.round(musicVolume * 100)}%`;
            document.getElementById('effectsVolumeValue').textContent = `${Math.round(effectsVolume * 100)}%`;
        }

        function setMusicEnabled(enabled) {
            musicEnabled = enabled;
            if (musicEnabled && soundEnabled && gameRunning) startBackgroundMusic();
            else stopBackgroundMusic();
        }

        function setEffectsEnabled(enabled) {
            effectsEnabled = enabled;
        }

        document.getElementById('musicToggle').addEventListener('change', event => {
            setMusicEnabled(event.currentTarget.checked);
        });
        document.getElementById('effectsToggle').addEventListener('change', event => {
            setEffectsEnabled(event.currentTarget.checked);
        });
        document.getElementById('musicVolume').addEventListener('input', event => {
            musicVolume = Number(event.currentTarget.value) / 100;
            document.getElementById('musicVolumeValue').textContent = `${event.currentTarget.value}%`;
        });
        document.getElementById('effectsVolume').addEventListener('input', event => {
            effectsVolume = Number(event.currentTarget.value) / 100;
            document.getElementById('effectsVolumeValue').textContent = `${event.currentTarget.value}%`;
        });
        updateAudioSettings();

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const container = document.getElementById('canvasContainer');

        // Set your image paths here, for example: './GIF/obstaculo.png'.
        const gameAssets = {
            obstacle: './GIF/patri_2.gif',
            villain: './GIF/patri.gif',
            levelSixStatic: './GIF/patri_4.png',
            levelSixPursuer: './GIF/patri_3.png',
            goal: '' // Imagen de la cueva-meta.
        };
        const playerImg = document.getElementById('playerSprite');
        const playerSprite = playerImg;
        function loadGameImage(src, label) {
            if (!src) return null;
            const image = new Image();
            image.onerror = () => console.error(`No se pudo cargar la imagen de ${label}: ${src}`);
            image.src = src;
            return image;
        }
        const obstacleImg = loadGameImage(gameAssets.obstacle, 'obstáculo');
        const mineExplosionImg = loadGameImage('./GIF/vortice_1.gif', 'explosión de mina');
        const villainImg = gameAssets.villain === gameAssets.obstacle
            ? obstacleImg
            : loadGameImage(gameAssets.villain, 'monstruo');
        const levelSixStaticImg = loadGameImage(gameAssets.levelSixStatic, 'monstruo del nivel 6');
        const levelSixPursuerImg = loadGameImage(gameAssets.levelSixPursuer, 'perseguidor del nivel 6');
        const goalImg = loadGameImage(gameAssets.goal, 'cueva-meta');
        let imageLoaded = false;
        playerImg.onload = () => { imageLoaded = true; };
        playerImg.onerror = () => {
            imageLoaded = false;
            console.error(`No se pudo cargar la imagen del jugador: ${playerImg.src}`);
        };
        imageLoaded = playerImg.complete && playerImg.naturalWidth > 0;

        let gameRunning = false;
        let isPaused = false;
        let hasGameplayStarted = false;
        let damageFlashFrames = 0;
        let score = 0;
        let coins = 0;
        let lives = 3;
        const maxLives = 5;
        let highestLevel = 1;
        const minPlatformGap = 124;
        const maxPlatformGap = 184;
        let currentLevel = 1;
        let levelTimer = 90;
        let timerInterval = null;
        let gameSpeed = 5.5;
        let frameCount = 0;
        let platformRunSeed = 1;
        let nextEnemySpawnFrame = 90;
        let nextMineSpawnFrame = 180;
        let levelGoal = null;
        let themeTransitionFrom = null;
        let themeTransitionStart = 0;
        let cameraOffsetY = 0;

        const levelThemes = [
            { name: 'Bosque', type: 'forest', hue: 112, skyTop: '#6fc7f2', skyBottom: '#d5f6ff', far: '#38a34a', near: '#176b37', sun: '#ffcb05', platform: '#76512f', platformEdge: '#ffcb05' },
            { name: 'De noche', type: 'night', hue: 220, skyTop: '#10245b', skyBottom: '#315da8', far: '#244681', near: '#142c56', sun: '#ffcb05', platform: '#315ba8', platformEdge: '#73c8f0' },
            { name: 'Inframundo de fuego', type: 'underworld', hue: 18, skyTop: '#32122f', skyBottom: '#f04b16', far: '#a52a20', near: '#5d1b24', sun: '#ffcb05', platform: '#7a352c', platformEdge: '#ff6b24' },
            { name: 'Moco verde', type: 'slime', hue: 93, skyTop: '#6dbb35', skyBottom: '#c5ed54', far: '#359b3b', near: '#176b37', sun: '#ffcb05', platform: '#36843c', platformEdge: '#9be843' }
        ];

        function getLevelSettings(level) {
            const levelTheme = levelThemes[(level - 1) % levelThemes.length];
            const difficulty = level - 1;
            return {
                duration: Math.max(55, 90 - Math.floor(difficulty * 0.8)),
                speed: Math.min(10, 5.5 + difficulty * 0.12),
                enemyInterval: Math.max(65, 180 - difficulty * 2.5),
                coinInterval: Math.max(55, 100 - difficulty),
                chestInterval: Math.max(300, 620 - difficulty * 7),
                powerupInterval: Math.max(180, 360 - difficulty * 4),
                pursuerChance: Math.min(0.65, 0.2 + difficulty * 0.012),
                platformHazardChance: Math.min(0.5, 0.18 + difficulty * 0.008),
                theme: levelTheme,
                name: `Escenario ${((level - 1) % levelThemes.length) + 1}: ${levelTheme.name}`
            };
        }

        let currentLevelSettings = getLevelSettings(currentLevel);

        function resizeCanvas() {
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (!width || !height || (canvas.width === width && canvas.height === height)) return;

            const previousWidth = canvas.width;
            const previousHeight = canvas.height;
            canvas.width = width;
            canvas.height = height;
            if (!previousWidth || !previousHeight || !gameRunning) return;

            const scaleX = width / previousWidth;
            const scaleY = height / previousHeight;
            player.x *= scaleX;
            player.y *= scaleY;
            player.width = Math.min(72, Math.max(44, width * 0.085));
            player.height = player.width * 0.75;
            player.vy *= scaleY;
            cameraOffsetY *= scaleY;
            platforms.forEach(platform => {
                platform.x *= scaleX;
                platform.y *= scaleY;
                platform.width *= scaleX;
            });
            groundSegments.forEach(segment => {
                segment.x *= scaleX;
                segment.width *= scaleX;
            });
            obstacles.forEach(obstacle => {
                obstacle.x *= scaleX;
                obstacle.y *= scaleY;
                obstacle.targetY *= scaleY;
                obstacle.width *= scaleX;
                obstacle.height *= scaleY;
            });
            collectibles.forEach(item => {
                item.x *= scaleX;
                item.y *= scaleY;
                item.radius *= Math.min(scaleX, scaleY);
            });
            [...rewardChests, ...powerups, ...lifePickups, ...enemyBolts].forEach(item => {
                item.x *= scaleX;
                item.y *= scaleY;
                if (item.width) item.width *= scaleX;
                if (item.height) item.height *= scaleY;
                if (item.vx) item.vx *= scaleX;
                if (item.vy) item.vy *= scaleY;
            });
            mines.forEach(mine => {
                mine.x *= scaleX;
                mine.y *= scaleY;
                mine.width *= scaleX;
                mine.height *= scaleY;
            });
            explosions.forEach(explosion => {
                explosion.x *= scaleX;
                explosion.y *= scaleY;
                explosion.width *= Math.min(scaleX, scaleY);
                explosion.height *= Math.min(scaleX, scaleY);
            });
            fireballs.forEach(item => {
                item.x *= scaleX;
                item.y *= scaleY;
                item.width *= scaleX;
                item.height *= scaleY;
            });
            if (levelGoal) {
                levelGoal.x *= scaleX;
                levelGoal.width *= scaleX;
                levelGoal.height *= scaleY;
                levelGoal.startX *= scaleX;
                levelGoal.targetX *= scaleX;
            }
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        if (window.ResizeObserver) new ResizeObserver(resizeCanvas).observe(container);

        function getGroundMargin() {
            return Math.min(120, Math.max(64, canvas.height * 0.2));
        }

        function getGroundY() {
            return canvas.height - getGroundMargin();
        }

        let player = {
            x: 80,
            y: 0,
            width: 72,
            height: 54,
            vy: 0,
            jumpForce: -13,
            gravity: 0.65,
            isJumping: false,
            activePower: null, // 'rayito' o 'fuego'
            powerTimer: 0,     // 20 segundos (1200 frames)
            fireAmmo: 0
        };

        let platforms = [];
        let groundSegments = [];
        let obstacles = [];      // Estáticos y perseguidores
        let collectibles = [];
        let rewardChests = [];
        let powerups = [];       // Rayito / Fuego
        let lifePickups = [];
        let fireballs = [];
        let enemyBolts = [];
        let mines = [];
        let explosions = [];
        let shieldTimerFrames = 0;
        let iceTimerFrames = 0;
        let multiNextCoin = false;
        let runInProgress = false;
        let savedRun = null;
        let lastPersistentSave = 0;
        let persistenceErrorReported = false;
        const persistenceKey = 'comecome-player-save-v1';
        const powerCatalog = {
            rayito: { price: 20, label: 'Rayito', duration: 4 },
            celoz: { price: 30, label: 'Celoz', duration: 5 },
            ice: { price: 25, label: 'Ice', duration: 3 },
            multi: { price: 35, label: 'Multi', duration: 0 }
        };
        const powerInventory = { rayito: 0, celoz: 0, ice: 0, multi: 0 };
        let platformRandom = Math.random;
        let platformRouteIndex = 0;

        function loadPersistentData() {
            try {
                const raw = localStorage.getItem(persistenceKey);
                if (!raw) return;
                const data = JSON.parse(raw);
                if (!data || typeof data !== 'object') throw new Error('Formato de partida inválido.');
                coins = Number.isSafeInteger(data.coins) && data.coins >= 0 ? data.coins : 0;
                highestLevel = Number.isInteger(data.highestLevel) && data.highestLevel >= 1
                    ? Math.min(40, data.highestLevel)
                    : 1;
                Object.keys(powerCatalog).forEach(power => {
                    const count = data.inventory?.[power];
                    powerInventory[power] = Number.isSafeInteger(count) && count >= 0 ? count : 0;
                });
                const run = data.savedRun;
                if (
                    run && Number.isFinite(run.score) &&
                    Number.isInteger(run.level) && run.level >= 1 && run.level <= 40 &&
                    Number.isInteger(run.lives) && run.lives > 0 && run.lives <= maxLives
                ) {
                    highestLevel = Math.max(highestLevel, Math.min(40, run.level));
                    savedRun = {
                        score: Math.max(0, run.score),
                        level: run.level,
                        lives: run.lives,
                        levelTimer: Number.isInteger(run.levelTimer)
                            ? Math.max(1, Math.min(90, run.levelTimer))
                            : getLevelSettings(run.level).duration,
                        multiNextCoin: run.multiNextCoin === true,
                        activePower: ['rayito', 'fuego'].includes(run.activePower) ? run.activePower : null,
                        powerTimer: Number.isInteger(run.powerTimer) ? Math.max(0, run.powerTimer) : 0,
                        shieldTimerFrames: Number.isInteger(run.shieldTimerFrames) ? Math.max(0, run.shieldTimerFrames) : 0,
                        iceTimerFrames: Number.isInteger(run.iceTimerFrames) ? Math.max(0, run.iceTimerFrames) : 0,
                        fireAmmo: Number.isInteger(run.fireAmmo) ? Math.max(0, run.fireAmmo) : 0
                    };
                }
            } catch (error) {
                console.error('No se pudo cargar la partida guardada:', error);
            }
        }

        function savePersistentData(force = false) {
            const now = Date.now();
            if (!force && (!runInProgress || now - lastPersistentSave < 1000)) return;
            if (runInProgress) {
                savedRun = {
                    score,
                    level: currentLevel,
                    lives,
                    levelTimer,
                    multiNextCoin,
                    activePower: player.activePower,
                    powerTimer: player.powerTimer,
                    shieldTimerFrames,
                    iceTimerFrames,
                    fireAmmo: player.fireAmmo
                };
            }
            try {
                localStorage.setItem(persistenceKey, JSON.stringify({
                    coins,
                    inventory: powerInventory,
                    savedRun,
                    highestLevel
                }));
                lastPersistentSave = now;
                persistenceErrorReported = false;
            } catch (error) {
                if (!persistenceErrorReported) {
                    console.error('No se pudo guardar la partida en el almacenamiento local:', error);
                    persistenceErrorReported = true;
                }
            }
        }

        function updateShopUI() {
            const balance = document.getElementById('shopCoins');
            if (balance) balance.textContent = String(coins);
            let powerCount = 0;
            Object.keys(powerCatalog).forEach(power => {
                const count = powerInventory[power];
                powerCount += count;
                const capitalized = power[0].toUpperCase() + power.slice(1);
                const shopCount = document.getElementById(`shop${capitalized}Count`);
                const touchCount = document.getElementById(`${power}Inventory`);
                const touchButton = document.getElementById(`activate${capitalized}Btn`);
                if (shopCount) shopCount.textContent = String(count);
                if (touchCount) touchCount.textContent = `×${count}`;
                if (touchButton) touchButton.classList.toggle('hidden', count === 0);
            });
            const powerButtons = document.getElementById('powerTouchButtons');
            if (powerButtons) powerButtons.classList.toggle('hidden', powerCount === 0);
            const continueButton = document.getElementById('continueGameBtn');
            if (continueButton) continueButton.classList.toggle('hidden', !savedRun);
        }

        function openShop() {
            if (gameRunning && !isPaused) {
                resumeGameAfterShop = true;
                pauseGame();
            }
            updateShopUI();
            openModal('shopModal');
        }

        function buyShopPower(power) {
            const item = powerCatalog[power];
            if (!item) {
                console.error(`Poder de tienda desconocido: ${power}`);
                return;
            }
            const message = document.getElementById('shopMessage');
            if (coins < item.price) {
                if (message) message.textContent = `Te faltan ${item.price - coins} monedas para comprar ${item.label}.`;
                return;
            }
            coins -= item.price;
            powerInventory[power]++;
            if (message) message.textContent = `¡Compraste ${item.label}! Ya puedes activarlo durante la partida.`;
            updateScoreAndCoinsDisplay();
            updateShopUI();
            savePersistentData(true);
            playCoinSound();
        }

        function claimCoinReward(baseValue) {
            const amount = baseValue * (multiNextCoin ? 3 : 1);
            coins += amount;
            score += 20 * amount;
            multiNextCoin = false;
            updateScoreAndCoinsDisplay();
            updatePowerIndicator();
            playCoinSound();
        }

        function updatePowerIndicator() {
            const indicator = document.getElementById('activePowerIndicator');
            const labels = [];
            if (player.activePower === 'rayito') {
                labels.push(`Rayito ${Math.ceil(player.powerTimer / 60)}s`);
            } else if (player.activePower === 'fuego') {
                labels.push(`Fuego ${Math.ceil(player.powerTimer / 60)}s`);
            }
            if (shieldTimerFrames > 0) labels.push(`Celoz ${Math.ceil(shieldTimerFrames / 60)}s`);
            if (iceTimerFrames > 0) labels.push(`Ice ${Math.ceil(iceTimerFrames / 60)}s`);
            if (multiNextCoin) labels.push('Multi x3 próxima moneda');
            indicator.classList.toggle('hidden', labels.length === 0);
            indicator.classList.toggle('flex', labels.length > 0);
            if (labels.length > 0) document.getElementById('powerNameText').textContent = labels.join(' · ');
            document.getElementById('powerTimerText').textContent = '';
        }

        function activateShopPower(power) {
            if (!gameRunning || !powerCatalog[power] || powerInventory[power] < 1) return;
            startGameplayOnFirstInput();
            powerInventory[power]--;
            if (power === 'rayito') {
                player.activePower = 'rayito';
                player.powerTimer = powerCatalog.rayito.duration * 60;
            } else if (power === 'celoz') {
                shieldTimerFrames = powerCatalog.celoz.duration * 60;
            } else if (power === 'ice') {
                iceTimerFrames = powerCatalog.ice.duration * 60;
            } else if (power === 'multi') {
                multiNextCoin = true;
            }
            updatePowerIndicator();
            updateShopUI();
            savePersistentData(true);
            playPowerupSound();
        }

        function continueSavedGame() {
            if (!savedRun) return;
            startGame(true);
        }

        loadPersistentData();
        if (savedRun) {
            currentLevel = savedRun.level;
            currentLevelSettings = getLevelSettings(currentLevel);
        }

        function removeObstacleSprite(obstacle) {
            if (obstacle.sprite) obstacle.sprite.remove();
        }

        function clearObstacles() {
            obstacles.forEach(removeObstacleSprite);
            obstacles = [];
        }

        function positionSprite(sprite, x, y, width, height) {
            const canvasRect = canvas.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const scaleX = canvasRect.width / canvas.width;
            const scaleY = canvasRect.height / canvas.height;
            sprite.style.left = `${canvasRect.left - containerRect.left + x * scaleX}px`;
            sprite.style.top = `${canvasRect.top - containerRect.top + y * scaleY}px`;
            sprite.style.width = `${width * scaleX}px`;
            sprite.style.height = `${height * scaleY}px`;
        }

        function updateLivesDisplay() {
            const containerEl = document.getElementById('livesDisplay');
            containerEl.innerHTML = '';
            for (let i = 0; i < maxLives; i++) {
                const icon = document.createElement('i');
                if (i < lives) {
                    icon.className = "fa-solid fa-heart text-pink-500 text-sm animate-pulse";
                } else {
                    icon.className = "fa-regular fa-heart text-slate-600 text-sm";
                }
                containerEl.appendChild(icon);
            }
            savePersistentData();
        }

        function updateScoreAndCoinsDisplay() {
            document.getElementById('scoreDisplay').textContent = String(Math.floor(score)).padStart(6, '0');
            document.getElementById('coinsDisplay').textContent = `x${String(coins).padStart(2, '0')}`;
            updateShopUI();
            savePersistentData();
        }

        updateLivesDisplay();
        updateScoreAndCoinsDisplay();
        window.addEventListener('beforeunload', () => savePersistentData(true));

        function resetGroundSegments() {
            groundSegments = [{
                x: 0,
                width: Math.max(gameSpeed * 60 * 12, canvas.width + 700)
            }];
            extendGroundSegments();
        }

        function extendGroundSegments() {
            while (
                groundSegments.length === 0 ||
                groundSegments[groundSegments.length - 1].x +
                    groundSegments[groundSegments.length - 1].width < canvas.width * 1.5
            ) {
                const last = groundSegments[groundSegments.length - 1];
                const lastEnd = last ? last.x + last.width : 0;
                const gapWidth = 125 + Math.random() * Math.min(65, 25 + currentLevel * 1.2);
                const segmentWidth = gameSpeed * 60 * (10 + Math.random() * 8);
                groundSegments.push({
                    x: lastEnd + gapWidth,
                    width: segmentWidth
                });
            }
        }

        function playerIsOverSolidGround(groundY) {
            const playerCenterX = player.x + player.width / 2;
            return groundSegments.some(segment =>
                playerCenterX >= segment.x && playerCenterX <= segment.x + segment.width
            );
        }

        function loseLifeInPit() {
            lives--;
            damageFlashFrames = 90;
            updateLivesDisplay();
            playHitSound();
            if (lives <= 0) {
                gameOver();
                return;
            }

            cameraOffsetY = 0;
            player.y = getGroundY() - player.height;
            player.vy = 0;
            player.isJumping = false;
            groundSegments = [{
                x: 0,
                width: Math.max(gameSpeed * 60 * 15, canvas.width * 3)
            }];
            clearObstacles();
            collectibles = [];
            rewardChests = [];
            powerups = [];
            lifePickups = [];
            fireballs = [];
            enemyBolts = [];
            mines = [];
            explosions = [];
            generatePlatforms();
            extendGroundSegments();
        }

        function startGame(resumeSavedGame = false) {
            document.getElementById('startScreen').classList.add('hidden');
            document.getElementById('tutorialScreen').classList.add('hidden');
            document.getElementById('pauseScreen').classList.add('hidden');
            document.getElementById('pauseMenu').classList.remove('hidden');
            document.getElementById('pauseSettings').classList.add('hidden');
            document.getElementById('gameHud').classList.remove('hidden');
            updateHeaderShopVisibility();
            document.getElementById('mobileControls').classList.remove('hidden');
            document.getElementById('gameOverScreen').classList.add('hidden');
            
            const runToResume = resumeSavedGame ? savedRun : null;
            score = runToResume ? runToResume.score : 0;
            lives = runToResume ? runToResume.lives : 3;
            currentLevel = runToResume ? runToResume.level : 1;
            highestLevel = Math.max(highestLevel, currentLevel);
            currentLevelSettings = getLevelSettings(currentLevel);
            levelTimer = runToResume ? runToResume.levelTimer : currentLevelSettings.duration;
            gameSpeed = currentLevelSettings.speed;
            frameCount = 0;
            damageFlashFrames = 0;
            shieldTimerFrames = runToResume ? runToResume.shieldTimerFrames : 0;
            iceTimerFrames = runToResume ? runToResume.iceTimerFrames : 0;
            multiNextCoin = runToResume ? runToResume.multiNextCoin : false;
            platformRunSeed = Math.floor(Math.random() * 2147483646) + 1;
            nextEnemySpawnFrame = 60 + Math.floor(Math.random() * 100);
            nextMineSpawnFrame = 180 + Math.floor(Math.random() * 80);
            levelGoal = null;
            cameraOffsetY = 0;
            
            clearObstacles();
            collectibles = [];
            rewardChests = [];
            powerups = [];
            lifePickups = [];
            fireballs = [];
            enemyBolts = [];
            mines = [];
            explosions = [];
            platforms = [];
            resetGroundSegments();
            updateScoreAndCoinsDisplay();

            generatePlatforms();

            player.y = getGroundY() - player.height;
            player.vy = 0;
            player.isJumping = false;
            player.x = 80;
            player.width = Math.min(72, Math.max(44, canvas.width * 0.085));
            player.height = player.width * 0.75;
            player.y = getGroundY() - player.height;
            player.activePower = runToResume ? runToResume.activePower : null;
            player.powerTimer = runToResume ? runToResume.powerTimer : 0;
            player.fireAmmo = runToResume ? runToResume.fireAmmo : 0;
            hasGameplayStarted = false;
            isPaused = false;
            runInProgress = true;
            if (!runToResume) savedRun = null;

            document.getElementById('activePowerIndicator').classList.add('hidden');
            document.getElementById('endTitle').textContent = 'FIN DEL JUEGO';
            document.getElementById('endTitle').classList.remove('text-green-400');
            document.getElementById('endTitle').classList.add('text-red-400');
            document.getElementById('endMessage').textContent = 'El sistema cibernético te ha alcanzado';
            updateLivesDisplay();
            updateScoreAndCoinsDisplay();
            updateRouteProgress();
            updatePowerIndicator();
            savePersistentData(true);
            gameRunning = true;
            startBackgroundMusic();

            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                if (!gameRunning || levelGoal || !hasGameplayStarted) return;
                levelTimer = Math.max(0, levelTimer - 1);
                updateRouteProgress();
                savePersistentData(true);

                if (levelTimer === 0) beginLevelGoal();
            }, 1000);
        }

        function pauseGame() {
            if (!gameRunning) return;
            gameRunning = false;
            isPaused = true;
            document.getElementById('pauseMenu').classList.remove('hidden');
            document.getElementById('pauseSettings').classList.add('hidden');
            document.getElementById('pauseScreen').classList.remove('hidden');
            document.getElementById('mobileControls').classList.add('hidden');
            stopBackgroundMusic();
            savePersistentData(true);
        }

        function resumeGame() {
            if (!isPaused) return;
            isPaused = false;
            gameRunning = true;
            document.getElementById('pauseScreen').classList.add('hidden');
            document.getElementById('mobileControls').classList.remove('hidden');
            savePersistentData(true);
            if (soundEnabled && musicEnabled) startBackgroundMusic();
        }

        function showPauseSettings() {
            updateAudioSettings();
            document.getElementById('pauseMenu').classList.add('hidden');
            document.getElementById('pauseSettings').classList.remove('hidden');
        }

        function showPauseMenu() {
            document.getElementById('pauseSettings').classList.add('hidden');
            document.getElementById('pauseMenu').classList.remove('hidden');
        }

        function returnToStart() {
            savePersistentData(true);
            gameRunning = false;
            isPaused = false;
            runInProgress = false;
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            stopBackgroundMusic();
            clearObstacles();
            document.getElementById('pauseScreen').classList.add('hidden');
            document.getElementById('gameOverScreen').classList.add('hidden');
            document.getElementById('tutorialScreen').classList.add('hidden');
            document.getElementById('gameHud').classList.add('hidden');
            document.getElementById('mobileControls').classList.add('hidden');
            document.getElementById('startScreen').classList.remove('hidden');
            updateHeaderShopVisibility();
            updateShopUI();
        }

        const tutorialSteps = [
            {
                icon: 'fa-solid fa-flag-checkered',
                title: 'Tu misión',
                text: 'Avanza por cada escenario antes de que el reloj llegue a cero. Cuando se acabe el recorrido, aparecerá la cueva: llega hasta ella para pasar al siguiente nivel.'
            },
            {
                icon: 'fa-solid fa-gamepad',
                title: 'Cómo moverte',
                text: 'Salta con Espacio, flecha arriba o tocando el juego. En móvil usa el botón SALTAR. Pulsa A o el botón FUEGO para lanzar una bola cuando tengas el poder.'
            },
            {
                icon: 'fa-solid fa-person-falling',
                title: 'Plataformas y fosas',
                text: 'Salta entre plataformas cada vez más altas: la cámara te seguirá al subir. Evita también las fosas; si caes pierdes una vida. Recoge corazones para recuperarlas.'
            },
            {
                icon: 'fa-solid fa-bolt',
                title: 'Poderes y objetos',
                text: 'Recoge rayos para correr más y fuego para atacar. Compra Rayito, Celoz, Ice y Multi en la tienda; actívalos con los botones de móvil o las teclas 1–4. Las monedas quedan guardadas.'
            },
            {
                icon: 'fa-solid fa-ghost',
                title: 'Enemigos',
                text: 'Esquiva a Miu en el camino y a los monstruos que aparecen sobre algunas plataformas. Desde el nivel 6, los perseguidores disparan bolas de energía moradas. Si te golpean pierdes una vida.'
            }
        ];
        let tutorialStepIndex = 0;

        function renderTutorialStep() {
            const step = tutorialSteps[tutorialStepIndex];
            document.getElementById('tutorialStepCount').textContent =
                `PASO ${tutorialStepIndex + 1} DE ${tutorialSteps.length}`;
            document.getElementById('tutorialIcon').innerHTML = `<i class="${step.icon}" aria-hidden="true"></i>`;
            document.getElementById('tutorialTitle').textContent = step.title;
            document.getElementById('tutorialText').textContent = step.text;
            document.getElementById('tutorialBackBtn').classList.toggle('hidden', tutorialStepIndex === 0);
            const nextButton = document.getElementById('tutorialNextBtn');
            nextButton.innerHTML = tutorialStepIndex === tutorialSteps.length - 1
                ? 'Terminar y jugar <i class="fa-solid fa-play" aria-hidden="true"></i>'
                : 'Siguiente <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>';
        }

        function beginTutorial(event) {
            if (event?.target.closest('button')) return;
            if (gameRunning) return;
            document.getElementById('startScreen').classList.add('hidden');
            document.getElementById('tutorialScreen').classList.remove('hidden');
            tutorialStepIndex = 0;
            renderTutorialStep();
            document.getElementById('tutorialNextBtn').focus();
        }

        document.getElementById('startScreen').addEventListener('click', beginTutorial);
        document.getElementById('startScreen').addEventListener('keydown', event => {
            if (event.target.closest('button')) return;
            if (event.code === 'Enter' || event.code === 'Space') {
                event.preventDefault();
                beginTutorial();
            }
        });
        document.getElementById('tutorialBackBtn').addEventListener('click', () => {
            if (tutorialStepIndex === 0) return;
            tutorialStepIndex--;
            renderTutorialStep();
        });
        document.getElementById('tutorialNextBtn').addEventListener('click', () => {
            if (tutorialStepIndex < tutorialSteps.length - 1) {
                tutorialStepIndex++;
                renderTutorialStep();
                return;
            }
            startGame();
        });

        function updateRouteProgress() {
            document.getElementById('levelDisplay').textContent = `${currentLevel}/40`;
            document.getElementById('levelNameDisplay').textContent = currentLevelSettings.name;
            const minutes = Math.floor(levelTimer / 60);
            const seconds = levelTimer % 60;
            document.getElementById('timeDisplay').textContent =
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            const progressBar = document.getElementById('routeProgress');
            const routePlayer = document.getElementById('routePlayer');
            let progress = (currentLevelSettings.duration - levelTimer) / currentLevelSettings.duration;

            if (levelGoal) {
                const walkingDistance = Math.max(1, levelGoal.targetX - levelGoal.startX);
                const walkingProgress = Math.min(1, Math.max(0, (player.x - levelGoal.startX) / walkingDistance));
                progress = 0.84 + walkingProgress * 0.16;
            } else {
                progress *= 0.84;
            }

            const percentage = Math.round(Math.min(100, Math.max(0, progress * 100)));
            routePlayer.style.left = `${percentage}%`;
            progressBar.setAttribute('aria-valuenow', String(percentage));
            progressBar.setAttribute('aria-valuetext', `Nivel ${currentLevel}: ${percentage}% del recorrido`);
        }

        function advanceLevel() {
            levelGoal = null;
            if (currentLevel >= 40) {
                endGame(true);
                return;
            }
            currentLevel++;
            highestLevel = Math.max(highestLevel, currentLevel);
            themeTransitionFrom = currentLevelSettings.theme;
            themeTransitionStart = performance.now();
            currentLevelSettings = getLevelSettings(currentLevel);
            levelTimer = currentLevelSettings.duration;
            gameSpeed = currentLevelSettings.speed;
            frameCount = 0;
            damageFlashFrames = 0;
            nextEnemySpawnFrame = 60 + Math.floor(Math.random() * 100);
            nextMineSpawnFrame = 180 + Math.floor(Math.random() * 80);
            cameraOffsetY = 0;
            clearObstacles();
            collectibles = [];
            rewardChests = [];
            powerups = [];
            lifePickups = [];
            fireballs = [];
            enemyBolts = [];
            mines = [];
            explosions = [];
            generatePlatforms();
            resetGroundSegments();
            player.y = getGroundY() - player.height;
            player.vy = 0;
            player.isJumping = false;
            player.x = 80;
            playPowerupSound();
            updateRouteProgress();
            savePersistentData(true);
        }

        function beginLevelGoal() {
            if (levelGoal || !gameRunning) return;
            clearObstacles();
            collectibles = [];
            rewardChests = [];
            powerups = [];
            fireballs = [];
            enemyBolts = [];
            mines = [];
            explosions = [];
            cameraOffsetY = 0;
            platforms = [];
            const goalX = Math.max(player.x + player.width + 100, canvas.width * 0.68);
            levelGoal = {
                x: goalX,
                width: Math.min(118, Math.max(78, canvas.width * 0.16)),
                height: Math.min(112, Math.max(70, canvas.height * 0.24)),
                phase: 0,
                startX: player.x,
                targetX: goalX - player.width + 18
            };
            updateRouteProgress();
            player.y = getGroundY() - player.height;
            player.vy = 0;
            player.isJumping = false;
            groundSegments = [{ x: 0, width: canvas.width * 2 }];
        }

        function addPlatformHazard(platform) {
            const availableImages = [obstacleImg, levelSixStaticImg, levelSixPursuerImg]
                .filter(image => image?.complete && image.naturalWidth > 0);
            const image = currentLevel >= 6 && availableImages.length > 0
                ? availableImages[Math.floor(Math.random() * availableImages.length)]
                : obstacleImg || villainImg;
            if (!image) return;

            const sprite = document.createElement('img');
            sprite.className = 'enemy-sprite';
            sprite.alt = '';
            sprite.setAttribute('aria-hidden', 'true');
            sprite.src = image.src;
            sprite.onerror = () => console.error(`No se pudo mostrar el obstáculo: ${sprite.src}`);
            container.appendChild(sprite);
            const width = Math.min(48, Math.max(30, platform.width * (platform.secondary ? 0.48 : 0.38)));
            const height = platform.secondary ? 38 : 44;
            const availableX = Math.max(0, platform.width - width - 12);
            obstacles.push({
                x: platform.x + 6 + Math.random() * availableX,
                y: platform.y - height,
                width,
                height,
                type: 'platform-hazard',
                image,
                sprite
            });
        }

        function createLevelRandom(level) {
            let seed = (platformRunSeed + level * 48271) % 2147483647;
            return () => {
                seed = (seed * 48271) % 2147483647;
                return (seed - 1) / 2147483646;
            };
        }

        function createPlatformSegment(x, previousY, horizontalGap, index, random, groundY) {
            const upperLimit = Math.max(60, groundY - Math.min(260, canvas.height * 0.65));
            const lowerLimit = groundY - Math.min(125, canvas.height * 0.3);
            let verticalStep = (random() - 0.5) * 130;
            const routeStyle = (currentLevel - 1) % 6;
            if (routeStyle === 0 && index % 2 === 0) verticalStep -= 18;
            if (routeStyle === 1 && index % 2 === 1) verticalStep += 24;
            if (routeStyle === 2 && index % 3 === 0) verticalStep -= 28;
            if (routeStyle === 3 && index % 3 === 1) verticalStep += 30;
            if (routeStyle === 4 && index % 2 === 0) verticalStep += 18;
            if (routeStyle === 5 && index % 2 === 1) verticalStep -= 22;
            verticalStep = Math.max(-76, Math.min(76, verticalStep));

            const mainWidth = 112 + random() * 44;
            const platformKinds = ['stone', 'moss', 'crystal', 'cloud'];
            const main = {
                x,
                y: Math.max(upperLimit, Math.min(lowerLimit, previousY + verticalStep)),
                width: mainWidth,
                height: 14 + random() * 7,
                kind: platformKinds[Math.floor(random() * platformKinds.length)]
            };
            platforms.push(main);
            if (random() < currentLevelSettings.platformHazardChance) addPlatformHazard(main);

            const lowerCount = random() < 0.4 ? 2 : 1;
            for (let side = 0; side < lowerCount; side++) {
                const width = 72 + random() * 34;
                const availableOffset = Math.max(0, main.width + horizontalGap - width);
                const lowerY = Math.min(
                    groundY - 35,
                    Math.max(main.y + 45, groundY - (45 + random() * 100))
                );
                platforms.push({
                    x: x + random() * availableOffset,
                    y: lowerY,
                    width,
                    height: 10 + random() * 5,
                    kind: platformKinds[Math.floor(random() * platformKinds.length)],
                    secondary: true
                });
            }
            return main;
        }

        function generatePlatforms() {
            const groundY = getGroundY();
            const startX = Math.max(90, Math.min(220, canvas.width * 0.4));
            const random = createLevelRandom(currentLevel);
            platformRandom = random;
            platformRouteIndex = 0;
            const minGap = minPlatformGap;
            const maxGap = maxPlatformGap;
            const segmentCount = Math.ceil((canvas.width - startX) / minGap) + 3;
            let routeY = groundY - (80 + random() * 60);
            let routeX = startX;
            platforms = [];
            for (let index = 0; index < segmentCount; index++) {
                const horizontalGap = minGap + random() * (maxGap - minGap);
                const main = createPlatformSegment(routeX, routeY, horizontalGap, index, random, groundY);
                routeY = main.y;
                routeX += main.width + horizontalGap;
                platformRouteIndex = index + 1;
            }
        }

        function gameOver() {
            endGame(false);
        }

        function endGame(completed) {
            gameRunning = false;
            runInProgress = false;
            savedRun = null;
            stopBackgroundMusic();
            if (timerInterval) clearInterval(timerInterval);
            playHitSound();
            document.getElementById('finalLevel').textContent = currentLevel;
            document.getElementById('finalScore').textContent = Math.floor(score);
            document.getElementById('finalCoins').textContent = coins;
            document.getElementById('endTitle').textContent = completed ? '¡MISIÓN COMPLETADA!' : 'FIN DEL JUEGO';
            document.getElementById('endTitle').classList.toggle('text-green-400', completed);
            document.getElementById('endTitle').classList.toggle('text-red-400', !completed);
            document.getElementById('endMessage').textContent = completed
                ? '¡Superaste los 40 niveles!'
                : 'El sistema cibernético te ha alcanzado';
            document.getElementById('gameOverScreen').classList.remove('hidden');
            document.getElementById('mobileControls').classList.add('hidden');
            savePersistentData(true);
            updateShopUI();
        }

        function spawnEntities() {
            const groundY = getGroundY();
            const spawnX = canvas.width + 50;
            const hasClearance = (items, minimumGap) =>
                items.every(item => Math.abs(item.x - spawnX) >= minimumGap);
            
            // Monstruos (Estáticos o Perseguidores)
            if (
                (obstacleImg?.complete && obstacleImg.naturalWidth > 0 ||
                    villainImg?.complete && villainImg.naturalWidth > 0 ||
                    currentLevel >= 6 && (
                        levelSixStaticImg?.complete && levelSixStaticImg.naturalWidth > 0 ||
                        levelSixPursuerImg?.complete && levelSixPursuerImg.naturalWidth > 0
                    )) &&
                frameCount >= nextEnemySpawnFrame &&
                hasClearance(obstacles, 260) &&
                hasClearance(powerups, 320) &&
                hasClearance(collectibles, 150) &&
                hasClearance(rewardChests, 180) &&
                hasClearance(lifePickups, 240)
            ) {
                const staticMonsters = [];
                const pursuers = [];
                if (obstacleImg?.complete && obstacleImg.naturalWidth > 0) staticMonsters.push({ image: obstacleImg, src: gameAssets.obstacle });
                if (villainImg?.complete && villainImg.naturalWidth > 0) pursuers.push({ image: villainImg, src: gameAssets.villain });
                if (currentLevel >= 6 && levelSixStaticImg?.complete && levelSixStaticImg.naturalWidth > 0) {
                    staticMonsters.push({ image: levelSixStaticImg, src: gameAssets.levelSixStatic });
                }
                if (currentLevel >= 6 && levelSixPursuerImg?.complete && levelSixPursuerImg.naturalWidth > 0) {
                    pursuers.push({ image: levelSixPursuerImg, src: gameAssets.levelSixPursuer });
                }
                const randomType = Math.random() > currentLevelSettings.pursuerChance ? 'static' : 'pursuer';
                const type = randomType === 'pursuer' && pursuers.length > 0
                    ? 'pursuer'
                    : randomType === 'static' && staticMonsters.length > 0
                        ? 'static'
                        : pursuers.length > 0 ? 'pursuer' : 'static';
                const monsterPool = type === 'pursuer' ? pursuers : staticMonsters;
                const monster = monsterPool[Math.floor(Math.random() * monsterPool.length)];
                const height = type === 'pursuer' ? 60 : 50;
                const enemySpawnX = spawnX + Math.random() * Math.min(180, canvas.width * 0.2);
                const sprite = document.createElement('img');
                sprite.className = 'enemy-sprite';
                sprite.alt = '';
                sprite.setAttribute('aria-hidden', 'true');
                sprite.src = monster.src;
                sprite.onerror = () => console.error(`No se pudo mostrar la imagen del enemigo: ${sprite.src}`);
                container.appendChild(sprite);
                obstacles.push({
                    x: enemySpawnX,
                    y: groundY - height,
                    width: type === 'pursuer' ? 68 : 52,
                    height,
                    type,
                    image: monster.image,
                    targetY: groundY - height,
                    nextTargetFrame: frameCount + 55 + Math.floor(Math.random() * 60),
                    nextShotFrame: frameCount + Math.max(
                        18,
                        Math.floor((canvas.width - player.x - 160) / Math.max(1, gameSpeed))
                    ) + Math.floor(Math.random() * 20),
                    sprite
                });
                nextEnemySpawnFrame = frameCount + Math.round(
                    currentLevelSettings.enemyInterval * (0.7 + Math.random() * 0.8)
                );
            }

            // Minas explosivas exclusivas del nivel nocturno.
            if (
                currentLevel === 2 &&
                frameCount >= nextMineSpawnFrame &&
                hasClearance(obstacles, 210) &&
                hasClearance(rewardChests, 150) &&
                hasClearance(powerups, 180) &&
                hasClearance(mines, 260) &&
                groundSegments.some(segment => spawnX >= segment.x && spawnX + 32 <= segment.x + segment.width)
            ) {
                const size = 32;
                mines.push({
                    x: spawnX,
                    y: groundY - size * 0.68,
                    width: size,
                    height: size * 0.68,
                    phase: Math.random() * Math.PI * 2
                });
                nextMineSpawnFrame = frameCount + 170 + Math.floor(Math.random() * 100);
            }

            // Monedas
            if (
                frameCount % currentLevelSettings.coinInterval === 0 &&
                hasClearance(obstacles, 150) &&
                hasClearance(powerups, 170) &&
                hasClearance(collectibles, 120) &&
                hasClearance(rewardChests, 180) &&
                hasClearance(lifePickups, 120)
            ) {
                const visiblePlatforms = platforms.filter(platform =>
                    platform.y + cameraOffsetY > 0 &&
                    platform.y + cameraOffsetY < canvas.height - 70
                );
                const usePlat = Math.random() > 0.3 && visiblePlatforms.length > 0;
                let yPos = groundY - 70 - Math.random() * 80;
                if (usePlat) {
                    const plat = visiblePlatforms[Math.floor(Math.random() * visiblePlatforms.length)];
                    yPos = plat.y - 30;
                }
                const patternRoll = Math.random();
                const coinCount = patternRoll < 0.3 ? 1 : patternRoll < 0.78 ? 3 : 5;
                const formation = Math.random();
                for (let coinIndex = 0; coinIndex < coinCount; coinIndex++) {
                    const rarity = Math.random();
                    const kind = rarity < 0.08 ? 'gem' : rarity < 0.32 ? 'silver' : 'gold';
                    const radius = kind === 'gem' ? 12 : kind === 'silver' ? 10 : 13;
                    const offsetX = coinIndex * 28;
                    const arcOffset = formation < 0.5
                        ? Math.sin((coinIndex / Math.max(1, coinCount - 1)) * Math.PI) * 28
                        : formation < 0.75 ? ((coinIndex % 2) * 18) : 0;
                    collectibles.push({
                        x: spawnX + offsetX,
                        y: yPos - arcOffset,
                        radius,
                        angle: 0,
                        kind,
                        value: kind === 'gem' ? 5 : kind === 'silver' ? 3 : 1
                    });
                }
            }

            // Cofres poco frecuentes: se colocan en una plataforma o sobre el suelo.
            if (
                frameCount % currentLevelSettings.chestInterval === 0 &&
                Math.random() < 0.72 &&
                hasClearance(obstacles, 220) &&
                hasClearance(powerups, 240) &&
                hasClearance(collectibles, 180) &&
                hasClearance(rewardChests, 260) &&
                hasClearance(lifePickups, 200)
            ) {
                const chestWidth = 38;
                const chestHeight = 32;
                const nearbyPlatforms = platforms.filter(platform =>
                    platform.x + platform.width > spawnX - 100 &&
                    platform.x < spawnX + 80 &&
                    platform.y + cameraOffsetY > 0 &&
                    platform.y + cameraOffsetY < canvas.height - 50
                );
                const platform = nearbyPlatforms.length > 0 && Math.random() < 0.62
                    ? nearbyPlatforms[Math.floor(Math.random() * nearbyPlatforms.length)]
                    : null;
                const chestX = platform
                    ? Math.max(platform.x + 4, Math.min(spawnX, platform.x + platform.width - chestWidth - 4))
                    : spawnX;
                const chestLevelBonus = Math.floor((currentLevel - 1) / 5);
                rewardChests.push({
                    x: chestX,
                    y: platform ? platform.y - chestHeight : groundY - chestHeight,
                    width: chestWidth,
                    height: chestHeight,
                    reward: 5 + Math.floor(Math.random() * 6) + chestLevelBonus,
                    opened: false,
                    openFrames: 0
                });
            }

            // Poderes temporales (Rayito o Fuego)
            if (
                frameCount % currentLevelSettings.powerupInterval === 0 &&
                hasClearance(obstacles, 320) &&
                hasClearance(powerups, 360) &&
                hasClearance(collectibles, 170) &&
                hasClearance(rewardChests, 200) &&
                hasClearance(lifePickups, 220)
            ) {
                powerups.push({
                    x: spawnX,
                    y: groundY - 140 - Math.random() * 60,
                    width: 32,
                    height: 32,
                    type: Math.random() > 0.5 ? 'rayito' : 'fuego'
                });
            }

            if (
                lives < maxLives &&
                frameCount % 600 === 0 &&
                hasClearance(obstacles, 240) &&
                hasClearance(powerups, 260) &&
                hasClearance(collectibles, 120) &&
                hasClearance(rewardChests, 200) &&
                hasClearance(lifePickups, 320)
            ) {
                lifePickups.push({
                    x: spawnX,
                    y: groundY - 95 - Math.random() * 45,
                    width: 28,
                    height: 28
                });
            }

            // Plataformas
            platforms.forEach(p => p.x -= gameSpeed);
            const lastMainPlatform = platforms.slice().reverse().find(platform => !platform.secondary);
            if (!lastMainPlatform || lastMainPlatform.x < canvas.width - 250) {
                const random = platformRandom;
                const minGap = minPlatformGap;
                const maxGap = maxPlatformGap;
                const horizontalGap = minGap + random() * (maxGap - minGap);
                const mainX = lastMainPlatform
                    ? lastMainPlatform.x + lastMainPlatform.width + horizontalGap
                    : canvas.width;
                const previousY = lastMainPlatform ? lastMainPlatform.y : getGroundY() - 110;
                createPlatformSegment(
                    mainX,
                    previousY,
                    horizontalGap,
                    platformRouteIndex,
                    random,
                    getGroundY()
                );
                platformRouteIndex++;
            }
            platforms = platforms.filter(p => p.x + p.width > -50);
        }

        function shootFireball() {
            if (!gameRunning) return;
            if (player.activePower === 'fuego' || player.fireAmmo > 0) {
                startGameplayOnFirstInput();
                if (player.fireAmmo > 0 && player.activePower !== 'fuego') player.fireAmmo--;
                playFireballSound();
                fireballs.push({
                    x: player.x + player.width,
                    y: player.y + player.height / 2 - 8,
                    width: 22,
                    height: 14,
                    speed: 12
                });
            }
        }

        // --- Controles ---
        function startGameplayOnFirstInput() {
            hasGameplayStarted = true;
        }

        function jumpAction() {
            if (!gameRunning) return;
            startGameplayOnFirstInput();
            if (!player.isJumping) {
                player.vy = player.jumpForce;
                player.isJumping = true;
                playJumpSound();
            }
        }

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape') {
                e.preventDefault();
                if (isPaused) resumeGame();
                else pauseGame();
                return;
            }
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                jumpAction();
            }
            if (e.code === 'KeyA') {
                e.preventDefault();
                shootFireball();
            }
            const powerShortcuts = {
                Digit1: 'rayito',
                Digit2: 'celoz',
                Digit3: 'ice',
                Digit4: 'multi'
            };
            if (powerShortcuts[e.code]) {
                e.preventDefault();
                activateShopPower(powerShortcuts[e.code]);
            }
        });

        canvas.addEventListener('click', () => jumpAction());

        document.getElementById('jumpTouchBtn').addEventListener('touchstart', (e) => { e.preventDefault(); jumpAction(); });
        document.getElementById('jumpTouchBtn').addEventListener('click', (e) => { e.preventDefault(); jumpAction(); });
        document.getElementById('fireTouchBtn').addEventListener('touchstart', (e) => { e.preventDefault(); shootFireball(); });
        document.getElementById('fireTouchBtn').addEventListener('click', (e) => { e.preventDefault(); shootFireball(); });
        Object.keys(powerCatalog).forEach(power => {
            const button = document.getElementById(`activate${power[0].toUpperCase() + power.slice(1)}Btn`);
            button.addEventListener('click', event => {
                event.preventDefault();
                activateShopPower(power);
            });
        });

        let touchStartX = 0;
        canvas.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; });
        canvas.addEventListener('touchend', (e) => {
            let touchEndX = e.changedTouches[0].clientX;
            if (touchEndX - touchStartX > 60) {
                shootFireball();
            }
        });

        function blendColor(from, to, amount) {
            const start = from.match(/\w\w/g).map(value => parseInt(value, 16));
            const end = to.match(/\w\w/g).map(value => parseInt(value, 16));
            const channels = start.map((value, index) =>
                Math.round(value + (end[index] - value) * amount)
            );
            return `rgb(${channels.join(',')})`;
        }

        function drawHills(color, groundY, segmentWidth, height, phase, foreground = false) {
            const offset = phase % segmentWidth;
            ctx.beginPath();
            ctx.moveTo(-segmentWidth + offset, groundY);
            for (let x = -segmentWidth + offset; x < canvas.width + segmentWidth; x += segmentWidth) {
                if (foreground) {
                    ctx.quadraticCurveTo(x + segmentWidth * 0.25, groundY - height, x + segmentWidth * 0.5, groundY - height * 0.55);
                    ctx.quadraticCurveTo(x + segmentWidth * 0.75, groundY - height * 0.1, x + segmentWidth, groundY - height * 0.45);
                } else {
                    ctx.lineTo(x + segmentWidth * 0.25, groundY - height * (0.55 + Math.sin(x * 0.014) * 0.2));
                    ctx.lineTo(x + segmentWidth * 0.5, groundY - height * 0.2);
                    ctx.lineTo(x + segmentWidth * 0.75, groundY - height * (0.7 + Math.cos(x * 0.01) * 0.18));
                    ctx.lineTo(x + segmentWidth, groundY - height * 0.35);
                }
            }
            ctx.lineTo(canvas.width + segmentWidth, groundY);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        }

        function drawLandscape(groundY) {
            const currentTheme = currentLevelSettings.theme;
            const transition = Math.min(1, (performance.now() - themeTransitionStart) / 2200);
            const colors = {};
            for (const key of ['skyTop', 'skyBottom', 'far', 'near', 'sun', 'platform', 'platformEdge']) {
                colors[key] = themeTransitionFrom
                    ? blendColor(themeTransitionFrom[key], currentTheme[key], transition)
                    : currentTheme[key];
            }

            const sky = ctx.createLinearGradient(0, 0, 0, groundY);
            sky.addColorStop(0, colors.skyTop);
            sky.addColorStop(1, colors.skyBottom);
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, canvas.width, groundY);

            const sceneryMotion = 0;
            const sunX = canvas.width * 0.78;
            const sunY = groundY * 0.29;
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = colors.sun;
            ctx.beginPath();
            ctx.arc(sunX, sunY, 48, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.arc(sunX, sunY, 29, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            if (currentTheme.type === 'forest') {
                for (let i = 0; i < 7; i++) {
                    const x = i * canvas.width / 6 - 18;
                    const treeHeight = groundY * (0.16 + (i % 3) * 0.055);
                    ctx.fillStyle = i % 2 === 0 ? '#285d35' : '#347541';
                    ctx.fillRect(x + 13, groundY - treeHeight * 0.56, 11, treeHeight * 0.56);
                    ctx.beginPath();
                    ctx.moveTo(x - 5, groundY - treeHeight * 0.42);
                    ctx.lineTo(x + 18, groundY - treeHeight);
                    ctx.lineTo(x + 42, groundY - treeHeight * 0.42);
                    ctx.closePath();
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(x, groundY - treeHeight * 0.68);
                    ctx.lineTo(x + 18, groundY - treeHeight * 1.2);
                    ctx.lineTo(x + 36, groundY - treeHeight * 0.68);
                    ctx.closePath();
                    ctx.fill();
                }
            }

            if (currentTheme.type === 'night') {
                for (let i = 0; i < 55; i++) {
                    const starX = ((i * 97 - sceneryMotion * 0.12) % (canvas.width + 20) + canvas.width + 20) % (canvas.width + 20);
                    const starY = (i * 53) % Math.max(1, Math.floor(groundY * 0.72));
                    const starSize = i % 7 === 0 ? 2 : 1;
                    ctx.globalAlpha = 0.45 + (i % 4) * 0.12;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(starX, starY, starSize, starSize);
                }
                ctx.globalAlpha = 1;
            }

            if (currentTheme.type === 'day' || currentTheme.type === 'clouds') {
                const cloudCount = currentTheme.type === 'clouds' ? 7 : 4;
                for (let i = 0; i < cloudCount; i++) {
                    const cloudWidth = currentTheme.type === 'clouds' ? 58 : 30;
                    const cloudX = ((i * canvas.width * 0.27 - sceneryMotion * (currentTheme.type === 'clouds' ? 0.32 : 0.2)) %
                        (canvas.width + cloudWidth * 4) + canvas.width + cloudWidth * 4) % (canvas.width + cloudWidth * 4) - cloudWidth * 2;
                    const cloudY = groundY * (0.13 + (i % 3) * 0.14);
                    ctx.globalAlpha = currentTheme.type === 'clouds' ? 0.86 : 0.48;
                    ctx.fillStyle = '#ffffff';
                    ctx.beginPath();
                    ctx.ellipse(cloudX, cloudY, cloudWidth, cloudWidth * 0.3, 0, 0, Math.PI * 2);
                    ctx.ellipse(cloudX - cloudWidth * 0.48, cloudY + 3, cloudWidth * 0.44, cloudWidth * 0.24, 0, 0, Math.PI * 2);
                    ctx.ellipse(cloudX + cloudWidth * 0.46, cloudY + 2, cloudWidth * 0.55, cloudWidth * 0.28, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            if (currentTheme.type === 'underworld') {
                drawHills(colors.far, groundY, 125, groundY * 0.42, sceneryMotion * 0.12);
                drawHills(colors.near, groundY, 170, groundY * 0.28, sceneryMotion * 0.24, true);
                ctx.strokeStyle = '#ff6338';
                ctx.lineWidth = 3;
                ctx.globalAlpha = 0.72;
                for (let i = 0; i < 5; i++) {
                    const x = ((i * canvas.width * 0.26 - sceneryMotion * 0.5) % (canvas.width + 100) + canvas.width + 100) % (canvas.width + 100) - 50;
                    ctx.beginPath();
                    ctx.moveTo(x, groundY - 3);
                    ctx.lineTo(x + 18, groundY - 13);
                    ctx.lineTo(x + 28, groundY - 2);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            } else if (currentTheme.type === 'slime') {
                drawHills(colors.far, groundY, 155, groundY * 0.25, 0);
                drawHills(colors.near, groundY, 205, groundY * 0.16, 0, true);
                for (let i = 0; i < 9; i++) {
                    const x = i * canvas.width / 8;
                    const top = groundY * 0.72;
                    const dropHeight = groundY * (0.035 + (i % 3) * 0.018);
                    ctx.fillStyle = i % 2 === 0 ? '#9be843' : '#7fd13b';
                    ctx.beginPath();
                    ctx.moveTo(x, top);
                    ctx.lineTo(x + 18, top);
                    ctx.lineTo(x + 16, top + dropHeight * 0.7);
                    ctx.arc(x + 11, top + dropHeight * 0.7, 5, 0, Math.PI);
                    ctx.closePath();
                    ctx.fill();
                }
            } else if (currentTheme.type === 'clouds') {
                drawHills(colors.far, groundY, 210, groundY * 0.16, sceneryMotion * 0.1, true);
                drawHills(colors.near, groundY, 240, groundY * 0.11, sceneryMotion * 0.2, true);
            } else {
                drawHills(colors.far, groundY, 150, groundY * (currentTheme.type === 'default' ? 0.24 : 0.31), sceneryMotion * 0.18);
                drawHills(colors.near, groundY, 190, groundY * 0.17, sceneryMotion * 0.38, true);
            }
            return colors;
        }

        function gameLoop() {
            if (isPaused) {
                requestAnimationFrame(gameLoop);
                return;
            }
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            updateScoreAndCoinsDisplay();

            // Suelo
            const groundY = getGroundY();
            const sceneryColors = drawLandscape(groundY);
            const renderedCameraOffsetY = cameraOffsetY;
            ctx.save();
            ctx.translate(0, renderedCameraOffsetY);
            const hue = currentLevelSettings.theme.hue;
            const groundGradient = ctx.createLinearGradient(0, groundY, 0, canvas.height);
            groundGradient.addColorStop(0, `hsl(${hue + 35} 65% 42%)`);
            groundGradient.addColorStop(1, sceneryColors.near);
            groundSegments.forEach(segment => {
                const visibleLeft = Math.max(0, segment.x);
                const visibleRight = Math.min(canvas.width, segment.x + segment.width);
                if (visibleRight <= visibleLeft) return;

                ctx.fillStyle = groundGradient;
                ctx.fillRect(visibleLeft, groundY, visibleRight - visibleLeft, canvas.height - groundY);
                ctx.strokeStyle = `hsl(${hue + 35} 90% 70%)`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(visibleLeft, groundY);
                ctx.lineTo(visibleRight, groundY);
                ctx.stroke();
            });
            for (let i = 0; i < groundSegments.length - 1; i++) {
                const gapLeft = Math.max(0, groundSegments[i].x + groundSegments[i].width);
                const gapRight = Math.min(canvas.width, groundSegments[i + 1].x);
                if (gapRight <= gapLeft) continue;

                const pitGradient = ctx.createLinearGradient(0, groundY, 0, canvas.height);
                pitGradient.addColorStop(0, '#050912');
                pitGradient.addColorStop(0.3, '#111827');
                pitGradient.addColorStop(1, '#02040a');
                ctx.fillStyle = pitGradient;
                ctx.fillRect(gapLeft, groundY, gapRight - gapLeft, canvas.height - groundY);

                const wallDepth = Math.min(28, (gapRight - gapLeft) * 0.22);
                ctx.fillStyle = `hsl(${hue + 35} 38% 25%)`;
                ctx.beginPath();
                ctx.moveTo(gapLeft, groundY);
                ctx.lineTo(gapLeft + wallDepth, groundY + 18);
                ctx.lineTo(gapLeft + wallDepth * 0.6, canvas.height);
                ctx.lineTo(gapLeft, canvas.height);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(gapRight, groundY);
                ctx.lineTo(gapRight - wallDepth, groundY + 18);
                ctx.lineTo(gapRight - wallDepth * 0.6, canvas.height);
                ctx.lineTo(gapRight, canvas.height);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = `hsl(${hue + 35} 80% 58%)`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(gapLeft, groundY);
                ctx.lineTo(gapLeft + wallDepth, groundY + 18);
                ctx.moveTo(gapRight, groundY);
                ctx.lineTo(gapRight - wallDepth, groundY + 18);
                ctx.stroke();
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(gapLeft + wallDepth, groundY + 20);
                ctx.lineTo(gapLeft + wallDepth * 0.6, canvas.height);
                ctx.moveTo(gapRight - wallDepth, groundY + 20);
                ctx.lineTo(gapRight - wallDepth * 0.6, canvas.height);
                ctx.stroke();
            }

            if (gameRunning) {
                if (levelGoal) {
                    const walkStep = 2.6;
                    player.x = Math.min(
                        levelGoal.targetX,
                        player.x + walkStep
                    );
                    levelGoal.phase += 0.1;
                    updateRouteProgress();
                    if (player.x >= levelGoal.targetX) {
                        levelGoal.arrivedAt = levelGoal.arrivedAt || performance.now();
                        if (performance.now() - levelGoal.arrivedAt >= 700) advanceLevel();
                    }
                } else if (hasGameplayStarted) {
                    frameCount++;
                    if (damageFlashFrames > 0) damageFlashFrames--;
                    score += 0.2 * (gameSpeed / 5.5);
                    updateRouteProgress();
                    spawnEntities();
                    groundSegments.forEach(segment => { segment.x -= gameSpeed; });
                    groundSegments = groundSegments.filter(segment => segment.x + segment.width > -50);
                    extendGroundSegments();

                    // Temporizador de poderes (20 segundos = 1200 frames)
                    if (shieldTimerFrames > 0) shieldTimerFrames--;
                    if (iceTimerFrames > 0) iceTimerFrames--;
                    if (player.activePower) {
                        player.powerTimer--;
                        if (player.powerTimer <= 0) {
                            player.activePower = null;
                            player.powerTimer = 0;
                        }
                    }
                    if (frameCount % 15 === 0) updatePowerIndicator();

                    // Gravedad y físicas
                    const previousBottom = player.y + player.height;
                    player.vy += player.gravity;
                    player.y += player.vy;

                    if (
                        player.vy >= 0 &&
                        previousBottom <= groundY &&
                        player.y + player.height >= groundY &&
                        playerIsOverSolidGround(groundY)
                    ) {
                        player.y = groundY - player.height;
                        player.vy = 0;
                        player.isJumping = false;
                    }

                    platforms.forEach(p => {
                        if (
                            player.x + player.width > p.x &&
                            player.x < p.x + p.width &&
                            player.y + player.height >= p.y &&
                            player.y + player.height <= p.y + 18 &&
                            player.vy >= 0
                        ) {
                            player.y = p.y - player.height;
                            player.vy = 0;
                            player.isJumping = false;
                        }
                    });

                    const playerScreenTargetY = canvas.height * 0.54;
                    const cameraTargetOffsetY = playerScreenTargetY - player.height / 2 - player.y;
                    cameraOffsetY = cameraTargetOffsetY;

                    if (player.y > groundY + 70) {
                        loseLifeInPit();
                    }
                }
            }

            // --- Plataformas ---
            platforms.forEach(p => {
                ctx.save();
                ctx.shadowColor = sceneryColors.platformEdge;
                ctx.shadowBlur = 10;
                ctx.fillStyle = sceneryColors.platform;
                ctx.strokeStyle = sceneryColors.platformEdge;
                ctx.lineWidth = 2;
                const platformFace = ctx.createLinearGradient(0, p.y, 0, p.y + p.height + 8);
                platformFace.addColorStop(0, sceneryColors.platformEdge);
                platformFace.addColorStop(0.22, sceneryColors.platform);
                platformFace.addColorStop(1, 'rgba(10, 16, 28, 0.82)');
                if (currentLevelSettings.theme.type === 'clouds') {
                    ctx.beginPath();
                    ctx.roundRect(p.x, p.y, p.width, p.height + 8, 10);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
                    ctx.fillRect(p.x + 12, p.y + 3, p.width - 24, 3);
                } else {
                    ctx.fillStyle = platformFace;
                    ctx.fillRect(p.x, p.y, p.width, p.height);
                    ctx.fillStyle = sceneryColors.platform;
                    ctx.fillRect(p.x, p.y + p.height, p.width, 7);
                    ctx.strokeRect(p.x, p.y, p.width, p.height);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
                    ctx.fillRect(p.x + 5, p.y + 3, Math.max(10, p.width * 0.32), 2);
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    for (let notch = 1; notch <= 3; notch++) {
                        const notchX = p.x + (p.width * notch) / 4;
                        ctx.fillRect(notchX, p.y + p.height + 1, 3, 5);
                    }
                    if (currentLevelSettings.theme.type === 'underworld') {
                        ctx.strokeStyle = '#ff6338';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(p.x + 8, p.y + p.height - 4);
                        ctx.lineTo(p.x + p.width - 8, p.y + p.height - 4);
                        ctx.stroke();
                    } else if (currentLevelSettings.theme.type === 'day') {
                        ctx.fillStyle = '#a5e86f';
                        ctx.fillRect(p.x + 3, p.y, p.width - 6, 4);
                    } else if (currentLevelSettings.theme.type === 'default') {
                        ctx.beginPath();
                        ctx.moveTo(p.x + p.width / 2 - 8, p.y + 4);
                        ctx.lineTo(p.x + p.width / 2 + 8, p.y + 4);
                        ctx.stroke();
                    }
                }
                if (p.secondary) {
                    ctx.shadowBlur = 5;
                    if (p.kind === 'crystal') {
                        ctx.fillStyle = '#e9d5ff';
                        ctx.beginPath();
                        ctx.moveTo(p.x + p.width * 0.28, p.y);
                        ctx.lineTo(p.x + p.width * 0.36, p.y - 13);
                        ctx.lineTo(p.x + p.width * 0.44, p.y);
                        ctx.fill();
                        ctx.fillStyle = '#c4b5fd';
                        ctx.beginPath();
                        ctx.moveTo(p.x + p.width * 0.58, p.y);
                        ctx.lineTo(p.x + p.width * 0.67, p.y - 9);
                        ctx.lineTo(p.x + p.width * 0.76, p.y);
                        ctx.fill();
                    } else if (p.kind === 'moss') {
                        ctx.fillStyle = '#86efac';
                        ctx.beginPath();
                        ctx.ellipse(p.x + p.width * 0.3, p.y + 1, p.width * 0.22, 4, 0, Math.PI, Math.PI * 2);
                        ctx.ellipse(p.x + p.width * 0.68, p.y + 1, p.width * 0.25, 5, 0, Math.PI, Math.PI * 2);
                        ctx.fill();
                    } else if (p.kind === 'cloud') {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                        ctx.beginPath();
                        ctx.arc(p.x + p.width * 0.28, p.y + 1, 5, Math.PI, Math.PI * 2);
                        ctx.arc(p.x + p.width * 0.42, p.y, 7, Math.PI, Math.PI * 2);
                        ctx.arc(p.x + p.width * 0.58, p.y + 1, 5, Math.PI, Math.PI * 2);
                        ctx.fill();
                    } else {
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath();
                        ctx.moveTo(p.x + p.width * 0.35, p.y + 2);
                        ctx.lineTo(p.x + p.width * 0.43, p.y + p.height - 2);
                        ctx.moveTo(p.x + p.width * 0.72, p.y + 2);
                        ctx.lineTo(p.x + p.width * 0.64, p.y + p.height - 2);
                        ctx.stroke();
                    }
                }
                ctx.restore();
            });

            if (levelGoal) {
                const goalY = groundY - levelGoal.height;
                if (goalImg && goalImg.complete && goalImg.naturalWidth > 0) {
                    ctx.drawImage(goalImg, levelGoal.x, goalY, levelGoal.width, levelGoal.height);
                } else {
                    ctx.save();
                    ctx.fillStyle = `hsl(${hue} 28% 24%)`;
                    ctx.strokeStyle = `hsl(${hue + 35} 75% 55%)`;
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(levelGoal.x, groundY);
                    ctx.lineTo(levelGoal.x, goalY + 36);
                    ctx.quadraticCurveTo(levelGoal.x + levelGoal.width / 2, goalY - 22, levelGoal.x + levelGoal.width, goalY + 36);
                    ctx.lineTo(levelGoal.x + levelGoal.width, groundY);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = `hsl(${hue} 45% 7%)`;
                    ctx.beginPath();
                    ctx.moveTo(levelGoal.x + 28, groundY);
                    ctx.lineTo(levelGoal.x + 28, goalY + 58);
                    ctx.quadraticCurveTo(levelGoal.x + levelGoal.width / 2, goalY + 18, levelGoal.x + levelGoal.width - 28, goalY + 58);
                    ctx.lineTo(levelGoal.x + levelGoal.width - 28, groundY);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
                ctx.save();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('META', levelGoal.x + levelGoal.width / 2, goalY - 8);
                ctx.restore();
            }

            // --- Bolas de Fuego ---
            for (let i = fireballs.length - 1; i >= 0; i--) {
                let fb = fireballs[i];
                if (gameRunning) fb.x += fb.speed;

                ctx.save();
                ctx.shadowColor = '#f97316';
                ctx.shadowBlur = 15;
                ctx.fillStyle = '#ea580c';
                ctx.beginPath();
                ctx.arc(fb.x, fb.y + fb.height/2, 9, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                for (let j = obstacles.length - 1; j >= 0; j--) {
                    let obs = obstacles[j];
                    if (
                        fb.x < obs.x + obs.width &&
                        fb.x + fb.width > obs.x &&
                        fb.y < obs.y + obs.height &&
                        fb.y + fb.height > obs.y
                    ) {
                        obstacles.splice(j, 1);
                        removeObstacleSprite(obs);
                        fireballs.splice(i, 1);
                        score += 60;
                        break;
                    }
                }
                if (fb.x > canvas.width) fireballs.splice(i, 1);
            }

            // --- Monedas ---
            for (let i = collectibles.length - 1; i >= 0; i--) {
                let col = collectibles[i];
                if (gameRunning) col.x -= (player.activePower === 'rayito' ? gameSpeed * 1.8 : gameSpeed);
                col.angle += 0.08;

                ctx.save();
                ctx.translate(col.x, col.y);
                if (col.kind === 'gem') {
                    ctx.shadowColor = '#46c8ff';
                    ctx.shadowBlur = 16;
                    ctx.rotate(Math.PI / 4);
                    const gemGradient = ctx.createLinearGradient(-col.radius, -col.radius, col.radius, col.radius);
                    gemGradient.addColorStop(0, '#d9f8ff');
                    gemGradient.addColorStop(0.48, '#46c8ff');
                    gemGradient.addColorStop(1, '#2764c5');
                    ctx.fillStyle = gemGradient;
                    ctx.fillRect(-col.radius * 0.7, -col.radius * 0.7, col.radius * 1.4, col.radius * 1.4);
                    ctx.strokeStyle = '#effcff';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(-col.radius * 0.7, -col.radius * 0.7, col.radius * 1.4, col.radius * 1.4);
                    ctx.beginPath();
                    ctx.moveTo(-col.radius * 0.45, 0);
                    ctx.lineTo(0, -col.radius * 0.45);
                    ctx.lineTo(col.radius * 0.45, 0);
                    ctx.stroke();
                } else {
                    const isSilver = col.kind === 'silver';
                    ctx.shadowColor = isSilver ? '#d9f1ff' : '#eab308';
                    ctx.shadowBlur = 15;
                    const coinGradient = ctx.createRadialGradient(-4, -5, 1, 0, 0, col.radius);
                    coinGradient.addColorStop(0, isSilver ? '#ffffff' : '#fff7ad');
                    coinGradient.addColorStop(0.55, isSilver ? '#b9d4e5' : '#facc15');
                    coinGradient.addColorStop(1, isSilver ? '#547994' : '#b77908');
                    ctx.fillStyle = coinGradient;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, col.radius * Math.max(0.16, Math.abs(Math.cos(col.angle))), col.radius, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = isSilver ? '#eff8ff' : '#fff2a6';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.ellipse(0, 0, col.radius * 0.48 * Math.max(0.16, Math.abs(Math.cos(col.angle))), col.radius * 0.58, 0, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
                ctx.restore();

                const dx = (player.x + player.width/2) - col.x;
                const dy = (player.y + player.height/2) - col.y;
                if (Math.sqrt(dx * dx + dy * dy) < player.width/2 + col.radius) {
                    const coinValue = col.value || 1;
                    claimCoinReward(coinValue);
                    collectibles.splice(i, 1);
                    continue;
                }
                if (col.x < -40) collectibles.splice(i, 1);
            }

            // --- Cofres de recompensa ---
            for (let i = rewardChests.length - 1; i >= 0; i--) {
                const chest = rewardChests[i];
                if (gameRunning) chest.x -= gameSpeed;

                ctx.save();
                ctx.translate(chest.x, chest.y);
                ctx.shadowColor = '#ffcb05';
                ctx.shadowBlur = chest.opened ? 18 : 10;
                const chestBody = ctx.createLinearGradient(0, 10, 0, chest.height);
                chestBody.addColorStop(0, '#f6b83f');
                chestBody.addColorStop(1, '#9a4b1f');
                ctx.fillStyle = chestBody;
                ctx.strokeStyle = '#ffe58a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(1, 12, chest.width - 2, chest.height - 13, 5);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#3b5ba7';
                ctx.fillRect(4, 21, chest.width - 8, 4);
                ctx.fillStyle = '#ffcb05';
                ctx.fillRect(chest.width / 2 - 3, 20, 6, 8);
                ctx.strokeStyle = '#fff0b2';
                ctx.lineWidth = 1;
                ctx.strokeRect(chest.width / 2 - 2, 22, 4, 5);

                ctx.save();
                if (chest.opened) {
                    ctx.translate(chest.width / 2, 13);
                    ctx.rotate(-0.38);
                    ctx.fillStyle = '#c87827';
                    ctx.strokeStyle = '#ffe58a';
                    ctx.lineWidth = 2;
                    ctx.fillRect(-chest.width / 2, -9, chest.width, 10);
                    ctx.strokeRect(-chest.width / 2, -9, chest.width, 10);
                } else {
                    ctx.fillStyle = '#d99030';
                    ctx.strokeStyle = '#ffe58a';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(1, 3, chest.width - 2, 13, [7, 7, 2, 2]);
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.restore();
                ctx.restore();

                if (
                    !chest.opened &&
                    player.x < chest.x + chest.width &&
                    player.x + player.width > chest.x &&
                    player.y < chest.y + chest.height &&
                    player.y + player.height > chest.y
                ) {
                    chest.opened = true;
                    chest.openFrames = 50;
                    claimCoinReward(chest.reward);
                    score += 50;
                    updateScoreAndCoinsDisplay();
                }
                if (chest.opened) {
                    ctx.save();
                    ctx.fillStyle = '#fff7ad';
                    ctx.strokeStyle = '#663813';
                    ctx.lineWidth = 3;
                    ctx.font = 'bold 15px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.strokeText(`+${chest.reward} monedas`, chest.x + chest.width / 2, chest.y - 8);
                    ctx.fillText(`+${chest.reward} monedas`, chest.x + chest.width / 2, chest.y - 8);
                    ctx.restore();
                    if (gameRunning) chest.openFrames--;
                    if (chest.openFrames <= 0) rewardChests.splice(i, 1);
                } else if (chest.x < -chest.width) {
                    rewardChests.splice(i, 1);
                }
            }

            // Corazones para recuperar vidas perdidas
            for (let i = lifePickups.length - 1; i >= 0; i--) {
                const heart = lifePickups[i];
                if (gameRunning) heart.x -= gameSpeed;

                ctx.save();
                ctx.translate(heart.x, heart.y);
                ctx.shadowColor = '#fb7185';
                ctx.shadowBlur = 18;
                const heartGradient = ctx.createLinearGradient(0, 0, heart.width, heart.height);
                heartGradient.addColorStop(0, '#fff1f2');
                heartGradient.addColorStop(0.28, '#fb7185');
                heartGradient.addColorStop(1, '#be123c');
                ctx.fillStyle = heartGradient;
                ctx.beginPath();
                ctx.moveTo(heart.width / 2, heart.height);
                ctx.bezierCurveTo(-heart.width * 0.3, heart.height * 0.48, -heart.width * 0.05, 0, heart.width / 2, heart.height * 0.28);
                ctx.bezierCurveTo(heart.width * 1.05, 0, heart.width * 1.3, heart.height * 0.48, heart.width / 2, heart.height);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
                ctx.beginPath();
                ctx.ellipse(heart.width * 0.31, heart.height * 0.31, 3, 5, -0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                if (
                    lives < maxLives &&
                    player.x < heart.x + heart.width &&
                    player.x + player.width > heart.x &&
                    player.y < heart.y + heart.height &&
                    player.y + player.height > heart.y
                ) {
                    lives = Math.min(maxLives, lives + 1);
                    score += 50;
                    updateLivesDisplay();
                    playPowerupSound();
                    lifePickups.splice(i, 1);
                    continue;
                }
                if (heart.x < -heart.width) lifePickups.splice(i, 1);
            }

            // --- Poderes Coleccionables ---
            for (let i = powerups.length - 1; i >= 0; i--) {
                let pow = powerups[i];
                if (gameRunning) pow.x -= (player.activePower === 'rayito' ? gameSpeed * 1.8 : gameSpeed);

                ctx.save();
                ctx.shadowColor = pow.type === 'rayito' ? '#38bdf8' : '#f97316';
                ctx.shadowBlur = 20;
                const powerGradient = ctx.createLinearGradient(pow.x, pow.y, pow.x + pow.width, pow.y + pow.height);
                if (pow.type === 'rayito') {
                    powerGradient.addColorStop(0, '#bae6fd');
                    powerGradient.addColorStop(0.45, '#0ea5e9');
                    powerGradient.addColorStop(1, '#075985');
                } else {
                    powerGradient.addColorStop(0, '#fed7aa');
                    powerGradient.addColorStop(0.45, '#f97316');
                    powerGradient.addColorStop(1, '#9a3412');
                }
                ctx.fillStyle = powerGradient;
                ctx.beginPath();
                ctx.roundRect(pow.x, pow.y, pow.width, pow.height, 8);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 17px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(pow.type === 'rayito' ? '⚡' : '🔥', pow.x + pow.width / 2, pow.y + pow.height / 2 + 1);
                ctx.restore();

                if (
                    player.x < pow.x + pow.width &&
                    player.x + player.width > pow.x &&
                    player.y < pow.y + pow.height &&
                    player.y + player.height > pow.y
                ) {
                    playPowerupSound();
                    player.activePower = pow.type;
                    player.powerTimer = 1200; // Exactos 20 segundos
                    if (pow.type === 'fuego') player.fireAmmo += 5;

                    const ind = document.getElementById('activePowerIndicator');
                    ind.classList.remove('hidden');
                    ind.classList.add('flex');
                    updatePowerIndicator();

                    powerups.splice(i, 1);
                    continue;
                }
                if (pow.x < -50) powerups.splice(i, 1);
            }

            // --- Minas y explosiones del nivel nocturno ---
            for (let i = mines.length - 1; i >= 0; i--) {
                const mine = mines[i];
                if (gameRunning) {
                    mine.x -= gameSpeed;
                    mine.phase += 0.12;
                }

                const mineY = mine.y + renderedCameraOffsetY;
                const pulse = 0.75 + (Math.sin(mine.phase) + 1) * 0.12;
                ctx.save();
                ctx.translate(mine.x + mine.width / 2, mineY + mine.height / 2);
                ctx.scale(pulse, pulse);
                ctx.shadowColor = '#ff4b2b';
                ctx.shadowBlur = 14;
                ctx.fillStyle = '#29212b';
                ctx.strokeStyle = '#ff6b35';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, mine.width * 0.42, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#ffcb05';
                ctx.beginPath();
                ctx.arc(0, 0, mine.width * 0.17, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                const overlapsPlayer =
                    player.x + 10 < mine.x + mine.width - 5 &&
                    player.x + player.width - 10 > mine.x + 5 &&
                    player.y + 8 < mine.y + mine.height &&
                    player.y + player.height - 4 > mine.y + 5;
                if (gameRunning && overlapsPlayer) {
                    mines.splice(i, 1);
                    explosions.push({
                        x: mine.x + mine.width / 2 - 42,
                        y: mine.y - 38,
                        width: 84,
                        height: 84,
                        framesLeft: 42
                    });
                    if (shieldTimerFrames > 0) {
                        playPowerupSound();
                    } else if (damageFlashFrames <= 0) {
                        lives--;
                        damageFlashFrames = 90;
                        updateLivesDisplay();
                        if (lives <= 0) gameOver();
                        else playHitSound();
                        savePersistentData(true);
                    }
                    continue;
                }
                if (mine.x + mine.width < -30) mines.splice(i, 1);
            }

            for (let i = explosions.length - 1; i >= 0; i--) {
                const explosion = explosions[i];
                if (gameRunning) {
                    explosion.x -= gameSpeed;
                    explosion.framesLeft--;
                }
                if (mineExplosionImg.complete && mineExplosionImg.naturalWidth > 0) {
                    ctx.drawImage(
                        mineExplosionImg,
                        explosion.x,
                        explosion.y + renderedCameraOffsetY,
                        explosion.width,
                        explosion.height
                    );
                } else {
                    ctx.save();
                    ctx.globalAlpha = Math.max(0, explosion.framesLeft / 42);
                    ctx.fillStyle = '#ff6b24';
                    ctx.shadowColor = '#ffcb05';
                    ctx.shadowBlur = 24;
                    ctx.beginPath();
                    ctx.arc(
                        explosion.x + explosion.width / 2,
                        explosion.y + renderedCameraOffsetY + explosion.height / 2,
                        explosion.width * (1 - explosion.framesLeft / 84),
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                    ctx.restore();
                }
                if (explosion.framesLeft <= 0 || explosion.x + explosion.width < -50) {
                    explosions.splice(i, 1);
                }
            }

            // --- Monstruos (Estáticos vs Perseguidores) ---
            for (let i = obstacles.length - 1; i >= 0; i--) {
                let obs = obstacles[i];
                if (gameRunning) {
                    const frozen = iceTimerFrames > 0 && obs.type === 'pursuer';
                    const moveMod = player.activePower === 'rayito' ? gameSpeed * 1.8 : gameSpeed;
                    if (!frozen) obs.x -= moveMod;

                    if (obs.type === 'pursuer' && !frozen) {
                        if (frameCount >= obs.nextTargetFrame) {
                            const randomOffset = (Math.random() - 0.5) * canvas.height * 0.3;
                            obs.targetY = player.y + randomOffset;
                            obs.nextTargetFrame = frameCount + 55 + Math.floor(Math.random() * 90);
                        }
                        const verticalDifference = obs.targetY - obs.y;
                        obs.y += Math.sign(verticalDifference) * Math.min(0.7, Math.abs(verticalDifference));
                    }
                    if (
                        currentLevel >= 6 &&
                        obs.type === 'pursuer' &&
                        !frozen &&
                        frameCount >= obs.nextShotFrame &&
                        obs.x > player.x + player.width + 30 &&
                        obs.x < canvas.width + 40
                    ) {
                        const originX = obs.x + obs.width / 2;
                        const originY = obs.y + obs.height / 2;
                        const angle = Math.atan2(
                            player.y + player.height / 2 - originY,
                            player.x + player.width / 2 - originX
                        );
                        const projectileSpeed = Math.min(6.5, 4.8 + currentLevel * 0.08);
                        enemyBolts.push({
                            x: originX,
                            y: originY,
                            vx: Math.cos(angle) * projectileSpeed,
                            vy: Math.sin(angle) * projectileSpeed,
                            radius: 9
                        });
                        obs.nextShotFrame = frameCount + 105 + Math.floor(Math.random() * 35);
                    }
                }

                ctx.save();
                const obstacleSprite = obs.image || (obs.type === 'static' ? obstacleImg : villainImg);
                if (obstacleSprite && obstacleSprite.complete && obstacleSprite.naturalWidth > 0) {
                    positionSprite(obs.sprite, obs.x, obs.y + renderedCameraOffsetY, obs.width, obs.height);
                }
                obs.sprite.style.filter = iceTimerFrames > 0 && obs.type === 'pursuer'
                    ? 'grayscale(1) brightness(1.45) drop-shadow(0 0 8px #b8f3ff)'
                    : '';
                ctx.restore();

                if (shieldTimerFrames > 0) {
                    const dx = player.x + player.width / 2 - (obs.x + obs.width / 2);
                    const dy = player.y + player.height / 2 - (obs.y + obs.height / 2);
                    const shieldRadius = Math.max(player.width, player.height) * 0.58 + 26;
                    const enemyRadius = Math.max(obs.width, obs.height) * 0.38;
                    if (Math.hypot(dx, dy) < shieldRadius + enemyRadius) {
                        removeObstacleSprite(obs);
                        obstacles.splice(i, 1);
                        score += 60;
                        updateScoreAndCoinsDisplay();
                        playPowerupSound();
                        continue;
                    }
                }

                const margin = 8;
                if (
                    damageFlashFrames <= 0 &&
                    player.x + margin < obs.x + obs.width - margin &&
                    player.x + player.width - margin > obs.x + margin &&
                    player.y + margin < obs.y + obs.height - margin &&
                    player.y + player.height - margin > obs.y + margin
                ) {
                    lives--;
                    damageFlashFrames = 90;
                    updateLivesDisplay();
                    removeObstacleSprite(obs);
                    obstacles.splice(i, 1);
                    if (lives <= 0) gameOver();
                    else playHitSound();
                    continue;
                }

                if (obs.x < -60) {
                    removeObstacleSprite(obs);
                    obstacles.splice(i, 1);
                }
            }

            // Proyectiles de los monstruos a partir del nivel 6
            for (let i = enemyBolts.length - 1; i >= 0; i--) {
                const bolt = enemyBolts[i];
                if (gameRunning) {
                    bolt.x += bolt.vx;
                    bolt.y += bolt.vy;
                }

                ctx.save();
                ctx.shadowColor = '#c084fc';
                ctx.shadowBlur = 20;
                const boltGradient = ctx.createRadialGradient(
                    bolt.x - bolt.radius * 0.3,
                    bolt.y - bolt.radius * 0.35,
                    1,
                    bolt.x,
                    bolt.y,
                    bolt.radius * 1.5
                );
                boltGradient.addColorStop(0, '#f5d0fe');
                boltGradient.addColorStop(0.35, '#c084fc');
                boltGradient.addColorStop(1, '#7e22ce');
                ctx.fillStyle = boltGradient;
                ctx.beginPath();
                ctx.ellipse(bolt.x - bolt.vx * 1.2, bolt.y - bolt.vy * 1.2, bolt.radius * 1.55, bolt.radius * 0.72, Math.atan2(bolt.vy, bolt.vx), 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                if (
                    shieldTimerFrames > 0 &&
                    Math.hypot(
                        bolt.x - (player.x + player.width / 2),
                        bolt.y - (player.y + player.height / 2)
                    ) < bolt.radius + Math.max(player.width, player.height) * 0.58 + 26
                ) {
                    enemyBolts.splice(i, 1);
                    continue;
                }
                if (
                    damageFlashFrames <= 0 &&
                    Math.abs(bolt.x - (player.x + player.width / 2)) < bolt.radius + player.width / 2 &&
                    Math.abs(bolt.y - (player.y + player.height / 2)) < bolt.radius + player.height / 2
                ) {
                    enemyBolts.splice(i, 1);
                    lives--;
                    damageFlashFrames = 90;
                    updateLivesDisplay();
                    if (lives <= 0) gameOver();
                    else playHitSound();
                    continue;
                }
                if (
                    bolt.x < -40 || bolt.x > canvas.width + 40 ||
                    bolt.y + cameraOffsetY < -40 || bolt.y + cameraOffsetY > canvas.height + 40
                ) {
                    enemyBolts.splice(i, 1);
                }
            }

            // --- Renderizado del Personaje con IMAGEN ---
            ctx.save();
            ctx.shadowColor = player.activePower === 'rayito' ? '#38bdf8' : (player.activePower === 'fuego' ? '#f97316' : '#06b6d4');
            ctx.shadowBlur = player.activePower ? 25 : 12;
            if (shieldTimerFrames > 0) {
                const shieldPulse = 1 + Math.sin(frameCount * 0.18) * 0.035;
                ctx.save();
                ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
                ctx.scale(shieldPulse, shieldPulse);
                ctx.shadowColor = '#ffcb05';
                ctx.shadowBlur = 24;
                ctx.fillStyle = 'rgba(255, 203, 5, 0.2)';
                ctx.strokeStyle = '#ffe45c';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(0, 0, Math.max(player.width, player.height) * 0.64 + 13, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }

            if (imageLoaded) {
                positionSprite(playerSprite, player.x, player.y + renderedCameraOffsetY, player.width, player.height);
                playerSprite.style.visibility = 'visible';
                playerSprite.style.opacity = damageFlashFrames > 0 && Math.floor(damageFlashFrames / 6) % 2 === 0
                    ? '0.2'
                    : '1';
                playerSprite.style.transform = levelGoal
                    ? `translateY(${Math.sin(levelGoal.phase) * 2}px)`
                    : '';
            } else {
                playerSprite.style.visibility = 'hidden';
                ctx.globalAlpha = damageFlashFrames > 0 && Math.floor(damageFlashFrames / 6) % 2 === 0
                    ? 0.2
                    : 1;
                ctx.fillStyle = '#0284c7';
                ctx.beginPath();
                ctx.roundRect(player.x, player.y, player.width, player.height, 8);
                ctx.fill();
            }
            ctx.restore();

            ctx.restore();
            requestAnimationFrame(gameLoop);
        }

        window.onload = function() {
            gameLoop();
        };