class NotionDB {
    constructor() {
        this.version = '1.0';
        this.projects = this.load();
        this.editing = null;
        this.init();
    }

    init() {
        this.render();
        this.bind();
    }

    bind() {
        // Project modal
        document.getElementById('newBtn').onclick = () => this.openModal();
        document.getElementById('closeBtn').onclick = () => this.closeModal();
        document.getElementById('cancelBtn').onclick = () => this.closeModal();
        document.getElementById('projectForm').onsubmit = (e) => {
            e.preventDefault();
            this.save();
        };
        document.querySelectorAll('.modal-overlay')[0].onclick = () => this.closeModal();

        // Settings modal
        document.getElementById('settingsBtn').onclick = () => this.openSettings();
        document.getElementById('closeSettings').onclick = () => this.closeSettings();
        document.querySelectorAll('.modal-overlay')[1].onclick = () => this.closeSettings();

        // Dark mode
        const darkModeToggle = document.getElementById('darkModeToggle');
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        darkModeToggle.checked = isDarkMode;
        if (isDarkMode) document.body.classList.add('dark-mode');
        darkModeToggle.onchange = () => this.toggleDarkMode();

        // Data management
        document.getElementById('exportBtn').onclick = () => this.exportData();
        document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();
        document.getElementById('importFile').onchange = (e) => this.importData(e);
        document.getElementById('clearBtn').onclick = () => this.clearData();
    }

    openModal(id = null) {
        const modal = document.getElementById('modal');
        const title = document.getElementById('modalTitle');
        
        if (id) {
            this.editing = id;
            const p = this.projects.find(x => x.id === id);
            title.textContent = 'Edit Project';
            document.getElementById('name').value = p.name;
            document.getElementById('status').value = p.status;
            document.getElementById('owner').value = p.owner;
            document.getElementById('dueDate').value = p.dueDate;
            document.getElementById('url').value = p.url;
        } else {
            this.editing = null;
            title.textContent = 'New Project';
            document.getElementById('projectForm').reset();
        }
        
        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('modal').classList.remove('active');
        this.editing = null;
    }

    openSettings() {
        document.getElementById('settingsModal').classList.add('active');
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    toggleDarkMode() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark);
    }

    exportData() {
        const data = {
            version: this.version,
            projects: this.projects,
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fountain-projects-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                const projects = data.projects || data;
                
                if (Array.isArray(projects)) {
                    if (confirm(`Import ${projects.length} projects? This will replace your current data.`)) {
                        this.projects = projects;
                        this.persist();
                        this.render();
                        alert('Projects imported successfully!');
                        this.closeSettings();
                    }
                } else {
                    alert('Invalid file format');
                }
            } catch (err) {
                alert('Error reading file: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    clearData() {
        if (confirm('Are you sure you want to clear all data and reset to defaults? This cannot be undone.')) {
            localStorage.removeItem('fountainProjects');
            this.projects = this.defaults();
            this.persist();
            this.render();
            alert('Data cleared and reset to defaults');
            this.closeSettings();
        }
    }

    save() {
        const data = {
            id: this.editing || Date.now().toString(),
            name: document.getElementById('name').value,
            status: document.getElementById('status').value,
            owner: document.getElementById('owner').value || '',
            dueDate: document.getElementById('dueDate').value || '',
            url: document.getElementById('url').value || ''
        };

        if (this.editing) {
            const i = this.projects.findIndex(x => x.id === this.editing);
            if (i !== -1) {
                this.projects[i] = data;
            }
        } else {
            this.projects.push(data);
        }

        this.persist();
        this.render();
        this.closeModal();
    }

    edit(id) {
        this.openModal(id);
    }

    delete(id) {
        if (confirm('Delete this project?')) {
            this.projects = this.projects.filter(x => x.id !== id);
            this.persist();
            this.render();
        }
    }

    render() {
        const tbody = document.getElementById('tableBody');
        
        if (this.projects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#37352f99;">No projects yet</td></tr>';
            return;
        }

        tbody.innerHTML = this.projects.map(p => {
            const statusClass = p.status.toLowerCase().replace(/\s+/g, '-');
            const date = p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            }) : '';
            
            return `
                <tr>
                    <td><span class="project-name">${this.esc(p.name)}</span></td>
                    <td><span class="status status-${statusClass}">${p.status}</span></td>
                    <td>${this.esc(p.owner) || ''}</td>
                    <td>${date}</td>
                    <td class="project-url">${p.url ? `<a href="${this.esc(p.url)}" target="_blank">View →</a>` : ''}</td>
                    <td>
                        <div class="action-btns">
                            <button class="action-btn" onclick="db.edit('${p.id}')">Edit</button>
                            <button class="action-btn delete-btn" onclick="db.delete('${p.id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    persist() {
        const data = {
            version: this.version,
            projects: this.projects,
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('fountainProjects', JSON.stringify(data));
    }

    load() {
        const saved = localStorage.getItem('fountainProjects');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                // Handle old format (array) or new format (object with version)
                if (Array.isArray(data)) {
                    // Migrate old format
                    return data;
                } else if (data.projects) {
                    return data.projects;
                }
            } catch (e) {
                console.error('Error loading projects:', e);
            }
        }
        // Load defaults and save them to localStorage
        const defaults = this.defaults();
        this.projects = defaults;
        this.persist();
        return defaults;
    }

    defaults() {
        return [
            {
                id: '1',
                name: 'Docusign Template Generator',
                status: 'In Progress',
                owner: '',
                dueDate: '',
                url: 'https://docusign-git-main-daniel-8982s-projects.vercel.app?_vercel_share=aaQplppDthTyFoYeIQm75hkbCvNasDYo'
            },
            {
                id: '2',
                name: 'Macro bot',
                status: 'In Progress',
                owner: '',
                dueDate: '',
                url: 'https://fountain-macro-assistant.vercel.app/'
            },
            {
                id: '3',
                name: 'Availability Report',
                status: 'In Progress',
                owner: '',
                dueDate: '',
                url: 'https://website-puce-rho-32.vercel.app/'
            },
            {
                id: '4',
                name: 'CS Escalation Service (DOES NOT WORK!)',
                status: 'On Hold',
                owner: '',
                dueDate: '',
                url: 'https://escalation-service.vercel.app/'
            },
            {
                id: '5',
                name: 'Time clock',
                status: 'In Progress',
                owner: '',
                dueDate: '',
                url: 'https://vercel.com/daniel-8982s-projects/time-clock-extension'
            },
            {
                id: '6',
                name: 'Fountain Onboarding',
                status: 'In Progress',
                owner: '',
                dueDate: '',
                url: 'https://fountain-onboarding.vercel.app/'
            }
        ];
    }

    esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

let db;
document.addEventListener('DOMContentLoaded', () => {
    db = new NotionDB();
});
