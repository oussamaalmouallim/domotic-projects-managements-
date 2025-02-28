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
    
    // Add location data
    reportData.locationSummary.forEach((location, index) => {
      formData.append(`location_${index}_name`, location.name);
      formData.append(`location_${index}_deviceCount`, location.deviceCount);
    });
    
    // Change this URL to your actual Google Apps Script web app URL
    const googleScriptUrl = "https://script.google.com/macros/s/AKfycbwslJzwnb1OZA2VahPAafUrqr7_xah-xh-CUp88pzuSGm8KMUQu_1TReL1yhKYOmqn5iw/exec";
    
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