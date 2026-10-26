const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const prismaDir = path.join(__dirname, '..', 'prisma');
const cleanDbPath = path.join(prismaDir, 'clean_template.db');
const currentDbPath = path.join(prismaDir, 'gescom.db');

function createCleanDatabase() {
  console.log('Criando banco de dados limpo para o instalador...');

  if (fs.existsSync(cleanDbPath)) {
    fs.unlinkSync(cleanDbPath);
  }
  fs.copyFileSync(currentDbPath, cleanDbPath);

  const db = new DatabaseSync(cleanDbPath);

  db.exec('PRAGMA foreign_keys = OFF;');

  // Limpa tabelas transacionais e dados de teste
  db.exec('DELETE FROM SaleItem;');
  db.exec('DELETE FROM SalePayment;');
  db.exec('DELETE FROM Commission;');
  db.exec('DELETE FROM AccountReceivable;');
  db.exec('DELETE FROM AccountPayable;');
  db.exec('DELETE FROM CashMovement;');
  db.exec('DELETE FROM Sale;');
  db.exec('DELETE FROM CashRegister;');
  db.exec('DELETE FROM StockMovement;');
  db.exec('DELETE FROM Product;');
  db.exec('DELETE FROM Category;');
  db.exec('DELETE FROM Supplier;');
  db.exec('DELETE FROM Customer;');

  // Mantém apenas o usuário Administrador padrão e reseta o SystemSetting para estado inicial
  db.exec("DELETE FROM User WHERE username != 'admin';");
  db.exec("UPDATE User SET name = 'Administrador', username = 'admin' WHERE username = 'admin';");
  
  // Reseta configurações para o cliente configurar o CNPJ e razão social próprios
  db.exec(`UPDATE SystemSetting SET 
    storeName = 'Minha Empresa Comercial', 
    razaoSocial = '',
    cnpj = '', 
    inscricaoEstadual = 'ISENTO',
    inscricaoMunicipal = '',
    phone = '', 
    email = '',
    cep = '',
    logradouro = '',
    numero = '',
    complemento = '',
    bairro = '',
    cidade = '',
    uf = 'SP',
    address = '', 
    receiptFooter = 'Obrigado pela preferência! Volte sempre.'
    WHERE id = 'config_padrao';`);

  // Executa VACUUM para reduzir o tamanho do banco limpo
  db.exec('VACUUM;');
  db.close();

  const stats = fs.statSync(cleanDbPath);
  console.log(`Banco limpo criado com sucesso em: ${cleanDbPath} (${(stats.size / 1024).toFixed(1)} KB)`);
}

createCleanDatabase();
