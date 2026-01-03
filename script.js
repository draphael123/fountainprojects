// Notion-style Project Database for Fountain Vitality

class ProjectDatabase {
    constructor() {
        this.projects = this.loadProjects();
        this.editingProjectId = null;
        this.init();
    }

    init() {
        this.renderTable();
        this.updateCount();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Add new project button
        document.getElementById('addProjectBtn').addEventListener('click', () => {
            this.openModal();
        });

        // Close modal
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        // Cancel button
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal();
        });

        // Form submission
        document.getElementById('projectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProject();
        });

        // Close modal when clicking outside
        document.getElementById('projectModal').addEventListener('click', (e) => {
            if (e.target.id === 'projectModal') {
                this.closeModal();
            }
        });
    }

    openModal(projectId = null) {
        const modal = document.getElementById('projectModal');
        const modalTitle = document.getElementById('modalTitle');
        
        if (projectId) {
            // Edit mode
            this.editingProjectId = projectId;
            const project = this.projects.find(p => p.id === projectId);
            
            modalTitle.textContent = 'Edit Project';
            document.getElementById('projectName').value = project.name;
            document.getElementById('projectStatus').value = project.status;
            document.getElementById('projectOwner').value = project.owner;
            document.getElementById('projectDueDate').value = project.dueDate;
            document.getElementById('projectUrl').value = project.url;
        } else {
            // New project mode
            this.editingProjectId = null;
            modalTitle.textContent = 'New Project';
            document.getElementById('projectForm').reset();
        }
        
        modal.classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('projectModal').classList.add('hidden');
        document.getElementById('projectForm').reset();
        this.editingProjectId = null;
    }

    saveProject() {
        const projectData = {
            id: this.editingProjectId || Date.now().toString(),
            name: document.getElementById('projectName').value.trim(),
            status: document.getElementById('projectStatus').value,
            owner: document.getElementById('projectOwner').value.trim(),
            dueDate: document.getElementById('projectDueDate').value,
            url: document.getElementById('projectUrl').value.trim(),
            createdAt: this.editingProjectId 
                ? this.projects.find(p => p.id === this.editingProjectId)?.createdAt 
                : new Date().toISOString()
        };

        if (this.editingProjectId) {
            // Update existing project
            const index = this.projects.findIndex(p => p.id === this.editingProjectId);
            if (index !== -1) {
                this.projects[index] = projectData;
            }
        } else {
            // Add new project
            this.projects.push(projectData);
        }

        this.saveProjects();
        this.renderTable();
        this.updateCount();
        this.closeModal();
    }

    editProject(id) {
        this.openModal(id);
    }

    deleteProject(id) {
        if (confirm('Are you sure you want to delete this project?')) {
            this.projects = this.projects.filter(p => p.id !== id);
            this.saveProjects();
            this.renderTable();
            this.updateCount();
        }
    }

    renderTable() {
        const tbody = document.getElementById('projectsBody');
        const emptyState = document.getElementById('emptyState');

        if (this.projects.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        
        tbody.innerHTML = this.projects.map(project => {
            const dueDate = project.dueDate 
                ? new Date(project.dueDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })
                : '';
            
            const statusClass = this.getStatusClass(project.status);
            
            return `
                <tr data-id="${project.id}">
                    <td>
                        <span class="project-name">${this.escapeHtml(project.name)}</span>
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">${project.status}</span>
                    </td>
                    <td>
                        <span class="project-owner">${this.escapeHtml(project.owner) || '—'}</span>
                    </td>
                    <td>
                        <span class="project-date">${dueDate || '—'}</span>
                    </td>
                    <td class="project-url">
                        ${project.url ? `<a href="${this.escapeHtml(project.url)}" target="_blank" rel="noopener">View →</a>` : '—'}
                    </td>
                    <td>
                        <button class="action-btn edit-btn" onclick="projectDB.editProject('${project.id}')">Edit</button>
                        <button class="action-btn delete-btn" onclick="projectDB.deleteProject('${project.id}')">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    getStatusClass(status) {
        const statusMap = {
            'Not Started': 'status-not-started',
            'In Progress': 'status-in-progress',
            'Completed': 'status-completed',
            'On Hold': 'status-on-hold'
        };
        return statusMap[status] || 'status-not-started';
    }

    updateCount() {
        const count = this.projects.length;
        document.getElementById('projectCount').textContent = 
            `${count} project${count !== 1 ? 's' : ''}`;
    }

    saveProjects() {
        localStorage.setItem('fountainVitalityProjects', JSON.stringify(this.projects));
    }

    loadProjects() {
        const saved = localStorage.getItem('fountainVitalityProjects');
        return saved ? JSON.parse(saved) : this.getInitialProjects();
    }

    getInitialProjects() {
        return [
            {
                id: '1',
                name: 'Docusign Template Generator',
                status: 'In Progress',
                owner: '',
                dueDate: '',
                url: 'https://docusign-git-main-daniel-8982s-projects.vercel.app?_vercel_share=aaQplppDthTyFoYeIQm75hkbCvNasDYo',
                createdAt: new Date().toISOString()
            }
        ];
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the database
let projectDB;
document.addEventListener('DOMContentLoaded', () => {
    projectDB = new ProjectDatabase();
});
