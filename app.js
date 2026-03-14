/**
 * GoopiApp - Core Logic (Tokyo Midnight Pro Edition)
 */
console.log("🚀 GOOPIAPP INITIALIZED");

// ADVERTENCIA DE SEGURIDAD: Estas credenciales deberían ser manejadas por un proxy/backend seguro
// en producción para evitar la exposición del appPassword.
const wpConfig = {
    url: "https://goopiapp.com/wp-json",
    user: "jumbumbito@gmail.com",
    appPassword: "8wHv UbIC nUXg VogE DHcP VSYn"
};

const state = {
    currentView: 'home',
    posts: [],
    communityPosts: [],
    socialAds: [],
    userFavorites: {},
    userFollowing: {},
    userPoints: 1000,
    redDiamonds: 0,
    dailyPoints: 1000,
    streak: 0,
    lastStreakDate: null,
    rewardClaimedToday: false,
    lastGameDate: null,
    targetProfileId: null, // UID of the profile being viewed
    isMuted: true,
    navigationHistory: [],
    userChats: {},
    activeChatMessages: []
};

// --- FUNCIÓN PUBLICIDAD SOCIAL DESDE WORDPRESS ---
async function fetchSocialAds() {
    try {
        const response = await fetch(`${wpConfig.url}/wp/v2/pages?slug=publicidad-social&_embed&t=${Date.now()}`);
        const data = await response.json();
        if (data && data.length > 0 && data[0].content && data[0].content.rendered) {
            const html = data[0].content.rendered;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            
            const ads = [];
            
            // Parse Images
            tempDiv.querySelectorAll('img').forEach(img => {
                if (img.src) ads.push({ type: 'image', url: img.src });
            });
            
            // Parse Videos 
            tempDiv.querySelectorAll('video').forEach(vid => {
                if (vid.src) ads.push({ type: 'video', url: vid.src });
                else {
                    const src = vid.querySelector('source');
                    if (src && src.src) ads.push({ type: 'video', url: src.src });
                }
            });
            
            // Parse Iframes (e.g. VideoPress, YouTube)
            tempDiv.querySelectorAll('iframe').forEach(ifr => {
                if (ifr.src) {
                    let finalUrl = ifr.src;
                    if (finalUrl.includes('?')) {
                        finalUrl += '&autoplay=1&loop=1&muted=1&controls=0&playsinline=1';
                    } else {
                        finalUrl += '?autoplay=1&loop=1&muted=1&controls=0&playsinline=1';
                    }
                    ads.push({ type: 'iframe', url: finalUrl });
                }
            });
            
            // Link a videos sueltos
            tempDiv.querySelectorAll('a').forEach(a => {
                if (a.href && a.href.toLowerCase().endsWith('.mp4') && !ads.some(ad => ad.url === a.href)) {
                    ads.push({ type: 'video', url: a.href });
                }
            });
            
            // Mezclarlos para variar la publicidad
            state.socialAds = ads.sort(() => Math.random() - 0.5);
            console.log("🔥 Social Ads Cargados (Desde WP): ", state.socialAds.length);
            if (state.currentView === 'community') {
                renderCommunityPosts();
            }
        }
    } catch (e) {
        console.error("Error al cargar Publicidad Social", e);
    }
}
fetchSocialAds(); // Disparar la extraccion al inicio del app


// Firebase Safe-Initialization
let auth = null;
let db = null;
let storage = null;
let fs = null; // Firestore
let firebaseError = false;

function initFirebase() {
    if (typeof firebase !== 'undefined') {
        try {
            const firebaseConfig = {
                apiKey: "AIzaSyDViqhxvs5nRavt9OhlVGZV43GvRqJHlYo",
                authDomain: "taxi-macas-52717.firebaseapp.com",
                databaseURL: "https://taxi-macas-52717-default-rtdb.firebaseio.com",
                projectId: "taxi-macas-52717",
                storageBucket: "taxi-macas-52717.firebasestorage.app",
                messagingSenderId: "206011903079",
                appId: "1:206011903079:web:b06dde539a4e0057cf38c2"
            };
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            auth = firebase.auth();
            db = firebase.database();
            storage = firebase.storage();
            fs = firebase.firestore();
            auth.onAuthStateChanged((user) => {
                if (user) {
                    state.syncing = true;
                    syncFavorites(user.uid);
                    syncFollowing(user.uid);
                    syncGameStats(user.uid);
                    syncUserChats(user.uid);
                } else {
                    state.userFavorites = {};
                    state.userFollowing = {};
                    state.userPoints = 0;
                    state.redDiamonds = 0;
                }
                updateHeader();
            });

            // Capturar resultado de redirecciones pendientes (Login con Google)
            auth.getRedirectResult().then(result => {
                if (result.user) {
                    console.log("🔥 Redirect Login Success:", result.user.email);
                    updateHeader();
                    if (state.currentView === 'login' || state.currentView === 'profile') {
                        navigate('home');
                    }
                }
            }).catch(e => console.error("Redirect Error:", e));
            firebaseError = false;
        } catch (e) {
            console.error("Firebase Error:", e);
            firebaseError = true;
        }
    }
}

function syncFavorites(uid) {
    const favRef = db.ref('favorites/' + uid);
    favRef.on('value', (snapshot) => {
        state.userFavorites = snapshot.val() || {};
        if (state.currentView === 'profile') {
            const mainContent = document.getElementById('main-view');
            if (mainContent) renderView('profile', mainContent);
        }
    });
}

function syncFollowing(uid) {
    if (!db) return;
    const followRef = db.ref('following/' + uid);
    followRef.on('value', (snapshot) => {
        state.userFollowing = snapshot.val() || {};
        // Refrescamos vistas si es necesario
        if (state.currentView === 'community') {
            renderCommunityPosts();
        } else if (state.currentView === 'profile') {
            const mainContent = document.getElementById('main-view');
            if (mainContent) renderView('profile', mainContent);
        }
    });
}

function syncGameStats(uid) {
    const gameRef = db.ref('gameStats/' + uid);
    gameRef.on('value', (snapshot) => {
        const data = snapshot.val();
        const todayRaw = new Date();
        const today = todayRaw.toLocaleDateString();
        
        // Calcular ayer
        const yesterdayRaw = new Date();
        yesterdayRaw.setDate(yesterdayRaw.getDate() - 1);
        const yesterday = yesterdayRaw.toLocaleDateString();

        if (data) {
            state.redDiamonds = data.redDiamonds || 0;
            state.streak = data.streak || 0;
            state.lastStreakDate = data.lastStreakDate || null;

            // Manejo de puntos (Acumulativos, NO resetear)
            state.userPoints = data.points !== undefined ? data.points : 1000;
            
            // Si es un nuevo día, actualizamos la fecha sin tocar los puntos
            if (data.lastDate !== today) {
                db.ref('gameStats/' + uid).update({
                    lastDate: today
                });
            }

            // Manejo de RACHAS
            if (state.lastStreakDate !== today) {
                let newStreak = 1;
                if (state.lastStreakDate === yesterday) {
                    newStreak = state.streak + 1;
                }
                
                state.streak = newStreak;
                state.lastStreakDate = today;
                
                db.ref('gameStats/' + uid).update({
                    streak: newStreak,
                    lastStreakDate: today
                });

                // Mostrar recompensa si es primer login del día
                setTimeout(() => showDailyReward(newStreak), 2000);
            }

        } else {
            // Primer ingreso
            state.userPoints = 1000;
            state.redDiamonds = 0;
            state.streak = 1;
            state.lastStreakDate = today;
            
            db.ref('gameStats/' + uid).set({
                points: 1000,
                redDiamonds: 0,
                streak: 1,
                lastStreakDate: today,
                lastDate: today
            });
            
            setTimeout(() => showDailyReward(1), 2000);
        }

        const pointsEl = document.getElementById('points-display-total');
        if (pointsEl) pointsEl.innerText = state.userPoints;
        
        const redDiamondsEl = document.getElementById('red-diamonds-display');
        if (redDiamondsEl) redDiamondsEl.innerText = state.redDiamonds;

        updateHeader(); // Asegura que el fuego de la racha se actualice
    });
}

function showDailyReward(streak) {
    const bonus = 500 + (streak * 100); // 500 base + 100 por cada día de racha
    
    const overlay = document.createElement('div');
    overlay.className = 'reward-overlay active';
    overlay.innerHTML = `
        <div class="reward-content">
            <div class="reward-fire">
                <i class="fas fa-fire streak-fire-${Math.min(streak, 10)}"></i>
            </div>
            <h2>¡RACHA DE ${streak} DÍAS!</h2>
            <p>Has ganado un bonus diario por volver a Goopi.</p>
            <div class="reward-amount">+${bonus} <span style="font-size:14px; color:var(--accent-orange);">PTS</span></div>
            <button class="reward-btn" onclick="claimReward(${bonus})">¡GENIAL!</button>
        </div>
    `;
    document.body.appendChild(overlay);
    
    // Confeti simple (Emoji)
    for(let i=0; i<15; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-emoji';
        p.innerText = '🔥';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.animationDuration = (Math.random() * 3 + 2) + 's';
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 5000);
    }
}

function claimReward(amount) {
    const user = auth.currentUser;
    if (!user || !db) return;

    const newPoints = state.userPoints + amount;
    db.ref('gameStats/' + user.uid).update({
        points: newPoints
    });

    const overlay = document.querySelector('.reward-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 400);
    }
}

function syncUserChats(uid) {
    if (!db) return;
    const chatsRef = db.ref('userChats/' + uid);
    chatsRef.on('value', (snapshot) => {
        state.userChats = snapshot.val() || {};
        
        // Update header icon for unread messages
        const totalUnread = Object.values(state.userChats).reduce((acc, chat) => acc + (chat.unread || 0), 0);
        const msgBtn = document.getElementById('header-msg-btn');
        if (msgBtn) {
            if (totalUnread > 0) {
                msgBtn.innerHTML = `<i class="fas fa-comment-dots" style="color:var(--secondary-lilac);"></i><span style="position:absolute; top:-5px; right:-5px; background:#ff2d55; color:white; border-radius:10px; min-width:18px; height:18px; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; border:2px solid var(--bg-dark);">${totalUnread}</span>`;
            } else {
                msgBtn.innerHTML = `<i class="far fa-comment-dots"></i>`;
            }
        }

        if (state.currentView === 'messages') {
            const mainContent = document.getElementById('main-view');
            if (mainContent) renderView('messages', mainContent);
        }
    });
}

function showStreakInfo() {
    const streak = state.streak;
    const overlay = document.createElement('div');
    overlay.id = 'streak-info-overlay';
    overlay.className = 'reward-overlay active'; // Reutilizamos estilos de overlay
    
    // Calcular cuánto falta para el siguiente nivel de fuego
    const nextMilestone = Math.ceil((streak + 1) / 5) * 5;
    const daysLeft = nextMilestone - streak;

    overlay.innerHTML = `
        <div class="reward-content" style="background: linear-gradient(135deg, #1a0b2e 0%, #2d1b4d 100%); border-color: #ff8c00; box-shadow: 0 0 30px rgba(255, 140, 0, 0.3);">
            <div class="reward-fire" style="font-size: 60px;">
                <i class="fas fa-fire streak-fire-${Math.min(streak, 10)}"></i>
            </div>
            <h2 style="color: #ff8c00; font-size: 28px;">¡ESTÁS ON FIRE!</h2>
            <p style="color: #fff; font-size: 16px; margin: 15px 0;">Llevas <b>${streak} ${streak === 1 ? 'día' : 'días'}</b> seguidos entrando a Goopi.</p>
            
            <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 20px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.1);">
                <p style="font-size: 12px; color: var(--text-dim); margin-bottom: 8px;">TU PRÓXIMO LOGRO</p>
                <div style="width: 100%; height: 8px; background: rgba(0,0,0,0.3); border-radius: 10px; overflow: hidden; margin-bottom: 10px;">
                    <div style="width: ${(streak % 5) * 20 || 100}%; height: 100%; background: linear-gradient(to right, #ff8c00, #ff2d55); border-radius: 10px;"></div>
                </div>
                <p style="font-size: 11px; color: #ffcc00;">${daysLeft > 0 ? `Faltan ${daysLeft} días para subir de nivel de fuego` : '¡Nivel máximo alcanzado!'}</p>
            </div>

            <button class="reward-btn" onclick="document.getElementById('streak-info-overlay').remove()" style="background: #ff8c00;">¡A DARLE!</button>
        </div>
    `;
    document.body.appendChild(overlay);
    if (!window._isHandlingBack) window.history.pushState({ overlay: 'streak-info' }, "");
}

function updateHeader() {
    const user = auth ? auth.currentUser : null;
    const userBtn = document.getElementById('header-user-btn');
    if (userBtn) {
        userBtn.setAttribute('onclick', "navigate('profile')"); // Always profile
        if (user) {
            if (user.photoURL) {
                userBtn.innerHTML = `<img src="${user.photoURL}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid var(--secondary-lilac);">`;
            } else {
                userBtn.innerHTML = `<i class="fas fa-user-circle"></i>`;
                userBtn.style.color = "var(--secondary-lilac)";
            }
        } else {
            userBtn.innerHTML = `<i class="fas fa-user-circle"></i>`;
            userBtn.style.color = "var(--secondary-cyan)";
        }
    }
    
    // Check user actions for aligning: Search, Messages, Streak
    const userActions = document.querySelector('.user-actions');
    if (userActions) {
        // 1. Asegurar icono de mensajes
        if (!document.getElementById('header-msg-btn')) {
            const msgBtn = document.createElement('button');
            msgBtn.id = 'header-msg-btn';
            msgBtn.setAttribute('onclick', "navigate('messages')");
            msgBtn.style = "background:none; border:none; color:white; font-size:20px; cursor: pointer; position: relative; display: flex; align-items: center;";
            msgBtn.innerHTML = `<i class="far fa-comment-dots"></i>`;
            // Insertar antes del botón de perfil (el último en user-actions)
            userActions.insertBefore(msgBtn, userBtn);
        }

        // 2. Asegurar indicador de racha (fuego)
        let streakBadge = document.getElementById('header-streak-badge');
        if (user && state.streak > 0) {
            if (!streakBadge) {
                streakBadge = document.createElement('div');
                streakBadge.id = 'header-streak-badge';
                streakBadge.className = 'streak-badge';
                streakBadge.setAttribute('onclick', "showStreakInfo()");
                streakBadge.style = "display: flex; align-items: center; gap: 4px; cursor: pointer;";
                // Insertar antes de los mensajes
                userActions.insertBefore(streakBadge, document.getElementById('header-msg-btn'));
            }
            streakBadge.innerHTML = `
                <i class="fas fa-fire streak-fire-${Math.min(state.streak, 10)}" style="font-size:18px;"></i>
                <span style="font-weight: 800; font-size: 14px; color: var(--text-white);">${state.streak}</span>
            `;
        } else if (streakBadge) {
            streakBadge.remove();
        }
    }
}

const LOGO_URL = "https://goopiapp.com/wp-content/uploads/2026/02/cropped-e628f4e1-a38c-4da8-ae79-343f049eb3c3.png";

// URLs Directas de los Banners (Corregidas 2026/02)
const adImages = [
    "https://i0.wp.com/goopiapp.com/wp-content/uploads/2026/02/1.png",
    "https://i0.wp.com/goopiapp.com/wp-content/uploads/2026/02/2.png",
    "https://i0.wp.com/goopiapp.com/wp-content/uploads/2026/02/3.png"
];

const categoryIcons = {
    'negocios': 'fa-briefcase',
    'gastronomia': 'fa-utensils',
    'alimentacion': 'fa-hamburger',
    'hospedaje': 'fa-bed',
    'hoteles': 'fa-hotel',
    'ocio': 'fa-cocktail',
    'entretenimiento': 'fa-theater-masks',
    'compras': 'fa-shopping-bag',
    'tiendas': 'fa-store',
    'salud': 'fa-heartbeat',
    'turismo': 'fa-map-marked-alt',
    'transporte': 'fa-car',
    'servicios': 'fa-concierge-bell',
    'default': 'fa-layer-group'
};

function getCategoryIcon(name) {
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const key in categoryIcons) {
        if (slug.includes(key)) return categoryIcons[key];
    }
    return categoryIcons['default'];
}

// Generador de Carrusel Nativo (Más estable que iframes) - Altura Reducida
function generateNativeAdHtml(height = "75px", idPrefix = "ad") {
    const uniqueId = `ad-img-${idPrefix}`;

    // Script para rotar las imágenes localmente
    setTimeout(() => {
        const img = document.getElementById(uniqueId);
        if (img) {
            let currentIndex = 0;
            setInterval(() => {
                currentIndex = (currentIndex + 1) % adImages.length;
                img.style.opacity = '0';
                setTimeout(() => {
                    img.src = adImages[currentIndex];
                    img.style.opacity = '1';
                }, 500);
            }, 6000); // 6 segundos por banner
        }
    }, 100);

    return `
        <div style="height: ${height}; width: 100%; background: #000; overflow: hidden; position: relative; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); border: 1px solid var(--glass-border); display: flex; align-items: center; justify-content: center; margin: 12px 0;">
            <img id="${uniqueId}" src="${adImages[0]}" 
                 style="width: 100%; height: 100%; object-fit: cover; transition: opacity 0.5s ease-in-out;">
            <div style="position: absolute; top: 4px; right: 8px; background: rgba(0,0,0,0.6); color: white; font-size: 7px; padding: 1px 4px; border-radius: 8px; font-family: sans-serif; letter-spacing: 1px;">ANUNCIO</div>
        </div>
    `;
}

