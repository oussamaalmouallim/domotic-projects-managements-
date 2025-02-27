// Global variables
let clients = [];
let projects = [];
const stockManager = new StockManager();
let currentDomotiqueProject = null;
let currentProjectReport = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Load data from localStorage
    loadDataFromLocalStorage();
    
    initializeCalendar();
    updateClientsList();
    updateProjectsList();
    updateDashboard();
    
    // Default view
    showView('dashboard');
    
    // Add Domotique link to sidebar
    const domotiqueLinkExists = document.querySelector('.sidebar .nav-link[onclick="showView(\'domotique\')"]');
    if (!domotiqueLinkExists) {
        const calendarNavItem = document.querySelector('.sidebar .nav-link[onclick="showView(\'calendar\')"]').parentNode;
        const domotiqueNavItem = document.createElement('li');
        domotiqueNavItem.className = 'nav-item';
        domotiqueNavItem.innerHTML = `
            <a class="nav-link text-white" href="#" onclick="showView('domotique')">
                <i class="bi bi-house-gear me-2"></i> Domotique
            </a>
        `;
        calendarNavItem.parentNode.insertBefore(domotiqueNavItem, calendarNavItem);
    }
    
    // Add Project History link to sidebar
    const historyLinkExists = document.querySelector('.sidebar .nav-link[onclick="showView(\'history\')"]');
    if (!historyLinkExists) {
        const navItems = document.querySelectorAll('.sidebar .nav-item');
        const historyNavItem = document.createElement('li');
        historyNavItem.className = 'nav-item';
        historyNavItem.innerHTML = `
            <a class="nav-link text-white" href="#" onclick="showView('history')">
                <i class="bi bi-clock-history me-2"></i> Historique des projets
            </a>
        `;
        // Insert after reports
        const reportNavItem = document.querySelector('.sidebar .nav-link[onclick="showView(\'report\')"]').parentNode;
        reportNavItem.parentNode.insertBefore(historyNavItem, reportNavItem.nextSibling);
    }
    
    updateDomotiqueProjectList();
    updateProjectReportList();
    updateProjectHistoryList();
}); 

// Load data from localStorage
function loadDataFromLocalStorage() {
    // Load clients
    const savedClients = localStorage.getItem('clients');
    if (savedClients) {
        clients = JSON.parse(savedClients);
    }
    
    // Load projects with proper class instances
    const savedProjects = localStorage.getItem('projects');
    if (savedProjects) {
        const parsedProjects = JSON.parse(savedProjects);
        projects = parsedProjects.map(projectData => {
            const project = new Project(
                projectData.id,
                projectData.clientId,
                projectData.name,
                projectData.type
            );
            
            // Restore project properties
            project.status = projectData.status;
            project.history = projectData.history;
            project.startDate = projectData.startDate ? new Date(projectData.startDate) : null;
            project.endDate = projectData.endDate ? new Date(projectData.endDate) : null;
            
            // Restore locations and devices
            if (projectData.locations) {
                projectData.locations.forEach(locationData => {
                    const location = new Location(locationData.name);
                    location.notes = locationData.notes || '';
                    
                    // Add floor for villa type projects
                    if (locationData.floor) {
                        location.floor = locationData.floor;
                    }
                    
                    // Restore devices
                    if (locationData.devices) {
                        locationData.devices.forEach(deviceData => {
                            const device = new Device(deviceData.type, deviceData.name);
                            device.specifications = deviceData.specifications || {};
                            location.addDevice(device);
                        });
                    }
                    
                    project.addLocation(location);
                });
            }
            
            return project;
        });
    }
    
    // Load stock data
    const savedStock = localStorage.getItem('stock');
    if (savedStock) {
        const stockData = JSON.parse(savedStock);
        
        // Restore inventory
        if (stockData.inventory) {
            Object.entries(stockData.inventory).forEach(([itemId, quantity]) => {
                stockManager.inventory.set(itemId, quantity);
            });
        }
        
        // Restore minimum stock
        if (stockData.minStock) {
            Object.entries(stockData.minStock).forEach(([itemId, minQuantity]) => {
                stockManager.minStock.set(itemId, minQuantity);
            });
        }
        
        // Restore history
        if (stockData.history) {
            stockManager.history = stockData.history.map(entry => {
                return {
                    ...entry,
                    date: new Date(entry.date)
                };
            });
        }
    }
}

// Save data to localStorage
function saveDataToLocalStorage() {
    // Save clients
    localStorage.setItem('clients', JSON.stringify(clients));
    
    // Save projects
    localStorage.setItem('projects', JSON.stringify(projects));
    
    // Save stock data
    const stockData = {
        inventory: Object.fromEntries(stockManager.inventory),
        minStock: Object.fromEntries(stockManager.minStock),
        history: stockManager.history
    };
    localStorage.setItem('stock', JSON.stringify(stockData));
}

// Navigation
function showView(viewName) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('d-none');
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.sidebar .nav-link').forEach(el => {
        el.classList.remove('active');
    });
    
    // Show selected view
    document.getElementById(`${viewName}-view`).classList.remove('d-none');
    
    // Add active class to current nav link
    document.querySelector(`.sidebar .nav-link[onclick="showView('${viewName}')"]`).classList.add('active');
    
    // Special handling for calendar view
    if (viewName === 'calendar') {
        const calendarEl = document.getElementById('calendar');
        if (calendarEl._calendar) {
            calendarEl._calendar.render();
        }
    }
    
    // Update project lists when switching to specific views
    if (viewName === 'report') {
        updateProjectReportList();
    } else if (viewName === 'domotique') {
        updateDomotiqueProjectList();
    } else if (viewName === 'history') {
        updateProjectHistoryList();
    }
}

// Calendar functions
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        locale: 'fr',
        editable: true,
        selectable: true,
        select: function(info) {
            const title = prompt('Titre de l\'événement:');
            if (title) {
                calendar.addEvent({
                    title: title,
                    start: info.start,
                    end: info.end,
                    allDay: info.allDay
                });
            }
        },
        eventClick: function(info) {
            // Allow editing events
            if (confirm('Voulez-vous modifier cet événement?')) {
                const newTitle = prompt('Nouveau titre:', info.event.title);
                if (newTitle) {
                    info.event.setProp('title', newTitle);
                }
            }
        }
    });
    
    calendar.render();
    calendarEl._calendar = calendar; // Store reference for later
    
    // Add project dates to calendar
    updateCalendarWithProjects(calendar);
}

// Function to update calendar with project dates
function updateCalendarWithProjects(calendar) {
    if (!calendar) {
        const calendarEl = document.getElementById('calendar');
        calendar = calendarEl._calendar;
    }
    
    // Clear existing project events
    calendar.getEvents().forEach(event => {
        if (event.extendedProps.isProject) {
            event.remove();
        }
    });
    
    // Add project dates to calendar
    projects.forEach(project => {
        if (project.startDate || project.endDate) {
            const client = clients.find(c => c.id === project.clientId);
            const clientName = client ? client.name : 'Client inconnu';
            
            // Add start date event
            if (project.startDate) {
                calendar.addEvent({
                    title: `Début: ${project.name} (${clientName})`,
                    start: new Date(project.startDate),
                    allDay: true,
                    backgroundColor: '#28a745',
                    borderColor: '#28a745',
                    extendedProps: {
                        isProject: true,
                        projectId: project.id,
                        type: 'start'
                    }
                });
            }
            
            // Add end date event
            if (project.endDate) {
                calendar.addEvent({
                    title: `Fin prévue: ${project.name} (${clientName})`,
                    start: new Date(project.endDate),
                    allDay: true,
                    backgroundColor: '#dc3545',
                    borderColor: '#dc3545',
                    extendedProps: {
                        isProject: true,
                        projectId: project.id,
                        type: 'end'
                    }
                });
            }
        }
    });
}

// Client management
function showClientModal(type, clientId = null) {
    const modal = new bootstrap.Modal(document.getElementById('clientModal'));
    document.getElementById('clientForm').reset();
    
    if (type === 'edit' && clientId) {
        const numericId = Number(clientId);
        const client = clients.find(c => c.id === numericId);
        if (client) {
            document.getElementById('clientId').value = client.id;
            document.getElementById('clientName').value = client.name;
            document.getElementById('clientEmail').value = client.email;
            document.getElementById('clientPhone').value = client.phone;
            document.getElementById('clientAddress').value = client.address || '';
            document.getElementById('clientPriority').value = client.priority || 'normal';
        }
    } else {
        document.getElementById('clientId').value = '';
    }
    
    modal.show();
}

