class Project {
    constructor(id, clientId, name) {
        this.id = id;
        this.clientId = clientId;
        this.name = name;
        this.locations = [];
        this.status = 'non_commence';
        this.history = [];
        this.startDate = null;
        this.endDate = null;
    }

    addLocation(location) {
        this.locations.push(location);
        this.addToHistory('Ajout emplacement: ' + location.name);
    }

    updateStatus(newStatus) {
        this.status = newStatus;
        this.addToHistory('Mise à jour statut: ' + newStatus);
    }

    addToHistory(action) {
        this.history.push({
            date: new Date(),
            action: action
        });
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