function navigate(view, extra = null, isBack = false) {
    // 0. Prevenir recarga si viene de un enlace
    if (window.event && window.event.preventDefault) window.event.preventDefault();

    // Si no es un retroceso, guardamos la vista actual en el historial
    if (!isBack && state.currentView !== view) {
        state.navigationHistory.push(state.currentView);
        if (state.navigationHistory.length > 15) state.navigationHistory.shift();

        // Push real state
        window.history.pushState({ view: view, extra: extra }, view, "");
    }

    // Cerramos overlays activos si existen (Sin disparar lógica de atrás)
    const details = document.getElementById('details-overlay');
    if (details) details.classList.remove('active');
    const searchOverlay = document.getElementById('search-overlay');
    if (searchOverlay) searchOverlay.classList.remove('active');
    const popup = document.getElementById('dynamic-popup');
    if (popup) popup.classList.remove('active');
    const mines = document.getElementById('mines-game-overlay');
    if (mines) { mines.classList.remove('active'); setTimeout(() => mines.remove(), 400); gameActive = false; }

    // Actualizamos estado visual de la barra de navegación
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-view') === view) {
            item.classList.add('active');
        }
    });

    // Reset de scroll al cambiar de vista
    const mainContent = document.getElementById('main-view');
    if (mainContent) mainContent.scrollTop = 0;

    // Actualizamos estado inmediatamente
    state.currentView = view;

    // Si navegamos a nuestro propio perfil o a cualquier otra sección principal, limpiamos el perfil externo
    if (view !== 'profile' || (view === 'profile' && extra === null)) {
        state.targetProfileId = null;
    }

    // --- GESTIÓN DE VISIBILIDAD DE LAYOUT ---
    const header = document.querySelector('.app-header');
    const nav = document.querySelector('.bottom-nav');
    const isFullScreen = ['taxi', 'delivery', 'community', 'driver-panel', 'chat'].includes(view);

    if (header) header.style.setProperty('display', isFullScreen ? 'none' : 'flex', 'important');
    // OCULTAR NAV TOTALMENTE EN CHAT Y VISTAS FULLSCREEN
    const shouldHideNav = (isFullScreen || view === 'chat' || view === 'messages');
    if (nav) nav.style.setProperty('display', shouldHideNav ? 'none' : 'flex', 'important');

    if (isFullScreen) {
        mainContent.style.padding = '0';
        mainContent.style.height = '100vh';
        mainContent.style.width = '100vw';
        mainContent.style.position = 'fixed';
        mainContent.style.top = '0';
        mainContent.style.left = '0';
        mainContent.style.zIndex = (view === 'chat') ? '30000' : '1000'; 
        mainContent.style.overflow = 'hidden';
        mainContent.style.background = '#000';
    } else {
        // Aumentamos el padding para que NADA se tape con la nav bar
        mainContent.style.padding = '20px 20px 220px'; 
        mainContent.style.height = 'auto';
        mainContent.style.width = 'auto';
        mainContent.style.position = 'static';
        mainContent.style.top = 'auto';
        mainContent.style.left = 'auto';
        mainContent.style.zIndex = '1';
        mainContent.style.overflowY = 'auto';
        mainContent.style.background = 'transparent';
    }
    
    // Si estamos en chat, forzamos que no haya scroll en el cuerpo para evitar que la nav aparezca
    if (view === 'chat') {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }

    // Animación de salida y entrada
    mainContent.style.opacity = '0';
    mainContent.style.transform = 'translateY(10px)';

    setTimeout(() => {
        renderView(view, mainContent, extra);
        mainContent.style.opacity = '1';
        mainContent.style.transform = 'translateY(0)';
        // Aseguramos que el scroll siempre suba al navegar
        if (mainContent.parentElement) mainContent.parentElement.scrollTop = 0;
        window.scrollTo(0, 0);
    }, 150);
}

// Handler para el botón de atrás (Físico/Barra)
function handleBackButton(isBrowserPopState = false) {
    const now = Date.now();
    if (window._lastBackTime && (now - window._lastBackTime < 300)) return;
    window._lastBackTime = now;

    console.log("🔙 BackButton:", isBrowserPopState ? 'PopState' : 'Native', "View:", state.currentView);

    // 1. Cerrar Overlays (Prioridad)
    const activeDetails = document.querySelector('.details-overlay.active');
    const activePopup = document.querySelector('.popup-overlay.active');
    const activeSearch = document.querySelector('#search-overlay.active, #user-search-overlay.active');
    const mines = document.getElementById('mines-game-overlay');
    const activeComments = document.querySelector('.comment-sheet.active');
    const activeLikes = document.querySelector('.likes-sheet.active');
    const activeShare = document.querySelector('.share-sheet.active');

    if (activeDetails || activePopup || activeSearch || mines || activeComments || activeLikes || activeShare) {
        if (activeDetails) activeDetails.classList.remove('active');
        if (activePopup) { activePopup.classList.remove('active'); setTimeout(() => activePopup.remove(), 400); }
        if (activeSearch) activeSearch.classList.remove('active');
        if (activeComments) activeComments.classList.remove('active');
        if (activeLikes) activeLikes.classList.remove('active');
        if (activeShare) {
            activeShare.classList.remove('active');
            setTimeout(() => activeShare.remove(), 400);
        }
        if (mines) { 
            mines.classList.remove('active'); 
            setTimeout(() => mines.remove(), 400); 
            gameActive = false; 
        }

        if (!isBrowserPopState) window.history.back();
        return;
    }

    // 2. Salida o Retroceso
    if (state.currentView === 'home') {
        const exitNow = window._lastExitAttempt && (Date.now() - window._lastExitAttempt < 3000);
        if (exitNow) {
            if (window.Capacitor && window.Capacitor.Plugins.App) {
                window.Capacitor.Plugins.App.exitApp();
            }
        } else {
            window._lastExitAttempt = Date.now();
            const toast = document.createElement('div');
            toast.innerText = "Presiona de nuevo para salir";
            toast.style = "position:fixed; bottom:140px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:white; padding:10px 20px; border-radius:20px; font-size:12px; z-index:99999;";
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
            
            if (!isBrowserPopState) window.history.pushState({ view: 'home' }, 'home', "");
        }
    } else {
        // Si no estamos en home, vamos atrás
        if (!isBrowserPopState) window.history.back();
    }
}

