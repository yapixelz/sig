// DOM Elements
const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');
const userDetailPage = document.getElementById('userDetailPage');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const agentNameInput = document.getElementById('agentName');
const accessCodeInput = document.getElementById('accessCode');
const agentGreeting = document.getElementById('agentGreeting');
const searchBtn = document.getElementById('searchBtn');
const newUserBtn = document.getElementById('newUserBtn');
const resultsInfo = document.getElementById('resultsInfo');
const resultsContainer = document.getElementById('resultsContainer');
const userDetailContent = document.getElementById('userDetailContent');
const backBtn = document.getElementById('backBtn');
const newUserModal = document.getElementById('newUserModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const newUserForm = document.getElementById('newUserForm');


// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCr8_WDgp_DO4kE_sWObhhmyH-XzSs8W0U",
  authDomain: "mc-agency-9736b.firebaseapp.com",
  databaseURL: "https://mc-agency-9736b-default-rtdb.firebaseio.com",
  projectId: "mc-agency-9736b",
  storageBucket: "mc-agency-9736b.appspot.com",
  messagingSenderId: "231711294642",
  appId: "1:231711294642:web:3d18e34bd0658a25cb35ab"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Application State
let currentUser = null;
let targets = [];
let inactivityTimer;

// Constants
const LOGOUT_TIME = 2 * 60 * 1000; // 2 minutes auto-logout
const DEFAULT_PROFILE_PHOTO = 'https://via.placeholder.com/150';

// Initialize the application
function init() {
  if (!firebase.apps.length) {
    console.error("Firebase not initialized!");
    alert("System error: Firebase not loaded. Please refresh.");
    return;
  }

  setupEventListeners();
  showLogin();
}

function setupEventListeners() {
  loginBtn.addEventListener('click', login);
  logoutBtn.addEventListener('click', logout);
  searchBtn.addEventListener('click', searchTargets);
  newUserBtn.addEventListener('click', () => newUserModal.style.display = 'block');
  closeModalBtn.addEventListener('click', () => newUserModal.style.display = 'none');
  backBtn.addEventListener('click', showDashboard);
  newUserForm.addEventListener('submit', createNewTarget);
  document.getElementById('searchBtnNav').addEventListener('click', showSearch);
  document.getElementById('agentsBtnNav').addEventListener('click', showAgents);
  document.getElementById('operationsBtnNav').addEventListener('click', examineOperations);
  document.getElementById('startOpBtnNav').addEventListener('click', startOperation);
  

  // Activity tracking for auto-logout
  document.addEventListener('mousemove', resetInactivityTimer);
  document.addEventListener('keypress', resetInactivityTimer);
  document.addEventListener('click', resetInactivityTimer);
  

  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === newUserModal) {
      newUserModal.style.display = 'none';
    }
  });
}

// Authentication and Navigation System
async function login() {
  const agentName = agentNameInput.value.trim().toUpperCase();
  const accessCode = accessCodeInput.value.trim();

  if (!agentName || !accessCode) {
    showLoginError("Please enter both agent name and access code");
    return;
  }

  try {
    showLoadingState(true);
    const agentsRef = database.ref('agents');
    const snapshot = await agentsRef.once('value');
    const agents = snapshot.val();
    
    let authenticatedAgent = null;
    for (const agentId in agents) {
      const agent = agents[agentId];
      if (agent.name.toUpperCase() === agentName && agent.code === accessCode) {
        authenticatedAgent = {
          id: agentId,
          ...agent
        };
        break;
      }
    }

    if (authenticatedAgent) {
      currentUser = {
        uid: authenticatedAgent.id,
        name: authenticatedAgent.name,
        accessLevel: authenticatedAgent.accessLevel || 'agent',
        email: `${authenticatedAgent.name.replace(/\s+/g, '.').toLowerCase()}@sig.hellas`
      };
      
      // Persist session
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('accessLevel', currentUser.accessLevel);
      
      showDashboard();
    } else {
      throw new Error("Invalid credentials");
    }
  } catch (error) {
    console.error("Login error:", error);
    showLoginError(`Authentication failed: ${error.message}`);
    accessCodeInput.value = "";
  } finally {
    showLoadingState(false);
  }
}

function logout() {
  // Clear all session data
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('accessLevel');
  sessionStorage.removeItem('lastView');
  
  // Reset application state
  currentUser = null;
  targets = [];
  clearTimeout(inactivityTimer);
  
  // Show login page
  showLogin();
}

