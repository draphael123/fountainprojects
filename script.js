class NotionDB {
    constructor() {
        this.version = '2.0';
        this.projects = this.load();
        this.editing = null;
        this.currentFilter = 'all';
        this.currentView = 'table';
        this.currentSort = { field: null, direction: 'asc' };
        this.searchQuery = '';
        this.selectedProjects = new Set();
        this.activityLog = this.loadActivityLog();
        this.recentProjects = this.loadRecentProjects();
        this.formDraft = this.loadFormDraft();
        this.projectHistory = this.loadProjectHistory();
        this.init();
    }

    init() {
        this.render();
        this.updateStats();
        this.bind();
        this.setupKeyboardShortcuts();
    }

    bind() {
        // Project modal
        document.getElementById('newBtn').onclick = () => this.openModal();
        document.getElementById('closeBtn').onclick = () => this.closeModal();
        document.getElementById('cancelBtn').onclick = () => this.closeModal();
        document.getElementById('projectForm').onsubmit = (e) => {
            e.preventDefault();
            if (this.validateForm()) {
                this.save();
            }
        };

        // Form validation and auto-save
        document.getElementById('name').oninput = () => {
            this.validateField('name');
            this.autoSaveDraft();
        };
        document.getElementById('url').oninput = () => {
            this.validateField('url');
            this.autoSaveDraft();
        };
        document.getElementById('description').oninput = () => this.autoSaveDraft();
        document.getElementById('status').onchange = () => this.autoSaveDraft();
        document.getElementById('priority').onchange = () => this.autoSaveDraft();
        document.getElementById('progress').oninput = (e) => {
            document.getElementById('progressValue').textContent = e.target.value + '%';
            this.autoSaveDraft();
        };
        document.getElementById('tags').oninput = () => this.autoSaveDraft();
        document.getElementById('owner').oninput = () => this.autoSaveDraft();
        document.getElementById('dueDate').onchange = () => this.autoSaveDraft();
        document.getElementById('url').oninput = () => {
            this.validateField('url');
            this.autoSaveDraft();
        };
        document.getElementById('dependencies').onchange = () => this.autoSaveDraft();

        // Template dropdown
        document.getElementById('templateBtn').onclick = (e) => {
            e.stopPropagation();
            const menu = document.getElementById('templateMenu');
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        };
        document.querySelectorAll('.template-option').forEach(btn => {
            btn.onclick = () => {
                this.useTemplate(btn.dataset.template);
                document.getElementById('templateMenu').style.display = 'none';
            };
        });
        document.onclick = () => {
            document.getElementById('templateMenu').style.display = 'none';
        };

        // Context menu
        this.setupContextMenu();

        // Bulk edit
        const bulkStatusChangeBtn = document.getElementById('bulkStatusChange');
        if (bulkStatusChangeBtn) {
            bulkStatusChangeBtn.onclick = () => {
                if (this.selectedProjects.size > 0) {
                    document.getElementById('bulkEditModal').classList.add('active');
                    document.getElementById('bulkEditCount').textContent = this.selectedProjects.size;
                }
            };
        }
        document.getElementById('closeBulkEdit').onclick = () => {
            document.getElementById('bulkEditModal').classList.remove('active');
        };
        document.getElementById('cancelBulkEdit').onclick = () => {
            document.getElementById('bulkEditModal').classList.remove('active');
        };
        document.getElementById('bulkEditForm').onsubmit = (e) => {
            e.preventDefault();
            this.bulkEdit();
        };

        // Project history
        document.getElementById('viewHistoryBtn').onclick = () => {
            if (this.editing) {
                this.viewProjectHistory(this.editing);
            }
        };
        document.getElementById('closeHistory').onclick = () => {
            document.getElementById('historyModal').classList.remove('active');
        };

        // Requests modal
        document.getElementById('requestsBtn').onclick = () => this.openRequests();
        document.getElementById('closeRequests').onclick = () => this.closeRequests();
        document.getElementById('cancelRequests').onclick = () => this.closeRequests();
        document.getElementById('requestForm').onsubmit = (e) => {
            e.preventDefault();
            this.submitRequest();
        };

        // Help modal
        document.getElementById('helpBtn').onclick = () => this.openHelp();
        document.getElementById('closeHelp').onclick = () => this.closeHelp();

        // Settings modal
        document.getElementById('settingsBtn').onclick = () => this.openSettings();
        document.getElementById('closeSettings').onclick = () => this.closeSettings();
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    const modal = overlay.closest('.modal');
                    if (modal) modal.classList.remove('active');
                }
            };
        });

        // Dark mode
        const darkModeToggle = document.getElementById('darkModeToggle');
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        darkModeToggle.checked = isDarkMode;
        if (isDarkMode) document.body.classList.add('dark-mode');
        darkModeToggle.onchange = () => this.toggleDarkMode();

        // Data management
        document.getElementById('exportBtn').onclick = () => this.exportData();
        document.getElementById('exportCsvBtn').onclick = () => this.exportCSV();
        document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();
        document.getElementById('importFile').onchange = (e) => this.importData(e);
        document.getElementById('clearBtn').onclick = () => this.clearData();
        document.getElementById('viewRequestsBtn').onclick = () => this.viewRequests();
        document.getElementById('closeViewRequests').onclick = () => {
            document.getElementById('viewRequestsModal').classList.remove('active');
        };

        // Search
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;
        searchInput.oninput = (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchQuery = e.target.value.toLowerCase();
                this.render();
            }, 300);
        };

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.onclick = () => {
                this.currentFilter = btn.dataset.filter;
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.render();
            };
        });

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.onclick = () => {
                this.currentView = btn.dataset.view;
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.render();
            };
        });

        // Sortable columns
        document.querySelectorAll('.sortable').forEach(th => {
            th.onclick = () => {
                const field = th.dataset.sort;
                if (this.currentSort.field === field) {
                    this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    this.currentSort.field = field;
                    this.currentSort.direction = 'asc';
                }
                this.updateSortIcons();
                this.render();
            };
        });

        // Select all checkbox
        document.getElementById('selectAll').onchange = (e) => {
            const checked = e.target.checked;
            document.querySelectorAll('.project-checkbox').forEach(cb => {
                cb.checked = checked;
                if (checked) {
                    this.selectedProjects.add(cb.dataset.id);
                } else {
                    this.selectedProjects.delete(cb.dataset.id);
                }
            });
            this.updateBulkActions();
        };

        // Bulk actions
        document.getElementById('bulkArchive').onclick = () => this.bulkArchive();
        document.getElementById('bulkDelete').onclick = () => this.bulkDelete();
        // bulkStatusChange is handled above in the bulk edit section
        document.getElementById('bulkDeselect').onclick = () => this.deselectAll();
        document.getElementById('saveBulkStatus').onclick = () => this.bulkChangeStatus();
        document.getElementById('closeBulkStatus').onclick = () => {
            document.getElementById('bulkStatusModal').classList.remove('active');
        };
        document.getElementById('cancelBulkStatus').onclick = () => {
            document.getElementById('bulkStatusModal').classList.remove('active');
        };

        // Quick view
        document.getElementById('closeQuickView').onclick = () => {
            document.getElementById('quickViewModal').classList.remove('active');
        };

        // Confirmation dialog
        document.getElementById('confirmCancel').onclick = () => {
            document.getElementById('confirmModal').classList.remove('active');
        };
    }

    setupKeyboardShortcuts() {
        document.onkeydown = (e) => {
            // Ctrl/Cmd + N for new project
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.openModal();
            }
            // Escape to close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    modal.classList.remove('active');
                });
            }
            // Ctrl/Cmd + F to focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }
        };
    }

    updateSortIcons() {
        document.querySelectorAll('.sort-icon').forEach(icon => {
            icon.textContent = '⇅';
        });
        if (this.currentSort.field) {
            const th = document.querySelector(`[data-sort="${this.currentSort.field}"]`);
            if (th) {
                const icon = th.querySelector('.sort-icon');
                if (icon) {
                    icon.textContent = this.currentSort.direction === 'asc' ? '↑' : '↓';
                }
            }
        }
    }

    validateField(fieldName) {
        const field = document.getElementById(fieldName);
        const errorEl = document.getElementById(fieldName + 'Error');
        
        if (fieldName === 'name') {
            if (!field.value.trim()) {
                errorEl.textContent = 'Name is required';
                field.classList.add('error');
                return false;
            }
            field.classList.remove('error');
            errorEl.textContent = '';
            return true;
        }
        
        if (fieldName === 'url') {
            if (field.value && !this.isValidUrl(field.value)) {
                errorEl.textContent = 'Please enter a valid URL';
                field.classList.add('error');
                return false;
            }
            field.classList.remove('error');
            errorEl.textContent = '';
            return true;
        }
        
        return true;
    }

    validateForm() {
        let valid = true;
        valid = this.validateField('name') && valid;
        valid = this.validateField('url') && valid;
        return valid;
    }

    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.getElementById('toastContainer').appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showConfirm(title, message) {
        return new Promise((resolve) => {
            document.getElementById('confirmTitle').textContent = title;
            document.getElementById('confirmMessage').textContent = message;
            const modal = document.getElementById('confirmModal');
            modal.classList.add('active');
            
            const okBtn = document.getElementById('confirmOk');
            const cancelBtn = document.getElementById('confirmCancel');
            
            const cleanup = () => {
                okBtn.onclick = null;
                cancelBtn.onclick = null;
                modal.classList.remove('active');
            };
            
            okBtn.onclick = () => {
                cleanup();
                resolve(true);
            };
            
            cancelBtn.onclick = () => {
                cleanup();
                resolve(false);
            };
        });
    }

    showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    logActivity(projectId, action, details = '') {
        const activity = {
            id: Date.now().toString(),
            projectId,
            action,
            details,
            timestamp: new Date().toISOString()
        };
        this.activityLog.push(activity);
        this.saveActivityLog();
    }

    loadActivityLog() {
        const saved = localStorage.getItem('fountainActivityLog');
        return saved ? JSON.parse(saved) : [];
    }

    saveActivityLog() {
        localStorage.setItem('fountainActivityLog', JSON.stringify(this.activityLog));
    }

    openModal(id = null) {
        const modal = document.getElementById('modal');
        const title = document.getElementById('modalTitle');
        
        // Populate dependencies dropdown
        this.populateDependencies(id);
        
        if (id) {
            this.editing = id;
            const p = this.projects.find(x => x.id === id);
            title.textContent = 'Edit Project';
            document.getElementById('name').value = p.name || '';
            document.getElementById('description').value = p.description || '';
            document.getElementById('status').value = p.status || 'In Progress';
            document.getElementById('priority').value = p.priority || 'Medium';
            document.getElementById('progress').value = p.progress || 0;
            document.getElementById('progressValue').textContent = (p.progress || 0) + '%';
            document.getElementById('tags').value = (p.tags || []).join(', ');
            document.getElementById('owner').value = p.owner || '';
            document.getElementById('dueDate').value = p.dueDate || '';
            document.getElementById('url').value = p.url || '';
            
            // Set dependencies after populating dropdown
            setTimeout(() => {
                const deps = document.getElementById('dependencies');
                if (deps && p.dependencies) {
                    Array.from(deps.options).forEach(opt => {
                        opt.selected = (p.dependencies || []).includes(opt.value);
                    });
                }
            }, 100);
            
            document.getElementById('viewHistoryBtn').style.display = 'inline-block';
            this.loadDraft(); // Load auto-saved draft if exists
        } else {
            this.editing = null;
            title.textContent = 'New Project';
            document.getElementById('projectForm').reset();
            document.getElementById('progressValue').textContent = '0%';
            document.getElementById('viewHistoryBtn').style.display = 'none';
            this.loadDraft(); // Load auto-saved draft
        }
        
        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('modal').classList.remove('active');
        this.editing = null;
        document.getElementById('projectForm').reset();
    }

    openRequests() {
        document.getElementById('requestsModal').classList.add('active');
        document.getElementById('requestForm').reset();
    }

    closeRequests() {
        document.getElementById('requestsModal').classList.remove('active');
        document.getElementById('requestForm').reset();
    }

    submitRequest() {
        const request = {
            id: Date.now().toString(),
            type: document.getElementById('requestType').value,
            title: document.getElementById('requestTitle').value.trim(),
            description: document.getElementById('requestDescription').value.trim(),
            name: document.getElementById('requestName').value.trim() || 'Anonymous',
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        // Save to localStorage
        let requests = this.loadRequests();
        requests.push(request);
        this.saveRequests(requests);

        this.showToast('Thank you! Your request has been submitted.', 'success');
        this.closeRequests();
        
        // Log activity
        this.logActivity(null, 'request_submitted', `Request: "${request.title}"`);
    }

    loadRequests() {
        const saved = localStorage.getItem('fountainRequests');
        return saved ? JSON.parse(saved) : [];
    }

    saveRequests(requests) {
        localStorage.setItem('fountainRequests', JSON.stringify(requests));
    }

    openHelp() {
        document.getElementById('helpModal').classList.add('active');
    }

    closeHelp() {
        document.getElementById('helpModal').classList.remove('active');
    }

    openSettings() {
        document.getElementById('settingsModal').classList.add('active');
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    viewRequests() {
        const requests = this.loadRequests();
        const listContainer = document.getElementById('requestsList');
        
        if (requests.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-requests">
                    <div class="empty-icon">💡</div>
                    <h3>No requests yet</h3>
                    <p>Be the first to submit a request!</p>
                </div>
            `;
        } else {
            listContainer.innerHTML = requests.map(r => {
                const date = new Date(r.timestamp).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const typeLabels = {
                    'feature': '✨ New Feature',
                    'improvement': '🔧 Improvement',
                    'bug': '🐛 Bug Report',
                    'ui': '🎨 UI/UX',
                    'other': '💭 Other'
                };
                
                return `
                    <div class="request-item">
                        <div class="request-header">
                            <span class="request-type">${typeLabels[r.type] || '💭 Other'}</span>
                            <span class="request-date">${date}</span>
                        </div>
                        <h4 class="request-item-title">${this.esc(r.title)}</h4>
                        <p class="request-item-description">${this.esc(r.description)}</p>
                        <div class="request-footer">
                            <span class="request-author">Submitted by: ${this.esc(r.name)}</span>
                            <span class="request-status">Status: ${r.status}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
        document.getElementById('viewRequestsModal').classList.add('active');
        this.closeSettings();
    }

    toggleDarkMode() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark);
        this.showToast(`Switched to ${isDark ? 'dark' : 'light'} mode`, 'success');
    }

    exportData() {
        this.showLoading();
        setTimeout(() => {
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
            this.hideLoading();
            this.showToast('Projects exported successfully!', 'success');
        }, 300);
    }

    exportCSV() {
        const headers = ['Name', 'Description', 'Status', 'Priority', 'Progress', 'Tags', 'Owner', 'Due Date', 'URL', 'Modified'];
        const rows = this.projects.map(p => [
            p.name,
            p.description || '',
            p.status || '',
            p.priority || '',
            (p.progress || 0) + '%',
            (p.tags || []).join('; '),
            p.owner || '',
            p.dueDate || '',
            p.url || '',
            p.modified || ''
        ]);
        
        const csv = [headers, ...rows].map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fountain-projects-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('CSV exported successfully!', 'success');
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
                    this.showConfirm('Import Projects', `Import ${projects.length} projects? This will replace your current data.`).then(confirmed => {
                        if (confirmed) {
                            this.projects = projects;
                            this.persist();
                            this.render();
                            this.showToast('Projects imported successfully!', 'success');
                            this.closeSettings();
                        }
                    });
                } else {
                    this.showToast('Invalid file format', 'error');
                }
            } catch (err) {
                this.showToast('Error reading file: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    clearData() {
        this.showConfirm('Clear All Data', 'Are you sure you want to clear all data and reset to defaults? This cannot be undone.').then(confirmed => {
            if (confirmed) {
                localStorage.removeItem('fountainProjects');
                this.projects = this.defaults();
                this.persist();
                this.render();
                this.showToast('Data cleared and reset to defaults', 'success');
                this.closeSettings();
            }
        });
    }

    save() {
        const oldProject = this.editing ? this.projects.find(p => p.id === this.editing) : null;
        
        const data = {
            id: this.editing || Date.now().toString(),
            name: document.getElementById('name').value.trim(),
            description: document.getElementById('description').value.trim() || '',
            status: document.getElementById('status').value,
            priority: document.getElementById('priority').value,
            progress: parseInt(document.getElementById('progress').value) || 0,
            tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(t => t),
            owner: document.getElementById('owner').value.trim() || '',
            dueDate: document.getElementById('dueDate').value || '',
            url: document.getElementById('url').value.trim() || '',
            dependencies: Array.from(document.getElementById('dependencies').selectedOptions).map(o => o.value).filter(Boolean),
            modified: new Date().toISOString(),
            created: this.editing ? (oldProject?.created || new Date().toISOString()) : new Date().toISOString()
        };

        const isNew = !this.editing;
        if (this.editing) {
            const i = this.projects.findIndex(x => x.id === this.editing);
            if (i !== -1) {
                // Track changes for history
                if (oldProject.status !== data.status) {
                    this.addToHistory(this.editing, 'status_changed', oldProject.status, data.status);
                }
                if (oldProject.priority !== data.priority) {
                    this.addToHistory(this.editing, 'priority_changed', oldProject.priority, data.priority);
                }
                if (oldProject.progress !== data.progress) {
                    this.addToHistory(this.editing, 'progress_updated', oldProject.progress, data.progress);
                }
                if (JSON.stringify(oldProject.tags || []) !== JSON.stringify(data.tags)) {
                    this.addToHistory(this.editing, 'tag_added', null, data.tags.join(', '));
                }
                if (JSON.stringify(oldProject.dependencies || []) !== JSON.stringify(data.dependencies)) {
                    this.addToHistory(this.editing, 'dependency_added', null, data.dependencies.length + ' dependencies');
                }
                
                this.projects[i] = data;
                this.logActivity(this.editing, 'updated', `Project "${data.name}" updated`);
                this.addToRecent(this.editing);
            }
        } else {
            this.projects.push(data);
            this.logActivity(data.id, 'created', `Project "${data.name}" created`);
            this.addToHistory(data.id, 'created', null, null);
            this.addToRecent(data.id);
        }

        // Clear draft
        localStorage.removeItem('fountainFormDraft');
        
        this.persist();
        this.render();
        this.closeModal();
        this.showToast(`Project ${isNew ? 'created' : 'updated'} successfully!`, 'success');
    }

    edit(id) {
        this.openModal(id);
    }

    delete(id) {
        const project = this.projects.find(p => p.id === id);
        this.showConfirm('Delete Project', `Are you sure you want to delete "${project?.name}"?`).then(confirmed => {
            if (confirmed) {
                this.projects = this.projects.filter(x => x.id !== id);
                this.logActivity(id, 'deleted', `Project "${project?.name}" deleted`);
                this.persist();
                this.render();
                this.showToast('Project deleted successfully', 'success');
            }
        });
    }

    quickView(id) {
        const project = this.projects.find(p => p.id === id);
        if (!project) return;
        
        this.addToRecent(id);

        const statusClass = project.status?.toLowerCase().replace(/\s+/g, '-') || '';
        const date = project.dueDate ? new Date(project.dueDate).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        }) : 'Not set';
        const modified = project.modified ? new Date(project.modified).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : 'Never';

        document.getElementById('quickViewTitle').textContent = project.name;
        document.getElementById('quickViewBody').innerHTML = `
            <div class="quick-view-content">
                <div class="quick-view-field">
                    <label>Description</label>
                    <p>${this.esc(project.description) || 'No description'}</p>
                </div>
                <div class="quick-view-row">
                    <div class="quick-view-field">
                        <label>Status</label>
                        <span class="status status-${statusClass}">${project.status || 'Not Started'}</span>
                    </div>
                    <div class="quick-view-field">
                        <label>Priority</label>
                        <span class="priority priority-${(project.priority || 'Medium').toLowerCase()}">${project.priority || 'Medium'}</span>
                    </div>
                    <div class="quick-view-field">
                        <label>Progress</label>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${project.progress || 0}%"></div>
                            <span>${project.progress || 0}%</span>
                        </div>
                    </div>
                </div>
                ${project.tags && project.tags.length > 0 ? `
                <div class="quick-view-field">
                    <label>Tags</label>
                    <div class="tags-container">
                        ${project.tags.map(tag => `<span class="tag">${this.esc(tag)}</span>`).join('')}
                    </div>
                </div>
                ` : ''}
                <div class="quick-view-row">
                    <div class="quick-view-field">
                        <label>Owner</label>
                        <p>${this.esc(project.owner) || 'Unassigned'}</p>
                    </div>
                    <div class="quick-view-field">
                        <label>Due Date</label>
                        <p>${date}</p>
                    </div>
                </div>
                ${project.url ? `
                <div class="quick-view-field">
                    <label>URL</label>
                    <p><a href="${this.esc(project.url)}" target="_blank">${this.esc(project.url)}</a></p>
                </div>
                ` : ''}
                ${project.dependencies && project.dependencies.length > 0 ? `
                <div class="quick-view-field">
                    <label>Related Projects</label>
                    <div class="dependencies-list">
                        ${project.dependencies.map(depId => {
                            const dep = this.projects.find(p => p.id === depId);
                            return dep ? `<span class="dependency-tag" onclick="db.quickView('${depId}'); event.stopPropagation();">${this.esc(dep.name)}</span>` : '';
                        }).filter(Boolean).join('')}
                    </div>
                </div>
                ` : ''}
                <div class="quick-view-field">
                    <label>Last Modified</label>
                    <p>${modified}</p>
                </div>
                <div class="quick-view-actions">
                    <button class="btn-save" onclick="db.edit('${project.id}'); document.getElementById('quickViewModal').classList.remove('active');">Edit</button>
                    <button class="btn-cancel" onclick="document.getElementById('quickViewModal').classList.remove('active');">Close</button>
                </div>
            </div>
        `;
        document.getElementById('quickViewModal').classList.add('active');
    }

    archive(id) {
        const project = this.projects.find(p => p.id === id);
        if (project) {
            project.archived = true;
            project.status = 'Archived';
            this.logActivity(id, 'archived', `Project "${project.name}" archived`);
            this.persist();
            this.render();
            this.showToast('Project archived', 'success');
        }
    }

    bulkArchive() {
        if (this.selectedProjects.size === 0) return;
        this.showConfirm('Archive Projects', `Archive ${this.selectedProjects.size} selected project(s)?`).then(confirmed => {
            if (confirmed) {
                this.selectedProjects.forEach(id => {
                    const project = this.projects.find(p => p.id === id);
                    if (project) {
                        project.archived = true;
                        project.status = 'Archived';
                        this.logActivity(id, 'archived', `Project "${project.name}" archived`);
                    }
                });
                this.persist();
                this.deselectAll();
                this.render();
                this.showToast(`${this.selectedProjects.size} project(s) archived`, 'success');
            }
        });
    }

    bulkDelete() {
        if (this.selectedProjects.size === 0) return;
        this.showConfirm('Delete Projects', `Delete ${this.selectedProjects.size} selected project(s)? This cannot be undone.`).then(confirmed => {
            if (confirmed) {
                const names = Array.from(this.selectedProjects).map(id => {
                    const p = this.projects.find(proj => proj.id === id);
                    return p?.name;
                }).filter(Boolean);
                
                this.selectedProjects.forEach(id => {
                    const project = this.projects.find(p => p.id === id);
                    if (project) {
                        this.logActivity(id, 'deleted', `Project "${project.name}" deleted`);
                    }
                });
                
                this.projects = this.projects.filter(p => !this.selectedProjects.has(p.id));
                this.persist();
                this.deselectAll();
                this.render();
                this.showToast(`${this.selectedProjects.size} project(s) deleted`, 'success');
            }
        });
    }

    bulkChangeStatus() {
        if (this.selectedProjects.size === 0) return;
        const newStatus = document.getElementById('bulkStatusSelect').value;
        this.selectedProjects.forEach(id => {
            const project = this.projects.find(p => p.id === id);
            if (project) {
                const oldStatus = project.status;
                project.status = newStatus;
                this.logActivity(id, 'status_changed', `Status changed from "${oldStatus}" to "${newStatus}"`);
            }
        });
        this.persist();
        document.getElementById('bulkStatusModal').classList.remove('active');
        this.deselectAll();
        this.render();
        this.showToast(`Status updated for ${this.selectedProjects.size} project(s)`, 'success');
    }

    toggleSelection(id) {
        if (this.selectedProjects.has(id)) {
            this.selectedProjects.delete(id);
        } else {
            this.selectedProjects.add(id);
        }
        this.updateBulkActions();
    }

    deselectAll() {
        this.selectedProjects.clear();
        document.querySelectorAll('.project-checkbox').forEach(cb => cb.checked = false);
        document.getElementById('selectAll').checked = false;
        this.updateBulkActions();
    }

    updateBulkActions() {
        const count = this.selectedProjects.size;
        if (count > 0) {
            document.getElementById('bulkActionsBar').style.display = 'flex';
            document.getElementById('bulkSelectedCount').textContent = `${count} project${count > 1 ? 's' : ''} selected`;
            document.getElementById('bulkActionBtn').style.display = 'inline-flex';
            document.getElementById('bulkCount').textContent = count;
        } else {
            document.getElementById('bulkActionsBar').style.display = 'none';
            document.getElementById('bulkActionBtn').style.display = 'none';
        }
    }

    getFilteredAndSortedProjects() {
        let filtered = this.projects.filter(p => {
            // Filter by status
            if (this.currentFilter === 'archived') {
                if (!p.archived) return false;
            } else if (this.currentFilter !== 'all') {
                if (p.status !== this.currentFilter || p.archived) return false;
            } else {
                if (p.archived) return false;
            }

            // Filter by search
            if (this.searchQuery) {
                const query = this.searchQuery;
                const searchable = [
                    p.name,
                    p.description,
                    p.owner,
                    p.status,
                    p.priority,
                    (p.tags || []).join(' ')
                ].join(' ').toLowerCase();
                if (!searchable.includes(query)) return false;
            }

            return true;
        });

        // Sort
        if (this.currentSort.field) {
            filtered.sort((a, b) => {
                let aVal = a[this.currentSort.field] || '';
                let bVal = b[this.currentSort.field] || '';

                if (this.currentSort.field === 'dueDate' || this.currentSort.field === 'modified') {
                    aVal = aVal ? new Date(aVal).getTime() : 0;
                    bVal = bVal ? new Date(bVal).getTime() : 0;
                } else if (this.currentSort.field === 'progress') {
                    aVal = parseInt(aVal) || 0;
                    bVal = parseInt(bVal) || 0;
                } else {
                    aVal = String(aVal).toLowerCase();
                    bVal = String(bVal).toLowerCase();
                }

                if (aVal < bVal) return this.currentSort.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return this.currentSort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }

    render() {
        const filteredProjects = this.getFilteredAndSortedProjects();
        
        if (this.currentView === 'table') {
            this.renderTableView(filteredProjects);
        } else {
            this.renderCardsView(filteredProjects);
        }

        this.updateStats();
        this.updateSortIcons();
        this.renderRecentProjects();
    }

    renderRecentProjects() {
        if (this.recentProjects.length === 0) {
            document.getElementById('recentProjectsSection').style.display = 'none';
            return;
        }
        
        const recent = this.recentProjects.map(id => this.projects.find(p => p.id === id)).filter(Boolean);
        if (recent.length === 0) {
            document.getElementById('recentProjectsSection').style.display = 'none';
            return;
        }
        
        document.getElementById('recentProjectsSection').style.display = 'block';
        const list = document.getElementById('recentProjectsList');
        list.innerHTML = recent.map(p => {
            const statusClass = p.status?.toLowerCase().replace(/\s+/g, '-') || '';
            return `
                <div class="recent-project-item" onclick="db.quickView('${p.id}')">
                    <span class="status status-${statusClass}">${p.status || 'Not Started'}</span>
                    <span class="recent-project-name">${this.esc(p.name)}</span>
                    <span class="recent-project-progress">${p.progress || 0}%</span>
                </div>
            `;
        }).join('');
    }

    renderTableView(projects) {
        const tbody = document.getElementById('tableBody');
        const tableView = document.getElementById('tableView');
        const cardsView = document.getElementById('cardsView');
        
        tableView.style.display = 'block';
        cardsView.style.display = 'none';
        
        if (projects.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" class="empty-state">
                        <div class="empty-state-content">
                            <div class="empty-icon">🔍</div>
                            <h3>No projects found</h3>
                            <p>${this.searchQuery ? 'Try adjusting your search or filters' : 'Click "+ New" to create your first project'}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = projects.map(p => {
            const statusClass = p.status?.toLowerCase().replace(/\s+/g, '-') || '';
            const priorityClass = (p.priority || 'Medium').toLowerCase();
            const date = p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            }) : '';
            const modified = p.modified ? new Date(p.modified).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            }) : '';
            const isOverdue = p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'Completed';
            const tags = (p.tags || []).slice(0, 2).map(t => `<span class="tag-small">${this.esc(t)}</span>`).join('');
            const moreTags = (p.tags || []).length > 2 ? `<span class="tag-small">+${(p.tags || []).length - 2}</span>` : '';
            
            return `
                <tr class="${isOverdue ? 'overdue' : ''}" onclick="db.quickView('${p.id}')" style="cursor: pointer;">
                    <td class="checkbox-col" onclick="event.stopPropagation();">
                        <input type="checkbox" class="project-checkbox" data-id="${p.id}" 
                               ${this.selectedProjects.has(p.id) ? 'checked' : ''} 
                               onchange="db.toggleSelection('${p.id}')">
                    </td>
                    <td><span class="project-name">${this.esc(p.name)}</span></td>
                    <td style="color:var(--text-secondary);font-size:13px;max-width:200px;overflow:hidden;text-overflow:ellipsis;">${this.esc(p.description) || ''}</td>
                    <td><span class="status status-${statusClass}">${this.getStatusIcon(p.status)} ${p.status || 'Not Started'}</span></td>
                    <td><span class="priority priority-${priorityClass}">${this.getPriorityIcon(p.priority)} ${p.priority || 'Medium'}</span></td>
                    <td>
                        <div class="progress-cell">
                            <div class="progress-bar-small" style="width: ${p.progress || 0}%"></div>
                            <span>${p.progress || 0}%</span>
                        </div>
                    </td>
                    <td>${tags}${moreTags}</td>
                    <td>${this.esc(p.owner) || ''}</td>
                    <td class="${isOverdue ? 'overdue-date' : ''}">${date}</td>
                    <td class="project-url" onclick="event.stopPropagation();">${p.url ? `<a href="${this.esc(p.url)}" target="_blank">View →</a>` : ''}</td>
                    <td style="font-size:12px;color:var(--text-secondary);">${modified}</td>
                    <td onclick="event.stopPropagation();">
                        <div class="action-btns">
                            <button class="action-btn" onclick="db.edit('${p.id}')">Edit</button>
                            <button class="action-btn" onclick="db.duplicateProject('${p.id}')" title="Duplicate project">Copy</button>
                            <button class="action-btn delete-btn" onclick="db.delete('${p.id}')">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderCardsView(projects) {
        const cardsBody = document.getElementById('cardsBody');
        const tableView = document.getElementById('tableView');
        const cardsView = document.getElementById('cardsView');
        
        tableView.style.display = 'none';
        cardsView.style.display = 'block';
        
        if (projects.length === 0) {
            cardsBody.innerHTML = `
                <div class="empty-state-card">
                    <div class="empty-icon">🔍</div>
                    <h3>No projects found</h3>
                    <p>${this.searchQuery ? 'Try adjusting your search or filters' : 'Click "+ New" to create your first project'}</p>
                </div>
            `;
            return;
        }

        cardsBody.innerHTML = projects.map(p => {
            const statusClass = p.status?.toLowerCase().replace(/\s+/g, '-') || '';
            const priorityClass = (p.priority || 'Medium').toLowerCase();
            const date = p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            }) : 'No due date';
            const isOverdue = p.dueDate && new Date(p.dueDate) < new Date() && p.status !== 'Completed';
            const tags = (p.tags || []).map(t => `<span class="tag">${this.esc(t)}</span>`).join('');
            
            return `
                <div class="project-card ${isOverdue ? 'overdue' : ''}" onclick="db.quickView('${p.id}')">
                    <div class="card-header">
                        <input type="checkbox" class="project-checkbox" data-id="${p.id}" 
                               ${this.selectedProjects.has(p.id) ? 'checked' : ''} 
                               onchange="db.toggleSelection('${p.id}'); event.stopPropagation();"
                               onclick="event.stopPropagation();">
                        <h3 class="card-title">${this.esc(p.name)}</h3>
                    </div>
                    <p class="card-description">${this.esc(p.description) || 'No description'}</p>
                    <div class="card-meta">
                        <span class="status status-${statusClass}">${this.getStatusIcon(p.status)} ${p.status || 'Not Started'}</span>
                        <span class="priority priority-${priorityClass}">${this.getPriorityIcon(p.priority)} ${p.priority || 'Medium'}</span>
                    </div>
                    <div class="card-progress">
                        <label>Progress</label>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${p.progress || 0}%"></div>
                            <span>${p.progress || 0}%</span>
                        </div>
                    </div>
                    ${tags ? `<div class="card-tags">${tags}</div>` : ''}
                    <div class="card-footer">
                        <div class="card-info">
                            <span>👤 ${this.esc(p.owner) || 'Unassigned'}</span>
                            <span class="${isOverdue ? 'overdue-date' : ''}">📅 ${date}</span>
                        </div>
                        <div class="card-actions" onclick="event.stopPropagation();">
                            <button class="action-btn" onclick="db.edit('${p.id}')">Edit</button>
                            <button class="action-btn" onclick="db.duplicateProject('${p.id}')" title="Duplicate">Copy</button>
                            <button class="action-btn delete-btn" onclick="db.delete('${p.id}')">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateStats() {
        const total = this.projects.filter(p => !p.archived).length;
        const completed = this.projects.filter(p => p.status === 'Completed' && !p.archived).length;
        const active = this.projects.filter(p => 
            (p.status === 'In Progress' || p.status === 'Not Started') && !p.archived
        ).length;

        document.getElementById('totalCount').textContent = total;
        document.getElementById('activeCount').textContent = active;
        document.getElementById('completedCount').textContent = completed;
        document.getElementById('currentYear').textContent = new Date().getFullYear();
        
        // Update progress bars in stat cards
        this.updateStatProgressBars(total, active, completed);
    }

    updateStatProgressBars(total, active, completed) {
        // Calculate percentages
        const activePercent = total > 0 ? (active / total) * 100 : 0;
        const completedPercent = total > 0 ? (completed / total) * 100 : 0;
        
        // Update or create progress bars in stat items
        const statItems = document.querySelectorAll('.stat-item');
        statItems.forEach((item, index) => {
            let progressBar = item.querySelector('.stat-progress-bar');
            if (!progressBar) {
                progressBar = document.createElement('div');
                progressBar.className = 'stat-progress-bar';
                progressBar.innerHTML = '<div class="stat-progress-fill"></div>';
                item.appendChild(progressBar);
            }
            
            const fill = progressBar.querySelector('.stat-progress-fill');
            if (index === 0) {
                // Total projects - show 100% (all projects)
                fill.style.width = '100%';
            } else if (index === 1) {
                // Active projects
                fill.style.width = activePercent + '%';
            } else if (index === 2) {
                // Completed projects
                fill.style.width = completedPercent + '%';
            }
        });
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
        const defaults = this.defaults();
        
        if (saved) {
            try {
                const data = JSON.parse(saved);
                let existingProjects = Array.isArray(data) ? data : (data.projects || []);
                
                // Merge new default projects with existing ones
                // Add any default projects that don't exist in saved data
                const existingIds = new Set(existingProjects.map(p => p.id));
                const newProjects = defaults.filter(p => !existingIds.has(p.id));
                
                if (newProjects.length > 0) {
                    existingProjects = [...existingProjects, ...newProjects];
                    this.projects = existingProjects;
                    this.persist();
                    return existingProjects;
                }
                
                return existingProjects;
            } catch (e) {
                console.error('Error loading projects:', e);
            }
        }
        
        // No saved data, use defaults
        this.projects = defaults;
        this.persist();
        return defaults;
    }

    defaults() {
        return [
            {
                id: '1',
                name: 'Docusign Template Generator',
                description: 'Automated tool for creating and managing DocuSign templates with custom fields',
                status: 'In Progress',
                priority: 'High',
                progress: 90,
                tags: ['automation', 'docusign'],
                owner: '',
                dueDate: '',
                url: 'https://docusign-git-main-daniel-8982s-projects.vercel.app?_vercel_share=aaQplppDthTyFoYeIQm75hkbCvNasDYo',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Macro bot',
                description: 'Text expansion Chrome extension for faster typing and productivity',
                status: 'In Progress',
                priority: 'Medium',
                progress: 60,
                tags: ['chrome-extension', 'productivity'],
                owner: '',
                dueDate: '',
                url: 'https://fountain-macro-assistant.vercel.app/',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            {
                id: '3',
                name: 'Availability Report',
                description: 'Automated scraper for OnceHub availability tracking and reporting',
                status: 'In Progress',
                priority: 'Medium',
                progress: 40,
                tags: ['automation', 'scraping'],
                owner: '',
                dueDate: '',
                url: 'https://website-puce-rho-32.vercel.app/',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            {
                id: '4',
                name: 'CS Escalation Service (DOES NOT WORK!)',
                description: 'Customer support escalation automation system - currently experiencing technical issues',
                status: 'On Hold',
                priority: 'Low',
                progress: 20,
                tags: ['support', 'automation'],
                owner: '',
                dueDate: '',
                url: 'https://escalation-service.vercel.app/',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            {
                id: '5',
                name: 'Time clock',
                description: 'Chrome extension for time tracking and attendance management',
                status: 'Completed',
                priority: 'High',
                progress: 100,
                tags: ['chrome-extension', 'time-tracking'],
                owner: '',
                dueDate: '',
                url: 'https://vercel.com/daniel-8982s-projects/time-clock-extension',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            {
                id: '6',
                name: 'Fountain Onboarding',
                description: 'Comprehensive onboarding portal for new employees with resources and documentation',
                status: 'In Progress',
                priority: 'High',
                progress: 90,
                tags: ['onboarding', 'portal'],
                owner: '',
                dueDate: '',
                url: 'https://fountain-onboarding.vercel.app/',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            {
                id: '7',
                name: 'Refund Calculator',
                description: 'Patient refund calculator for processing accurate medication and service refunds',
                status: 'In Progress',
                priority: 'Medium',
                progress: 90,
                tags: ['calculator', 'finance'],
                owner: '',
                dueDate: '',
                url: 'https://refund-calculator-five.vercel.app/',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            {
                id: '8',
                name: 'Itemized Receipts Builder',
                description: 'Tool for creating and managing detailed itemized receipts with line items and calculations',
                status: 'In Progress',
                priority: 'Medium',
                progress: 50,
                tags: ['receipts', 'builder', 'finance'],
                owner: '',
                dueDate: '',
                url: 'https://itemized-receipt-builder-git-main-daniel-8982s-projects.vercel.app?_vercel_share=Dl3dbceX927BjHqUggBpHHxAA308MpPL',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            {
                id: '9',
                name: 'File Conversion Tool',
                description: 'Universal file conversion tool for converting between various file formats (documents, images, etc.)',
                status: 'Completed',
                priority: 'Medium',
                progress: 100,
                tags: ['conversion', 'files', 'utility'],
                owner: '',
                dueDate: '',
                url: 'https://masterconvert-git-main-daniel-8982s-projects.vercel.app?_vercel_share=8XIsgP3ErAZlHtbs7J6QzPUpM8twnnLC',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            {
                id: '10',
                name: 'Resource Locater',
                description: 'Tool for locating and organizing resources, files, and assets efficiently',
                status: 'In Progress',
                priority: 'Medium',
                progress: 55,
                tags: ['resources', 'locator', 'organization'],
                owner: '',
                dueDate: '',
                url: 'https://vercel.com/daniel-8982s-projects/resource-locater',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            {
                id: '11',
                name: 'Document Scrapper',
                description: 'Automated tool for extracting and scraping data from documents and files',
                status: 'In Progress',
                priority: 'Medium',
                progress: 20,
                tags: ['scraping', 'documents', 'extraction'],
                owner: '',
                dueDate: '',
                url: 'https://doc-extraction-git-main-daniel-8982s-projects.vercel.app?_vercel_share=hqfJv0yDBleUR33ebQsoNWrc9gDOfMdE',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            },
            {
                id: '12',
                name: 'Fountain Projects',
                description: 'Central project management dashboard for tracking all tech development projects at Fountain Vitality. Features include project templates, bulk actions, filtering, search, and comprehensive project tracking with status, priority, and progress monitoring.',
                status: 'In Progress',
                priority: 'High',
                progress: 95,
                tags: ['dashboard', 'project-management', 'portal', 'tracking'],
                owner: '',
                dueDate: '',
                url: 'https://fountainprojects.vercel.app',
                created: new Date().toISOString(),
                modified: new Date().toISOString()
            }
        ];
    }

    esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    getStatusIcon(status) {
        const icons = {
            'In Progress': '🚀',
            'Completed': '✅',
            'On Hold': '⏸️',
            'Not Started': '📋',
            'Planning': '📝',
            'Review': '👀',
            'Archived': '📦'
        };
        return icons[status] || '📌';
    }

    getPriorityIcon(priority) {
        const icons = {
            'High': '🔴',
            'Medium': '🟡',
            'Low': '🟢',
            'Critical': '⚡'
        };
        return icons[priority] || '⚪';
    }
}

let db;
document.addEventListener('DOMContentLoaded', () => {
    db = new NotionDB();
});
