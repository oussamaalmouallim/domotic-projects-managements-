class StockManager {
    constructor() {
        this.inventory = new Map();
        this.minStock = new Map();
        this.history = [];
    }

    addItem(itemId, quantity, minQuantity = 0) {
        this.inventory.set(itemId, (this.inventory.get(itemId) || 0) + quantity);
        this.minStock.set(itemId, minQuantity);
        this.addToHistory(itemId, 'add', quantity);
        
        // Save to localStorage after inventory update
        if (typeof saveDataToLocalStorage === 'function') {
            saveDataToLocalStorage();
        }
    }

    removeItem(itemId, quantity) {
        const currentStock = this.inventory.get(itemId) || 0;
        if (currentStock >= quantity) {
            this.inventory.set(itemId, currentStock - quantity);
            this.addToHistory(itemId, 'remove', quantity);
            
            // Save to localStorage after inventory update
            if (typeof saveDataToLocalStorage === 'function') {
                saveDataToLocalStorage();
            }
            
            return true;
        }
        return false;
    }

    getStock(itemId) {
        return this.inventory.get(itemId) || 0;
    }

    checkLowStock() {
        const lowStock = [];
        this.inventory.forEach((quantity, itemId) => {
            if (quantity <= this.minStock.get(itemId)) {
                lowStock.push({
                    itemId,
                    quantity,
                    minQuantity: this.minStock.get(itemId)
                });
            }
        });
        return lowStock;
    }

    addToHistory(itemId, action, quantity) {
        this.history.push({
            date: new Date(),
            itemId,
            action,
            quantity
        });
        
        // Save to localStorage after history update
        if (typeof saveDataToLocalStorage === 'function') {
            saveDataToLocalStorage();
        }
    }

    getHistory(itemId = null) {
        if (itemId) {
            return this.history.filter(h => h.itemId === itemId);
        }
        return this.history;
    }
}

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
