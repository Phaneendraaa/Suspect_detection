For Frontend :

cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install ajv@6 ajv-keywords@3
npm install --legacy-peer-deps
npm start

for backend :

cd backend
npm install
npm start



