class NotionDB {
    constructor() {
        this.projects = this.load();
        this.editing = null;
        this.init();
    }

    init() {
        this.render();
        this.bind();
    }

    bind() {
        document.getElementById('newBtn').onclick = () => this.openModal();
        document.getElementById('closeBtn').onclick = () => this.closeModal();
        document.getElementById('cancelBtn').onclick = () => this.closeModal();
        document.getElementById('projectForm').onsubmit = (e) => {
            e.preventDefault();
            this.save();
        };
        document.querySelector('.modal-overlay').onclick = () => this.closeModal();
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

    save() {
        const data = {
            id: this.editing || Date.now().toString(),
            name: document.getElementById('name').value,
            status: document.getElementById('status').value,
            owner: document.getElementById('owner').value,
            dueDate: document.getElementById('dueDate').value,
            url: document.getElementById('url').value
        };

        if (this.editing) {
            const i = this.projects.findIndex(x => x.id === this.editing);
            this.projects[i] = data;
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
        localStorage.setItem('fountainProjects', JSON.stringify(this.projects));
    }

    load() {
        const saved = localStorage.getItem('fountainProjects');
        return saved ? JSON.parse(saved) : this.defaults();
    }

    defaults() {
        return [{
            id: '1',
            name: 'Docusign Template Generator',
            status: 'In Progress',
            owner: '',
            dueDate: '',
            url: 'https://docusign-git-main-daniel-8982s-projects.vercel.app?_vercel_share=aaQplppDthTyFoYeIQm75hkbCvNasDYo'
        }];
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
