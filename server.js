const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');

// Helper functions for reading/writing data
async function readNotes() {
    try {
        const data = await fs.readFile(NOTES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.writeFile(NOTES_FILE, '[]');
            return [];
        }
        throw error;
    }
}

async function writeNotes(notes) {
    await fs.writeFile(NOTES_FILE, JSON.stringify(notes, null, 2));
}

async function readCategories() {
    try {
        const data = await fs.readFile(CATEGORIES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const defaultCategories = ["Study", "Programming", "Personal", "Work", "Projects", "Other"];
            await fs.writeFile(CATEGORIES_FILE, JSON.stringify(defaultCategories, null, 2));
            return defaultCategories;
        }
        throw error;
    }
}

// API Endpoints

// GET /api/categories
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await readCategories();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read categories' });
    }
});

// GET /api/notes
app.get('/api/notes', async (req, res) => {
    try {
        const notes = await readNotes();
        res.json(notes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read notes' });
    }
});

// GET /api/notes/:id
app.get('/api/notes/:id', async (req, res) => {
    try {
        const notes = await readNotes();
        const note = notes.find(n => n.id === req.params.id);
        if (!note) return res.status(404).json({ error: 'Note not found' });
        res.json(note);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read note' });
    }
});

// POST /api/notes
app.post('/api/notes', async (req, res) => {
    try {
        const { title, content, category, tags } = req.body;
        
        if (!title || !content || !category) {
            return res.status(400).json({ error: 'Title, content, and category are required' });
        }

        const notes = await readNotes();
        
        const newNote = {
            id: Date.now().toString(),
            title,
            content,
            category,
            tags: Array.isArray(tags) ? tags : [],
            pinned: false,
            archived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        notes.push(newNote);
        await writeNotes(notes);
        
        res.status(201).json(newNote);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create note' });
    }
});

// PUT /api/notes/:id
app.put('/api/notes/:id', async (req, res) => {
    try {
        const { title, content, category, tags } = req.body;
        
        if (!title || !content || !category) {
            return res.status(400).json({ error: 'Title, content, and category are required' });
        }

        const notes = await readNotes();
        const index = notes.findIndex(n => n.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Note not found' });
        }

        notes[index] = {
            ...notes[index],
            title,
            content,
            category,
            tags: Array.isArray(tags) ? tags : [],
            updatedAt: new Date().toISOString()
        };

        await writeNotes(notes);
        res.json(notes[index]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// DELETE /api/notes/:id
app.delete('/api/notes/:id', async (req, res) => {
    try {
        const notes = await readNotes();
        const index = notes.findIndex(n => n.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Note not found' });
        }

        notes.splice(index, 1);
        await writeNotes(notes);
        
        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// GET /api/notes/search/:keyword
app.get('/api/notes/search/:keyword', async (req, res) => {
    try {
        const keyword = req.params.keyword.toLowerCase();
        const notes = await readNotes();
        
        const filtered = notes.filter(note => {
            const titleMatch = note.title.toLowerCase().includes(keyword);
            const contentMatch = note.content.toLowerCase().includes(keyword);
            const categoryMatch = note.category.toLowerCase().includes(keyword);
            const tagsMatch = note.tags.some(tag => tag.toLowerCase().includes(keyword));
            
            return titleMatch || contentMatch || categoryMatch || tagsMatch;
        });

        res.json(filtered);
    } catch (error) {
        res.status(500).json({ error: 'Failed to search notes' });
    }
});

// PATCH /api/notes/:id/pin
app.patch('/api/notes/:id/pin', async (req, res) => {
    try {
        const notes = await readNotes();
        const index = notes.findIndex(n => n.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Note not found' });
        }

        notes[index].pinned = !notes[index].pinned;
        notes[index].updatedAt = new Date().toISOString();
        
        await writeNotes(notes);
        res.json(notes[index]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to toggle pin' });
    }
});

// PATCH /api/notes/:id/archive
app.patch('/api/notes/:id/archive', async (req, res) => {
    try {
        const notes = await readNotes();
        const index = notes.findIndex(n => n.id === req.params.id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Note not found' });
        }

        notes[index].archived = !notes[index].archived;
        notes[index].updatedAt = new Date().toISOString();
        
        await writeNotes(notes);
        res.json(notes[index]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to toggle archive' });
    }
});

// Fallback for SPA or unknown routes to serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
function startServer(port) {
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`Server is running on port ${port}`);
        
        // Automatically open the default web browser (for local usage)
        const url = `http://localhost:${port}`;
        const { exec } = require('child_process');
        const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
        
        exec(`${command} ${url}`, (err) => {
            if (err) {
                console.log(`Please manually open your browser and navigate to: ${url}`);
            }
        });
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is already in use. Trying port ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });
}

startServer(PORT);