function renderView(view, container, extra = null) {
    switch (view) {
        case 'home':
            container.innerHTML = `
                <section class="hero">
                    <h1 style="text-shadow: 0 0 10px var(--secondary-lilac);">¡Hola, Gooper!</h1>
                    <p>¿Qué necesitas hoy?</p>
                </section>
                <!-- Opciones de Navegación Principales -->
                <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;">
                    <button onclick="navigate('community')" class="action-card community" style="width: 100%; border: none; padding: 25px; border-radius: 24px; background: linear-gradient(135deg, var(--secondary-lilac) 0%, #8c309b 100%); color: white; display: flex; align-items: center; justify-content: center; gap: 15px; font-weight: 900; font-size: 20px; cursor: pointer; box-shadow: 0 5px 20px rgba(186, 150, 255, 0.4); text-transform: uppercase; margin: 0;">
                        <i class="fas fa-users" style="font-size: 24px;"></i>
                        Goopi Social
                    </button>
                    
                    <div class="quick-actions" style="margin: 0; display: flex; gap: 15px;">
                        <a href="#" class="action-card taxi" onclick="navigate('taxi')" style="margin: 0; flex: 1;">
                            <i class="fas fa-taxi"></i>
                            <span>Pide un Taxi</span>
                        </a>
                        <a href="#" class="action-card delivery" onclick="navigate('delivery')" style="margin: 0; flex: 1;">
                            <i class="fas fa-motorcycle"></i>
                            <span>Delivery</span>
                        </a>
                    </div>
                </div>
                
                <!-- Goopi Points Button (Home View) -->
                <div style="margin: 20px 0;">
                    <button onclick="showMinesGame()" class="points-btn" style="width: 100%; border: none; padding: 18px; border-radius: 20px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #4a3b00; font-weight: 800; font-size: 16px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3); transition: transform 0.2s;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: rgba(255,255,255,0.3); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                <i class="fas fa-coins"></i>
                            </div>
                            Puntos Goopi
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.1); padding: 5px 12px; border-radius: 12px; font-size: 14px;">
                            <span>${state.userPoints}</span>
                            <i class="fas fa-play" style="font-size: 10px; opacity: 0.6;"></i>
                        </div>
                    </button>
                </div>
                
                <!-- PUBLICIDAD EN HOME (Justo bajo botones) -->
                <div style="margin-bottom: 20px;">
                    ${generateNativeAdHtml("75px", "home-mid")}
                </div>

                <!-- BOTÓN FARMACIAS DE TURNO (Utilidad Macas) -->
                <div style="margin-bottom: 25px;">
                    <button onclick="showFarmaciasTurno()" style="width: 100%; border: none; padding: 18px; border-radius: 22px; background: linear-gradient(135deg, #00f3ff 0%, #0077ff 100%); color: white; font-weight: 800; font-size: 15px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; box-shadow: 0 8px 25px rgba(0, 243, 255, 0.3); transition: transform 0.2s;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: rgba(255,255,255,0.2); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                                <i class="fas fa-pills"></i>
                            </div>
                            Farmacias de Turno Macas
                        </div>
                        <i class="fas fa-chevron-right" style="font-size: 12px; opacity: 0.6;"></i>
                    </button>
                </div>

                <section class="guide-preview">
                    <div class="section-header">
                        <h2>Guía Comercial</h2>
                        <a href="#" class="see-all" onclick="navigate('guide')">Ver todo</a>
                    </div>
                    <div class="scroll-row" id="home-guide-list">
                        <div style="padding: 20px; color: var(--text-dim); font-size: 14px;">Cargando locales...</div>
                    </div>
                </section>
                
                <section class="categories" style="margin-top: 15px;">
                    <div class="section-header">
                        <h2>Categorías</h2>
                    </div>
                    <div id="home-categories-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        <!-- Categories -->
                    </div>
                </section>

                <section class="units-area" style="margin-top: 20px; display: flex; flex-direction: column; gap: 12px;">
                    <button onclick="navigate('register-driver')" class="action-card" style="width: 100%; background: var(--card-bg); border: 1px solid var(--glass-border); color: var(--secondary-lilac); flex-direction: row; align-items: center; justify-content: center; padding: 15px; font-size: 14px; cursor: pointer;">
                        <i class="fas fa-id-card"></i> Registro de Unidades
                    </button>
                    <button onclick="navigate('driver-panel')" class="action-card" style="width: 100%; background: var(--card-bg); border: 1px solid var(--glass-border); color: var(--secondary-lilac); flex-direction: row; align-items: center; justify-content: center; padding: 15px; font-size: 14px; cursor: pointer;">
                        <i class="fas fa-tachometer-alt"></i> Panel de Unidades
                    </button>
                </section>

                <!-- PUBLICIDAD EN HOME (Abajo de todo) -->
                <div style="margin-bottom: 70px; margin-top: 20px;">
                    <p style="color: var(--text-dim); font-size: 10px; margin-bottom: 5px; text-align: center;">Publicidad Destacada</p>
                    ${generateNativeAdHtml("75px", "home-bot")}
                </div>
            `;
            initHomePage();
            break;

        case 'community':
            if (!auth.currentUser) {
                container.innerHTML = `
                    <div style="height: 100vh; background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 40px; text-align: center;">
                        <button onclick="navigate('home')" style="position: absolute; top: 30px; left: 20px; background: rgba(255,255,255,0.1); border: none; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <img src="${LOGO_URL}" style="height: 80px; margin-bottom: 30px; filter: grayscale(1) opacity(0.5);">
                        <i class="fas fa-users" style="font-size: 50px; color: var(--secondary-lilac); margin-bottom: 20px;"></i>
                        <h2 style="color: white; font-weight: 800; margin-bottom: 10px;">Comunidad Goopi</h2>
                        <p style="color: var(--text-dim); margin-bottom: 30px; font-size: 14px;">Inicia sesión para ver los Reels de la comunidad, dar likes y compartir momentos.</p>
                        
                        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
                            <button onclick="navigate('login')" style="background: var(--secondary-lilac); color: white; border: none; padding: 15px; border-radius: 15px; font-weight: 800;">INICIAR SESIÓN</button>
                            <button onclick="navigate('register')" style="background: none; border: 1px solid var(--secondary-lilac); color: white; padding: 15px; border-radius: 15px; font-weight: 800;">CREAR CUENTA</button>
                        </div>
                    </div>
                `;
                return;
            }
            // Refuerzo: Ocultar barra de navegación si por algún motivo sigue visible
            const bNav = document.querySelector('.bottom-nav');
            if (bNav) bNav.style.setProperty('display', 'none', 'important');

            container.innerHTML = `
                <div id="community-feed" class="tiktok-feed" style="background: #000; height: 100vh; width: 100vw; position: fixed; inset: 0; z-index: 100;">
                    <div style="height: 100vh; display: flex; align-items: center; justify-content: center; color: white; flex-direction: column;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 40px; margin-bottom: 20px; color: var(--secondary-lilac);"></i>
                        <p style="font-weight: 700; letter-spacing: 1px;">SINCRONIZANDO...</p>
                    </div>
                </div>

                <!-- Botones Superiores Community -->
                <div style="position: fixed; top: 15px; left: 0; right: 0; padding: 0 15px; display: flex; justify-content: space-between; align-items: center; z-index: 20000; pointer-events: none;">
                    <div style="display: flex; gap: 10px;">
                        <button onclick="navigate('home')" style="pointer-events: auto; background: rgba(0,0,0,0.6); border: 2.5px solid rgba(255,255,255,0.2); color: white; width: 44px; height: 44px; border-radius: 50%; backdrop-filter: blur(10px); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <button onclick="navigate('reels-map')" style="pointer-events: auto; background: rgba(0,243,255,0.2); border: 2.5px solid #00f3ff; color: #00f3ff; width: 44px; height: 44px; border-radius: 50%; backdrop-filter: blur(10px); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(0,243,255,0.4);">
                            <i class="fas fa-map-marked-alt"></i>
                        </button>
                    </div>
                    
                    <button onclick="showUserSearch()" style="pointer-events: auto; background: rgba(0,0,0,0.6); border: 2.5px solid rgba(255,255,255,0.2); color: white; width: 44px; height: 44px; border-radius: 50%; backdrop-filter: blur(10px); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                        <i class="fas fa-search"></i>
                    </button>
                </div>

                <button onclick="showPostComposer()" class="floating-post-btn" style="bottom: 30px;">
                    <i class="fas fa-plus"></i>
                </button>
            `;
            initCommunity();
            break;

        case 'reels-map':
            container.innerHTML = `
                <div id="reels-map-container" style="height: 100vh; width: 100vw; background: #000; position: fixed; inset: 0; z-index: 1000;">
                    <div style="position: absolute; top: 20px; left: 20px; z-index: 2000; display: flex; gap: 10px;">
                        <button onclick="navigate('community')" style="background: rgba(0,0,0,0.7); border: 2px solid var(--secondary-lilac); color: white; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div style="position: absolute; top: 20px; right: 20px; z-index: 2000; background: rgba(0,0,0,0.6); padding: 8px 15px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(5px);">
                        <span style="color: white; font-weight: 800; font-size: 12px;"><i class="fas fa-video" style="color: var(--secondary-lilac);"></i> REELS EN MACAS</span>
                    </div>
                    <div id="reels-leaflet-map" style="width: 100%; height: 100%;"></div>
                </div>
            `;
            initReelsMap();
            break;

        case 'taxi':
        case 'delivery':
        case 'driver-panel':
            const isDriver = (view === 'driver-panel');
            
            // Pantalla de login para conductores
            if (isDriver && (!auth || !auth.currentUser)) {
                container.innerHTML = `
                    <div style="height: 100vh; width: 100vw; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #05050a; color: white; padding: 40px; text-align: center; position: fixed; inset: 0; z-index: 1001;">
                        <button onclick="navigate('home')" style="position: absolute; top: 30px; left: 20px; background: rgba(255,255,255,0.1); border: none; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <i class="fas fa-id-badge" style="font-size: 60px; color: var(--accent-orange); margin-bottom: 20px;"></i>
                        <h2 style="font-weight: 900; margin-bottom: 10px;">ACCESO CONDUCTORES</h2>
                        <div style="display: flex; flex-direction: column; gap: 15px; width: 100%;">
                            <button onclick="navigate('login')" style="background: var(--secondary-lilac); color: white; border: none; padding: 18px; border-radius: 18px; font-weight: 800; font-size: 15px;">USAR EMAIL</button>
                        </div>
                    </div>
                `;
                return;
            }

            const uid = auth && auth.currentUser ? auth.currentUser.uid : '';
            const baseUrl = isDriver ? "https://goopiapp.com/panel-taxista/" : "https://goopiapp.com/taxis-disponibles/";
            const finalIframeUrl = `${baseUrl}?uid=${uid}&v=5.0`;
            
            // RECORTE AVANZADO BLINDADO V5.0
            const mt = isDriver ? "0" : "-460px";
            const mb = "0px"; 
            const height = isDriver ? "100%" : "calc(100% + 460px)";
            container.innerHTML = `
                <div id="map-blindaje-container" style="height: 100vh; width: 100vw; overflow: hidden; background: #000; position: fixed; top: 0; left: 0; z-index: 999!important;">
                    <!-- Botón Volver Naranja (Blindaje V6.0) -->
                    <button onclick="navigate('home')" style="position: absolute; top: 30px; left: 20px; z-index: 999999!important; background: #ff8c00; border: none; color: white; width: 48px; height: 48px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(255,140,0,0.6); pointer-events: auto!important;">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div style="width: 100%; height: 100%; overflow: hidden; position: relative; z-index: 1;">
                        <div style="width: 100%; height: 100%; margin-top: ${mt}; margin-bottom: ${mb}; position: absolute; top: 0; left: 0;">
                            <iframe src="${finalIframeUrl}" style="width: 100%; height: ${height}; border: none; pointer-events: auto;" allow="geolocation"></iframe>
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'news':
            container.innerHTML = `
                <section class="hero">
                    <h1>Noticias</h1>
                    <p>Últimas novedades de Locales</p>
                </section>
                <div id="news-list" style="display: flex; flex-direction: column; gap: 20px;">
                    <div style="text-align: center; padding: 40px; color: var(--text-dim);">Actualizando...</div>
                </div>
            `;
            fetchNews();
            break;

        case 'guide':
            container.innerHTML = `
                <section class="hero">
                    <h1>Explorar</h1>
                    <p>Guía comercial por categorías</p>
                </section>
                <div id="categories-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 30px;"></div>
                <div id="locales-list" style="display: flex; flex-direction: column; gap: 18px;"></div>
            `;
            fetchCategories();
            fetchLocales(extra);
            break;

        case 'login':
            container.innerHTML = `
                <div style="text-align: center; margin-top: 40px;">
                    <img src="${LOGO_URL}" style="height: 120px; margin-bottom: 20px; filter: drop-shadow(0 0 10px var(--secondary-lilac));">
                    <h1 style="font-size: 28px; text-shadow: 0 0 10px var(--secondary-lilac); font-weight: 800;">Hola de nuevo</h1>
                    <p style="color: var(--text-dim);">Ingresa a tu cuenta Gooper</p>
                </div>
                <div style="margin-top: 35px; display: flex; flex-direction: column; gap: 15px; padding: 0 10px;">
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-envelope" style="color: var(--secondary-lilac);"></i>
                        <input type="email" id="login-email" placeholder="Correo electrónico" style="background: none; border: none; color: white; width: 100%; outline: none; font-size: 15px;">
                    </div>
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-lock" style="color: var(--secondary-lilac);"></i>
                        <input type="password" id="login-password" placeholder="Contraseña" style="background: none; border: none; color: white; width: 100%; outline: none; font-size: 15px;">
                        <i class="fas fa-eye" style="color: var(--text-dim); cursor: pointer; padding: 5px;" onclick="const p = document.getElementById('login-password'); if(p.type==='password'){p.type='text'; this.className='fas fa-eye-slash';}else{p.type='password'; this.className='fas fa-eye';}"></i>
                    </div>
                    <button onclick="handleEmailLogin(this)" class="action-card" style="height: auto; width: 100%; padding: 18px; border: none; justify-content: center; align-items: center; margin-top: 10px; font-weight: 700; background: linear-gradient(135deg, var(--secondary-lilac) 20%, #8c309b 100%); color: white; box-shadow: 0 5px 15px rgba(186, 150, 255, 0.4); border-radius: 18px;">
                        ENTRAR AHORA
                    </button>
                    


                    <div style="text-align: center; margin-top: 25px;">
                        <p style="color: var(--text-dim); font-size: 14px;">¿No tienes cuenta? <a href="#" onclick="navigate('register')" style="color: var(--secondary-lilac); font-weight: 800; text-decoration: none;">Crea una aquí</a></p>
                    </div>
                </div>
            `;
            break;

        case 'register':
            container.innerHTML = `
                <div style="text-align: center; margin-top: 30px;">
                    <h1 style="font-size: 28px; text-shadow: 0 0 10px var(--secondary-lilac); font-weight: 800;">Registro</h1>
                    <p style="color: var(--text-dim);">Únete a la red regional Goopi</p>
                </div>
                <div style="margin-top: 30px; display: flex; flex-direction: column; gap: 12px; padding: 0 10px;">
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-user" style="color: var(--secondary-lilac);"></i>
                        <input type="text" id="reg-name" placeholder="Nombre completo" style="background: none; border: none; color: white; width: 100%; outline: none;">
                    </div>
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-envelope" style="color: var(--secondary-lilac);"></i>
                        <input type="email" id="reg-email" placeholder="Email" style="background: none; border: none; color: white; width: 100%; outline: none;">
                    </div>
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-lock" style="color: var(--secondary-lilac);"></i>
                        <input type="password" id="reg-password" placeholder="Define tu contraseña" style="background: none; border: none; color: white; width: 100%; outline: none;">
                        <i class="fas fa-eye" style="color: var(--text-dim); cursor: pointer; padding: 5px;" onclick="const p = document.getElementById('reg-password'); if(p.type==='password'){p.type='text'; this.className='fas fa-eye-slash';}else{p.type='password'; this.className='fas fa-eye';}"></i>
                    </div>
                    <button onclick="handleEmailRegister(this)" class="action-card" style="height: auto; width: 100%; padding: 18px; border: none; justify-content: center; align-items: center; margin-top: 10px; font-weight: 700; background: linear-gradient(135deg, #00f3ff 0%, #00a8b3 100%); color: #00363d; border-radius: 18px;">
                        CREAR MI CUENTA
                    </button>

                    <div style="text-align: center; margin-top: 20px; padding-bottom: 20px;">
                        <p style="color: var(--text-dim); font-size: 14px;">¿Ya eres parte? <a href="#" onclick="navigate('login')" style="color: var(--secondary-lilac); font-weight: 800; text-decoration: none;">Inicia Sesión</a></p>
                    </div>
                </div>
            `;
            break;

        case 'register-driver':
            const isLogged = auth && auth.currentUser;
            container.innerHTML = `
                <div style="text-align: center; margin-top: 30px;">
                    <h1 style="font-size: 28px; text-shadow: 0 0 10px var(--secondary-lilac); font-weight: 800;">Registro de Unidad</h1>
                    <p style="color: var(--text-dim);">Únete a la flota oficial de Goopi</p>
                </div>

                <div style="margin-top: 25px; display: flex; flex-direction: column; gap: 15px; padding: 0 10px;">
                    ${!isLogged ? `
                        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; border: 1px dashed var(--secondary-lilac); margin-bottom: 10px;">
                            <p style="font-size: 13px; color: var(--secondary-lilac); text-align: center;">Tip: Si ya tienes cuenta en GoopiSocial, <a href="#" onclick="navigate('login')" style="color:white; font-weight:700;">Inicia Sesión</a> primero.</p>
                        </div>
                        <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-envelope" style="color: var(--secondary-lilac);"></i>
                            <input type="email" id="driver-email" placeholder="Correo electrónico" style="background: none; border: none; color: white; width: 100%; outline: none;">
                        </div>
                        <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                            <i class="fas fa-lock" style="color: var(--secondary-lilac);"></i>
                            <input type="password" id="driver-password" placeholder="Contraseña para tu cuenta" style="background: none; border: none; color: white; width: 100%; outline: none;">
                            <i class="fas fa-eye" style="color: var(--text-dim); cursor: pointer; padding: 5px;" onclick="const p = document.getElementById('driver-password'); if(p.type==='password'){p.type='text'; this.className='fas fa-eye-slash';}else{p.type='password'; this.className='fas fa-eye';}"></i>
                        </div>
                    ` : `
                        <div style="background: rgba(0,243,255,0.1); padding: 15px; border-radius: 15px; border: 1px solid #00f3ff; margin-bottom: 10px;">
                            <p style="font-size: 13px; color: #00f3ff; text-align: center;"><i class="fas fa-check-circle"></i> Registrando como: <b>${auth.currentUser.email}</b></p>
                        </div>
                    `}

                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-briefcase" style="color: var(--secondary-lilac);"></i>
                        <select id="driver-role" style="background: none; border: none; color: white; width: 100%; outline: none; font-size: 15px;">
                            <option value="taxi" style="background: #1a0b2e;">Servicio de Taxi</option>
                            <option value="delivery" style="background: #1a0b2e;">Servicio de Delivery</option>
                        </select>
                    </div>

                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-users" style="color: var(--secondary-lilac);"></i>
                        <input type="text" id="driver-coop" placeholder="Nombre de Cooperativa o Empresa" style="background: none; border: none; color: white; width: 100%; outline: none;">
                    </div>

                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-hashtag" style="color: var(--secondary-lilac);"></i>
                        <input type="number" id="driver-unit" placeholder="Número de unidad" style="background: none; border: none; color: white; width: 100%; outline: none;">
                    </div>

                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fab fa-whatsapp" style="color: #25D366;"></i>
                        <input type="tel" id="driver-phone" placeholder="Número de WhatsApp (ej: 0912345678)" style="background: none; border: none; color: white; width: 100%; outline: none;">
                    </div>

                    <button onclick="handleDriverRegistration(this)" class="action-card" style="height: auto; width: 100%; padding: 18px; border: none; justify-content: center; align-items: center; margin-top: 10px; font-weight: 700; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #4a3b00; border-radius: 18px; box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);">
                        FINALIZAR REGISTRO
                    </button>

                    <p style="color: var(--text-dim); font-size: 11px; text-align: center; margin-top: 10px;">Al registrarte, aceptas los términos de servicio para conductores de Goopi App.</p>

                    <button onclick="navigate('home')" style="background: none; border: none; color: var(--text-dim); margin-top: 10px; cursor: pointer; font-size: 14px;">Cancelar y volver</button>
                </div>
            `;
            break;

        case 'profile':
            const currentUser = auth ? auth.currentUser : null;
            const profileId = state.targetProfileId || (currentUser ? currentUser.uid : null);

            // Si no hay perfil que mostrar (ni el propio ni uno externo) mostramos opciones de entrada
            if (!profileId) {
                container.innerHTML = `
                    <div style="text-align: center; margin-top: 60px; padding: 0 20px;">
                        <img src="${LOGO_URL}" style="height: 100px; margin-bottom: 30px; filter: drop-shadow(0 0 10px var(--secondary-lilac));">
                        <h1 style="font-size: 26px; font-weight: 800; color: white; margin-bottom: 15px;">¡Hola, Gooper!</h1>
                        <p style="color: var(--text-dim); margin-bottom: 40px; font-size: 15px; line-height: 1.6;">Únete a nuestra comunidad para acceder a tu perfil, ganar puntos y conectar con otros.</p>
                        
                        <div style="display: flex; flex-direction: column; gap: 15px;">
                            <button onclick="navigate('login')" class="action-card" style="width: 100%; padding: 20px; border: none; justify-content: center; font-weight: 800; background: var(--secondary-lilac); color: white; border-radius: 20px; font-size: 16px; box-shadow: 0 5px 15px rgba(186, 150, 255, 0.4);">
                                <i class="fas fa-sign-in-alt" style="margin-right: 10px;"></i> ENTRAR A MI CUENTA
                            </button>
                            


                            <button onclick="navigate('register')" class="action-card" style="width: 100%; padding: 20px; border: 2px solid var(--secondary-lilac); background: rgba(186, 150, 255, 0.1); justify-content: center; font-weight: 800; color: white; border-radius: 20px; font-size: 16px;">
                                <i class="fas fa-user-plus" style="margin-right: 10px;"></i> CREAR CUENTA NUEVA
                            </button>
                        </div>
                        
                        <p style="color: var(--text-dim); font-size: 12px; margin-top: 40px; opacity: 0.6;">Goopi App - Tu conexión regional</p>
                    </div>
                `;
                return;
            }

            // Buscamos datos del usuario en los posts para perfiles públicos
            const profileData = state.communityPosts.find(p => p.userId === profileId) || {
                userName: currentUser && currentUser.uid === profileId ? currentUser.displayName : 'Gooper',
                userPhoto: currentUser && currentUser.uid === profileId ? currentUser.photoURL : ''
            };

            const userPosts = state.communityPosts.filter(p => p.userId === profileId);
            const isMyOwnProfile = currentUser && currentUser.uid === profileId;
            const isFollowingUser = state.userFollowing && state.userFollowing[profileId];

            container.innerHTML = `
                <div style="text-align: center; margin-top: 40px; position: relative;">
                    ${!isMyOwnProfile ? `<button onclick="navigate('community')" style="position: absolute; top: 0; left: 0; background: none; border: none; color: white; font-size: 20px;"><i class="fas fa-arrow-left"></i></button>` : ''}

            <div ${isMyOwnProfile ? `onclick="document.getElementById('profile-upload').click()"` : ''} style="width: 100px; height: 100px; border-radius: 50%; background: var(--secondary-lilac); margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px; color: white; box-shadow: 0 0 20px var(--secondary-lilac); border: 4px solid var(--glass-border); position: relative; ${isMyOwnProfile ? 'cursor: pointer;' : ''} overflow: hidden;">
                ${profileData.userPhoto ? `<img src="${profileData.userPhoto}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="fas fa-user-astronaut"></i>`}
                ${isMyOwnProfile ? `<div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.5); font-size: 10px; padding: 4px 0; font-weight: 700;"><i class="fas fa-camera"></i> EDITAR</div>` : ''}
            </div>
                    ${isMyOwnProfile ? `<input type="file" id="profile-upload" accept="image/*" hidden onchange="updateProfilePhoto(this)">` : ''}
                    
                    <div style="position: absolute; top: 110px; left: 50%; transform: translateX(25px); background: #00f3ff; color: #00363d; padding: 2px 10px; border-radius: 10px; font-size: 10px; font-weight: 900; z-index: 10;">VERIFICADO</div>
                    
                    <h1 style="font-size: 26px; font-weight: 800; margin-top: 15px; color: white;">@${profileData.userName.replace(/\s+/g, '').toLowerCase()}</h1>
                    <p style="color: var(--text-dim); padding-bottom: 20px;">${isMyOwnProfile ? (currentUser.email) : 'Miembro de la Comunidad Goopi'}</p>

                    ${!isMyOwnProfile ? `
                        <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 20px;">
                            <button onclick="toggleFollow('${profileId}', this).then(() => renderView('profile', document.querySelector('.main-content')))" 
                                style="background: ${isFollowingUser ? 'rgba(255,255,255,0.1)' : 'var(--secondary-lilac)'}; border: 1px solid var(--secondary-lilac); color: white; padding: 12px 20px; border-radius: 15px; font-weight: 800; cursor: pointer; transition: 0.3s; flex: 1; max-width: 150px;">
                                ${isFollowingUser ? 'SIGUIENDO' : 'SEGUIR'}
                            </button>
                            <button onclick="viewChat('${profileId}', '${profileData.userName.replace(/\s+/g, '').toLowerCase()}', '${profileData.userPhoto || ''}')" 
                                style="background: rgba(255,255,255,0.1); border: 1px solid var(--glass-border); color: white; padding: 12px 20px; border-radius: 15px; font-weight: 800; cursor: pointer; flex: 1; max-width: 150px;">
                                MENSAJE
                            </button>
                        </div>
                        <p style="color: var(--text-dim); font-size: 10px; margin-top: 10px;">Versión 48.5</p>
                    ` : ''
                }
                </div>

                <div style="margin-top: 20px; padding-bottom: 150px;">
                    <div style="display: flex; justify-content: space-around; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 20px; margin-bottom: 30px; border: 1px solid var(--glass-border);">
                        <div style="text-align: center;"><div style="font-weight: 900; color: var(--secondary-lilac); font-size: 20px;">${userPosts.length}</div><div style="font-size: 10px; color: var(--text-dim);">POSTS</div></div>
                        <div style="text-align: center;"><div style="font-weight: 900; color: #ff2d55; font-size: 20px;">${isMyOwnProfile ? Object.keys(state.userFollowing || {}).length : (isFollowingUser ? 1 : 0)}</div><div style="font-size: 10px; color: var(--text-dim);">${isMyOwnProfile ? 'SIGUIENDO' : 'SEGUIDORES'}</div></div>
                        <div style="text-align: center;"><div style="font-weight: 900; color: #00f3ff; font-size: 20px;">${userPosts.reduce((acc, p) => acc + (p.likes ? Object.keys(p.likes).length : 0), 0)}</div><div style="font-size: 10px; color: var(--text-dim);">LIKES</div></div>
                    </div>

                    <div class="section-header">
                        <h2>Explorar Reels</h2>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-bottom: 30px;">
                        ${userPosts.length > 0 ? userPosts.map(p => `
                            <div style="aspect-ratio: 9/16; background: #222; border-radius: 8px; overflow: hidden; border: 1px solid var(--glass-border);" onclick="focusOnPost('${p.id}')">
                                ${p.mediaUrl ? (p.mediaType === 'video' ? `<video src="${p.mediaUrl}#t=0.5" preload="metadata" playsinline muted onloadedmetadata="this.currentTime=0.5" style="width: 100%; height: 100%; object-fit: contain; background: #000;"></video>` : `<img src="${p.mediaUrl}" style="width: 100%; height: 100%; object-fit: contain; background: #000;">`) : `<div style="padding: 5px; font-size: 8px; color: var(--text-dim); overflow: hidden;">${p.text}</div>`}
                            </div>
                        `).join('') : '<div style="grid-column: span 3; color: var(--text-dim); font-size: 12px; text-align: center; padding: 20px;">Este usuario aún no tiene Reels.</div>'}
                    </div>

                    ${isMyOwnProfile ? `<button onclick="handleLogout()" class="action-card" style="width: 100%; background: rgba(255, 59, 48, 0.1); border: 1px solid rgba(255, 59, 48, 0.3); color: #ff3b30; flex-direction: row; justify-content: center; padding: 15px; margin-top: 20px; font-weight: 800;">CERRAR SESIÓN</button>` : ''}
                </div>
            `;
            break;

        case 'messages':
            if (!auth.currentUser) return navigate('login');
            const chats = Object.keys(state.userChats).map(id => ({
                id,
                ...state.userChats[id]
            })).sort((a, b) => b.lastTimestamp - a.lastTimestamp);

            container.innerHTML = `
                <div class="messages-inbox" style="padding-bottom: 100px;">
                    <section class="hero">
                        <h1>Mensajes</h1>
                        <p>Conversaciones con la comunidad</p>
                    </section>
                    
                    <div class="chats-list">
                        ${chats.length > 0 ? chats.map(chat => `
                            <div class="chat-list-item" onclick="viewChat('${chat.id}', '${chat.otherName}', '${chat.otherPhoto}')">
                                <div class="chat-avatar">
                                    ${chat.otherPhoto ? `<img src="${chat.otherPhoto}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="fas fa-user"></i>`}
                                </div>
                                <div class="chat-info">
                                    <h4>@${chat.otherName}</h4>
                                    <p>${chat.lastMessage || 'Empieza a chatear...'}</p>
                                </div>
                                <div class="chat-meta">
                                    <div>${chat.lastTimestamp ? new Date(chat.lastTimestamp).toLocaleDateString([], {hour: '2-digit', minute:'2-digit'}) : ''}</div>
                                    ${chat.unread ? `<span class="unread-badge">${chat.unread}</span>` : ''}
                                </div>
                            </div>
                        `).join('') : `
                            <div style="text-align:center; padding:50px 20px; color:var(--text-dim);">
                                <i class="far fa-comments" style="font-size:50px; margin-bottom:20px; opacity:0.3;"></i>
                                <p>No tienes mensajes todavía.<br>Sigue a alguien y envíale un mensaje.</p>
                            </div>
                        `}
                    </div>
                </div>
            `;
            break;

        case 'chat':
            if (!auth.currentUser || !extra) return navigate('messages');
            const { otherId, otherName, otherPhoto } = extra;
            
            // Limpiar no leídos
            if (db && auth.currentUser) {
                db.ref(`userChats/${auth.currentUser.uid}/${otherId}`).update({ unread: 0 });
            }
            
            container.innerHTML = `
                <div class="chat-container">
                    <div class="chat-header">
                        <button onclick="navigate('messages')" style="background:none; border:none; color:white; font-size:20px;"><i class="fas fa-arrow-left"></i></button>
                        <div class="chat-avatar" style="width:40px; height:40px;">
                            ${otherPhoto ? `<img src="${otherPhoto}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="fas fa-user"></i>`}
                        </div>
                        <div style="flex:1">
                            <h4 style="margin:0; font-size:16px;">@${otherName}</h4>
                            <span style="font-size:10px; color:#00f3ff">EN LÍNEA</span>
                        </div>
                    </div>
                    
                    <div id="chat-messages" class="chat-messages">
                        <div style="text-align:center; padding:20px; color:var(--text-dim); font-size:12px;">Cargando mensajes...</div>
                    </div>
                    
                    <div class="chat-input-container">
                        <input type="text" id="chat-input" class="chat-input" placeholder="Escribe un mensaje..." onkeypress="if(event.key==='Enter') sendMessage('${otherId}', '${otherName}', '${otherPhoto}')">
                        <button onclick="sendMessage('${otherId}', '${otherName}', '${otherPhoto}')" class="chat-send-btn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            `;
            syncChatMessages(otherId);
            break;

        default:
            break;
    }
}

async function initHomePage() {
    fetchHomeCategories();
    fetchHomeGuide();
}

async function fetchHomeCategories() {
    try {
        const response = await fetch(`${wpConfig.url}/wp/v2/categories?hide_empty=true&per_page=6`);
        const categories = await response.json();
        const grid = document.getElementById('home-categories-grid');
        if (categories && grid) {
            grid.innerHTML = categories
                .filter(cat => cat.name.toLowerCase() !== 'noticias')
                .map(cat => `
                <button onclick="navigate('guide', ${cat.id})" 
                    style="background: var(--card-bg); border: 1px solid var(--glass-border); padding: 15px; border-radius: 18px; color: white; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer;">
                    <i class="fas ${getCategoryIcon(cat.name)}" style="color: var(--secondary-lilac); font-size: 16px;"></i>
                    <span style="font-size: 10px; font-weight: 700; text-transform: uppercase;">${cat.name}</span>
                </button>
            `).join('');
        }
    } catch (e) { console.error("Error categories:", e); }
}

async function fetchHomeGuide() {
    try {
        const response = await fetch(`${wpConfig.url}/wp/v2/posts?_embed&per_page=10`);
        const posts = await response.json();
        state.posts = [...state.posts, ...posts];
        const list = document.getElementById('home-guide-list');
        if (posts && list) {
            list.innerHTML = posts.map(post => `
                <div class="business-card" style="min-width: 170px;" onclick="viewDetails(${post.id})">
                    <img src="${post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/300'}" alt="${post.title.rendered}">
                    <h3 style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${post.title.rendered}</h3>
                    <p style="font-size: 10px; color: var(--text-dim);">Entrada Real • 5.0 ★</p>
                </div>
            `).join('');
        }
    } catch (e) { console.error("Error posts:", e); }
}

async function fetchCategories() {
    try {
        const response = await fetch(`${wpConfig.url}/wp/v2/categories?hide_empty=true&per_page=12`);
        const categories = await response.json();
        const grid = document.getElementById('categories-grid');
        if (grid) {
            grid.innerHTML = categories
                .filter(cat => cat.name.toLowerCase() !== 'noticias')
                .map(cat => `
                <button onclick="fetchLocales(${cat.id})" style="background: var(--glass-bg); border: 1px solid var(--glass-border); padding: 15px; border-radius: 20px; color: white; cursor: pointer; display: flex; align-items: center; gap: 10px;">
                    <i class="fas ${getCategoryIcon(cat.name)}" style="color: var(--secondary-lilac); font-size: 14px;"></i>
                    <span style="font-size: 11px; font-weight: 700;">${cat.name}</span>
                </button>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

async function fetchLocales(categoryId = null) {
    try {
        let url = `${wpConfig.url}/wp/v2/posts?_embed&per_page=30`;
        if (categoryId) url += `&categories=${categoryId}`;
        const response = await fetch(url);
        const locales = await response.json();
        state.posts = [...state.posts, ...locales];
        const list = document.getElementById('locales-list');
        if (list) {
            list.innerHTML = locales.map(local => `
                <div class="business-card" style="display: flex; gap: 15px; align-items: center; padding: 15px;" onclick="viewDetails(${local.id})">
                    <img src="${local._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/100'}" style="width: 70px; height: 70px; border-radius: 12px;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0; font-size: 15px; font-weight: 800;">${local.title.rendered}</h3>
                            <p style="margin: 5px 0 0; font-size: 10px; color: var(--text-dim);">LOCAL CERTIFICADO</p>
                        </div>
                    </div>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

async function fetchNews() {
    try {
        const response = await fetch(`${wpConfig.url}/wp/v2/local?categories=121895&_embed`);
        const locales = await response.json();
        // Sincronizar con el estado global para que viewDetails pueda encontrarlas
        state.posts = [...state.posts, ...locales];
        const list = document.getElementById('news-list');
        if (list) {
            list.innerHTML = locales.map(item => `
                <div class="business-card" style="display: block; padding: 0; overflow: hidden; border-radius: 24px;" onclick="viewDetails(${item.id})">
                    <img src="${item._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/400'}" style="width: 100%; height: 180px; object-fit: cover;">
                    <div style="padding: 18px;">
                        <h3 style="color: var(--secondary-lilac);">${item.title.rendered}</h3>
                        <div style="font-size: 13px; color: var(--text-dim); margin-top: 10px;">
                            ${item.excerpt.rendered.replace(/<\/?[^>]+(>|$)/g, "").substring(0, 100)}...
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

async function checkDynamicPopup() {
    try {
        const response = await fetch(`${wpConfig.url}/wp/v2/pages?slug=publicidad-popup&_embed&t=${new Date().getTime()}`);
        const pages = await response.json();

        if (pages && pages.length > 0) {
            const page = pages[0];
            showInfoPopup(page);
        }
    } catch (e) {
        console.error("Popup Error:", e);
    }
}

function showInfoPopup(page) {
    let popupBody = document.getElementById('dynamic-popup');
    if (!popupBody) {
        popupBody = document.createElement('div');
        popupBody.id = 'dynamic-popup';
        popupBody.className = 'popup-overlay';
        document.body.appendChild(popupBody);
    }

    // Intenta obtener la imagen destacada o la primera imagen del contenido
    let imgPath = page._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';

    // Si no hay imagen destacada, buscamos una etiqueta <img> en el contenido
    if (!imgPath) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = page.content.rendered;
        const firstImg = tempDiv.querySelector('img');
        if (firstImg) {
            imgPath = firstImg.src;
        }
    }

    popupBody.innerHTML = `
        <div class="popup-content">
            <button class="popup-close" onclick="closePopup()">
                <i class="fas fa-times"></i>
            </button>
            ${imgPath ? `<img src="${imgPath}" class="popup-img" alt="Publicidad">` : '<div style="color:white;text-align:center;padding:20px;">Falta imagen destacada en WordPress</div>'}
        </div>
    `;

    setTimeout(() => {
        popupBody.classList.add('active');
        if (!window._isHandlingBack) window.history.pushState({ overlay: 'popup' }, "");
        localStorage.setItem('last_popup_id', page.id);
        localStorage.setItem('last_popup_time', new Date().getTime());
    }, 1500);
}

function closePopup() {
    const popup = document.getElementById('dynamic-popup');
    if (popup && popup.classList.contains('active')) {
        popup.classList.remove('active');
        setTimeout(() => popup.remove(), 400);
        if (!window._isHandlingBack) window.history.back();
    }
}

function viewDetails(postId) {
    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    // Función auxiliar segura contra recursión para buscar números
    const findNumbersAnywhere = (obj) => {
        const found = [];
        const seen = new Set();
        const regex = /(?:\+?593|0)(?:[\s.-]?\d){8,9}/g;

        const search = (item) => {
            if (!item || seen.has(item)) return;
            if (typeof item === 'object') seen.add(item);

            if (typeof item === 'string') {
                const matches = item.match(regex);
                if (matches) matches.forEach(m => found.push(m.replace(/[\s.-]/g, '')));
            } else if (typeof item === 'object' && item !== null) {
                try {
                    Object.values(item).forEach(search);
                } catch (e) { /* Evitar errores en objetos proxy o restringidos */ }
            }
        };
        search(obj);
        return [...new Set(found)];
    };

    const allFoundNumbers = findNumbersAnywhere(post);

    // Búsqueda flexible de campos
    let telefono = post.meta?.telefono_contacto || post.acf?.telefono_contacto || post.telefono || post.acf?.telefono || '';
    let whatsapp = post.meta?.whatsapp_contacto || post.acf?.whatsapp_contacto || post.whatsapp || post.acf?.whatsapp || '';
    let direccion = post.meta?.direccion || post.acf?.direccion || post.direccion || post.acf?.ubicacion || '';

    // Si fallan los campos estructurados, usamos los detectados vinculados al contenido
    if (!telefono && allFoundNumbers.length > 0) telefono = allFoundNumbers[0];
    if (!whatsapp && allFoundNumbers.length > 0) {
        const activeCell = allFoundNumbers.find(n => n.startsWith('09') || n.startsWith('5939'));
        whatsapp = activeCell || allFoundNumbers[0];
    }

    // Guardar una versión visual para mostrar en texto
    const displayPhone = telefono || (allFoundNumbers.length > 0 ? allFoundNumbers[0] : '');

    // Limpiar para asegurar que sean solo dígitos para los enlaces
    const cleanNum = (num) => num ? num.replace(/[^\d+]/g, '') : '';
    telefono = cleanNum(telefono);
    whatsapp = cleanNum(whatsapp);

    const overlay = document.getElementById('details-overlay');
    const content = document.getElementById('details-content');

    let buttonsHtml = '';
    let infoHtml = '';

    // Generar bloque de información estructurada si hay datos
    if (displayPhone || direccion) {
        infoHtml = `
            <div style="background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); padding: 15px; border-radius: 20px; margin-bottom: 25px; display: flex; flex-direction: column; gap: 10px;">
                ${displayPhone ? `<div style="display: flex; align-items: center; gap: 12px; color: white; font-size: 14px;"><i class="fas fa-phone-alt" style="color: var(--secondary-lilac); width: 20px;"></i> <b>Tel:</b> ${displayPhone}</div>` : ''}
                ${direccion ? `<div style="display: flex; align-items: center; gap: 12px; color: white; font-size: 14px;"><i class="fas fa-map-marker-alt" style="color: var(--secondary-cyan); width: 20px;"></i> <b>Dirección:</b> ${direccion}</div>` : ''}
            </div>
        `;
    }

    if (telefono) {
        buttonsHtml += `
            <a href="tel:${telefono}" style="background: var(--glass-bg); border: 1px solid var(--glass-border); padding: 18px; border-radius: 20px; text-decoration: none; color: white; text-align: center; font-weight: 700;">
                <i class="fas fa-phone-alt"></i> Llamar
            </a>
        `;
    }

    if (whatsapp) {
        const waMsg = encodeURIComponent(`Hola, vi tu local "${post.title.rendered}" en Goopi App. Me gustaría más información.`);
        buttonsHtml += `
            <a href="https://wa.me/${whatsapp}?text=${waMsg}" style="background: #25D366; padding: 18px; border-radius: 20px; text-decoration: none; color: white; text-align: center; font-weight: 700;">
                <i class="fab fa-whatsapp"></i> WhatsApp
            </a>
        `;
    }

    if (!whatsapp && !telefono) {
        buttonsHtml = `
            <div style="grid-column: span 2; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; text-align: center; color: var(--text-dim); font-size: 13px;">
                <i class="fas fa-info-circle"></i> Contacto no disponible para este plan básico.
            </div>
        `;
    }

    content.innerHTML = `
        <img src="${post._embedded?.['wp:featuredmedia']?.[0]?.source_url || ''}" style="width: 100%; border-radius: 24px; margin-bottom: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <h1 style="font-size: 28px; margin-bottom: 10px; color: var(--secondary-lilac); font-weight: 900;">${post.title.rendered}</h1>
        
        ${infoHtml}

        <div style="color: var(--text-dim); margin-bottom: 25px; line-height: 1.8; font-size: 15px;">
            ${post.content.rendered}
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 30px; padding-bottom: 250px;">
            ${buttonsHtml}
        </div>
    `;

    overlay.classList.add('active');
    // Notificar al historial del navegador
    if (!window._isHandlingBack) window.history.pushState({ overlay: 'details' }, "");
}

function closeDetails() {
    const overlay = document.getElementById('details-overlay');
    if (overlay && overlay.classList.contains('active')) {
        overlay.classList.remove('active');
        // Solo retrocedemos en el historial si el overlay se cerró manualmente
        if (!window._isHandlingPopState) window.history.back();
    }
}

// La inicialización se maneja mediante BOOTSTRAP al final del archivo
// para evitar duplicidad de eventos.

// --- COMMUNITY & SOCIAL LOGIC ---
function initCommunity() {
    if (window._isCommunityListenerSet) {
        if (state.currentView === 'community') renderCommunityPosts();
        return;
    }
    window._isCommunityListenerSet = true;
    
    if (!db) {
        console.log("Waiting for Firebase DB...");
        setTimeout(initCommunity, 1000);
        return;
    }

    // Safety: ensure posts path exists or handled
    const postsRef = db.ref('posts');
    postsRef.on('value', (snapshot) => {
        const rawPosts = snapshot.val();
        const oldPostsLength = state.communityPosts.length;
        
        state.communityPosts = Object.keys(rawPosts || {}).map(id => ({
            id,
            ...rawPosts[id]
        })).reverse();

        if (state.currentView === 'community') {
            const feed = document.getElementById('community-feed');
            if (feed && feed.children.length > 0 && oldPostsLength > 0 && oldPostsLength === state.communityPosts.length) {
                // Actualización quirúrgica de likes/comentarios para no resetear scroll ni videos
                state.communityPosts.forEach(post => {
                    const postEl = document.getElementById(`post-${post.id}`);
                    if (postEl) {
                        const likesCount = post.likes ? Object.keys(post.likes).length : 0;
                        const commCount = post.comments ? Object.keys(post.comments).length : 0;
                        const user = auth ? auth.currentUser : null;
                        const liked = post.likes && user && post.likes[user.uid];

                        const heartIcon = postEl.querySelector('.fa-heart');
                        if (heartIcon) heartIcon.className = `fas fa-heart ${liked ? 'liked' : ''}`;

                        const likesSpan = postEl.querySelector('.action-item i.fa-heart + span');
                        const commSpan = postEl.querySelector('.action-item i.fa-comment-dots + span');
                        if (likesSpan) likesSpan.innerText = likesCount;
                        if (commSpan) commSpan.innerText = commCount;
                    }
                });
            } else {
                renderCommunityPosts();
            }
        } else if (state.currentView === 'profile') {
            const mainContent = document.querySelector('.main-content');
            renderView('profile', mainContent);
        }
    }, (error) => {
        console.error("Firebase Rule Restriction or Connection Error:", error);
        if (state.currentView === 'community') {
            const feed = document.getElementById('community-feed');
            if (feed) feed.innerHTML = `
                <div style="padding:40px; text-align:center; color:white;">
                    <i class="fas fa-lock" style="font-size:30px; color:var(--secondary-lilac);"></i>
                    <p style="margin-top:15px; font-weight:600;">Acceso Restringido</p>
                    <p style="font-size:12px; opacity:0.7; margin-top:10px;">Asegúrate de haber iniciado sesión correctamente.</p>
                    <button onclick="navigate('community')" style="background:var(--secondary-lilac); border:none; padding:10px 20px; border-radius:10px; color:white; margin-top:15px; font-weight:700;">REINTENTAR</button>
                </div>`;
        }
    });

    // Timeout check
    setTimeout(() => {
        if (state.currentView === 'community' && document.getElementById('community-feed')?.innerText.includes('SINCRONIZANDO')) {
            const feed = document.getElementById('community-feed');
            if (feed) feed.innerHTML = `
                <div style="padding:40px; text-align:center; color:white;">
                    <i class="fas fa-wifi-slash" style="font-size:30px; opacity:0.5;"></i>
                    <p style="margin-top:15px;">Parece que la conexión es lenta...</p>
                    <button onclick="navigate('community')" style="background:var(--secondary-lilac); border:none; padding:10px 20px; border-radius:10px; color:white; margin-top:15px;">Forzar carga</button>
                </div>`;
        }
    }, 8000);
}

function renderCommunityPosts() {
    const feed = document.getElementById('community-feed');
    if (!feed) return;

    if (state.communityPosts.length === 0) {
        feed.innerHTML = `
            <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; color: white; text-align: center; padding: 20px;">
                <i class="fas fa-video-slash" style="font-size: 50px; margin-bottom: 20px; opacity: 0.5;"></i>
                <h2>Aún no hay publicaciones</h2>
                <p style="color: #888;">¡Sé el primero en compartir un momento regional!</p>
            </div>
        `;
        return;
    }
    let outputHTML = '';
    state.communityPosts.forEach((post, index) => {
        const user = auth ? auth.currentUser : null;
        const liked = post.likes && user && post.likes[user.uid];
        const likesCount = post.likes ? Object.keys(post.likes).length : 0;

        outputHTML += `
            <div id="post-${post.id}" class="tiktok-post" data-user-id="${post.userId}">
                    ${post.mediaUrl ? (
                post.mediaType === 'video'
                    ? `<video src="${post.mediaUrl}#t=0.5" preload="metadata" onloadedmetadata="this.currentTime=0.5" class="tiktok-media" loop playsinline ${state.isMuted ? 'muted' : ''} onclick="toggleVideo(this)"></video>`
                    : `<img src="${post.mediaUrl}" class="tiktok-media">`
            ) : `<div class="tiktok-media" style="background: linear-gradient(45deg, #1a1a2e, #16213e); display: flex; align-items: center; justify-content: center; font-size: 24px; padding: 40px; text-align: center;">${post.text}</div>`
            }
                
                <div class="tiktok-actions">
                    ${(user && post.userId === user.uid) ? `
                    <div class="action-item" onclick="event.stopPropagation(); deletePost('${post.id}', '${post.mediaUrl}')" style="opacity: 1;">
                        <i class="fas fa-trash-alt" style="color: white; font-size: 20px;"></i>
                    </div>` : ''}

                    <div class="action-item" onclick="event.stopPropagation(); toggleMute()">
                        <i class="fas ${state.isMuted ? 'fa-volume-mute' : 'fa-volume-up'}"></i>
                    </div>
                    <div class="action-item">
                        <i class="fas fa-heart ${liked ? 'liked' : ''}" onclick="event.stopPropagation(); handleLike('${post.id}')"></i>
                        <span onclick="event.stopPropagation(); showLikes('${post.id}')" style="min-width: 20px; text-align: center;">${likesCount}</span>
                    </div>
                    <div class="action-item" onclick="event.stopPropagation(); showComments('${post.id}')">
                        <i class="fas fa-comment-dots"></i>
                        <span>${post.comments ? Object.keys(post.comments).length : 0}</span>
                    </div>
                    <div class="action-item" onclick="event.stopPropagation(); sharePost('${post.id}')">
                        <i class="fas fa-share"></i>
                    </div>
                </div>

                <div class="tiktok-overlay">
                    <div class="tiktok-info" onclick="event.stopPropagation()">
                        <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 6px; margin-bottom: 12px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                <div onclick="event.stopPropagation(); viewUserProfile('${post.userId}')" style="width: 40px; height: 40px; border-radius: 50%; background: var(--secondary-lilac); border: 2px solid white; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer;">
                                    ${(user && post.userId === user.uid && user.photoURL)
                ? `<img src="${user.photoURL}" style="width: 100%; height: 100%; object-fit: cover;">`
                : (post.userPhoto ? `<img src="${post.userPhoto}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="fas fa-user-astronaut" style="color: white; font-size: 18px;"></i>`)}
                                </div>
                                ${(user && user.uid !== post.userId) ? `<button onclick="event.stopPropagation(); toggleFollow('${post.userId}', this)" class="follow-btn ${state.userFollowing && state.userFollowing[post.userId] ? 'following' : ''}" style="background: ${state.userFollowing && state.userFollowing[post.userId] ? 'rgba(255,255,255,0.1)' : 'var(--secondary-lilac)'}; border: 1px solid var(--secondary-lilac); color: white; padding: 6px 16px; border-radius: 8px; font-size: 11px; font-weight: 800; cursor: pointer; transition: 0.3s; text-transform: uppercase; letter-spacing: 0.5px;">${state.userFollowing && state.userFollowing[post.userId] ? 'Siguiendo' : 'Seguir'}</button>` : ''}
                            </div>
                            <div onclick="event.stopPropagation(); viewUserProfile('${post.userId}')" class="user-tag" style="margin-bottom: 0; font-size: 18px; color: white; text-shadow: 0 2px 10px rgba(0,0,0,1); cursor: pointer;">@${post.userName.toString().replace(/\s+/g, '').toLowerCase()}</div>
                        </div>
                        <div class="post-desc">${post.text || ''}</div>
                    </div>
                </div>
            </div >
        `;
        
        // --- INYECTOR DE ANUNCIOS: Cada 4 posts orgánicos ---
        if ((index + 1) % 4 === 0 && state.socialAds && state.socialAds.length > 0) {
            const adIndex = Math.floor(index / 4) % state.socialAds.length;
            const ad = state.socialAds[adIndex];
            
            outputHTML += `
            <div class="tiktok-post ad-post" style="background: #000; position: relative;">
                ${ad.type === 'video' 
                    ? `<video src="${ad.url}" class="tiktok-media" loop playsinline autoplay ${state.isMuted ? 'muted' : ''} onclick="toggleVideo(this)"></video>` 
                    : (ad.type === 'iframe' 
                       ? `<iframe src="${ad.url}" frameborder="0" allowfullscreen allow="autoplay; fullscreen; picture-in-picture" style="pointer-events:none; width: 100vw; height: 100vh; border: none; overflow: hidden; transform: scale(1.02);"></iframe>` 
                       : `<img src="${ad.url}" class="tiktok-media" style="object-fit: contain;">`
                      )
                }
                
                <div style="position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.8); color: #00f3ff; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 900; border: 1px solid #00f3ff; z-index: 100; box-shadow: 0 0 15px rgba(0,243,255,0.4);">⭐ PATROCINADO</div>
                
                <!-- Action Buttons Falsos para dar el feel -->
                <div class="tiktok-actions">
                    <div class="action-item" onclick="event.stopPropagation(); toggleMute()">
                        <i class="fas ${state.isMuted ? 'fa-volume-mute' : 'fa-volume-up'}"></i>
                    </div>
                    <div class="action-item">
                        <i class="fas fa-heart"></i>
                        <span style="min-width: 20px; text-align: center;">9K</span>
                    </div>
                </div>

                <div class="tiktok-overlay" style="pointer-events: none;">
                    <div class="tiktok-info">
                        <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 6px; margin-bottom: 12px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));">
                             <div class="user-tag" style="margin-bottom: 0; font-size: 18px; color: #00f3ff; text-shadow: 0 2px 10px rgba(0,0,0,1);">🎁 Recomendación Goopi</div>
                        </div>
                        <div class="post-desc" style="color: white; font-weight: 600;">Desliza hacia arriba para seguir viendo más contenido de tu ciudad.</div>
                    </div>
                </div>
            </div>`;
        }
    });

    feed.innerHTML = outputHTML;

    // Auto-play first video
    const videos = feed.querySelectorAll('video');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.play().catch(e => console.log("Auto-play blocked"));
            } else {
                entry.target.pause();
            }
        });
    }, { threshold: 0.8 });

    videos.forEach(v => observer.observe(v));
}

function toggleVideo(video) {
    if (video.paused) video.play();
    else video.pause();
}

function toggleMute() {
    state.isMuted = !state.isMuted;
    const videos = document.querySelectorAll('video.tiktok-media');
    videos.forEach(v => v.muted = state.isMuted);

    // Update icons in all action items
    const muteIcons = document.querySelectorAll('.tiktok-actions .fa-volume-up, .tiktok-actions .fa-volume-mute');
    muteIcons.forEach(icon => {
    icon.className = `fas ${state.isMuted ? 'fa-volume-mute' : 'fa-volume-up'} `;
    });
}

async function sharePost(postId) {
    const post = state.communityPosts.find(p => p.id === postId);
    if (!post) return;

    const shareUrl = window.location.origin + window.location.pathname + '?post=' + postId;
    const shareTitle = `¡Mira el reel de @${post.userName.toString().replace(/\s+/g, '').toLowerCase()} en Goopi!`;
    const shareText = post.text || 'Mira este momento increíble en Goopi App.';

    // Crear el Menú de Compartir Personalizado (Hermoso & Funcional)
    const existing = document.querySelector('.share-sheet');
    if (existing) existing.remove();

    const sheet = document.createElement('div');
    sheet.className = 'share-sheet';
    sheet.innerHTML = `
        <div class="share-sheet-backdrop" onclick="closeShareSheet()"></div>
        <div class="share-sheet-content">
            <div class="share-sheet-handle"></div>
            <h3>Compartir Reel</h3>
            <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 25px;">Elige cómo quieres compartir este momento</p>
            
            <div class="share-options-grid">
                <div class="share-option" onclick="shareToWhatsApp('${shareUrl}', '${shareText}')">
                    <div class="share-icon wa"><i class="fab fa-whatsapp"></i></div>
                    <span>WhatsApp</span>
                </div>
                <div class="share-option" onclick="shareToFacebook('${shareUrl}')">
                    <div class="share-icon fb"><i class="fab fa-facebook-f"></i></div>
                    <span>Facebook</span>
                </div>
                <div class="share-option" onclick="copyShareLink('${shareUrl}')">
                    <div class="share-icon copy"><i class="fas fa-link"></i></div>
                    <span>Copiar Link</span>
                </div>
                <div class="share-option" onclick="shareMore('${shareUrl}', '${shareTitle}', '${shareText}')">
                    <div class="share-icon more"><i class="fas fa-ellipsis-h"></i></div>
                    <span>Más</span>
                </div>
            </div>
            
            <button class="share-cancel-btn" onclick="closeShareSheet()">CANCELAR</button>
        </div>
    `;

    document.body.appendChild(sheet);
    setTimeout(() => sheet.classList.add('active'), 10);
    
    // Registrar en el historial para botón físico de atrás
    if (!window._isHandlingBack) window.history.pushState({ overlay: 'share' }, "");
}

function closeShareSheet() {
    const sheet = document.querySelector('.share-sheet');
    if (sheet) {
        sheet.classList.remove('active');
        setTimeout(() => sheet.remove(), 400);
        if (!window._isHandlingPopState) window.history.back();
    }
}

function shareToWhatsApp(url, text) {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
    window.open(waUrl, '_system');
    closeShareSheet();
}

function shareToFacebook(url) {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbUrl, '_system');
    closeShareSheet();
}

function copyShareLink(url) {
    copyToClipboard(url);
    closeShareSheet();
}

async function shareMore(url, title, text) {
    if (navigator.share) {
        try {
            await navigator.share({ title, text, url });
        } catch (e) {
            console.log("Web Share failed", e);
        }
    } else {
        copyShareLink(url);
    }
    closeShareSheet();
}

function copyToClipboard(text) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert("¡Enlace del Reel copiado al portapapeles!");
}

function showComments(postId) {
    const post = state.communityPosts.find(p => p.id === postId);
    if (!post) return;

    let existingSheet = document.querySelector('.comment-sheet');
    if (existingSheet) existingSheet.remove();

    const sheet = document.createElement('div');
    sheet.className = 'comment-sheet';

    const comments = post.comments ? Object.values(post.comments) : [];

    sheet.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h3 style="color:white; margin:0;">Comentarios (${comments.length})</h3>
            <button onclick="window.history.back()" style="background:none; border:none; color:white; font-size:20px;"><i class="fas fa-times"></i></button>
        </div>
        <div class="comment-list">
            ${comments.length > 0 ? comments.map(c => `
                <div class="comment-item">
                    <div class="comment-avatar" style="overflow: hidden;">
                        ${c.userPhoto ? `<img src="${c.userPhoto}" style="width: 100%; height: 100%; object-fit: cover;">` : (c.userName?.[0] || 'G')}
                    </div>
                    <div class="comment-content">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <b style="margin: 0;">${c.userName || 'Gooper'}</b>
                            <span style="font-size: 8px; color: var(--text-dim);">${new Date(c.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div style="font-size: 14px; line-height: 1.4;">${c.text}</div>
                        <button onclick="replyToComment('${c.userName}')" style="background: none; border: none; color: var(--secondary-lilac); font-size: 10px; font-weight: 800; padding: 5px 0; cursor: pointer; text-transform: uppercase;">Responder</button>
                    </div>
                </div>
            `).join('') : '<div style="text-align:center; color:rgba(255,255,255,0.3); padding:40px;">No hay comentarios aún. ¡Sé el primero!</div>'}
        </div>
        <div class="comment-input-area">
            <input type="text" id="new-comment-text" placeholder="Escribe un comentario...">
            <button onclick="sendComment('${postId}')" style="background:var(--secondary-lilac); border:none; color:white; width:45px; height:45px; border-radius:50%;"><i class="fas fa-paper-plane"></i></button>
        </div>
    `;

    document.body.appendChild(sheet);
    setTimeout(() => sheet.classList.add('active'), 10);
    if (!window._isHandlingBack) window.history.pushState({ overlay: 'comments' }, "");
}

function replyToComment(userName) {
    const input = document.getElementById('new-comment-text');
    if (input) {
        const tag = `@${userName.toString().replace(/\s+/g, '').toLowerCase()} `;
        input.value = tag;
        input.focus();
    }
}

async function sendComment(postId) {
    if (!auth.currentUser) return navigate('login');

    const input = document.getElementById('new-comment-text');
    const text = input.value.trim();
    if (!text) return;

    const btn = event.currentTarget;
    btn.disabled = true;

    try {
        const commentRef = db.ref(`posts/${postId}/comments`).push();
        await commentRef.set({
            userId: auth.currentUser.uid,
            userName: auth.currentUser.displayName || 'Gooper',
            userPhoto: auth.currentUser.photoURL || '',
            text: text,
            timestamp: Date.now()
        });

        input.value = '';
        showComments(postId); // Refresh
    } catch (e) {
        alert("Error al comentar: " + e.message);
    } finally {
        btn.disabled = false;
    }
}

async function handleLike(postId) {
    if (!auth.currentUser) return navigate('login');
    const post = state.communityPosts.find(p => p.id === postId);
    const userId = auth.currentUser.uid;
    const userName = auth.currentUser.displayName || 'Gooper';
    const userPhoto = auth.currentUser.photoURL || '';
    const likeRef = db.ref(`posts/${postId}/likes/${userId}`);

    if (post.likes && post.likes[userId]) {
        await likeRef.remove();
    } else {
        await likeRef.set({
            userId: userId,
            name: userName,
            photo: userPhoto,
            timestamp: Date.now()
        });
    }
}

function showLikes(postId) {
    const post = state.communityPosts.find(p => p.id === postId);
    if (!post) return;

    let existingSheet = document.querySelector('.likes-sheet');
    if (existingSheet) existingSheet.remove();

    const sheet = document.createElement('div');
    sheet.className = 'likes-sheet comment-sheet'; // Reutilizamos estilos de comment-sheet

    const likes = post.likes ? Object.values(post.likes) : [];

    sheet.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h3 style="color:white; margin:0;">Me gusta (${likes.length})</h3>
            <button onclick="window.history.back()" style="background:none; border:none; color:white; font-size:24px;"><i class="fas fa-times"></i></button>
        </div>
        <div class="comment-list" style="margin-top: 0;">
            ${likes.length > 0 ? likes.map(l => {
                const name = (l && typeof l === 'object' ? (l.name || 'Gooper') : 'Gooper');
                const photo = (l && typeof l === 'object' ? (l.photo || '') : '');
                const userId = (l && typeof l === 'object' ? (l.userId || '') : '');
                
                return `
                <div class="comment-item" style="align-items: center; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 20px; border: 1px solid rgba(255,255,255,0.05);">
                    <div class="comment-avatar" style="width: 45px; height: 45px; overflow: hidden; border: 2px solid var(--secondary-lilac);">
                        ${photo ? `<img src="${photo}" style="width: 100%; height: 100%; object-fit: cover;">` : (name?.[0] || 'G')}
                    </div>
                    <div class="comment-content" style="background: none; padding: 0;">
                        <b style="font-size: 15px; margin: 0; color: white;">@${name.toString().replace(/\s+/g, '').toLowerCase()}</b>
                        <p style="font-size: 10px; color: var(--text-dim); margin-top: 2px;">Visto por Goopi</p>
                    </div>
                    ${userId ? `<button onclick="viewUserProfile('${userId}')" style="background: var(--secondary-lilac); border: none; color: white; padding: 8px 16px; border-radius: 12px; font-size: 10px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 10px rgba(186,150,255,0.3);">VER</button>` : ''}
                </div>
                `;
            }).join('') : '<div style="text-align:center; color:rgba(255,255,255,0.3); padding:40px;">Nadie ha dado me gusta todavía.</div>'}
        </div>
    `;

    document.body.appendChild(sheet);
    setTimeout(() => sheet.classList.add('active'), 10);
    if (!window._isHandlingBack) window.history.pushState({ overlay: 'likes' }, "");
}

function showPostComposer() {
    if (!auth || !auth.currentUser) return navigate('login');

    const modal = document.createElement('div');
    modal.style = "position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 2100; padding: 30px; display: flex; flex-direction: column; gap: 20px; backdrop-filter: blur(10px); animation: fadeIn 0.3s ease-out;";
    modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h2 style="color: white; margin: 0;">Nuevo Reel</h2>
            <button onclick="this.closest('div').parentElement.remove()" style="background: none; border: none; color: white; font-size: 24px;"><i class="fas fa-times"></i></button>
        </div>
        <textarea id="post-text" placeholder="¿Qué está pasando en Goopi?" style="width: 100%; height: 150px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 15px; color: white; padding: 15px; outline: none; font-size: 16px;"></textarea>
        
        <div id="media-preview" style="width: 100%; aspect-ratio: 9/16; background: rgba(0,0,0,0.3); border-radius: 15px; border: 2px dashed var(--glass-border); display: flex; align-items: center; justify-content: center; overflow: hidden;">
            <div style="text-align: center; color: var(--text-dim);">
                <i class="fas fa-camera" style="font-size: 30px; margin-bottom: 10px;"></i>
                <p>Sin multimedia</p>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <input type="file" id="media-input" accept="image/*,video/*" hidden onchange="previewMedia(this)">
            <button onclick="document.getElementById('media-input').click()" style="padding: 15px; border-radius: 15px; border: 1px solid var(--secondary-lilac); background: none; color: var(--secondary-lilac); font-weight: 700;">SUBIR ARCHIVO</button>
            <button onclick="submitPost(this)" style="padding: 15px; border-radius: 15px; background: var(--secondary-lilac); border: none; color: white; font-weight: 700;">PUBLICAR</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function previewMedia(input) {
    const file = input.files[0];
    const preview = document.getElementById('media-preview');
    if (!file || !preview) return;

    const url = URL.createObjectURL(file);
    if (file.type.startsWith('image/')) {
        preview.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: contain;">`;
    } else {
        preview.innerHTML = `<video src="${url}#t=0.5" preload="auto" onloadeddata="this.currentTime=0.5" style="width: 100%; height: 100%; object-fit: contain;" autoplay muted loop></video>`;
    }
}

async function submitPost(btn) {
    const text = document.getElementById('post-text').value;
    const fileInput = document.getElementById('media-input');
    const user = auth.currentUser;

    if (!text && !fileInput.files[0]) return alert("Escribe algo o sube una foto/video");

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Publicando...`;

    try {
        let mediaUrl = "";
        let mediaType = "";

        if (fileInput.files[0]) {
            const file = fileInput.files[0];
            console.log("Subiendo archivo:", file.name);
            mediaType = file.type.startsWith('video/') ? 'video' : 'image';
            const storagePath = `posts/${user.uid}/${Date.now()}_${file.name}`;
            const storageRef = storage.ref(storagePath);

            // Monitor upload progress (Optional but helpful)
            const uploadTask = storageRef.put(file);

            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        btn.innerText = `SUBIENDO: ${Math.round(progress)}%`;
                    },
                    (error) => reject(error),
                    () => resolve()
                );
            });

            mediaUrl = await storageRef.getDownloadURL();
            console.log("Archivo subido con éxito:", mediaUrl);
        }

        // Obtener ubicación actual para el Reel
        let lat = 0, lng = 0;
        try {
            if (window.Capacitor && window.Capacitor.Plugins.Geolocation) {
                const pos = await window.Capacitor.Plugins.Geolocation.getCurrentPosition();
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
            } else if (navigator.geolocation) {
                const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, {timeout: 5000}));
                lat = pos.coords.latitude;
                lng = pos.coords.longitude;
            }
        } catch(e) { console.warn("No location for reel:", e); }

        const newPostRef = db.ref('posts').push();
        await newPostRef.set({
            userId: user.uid,
            userName: user.displayName || 'Gooper',
            userPhoto: user.photoURL || '',
            text: text,
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            lat: lat,
            lng: lng,
            timestamp: Date.now()
        });

        alert("¡Publicado con éxito!");
        btn.closest('div').parentElement.remove();
        if (state.currentView === 'community') initCommunity();
    } catch (e) {
        console.error(e);
        alert("Error al publicar: " + e.message);
        btn.disabled = false;
        btn.innerText = "PUBLICAR";
    }
}

function handleLogout() {
    auth.signOut().then(() => {
        navigate('home');
        window.location.reload();
    });
}

// --- AUTH HANDLERS ---
function handleEmailLogin(btn) {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) return alert("Completa todos los campos");

    btn.disabled = true;
    btn.innerText = "ENTRANDO...";

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            navigate('home');
        })
        .catch(e => {
            alert("Error: " + e.message);
            btn.disabled = false;
            btn.innerText = "ENTRAR AHORA";
        });
}

function handleEmailRegister(btn) {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    if (!name || !email || !password) return alert("Completa todos los campos");

    btn.disabled = true;
    btn.innerText = "CREANDO...";

    auth.createUserWithEmailAndPassword(email, password)
        .then((result) => {
            return result.user.updateProfile({ displayName: name });
        })
        .then(() => {
            // Create initial user document in Firestore if needed
            return fs.collection('usuarios').doc(auth.currentUser.uid).set({
                nombre: name,
                email: email,
                fechaRegistro: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            navigate('home');
        })
        .catch(e => {
            alert("Error: " + e.message);
            btn.disabled = false;
            btn.innerText = "CREAR MI CUENTA";
        });
}

async function handleDriverRegistration(btn) {
    const role = document.getElementById('driver-role').value; // 'taxi' -> 'taxista', 'delivery' -> 'delivery'
    const finalRole = role === 'taxi' ? 'taxista' : 'delivery';
    const coop = document.getElementById('driver-coop').value;
    const unit = document.getElementById('driver-unit').value;

    const emailInput = document.getElementById('driver-email');
    const passInput = document.getElementById('driver-password');
    const phoneInput = document.getElementById('driver-phone');
    const phone = phoneInput ? phoneInput.value.trim() : "";

    if (!coop || !unit || !phone) return alert("La cooperativa, número de unidad y teléfono son obligatorios");

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> REGISTRANDO...`;

    try {
        let user = auth.currentUser;

        // Si no hay usuario, intentamos crear uno nuevo o verificamos el existente
        let emailToCheck = user ? user.email : emailInput.value.trim().toLowerCase();

        if (!emailToCheck) {
            btn.disabled = false;
            btn.innerText = "FINALIZAR REGISTRO";
            return alert("Por favor ingresa un correo para verificar tu registro.");
        }



        if (!user) {
            const email = emailInput.value;
            const password = passInput.value;
            if (!email || !password) {
                btn.disabled = false;
                btn.innerText = "FINALIZAR REGISTRO";
                return alert("Por favor ingresa correo y contraseña para crear tu cuenta Gooper.");
            }

            try {
                const result = await auth.createUserWithEmailAndPassword(email, password);
                user = result.user;
            } catch (e) {
                if (e.code === 'auth/email-already-in-use') {
                    alert("Este correo ya tiene cuenta. Inicia sesión y vuelve aquí.");
                    navigate('login');
                    return;
                }
                throw e;
            }
        }

        // Crear documento en la colección 'taxis' (Según reglas enviadas)
        await fs.collection('taxis').doc(user.uid).set({
            uid: user.uid,
            email: user.email,
            rol: finalRole,
            cooperativa: coop,
            unidad: unit,
            telefono: phone,
            habilitado: false, // Requerido por reglas para 'create'
            bloqueadoAdmin: false, // Requerido por reglas para 'create'
            activo: false,
            lat: 0,
            lng: 0,
            ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("¡Registro enviado con éxito! Un administrador revisará tu solicitud para activarte en el mapa.");
        navigate('home');

    } catch (e) {
        console.error("Error Driver Reg:", e);
        alert("Error: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "FINALIZAR REGISTRO";
    }
}



// --- SEARCH LOGIC ---
function toggleSearch() {
    const searchOverlay = document.getElementById('search-overlay');
    if (!searchOverlay) return;

    if (searchOverlay.classList.contains('active')) {
        searchOverlay.classList.remove('active');
        if (!window._isHandlingBack) window.history.back();
    } else {
        searchOverlay.classList.add('active');
        const input = document.getElementById('main-search-input');
        if (input) {
            input.value = '';
            input.focus();
        }
        if (!window._isHandlingBack) window.history.pushState({ overlay: 'search' }, "");
    }
}

async function handleSearch(event) {
    const query = event.target.value.trim();
    if (event.key === 'Enter' || query.length > 2) {
        if (!query) return;

        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--secondary-lilac);"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>';

        try {
            const response = await fetch(`${wpConfig.url}/wp/v2/posts?_embed&search=${encodeURIComponent(query)}&per_page=15`);
            const results = await response.json();

            if (results.length === 0) {
                resultsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-dim);">No se encontraron resultados para "' + query + '"</div>';
                return;
            }

            resultsContainer.innerHTML = results.map(post => `
                <div class="search-item" onclick="toggleSearch(); viewDetails(${post.id})">
                    <img src="${post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/300'}" alt="${post.title.rendered}">
                    <div>
                        <h4>${post.title.rendered}</h4>
                        <p style="font-size:10px; color:var(--text-dim);">Guía Comercial</p>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error("Search failed:", e);
            resultsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#ff3b30;">Error al buscar. Intenta de nuevo.</div>';
        }
    }
}

// --- SOCIAL ENHANCEMENTS ---
function viewUserProfile(uid) {
    state.targetProfileId = uid;
    navigate('profile', uid);
}

function focusOnPost(postId) {
    if (state.currentView !== 'community') navigate('community');

    let attempts = 0;
    const scrollInterval = setInterval(() => {
        const target = document.getElementById(`post-${postId}`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
            // Forzar play si es video
            const video = target.querySelector('video');
            if (video) video.play().catch(() => {});
            clearInterval(scrollInterval);
        }
        attempts++;
        if (attempts > 20) clearInterval(scrollInterval); // Max 4 seconds
    }, 200);
}

function showUserSearch() {
    let searchOverlay = document.getElementById('user-search-overlay');
    if (!searchOverlay) {
        searchOverlay = document.createElement('div');
        searchOverlay.id = 'user-search-overlay';
        searchOverlay.className = 'search-overlay'; 
        searchOverlay.style.zIndex = "20000"; // Ensure it's above community feed
        searchOverlay.innerHTML = `
            <div class="search-header">
                <button class="back-btn" onclick="window.history.back()" style="margin-bottom: 0;">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <input type="text" id="user-search-input" placeholder="Buscar Goopers..." onkeyup="handleUserSearch(event)">
            </div>
            <div id="user-search-results" class="search-results"></div>
        `;
        document.body.appendChild(searchOverlay);
    }
    searchOverlay.classList.add('active');
    const input = document.getElementById('user-search-input');
    if (input) {
        input.value = '';
        input.focus();
    }
    document.getElementById('user-search-results').innerHTML = '';
    if (!window._isHandlingBack) window.history.pushState({ overlay: 'user-search' }, "");
}

function handleUserSearch(event) {
    const query = event.target.value.trim().toLowerCase().replace('@', '');
    const resultsContainer = document.getElementById('user-search-results');

    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }

    // Since we don't have a global user list in Firebase, we search unique names from communityPosts
    const users = [];
    const seenUids = new Set();

    state.communityPosts.forEach(post => {
        if (!seenUids.has(post.userId)) {
            const userName = post.userName.toLowerCase();
            if (userName.includes(query)) {
                users.push({
                    uid: post.userId,
                    name: post.userName,
                    photo: post.userPhoto || ''
                });
                seenUids.add(post.userId);
            }
        }
    });

    if (users.length === 0) {
        resultsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-dim);">No se encontraron usuarios comunitarios.</div>';
        return;
    }

    resultsContainer.innerHTML = users.map(u => {
        const isFollowing = state.userFollowing && state.userFollowing[u.uid];
        return `
            <div class="search-item" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 15px; flex: 1;" onclick="document.getElementById('user-search-overlay').classList.remove('active'); viewUserProfile('${u.uid}')">
                    <div style="width:40px; height:40px; border-radius:50%; background:var(--secondary-lilac); display:flex; align-items:center; justify-content:center; color:white; overflow: hidden;">
                        ${u.photo ? `<img src="${u.photo}" style="width: 100%; height: 100%; object-fit: cover;">` : `<i class="fas fa-user"></i>`}
                    </div>
                    <div>
                        <h4>@${u.name.replace(/\s+/g, '').toLowerCase()}</h4>
                        <p style="font-size:10px; color:var(--text-dim);">${u.name}</p>
                    </div>
                </div>
                ${(auth.currentUser && auth.currentUser.uid !== u.uid) ? `
                    <button onclick="event.stopPropagation(); toggleFollow('${u.uid}', this).then(() => { setTimeout(() => { const input = document.getElementById('user-search-input'); if(input) handleUserSearch({target: input}); }, 500); })" 
                        style="background: ${isFollowing ? 'transparent' : 'var(--secondary-lilac)'}; border: 1px solid var(--secondary-lilac); color: white; padding: 5px 10px; border-radius: 8px; font-size: 10px; font-weight: 800; cursor: pointer;">
                        ${isFollowing ? 'SIGUIENDO' : 'SEGUIR'}
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
}

async function toggleFollow(targetUserId, btn) {
    const user = auth ? auth.currentUser : null;
    if (!user) {
        alert("Inicia sesión para seguir a otros Goopers");
        return navigate('login');
    }
    if (!db) return alert("Error: Base de datos no inicializada");

    const isFollowing = !!(state.userFollowing && state.userFollowing[targetUserId]);
    const followRef = db.ref(`following/${user.uid}/${targetUserId}`);

    btn.disabled = true;
    btn.style.opacity = "0.5";

    try {
        if (isFollowing) {
            await followRef.remove();
            if (state.userFollowing) delete state.userFollowing[targetUserId];
        } else {
            await followRef.set(true);
            if (!state.userFollowing) state.userFollowing = {};
            state.userFollowing[targetUserId] = true;
        }

        // Feedback visual inmediato
        const isNowFollowing = !!(state.userFollowing && state.userFollowing[targetUserId]);
        btn.innerText = isNowFollowing ? 'SIGUIENDO' : 'SEGUIR';
        btn.style.background = isNowFollowing ? 'transparent' : 'var(--secondary-lilac)';
        btn.classList.toggle('following', isNowFollowing);

    } catch (e) {
        console.error("Follow error:", e);
        if (e.message.includes("permission_denied")) {
            alert("❌ ERROR DE PERMISOS EN BASE DE DATOS:\n\nDebes ir a Firebase Console > Realtime Database > Rules y permitir acceso a la ruta 'following'.");
        } else {
            alert("Hubo un error al procesar tu solicitud. Intenta de nuevo.");
        }
    } finally {
        btn.disabled = false;
        btn.style.opacity = "1";
    }
}

async function updateProfilePhoto(input) {
    const file = input.files[0];
    const user = auth ? auth.currentUser : null;

    if (!file || !user) return;

    if (!storage) {
        return alert("El servicio de almacenamiento no está disponible.");
    }

    if (file.size > 2 * 1024 * 1024) {
        return alert("¡Archivo muy grande! Máximo 2MB.");
    }

    const avatarDiv = document.querySelector('div[onclick*="profile-upload"]');
    if (!avatarDiv) return;

    const originalHtml = avatarDiv.innerHTML;
    avatarDiv.innerHTML = `<i class="fas fa-spinner fa-spin" style="font-size: 30px;"></i>`;
    avatarDiv.style.pointerEvents = "none";

    try {
        console.log("Iniciando subida de perfil...");
        const storageRef = storage.ref(`profiles/${user.uid}/photo.jpg`);
        const metadata = { contentType: file.type };
        const snapshot = await storageRef.put(file, metadata);
        const photoURL = await snapshot.ref.getDownloadURL();
        await user.updateProfile({ photoURL: photoURL });
        updateHeader();
        renderView('profile', document.querySelector('.main-content'));
    } catch (e) {
            if (e.code === 'storage/unauthorized') {
                alert("❌ ERROR DE PERMISOS:\n\nDebes ir a Firebase Console > Storage > Rules y cambiar la regla a:\n\nallow read, write: if request.auth != null;");
            } else {
                alert("Error: " + e.message);
            }
            avatarDiv.innerHTML = originalHtml;
            avatarDiv.style.pointerEvents = "auto";
        }
    }

// --- MINES GAME LOGIC (CHALLENGE EDITION v4.0) ---
let gameActive = false;
let currentMines = [];
let blueDiamondsInGame = 0;

function showMinesGame() {
    if (gameActive) return;

    if (state.redDiamonds >= 10) {
        victoryRedDiamonds();
        return;
    }
    
    // El juego solo abre el menú de inicio
    const overlay = document.createElement('div');
    overlay.id = 'mines-game-overlay';
    overlay.className = 'mines-overlay active';

    overlay.innerHTML = `
        <style>
            .mines-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); backdrop-filter: blur(15px); z-index: 10000; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.4s; }
            .mines-overlay.active { opacity: 1; }
            .mines-container { background: rgba(15, 5, 25, 0.8); width: 92%; max-width: 420px; padding: 25px; border-radius: 35px; border: 1px solid rgba(255,255,255,0.1); text-align: center; position: relative; box-shadow: 0 25px 60px rgba(0,0,0,0.6); }
            .mines-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .stat-box { background: rgba(255,255,255,0.05); padding: 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); }
            .mines-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 20px 0; }
            .mine-cell { aspect-ratio: 1; background: rgba(255,255,255,0.07); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; cursor: pointer; transition: 0.2s all; border: 1px solid rgba(255,255,255,0.03); }
            .mine-cell.revealed { background: rgba(0,0,0,0.4); border-color: transparent; }
            .mine-cell.revealed-diamond { color: #00f2ff; text-shadow: 0 0 15px #00f2ff; }
            .mine-cell.revealed-mine { color: #ff3366; text-shadow: 0 0 15px #ff3366; animation: shake 0.4s; }
            .mines-btn { width: 100%; padding: 18px; border-radius: 20px; border: none; font-weight: 900; font-size: 16px; cursor: pointer; transition: 0.3s; margin-top: 10px; text-transform: uppercase; letter-spacing: 1px; }
            .btn-start { background: linear-gradient(135deg, #FF8C00, #FF0080); color: white; box-shadow: 0 10px 20px rgba(255, 0, 128, 0.2); }
            .btn-start:disabled { background: #333; opacity: 0.5; cursor: not-allowed; }
            .red-diamond-counter { display: flex; justify-content: center; gap: 5px; margin: 15px 0; }
            .red-dot { width: 12px; height: 12px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); }
            .red-dot.active { background: #ff3333; box-shadow: 0 0 10px #ff3333; border-color: #ff3333; }
            @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
            @keyframes pulse-orange {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 140, 0, 0.7); }
                70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(255, 140, 0, 0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 140, 0, 0); }
            }
        </style>
        <div class="mines-container">
            <button onclick="closeMinesGame()" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.1); border: none; color: white; width: 35px; height: 35px; border-radius: 50%; cursor: pointer;"><i class="fas fa-times"></i></button>
            <h2 style="color:white; margin-bottom:5px; font-weight:900;">GOOPI CHALLENGE</h2>
            <p style="color:rgba(255,255,255,0.4); font-size:11px; margin-bottom:20px;">10 Diamantes Rojos = Gran Premio</p>
            
            <div id="setup-view">
                <div class="stat-box" style="margin-bottom:15px;">
                    <span style="color:rgba(255,255,255,0.4); font-size:10px; font-weight:800; display:block;">PUNTOS DISPONIBLES</span>
                    <b style="color:white; font-size:24px;">${state.userPoints}</b>
                </div>
                
                <div class="red-diamond-counter">
                    ${Array(10).fill(0).map((_, i) => `<div class="red-dot ${i < state.redDiamonds ? 'active' : ''}"></div>`).join('')}
                </div>
                <p style="color:#ff3333; font-weight:800; font-size:13px; margin-bottom:20px;">${state.redDiamonds} / 10 DIAMANTES ROJOS</p>

                ${state.userPoints < 100 ? `
                    <div style="background: rgba(255,140,0,0.1); padding: 15px; border-radius: 20px; border: 1px solid var(--accent-orange); margin-bottom: 15px;">
                        <span style="font-size: 30px; display: block; margin-bottom: 5px;">🪫</span>
                        <p style="color:white; font-size: 12px; font-weight: 700;">¡TE QUEDASTE SIN PUNTOS!</p>
                        <p style="color:rgba(255,255,255,0.5); font-size: 10px;">Ve a un punto de recarga para obtener 1000 más.</p>
                    </div>
                    <button onclick="showRechargeMap()" class="mines-btn" style="background: var(--accent-orange); color: white; animation: pulse-orange 1.5s infinite;">
                        🔍 VER PUNTOS DE RECARGA
                    </button>
                ` : `
                    <button onclick="startMinesGame()" class="mines-btn btn-start">
                        NUEVO INTENTO (100 Pts)
                    </button>
                `}
                <p style="color:rgba(255,255,255,0.3); font-size:10px; margin-top:10px;">Encuentra 10 diamantes azules para ganar 1 rojo</p>
            </div>

            <div id="game-view" style="display:none;">
                <div class="mines-stats">
                    <div class="stat-box">
                        <span style="color:rgba(255,255,255,0.4); font-size:9px; font-weight:800; display:block;">PUNTOS</span>
                        <b id="points-in-game" style="color:white; font-size:18px;">${state.userPoints}</b>
                    </div>
                    <div class="stat-box">
                        <span style="color:rgba(255,255,255,0.4); font-size:9px; font-weight:800; display:block;">AZULES</span>
                        <b id="blue-count" style="color:#00f2ff; font-size:18px;">0 / 10</b>
                    </div>
                </div>

                <div class="mines-grid" id="mines-grid">
                    <!-- Dinámico -->
                </div>
                
                <div style="background: rgba(255,51,102,0.1); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,51,102,0.2);">
                    <small style="color:#ff3366; font-weight:800; font-size:10px;">¡CUIDADO! 5 MINAS ACTIVAS</small>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('active'), 50);
    if (!window._isHandlingBack) window.history.pushState({ overlay: 'mines' }, "");
}

window.startMinesGame = () => {
    if (state.userPoints < 100) return alert("Puntos insuficientes. Vuelve mañana o visita un punto de recarga.");

    state.userPoints -= 100;
    if (auth && auth.currentUser) {
        db.ref('gameStats/' + auth.currentUser.uid).update({
            points: state.userPoints,
            lastDate: new Date().toLocaleDateString()
        });
    }

    document.getElementById('setup-view').style.display = 'none';
    document.getElementById('game-view').style.display = 'block';
    
    // Generar tablero
    blueDiamondsInGame = 0;
    gameActive = true;
    currentMines = [];
    while (currentMines.length < 5) {
        let r = Math.floor(Math.random() * 25);
        if (!currentMines.includes(r)) currentMines.push(r);
    }

    const grid = document.getElementById('mines-grid');
    grid.innerHTML = Array(25).fill(0).map((_, i) => `<div class="mine-cell" onclick="handleMineClick(${i}, this)"><i class="fas fa-gem" style="opacity:0.05;"></i></div>`).join('');
    
    document.getElementById('blue-count').innerText = "0 / 10";
    document.getElementById('points-in-game').innerText = state.userPoints;
};

window.handleMineClick = async (index, cell) => {
    if (!gameActive || cell.classList.contains('revealed')) return;

    cell.classList.add('revealed');

    if (currentMines.includes(index)) {
        gameActive = false;
        cell.classList.add('revealed-mine');
        cell.innerHTML = '<i class="fas fa-bomb"></i>';
        
        if (navigator.vibrate) navigator.vibrate([100, 50, 200]);

        setTimeout(() => {
            currentMines.forEach(m => {
                const c = document.getElementById('mines-grid').children[m];
                c.classList.add('revealed-mine');
                c.innerHTML = '<i class="fas fa-bomb"></i>';
            });

            alert("💥 MINA DETONADA. Perdiste este intento (100 pts).");
            
            // Regresar al setup
            document.getElementById('setup-view').style.display = 'block';
            document.getElementById('game-view').style.display = 'none';
            
            // Actualizar puntos en UI de setup
            const setupPts = document.querySelector('#setup-view .stat-box b');
            if (setupPts) setupPts.innerText = state.userPoints;
            
            const startBtn = document.querySelector('.btn-start');
            if (startBtn) startBtn.disabled = (state.userPoints < 100);

        }, 600);

    } else {
        cell.classList.add('revealed-diamond');
        cell.innerHTML = '<i class="fas fa-gem"></i>';
        blueDiamondsInGame++;
        
        document.getElementById('blue-count').innerText = `${blueDiamondsInGame} / 10`;
        if (navigator.vibrate) navigator.vibrate(50);

        if (blueDiamondsInGame >= 10) {
            gameActive = false;
            state.redDiamonds++;
            
            if (auth && auth.currentUser) {
                await db.ref('gameStats/' + auth.currentUser.uid).update({
                    redDiamonds: state.redDiamonds
                });
            }

            alert("💎 ¡PARTIDA PERFECTA! Has ganado 1 Diamante Rojo.");
            
            if (state.redDiamonds >= 10) {
                victoryRedDiamonds();
            } else {
                // Volver al setup para el siguiente intento
                document.getElementById('setup-view').style.display = 'block';
                document.getElementById('game-view').style.display = 'none';
                
                // Actualizar puntitos rojos visuales
                const redContainer = document.querySelector('.red-diamond-counter');
                if (redContainer) {
                    redContainer.innerHTML = Array(10).fill(0).map((_, i) => `<div class="red-dot ${i < state.redDiamonds ? 'active' : ''}"></div>`).join('');
                }
                const redTxt = document.querySelector('#setup-view p:nth-of-type(2)');
                if (redTxt) redTxt.innerText = `${state.redDiamonds} / 10 DIAMANTES ROJOS`;
            }
        }
    }
};

function victoryRedDiamonds() {
    const qrData = localStorage.getItem('goopi_win_code_v4') || `GoopiMaster-${Date.now()}`;
    if (!localStorage.getItem('goopi_win_code_v4')) localStorage.setItem('goopi_win_code_v4', qrData);
    
    const text = `🏆 ¡RETO 10/10 COMPLETADO! He conseguido todos los Diamantes Rojos en Goopi App. Código: ${qrData}`;
    const waUrl = `https://wa.me/593989427123?text=${encodeURIComponent(text)}`;

    const overlay = document.createElement('div');
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.95); backdrop-filter: blur(20px);
        z-index: 999999; display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 20px; text-align: center; color: white;
    `;
    
    // Generar la URL de la API de QR
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}&color=0-243-255&bgcolor=0-0-0`;

    overlay.innerHTML = `
        <i class="fas fa-crown" style="font-size: 60px; color: #FFD700; margin-bottom: 20px; animation: pulse 2s infinite;"></i>
        <h1 style="background: -webkit-linear-gradient(45deg, #FFD700, #FFA500); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 900; margin-bottom: 10px;">¡GRAND MASTER GOOPI!</h1>
        <p style="color: #aaa; margin-bottom: 30px; font-size: 14px;">Has conseguido los 10 Diamantes Rojos.</p>
        
        <div style="background: rgba(0,243,255,0.1); padding: 25px; border-radius: 20px; border: 2px solid #00f3ff; margin-bottom: 30px; box-shadow: 0 0 30px rgba(0,243,255,0.3);">
            <img src="${qrImageUrl}" style="width: 200px; height: 200px; border-radius: 10px; margin-bottom: 15px;">
            <div style="font-family: monospace; letter-spacing: 2px; font-size: 16px; color: #00f3ff; font-weight: bold;">
                ${qrData.split('-')[1] || qrData}
            </div>
            <p style="font-size: 11px; margin-top: 10px; color: white;">Presenta este código en nuestras oficinas para reclamar tu premio.</p>
        </div>
        
        <button onclick="window.open('${waUrl}', '_blank')" style="background: #25D366; color: white; border: none; padding: 15px 30px; border-radius: 30px; font-weight: bold; font-size: 16px; cursor: pointer; display: flex; align-items: center; gap: 10px; box-shadow: 0 5px 20px rgba(37, 211, 102, 0.4);">
            <i class="fab fa-whatsapp" style="font-size: 20px;"></i> ENVIAR A SOPORTE
        </button>
        
        <button onclick="this.closest('div').remove();" style="margin-top: 20px; background: transparent; color: #888; border: none; padding: 10px; font-size: 14px;">CERRAR</button>
    `;

    document.body.appendChild(overlay);
    closeMinesGame();
}

function closeMinesGame() {
    const mines = document.getElementById('mines-game-overlay');
    if (mines) {
        gameActive = false;
        mines.classList.remove('active');
        setTimeout(() => { if (mines.parentNode) mines.remove(); }, 400);
        if (!window._isHandlingBack) window.history.back();
    }
}

function showRechargeMap() {
    const existing = document.getElementById('recharge-map-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'recharge-map-overlay';
    // Estilo blindado para móvil con backdrop superior
    overlay.style = "position:fixed; inset:0; background:#0c0218; z-index:99999; display:flex; flex-direction:column; color:white;";
    overlay.innerHTML = `
        <div style="padding: 30px 20px 20px; text-align: center; background: linear-gradient(to bottom, #1a052d, transparent);">
            <button onclick="this.closest('#recharge-map-overlay').remove()" style="position:absolute; top:30px; right:20px; background:rgba(255,255,255,0.1); border:none; color:white; width:40px; height:40px; border-radius:50%; z-index:100;"><i class="fas fa-times"></i></button>
            <h2 style="color:var(--accent-orange); font-weight:900; margin:0; font-size: 24px;">PUNTOS DE RECARGA</h2>
            <p style="color:#aaa; font-size:13px; margin:5px 0 0;">Acércate a un punto naranja para obtener 1000 Pts</p>
        </div>
        
        <div id="map-recharge-container" style="flex:1; width:100%; border-top: 1px solid rgba(255,140,0,0.3); border-bottom: 1px solid rgba(255,140,0,0.3);"></div>
        
        <div style="padding: 20px; background: #1a052d; box-shadow: 0 -10px 30px rgba(0,0,0,0.5);">
            <button id="btn-recharge-verify" onclick="verifyRechargeLocation()" style="width:100%; height:65px; background:linear-gradient(90deg, #ff8c00, #ff0080); border:none; border-radius:20px; color:white; font-weight:900; font-size:16px; text-transform:uppercase; letter-spacing:1px; box-shadow: 0 4px 15px rgba(255, 140, 0, 0.4);">
                ESTOY AQUÍ - RECARGAR 1000 PTOS
            </button>
            <div style="display:flex; justify-content:center; gap:20px; margin-top:15px; font-size:12px; color:#555;">
                <span><i class="fas fa-map-marker-alt" style="color:var(--accent-orange);"></i> Macas, Ecuador</span>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    // Inyectar Leaflet dinámicamente si no está
    if (!window.L) {
        const link = document.createElement('link');
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => initRechargeMap();
        document.head.appendChild(script);
    } else {
        initRechargeMap();
    }
}

function initRechargeMap() {
    // Coordenadas Macas Central
    const map = L.map('map-recharge-container', { zoomControl: false }).setView([-2.3087, -78.1174], 15);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    const STATIONS = [
        { name: "Parque Central", coords: [-78.1174, -2.3087] },
        { name: "Terminal Terrestre", coords: [-78.1210, -2.3121] },
        { name: "Plaza Tiwintza", coords: [-78.1154, -2.3056] }
    ];

    const stationIcon = L.divIcon({
        className: 'custom-recharge-pin-app',
        html: `<div style="background-image: url('${LOGO_URL}'); background-size: contain; width: 35px; height: 35px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 15px var(--accent-orange); background-color: #0c0218;"></div>`,
        iconSize: [35, 35],
        iconAnchor: [17, 17]
    });

    STATIONS.forEach(s => {
        L.marker([s.coords[1], s.coords[0]], { icon: stationIcon })
         .addTo(map)
         .bindPopup(`<b style="color:#000;">${s.name}</b><br>Punto de Recarga Goopi`);
    });

    // Marcador de Usuario Activo
    const userMarker = L.marker([-2.3087, -78.1174], {
        icon: L.divIcon({
            className: 'user-location-marker',
            html: '<div style="width:18px; height:18px; background:#00ceff; border:3px solid white; border-radius:50%; box-shadow:0 0 15px #00ceff; animation: pulse-gps 2s infinite;"></div>',
            iconSize: [18, 18]
        })
    }).addTo(map);

    // Animación para el GPS
    const style = document.createElement('style');
    style.innerHTML = `@keyframes pulse-gps { 0% { box-shadow: 0 0 0 0 rgba(0,206,255,0.7); } 70% { box-shadow: 0 0 0 15px rgba(0,206,255,0); } 100% { box-shadow: 0 0 0 0 rgba(0,206,255,0); } }`;
    document.head.appendChild(style);

    // Sistema de rastreo real de posición
    const updatePosition = (lat, lng) => {
        userMarker.setLatLng([lat, lng]);
        // map.panTo([lat, lng]); // Opcional: centrar siempre
    };

    if (window.Capacitor && window.Capacitor.Plugins.Geolocation) {
        window.Capacitor.Plugins.Geolocation.watchPosition({ enableHighAccuracy: true }, (pos) => {
            if (pos) updatePosition(pos.coords.latitude, pos.coords.longitude);
        });
    } else if (navigator.geolocation) {
        navigator.geolocation.watchPosition((pos) => {
            updatePosition(pos.coords.latitude, pos.coords.longitude);
        }, null, { enableHighAccuracy: true });
    }

    setTimeout(() => { map.invalidateSize(); }, 600);
}

window.verifyRechargeLocation = async () => {
    const btn = document.getElementById('btn-recharge-verify');
    btn.innerText = "VERIFICANDO...";
    
    // Función centralizada para aplicar la recarga
    const applyRecharge = async () => {
        const today = new Date().toLocaleDateString();
        const lastRecharge = localStorage.getItem('goopi_last_recharge_date');
        
        if (lastRecharge === today) {
            alert("⚠️ LÍMITE DIARIO ALCANZADO.\nYa realizaste una recarga en un punto naranja el día de hoy. Vuelve mañana para obtener 1000 puntos más.");
            const overlay = document.getElementById('recharge-map-overlay');
            if (overlay) overlay.remove();
            return;
        }

        state.userPoints += 1000;
        localStorage.setItem('goopi_last_recharge_date', today);
        
        if (auth && auth.currentUser) {
            await db.ref('gameStats/' + auth.currentUser.uid).update({ 
                points: state.userPoints,
                lastDate: today
            });
        }
        alert("✅ ¡RECARGA EXITOSA!\nSe han añadido 1000 puntos (10 nuevas oportunidades) a tu cuenta.");
        const overlay = document.getElementById('recharge-map-overlay');
        if (overlay) overlay.remove();
        
        // Si hay un botón de inicio en el setup de Mines, habilitarlo
        const startBtn = document.querySelector('.btn-start');
        if (startBtn) startBtn.disabled = false;
        const setupPts = document.querySelector('#setup-view .stat-box b');
        if (setupPts) setupPts.innerText = state.userPoints;
    };

    // Caso Native (Capacitor)
    if (window.Capacitor && window.Capacitor.Plugins.Geolocation) {
        try {
            const pos = await window.Capacitor.Plugins.Geolocation.getCurrentPosition();
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            
            const stations = [[-2.3087, -78.1174], [-2.3121, -78.1210], [-2.3056, -78.1154]];
            let near = false;
            stations.forEach(s => {
                const d = calculateDistance(lat, lng, s[0], s[1]);
                if (d < 250) near = true;
            });

            if (near) {
                await applyRecharge();
            } else {
                alert("❌ No estás en un punto de recarga.\nDebes estar físicamente en uno de los puntos marcados en el mapa.");
            }
        } catch (e) { alert("Error de GPS: " + e.message); }
    } 
    // Caso Web / Fallback
    else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const stations = [[-2.3087, -78.1174], [-2.3121, -78.1210], [-2.3056, -78.1154]];
            let near = false;
            stations.forEach(s => {
                const d = calculateDistance(lat, lng, s[0], s[1]);
                if (d < 250) near = true;
            });

            if (near) {
                await applyRecharge();
            } else {
                alert("❌ No estás en un punto de recarga.\nDebes estar físicamente en uno de los puntos marcados en el mapa.");
            }
        }, () => alert("Por favor, permite el acceso a tu ubicación."));
    } else {
        alert("Tu dispositivo no soporta geolocalización.");
    }

    btn.innerText = "ESTOY AQUÍ - RECARGAR 1000 PUNTOS";
};

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2-lat1)*Math.PI/180;
    const dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function deletePost(postId, mediaUrl) {
    if (!confirm("¿Seguro que quieres eliminar esta publicación? Esta acción no se puede deshacer.")) return;

    try {
        // 1. Eliminar de Realtime Database
        await db.ref('posts/' + postId).remove();

        // 2. Eliminar de Storage si tiene media
        if (mediaUrl && mediaUrl.includes('firebasestorage')) {
            try {
                const storageRef = storage.refFromURL(mediaUrl);
                await storageRef.delete();
            } catch (e) {
                console.warn("Media already deleted or path invalid in storage", e);
            }
        }

        alert("Publicación eliminada correctamente.");

        // 3. Actualizar UI
        state.communityPosts = state.communityPosts.filter(p => p.id !== postId);
        if (state.currentView === 'community') {
            renderCommunityPosts();
        } else if (state.currentView === 'profile') {
            const mainContent = document.getElementById('main-view');
            if (mainContent) renderView('profile', mainContent);
        }

    } catch (e) {
        console.error("Error al eliminar post:", e);
        alert("No se pudo eliminar la publicación: " + e.message);
    }
}

function viewChat(otherId, otherName, otherPhoto) {
    if (!auth.currentUser) return navigate('login');
    navigate('chat', { otherId, otherName, otherPhoto });
}

function syncChatMessages(otherId) {
    if (!db || !auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const chatId = uid < otherId ? `${uid}_${otherId}` : `${otherId}_${uid}`;
    
    // Cleanup previous listener if any
    if (window._currentChatRef) window._currentChatRef.off();

    const chatRef = db.ref('messages/' + chatId).limitToLast(50);
    window._currentChatRef = chatRef;

    chatRef.on('value', (snapshot) => {
        const messages = [];
        snapshot.forEach(child => {
            messages.push({ id: child.key, ...child.val() });
        });
        state.activeChatMessages = messages;
        renderChatMessages();
    });
}

function renderChatMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    if (state.activeChatMessages.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:50px 20px; color:var(--text-dim); opacity:0.5;"><i class="far fa-comment-dots" style="font-size:30px; margin-bottom:10px;"></i><br>Dí hola...</div>';
        return;
    }

    container.innerHTML = state.activeChatMessages.map(msg => `
        <div class="message-bubble ${msg.senderId === auth.currentUser.uid ? 'sent' : 'received'}">
            ${msg.text}
            <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
    `).join('');
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

async function sendMessage(otherId, otherName, otherPhoto) {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text || !auth.currentUser) return;

    const uid = auth.currentUser.uid;
    const myName = auth.currentUser.displayName || 'Gooper';
    const myPhoto = auth.currentUser.photoURL || '';
    const chatId = uid < otherId ? `${uid}_${otherId}` : `${otherId}_${uid}`;
    const timestamp = Date.now();

    input.value = '';

    try {
        const newMessage = {
            senderId: uid,
            text,
            timestamp
        };

        // 1. Push message
        await db.ref('messages/' + chatId).push(newMessage);

        // 2. Update summary for ME
        await db.ref(`userChats/${uid}/${otherId}`).set({
            otherName,
            otherPhoto,
            lastMessage: text,
            lastTimestamp: timestamp,
            unread: 0
        });

        // 3. Update summary for OTHER (Using a direct update to avoid READ permission errors)
        const otherChatRef = db.ref(`userChats/${otherId}/${uid}`);
        await otherChatRef.update({
            otherName: myName,
            otherPhoto: myPhoto,
            lastMessage: text,
            lastTimestamp: timestamp
            // Note: We don't increment unread here to avoid reading other user's data
        });

    } catch (e) {
        console.error("Error sending message:", e);
        // We only alert if it's a real failure. If the message was pushed, we don't bother the user.
    }
}

// --- BOOTSTRAP (v40.0) ---
initFirebase();
initCommunity();
const urlParams = new URLSearchParams(window.location.search);
const startPost = urlParams.get('post');
if (startPost) {
    focusOnPost(startPost);
} else {
    navigate('home');
}
checkDynamicPopup();

// Mostrar Juego de Minas si hay intentos y está logueado
// NOTA: El Juego de Minas ya NO salta de forma automática por petición del usuario.
// Solo se accede a él haciendo clic en el botón de 'Puntos Gooper' en el perfil o sección correspondiente.
// El temporizador de 10s se ha eliminado.


// --- INTEGRACIÓN NATIVA CAPACITOR (ANTIGRAVITY v48.2) ---
if (window.Capacitor) {
    const { App } = window.Capacitor.Plugins;
    if (App) {
        App.addListener('backButton', () => {
            console.log("📍 Native Back Button");
            handleBackButton(false);
        });
    }
}

// Browser/PWA Back Button integration
window.addEventListener('popstate', (event) => {
    window._isHandlingPopState = true;
    const s = event.state;
    
    if (s && s.view) {
        console.log("📍 PopState:", s.view);
        const oldView = state.currentView;
        state.currentView = s.view;
        
        // --- ACTUALIZACIÓN DE LAYOUT (Sincronización con navigate) ---
        const isFullScreen = ['taxi', 'delivery', 'community', 'reels-map', 'driver-panel', 'chat'].includes(s.view);
        const header = document.querySelector('.app-header');
        const nav = document.querySelector('.bottom-nav');
        const mainContent = document.getElementById('main-view');

        if (header) header.style.setProperty('display', isFullScreen ? 'none' : 'flex', 'important');
        if (nav) nav.style.setProperty('display', isFullScreen ? 'none' : 'flex', 'important');

        if (isFullScreen) {
            mainContent.style.padding = '0';
            mainContent.style.height = '100vh';
            mainContent.style.position = 'fixed';
            mainContent.style.zIndex = (s.view === 'chat') ? '20000' : '1000';
            mainContent.style.overflow = 'hidden';
            mainContent.style.background = '#000';
        } else {
            mainContent.style.padding = '20px 20px 140px';
            mainContent.style.height = 'auto';
            mainContent.style.position = 'static';
            mainContent.style.zIndex = '1';
            mainContent.style.overflowY = 'auto';
            mainContent.style.background = 'transparent';
        }
        
        // Hide ALL overlays visually
        document.querySelectorAll('.details-overlay, .popup-overlay, #search-overlay, .mines-overlay, .comment-sheet, .likes-sheet, .share-sheet').forEach(el => {
            el.classList.remove('active');
            if (el.id === 'mines-game-overlay' || el.classList.contains('comment-sheet') || el.classList.contains('likes-sheet') || el.classList.contains('share-sheet')) {
                setTimeout(() => { if (el.parentNode) el.remove(); }, 400);
            }
        });
        
        if (s.view !== oldView) {
            renderView(s.view, mainContent, s.extra);
        } else if (s.view === 'community' || s.view === 'reels-map') {
            // Regresamos de un overlay en comunidad, mantener scroll y videos
            const bNav = document.querySelector('.bottom-nav');
            if (bNav) bNav.style.setProperty('display', 'none', 'important');
        }
        
        // UI Update (Icons)
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-view') === s.view);
        });
    }
    
    setTimeout(() => { window._isHandlingPopState = false; }, 100);
});

async function initReelsMap() {
    // Inyectar Leaflet si falta
    if (!window.L) {
        const link = document.createElement('link');
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        document.head.appendChild(script);
        await new Promise(r => script.onload = r);
    }

    const map = L.map('reels-leaflet-map', { zoomControl: false }).setView([-2.3087, -78.1174], 14);
    // SIMULACIÓN: Si no hay posts con GPS, asignamos coordenadas aleatorias en Macas
    // a los últimos reels para que puedas ver cómo funciona de inmediato.
    const postsWithLocation = state.communityPosts.filter(p => p.lat && p.lng && p.lat !== 0);
    
    const displayPosts = postsWithLocation.length > 0 ? postsWithLocation : state.communityPosts.slice(0, 5).map((p, i) => {
        return {
            ...p,
            lat: -2.3087 + (Math.random() - 0.5) * 0.02,
            lng: -78.1174 + (Math.random() - 0.5) * 0.02
        };
    });

    // Estilo Oscuro Premium
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; Goopi App'
    }).addTo(map);

    displayPosts.forEach(post => {
        const iconHtml = `
            <div class="reel-marker-anim" style="width: 60px; height: 60px; background: white; padding: 4px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); transform: rotate(${Math.random() * 10 - 5}deg); position: relative;">
                <div style="width: 100%; height: 100%; border-radius: 4px; overflow: hidden; background: #000; position: relative;">
                    ${post.mediaType === 'video' 
                        ? `<video src="${post.mediaUrl}#t=0.5" autoplay muted loop playsinline style="width:100%; height:100%; object-fit:cover;"></video>`
                        : `<img src="${post.mediaUrl}" style="width:100%; height:100%; object-fit:cover;">`}
                </div>
                <!-- Pequeño icono de play si es video -->
                ${post.mediaType === 'video' ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 14px; opacity: 0.8; text-shadow: 0 0 10px rgba(0,0,0,0.5); pointer-events: none;"><i class="fas fa-play"></i></div>` : ''}
                
                <!-- Borde inferior neón Goopi -->
                <div style="position: absolute; bottom: -2px; left: 10px; right: 10px; height: 4px; background: var(--secondary-lilac); border-radius: 10px; box-shadow: 0 0 10px var(--secondary-lilac);"></div>
            </div>
        `;

        const markerIcon = L.divIcon({
            html: iconHtml,
            className: 'reels-custom-icon',
            iconSize: [60, 60],
            iconAnchor: [30, 30]
        });

        const marker = L.marker([post.lat, post.lng], { icon: markerIcon }).addTo(map);
        
        marker.on('click', () => {
            focusOnPost(post.id);
        });
    });

    // Zoom a la ubicación del usuario si está disponible
    try {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                L.circle([pos.coords.latitude, pos.coords.longitude], {
                    color: '#00f3ff',
                    fillColor: '#00f3ff',
                    fillOpacity: 0.2,
                    radius: 100
                }).addTo(map);
            });
        }
    } catch(e) {}
}


// --- FARMACIAS DE TURNO (Funcionalidad Local Macas) ---
// --- FARMACIAS DE TURNO (Funcionalidad Local Macas) ---
// --- FARMACIAS DE TURNO (Funcionalidad Dinámica Multi-Ciudad) ---
async function showFarmaciasTurno() {
    const overlay = document.createElement('div');
    overlay.id = 'farmacias-overlay';
    overlay.className = 'reward-overlay active';
    overlay.style.zIndex = "100000";
    
    // UI de Carga Inicial
    overlay.innerHTML = `
        <div class="reward-content" style="background: linear-gradient(135deg, #050510 0%, #1a0b2e 100%); border: 1px solid #00f3ff; width: 90%; max-width: 400px; padding: 40px 25px; border-radius: 30px;">
            <div style="font-size: 40px; color: #00f3ff; margin-bottom: 15px; filter: drop-shadow(0 0 10px #00f3ff);">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <h2 style="color: white; font-size: 22px; margin-bottom: 5px; font-weight: 900;">LOCALIZANDO...</h2>
            <p style="color: var(--text-dim); font-size: 12px;">Buscando farmacias cerca de ti</p>
        </div>
    `;
    document.body.appendChild(overlay);

    // Default to Macas
    let cityNode = 'macas';
    let cityName = 'Macas';

    // Función auxiliar para determinar ciudad por coordenadas
    const detectCity = (lat, lng) => {
        // Coordenadas aproximadas
        const distMacas = calculateDistance(lat, lng, -2.308, -78.118);
        const distSucua = calculateDistance(lat, lng, -2.458, -78.172);
        
        if (distSucua < 10000) { // Si está a menos de 10km de Sucúa
            return { node: 'sucua', name: 'Sucúa' };
        }
        return { node: 'macas', name: 'Macas' };
    };

    try {
        // Intentar obtener ubicación del usuario
        if (window.Capacitor && window.Capacitor.Plugins.Geolocation) {
            try {
                const pos = await window.Capacitor.Plugins.Geolocation.getCurrentPosition({ timeout: 5000 });
                const loc = detectCity(pos.coords.latitude, pos.coords.longitude);
                cityNode = loc.node;
                cityName = loc.name;
            } catch(e) { console.log('GPS nativo falló, usando Macas por defecto'); }
        } else if (navigator.geolocation) {
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                const loc = detectCity(pos.coords.latitude, pos.coords.longitude);
                cityNode = loc.node;
                cityName = loc.name;
            } catch(e) { console.log('GPS web falló, usando Macas por defecto'); }
        }

        const snapshot = await db.ref(`farmacias_turno/${cityNode}`).once('value');
        let farmacias = [];
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            if (Array.isArray(data)) {
                farmacias = data.filter(item => item !== null);
            } else {
                farmacias = Object.values(data);
            }
        } else {
            // Datos de respaldo para Macas
            if (cityNode === 'macas') {
                farmacias = [
                    { nombre: "Farmacia Cruz Azul", direccion: "Calle 10 de Agosto y Amazonas", lat: -2.308, lng: -78.118 },
                    { nombre: "Farmacia Sana Sana", direccion: "Av. 29 de Mayo (Cerca al Terminal)", lat: -2.315, lng: -78.125 }
                ];
                await db.ref('farmacias_turno/macas').set(farmacias);
            }
        }

        if (farmacias.length === 0) {
            overlay.innerHTML = `
                <div class="reward-content" style="background: linear-gradient(135deg, #050510 0%, #1a0b2e 100%); border: 1px solid #00f3ff; width: 90%; max-width: 400px; padding: 25px; border-radius: 30px;">
                    <div style="font-size: 40px; color: #ff8c00; margin-bottom: 15px;">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <h2 style="color: white; font-size: 22px; margin-bottom: 5px; font-weight: 900;">NO HAY DATOS</h2>
                    <p style="color: var(--text-dim); font-size: 13px; margin-bottom: 20px;">No se encontraron farmacias de turno para <b>${cityName}</b> en este momento.</p>
                    <button class="reward-btn" onclick="document.getElementById('farmacias-overlay').remove()" style="background: rgba(255,255,255,0.1); width: 100%;">VOLVER</button>
                </div>
            `;
            return;
        }

        let htmlList = farmacias.map(f => `
            <div class="pharmacy-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1;">
                        <h4 style="color: #00f3ff; margin: 0; font-size: 16px; font-weight: 800;">${f.nombre}</h4>
                        <p style="color: #ccc; font-size: 11px; margin-top: 4px; line-height: 1.3;"><i class="fas fa-map-marker-alt" style="font-size: 10px; color: #ff8c00;"></i> ${f.direccion}</p>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px;">
                    <button onclick="document.getElementById('farmacias-overlay').remove(); navigate('taxi', {lat: ${f.lat || -2.308}, lng: ${f.lng || -78.117}})" style="background: linear-gradient(90deg, #ff8c00, #ff5e00); color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 800; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; text-transform: uppercase;">
                        <i class="fas fa-taxi"></i> IR ALLÁ
                    </button>
                    ${f.telefono ? 
                    `<button onclick="window.open('tel:${f.telefono}')" style="background: linear-gradient(90deg, #25D366, #128C7E); color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 800; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; text-transform: uppercase;">
                        <i class="fas fa-phone"></i> LLAMAR
                    </button>` : 
                    `<button onclick="document.getElementById('farmacias-overlay').remove(); navigate('delivery')" style="background: linear-gradient(90deg, var(--secondary-lilac), #8c309b); color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 800; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; text-transform: uppercase;">
                        <i class="fas fa-motorcycle"></i> PEDIR
                    </button>`}
                </div>
            </div>
        `).join('');

        overlay.innerHTML = `
            <style>
                .pharmacy-card {
                    background: rgba(255,255,255,0.05); 
                    border: 1px solid rgba(0,243,255,0.2); 
                    padding: 15px; 
                    border-radius: 18px;
                    margin-bottom: 12px;
                    transition: transform 0.2s;
                }
                .pharmacy-card:active { transform: scale(0.98); }
            </style>
            <div class="reward-content" style="background: linear-gradient(135deg, #050510 0%, #1a0b2e 100%); border: 1px solid #00f3ff; width: 90%; max-width: 400px; padding: 25px; border-radius: 30px;">
                <div style="font-size: 40px; color: #00f3ff; margin-bottom: 15px; filter: drop-shadow(0 0 10px #00f3ff);">
                    <i class="fas fa-clinic-medical"></i>
                </div>
                <h2 style="color: white; font-size: 22px; margin-bottom: 5px; font-weight: 900;">FARMACIAS DE TURNO</h2>
                <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 20px;">Hoy en ${cityName}, Morona Santiago</p>
                
                <div style="text-align: left; display: flex; flex-direction: column; width: 100%; max-height: 300px; overflow-y: auto; padding-right: 5px;">
                    ${htmlList}
                </div>

                <button class="reward-btn" onclick="document.getElementById('farmacias-overlay').remove()" style="background: rgba(255,255,255,0.1); margin-top: 20px; font-size: 13px; border: 1px solid rgba(255,255,255,0.1); width: 100%;">VOLVER AL INICIO</button>
            </div>
        `;
    } catch (e) {
        console.error("Error al cargar farmacias", e);
        overlay.innerHTML = `
            <div class="reward-content" style="background: #1a0b2e; padding: 20px; border-radius: 20px;">
                <p style="color:#ff2d55; font-weight: 800;">Error de conexión.</p>
                <p style="color:white; font-size:12px; margin-bottom:15px;">No se pudo verificar el turno con el servidor.</p>
                <button onclick="document.getElementById('farmacias-overlay').remove()" style="background:white; color:black; border:none; padding:10px 20px; border-radius:10px; font-weight:800;">Cerrar</button>
            </div>
        `;
    }

    if (!window._isHandlingBack) window.history.pushState({ overlay: 'farmacias' }, "");
}

// Inicialización de historial limpio
if (!window.history.state) {
    window.history.replaceState({ view: 'home' }, 'home', "");
}

// PWA Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js?v=40.0');
    });
}
