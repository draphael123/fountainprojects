// Project Management System for Fountain Vitality

class ProjectManager {
    constructor() {
        this.projects = this.loadProjects();
        this.isFormVisible = false;
        this.editingProjectId = null;
        this.init();
    }

    init() {
        this.renderProjects();
        this.updateStats();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Toggle form visibility
        document.getElementById('toggleFormBtn').addEventListener('click', () => {
            this.toggleForm();
        });

        // Cancel button
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeForm();
        });

        // Form submission
        document.getElementById('projectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProject();
        });

        // Filters
        document.getElementById('filterStatus').addEventListener('change', () => {
            this.renderProjects();
        });

        document.getElementById('filterPriority').addEventListener('change', () => {
            this.renderProjects();
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.renderProjects(e.target.value);
        });
    }

    toggleForm() {
        const form = document.getElementById('projectForm');
        const btn = document.getElementById('toggleFormBtn');
        const btnText = document.getElementById('btnText');
        
        this.isFormVisible = !this.isFormVisible;
        
        if (this.isFormVisible) {
            form.classList.remove('hidden');
            btnText.textContent = '✕ Close Form';
        } else {
            form.classList.add('hidden');
            btnText.textContent = '+ Add New Project';
            this.resetForm();
        }
    }

    closeForm() {
        const form = document.getElementById('projectForm');
        const btnText = document.getElementById('btnText');
        
        form.classList.add('hidden');
        btnText.textContent = '+ Add New Project';
        this.isFormVisible = false;
        this.resetForm();
    }

    resetForm() {
        document.getElementById('projectForm').reset();
        document.getElementById('projectProgress').value = '0';
        this.editingProjectId = null;
    }

    saveProject() {
        const projectData = {
            id: this.editingProjectId || Date.now().toString(),
            name: document.getElementById('projectName').value.trim(),
            status: document.getElementById('projectStatus').value,
            priority: document.getElementById('projectPriority').value,
            dueDate: document.getElementById('projectDueDate').value,
            description: document.getElementById('projectDescription').value.trim(),
            owner: document.getElementById('projectOwner').value.trim(),
            progress: parseInt(document.getElementById('projectProgress').value) || 0,
            createdAt: this.editingProjectId 
                ? this.projects.find(p => p.id === this.editingProjectId)?.createdAt 
                : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this.editingProjectId) {
            // Update existing project
            const index = this.projects.findIndex(p => p.id === this.editingProjectId);
            if (index !== -1) {
                this.projects[index] = projectData;
            }
        } else {
            // Add new project
            this.projects.unshift(projectData);
        }

        this.saveProjects();
        this.renderProjects();
        this.updateStats();
        this.closeForm();
    }

    editProject(id) {
        const project = this.projects.find(p => p.id === id);
        if (!project) return;

        this.editingProjectId = id;
        
        // Populate form
        document.getElementById('projectName').value = project.name;
        document.getElementById('projectStatus').value = project.status;
        document.getElementById('projectPriority').value = project.priority;
        document.getElementById('projectDueDate').value = project.dueDate;
        document.getElementById('projectDescription').value = project.description;
        document.getElementById('projectOwner').value = project.owner;
        document.getElementById('projectProgress').value = project.progress;

        // Show form
        if (!this.isFormVisible) {
            this.toggleForm();
        }

        // Scroll to form
        document.getElementById('projectForm').scrollIntoView({ behavior: 'smooth' });
    }

    deleteProject(id) {
        if (confirm('Are you sure you want to delete this project?')) {
            this.projects = this.projects.filter(p => p.id !== id);
            this.saveProjects();
            this.renderProjects();
            this.updateStats();
        }
    }

    getFilteredProjects(searchQuery = '') {
        const statusFilter = document.getElementById('filterStatus').value;
        const priorityFilter = document.getElementById('filterPriority').value;

        return this.projects.filter(project => {
            const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
            const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
            const matchesSearch = searchQuery === '' || 
                project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                project.owner.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesStatus && matchesPriority && matchesSearch;
        });
    }

    renderProjects(searchQuery = '') {
        const projectsList = document.getElementById('projectsList');
        const emptyState = document.getElementById('emptyState');
        const filteredProjects = this.getFilteredProjects(searchQuery);

        if (filteredProjects.length === 0) {
            projectsList.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        projectsList.innerHTML = filteredProjects.map(project => this.createProjectCard(project)).join('');

        // Add event listeners to action buttons
        filteredProjects.forEach(project => {
            document.getElementById(`edit-${project.id}`)?.addEventListener('click', () => {
                this.editProject(project.id);
            });

            document.getElementById(`delete-${project.id}`)?.addEventListener('click', () => {
                this.deleteProject(project.id);
            });
        });
    }

    createProjectCard(project) {
        const dueDate = project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'Not set';
        const isOverdue = project.dueDate && new Date(project.dueDate) < new Date() && project.status !== 'Completed';

        return `
            <div class="project-card">
                <div class="project-header">
                    <div>
                        <h3 class="project-title">${this.escapeHtml(project.name)}</h3>
                        <div class="project-badges">
                            <span class="badge badge-status">${project.status}</span>
                            <span class="badge badge-priority ${project.priority.toLowerCase()}">${project.priority}</span>
                        </div>
                    </div>
                </div>
                
                ${project.description ? `<p class="project-description">${this.escapeHtml(project.description)}</p>` : ''}
                
                <div class="project-meta">
                    ${project.owner ? `<div class="project-meta-item">👤 <strong>Owner:</strong> ${this.escapeHtml(project.owner)}</div>` : ''}
                    <div class="project-meta-item" ${isOverdue ? 'style="color: var(--danger-color);"' : ''}>
                        📅 <strong>Due:</strong> ${dueDate} ${isOverdue ? '⚠️' : ''}
                    </div>
                    <div class="project-meta-item">📊 <strong>Progress:</strong> ${project.progress}%</div>
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${project.progress}%"></div>
                </div>
                
                <div class="project-actions">
                    <button class="btn-secondary" id="edit-${project.id}">✏️ Edit</button>
                    <button class="btn-danger" id="delete-${project.id}">🗑️ Delete</button>
                </div>
            </div>
        `;
    }

    updateStats() {
        const total = this.projects.length;
        const active = this.projects.filter(p => 
            p.status === 'In Progress' || p.status === 'Planning' || p.status === 'Review'
        ).length;
        const completed = this.projects.filter(p => p.status === 'Completed').length;

        document.getElementById('totalProjects').textContent = total;
        document.getElementById('activeProjects').textContent = active;
        document.getElementById('completedProjects').textContent = completed;
    }

    saveProjects() {
        localStorage.setItem('fountainVitalityProjects', JSON.stringify(this.projects));
    }

    loadProjects() {
        const saved = localStorage.getItem('fountainVitalityProjects');
        return saved ? JSON.parse(saved) : this.getSampleProjects();
    }

    getSampleProjects() {
        // Sample projects to demonstrate the system
        return [
            {
                id: '1',
                name: 'Website Redesign',
                status: 'In Progress',
                priority: 'High',
                dueDate: '2026-02-15',
                description: 'Complete overhaul of the company website with modern design and improved UX',
                owner: 'Sarah Johnson',
                progress: 65,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Mobile App Development',
                status: 'Planning',
                priority: 'Critical',
                dueDate: '2026-03-30',
                description: 'Develop native iOS and Android applications for customer engagement',
                owner: 'Michael Chen',
                progress: 25,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: '3',
                name: 'Marketing Campaign Q1',
                status: 'Review',
                priority: 'Medium',
                dueDate: '2026-01-31',
                description: 'Launch comprehensive marketing campaign for Q1 2026',
                owner: 'Emma Davis',
                progress: 85,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const projectManager = new ProjectManager();
});

