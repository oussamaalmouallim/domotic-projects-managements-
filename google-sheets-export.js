/**
 * Google Sheets Export Functionality
 * Sends project report data to a Google Sheets document
 */

// Function to export report data to Google Sheets
function exportReportToGoogleSheets() {
    if (!currentProjectReport) {
      alert('Veuillez d\'abord générer un rapport');
      return;
    }
    
    const project = currentProjectReport.project;
    const reportData = currentProjectReport.generateSummary();
    const clientInfo = currentProjectReport.getClientInfo();
    
    // Create form data for submission
    const formData = new FormData();
    
    // Add project information
    formData.append("projectName", project.name);
    formData.append("clientName", clientInfo.name);
    formData.append("projectStatus", project.status);
    formData.append("projectType", project.type);
    formData.append("startDate", project.startDate ? new Date(project.startDate).toLocaleDateString('fr-FR') : 'Non définie');
    formData.append("endDate", project.endDate ? new Date(project.endDate).toLocaleDateString('fr-FR') : 'Non définie');
    
    // Add device counts
    Object.entries(reportData.deviceCounts).forEach(([type, count]) => {
      if (count > 0) {
        formData.append(`device_${type}`, count);
      }
    });
    
    // Add detailed location data with equipment
    reportData.locationSummary.forEach((location, index) => {
      formData.append(`location_${index}_name`, location.name);
      formData.append(`location_${index}_deviceCount`, location.deviceCount);
      
      // Add equipment details for each location
      Object.entries(location.devicesByType).forEach(([deviceType, devices]) => {
        const deviceTypeName = getDeviceTypeFriendlyName(deviceType);
        formData.append(`location_${index}_equipment_${deviceType}`, 
          `${deviceTypeName} (${devices.length})`);
        
        // Add specific details for special device types like screens
        devices.forEach((device, deviceIndex) => {
          if (deviceType === 'ECRAN' && device.specifications && device.specifications.screenType) {
            formData.append(`location_${index}_equipment_${deviceType}_${deviceIndex}_details`, 
              `Écran ${device.specifications.screenType}`);
          }
        });
      });
      
      // Add location notes if available
      const originalLocation = project.locations.find(l => l.name === location.name);
      if (originalLocation && originalLocation.notes) {
        formData.append(`location_${index}_notes`, originalLocation.notes);
      }
      
      // Add floor information for villa projects
      if (project.type === 'villa' && originalLocation && originalLocation.floor) {
        formData.append(`location_${index}_floor`, getFloorName(originalLocation.floor));
      }
    });
    
    // Change this URL to your actual Google Apps Script web app URL
    const googleScriptUrl = "https://script.google.com/macros/s/AKfycbxEjcjax2sU63aPf_Cru0SjcFfBJFQXt8ONxLjHRa-D0U8jaAvo8Cc3y3Uoy7hVO5pBbA/exec";
    
    // Update UI to show export is in progress
    const exportButton = document.getElementById('exportToGSheetsBtn');
    const originalText = exportButton.innerHTML;
    exportButton.innerHTML = '<i class="bi bi-cloud-arrow-up-fill me-2"></i>Export en cours...';
    exportButton.disabled = true;
    
    // Send data to Google Sheets
    fetch(googleScriptUrl, {
      method: "POST",
      body: formData
    })
    .then(response => response.text())
    .then(data => {
      alert("Rapport exporté avec succès vers Google Sheets !");
      exportButton.innerHTML = originalText;
      exportButton.disabled = false;
    })
    .catch(error => {
      console.error("Error exporting to Google Sheets:", error);
      alert("Erreur lors de l'export vers Google Sheets. Veuillez réessayer.");
      exportButton.innerHTML = originalText;
      exportButton.disabled = false;
    });
  }
  
  // Helper function to get friendly device type names
  function getDeviceTypeFriendlyName(deviceType) {
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
    return deviceTypesTranslation[deviceType] || deviceType;
  }
  
  // Helper function to get floor name for villa projects
  function getFloorName(floor) {
    switch(floor) {
      case 'SOUS_SOL': return 'Sous-sol';
      case 'RDC': return 'Rez-de-chaussée';
      case 'ETAGE': return 'Étage';
      default: return floor;
    }
  }