function showLogin() {
  // Reset UI and scroll
  window.scrollTo({ top: 0, behavior: 'smooth' });
  resetLoginForm();
  
  // Update visibility
  loginPage.style.display = 'flex';
  dashboardPage.style.display = 'none';
  userDetailPage.style.display = 'none';
  
  // Focus management
  setTimeout(() => agentNameInput.focus(), 100);
}

function showDashboard() {
  // Reset scroll and UI
  window.scrollTo({ top: 0, behavior: 'smooth' });
  loginPage.style.display = 'none';
  dashboardPage.style.display = 'block';
  userDetailPage.style.display = 'none';
  
  // Update user greeting
  agentGreeting.textContent = currentUser.accessLevel === "admin" 
    ? `Welcome, Director ${currentUser.name}`
    : `Agent ${currentUser.name}, welcome back`;
  
  // Manage admin UI
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = currentUser.accessLevel === 'admin' ? 'flex' : 'none';
  });
  
  // Store session
  sessionStorage.setItem('lastView', 'dashboard');
  
  // Load content
  showLoadingState(true, 'Loading targets...');
  loadTargets()
    .catch(error => {
      showNotification(`Error loading targets: ${error.message}`, 'error');
    })
    .finally(() => {
      showLoadingState(false);
    });
  
  // Initialize components
  initializeDashboardComponents();
}

// Helper Functions
function initializeDashboardComponents() {
  // Focus first search field if empty
  if (!document.getElementById('firstName').value) {
    setTimeout(() => document.getElementById('firstName').focus(), 300);
  }
  
  // Initialize any plugins
  if (window.initTooltips) initTooltips();
}

function resetLoginForm() {
  // Clear inputs
  agentNameInput.value = '';
  accessCodeInput.value = '';
  
  // Reset card verification if exists
  if (cardPreview) cardPreview.style.display = 'none';
  if (cardCodeInput) cardCodeInput.value = '';
  if (codeVerificationGroup) codeVerificationGroup.style.display = 'none';
  
  // Clear errors
  document.querySelectorAll('.error-message').forEach(el => el.remove());
}

function showLoginError(message) {
  // Remove existing errors
  document.querySelectorAll('.error-message').forEach(el => el.remove());
  
  // Create new error element
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.textContent = message;
  
  // Insert after login button
  loginBtn.insertAdjacentElement('afterend', errorElement);
}

function showLoadingState(show, message = '') {
  const loader = document.getElementById('loadingIndicator') || createLoader();
  loader.innerHTML = message ? `<span>${message}</span>` : '';
  loader.style.display = show ? 'flex' : 'none';
}

// ===== LOADER UTILITY ===== //
function createLoader() {
  const loader = document.createElement('div');
  loader.id = 'global-loader';
  loader.className = 'global-loader';
  loader.innerHTML = `
    <div class="loader-spinner"></div>
    <div class="loader-text"></div>
  `;
  document.body.appendChild(loader);
  return loader;
}

function showLoadingState(show, message = '') {
  let loader = document.getElementById('global-loader');
  if (!loader) loader = createLoader();
  
  if (show) {
    const textEl = loader.querySelector('.loader-text');
    if (textEl) textEl.textContent = message;
    loader.style.display = 'flex';
    document.documentElement.style.pointerEvents = 'none';
  } else {
    loader.style.display = 'none';
    document.documentElement.style.pointerEvents = 'auto';
  }
}

// ===== NOTIFICATION SYSTEM ===== //
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.setAttribute('aria-live', 'polite');
  
  // Add icon based on type
  const iconMap = {
    success: '✓',
    error: '⚠',
    info: 'i'
  };
  notification.innerHTML = `
    <span class="notification-icon">${iconMap[type] || ''}</span>
    <span class="notification-message">${message}</span>
    <button class="notification-close" aria-label="Dismiss">&times;</button>
  `;
  
  // Add to DOM
  document.getElementById('notification-container')?.appendChild(notification) || 
    document.body.appendChild(notification);
  
  // Auto-dismiss
  const dismissTimer = setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 5000);
  
  // Manual dismiss
  notification.querySelector('.notification-close').addEventListener('click', () => {
    clearTimeout(dismissTimer);
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  });
}

// ===== SESSION MANAGEMENT ===== //
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  if (currentUser) {
    inactivityTimer = setTimeout(() => {
      showNotification('Session expired due to inactivity', 'warning');
      logout();
    }, LOGOUT_TIME);
    
    // Visual warning 1 minute before logout
    clearTimeout(warningTimer);
    warningTimer = setTimeout(() => {
      showNotification('Session will expire in 1 minute', 'warning');
    }, LOGOUT_TIME - 60000);
  }
}


