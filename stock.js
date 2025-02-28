class ProjectReport {
    constructor(project) {
        this.project = project;
    }

    generateSummary() {
        const deviceCounts = this.countDevicesByType();
        const locationSummary = this.summarizeLocations();
        
        return {
            project: this.project,
            deviceCounts,
            locationSummary
        };
    }

    countDevicesByType() {
        const counts = {
            'ON_OFF': 0,
            'DIMMER': 0,
            'SONORISATION': 0,
            'CLIMATISATION': 0,
            'CHAUFFAGE': 0,
            'CAMERA': 0,
            'VOLET': 0,
            'ECRAN': 0,
            'VIDEOPHONIE': 0,
            'WIFI': 0
        };
        
        this.project.locations.forEach(location => {
            location.devices.forEach(device => {
                counts[device.type] = (counts[device.type] || 0) + 1;
            });
        });
        
        return counts;
    }
    
    summarizeLocations() {
        return this.project.locations.map(location => {
            const devicesByType = {};
            
            location.devices.forEach(device => {
                devicesByType[device.type] = devicesByType[device.type] || [];
                devicesByType[device.type].push(device);
            });
            
            return {
                name: location.name,
                deviceCount: location.devices.length,
                devicesByType
            };
        });
    }
    
    getClientInfo() {
        const clientInfo = clients.find(c => c.id === this.project.clientId);
        return clientInfo || { name: 'Client inconnu' };
    }
}