function saveClient() {
    const clientId = document.getElementById('clientId').value;
    const clientData = {
        id: clientId ? Number(clientId) : Date.now(),
        name: document.getElementById('clientName').value,
        email: document.getElementById('clientEmail').value,
        phone: document.getElementById('clientPhone').value,
        address: document.getElementById('clientAddress').value,
        priority: document.getElementById('clientPriority').value
    };

    const existingIndex = clients.findIndex(c => c.id === clientData.id);
    if (existingIndex >= 0) {
        clients[existingIndex] = clientData;
    } else {
        clients.push(clientData);
    }

    updateClientsList();
    updateDashboard();
    saveDataToLocalStorage(); // Save data after changes
    bootstrap.Modal.getInstance(document.getElementById('clientModal')).hide();
}

function deleteClient(clientId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
        const numericId = Number(clientId);
        clients = clients.filter(c => c.id !== numericId);
        updateClientsList();
        updateDashboard();
        saveDataToLocalStorage(); // Save data after changes
    }
}

function updateClientsList() {
    const clientsList = document.getElementById('clientsList');
    clientsList.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>Adresse</th>
                    <th>Priorité</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${clients.length === 0 ? 
                    `<tr><td colspan="7" class="text-center">Aucun client enregistré</td></tr>` : 
                    clients.map((client, index) => {
                        const priorityBadge = getPriorityBadge(client.priority);
                        return `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${client.name}</td>
                                <td>${client.email}</td>
                                <td>${client.phone}</td>
                                <td>${client.address || '-'}</td>
                                <td>${priorityBadge}</td>
                                <td>
                                    <button class="btn btn-sm btn-warning" onclick="showClientModal('edit', ${client.id})">
                                        <i class="bi bi-pencil me-1"></i> Modifier
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteClient(${client.id})">
                                        <i class="bi bi-trash me-1"></i> Supprimer
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')
                }
            </tbody>
        </table>
    `;
    
    // Update project client select options
    const clientSelect = document.getElementById('projectClient');
    if (clientSelect) {
        const currentValue = clientSelect.value;
        clientSelect.innerHTML = `
            <option value="">Sélectionner un client</option>
            ${clients.map(client => `
                <option value="${client.id}" ${currentValue == client.id ? 'selected' : ''}>
                    ${client.name}
                </option>
            `).join('')}
        `;
    }
}

function getPriorityBadge(priority) {
    switch(priority) {
        case 'haute':
            return '<span class="badge bg-danger">Haute</span>';
        case 'moyenne':
            return '<span class="badge bg-warning text-dark">Moyenne</span>';
        case 'normal':
        default:
            return '<span class="badge bg-success">Normal</span>';
    }
}

// Project management
function showProjectModal(type, projectId = null) {
    const modal = new bootstrap.Modal(document.getElementById('projectModal'));
    document.getElementById('projectForm').reset();
    
    if (type === 'edit' && projectId) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            document.getElementById('projectId').value = project.id;
            document.getElementById('projectName').value = project.name;
            document.getElementById('projectClient').value = project.clientId;
            document.getElementById('projectStatus').value = project.status;
            document.getElementById('projectType').value = project.type || 'appartement';
            if (project.startDate) {
                document.getElementById('projectStartDate').value = formatDateForInput(project.startDate);
            }
            if (project.endDate) {
                document.getElementById('projectEndDate').value = formatDateForInput(project.endDate);
            }
        }
    } else {
        document.getElementById('projectId').value = '';
    }
    
    modal.show();
}

function formatDateForInput(dateObj) {
    if (!dateObj) return '';
    const date = new Date(dateObj);
    return date.toISOString().split('T')[0];
}

function saveProject() {
    const projectId = document.getElementById('projectId').value;
    const clientId = Number(document.getElementById('projectClient').value);
    const projectName = document.getElementById('projectName').value;
    const projectStatus = document.getElementById('projectStatus').value;
    const projectType = document.getElementById('projectType').value;
    const startDate = document.getElementById('projectStartDate').value;
    const endDate = document.getElementById('projectEndDate').value;
    
    if (!projectName || !clientId) {
        alert('Veuillez remplir tous les champs requis');
        return;
    }
    
    if (projectId) {
        // Update existing project
        const project = projects.find(p => p.id === projectId);
        if (project) {
            // Track changes to add to history
            if (project.name !== projectName) {
                project.addToHistory(`Nom du projet modifié: ${project.name} → ${projectName}`);
            }
            if (project.status !== projectStatus) {
                project.addToHistory(`Statut du projet modifié: ${getStatusLabel(project.status)} → ${getStatusLabel(projectStatus)}`);
            }
            if (project.type !== projectType) {
                project.addToHistory(`Type du projet modifié: ${project.type === 'villa' ? 'Villa' : 'Appartement'} → ${projectType === 'villa' ? 'Villa' : 'Appartement'}`);
            }
            
            // Check for date changes
            const oldStartDate = project.startDate ? new Date(project.startDate).toLocaleDateString('fr-FR') : 'Non définie';
            const newStartDate = startDate ? new Date(startDate).toLocaleDateString('fr-FR') : 'Non définie';
            if (oldStartDate !== newStartDate) {
                project.addToHistory(`Date de début modifiée: ${oldStartDate} → ${newStartDate}`);
            }
            
            const oldEndDate = project.endDate ? new Date(project.endDate).toLocaleDateString('fr-FR') : 'Non définie';
            const newEndDate = endDate ? new Date(endDate).toLocaleDateString('fr-FR') : 'Non définie';
            if (oldEndDate !== newEndDate) {
                project.addToHistory(`Date de fin modifiée: ${oldEndDate} → ${newEndDate}`);
            }
            
            // Update the project properties
            project.name = projectName;
            project.clientId = clientId;
            project.status = projectStatus;
            project.type = projectType;
            project.startDate = startDate ? new Date(startDate) : null;
            project.endDate = endDate ? new Date(endDate) : null;
        }
    } else {
        // Create new project
        const newProject = new Project(Date.now().toString(), clientId, projectName, projectType);
        newProject.status = projectStatus;
        newProject.startDate = startDate ? new Date(startDate) : null;
        newProject.endDate = endDate ? new Date(endDate) : null;
        
        // Add creation event to history
        newProject.addToHistory('Projet créé');
        
        if (projectStatus !== 'non_commence') {
            newProject.addToHistory(`Statut initial: ${getStatusLabel(projectStatus)}`);
        }
        
        projects.push(newProject);
    }
    
    updateProjectsList();
    updateDashboard();
    updateCalendarWithProjects(); // Update calendar with project dates
    updateDomotiqueProjectList(); // Update project list in domotique view
    updateProjectReportList(); // Update project list in report view
    updateProjectHistoryList(); // Update project list in history view
    saveDataToLocalStorage(); // Save data after changes
    bootstrap.Modal.getInstance(document.getElementById('projectModal')).hide();
}

function getStatusLabel(status) {
    switch(status) {
        case 'non_commence': return 'Non commencé';
        case 'en_cours': return 'En cours';
        case 'en_attente': return 'En attente';
        case 'en_retard': return 'En retard';
        case 'termine': return 'Terminé';
        default: return 'Statut inconnu';
    }
}

function deleteProject(projectId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
        projects = projects.filter(p => p.id !== projectId);
        updateProjectsList();
        updateDashboard();
        updateCalendarWithProjects(); // Update calendar after deleting project
        updateDomotiqueProjectList(); // Update project list in domotique view
        updateProjectReportList(); // Update project list in report view
        updateProjectHistoryList(); // Update project list in history view
        saveDataToLocalStorage(); // Save data after changes
    }
}

