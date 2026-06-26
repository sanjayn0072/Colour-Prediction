import fs from 'fs';

const path = 'C:/Users/20092/.gemini/antigravity/scratch/colour-prediction-website/frontend/src/pages/AdminDashboard.jsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('return (') && (line.includes('export') || lines[idx - 1].includes('AdminDashboard') || lines[idx - 2].includes('AdminDashboard') || lines[idx - 3].includes('AdminDashboard'))) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  } else if (line.trim() === 'return (' && idx < 1000) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
