require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// Supabase connection
const supabaseUrl = 'https://wuxjtzmlollwcckuhsxv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1eGp0em1sb2xsd2Nja3Voc3h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2NzE4NTUsImV4cCI6MjA2MDI0Nzg1NX0.16_PQqkaCt_yeGjLDJA2_sswlm5Y2UrVRWELZdsxdSY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{ username, email, password: hashedPassword }]);

    if (error) {
      if (error.code === '23505') { // Unique constraint violation in PostgreSQL
        return res.status(400).json({ message: 'Username or email already exists' });
      }
      return res.status(500).json({ message: 'Error registering user' });
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error registering user' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = data;
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, 'your-secret-key', { expiresIn: '24h' });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Forgot password endpoint
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  const resetToken = Math.random().toString(36).substring(2, 15);

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ reset_token: resetToken })
      .eq('email', email);

    if (error) {
      return res.status(500).json({ message: 'Error processing request' });
    }

    if (data && data.length === 0) {
      return res.status(404).json({ message: 'Email not found' });
    }

    // Send email with reset token (implement email sending logic here)
    res.json({ message: 'Reset token sent to email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error processing request' });
  }
});

// Task endpoints
app.post('/api/tasks', (req, res) => {
  const { title, description, category, due_date } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, 'your-secret-key');

    supabase
      .from('tasks')
      .insert([{
        user_id: decoded.id,
        title,
        description,
        category,
        due_date
      }])
      .select()
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Error creating task' });
        }

        // Handle the case where data might be null or empty
        const taskId = data && data.length > 0 ? data[0].id : null;
        res.status(201).json({
          message: 'Task created successfully',
          id: taskId
        });
      });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Invalid token' });
  }
});

app.get('/api/tasks', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, 'your-secret-key');

    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', decoded.id)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Error fetching tasks' });
        }
        res.json(data);
      });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Task completion endpoint
app.put('/api/tasks/:id/complete', (req, res) => {
  const taskId = req.params.id;
  const { completed } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, 'your-secret-key');

    supabase
      .from('tasks')
      .update({ completed })
      .eq('id', taskId)
      .eq('user_id', decoded.id)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Error updating task' });
        }
        res.json({ message: 'Task updated successfully' });
      });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Task deletion endpoint
app.delete('/api/tasks/:id', (req, res) => {
  const taskId = req.params.id;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, 'your-secret-key');

    supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', decoded.id)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Error deleting task' });
        }
        res.json({ message: 'Task deleted successfully' });
      });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Note endpoints
app.post('/api/notes', (req, res) => {
  const { title, content, color } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, 'your-secret-key');

    supabase
      .from('notes')
      .insert([{
        user_id: decoded.id,
        title,
        content,
        color
      }])
      .select()
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Error creating note' });
        }

        // Handle the case where data might be null or empty
        const noteId = data && data.length > 0 ? data[0].id : null;
        res.status(201).json({
          message: 'Note created successfully',
          id: noteId
        });
      });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Invalid token' });
  }
});

app.get('/api/notes', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, 'your-secret-key');

    supabase
      .from('notes')
      .select('*')
      .eq('user_id', decoded.id)
      .eq('is_trashed', false)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Error fetching notes' });
        }
        res.json(data);
      });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Get trashed notes endpoint
app.get('/api/notes/trash', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, 'your-secret-key');

    supabase
      .from('notes')
      .select('*')
      .eq('user_id', decoded.id)
      .eq('is_trashed', true)
      .order('trashed_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Error fetching trashed notes' });
        }
        res.json(data);
      });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Batch permanently delete notes - MUST be before the parameterized routes
app.delete('/api/notes/permanent', (req, res) => {
  const { noteIds } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });
  if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
    return res.status(400).json({ message: 'No note IDs provided' });
  }

  try {
    const decoded = jwt.verify(token, 'your-secret-key');

    supabase
      .from('notes')
      .delete()
      .in('id', noteIds)
      .eq('user_id', decoded.id)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Error deleting notes' });
        }
        res.json({ message: 'Notes permanently deleted' });
      });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Empty trash - delete all trashed notes permanently - MUST be before the parameterized routes