// Target Management Functions
async function loadTargets() {
  try {
    const targetsRef = database.ref('targets');
    const snapshot = await targetsRef.once('value');
    
    targets = [];
    snapshot.forEach(childSnapshot => {
      const targetData = childSnapshot.val();
      targets.push({
        id: childSnapshot.key,
        ...targetData,
        lastSeenDate: targetData.lastSeen?.timestamp 
          ? new Date(targetData.lastSeen.timestamp) 
          : null,
        createdAt: targetData.createdAt ? new Date(targetData.createdAt) : null,
        lastModified: targetData.lastModified ? new Date(targetData.lastModified) : null
      });
    });

    resultsContainer.innerHTML = '';
    resultsInfo.textContent = targets.length 
      ? `Loaded ${targets.length} targets` 
      : 'No targets found';
    
  } catch (error) {
    console.error("Error loading targets:", error);
    alert("Failed to load targets. Please try again.");
  }
}

function searchTargets() {
  const firstName = document.getElementById('firstName').value.trim().toLowerCase();
  const lastName = document.getElementById('lastName').value.trim().toLowerCase();
  const fatherName = document.getElementById('fatherName').value.trim().toLowerCase();
  const vehiclePlate = document.getElementById('vehiclePlate').value.trim().toLowerCase();

  const filtered = targets.filter(target => (
    (!firstName || target.firstName?.toLowerCase().includes(firstName)) &&
    (!lastName || target.lastName?.toLowerCase().includes(lastName)) &&
    (!fatherName || target.fatherName?.toLowerCase().includes(fatherName)) &&
    (!vehiclePlate || target.vehiclePlate?.toLowerCase().includes(vehiclePlate))
  ));

  displayResults(filtered);
}

