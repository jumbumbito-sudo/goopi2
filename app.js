/**
 * GoopiApp - Core Logic (Tokyo Midnight Pro Edition v25.0)
 * FIX: CDN Cloudflare, MODO EMULADOR para pruebas sin conexión.
 */

const wpConfig = {
    url: "https://goopiapp.com/wp-json",
    user: "jumbumbito@gmail.com",
    appPassword: "8wHv UbIC nUXg VogE DHcP VSYn"
};

// Firebase Safe-Initialization (v22.0)
let auth = null;
let db = null;
let firebaseError = false;

function initFirebase() {
    if (typeof firebase !== 'undefined') {
        try {
            const firebaseConfig = {
                apiKey: "AIzaSyDFwLeYPqT9gMcACGCa_PAU7CNO52wZFs0",
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
            auth.onAuthStateChanged((user) => {
                console.log("Goopi Auth State:", user ? "Active Session" : "No Session");
                if (user) syncFavorites(user.uid);
                else state.userFavorites = {};
                updateHeader();
            });
            firebaseError = false;
        } catch (e) {
            console.error("Firebase Error:", e);
            firebaseError = true;
        }
    } else {
        console.error("Firebase SDK missing from CDN.");
        firebaseError = true;
    }
}

function syncFavorites(uid) {
    const favRef = db.ref('favorites/' + uid);
    favRef.on('value', (snapshot) => {
        state.userFavorites = snapshot.val() || {};
        if (state.currentView === 'profile') {
            const mainContent = document.querySelector('.main-content');
            renderView('profile', mainContent);
        }
    });
}

function getAuthStatusHtml() {
    let status = "🔴 DESCONECTADO";
    let color = "#ff3b30";
    if (typeof firebase !== 'undefined') {
        status = "🟡 SDK CARGADO";
        color = "#ffcc00";
        if (auth) {
            status = "🟢 MOTOR LISTO";
            color = "#4cd964";
        }
    }
    return `<div id="auth-debug" style="font-size: 10px; color: ${color}; margin-bottom: 15px; font-weight: 800; letter-spacing: 1px; line-height: 1.4;">
        <i class="fas fa-signal"></i> ESTADO: ${status}
        ${status === "🔴 DESCONECTADO" ? `
            <br><span style="color: var(--text-dim); font-weight: 400; font-size: 9px;">Bloqueado por firewall/incógnito.</span>
            <br><button onclick="enableMockAuth()" style="background: none; border: 1px solid var(--secondary-lilac); color: var(--secondary-lilac); font-size: 8px; padding: 2px 5px; border-radius: 4px; margin-top: 5px; cursor: pointer;">ACTIVAR MODO EMULADOR (PRUEBAS)</button>
        ` : ''}
    </div>`;
}

function enableMockAuth() {
    console.warn("MODO EMULADOR ACTIVADO");
    auth = {
        currentUser: {
            uid: "mock-123",
            displayName: "Usuario de Pruebas",
            email: "tester@goopi.app",
            updateProfile: () => Promise.resolve()
        },
        signInWithEmailAndPassword: () => Promise.resolve(),
        createUserWithEmailAndPassword: () => Promise.resolve({ user: { uid: "mock-123", updateProfile: () => Promise.resolve() } }),
        signOut: () => { auth = null; initFirebase(); navigate('home'); }
    };
    db = {
        ref: () => ({ set: () => { }, remove: () => { }, on: (evt, cb) => cb({ val: () => ({}) }) })
    };
    alert("¡MODO EMULADOR ACTIVO! Ahora puedes probar el Registro y Perfil sin conexión a Firebase.");
    navigate('home');
}

const state = {
    currentView: 'home',
    posts: [], // Cache for details
    userFavorites: {}
};

// Logo con timestamp dinámico para forzar actualización inmediata
const LOGO_URL = "https://goopiapp.com/wp-content/uploads/2026/02/cropped-e628f4e1-a38c-4da8-ae79-343f049eb3c3.png?t=" + new Date().getTime();

// URLs de Banners (Optimización Photon CDN para evitar bloqueos y caché)
const adImages = [
    "https://i0.wp.com/goopiapp.com/wp-content/uploads/2026/02/1.png?w=1200",
    "https://i0.wp.com/goopiapp.com/wp-content/uploads/2026/02/2.png?w=1200",
    "https://i0.wp.com/goopiapp.com/wp-content/uploads/2026/02/3.png?w=1200"
];

const categoryIcons = {
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

// Generador de Banners con Proporción Exacta 6:1 (450x75px)
function generateNativeAdHtml(heightIgnored = "", idPrefix = "slot") {
    const uniqueId = `banner-img-${idPrefix}`;
    const ts = Date.now();

    // Rotación de imágenes mejorada
    setTimeout(() => {
        const el = document.getElementById(uniqueId);
        if (el && !el.dataset.running) {
            el.dataset.running = "true";
            let idx = 0;
            setInterval(() => {
                idx = (idx + 1) % adImages.length;
                el.style.opacity = '0';
                setTimeout(() => {
                    el.src = adImages[idx] + "&cache=" + Date.now();
                    el.style.opacity = '1';
                }, 400);
            }, 8000);
        }
    }, 1000);

    return `
        <div class="banner-wrapper" style="width: 100%; max-width: 450px; margin: 20px auto; position: relative; z-index: 10;">
            <div style="position: relative; width: 100%; padding-bottom: 16.666%; background: #000; border-radius: 12px; overflow: hidden; border: 1px solid var(--glass-border); box-shadow: var(--glass-shadow);">
                <img id="${uniqueId}" src="${adImages[0]}&v=${ts}" 
                     style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; transition: opacity 0.5s ease; display: block;">
                <div style="position: absolute; top: 4px; right: 8px; background: rgba(0,0,0,0.6); color: rgba(255,255,255,0.8); font-size: 7px; padding: 2px 5px; border-radius: 4px; font-family: sans-serif; pointer-events: none; text-transform: uppercase;">Aviso</div>
            </div>
        </div>
    `;
}

function navigate(view, params = null) {
    console.log(`Navigating to: ${view}`);
    const mainContent = document.querySelector('.main-content');
    const header = document.querySelector('.app-header');
    window.scrollTo(0, 0);

    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        const textElement = item.querySelector('span');
        if (textElement) {
            const text = textElement.innerText.toLowerCase();
            if (text.includes(view) || (view === 'home' && text === 'inicio') || (view === 'news' && text === 'noticias') || (view === 'guide' && text === 'guía')) {
                item.classList.add('active');
            }
        }
    });

    if (view === 'taxi' || view === 'delivery') {
        header.style.display = 'none';
        mainContent.style.padding = '0';
        mainContent.style.marginTop = '0';
        mainContent.style.height = '100vh';
        mainContent.style.width = '100vw';
    } else {
        header.style.display = 'flex';
        mainContent.style.padding = '20px';
        mainContent.style.marginTop = '0';
        mainContent.style.height = 'auto';
        mainContent.style.width = 'auto';
    }

    mainContent.style.opacity = '0';
    setTimeout(() => {
        renderView(view, mainContent, params);
        mainContent.style.opacity = '1';
    }, 100);

    state.currentView = view;
}