app.delete('/api/notes/trash/empty', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, 'your-secret-key');

    supabase
      .from('notes')
      .delete()
      .eq('user_id', decoded.id)
      .eq('is_trashed', true)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Error emptying trash' });
        }
        res.json({ message: 'Trash emptied successfully' });
      });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Only after the non-parameterized routes come the parameterized ones:
app.delete('/api/notes/:id', (req, res) => {
  const noteId = req.params.id;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, 'your-secret-key');

    supabase
      .from('notes')
      .update({
        is_trashed: true,
        trashed_at: new Date().toISOString(),
        delete_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', noteId)
      .eq('user_id', decoded.id)
      .eq('is_trashed', false)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Error moving note to trash' });
        }
        res.json({ message: 'Note moved to trash successfully' });
      });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Permanently delete a note
app.delete('/api/notes/:id/permanent', (req, res) => {
  const noteId = req.params.id;
  // Validate this is a numeric ID to prevent route conflict issues
  if (isNaN(parseInt(noteId))) {
    return res.status(400).json({ message: 'Invalid note ID format' });
  }

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, 'your-secret-key');

    supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', decoded.id)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Error permanently deleting note' });
        }
        res.json({ message: 'Note permanently deleted' });
      });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Restore a note from trash
app.post('/api/notes/:id/restore', (req, res) => {
  const noteId = req.params.id;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, 'your-secret-key');

    supabase
      .from('notes')
      .update({
        is_trashed: false,
        trashed_at: null,
        delete_after: null
      })
      .eq('id', noteId)
      .eq('user_id', decoded.id)
      .eq('is_trashed', true)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Error restoring note' });
        }
        res.json({ message: 'Note restored successfully' });
      });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Batch restore notes
app.post('/api/notes/restore', (req, res) => {
  const { noteIds } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });
  if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
    return res.status(400).json({ message: 'No note IDs provided' });
  }

  try {
    const decoded = jwt.verify(token, 'your-secret-key');

    supabase
      .from('notes')
      .update({
        is_trashed: false,
        trashed_at: null,
        delete_after: null
      })
      .in('id', noteIds)
      .eq('user_id', decoded.id)
      .eq('is_trashed', true)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Error restoring notes' });
        }
        res.json({ message: 'Notes restored successfully' });
      });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Update a note
app.put('/api/notes/:id', (req, res) => {
  const noteId = req.params.id;
  const { title, content, color, last_edited } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, 'your-secret-key');

    supabase
      .from('notes')
      .update({
        title,
        content,
        color,
        last_edited
      })
      .eq('id', noteId)
      .eq('user_id', decoded.id)
      .eq('is_trashed', false)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ message: 'Error updating note' });
        }
        res.json({ message: 'Note updated successfully' });
      });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Add scheduled job to auto-delete expired notes
const scheduleAutoDelete = () => {
  // If you're using node-schedule:
  // const schedule = require('node-schedule');
  // schedule.scheduleJob('0 0 * * *', async () => { // Run at midnight every day
  //   try {
  //     const { data, error } = await supabase
  //       .from('notes')
  //       .delete()
  //       .eq('is_trashed', true)
  //       .lte('delete_after', new Date().toISOString());
  //     
  //     if (error) {
  //       console.error('Error cleaning up expired trashed notes:', error);
  //     } else {
  //       console.log(`Auto-cleanup completed: Removed ${data ? data.length : 0} expired notes from trash`);
  //     }
  //   } catch (err) {
  //     console.error('Error in scheduled cleanup job:', err);
  //   }
  // });

  // For now, let's just log a reminder to implement this
  console.log('Note: You should implement the scheduled auto-delete job using node-schedule or similar');
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  scheduleAutoDelete(); // Initialize the scheduled job
}); 