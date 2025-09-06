// ==== js/settings.js ====
class SettingsManager {
    constructor() {
        this.settings = {};
    }
    
    loadSettings() {
        if (!app.modules.storage) return;
        
        const settings = app.modules.storage.getSettings();
        const balanceInput = document.getElementById('initialBalance');
        if (balanceInput) {
            balanceInput.value = settings.initialBalance || 10000;
        }
    }
    
    updateInitialBalance() {
        const input = document.getElementById('initialBalance');
        if (!input || !app.modules.storage) return;
        
        const newBalance = parseFloat(input.value);
        if (newBalance > 0) {
            app.modules.storage.updateSettings({ initialBalance: newBalance });
            app.modules.utils?.showToast('Balance actualizado', 'success');
            app.modules.dashboard?.update();
        }
    }
    
    exportData() {
        if (app.modules.storage) {
            app.modules.storage.exportData();
            app.modules.utils?.showToast('Datos exportados', 'success');
        }
    }
    
    async importData() {
        const fileInput = document.getElementById('importFile');
        if (!fileInput) return;
        
        fileInput.click();
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file && app.modules.storage) {
                try {
                    await app.modules.storage.importData(file);
                    app.modules.utils?.showToast('Datos importados', 'success');
                    app.modules.dashboard?.update();
                } catch (error) {
                    app.modules.utils?.showToast('Error al importar', 'error');
                }
            }
        };
    }
    
    clearData() {
        if (app.modules.storage) {
            if (app.modules.storage.clearAllData()) {
                app.modules.utils?.showToast('Datos eliminados', 'success');
                app.modules.dashboard?.update();
            }
        }
    }
}

// Add to window for global access
window.settings = new SettingsManager();