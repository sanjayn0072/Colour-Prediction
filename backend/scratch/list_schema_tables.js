import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, '../config/schema.sql');
const content = fs.readFileSync(schemaPath, 'utf8');

const regex = /CREATE TABLE\s+(\w+)/gi;
let match;
const tables = [];
while ((match = regex.exec(content)) !== null) {
  tables.push(match[1]);
}

console.log("Tables defined in schema.sql:", tables);
