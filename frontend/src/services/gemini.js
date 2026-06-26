/**
 * Customer Support Chat Client
 * Proxies support chat queries through the secure backend API.
 */
export async function askGemini(message, chatHistory = []) {
  const token = localStorage.getItem('token');
  const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

  if (!token) {
    throw new Error('You must be logged in to chat with support.');
  }

  const response = await fetch(`${API_BASE}/api/support/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      message,
      chatHistory
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Support service error.');
  }

  const data = await response.json();
  return data.text;
}
