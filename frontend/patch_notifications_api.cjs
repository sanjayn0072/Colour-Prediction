const fs = require('fs');
const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/LegacyAdminDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

const oldFetch = `const fetchBroadcastLogs = async () => {
    try {
      const res = await api.get('/admin/notifications');
      setBroadcastLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch broadcast logs', err);
    }
  };`;

const newFetch = `const fetchBroadcastLogs = async () => {
    try {
      const res = await fetch(\`\${import.meta.env.VITE_API_URL || ''}/api/admin/notifications\`, {
        headers: { 'Authorization': \`Bearer \${adminToken}\` }
      });
      const data = await res.json();
      if (res.ok) {
        setBroadcastLogs(data);
      } else {
        console.error('Failed to fetch broadcast logs', data.error);
      }
    } catch (err) {
      console.error('Failed to fetch broadcast logs', err);
    }
  };`;

const oldSubmit = `  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    setBroadcasting(true);
    try {
      const payload = {
        target: broadcastTarget,
        title: broadcastTitle,
        message: broadcastMessage,
        type: broadcastType
      };
      if (broadcastTarget === 'SPECIFIC_USER') {
        payload.target_user_id = broadcastUserId;
      }
      
      await api.post('/admin/notifications/broadcast', payload);
      toast.success('Broadcast dispatched successfully!');
      
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastUserId('');
      fetchBroadcastLogs();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to dispatch broadcast');
    } finally {
      setBroadcasting(false);
    }
  };`;

const newSubmit = `  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    setBroadcasting(true);
    try {
      const payload = {
        target: broadcastTarget,
        title: broadcastTitle,
        message: broadcastMessage,
        type: broadcastType
      };
      if (broadcastTarget === 'SPECIFIC_USER') {
        payload.target_user_id = broadcastUserId;
      }
      
      const res = await fetch(\`\${import.meta.env.VITE_API_URL || ''}/api/admin/notifications/broadcast\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${adminToken}\`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        alert('Broadcast dispatched successfully!');
        setBroadcastTitle('');
        setBroadcastMessage('');
        setBroadcastUserId('');
        fetchBroadcastLogs();
      } else {
        alert(data.error || 'Failed to dispatch broadcast');
      }
    } catch (err) {
      console.error('Broadcast error:', err);
      alert('Failed to dispatch broadcast: Network Error');
    } finally {
      setBroadcasting(false);
    }
  };`;

content = content.replace(oldFetch, newFetch);
content = content.replace(oldSubmit, newSubmit);

fs.writeFileSync(path, content);
console.log('Fixed API fetch and toast logic.');
