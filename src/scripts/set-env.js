const fs = require('fs');
const targetPath = './src/environments/environment.ts';

// Cria o diretório se não existir
if (!fs.existsSync('./src/environments')) {
  fs.mkdirSync('./src/environments', { recursive: true });
}

// Conteúdo que será gerado dinamicamente dentro do Vercel
const envConfigFile = `
export const environment = {
  production: true,
  sheetDbUrl: '${process.env.SHEETDB_URL || "https://sheetdb.io/api/v1/mh0mqwbasa42t"}'
};
`;

fs.writeFileSync(targetPath, envConfigFile);
console.log(`✅ Arquivo environment criado em ${targetPath}`);
