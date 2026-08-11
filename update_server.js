const fs = require('fs');
const apiContent = fs.readFileSync('netlify/functions/api.ts', 'utf-8');
const serverContent = fs.readFileSync('server.ts', 'utf-8');

const apiRoutes = apiContent.match(/app\.post\("\/api\/parse-speech"[\s\S]*?\/\/ API Route for Excel parsing/)[0];
const apiExcelRoutes = apiContent.match(/app\.post\("\/api\/parse-excel"[\s\S]*?\}\);\n/)[0];

let newServerContent = serverContent.replace(/app\.post\("\/api\/parse-speech"[\s\S]*?\/\/ API Route for Excel parsing/, apiRoutes);
newServerContent = newServerContent.replace(/app\.post\("\/api\/parse-excel"[\s\S]*?\}\);\n/, apiExcelRoutes);

fs.writeFileSync('server.ts', newServerContent);
