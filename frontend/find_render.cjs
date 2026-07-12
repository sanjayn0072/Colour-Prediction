const fs = require('fs');
const lines = fs.readFileSync('C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/LegacyAdminDashboard.jsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("activeTab === 'credentials'")) {
    console.log((i+1) + ": " + lines[i]);
  }
}