function updateProjectsList() {
    const nonCommencesProjects = projects.filter(p => p.status === 'non_commence');
    const currentProjects = projects.filter(p => p.status === 'en_cours');
    const waitingProjects = projects.filter(p => p.status === 'en_attente');
    const lateProjects = projects.filter(p => p.status === 'en_retard');
    const completedProjects = projects.filter(p => p.status === 'termine');
    
    document.getElementById('projetsNonCommences').innerHTML = renderProjects(nonCommencesProjects);
    document.getElementById('projetsCours').innerHTML = renderProjects(currentProjects);
    document.getElementById('projetsAttente').innerHTML = renderProjects(waitingProjects);
    document.getElementById('projetsRetard').innerHTML = renderProjects(lateProjects);
    document.getElementById('projetsTermines').innerHTML = renderProjects(completedProjects);
}

function renderProjects(projectsList) {
    if (projectsList.length === 0) {
        return '<div class="col-12 text-center py-4">Aucun projet dans cette catégorie</div>';
    }
    
    return projectsList.map(project => {
        const client = clients.find(c => c.id === project.clientId);
        const clientName = client ? client.name : 'Client inconnu';
        const requirements = project.calculateRequirements();
        
        let statusClass, statusText;
        switch(project.status) {
            case 'non_commence':
                statusClass = 'bg-secondary';
                statusText = 'Non commencé';
                break;
            case 'en_cours':
                statusClass = 'bg-primary';
                statusText = 'En cours';
                break;
            case 'en_attente':
                statusClass = 'bg-warning text-dark';
                statusText = 'En attente';
                break;
            case 'en_retard':
                statusClass = 'bg-danger';
                statusText = 'En retard';
                break;
            case 'termine':
                statusClass = 'bg-success';
                statusText = 'Terminé';
                break;
            default:
                statusClass = 'bg-secondary';
                statusText = 'Statut inconnu';
        }
        
        // Format dates for display
        const startDateDisplay = project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Non définie';
        const endDateDisplay = project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Non définie';
        
        return `
            <div class="col-md-6 mb-4">
                <div class="card project-item">
                    <div class="card-header d-flex justify-content-between">
                        <h5>${project.name}</h5>
                        <div>
                            <button class="btn btn-sm btn-warning" onclick="showProjectModal('edit', '${project.id}')">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteProject('${project.id}')">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <p><strong>Client:</strong> ${clientName}</p>
                        <p><strong>Statut:</strong> <span class="badge ${statusClass}">${statusText}</span></p>
                        <p><strong>Date de début:</strong> ${startDateDisplay}</p>
                        <p><strong>Date de fin prévue:</strong> ${endDateDisplay}</p>
                        <p><strong>Équipements requis:</strong></p>
                        <ul>
                            <li>Relais: ${requirements.relais}</li>
                            <li>Variateurs: ${requirements.dimmers}</li>
                            <li>Contrôleurs: ${requirements.controllers}</li>
                        </ul>
                        <p><strong>Emplacements:</strong> ${project.locations.length}</p>
                        <button class="btn btn-outline-primary btn-sm">
                            Voir les détails
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Stock management
function showStockModal(type, itemId = null) {
    const modal = new bootstrap.Modal(document.getElementById('stockModal'));
    document.getElementById('stockForm').reset();
    
    if (type === 'edit' && itemId) {
        document.getElementById('stockItemId').value = itemId;
        document.getElementById('stockItemId').readOnly = true;
        document.getElementById('stockQuantity').value = stockManager.getStock(itemId);
        document.getElementById('stockMinQuantity').value = stockManager.minStock.get(itemId) || 5;
    } else {
        document.getElementById('stockItemId').readOnly = false;
    }
    
    modal.show();
}

function saveStock() {
    const itemId = document.getElementById('stockItemId').value;
    const quantity = parseInt(document.getElementById('stockQuantity').value, 10);
    const minQuantity = parseInt(document.getElementById('stockMinQuantity').value, 10);
    
    if (!itemId || isNaN(quantity) || quantity < 0) {
        alert('Veuillez remplir tous les champs correctement');
        return;
    }
    
    stockManager.addItem(itemId, quantity, minQuantity);
    updateStockList();
    updateDashboard();
    saveDataToLocalStorage(); // Save data after changes
    bootstrap.Modal.getInstance(document.getElementById('stockModal')).hide();
}

function removeStock(itemId) {
    const quantity = parseInt(prompt(`Quantité à retirer pour ${itemId}:`, "1"), 10);
    if (!isNaN(quantity) && quantity > 0) {
        if (stockManager.removeItem(itemId, quantity)) {
            updateStockList();
            updateDashboard();
            saveDataToLocalStorage(); // Save data after changes
        } else {
            alert('Stock insuffisant');
        }
    }
}

function updateStockList() {
    const stocksList = document.getElementById('stocksList');
    const items = Array.from(stockManager.inventory.keys());
    
    if (items.length === 0) {
        stocksList.innerHTML = '<p class="text-center">Aucun produit en stock</p>';
        return;
    }
    
    stocksList.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Produit</th>
                    <th>Quantité</th>
                    <th>Stock Min</th>
                    <th>Statut</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(itemId => {
                    const quantity = stockManager.getStock(itemId);
                    const minQuantity = stockManager.minStock.get(itemId) || 0;
                    const status = quantity <= minQuantity ? 
                        '<span class="badge bg-danger">Faible</span>' : 
                        '<span class="badge bg-success">OK</span>';
                    
                    return `
                        <tr>
                            <td>${itemId}</td>
                            <td>${quantity}</td>
                            <td>${minQuantity}</td>
                            <td>${status}</td>
                            <td>
                                <button class="btn btn-sm btn-warning me-1" onclick="showStockModal('edit', '${itemId}')">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-danger me-1" onclick="removeStock('${itemId}')">
                                    <i class="bi bi-dash-circle"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    // Update stock history
    const stockHistory = document.getElementById('stockHistory');
    const history = stockManager.getHistory().slice(-10).reverse(); // Get last 10 entries
    
    if (history.length === 0) {
        stockHistory.innerHTML = '<p class="text-center">Aucun historique</p>';
        return;
    }
    
    stockHistory.innerHTML = `
        <div class="list-group">
            ${history.map(entry => {
                const date = new Date(entry.date).toLocaleString();
                const action = entry.action === 'add' ? 'Ajout' : 'Retrait';
                const badgeClass = entry.action === 'add' ? 'bg-success' : 'bg-danger';
                
                return `
                    <div class="list-group-item list-group-item-action">
                        <div class="d-flex justify-content-between">
                            <span class="badge ${badgeClass}">${action}</span>
                            <small>${date}</small>
                        </div>
                        <p class="mb-1">${entry.itemId}: ${entry.quantity}</p>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Dashboard updates
function updateDashboard() {
    // Update counts
    document.getElementById('client-count').textContent = clients.length;
    document.getElementById('project-count').textContent = projects.length;
    document.getElementById('stock-count').textContent = stockManager.inventory.size;
    
    // Update recent projects
    const recentProjects = projects.slice(0, 3);
    const recentProjectsEl = document.getElementById('recent-projects');
    
    if (recentProjects.length === 0) {
        recentProjectsEl.innerHTML = '<p class="text-muted">Aucun projet récent</p>';
    } else {
        recentProjectsEl.innerHTML = `
            <div class="list-group">
                ${recentProjects.map(project => {
                    const client = clients.find(c => c.id === project.clientId);
                    const clientName = client ? client.name : 'Client inconnu';
                    
                    let statusClass, statusText;
                    switch(project.status) {
                        case 'non_commence':
                            statusClass = 'bg-secondary';
                            statusText = 'Non commencé';
                            break;
                        case 'en_cours':
                            statusClass = 'bg-primary';
                            statusText = 'En cours';
                            break;
                        case 'en_attente':
                            statusClass = 'bg-warning text-dark';
                            statusText = 'En attente';
                            break;
                        case 'en_retard':
                            statusClass = 'bg-danger';
                            statusText = 'En retard';
                            break;
                        case 'termine':
                            statusClass = 'bg-success';
                            statusText = 'Terminé';
                            break;
                        default:
                            statusClass = 'bg-secondary';
                            statusText = 'Statut inconnu';
                    }
                    
                    return `
                        <div class="list-group-item list-group-item-action">
                            <div class="d-flex justify-content-between">
                                <h6>${project.name}</h6>
                                <span class="badge ${statusClass}">${statusText}</span>
                            </div>
                            <p class="mb-1">Client: ${clientName}</p>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    // Update low stock
    const lowStockItems = stockManager.checkLowStock();
    const lowStockEl = document.getElementById('low-stock');
    
    if (lowStockItems.length === 0) {
        lowStockEl.innerHTML = '<p class="text-muted">Aucun stock à faible niveau</p>';
    } else {
        lowStockEl.innerHTML = `
            <div class="list-group">
                ${lowStockItems.map(item => `
                    <div class="list-group-item list-group-item-action">
                        <div class="d-flex justify-content-between">
                            <h6>${item.itemId}</h6>
                            <span class="badge bg-danger">Faible</span>
                        </div>
                        <p class="mb-1">Quantité: ${item.quantity} / Min: ${item.minQuantity}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// Project Report functions
function updateProjectReportList() {
    const projectSelect = document.getElementById('report-project-select');
    if (projectSelect) {
        const currentValue = projectSelect.value;
        projectSelect.innerHTML = `
            <option value="">Sélectionner un projet</option>
            ${projects.map(project => {
                const client = clients.find(c => c.id === project.clientId);
                const clientName = client ? client.name : 'Client inconnu';
                return `
                    <option value="${project.id}" ${currentValue === project.id ? 'selected' : ''}>
                        ${project.name} (${clientName})
                    </option>
                `;
            }).join('')}
        `;
    }
}

function generateProjectReport() {
    const projectId = document.getElementById('report-project-select').value;
    const reportContainer = document.getElementById('project-report-container');
    
    if (!projectId) {
        reportContainer.innerHTML = '<div class="alert alert-warning">Veuillez sélectionner un projet</div>';
        currentProjectReport = null;
        return;
    }
    
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
        reportContainer.innerHTML = '<div class="alert alert-danger">Projet non trouvé</div>';
        return;
    }
    
    currentProjectReport = new ProjectReport(project);
    const reportData = currentProjectReport.generateSummary();
    const clientInfo = currentProjectReport.getClientInfo();
    
    // Get status info
    let statusClass, statusText;
    switch(project.status) {
        case 'non_commence':
            statusClass = 'bg-secondary';
            statusText = 'Non commencé';
            break;
        case 'en_cours':
            statusClass = 'bg-primary';
            statusText = 'En cours';
            break;
        case 'en_attente':
            statusClass = 'bg-warning text-dark';
            statusText = 'En attente';
            break;
        case 'en_retard':
            statusClass = 'bg-danger';
            statusText = 'En retard';
            break;
        case 'termine':
            statusClass = 'bg-success';
            statusText = 'Terminé';
            break;
        default:
            statusClass = 'bg-secondary';
            statusText = 'Statut inconnu';
    }
    
    // Create device counts for summary
    const deviceTypesTranslation = {
        'ON_OFF': 'Éclairage ON/OFF',
        'DIMMER': 'Éclairage variation DIM',
        'SONORISATION': 'Sonorisation',
        'CLIMATISATION': 'Climatisation',
        'CHAUFFAGE': 'Chauffage',
        'CAMERA': 'Caméra',
        'VOLET': 'Volet roulant',
        'ECRAN': 'Écran',
        'VIDEOPHONIE': 'Vidéophonie',
        'WIFI': 'WiFi'
    };
    
    const deviceCountsHtml = Object.entries(reportData.deviceCounts)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => `
            <div class="col-md-4 col-sm-6 mb-3">
                <div class="card border-light h-100">
                    <div class="card-body text-center">
                        <h5 class="device-count">${count}</h5>
                        <p class="text-muted">${deviceTypesTranslation[type] || type}</p>
                    </div>
                </div>
            </div>
        `).join('');
    
    // Create locations detailed summary
    let locationsHtml = '';
    
    // Check if the project is a villa type to group by floors
    if (project.type === 'villa') {
        // Group locations by floor
        const floorLocations = {
            'SOUS_SOL': [],
            'RDC': [],
            'ETAGE': []
        };
        
        // Assign locations to their respective floors
        reportData.locationSummary.forEach(location => {
            const originalLocation = project.locations.find(l => l.name === location.name);
            const floor = originalLocation && originalLocation.floor ? originalLocation.floor : 'RDC';
            floorLocations[floor].push(location);
        });
        
        // Render locations grouped by floor
        locationsHtml = Object.entries(floorLocations).map(([floor, locations]) => {
            const floorName = getFloorName(floor);
            
            // Skip empty floors
            if (locations.length === 0) {
                return '';
            }
            
            // Create locations cards for this floor
            const floorLocationsHtml = locations.map(location => {
                const devicesList = Object.entries(location.devicesByType).map(([type, devices]) => {
                    return devices.map(device => {
                        let deviceDetails = deviceTypesTranslation[type] || type;
                        
                        // Special handling for screens with specifications
                        if (type === 'ECRAN' && device.specifications && device.specifications.screenType) {
                            deviceDetails += ` (${device.specifications.screenType})`;
                        }
                        
                        return `<li>${deviceDetails}</li>`;
                    }).join('');
                }).join('');
                
                return `
                    <div class="col-md-6 mb-4">
                        <div class="card location-summary-card">
                            <div class="card-header">
                                <h5>${location.name}</h5>
                            </div>
                            <div class="card-body">
                                <p><strong>Nombre d'équipements:</strong> ${location.deviceCount}</p>
                                <p><strong>Équipements:</strong></p>
                                <ul>
                                    ${devicesList || '<li>Aucun équipement</li>'}
                                </ul>
                                ${location.notes ? `<p><strong>Notes:</strong> ${location.notes}</p>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
            
            // Return the floor section with its locations
            return `
                <div class="mb-4">
                    <div class="floor-heading">
                        <h4>${floorName}</h4>
                    </div>
                    <div class="row">
                        ${floorLocationsHtml}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        // Regular rendering for apartments (no floors)
        locationsHtml = `
            <div class="row">
                ${reportData.locationSummary.map(location => {
                    const devicesList = Object.entries(location.devicesByType).map(([type, devices]) => {
                        return devices.map(device => {
                            let deviceDetails = deviceTypesTranslation[type] || type;
                            
                            // Special handling for screens with specifications
                            if (type === 'ECRAN' && device.specifications && device.specifications.screenType) {
                                deviceDetails += ` (${device.specifications.screenType})`;
                            }
                            
                            return `<li>${deviceDetails}</li>`;
                        }).join('');
                    }).join('');
                    
                    return `
                        <div class="col-md-6 mb-4">
                            <div class="card location-summary-card">
                                <div class="card-header">
                                    <h5>${location.name}</h5>
                                </div>
                                <div class="card-body">
                                    <p><strong>Nombre d'équipements:</strong> ${location.deviceCount}</p>
                                    <p><strong>Équipements:</strong></p>
                                    <ul>
                                        ${devicesList || '<li>Aucun équipement</li>'}
                                    </ul>
                                    ${location.notes ? `<p><strong>Notes:</strong> ${location.notes}</p>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    // Format dates for display
    const startDateDisplay = project.startDate ? new Date(project.startDate).toLocaleDateString('fr-FR') : 'Non définie';
    const endDateDisplay = project.endDate ? new Date(project.endDate).toLocaleDateString('fr-FR') : 'Non définie';
    
    // Render complete report
    reportContainer.innerHTML = `
        <div class="report-header mb-4">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h2>${project.name}</h2>
                    <p class="text-muted">Client: ${clientInfo.name}</p>
                    <p>
                        <span class="badge ${statusClass}">${statusText}</span>
                        <span class="ms-3"><i class="bi bi-calendar-event"></i> Début: ${startDateDisplay}</span>
                        <span class="ms-3"><i class="bi bi-calendar-check"></i> Fin prévue: ${endDateDisplay}</span>
                    </p>
                    <p><strong>Type de projet:</strong> ${project.type === 'villa' ? 'Villa' : 'Appartement'}</p>
                </div>
                <div class="col-md-4 text-end">
                    <button class="btn btn-outline-primary" onclick="printReport()">
                        <i class="bi bi-printer"></i> Imprimer
                    </button>
                    <button class="btn btn-outline-secondary" onclick="exportReportPDF()">
                        <i class="bi bi-file-earmark-pdf"></i> Exporter PDF
                    </button>
                </div>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h4>Résumé des équipements</h4>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            ${deviceCountsHtml || '<div class="col-12 text-center">Aucun équipement configuré</div>'}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="mb-4">
            <h4>Détails par emplacement</h4>
            ${locationsHtml || '<div class="col-12 text-center">Aucun emplacement configuré</div>'}
        </div>
    `;
}

function printReport() {
    if (!currentProjectReport) {
        alert('Veuillez d\'abord générer un rapport');
        return;
    }
    
    window.print();
}

function exportReportPDF() {
    // In a real app, this would connect to a PDF generation library
    alert('Fonctionnalité d\'export PDF à implémenter');
}

// Domotique functions
function updateDomotiqueProjectList() {
    const projectSelect = document.getElementById('domotique-project-select');
    if (projectSelect) {
        const currentValue = projectSelect.value;
        projectSelect.innerHTML = `
            <option value="">Sélectionner un projet</option>
            ${projects.map(project => {
                const client = clients.find(c => c.id === project.clientId);
                const clientName = client ? client.name : 'Client inconnu';
                return `
                    <option value="${project.id}" ${currentValue === project.id ? 'selected' : ''}>
                        ${project.name} (${clientName})
                    </option>
                `;
            }).join('')}
        `;
    }
}

function loadProjectLocations() {
    const projectId = document.getElementById('domotique-project-select').value;
    const locationsContainer = document.getElementById('locations-container');
    
    if (!projectId) {
        locationsContainer.innerHTML = '<p class="text-center">Veuillez sélectionner un projet</p>';
        currentDomotiqueProject = null;
        return;
    }
    
    currentDomotiqueProject = projects.find(p => p.id === projectId);
    
    if (!currentDomotiqueProject) {
        locationsContainer.innerHTML = '<p class="text-center">Projet non trouvé</p>';
        return;
    }
    
    renderLocations();
}

function renderLocations() {
    const locationsContainer = document.getElementById('locations-container');
    const isVilla = currentDomotiqueProject.type === 'villa';
    
    if (!currentDomotiqueProject) {
        locationsContainer.innerHTML = '<p class="text-center">Aucun projet sélectionné</p>';
        return;
    }
    
    if (currentDomotiqueProject.locations.length === 0) {
        locationsContainer.innerHTML = `
            <p class="text-center">Aucun emplacement configuré pour ce projet</p>
            <div class="text-center mt-3">
                <button class="btn btn-primary" onclick="addNewLocation()">
                    <i class="bi bi-plus-circle me-2"></i>Ajouter un emplacement
                </button>
            </div>
        `;
        return;
    }
    
    if (isVilla) {
        // Group locations by floor
        const floorLocations = {
            'SOUS_SOL': [],
            'RDC': [],
            'ETAGE': []
        };
        
        currentDomotiqueProject.locations.forEach((location, index) => {
            if (location.floor) {
                floorLocations[location.floor].push({ location, index });
            } else {
                // For backward compatibility with old data
                floorLocations['RDC'].push({ location, index });
            }
        });
        
        // Render locations by floor
        locationsContainer.innerHTML = `
            <div class="accordion" id="floorAccordion">
                ${Object.entries(floorLocations).map(([floor, locations]) => {
                    const floorName = getFloorName(floor);
                    return `
                        <div class="accordion-item">
                            <h2 class="accordion-header">
                                <button class="accordion-button ${floor === 'RDC' ? '' : 'collapsed'}" type="button" 
                                        data-bs-toggle="collapse" data-bs-target="#collapse${floor}">
                                    ${floorName} (${locations.length} emplacements)
                                </button>
                            </h2>
                            <div id="collapse${floor}" class="accordion-collapse collapse ${floor === 'RDC' ? 'show' : ''}" 
                                 data-bs-parent="#floorAccordion">
                                <div class="accordion-body">
                                    ${locations.length > 0 ? 
                                        locations.map(({ location, index }) => renderLocationCard(location, index)).join('') : 
                                        `<p class="text-center">Aucun emplacement sur ${floorName.toLowerCase()}</p>`
                                    }
                                    <div class="text-center mt-3">
                                        <button class="btn btn-primary" onclick="addNewLocation('${floor}')">
                                            <i class="bi bi-plus-circle me-2"></i>Ajouter un emplacement sur ${floorName.toLowerCase()}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else {
        // Regular rendering for apartments (no floors)
        locationsContainer.innerHTML = currentDomotiqueProject.locations.map((location, index) => {
            return renderLocationCard(location, index);
        }).join('');
    }
    
    // Add event listeners for notes
    document.querySelectorAll('.location-notes').forEach(textarea => {
        textarea.addEventListener('change', function() {
            const index = this.getAttribute('data-index');
            currentDomotiqueProject.locations[index].notes = this.value;
        });
    });
}

function getFloorName(floor) {
    switch(floor) {
        case 'SOUS_SOL': return 'Sous-sol';
        case 'RDC': return 'Rez-de-chaussée';
        case 'ETAGE': return 'Étage';
        default: return floor;
    }
}

function renderLocationCard(location, index) {
    return `
        <div class="card mb-3 location-card" data-index="${index}">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5>${location.name}</h5>
                <div>
                    <button class="btn btn-sm btn-danger" onclick="removeLocation(${index})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        ${renderDeviceCheckbox(index, 'ON_OFF', 'Éclairage ON/OFF', location)}
                        ${renderDeviceCheckbox(index, 'DIMMER', 'Éclairage variation DIM', location)}
                        ${renderDeviceCheckbox(index, 'SONORISATION', 'Sonorisation', location)}
                        ${renderDeviceCheckbox(index, 'CLIMATISATION', 'Climatisation', location)}
                        ${renderDeviceCheckbox(index, 'CHAUFFAGE', 'Chauffage', location)}
                    </div>
                    <div class="col-md-6">
                        ${renderDeviceCheckbox(index, 'CAMERA', 'Caméra', location)}
                        ${renderDeviceCheckbox(index, 'VOLET', 'Volet roulant', location)}
                        ${renderDeviceCheckbox(index, 'ECRAN', 'Écran', location)}
                        ${renderDeviceCheckbox(index, 'VIDEOPHONIE', 'Vidéophonie', location)}
                        ${renderDeviceCheckbox(index, 'WIFI', 'WiFi', location)}
                    </div>
                </div>
                <div class="mt-3">
                    <label class="form-label">Notes:</label>
                    <textarea class="form-control location-notes" data-index="${index}" rows="2">${location.notes || ''}</textarea>
                </div>
            </div>
        </div>
    `;
}

function renderDeviceCheckbox(locationIndex, deviceType, label, location) {
    const device = location.devices.find(d => d.type === deviceType);
    const isChecked = device !== undefined;
    
    let additionalInfo = '';
    if (isChecked && deviceType === 'ECRAN' && device.specifications && device.specifications.screenType) {
        additionalInfo = ` <span class="badge bg-info">${device.specifications.screenType}</span>`;
    }
    
    return `
        <div class="form-check mb-2">
            <input class="form-check-input device-checkbox" type="checkbox" 
                   id="device-${locationIndex}-${deviceType}" 
                   data-location="${locationIndex}" 
                   data-type="${deviceType}" 
                   ${isChecked ? 'checked' : ''} 
                   onchange="toggleDevice(${locationIndex}, '${deviceType}', this.checked)">
            <label class="form-check-label" for="device-${locationIndex}-${deviceType}">
                ${label}${additionalInfo}
            </label>
        </div>
    `;
}

function toggleDevice(locationIndex, deviceType, isChecked) {
    if (!currentDomotiqueProject) return;
    
    const location = currentDomotiqueProject.locations[locationIndex];
    
    if (isChecked) {
        // Add device if it doesn't exist
        if (!location.devices.some(d => d.type === deviceType)) {
            const newDevice = new Device(deviceType, getDeviceName(deviceType));
            
            // For ECRAN devices, show the screen selection modal
            if (deviceType === 'ECRAN') {
                showScreenSelectionModal(locationIndex, newDevice);
            } else {
                location.addDevice(newDevice);
                
                // Add to history - track device addition
                currentDomotiqueProject.addToHistory(`Équipement ajouté: ${getDeviceName(deviceType)} à ${location.name}`);
                
                saveDataToLocalStorage(); // Save data after changes
            }
        }
    } else {
        // Remove device if it exists
        const deviceExists = location.devices.some(d => d.type === deviceType);
        if (deviceExists) {
            location.devices = location.devices.filter(d => d.type !== deviceType);
            
            // Add to history - track device removal
            currentDomotiqueProject.addToHistory(`Équipement supprimé: ${getDeviceName(deviceType)} de ${location.name}`);
            
            saveDataToLocalStorage(); // Save data after changes
        }
    }
}

function getDeviceName(deviceType) {
    const names = {
        'ON_OFF': 'Éclairage ON/OFF',
        'DIMMER': 'Éclairage variation DIM',
        'SONORISATION': 'Sonorisation',
        'CLIMATISATION': 'Climatisation',
        'CHAUFFAGE': 'Chauffage',
        'CAMERA': 'Caméra',
        'VOLET': 'Volet roulant',
        'ECRAN': 'Écran',
        'VIDEOPHONIE': 'Vidéophonie',
        'WIFI': 'WiFi'
    };
    return names[deviceType] || deviceType;
}

function showScreenSelectionModal(locationIndex, device) {
    // Create modal if it doesn't exist
    if (!document.getElementById('screenSelectionModal')) {
        const modalHtml = `
            <div class="modal fade" id="screenSelectionModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Sélection du type d'écran</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Veuillez sélectionner le type d'écran :</p>
                            <div class="form-check mb-2">
                                <input class="form-check-input" type="radio" name="screenType" id="screenSAT101" value="SAT101" checked>
                                <label class="form-check-label" for="screenSAT101">
                                    Écran SAT101
                                </label>
                            </div>
                            <div class="form-check mb-2">
                                <input class="form-check-input" type="radio" name="screenType" id="screenSAT57" value="SAT57">
                                <label class="form-check-label" for="screenSAT57">
                                    Écran SAT57
                                </label>
                            </div>
                            <div class="form-check mb-2">
                                <input class="form-check-input" type="radio" name="screenType" id="screenSAT40" value="SAT40">
                                <label class="form-check-label" for="screenSAT40">
                                    Écran SAT40
                                </label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                            <button type="button" class="btn btn-primary" id="confirmScreenType">Confirmer</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
    }
    
    // Store current location index and device in modal for reference
    const modal = document.getElementById('screenSelectionModal');
    modal.dataset.locationIndex = locationIndex;
    
    // Show the modal
    const screenModal = new bootstrap.Modal(modal);
    screenModal.show();
    
    // Add event listener for confirmation button
    document.getElementById('confirmScreenType').onclick = function() {
        const selectedScreenType = document.querySelector('input[name="screenType"]:checked').value;
        const locationIndex = modal.dataset.locationIndex;
        
        // Update device name and specifications
        device.name = `Écran ${selectedScreenType}`;
        device.updateSpecifications({ screenType: selectedScreenType });
        
        // Add device to location
        currentDomotiqueProject.locations[locationIndex].addDevice(device);
        
        // Refresh the UI
        renderLocations();
        
        // Hide the modal
        screenModal.hide();
    };
}

function addNewLocation(floor = null) {
    if (!currentDomotiqueProject) {
        alert('Veuillez d\'abord sélectionner un projet');
        return;
    }
    
    showLocationSelectionModal(floor);
}

function showLocationSelectionModal(selectedFloor = null) {
    const isVilla = currentDomotiqueProject.type === 'villa';
    
    // Create modal if it doesn't exist
    if (!document.getElementById('locationSelectionModal')) {
        const predefinedLocations = [
            'Salon',
            'Salon Europe',
            'Chambre',
            'Chambre parentale',
            'Bibliothèque',
            'Cinema',
            'SDB',
            'Dressing',
            'Cuisine',
            'Hall',
            'Jardin',
            'Piscine',
            'Bureau',
            'Salle de jeux',
            'Espace de lecture',
            'Terasse'
        ];
        
        // Group locations by category to make selection easier
        const locationGroups = {
            'Pièces principales': ['Salon', 'Salon Europe', 'Chambre', 'Chambre parentale'],
            'Pièces de détente': ['Bibliothèque', 'Cinema', 'Bureau', 'Salle de jeux', 'Espace de lecture'],
            'Pièces de service': ['Cuisine', 'SDB', 'Dressing', 'Hall'],
            'Extérieur': ['Jardin', 'Piscine', 'Terasse']
        };
        
        let locationOptionsHtml = '';
        Object.entries(locationGroups).forEach(([groupName, locations]) => {
            locationOptionsHtml += `
                <div class="card mb-3">
                    <div class="card-header">
                        ${groupName}
                    </div>
                    <div class="card-body">
                        <div class="row">
            `;
            
            locations.forEach(location => {
                locationOptionsHtml += `
                    <div class="col-md-6 mb-2">
                        <div class="form-check">
                            <input class="form-check-input location-option" type="checkbox" name="locationOption" id="location-${location}" value="${location}">
                            <label class="form-check-label" for="location-${location}">
                                ${location}
                            </label>
                        </div>
                    </div>
                `;
            });
            
            locationOptionsHtml += `
                        </div>
                    </div>
                </div>
            `;
        });
        
        const modalHtml = `
            <div class="modal fade" id="locationSelectionModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Sélection de l'emplacement</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${isVilla ? `
                            <div id="floor-selection" class="mb-3">
                                <label class="form-label">Étage:</label>
                                <select class="form-select" id="floor-select">
                                    <option value="SOUS_SOL">Sous-sol</option>
                                    <option value="RDC" selected>Rez-de-chaussée</option>
                                    <option value="ETAGE">Étage</option>
                                </select>
                            </div>
                            ` : ''}
                            <p>Veuillez sélectionner un ou plusieurs emplacements :</p>
                            <div class="mt-3 location-selection-group">
                                ${locationOptionsHtml}
                            </div>
                            <div class="mt-3">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" name="locationOption" id="location-other" value="other">
                                    <label class="form-check-label" for="location-other">
                                        Autre (préciser)
                                    </label>
                                </div>
                                <div id="custom-location-container" class="mt-2 d-none">
                                    <input type="text" class="form-control" id="custom-location-name" placeholder="Nom de l'emplacement">
                                </div>
                            </div>
                            
                            <div id="equipment-selection-container" class="mt-4 d-none">
                                <h5>Équipements pour ces emplacements</h5>
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-check mb-2">
                                            <input class="form-check-input bulk-device-checkbox" type="checkbox" id="bulk-device-ON_OFF" data-type="ON_OFF">
                                            <label class="form-check-label" for="bulk-device-ON_OFF">
                                                Éclairage ON/OFF
                                            </label>
                                        </div>
                                        <div class="form-check mb-2">
                                            <input class="form-check-input bulk-device-checkbox" type="checkbox" id="bulk-device-DIMMER" data-type="DIMMER">
                                            <label class="form-check-label" for="bulk-device-DIMMER">
                                                Éclairage variation DIM
                                            </label>
                                        </div>
                                        <div class="form-check mb-2">
                                            <input class="form-check-input bulk-device-checkbox" type="checkbox" id="bulk-device-SONORISATION" data-type="SONORISATION">
                                            <label class="form-check-label" for="bulk-device-SONORISATION">
                                                Sonorisation
                                            </label>
                                        </div>
                                        <div class="form-check mb-2">
                                            <input class="form-check-input bulk-device-checkbox" type="checkbox" id="bulk-device-CLIMATISATION" data-type="CLIMATISATION">
                                            <label class="form-check-label" for="bulk-device-CLIMATISATION">
                                                Climatisation
                                            </label>
                                        </div>
                                        <div class="form-check mb-2">
                                            <input class="form-check-input bulk-device-checkbox" type="checkbox" id="bulk-device-CHAUFFAGE" data-type="CHAUFFAGE">
                                            <label class="form-check-label" for="bulk-device-CHAUFFAGE">
                                                Chauffage
                                            </label>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-check mb-2">
                                            <input class="form-check-input bulk-device-checkbox" type="checkbox" id="bulk-device-CAMERA" data-type="CAMERA">
                                            <label class="form-check-label" for="bulk-device-CAMERA">
                                                Caméra
                                            </label>
                                        </div>
                                        <div class="form-check mb-2">
                                            <input class="form-check-input bulk-device-checkbox" type="checkbox" id="bulk-device-VOLET" data-type="VOLET">
                                            <label class="form-check-label" for="bulk-device-VOLET">
                                                Volet roulant
                                            </label>
                                        </div>
                                        <div class="form-check mb-2">
                                            <input class="form-check-input bulk-device-checkbox" type="checkbox" id="bulk-device-ECRAN" data-type="ECRAN">
                                            <label class="form-check-label" for="bulk-device-ECRAN">
                                                Écran
                                            </label>
                                        </div>
                                        <div class="form-check mb-2">
                                            <input class="form-check-input bulk-device-checkbox" type="checkbox" id="bulk-device-VIDEOPHONIE" data-type="VIDEOPHONIE">
                                            <label class="form-check-label" for="bulk-device-VIDEOPHONIE">
                                                Vidéophonie
                                            </label>
                                        </div>
                                        <div class="form-check mb-2">
                                            <input class="form-check-input bulk-device-checkbox" type="checkbox" id="bulk-device-WIFI" data-type="WIFI">
                                            <label class="form-check-label" for="bulk-device-WIFI">
                                                WiFi
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div id="bulk-screen-selection" class="mt-3 d-none">
                                    <label class="form-label">Type d'écran:</label>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="bulkScreenType" id="bulkScreenSAT101" value="SAT101" checked>
                                        <label class="form-check-label" for="bulkScreenSAT101">
                                            Écran SAT101
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="bulkScreenType" id="bulkScreenSAT57" value="SAT57">
                                        <label class="form-check-label" for="bulkScreenSAT57">
                                            Écran SAT57
                                        </label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" name="bulkScreenType" id="bulkScreenSAT40" value="SAT40">
                                        <label class="form-check-label" for="bulkScreenSAT40">
                                            Écran SAT40
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                            <button type="button" class="btn btn-primary" id="confirmLocationSelection">Confirmer</button>
                            <button type="button" class="btn btn-outline-primary" id="selectAllLocations">Tout sélectionner</button>
                            <button type="button" class="btn btn-outline-secondary" id="deselectAllLocations">Tout désélectionner</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer);
        
        // Add event listener for "other" option to show/hide custom location input
        document.getElementById('location-other').addEventListener('change', function() {
            if (this.checked) {
                document.getElementById('custom-location-container').classList.remove('d-none');
            } else {
                document.getElementById('custom-location-container').classList.add('d-none');
            }
        });
        
        // Add event listeners for select all / deselect all buttons
        document.getElementById('selectAllLocations').addEventListener('click', function() {
            document.querySelectorAll('input[name="locationOption"]').forEach(checkbox => {
                if (checkbox.value !== 'other') {
                    checkbox.checked = true;
                }
            });
            updateEquipmentSelectionVisibility();
        });
        
        document.getElementById('deselectAllLocations').addEventListener('click', function() {
            document.querySelectorAll('input[name="locationOption"]').forEach(checkbox => {
                checkbox.checked = false;
            });
            document.getElementById('custom-location-container').classList.add('d-none');
            updateEquipmentSelectionVisibility();
        });
        
        // Add event listeners for all location checkboxes to show/hide equipment selection
        document.querySelectorAll('input[name="locationOption"]').forEach(checkbox => {
            checkbox.addEventListener('change', updateEquipmentSelectionVisibility);
        });
        
        // Add event listener for ECRAN device to show/hide screen type selection
        document.getElementById('bulk-device-ECRAN').addEventListener('change', function() {
            if (this.checked) {
                document.getElementById('bulk-screen-selection').classList.remove('d-none');
            } else {
                document.getElementById('bulk-screen-selection').classList.add('d-none');
            }
        });
    }
    
    // Function to show equipment selection if multiple locations are selected
    function updateEquipmentSelectionVisibility() {
        const selectedLocations = document.querySelectorAll('input[name="locationOption"]:checked');
        const equipmentContainer = document.getElementById('equipment-selection-container');
        
        if (selectedLocations.length > 1) {
            equipmentContainer.classList.remove('d-none');
        } else {
            equipmentContainer.classList.add('d-none');
            document.getElementById('bulk-screen-selection').classList.add('d-none');
            document.querySelectorAll('.bulk-device-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
        }
    }
    
    // Show the modal
    const modal = document.getElementById('locationSelectionModal');
    const locationModal = new bootstrap.Modal(modal);
    locationModal.show();
    
    // Show/hide floor selection based on project type
    const floorSelection = document.getElementById('floor-selection');
    if (floorSelection) {
        if (currentDomotiqueProject.type === 'villa') {
            floorSelection.classList.remove('d-none');
            if (selectedFloor) {
                document.getElementById('floor-select').value = selectedFloor;
            }
        } else {
            floorSelection.classList.add('d-none');
        }
    }
    
    // Reset form
    document.querySelectorAll('input[name="locationOption"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.getElementById('custom-location-container').classList.add('d-none');
    if (document.getElementById('custom-location-name')) {
        document.getElementById('custom-location-name').value = '';
    }
    document.getElementById('equipment-selection-container').classList.add('d-none');
    document.querySelectorAll('.bulk-device-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.getElementById('bulk-screen-selection').classList.add('d-none');
    
    // Add event listener for confirmation button
    document.getElementById('confirmLocationSelection').onclick = function() {
        const selectedOptions = document.querySelectorAll('input[name="locationOption"]:checked');
        
        if (selectedOptions.length === 0) {
            alert('Veuillez sélectionner au moins un emplacement');
            return;
        }
        
        const floorValue = currentDomotiqueProject.type === 'villa' ? 
            document.getElementById('floor-select').value : null;
        
        // Check if bulk equipment selection should be applied
        const bulkEquipment = [];
        if (selectedOptions.length > 1) {
            document.querySelectorAll('.bulk-device-checkbox:checked').forEach(checkbox => {
                const deviceType = checkbox.dataset.type;
                let device = new Device(deviceType, getDeviceName(deviceType));
                
                // Special handling for screen type
                if (deviceType === 'ECRAN') {
                    const screenType = document.querySelector('input[name="bulkScreenType"]:checked').value;
                    device.name = `Écran ${screenType}`;
                    device.updateSpecifications({ screenType: screenType });
                }
                
                bulkEquipment.push(device);
            });
        }
        
        // Process all selected options
        selectedOptions.forEach(option => {
            if (option.value === 'other') {
                // Handle custom location
                const customName = document.getElementById('custom-location-name').value.trim();
                if (customName) {
                    const locationId = addLocationToProject(customName, floorValue);
                    
                    // Add bulk devices to this location if applicable
                    if (bulkEquipment.length > 0) {
                        bulkEquipment.forEach(device => {
                            const newDevice = new Device(device.type, device.name);
                            newDevice.specifications = {...device.specifications};
                            currentDomotiqueProject.locations[locationId].addDevice(newDevice);
                        });
                    }
                }
            } else {
                // Handle predefined location
                const locationId = addLocationToProject(option.value, floorValue);
                
                // Add bulk devices to this location if applicable
                if (bulkEquipment.length > 0) {
                    bulkEquipment.forEach(device => {
                        const newDevice = new Device(device.type, device.name);
                        newDevice.specifications = {...device.specifications};
                        currentDomotiqueProject.locations[locationId].addDevice(newDevice);
                    });
                }
            }
        });
        
        // Refresh the UI
        renderLocations();
        
        // Hide the modal
        locationModal.hide();
    };
}

// Helper function to add a location to the current project
function addLocationToProject(locationName, floor = null) {
    if (!locationName) return -1;
    
    const newLocation = new Location(locationName);
    
    // Set floor for villa type projects
    if (floor) {
        newLocation.floor = floor;
    }
    
    currentDomotiqueProject.addLocation(newLocation);
    
    // Add to history - track location creation
    currentDomotiqueProject.addToHistory(`Nouvel emplacement ajouté: ${locationName}${floor ? ' (' + getFloorName(floor).toLowerCase() + ')' : ''}`);
    
    saveDataToLocalStorage(); // Save data after changes
    
    return currentDomotiqueProject.locations.length - 1;
}

function removeLocation(index) {
    if (!currentDomotiqueProject) return;
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cet emplacement?')) {
        const locationName = currentDomotiqueProject.locations[index].name;
        currentDomotiqueProject.locations.splice(index, 1);
        
        // Add to history - track location removal
        currentDomotiqueProject.addToHistory(`Emplacement supprimé: ${locationName}`);
        
        saveDataToLocalStorage(); // Save data after changes
        
        renderLocations();
    }
}

function saveLocationSetup() {
    if (!currentDomotiqueProject) {
        alert('Aucun projet sélectionné');
        return;
    }
    
    // Add history event about saving domotique setup
    currentDomotiqueProject.addToHistory('Configuration domotique mise à jour');
    
    // Update project in the projects array
    const projectIndex = projects.findIndex(p => p.id === currentDomotiqueProject.id);
    if (projectIndex !== -1) {
        projects[projectIndex] = currentDomotiqueProject;
    }
    
    saveDataToLocalStorage(); // Save data after changes
    
    alert('Configuration domotique enregistrée avec succès');
    
    // Update other views that might display project data
    updateProjectsList();
    updateDashboard();
    updateProjectHistoryList(); // Update history view
}

function generateReportFromDomotique() {
    if (!currentDomotiqueProject) {
        alert('Veuillez d\'abord sélectionner un projet');
        return;
    }
    
    // Save current domotique project first
    saveLocationSetup();
    
    // Switch to report view and select this project
    showView('report');
    
    // Ensure project list in report view is updated
    updateProjectReportList();
    
    // Set the project and generate report
    document.getElementById('report-project-select').value = currentDomotiqueProject.id;
    generateProjectReport();
}

// Project History functions
function updateProjectHistoryList() {
    const projectSelect = document.getElementById('history-project-select');
    if (projectSelect) {
        const currentValue = projectSelect.value;
        projectSelect.innerHTML = `
            <option value="">Sélectionner un projet</option>
            ${projects.map(project => {
                const client = clients.find(c => c.id === project.clientId);
                const clientName = client ? client.name : 'Client inconnu';
                return `
                    <option value="${project.id}" ${currentValue === project.id ? 'selected' : ''}>
                        ${project.name} (${clientName})
                    </option>
                `;
            }).join('')}
        `;
    }
}

function showProjectHistory() {
    const projectId = document.getElementById('history-project-select').value;
    const historyContainer = document.getElementById('project-history-container');
    
    if (!projectId) {
        historyContainer.innerHTML = '<div class="alert alert-warning">Veuillez sélectionner un projet</div>';
        return;
    }
    
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
        historyContainer.innerHTML = '<div class="alert alert-danger">Projet non trouvé</div>';
        return;
    }
    
    const client = clients.find(c => c.id === project.clientId);
    const clientName = client ? client.name : 'Client inconnu';
    
    // Get status info for display
    let statusClass, statusText;
    switch(project.status) {
        case 'non_commence':
            statusClass = 'bg-secondary';
            statusText = 'Non commencé';
            break;
        case 'en_cours':
            statusClass = 'bg-primary';
            statusText = 'En cours';
            break;
        case 'en_attente':
            statusClass = 'bg-warning text-dark';
            statusText = 'En attente';
            break;
        case 'en_retard':
            statusClass = 'bg-danger';
            statusText = 'En retard';
            break;
        case 'termine':
            statusClass = 'bg-success';
            statusText = 'Terminé';
            break;
        default:
            statusClass = 'bg-secondary';
            statusText = 'Statut inconnu';
    }
    
    // Format dates for display
    const startDateDisplay = project.startDate ? new Date(project.startDate).toLocaleDateString('fr-FR') : 'Non définie';
    const endDateDisplay = project.endDate ? new Date(project.endDate).toLocaleDateString('fr-FR') : 'Non définie';
    
    // Prepare locations details
    let locationsHtml = '';
    
    if (project.locations.length === 0) {
        locationsHtml = `
            <div class="card mb-4">
                <div class="card-header">
                    <h5>Détails des emplacements</h5>
                </div>
                <div class="card-body">
                    <div class="alert alert-info">Aucun emplacement configuré pour ce projet</div>
                </div>
            </div>
        `;
    } else {
        // Check if the project is a villa type to group by floors
        if (project.type === 'villa') {
            // Group locations by floor
            const floorLocations = {
                'SOUS_SOL': [],
                'RDC': [],
                'ETAGE': []
            };
            
            // Assign locations to their respective floors
            project.locations.forEach(location => {
                const floor = location.floor || 'RDC';
                floorLocations[floor].push(location);
            });
            
            // Render locations grouped by floor
            locationsHtml = `
                <div class="card mb-4">
                    <div class="card-header">
                        <h5>Détails des emplacements</h5>
                    </div>
                    <div class="card-body">
                        <div class="accordion" id="historyLocationAccordion">
                            ${Object.entries(floorLocations).map(([floor, locations]) => {
                                if (locations.length === 0) return '';
                                
                                const floorName = getFloorName(floor);
                                return `
                                    <div class="accordion-item">
                                        <h2 class="accordion-header">
                                            <button class="accordion-button ${floor === 'RDC' ? '' : 'collapsed'}" type="button" 
                                                    data-bs-toggle="collapse" data-bs-target="#historyCollapse${floor}">
                                                ${floorName} (${locations.length} emplacements)
                                            </button>
                                        </h2>
                                        <div id="historyCollapse${floor}" class="accordion-collapse collapse ${floor === 'RDC' ? 'show' : ''}" 
                                             data-bs-parent="#historyLocationAccordion">
                                            <div class="accordion-body">
                                                <div class="row">
                                                    ${locations.map(location => renderHistoryLocationCard(location)).join('')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Regular rendering for apartments (no floors)
            locationsHtml = `
                <div class="card mb-4">
                    <div class="card-header">
                        <h5>Détails des emplacements</h5>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            ${project.locations.map(location => renderHistoryLocationCard(location)).join('')}
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    // Render the complete history view
    historyContainer.innerHTML = `
        <div class="card mb-4">
            <div class="card-header">
                <h4>${project.name}</h4>
                <div class="mt-2">
                    <span class="badge ${statusClass}">${statusText}</span>
                    <span class="ms-2">Client: ${clientName}</span>
                    <span class="ms-3"><i class="bi bi-calendar-event"></i> Début: ${startDateDisplay}</span>
                    <span class="ms-3"><i class="bi bi-calendar-check"></i> Fin prévue: ${endDateDisplay}</span>
                </div>
            </div>
            <div class="card-body">
                <p><strong>Type de projet:</strong> ${project.type === 'villa' ? 'Villa' : 'Appartement'}</p>
            </div>
        </div>

        <div class="mb-4">
            <h4>Détails des emplacements</h4>
            ${locationsHtml}
        </div>
    `;
}

// Helper function to render a location card for history view
function renderHistoryLocationCard(location) {
    // Device types translation
    const deviceTypesTranslation = {
        'ON_OFF': 'Éclairage ON/OFF',
        'DIMMER': 'Éclairage variation DIM',
        'SONORISATION': 'Sonorisation',
        'CLIMATISATION': 'Climatisation',
        'CHAUFFAGE': 'Chauffage',
        'CAMERA': 'Caméra',
        'VOLET': 'Volet roulant',
        'ECRAN': 'Écran',
        'VIDEOPHONIE': 'Vidéophonie',
        'WIFI': 'WiFi'
    };

    // Group devices by type
    const devicesByType = {};
    location.devices.forEach(device => {
        devicesByType[device.type] = devicesByType[device.type] || [];
        devicesByType[device.type].push(device);
    });
    
    // Create devices list
    const devicesList = Object.entries(devicesByType).map(([type, devices]) => {
        return devices.map(device => {
            let deviceDetails = deviceTypesTranslation[type] || type;
            
            // Special handling for screens with specifications
            if (type === 'ECRAN' && device.specifications && device.specifications.screenType) {
                deviceDetails += ` (${device.specifications.screenType})`;
            }
            
            return `<li>${deviceDetails}</li>`;
        }).join('');
    }).join('');
    
    return `
        <div class="col-md-6 mb-3">
            <div class="card h-100">
                <div class="card-header">
                    <h6>${location.name}</h6>
                </div>
                <div class="card-body">
                    <p><strong>Nombre d'équipements:</strong> ${location.devices.length}</p>
                    <p><strong>Équipements:</strong></p>
                    <ul>
                        ${devicesList || '<li>Aucun équipement</li>'}
                    </ul>
                    ${location.notes ? `<p><strong>Notes:</strong> ${location.notes}</p>` : ''}
                </div>
            </div>
        </div>
    `;
}
