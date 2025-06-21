// SIGMA Operation Launch System
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Map
    const map = L.map('operationMap').setView([38.038934, 23.682999], 13); // Default to Athens
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Operation Radius Circle
    let radiusCircle = L.circle(map.getCenter(), {
        color: 'var(--sig-accent)',
        fillColor: 'var(--sig-blue)',
        fillOpacity: 0.2,
        radius: 1000
    }).addTo(map);
    
    // Update radius display
    const radiusSlider = document.getElementById('radiusSlider');
    const radiusValue = document.getElementById('radiusValue');
    
    radiusSlider.addEventListener('input', function() {
        const radius = parseInt(this.value);
        radiusValue.textContent = `${radius} meters`;
        radiusCircle.setRadius(radius);
        updateOperationStatus();
    });
    
    // Agent tracking system
    const agentMarkers = {};
    const agentPaths = {};
    const operationMarkers = [];
    let operationActive = false;
    let missionStartTime = null;
    let missionTimer = null;
    
    // GPS Simulation (would be real GPS in production)
    function simulateGPS(agentId) {
        if (!agentMarkers[agentId]) return;
        
        const currentLatLng = agentMarkers[agentId].getLatLng();
        const movementFactor = operationActive ? 0.001 : 0.0001;
        const newLat = currentLatLng.lat + (Math.random() * movementFactor * 2 - movementFactor);
        const newLng = currentLatLng.lng + (Math.random() * movementFactor * 2 - movementFactor);
        
        // Update marker position
        agentMarkers[agentId].setLatLng([newLat, newLng]);
        
        // Update path
        if (!agentPaths[agentId]) {
            agentPaths[agentId] = L.polyline([], {color: 'var(--sig-accent)'}).addTo(map);
        }
        agentPaths[agentId].addLatLng([newLat, newLng]);
        
        // Update GPS status
        const statusElement = document.querySelector(`select[id$="Select"][value="${agentId}"]`).parentElement.querySelector('.gps-status');
        statusElement.textContent = `GPS: Active (${(Math.random() * 5 + 5).toFixed(1)}m accuracy)`;
        
        // Continue updating
        setTimeout(() => simulateGPS(agentId), 3000);
    }
    
    // Initialize agent markers when selected
    function initializeAgent(selectElement) {
        const agentId = selectElement.value;
        if (!agentId) return;
        
        if (!agentMarkers[agentId]) {
            const currentCenter = map.getCenter();
            const randomOffset = () => (Math.random() * 0.01 - 0.005);
            const agentLatLng = [
                currentCenter.lat + randomOffset(),
                currentCenter.lng + randomOffset()
            ];
            
            // Create marker with custom icon
            agentMarkers[agentId] = L.marker(agentLatLng, {
                icon: L.divIcon({
                    className: 'agent-marker',
                    html: '🟦',
                    iconSize: [30, 30]
                }),
                zIndexOffset: 1000
            }).addTo(map).bindPopup(`
                <b>${selectElement.options[selectElement.selectedIndex].text}</b><br>
                <span class="info-label">Role:</span> ${selectElement.id.replace('Select', '')}<br>
                <span class="info-label">Status:</span> Active
            `);
            
            // Start GPS simulation
            setTimeout(() => simulateGPS(agentId), 1000);
            
            // Update status
            const statusElement = selectElement.parentElement.querySelector('.gps-status');
            statusElement.textContent = "GPS: Acquiring signal...";
        }
        
        updateOperationStatus();
    }
    
    // Update operation status
    function updateOperationStatus() {
        const driver = document.getElementById('driverSelect').value;
        const center = document.getElementById('centerSelect').value;
        const agent1 = document.getElementById('agent1Select').value;
        const agent2 = document.getElementById('agent2Select').value;
        
        const agentsSelected = [driver, center, agent1, agent2].filter(Boolean).length;
        document.getElementById('agentsActiveText').textContent = `${agentsSelected}/4`;
        
        // Enable/disable start button
        const startBtn = document.getElementById('startOperationBtn');
        startBtn.disabled = agentsSelected < 4;
        
        // Update GPS coverage (simulated)
        const gpsCoverage = agentsSelected > 0 ? Math.min(100, agentsSelected * 25 + Math.random() * 10) : 0;
        document.getElementById('gpsCoverageText').textContent = `${gpsCoverage.toFixed(0)}%`;
    }
    
    // Setup agent select event listeners
    document.querySelectorAll('.agent-select').forEach(select => {
        select.addEventListener('change', function() {
            initializeAgent(this);
            updateOperationStatus();
        });
    });
    
    // Marker context menu system
    let contextMarker = null;
    
    map.on('contextmenu', function(e) {
        // Close any existing context menu
        document.getElementById('markerMenu').style.display = 'none';
        
        // Create new marker
        contextMarker = L.marker(e.latlng, {
            draggable: true
        }).addTo(map);
        
        // Show menu
        const menu = document.getElementById('markerMenu');
        menu.style.display = 'block';
        menu.style.left = `${e.originalEvent.clientX}px`;
        menu.style.top = `${e.originalEvent.clientY}px`;
    });
    
    // Marker menu handlers
    document.getElementById('setVictimBtn').addEventListener('click', function() {
        contextMarker.bindPopup(`
            <b>VICTIM LOCATION</b><br>
            <span class="info-label">Reported by:</span> User<br>
            <span class="info-label">Time:</span> ${new Date().toLocaleTimeString()}
        `).openPopup();
        contextMarker.setIcon(L.divIcon({
            className: 'victim-marker',
            html: '🟢',
            iconSize: [30, 30]
        }));
        operationMarkers.push(contextMarker);
        document.getElementById('markerMenu').style.display = 'none';
        showNotification("Victim location marked on map", "success");
    });
    
    document.getElementById('setSuspectBtn').addEventListener('click', function() {
        contextMarker.bindPopup(`
            <b>SUSPECT LOCATION</b><br>
            <span class="info-label">Reported by:</span> User<br>
            <span class="info-label">Time:</span> ${new Date().toLocaleTimeString()}
        `).openPopup();
        contextMarker.setIcon(L.divIcon({
            className: 'suspect-marker',
            html: '🔴',
            iconSize: [30, 30]
        }));
        operationMarkers.push(contextMarker);
        document.getElementById('markerMenu').style.display = 'none';
        showNotification("Suspect location marked on map", "warning");
    });
    
    document.getElementById('setLandmarkBtn').addEventListener('click', function() {
        contextMarker.bindPopup(`
            <b>LANDMARK</b><br>
            <span class="info-label">Added:</span> ${new Date().toLocaleTimeString()}
        `).openPopup();
        contextMarker.setIcon(L.divIcon({
            className: 'landmark-marker',
            html: '🟡',
            iconSize: [30, 30]
        }));
        operationMarkers.push(contextMarker);
        document.getElementById('markerMenu').style.display = 'none';
        showNotification("Landmark added to map", "info");
    });
    
    document.getElementById('removeMarkerBtn').addEventListener('click', function() {
        map.removeLayer(contextMarker);
        document.getElementById('markerMenu').style.display = 'none';
        showNotification("Marker removed", "info");
    });
    
    // Start operation button
    document.getElementById('startOperationBtn').addEventListener('click', function() {
        const driver = document.getElementById('driverSelect').value;
        const center = document.getElementById('centerSelect').value;
        const agent1 = document.getElementById('agent1Select').value;
        const agent2 = document.getElementById('agent2Select').value;
        
        if (!driver || !center || !agent1 || !agent2) {
            showNotification("You must assign all 4 roles to start operation", "error");
            return;
        }
        
        showLoading(true, "Initializing operation systems...");
        
        // Simulate operation initialization
        setTimeout(() => {
            operationActive = true;
            missionStartTime = new Date();
            startMissionTimer();
            
            document.getElementById('opStatusText').textContent = "Active";
            document.getElementById('opStatusText').style.color = "var(--sig-green)";
            
            // Zoom to include all agents and radius
            const bounds = radiusCircle.getBounds();
            map.fitBounds(bounds, {padding: [50, 50]});
            
            showLoading(false);
            showNotification("Operation successfully launched", "success");
            
            // Update all agent simulations to be more active
            Object.keys(agentMarkers).forEach(agentId => {
                simulateGPS(agentId);
            });
        }, 2000);
    });
    
    // Mission timer
    function startMissionTimer() {
        clearInterval(missionTimer);
        updateMissionTime();
        missionTimer = setInterval(updateMissionTime, 1000);
    }
    
    function updateMissionTime() {
        if (!missionStartTime) return;
        
        const now = new Date();
        const diff = now - missionStartTime;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('missionTimeText').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Notification system
    function showNotification(message, type) {
        const notification = document.getElementById('notification');
        const notificationMessage = document.getElementById('notificationMessage');
        
        notificationMessage.textContent = message;
        
        // Set color based on type
        notification.style.borderLeftColor = 
            type === "error" ? "var(--sig-red)" :
            type === "warning" ? "var(--sig-orange)" :
            type === "success" ? "var(--sig-green)" : "var(--sig-accent)";
        
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }
    
    // Loading overlay
    function showLoading(show, message = "") {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (message) loadingText.textContent = message;
        
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }
    
    // Close context menu when clicking elsewhere
    map.on('click', function() {
        document.getElementById('markerMenu').style.display = 'none';
    });
    
    // Initialize with a sample agent for demo purposes
    setTimeout(() => {
        document.getElementById('driverSelect').value = 'agent1';
        initializeAgent(document.getElementById('driverSelect'));
        
        document.getElementById('centerSelect').value = 'agent2';
        initializeAgent(document.getElementById('centerSelect'));
        
        document.getElementById('agent1Select').value = 'agent3';
        initializeAgent(document.getElementById('agent1Select'));
        
        document.getElementById('agent2Select').value = 'agent4';
        initializeAgent(document.getElementById('agent2Select'));
    }, 500);
});