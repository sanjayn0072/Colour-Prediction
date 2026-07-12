const fs = require('fs');
const lines = fs.readFileSync('C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/LegacyAdminDashboard.jsx', 'utf8').split('\n');

let start = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("activeTab === 'credentials'")) {
    start = i;
    break;
  }
}

if (start !== -1) {
  // Find where this block ends. We can search for the next `activeTab ===` or just dump the next 100 lines and look manually.
  for (let i = start; i < start + 100 && i < lines.length; i++) {
    console.log((i + 1) + ': ' + lines[i]);
  }
} else {
  console.log("Not found.");
}