function renderView(view, container, params = null) {
    switch (view) {
        case 'home':
            container.innerHTML = `
                <section class="hero">
                    <h1 style="text-shadow: 0 0 10px var(--secondary-lilac);">¡Hola, Gooper!</h1>
                    <p>¿Qué necesitas hoy?</p>
                </section>
                <div class="quick-actions" style="margin-bottom: 20px;">
                    <a href="#" class="action-card taxi" onclick="navigate('taxi')">
                        <i class="fas fa-taxi"></i>
                        <span>Pide un Taxi</span>
                    </a>
                    <a href="#" class="action-card delivery" onclick="navigate('delivery')">
                        <i class="fas fa-motorcycle"></i>
                        <span>Delivery</span>
                    </a>
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
                
                <!-- PUBLICIDAD EN HOME (Parte Media) -->
                ${generateNativeAdHtml("75px", "home-mid")}

                <section class="categories" style="margin-top: 15px;">
                    <div class="section-header">
                        <h2>Categorías</h2>
                    </div>
                    <div id="home-categories-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        <!-- Categories -->
                    </div>
                </section>

                <section class="units-area" style="margin-top: 20px; display: flex; flex-direction: column; gap: 12px;">
                    <button onclick="window.location.href='https://goopiapp.com/registro-de-taxistas/'" class="action-card" style="width: 100%; background: var(--card-bg); border: 1px solid var(--glass-border); color: var(--secondary-lilac); flex-direction: row; align-items: center; justify-content: center; padding: 15px; font-size: 14px; cursor: pointer;">
                        <i class="fas fa-id-card"></i> Registro de Unidades
                    </button>
                    <button onclick="window.location.href='https://goopiapp.com/panel-taxista/'" class="action-card" style="width: 100%; background: var(--card-bg); border: 1px solid var(--glass-border); color: var(--secondary-lilac); flex-direction: row; align-items: center; justify-content: center; padding: 15px; font-size: 14px; cursor: pointer;">
                        <i class="fas fa-tachometer-alt"></i> Panel de Unidades
                    </button>
                </section>

                <!-- SECCIÓN PUNTOS GOOPI (Reemplaza banner inferior) -->
                <div style="margin-bottom: 90px; margin-top: 30px; padding: 0 5px;">
                    <button onclick="window.location.href='https://goopiapp.com/puntos-goopi/'" class="action-card" 
                        style="width: 100%; height: auto; padding: 20px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #432e00; border: none; flex-direction: row; align-items: center; justify-content: center; gap: 15px; border-radius: 20px; box-shadow: 0 10px 25px rgba(255, 215, 0, 0.3); cursor: pointer; transition: 0.3s;">
                        <i class="fas fa-coins" style="font-size: 24px;"></i>
                        <div style="text-align: left;">
                            <span style="display: block; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Puntos Goopi</span>
                            <span style="display: block; font-size: 10px; font-weight: 400; opacity: 0.8;">Próximamente: Acumula y Canjea</span>
                        </div>
                    </button>
                </div>
            `;
            initHomePage();
            break;

        case 'taxi':
        case 'delivery':
            container.innerHTML = `
                <div style="height: 100vh; width: 100vw; overflow: hidden; background: #000; position: fixed; top: 0; left: 0; z-index: 500;">
                    <!-- BANNER NATIVO FLOTANTE (Superior - Posición Extrema) -->
                    <div style="position: absolute; top: 0px; left: 10px; right: 10px; z-index: 1001;">
                        ${generateNativeAdHtml("", "map-top")}
                    </div>
                    
                    <!-- Botón Volver (Ubicación optimizada) -->
                    <button onclick="navigate('home')" style="position: absolute; top: 85px; left: 15px; z-index: 2000; background: rgba(0,0,0,0.85); border: 1px solid var(--glass-border); color: white; width: 42px; height: 42px; border-radius: 50%; backdrop-filter: blur(10px); cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                        <i class="fas fa-arrow-left"></i>
                    </button>

                    <!-- MAPA FONDO (Cápsula de aislamiento para ocultar Banners Web, Mapbox links y Atribución) -->
                    <iframe src="https://goopiapp.com/taxis-disponibles/" 
                            style="width: 100%; height: calc(100% + 250px); border: none; position: absolute; top: -180px; left: 0;" 
                            allow="geolocation">
                    </iframe>
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
            fetchLocales();
            break;

        case 'login':
            container.innerHTML = `
                <div style="text-align: center; margin-top: 40px;">
                    <img src="${LOGO_URL}" style="height: 120px; margin-bottom: 20px; filter: drop-shadow(0 0 10px var(--secondary-lilac));">
                    ${getAuthStatusHtml()}
                    <h1 style="font-size: 28px; text-shadow: 0 0 10px var(--secondary-lilac); font-weight: 800;">Hola de nuevo</h1>
                    <p style="color: var(--text-dim);">Ingresa a tu cuenta Gooper</p>
                </div>
                <div style="margin-top: 35px; display: flex; flex-direction: column; gap: 15px; padding: 0 10px;">
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-envelope" style="color: var(--secondary-lilac);"></i>
                        <input type="email" id="login-email" placeholder="Correo electrónico" style="background: none; border: none; color: white; width: 100%; outline: none; font-size: 15px;">
                    </div>
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px; position: relative;">
                        <i class="fas fa-lock" style="color: var(--secondary-lilac);"></i>
                        <input type="password" id="login-pass" placeholder="Contraseña" style="background: none; border: none; color: white; width: 100%; outline: none; font-size: 15px;">
                        <i class="fas fa-eye" id="toggle-login-pass" onclick="togglePasswordVisibility('login-pass', this)" style="color: var(--text-dim); cursor: pointer; font-size: 14px;"></i>
                    </div>
                    <button id="login-btn" onclick="handleLogin()" class="action-card" style="height: auto; width: 100%; padding: 18px; border: none; justify-content: center; align-items: center; margin-top: 10px; font-weight: 700; background: linear-gradient(135deg, var(--secondary-lilac) 20%, #8c309b 100%); color: white; box-shadow: 0 5px 15px rgba(186, 150, 255, 0.4); border-radius: 18px; cursor: pointer;">
                        ENTRAR AHORA
                    </button>

                    <div style="text-align: right; margin-top: 5px; margin-bottom: 20px;">
                        <a href="#" onclick="handleResetPassword()" style="color: var(--text-dim); font-size: 12px; text-decoration: none;">¿Olvidaste tu contraseña?</a>
                    </div>
                    
                    <div style="text-align: center; background: rgba(186, 150, 255, 0.1); padding: 20px; border-radius: 18px; border: 1px dashed var(--secondary-lilac);">
                        <p style="color: white; font-size: 14px; margin-bottom: 10px;">¿Eres nuevo en Goopi?</p>
                        <button onclick="navigate('register')" style="background: var(--secondary-lilac); color: white; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 800; cursor: pointer; width: 100%;">CREA TU CUENTA GRATIS AQUÍ</button>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 10px; margin: 20px 0;">
                        <div style="flex: 1; height: 1px; background: var(--glass-border);"></div>
                        <span style="color: var(--text-dim); font-size: 12px;">O continúa con</span>
                        <div style="flex: 1; height: 1px; background: var(--glass-border);"></div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <button onclick="socialLogin('Google')" style="background: #fff; border: none; border-radius: 15px; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #333; font-weight: 600; cursor: pointer;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" style="width: 20px;"> Google
                        </button>
                        <button onclick="socialLogin('Facebook')" style="background: #1877F2; border: none; border-radius: 15px; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #fff; font-weight: 600; cursor: pointer;">
                            <i class="fab fa-facebook-f"></i> Facebook
                        </button>
                    </div>


                </div>
            `;
            break;

        case 'register':
            container.innerHTML = `
                <div style="text-align: center; margin-top: 30px;">
                    ${getAuthStatusHtml()}
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
                    <div style="background: var(--card-bg); border: 1px solid var(--glass-border); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 12px; position: relative;">
                        <i class="fas fa-lock" style="color: var(--secondary-lilac);"></i>
                        <input type="password" id="reg-pass" placeholder="Crea una contraseña" style="background: none; border: none; color: white; width: 100%; outline: none;">
                        <i class="fas fa-eye" id="toggle-reg-pass" onclick="togglePasswordVisibility('reg-pass', this)" style="color: var(--text-dim); cursor: pointer; font-size: 14px;"></i>
                    </div>
                    <button id="reg-btn" onclick="handleRegister()" class="action-card" style="height: auto; width: 100%; padding: 18px; border: none; justify-content: center; align-items: center; margin-top: 10px; font-weight: 700; background: linear-gradient(135deg, var(--secondary-lilac) 20%, #8c309b 100%); color: white; border-radius: 18px; cursor: pointer;">
                        CREAR MI CUENTA
                    </button>

                    <div style="display: flex; align-items: center; gap: 10px; margin: 15px 0;">
                        <div style="flex: 1; height: 1px; background: var(--glass-border);"></div>
                        <span style="color: var(--text-dim); font-size: 11px;">O regístrate con</span>
                        <div style="flex: 1; height: 1px; background: var(--glass-border);"></div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <button onclick="socialLogin('Google')" style="background: #fff; border: none; border-radius: 15px; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #333; font-weight: 600; cursor: pointer;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" style="width: 20px;"> Google
                        </button>
                        <button onclick="socialLogin('Facebook')" style="background: #1877F2; border: none; border-radius: 15px; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #fff; font-weight: 600; cursor: pointer;">
                            <i class="fab fa-facebook-f"></i> Facebook
                        </button>
                    </div>

                    <div style="text-align: center; margin-top: 20px; padding-bottom: 20px;">
                        <p style="color: var(--text-dim); font-size: 14px;">¿Ya eres parte? <a href="#" onclick="navigate('login')" style="color: var(--secondary-lilac); font-weight: 800; text-decoration: none;">Inicia Sesión</a></p>
                    </div>
                </div>
            `;
            break;

        case 'profile':
            const user = auth ? auth.currentUser : null;
            const favIds = Object.keys(state.userFavorites);

            let favoritesHtml = `<div style="padding: 20px; text-align: center; color: var(--text-dim);">Aún no tienes favoritos.</div>`;

            if (favIds.length > 0) {
                favoritesHtml = favIds.map(id => {
                    const fav = state.userFavorites[id];
                    return `
                        <div class="business-card" style="display: flex; gap: 15px; align-items: center; padding: 15px; margin-bottom: 10px;" onclick="viewDetails(${fav.id})">
                            <img src="${fav.image || 'https://via.placeholder.com/100'}" style="width: 50px; height: 50px; border-radius: 10px; object-fit: cover;">
                            <div style="flex: 1;">
                                <h3 style="margin: 0; font-size: 14px;">${fav.title}</h3>
                            </div>
                            <i class="fas fa-chevron-right" style="color: var(--secondary-lilac); font-size: 12px;"></i>
                        </div>
                    `;
                }).join('');
            }

            container.innerHTML = `
                <div style="text-align: center; margin-top: 40px;">
                    <div style="width: 100px; height: 100px; border-radius: 50%; background: var(--secondary-lilac); margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 40px; color: white; box-shadow: 0 0 20px var(--secondary-lilac);">
                        <i class="fas fa-user-astronaut"></i>
                    </div>
                    <h1 style="font-size: 26px; font-weight: 800;">${user ? (user.displayName || 'Gooper') : 'Invitado'}</h1>
                    <p style="color: var(--text-dim);">${user ? user.email : 'Inicia sesión para más funciones'}</p>
                </div>
                
                <div style="margin-top: 40px; padding-bottom: 100px;">
                    <div class="section-header">
                        <h2>Tus Favoritos</h2>
                        <span style="font-size: 12px; color: var(--secondary-lilac);">${favIds.length} guardados</span>
                    </div>
                    ${favoritesHtml}

                    <div style="margin-top: 30px; display: flex; flex-direction: column; gap: 10px;">
                        <button class="action-card" style="width: 100%; background: var(--card-bg); border: 1px solid var(--glass-border); color: white; flex-direction: row; justify-content: space-between; padding: 15px;">
                            <span><i class="fas fa-history" style="margin-right: 10px; color: var(--secondary-lilac);"></i> Mis Viajes (Próximamente)</span>
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        
                        ${user ? `
                        <button onclick="handleLogout()" class="action-card" style="width: 100%; background: rgba(255, 59, 48, 0.1); border: 1px solid rgba(255, 59, 48, 0.3); color: #ff3b30; flex-direction: row; justify-content: center; padding: 15px; margin-top: 20px; font-weight: 800;">
                            CERRAR SESIÓN
                        </button>` : `
                        <button onclick="navigate('login')" class="action-card" style="width: 100%; background: var(--secondary-lilac); border: none; color: white; flex-direction: row; justify-content: center; padding: 15px; margin-top: 20px; font-weight: 800;">
                            INICIAR SESIÓN
                        </button>`}
                    </div>
                </div>
            `;
            break;

        case 'search':
            container.innerHTML = `
                <section class="hero">
                    <h1>Resultados</h1>
                    <p>Buscando: "${params}"</p>
                </section>
                <div id="search-results-list" style="display: flex; flex-direction: column; gap: 18px; margin-top: 20px; padding-bottom: 80px;">
                    <div style="padding: 40px; text-align: center; color: var(--text-dim);">
                        <i class="fas fa-spinner fa-spin" style="font-size: 30px; margin-bottom: 15px; color: var(--secondary-lilac);"></i>
                        <p>Analizando la red Goopi...</p>
                    </div>
                </div>
            `;
            fetchSearchResults(params);
            break;

        default:
            break;
    }
}

async function fetchSearchResults(query) {
    const list = document.getElementById('search-results-list');
    try {
        const response = await fetch(`${wpConfig.url}/wp/v2/posts?search=${query}&_embed`);
        const posts = await response.json();
        if (!posts || posts.length === 0) {
            list.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-dim);">No encontramos resultados para "${query}". Intenta con otra palabra.</div>`;
            return;
        }

        // Guardar en cache para que viewDetails funcione
        state.posts = [...state.posts, ...posts];

        list.innerHTML = posts.map(post => `
            <div class="business-card" onclick="viewDetails(${post.id})">
                <img src="${post._embedded?.['wp:featuredmedia']?.[0]?.source_url || ''}" alt="${post.title.rendered}">
                <div class="business-info">
                    <h3>${post.title.rendered}</h3>
                    <p>${post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 80)}...</p>
                    <div class="business-meta">
                        <span><i class="fas fa-search"></i> Ver detalle</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-dim);">Error en la búsqueda. Revisa tu conexión.</div>`;
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
            grid.innerHTML = categories.map(cat => `
                <button onclick="navigate('guide'); setTimeout(() => fetchLocales(${cat.id}), 300);" 
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
            grid.innerHTML = categories.map(cat => `
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
        const list = document.getElementById('news-list');
        if (list) {
            list.innerHTML = locales.map(item => `
                <div class="business-card" style="display: block; padding: 0; overflow: hidden; border-radius: 24px;">
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

function viewDetails(param) {
    let post;
    if (typeof param === 'object') {
        post = param;
    } else {
        post = state.posts.find(p => p.id === parseInt(param));
    }

    if (!post) {
        console.warn("Post not found:", param);
        return;
    }

    const whatsapp = post.meta?.whatsapp_contacto || post.acf?.whatsapp_contacto || '';
    const telefono = post.meta?.telefono_contacto || post.acf?.telefono_contacto || '';

    const overlay = document.getElementById('details-overlay');
    const content = document.getElementById('details-content');

    if (!overlay || !content) return;

    let buttonsHtml = '';

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

    // Botón de compartir universal
    const shareUrl = `https://goopiapp.com/?p=${post.id}`;
    buttonsHtml += `
        <button onclick="sharePost('${post.title.rendered.replace(/'/g, "\\'")}', 'Mira este local en Goopi App', '${shareUrl}')" 
                style="grid-column: span 2; background: rgba(255,255,255,0.1); border: 1px solid var(--glass-border); padding: 18px; border-radius: 20px; color: white; font-weight: 700; cursor: pointer;">
            <i class="fas fa-share-alt"></i> Compartir este Local
        </button>
    `;

    if (!whatsapp && !telefono) {
        // En caso de plan básico, aún mostramos el botón de compartir
        buttonsHtml = `
            <button onclick="sharePost('${post.title.rendered.replace(/'/g, "\\'")}', 'Mira este local en Goopi App', '${shareUrl}')" 
                    style="grid-column: span 2; background: rgba(255,255,255,0.1); border: 1px solid var(--glass-border); padding: 15px; border-radius: 15px; color: white; font-weight: 700; cursor: pointer; margin-bottom: 10px;">
                <i class="fas fa-share-alt"></i> Compartir Local
            </button>
            <div style="grid-column: span 2; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; text-align: center; color: var(--text-dim); font-size: 13px;">
                <i class="fas fa-info-circle"></i> Contacto no disponible para este plan básico.
            </div>
        `;
    }

    const isFav = state.userFavorites[post.id];

    content.innerHTML = `
        <div style="position: relative;">
            <img src="${post._embedded?.['wp:featuredmedia']?.[0]?.source_url || ''}" style="width: 100%; border-radius: 24px; margin-bottom: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <button onclick="toggleFavorite(${post.id}); viewDetails(${post.id})" 
                style="position: absolute; top: 15px; right: 15px; background: rgba(0,0,0,0.6); border: 1px solid var(--glass-border); color: ${isFav ? '#ff4b2b' : 'white'}; width: 50px; height: 50px; border-radius: 50%; backdrop-filter: blur(10px); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 22px; transition: 0.3s;">
                <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
            </button>
        </div>
        <h1 style="font-size: 28px; margin-bottom: 10px; color: var(--secondary-lilac); font-weight: 900;">${post.title.rendered}</h1>
        <div style="color: var(--text-dim); margin-bottom: 25px; line-height: 1.8; font-size: 15px;">
            ${post.content.rendered}
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 30px; padding-bottom: 50px;">
            ${buttonsHtml}
        </div>
    `;

    overlay.classList.add('active');
}

function closeDetails() {
    document.getElementById('details-overlay').classList.remove('active');
}

async function handleLogin() {
    if (!auth) initFirebase();
    if (!auth) {
        if (firebaseError) {
            alert("Error crítico: El motor de cuentas Goopi no se pudo cargar. Revisa que no tengas bloqueadores de publicidad o intenta desde otro navegador.");
        } else {
            alert("Cargando servidores... Dale un segundo y pulsa de nuevo.");
        }
        return;
    }
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    const btn = document.getElementById('login-btn');

    if (!email || !pass) {
        alert("Por favor completa todos los campos.");
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ENTRANDO...';
    btn.disabled = true;

    try {
        await auth.signInWithEmailAndPassword(email, pass);
        // El listener onAuthStateChanged se encargará de navegar y actualizar
        alert("¡Bienvenido de nuevo!");
        navigate('home');
    } catch (e) {
        console.error("Login Error:", e);
        if (e.code === 'auth/user-not-found') alert("Usuario no encontrado.");
        else if (e.code === 'auth/wrong-password') alert("Contraseña incorrecta.");
        else if (e.code === 'auth/invalid-email') alert("Correo electrónico inválido.");
        else alert("Error: " + e.message);
    } finally {
        btn.innerHTML = 'ENTRAR AHORA';
        btn.disabled = false;
    }
}

async function handleResetPassword() {
    const email = document.getElementById('login-email').value;
    if (!email) {
        alert("Escribe tu correo en el campo de arriba para enviarte un enlace de recuperación.");
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);
        alert("Se ha enviado un correo de recuperación a " + email);
    } catch (e) {
        alert("Error: " + e.message);
    }
}

async function handleRegister() {
    if (!auth) initFirebase();
    if (!auth) {
        if (firebaseError) {
            alert("No podemos conectar con el registro. Puede que tu conexión esté bloqueando los servicios de Google (Firebase). Intenta usar tus datos móviles o refresca.");
        } else {
            alert("Iniciando motor de cuentas... Pulsa una vez más.");
        }
        return;
    }
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;
    const btn = document.getElementById('reg-btn');

    if (!name || !email || !pass) {
        alert("Por favor completa todos los campos.");
        return;
    }

    if (pass.length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres.");
        return;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CREANDO CUENTA...';
    btn.disabled = true;

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
        // Actualizar el perfil con el nombre
        await userCredential.user.updateProfile({
            displayName: name
        });

        alert("¡Cuenta creada con éxito! Bienvenido a Goopi.");
        navigate('home');
    } catch (e) {
        console.error("Register Error:", e);
        if (e.code === 'auth/email-already-in-use') alert("Este correo ya está registrado.");
        else alert("Error al crear cuenta: " + e.message);
    } finally {
        btn.innerHTML = 'CREAR MI CUENTA';
        btn.disabled = false;
    }
}

function toggleFavorite(postId) {
    if (!auth || !auth.currentUser) {
        alert("Debes iniciar sesión para usar los favoritos.");
        navigate('login');
        return;
    }

    const post = state.posts.find(p => p.id === postId);
    if (!post) return;

    const user = auth.currentUser;
    const favRef = db.ref(`favorites/${user.uid}/${postId}`);

    if (state.userFavorites[postId]) {
        favRef.remove();
    } else {
        favRef.set({
            id: post.id,
            title: post.title.rendered,
            image: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || '',
            timestamp: Date.now()
        });
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
        alert("Sesión cerrada.");
        navigate('home');
    } catch (e) {
        alert("Error al cerrar sesión.");
    }
}

function updateHeader() {
    const user = auth ? auth.currentUser : null;
    const userBtn = document.querySelector('button[onclick*="navigate(\'login\')"], button[onclick*="navigate(\'profile\')"]');
    if (userBtn) {
        if (user) {
            userBtn.setAttribute('onclick', "navigate('profile')");
            userBtn.style.color = "var(--secondary-lilac)";
        } else {
            userBtn.setAttribute('onclick', "navigate('login')");
            userBtn.style.color = "var(--secondary-cyan)";
        }
    }
}


function togglePasswordVisibility(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

function socialLogin(provider) {
    alert(`El inicio de sesión con ${provider} está siendo configurado. Por ahora, utiliza el registro por correo.`);
}

document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.querySelector('.main-content');

    // Configurar botón de búsqueda (Búsqueda interna v12.0)
    const sBtn = document.getElementById('searchBtn');
    if (sBtn) {
        sBtn.addEventListener('click', () => {
            const query = prompt("¿Qué estás buscando en Goopi?");
            if (query && query.trim() !== "") {
                navigate('search', query.trim());
            }
        });
    }

    initFirebase();
    renderView('home', mainContent);

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => {
                    console.log('Goopi PWA: Service Worker Registered!');
                    reg.onupdatefound = () => {
                        const installingWorker = reg.installing;
                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                window.location.reload();
                            }
                        };
                    };
                })
                .catch(err => console.log('Goopi PWA: Registration Failed!', err));
        });
    }
});