function displayResults(results) {
  resultsContainer.innerHTML = '';
  resultsInfo.textContent = `Showing ${results.length} result${results.length !== 1 ? 's' : ''}`;

  if (results.length === 0) {
    resultsContainer.innerHTML = '<div class="result-card">No targets found matching search criteria</div>';
    return;
  }

  results.forEach(target => {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <div class="result-card-header">
        <img src="${target.profilePhoto || DEFAULT_PROFILE_PHOTO}" 
            alt="${target.firstName} ${target.lastName}" 
            class="result-card-photo">
        <h3>${target.firstName} ${target.lastName}</h3>
      </div>
      <div class="result-field">
        <span class="field-label">Last Seen:</span>
        <span class="field-value">${
          target.lastSeenDate ? target.lastSeenDate.toLocaleString() : 'Unknown'
        }</span>
      </div>
      <div class="result-field">
        <span class="field-label">Identifiers:</span>
        <span class="field-value">${
          target.identifiers?.ip || target.identifiers?.steamId ? 
          (target.identifiers.ip || '') + (target.identifiers.steamId ? ` | ${target.identifiers.steamId}` : '') 
          : 'None'
        }</span>
      </div>
    `;
    card.addEventListener('click', () => showUserDetail(target.id));
    resultsContainer.appendChild(card);
  });
}

function showUserDetail(userId) {
  const target = targets.find(t => t.id === userId);
  if (!target) return;

  dashboardPage.style.display = 'none';
  userDetailPage.style.display = 'block';

  userDetailContent.innerHTML = `
    <div class="user-profile-header">
      <img src="${target.profilePhoto || DEFAULT_PROFILE_PHOTO}" 
          alt="Profile Photo" class="profile-photo">
      <div>
        <h3>${target.firstName} ${target.lastName}</h3>
        <small>ID: ${target.id}</small>
      </div>
    </div>
    
    <div class="user-detail-grid">
      <div class="detail-section">
        <h4>Personal Information</h4>
        ${createDetailField('Father\'s Name', target.fatherName)}
        ${createDetailField('Occupation', target.occupation)}
        ${createDetailField('Address', target.address)}
        ${createDetailField('Created By', target.createdBy)}
        ${createDetailField('Last Modified', target.lastModified?.toLocaleString())}
      </div>
      
      <div class="detail-section">
        <h4>Last Known Location</h4>
        ${target.lastSeen?.location ? `
          <div class="map-container" id="map-${target.id}"></div>
          <div class="coordinates">
            Latitude: ${target.lastSeen.location.lat}<br>
            Longitude: ${target.lastSeen.location.lng}
          </div>
        ` : 'No location data'}
        ${createDetailField('Last Seen', target.lastSeenDate?.toLocaleString())}
      </div>
      
      <div class="detail-section">
        <h4>Digital Identifiers</h4>
        ${createDetailField('IP Address', target.identifiers?.ip)}
        ${createDetailField('Steam ID', target.identifiers?.steamId)}
        ${createDetailField('Other IDs', target.identifiers?.otherIds?.join(', '))}
      </div>
      
      <div class="detail-section">
        <h4>Vehicle Information</h4>
        ${createDetailField('License Plate', target.vehiclePlate)}
        ${createDetailField('Last Vehicle Seen', target.vehicleLastSeen)}
      </div>
    </div>
  `;

  if (target.lastSeen?.location) {
    loadMap(target.id, target.lastSeen.location);
  }
}

function createDetailField(label, value) {
  return `
    <div class="result-field">
      <span class="field-label">${label}:</span>
      <span class="field-value">${value || 'Unknown'}</span>
    </div>
  `;
}

function loadMap(elementId, location) {
  setTimeout(() => {
    const mapElement = document.getElementById(`map-${elementId}`);
    if (mapElement) {
      mapElement.innerHTML = `
        <div class="map-placeholder">
          <p>Map view would display here for coordinates:</p>
          <p>${location.lat}, ${location.lng}</p>
        </div>
      `;
    }
  }, 100);
}

async function createNewTarget(e) {
  e.preventDefault();

  const newTarget = {
    firstName: document.getElementById('newFirstName').value.trim(),
    lastName: document.getElementById('newLastName').value.trim(),
    fatherName: document.getElementById('newFatherName').value.trim(),
    vehiclePlate: document.getElementById('newVehiclePlate').value.trim(),
    address: document.getElementById('newAddress').value.trim(),
    occupation: document.getElementById('newOccupation').value.trim(),
    identifiers: {
      ip: document.getElementById('newIpAddress').value.trim(),
      steamId: document.getElementById('newSteamId').value.trim(),
      otherIds: document.getElementById('newOtherIds').value.trim().split(',').map(id => id.trim())
    },
    lastSeen: {
      location: {
        lat: parseFloat(document.getElementById('newLastSeenLat').value) || 0,
        lng: parseFloat(document.getElementById('newLastSeenLng').value) || 0
      },
      timestamp: Date.now()
    },
    profilePhoto: document.getElementById('newProfilePhoto').value.trim() || DEFAULT_PROFILE_PHOTO,
    createdBy: currentUser.email || currentUser.name,
    lastModified: Date.now(),
    createdAt: Date.now()
  };

  try {
    const newTargetRef = database.ref('targets').push();
    await newTargetRef.set(newTarget);
    
    newUserModal.style.display = 'none';
    newUserForm.reset();
    loadTargets();
  } catch (error) {
    console.error("Error creating target:", error);
    alert("Failed to create new target. Please check your input.");
  }
}

async function restoreAgents() {
  const agents = {
    "agent1": {
      "name": "Stamoulis Antonios",
      "code": "W581[WX8oLcZ",
      "accessLevel": "admin"
    },
    "agent2": {
      "name": "Fytros Georgios",
      "code": "R0v/0{kn0M3q",
      "accessLevel": "agent"
    },
    "agent3": {
      "name": "Bousboura Nikoleta",
      "code": "X£g89Ogf41'2",
      "accessLevel": "agent"
    },
    "agent4": {
      "name": "Tsimpoukis Aristeidhs",
      "code": "!N`h&Ru5£93a",
      "accessLevel": "agent"
    }
  };

  try {
    const agentsRef = firebase.database().ref('agents');
    // Using update() instead of set() to preserve other data
    await agentsRef.update(agents);
    console.log("Agents restored successfully!");
  } catch (error) {
    console.error("Restoration failed:", error);
  }
}

// Execute this immediately
restoreAgents();

// Agent Import Function (Run once in console then remove)
async function importAgents() {
  const agents = {
    "Stamoulis Antonios": { code: "W581[WX8oLcZ", accessLevel: "admin" },
    "JANE SMITH": { code: "87654321", accessLevel: "agent" }
  };

  try {
    const agentsRef = database.ref('agents');
    for (const [name, data] of Object.entries(agents)) {
      await agentsRef.push({
        name: name.toUpperCase(),
        ...data
      });
    }
    console.log("Agents imported successfully!");
  } catch (error) {
    console.error("Import failed:", error);
  }
}

// Initialize the app when the page loads
window.addEventListener('DOMContentLoaded', init);

