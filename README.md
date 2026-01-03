# Fountain Vitality - Project Management Dashboard

A modern, responsive web application for managing and tracking projects for Fountain Vitality.

## Features

### 📊 Project Management
- **Add/Edit/Delete Projects**: Full CRUD operations for project management
- **Project Details**: Track name, status, priority, due date, description, owner, and progress
- **Visual Progress Tracking**: Progress bars and percentage indicators for each project

### 🎯 Project Status Options
- Planning
- In Progress
- Review
- On Hold
- Completed

### ⚡ Priority Levels
- Low
- Medium
- High
- Critical

### 🔍 Filtering & Search
- Filter by project status
- Filter by priority level
- Real-time search across project names, descriptions, and owners

### 📈 Dashboard Statistics
- Total projects count
- Active projects (In Progress, Planning, Review)
- Completed projects

### 💾 Data Persistence
- Projects are automatically saved to browser's local storage
- Data persists across browser sessions
- Sample projects included for demonstration

### 🎨 Modern UI/UX
- Beautiful gradient design
- Responsive layout (works on desktop, tablet, and mobile)
- Smooth animations and transitions
- Intuitive card-based layout
- Color-coded priority badges
- Visual indicators for overdue projects

## Getting Started

### Installation
1. Clone or download this repository
2. Open `index.html` in a modern web browser

That's it! No build process or dependencies required.

### Usage

#### Adding a Project
1. Click the "Add New Project" button
2. Fill in the project details (name and status are required)
3. Click "Save Project"

#### Editing a Project
1. Click the "Edit" button on any project card
2. Modify the details in the form
3. Click "Save Project"

#### Deleting a Project
1. Click the "Delete" button on any project card
2. Confirm the deletion

#### Filtering Projects
- Use the dropdown filters to show projects by status or priority
- Use the search box to find specific projects

## File Structure

```
fountain-vitality/
├── index.html      # Main HTML structure
├── styles.css      # Styling and responsive design
├── script.js       # Application logic and functionality
└── README.md       # Documentation (this file)
```

## Browser Compatibility

This application works on all modern browsers including:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with Grid and Flexbox
- **JavaScript (ES6+)**: Vanilla JavaScript with classes
- **Local Storage API**: Data persistence

## Customization

### Colors
Edit the CSS variables in `styles.css` to change the color scheme:

```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #0ea5e9;
    --success-color: #10b981;
    --warning-color: #f59e0b;
    --danger-color: #ef4444;
}
```

### Sample Projects
Edit the `getSampleProjects()` method in `script.js` to change or remove default projects.

## Future Enhancements

Potential features for future versions:
- Export projects to CSV/PDF
- Team collaboration features
- Email notifications for due dates
- File attachments
- Comments and activity log
- Backend integration for multi-user access
- Calendar view
- Kanban board view
- Time tracking

## Support

For questions or issues, please contact the development team.

---

**Built for Fountain Vitality** 🌊
*Version 1.0 - January 2026*

