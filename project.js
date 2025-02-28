class Project {
    constructor(id, clientId, name, type = 'appartement') {
        this.id = id;
        this.clientId = clientId;
        this.name = name;
        this.type = type; 
        this.locations = [];
        this.status = 'non_commence';
        this.history = [];
        this.startDate = null;
        this.endDate = null;
    }

    addLocation(location) {
        this.locations.push(location);
        // Only call addToHistory if this isn't being called during initialization
        if (typeof location._isInitializing === 'undefined') {
            this.addToHistory('Ajout emplacement: ' + location.name);
        }
    }

    updateStatus(newStatus) {
        const oldStatus = this.status;
        this.status = newStatus;
        
        // Get user-friendly status labels
        let statusText;
        switch(oldStatus) {
            case 'non_commence': statusText = 'Non commencé'; break;
            case 'en_cours': statusText = 'En cours'; break;
            case 'en_attente': statusText = 'En attente'; break;
            case 'en_retard': statusText = 'En retard'; break;
            case 'termine': statusText = 'Terminé'; break;
            default: statusText = 'Statut inconnu';
        }
        
        let newStatusText;
        switch(newStatus) {
            case 'non_commence': newStatusText = 'Non commencé'; break;
            case 'en_cours': newStatusText = 'En cours'; break;
            case 'en_attente': newStatusText = 'En attente'; break;
            case 'en_retard': newStatusText = 'En retard'; break;
            case 'termine': newStatusText = 'Terminé'; break;
            default: newStatusText = 'Statut inconnu';
        }
        
        this.addToHistory(`Mise à jour statut: ${statusText} → ${newStatusText}`);
    }

    addToHistory(action) {
        if (!this.history) {
            this.history = [];
        }
        
        this.history.push({
            date: new Date(),
            action: action
        });
        
        // Save to localStorage after history update
        if (typeof saveDataToLocalStorage === 'function') {
            saveDataToLocalStorage();
        }
    }

    calculateRequirements() {
        let requirements = {
            relays: 0,
            dimmers: 0,
            controllers: 0
        };

        this.locations.forEach(location => {
            location.devices.forEach(device => {
                switch(device.type) {
                    case 'ON_OFF':
                    case 'VOLET':
                    case 'CLIMATISATION':
                    case 'CHAUFFAGE':
                        requirements.relays++;
                        break;
                    case 'DIMMER':
                        requirements.dimmers++;
                        break;
                    case 'SONORISATION':
                    case 'CAMERA':
                    case 'ECRAN':
                    case 'VIDEOPHONIE':
                    case 'WIFI':
                    case 'CONTROLLER':
                        requirements.controllers++;
                        break;
                }
            });
        });

        return requirements;
    }
}

class Location {
    constructor(name) {
        this.name = name;
        this.devices = [];
        this.notes = '';
    }

    addDevice(device) {
        this.devices.push(device);
    }

    updateNotes(notes) {
        this.notes = notes;
    }
}

class Device {
    constructor(type, name) {
        this.type = type;
        this.name = name;
        this.specifications = {};
    }

    updateSpecifications(specs) {
        this.specifications = {...this.specifications, ...specs};
    }
}