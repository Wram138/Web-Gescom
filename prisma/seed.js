const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando carga de dados padrão (seed)...');

  // Limpa registros anteriores se houver
  await prisma.saleItem.deleteMany();
  await prisma.salePayment.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.accountReceivable.deleteMany();
  await prisma.accountPayable.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSetting.deleteMany();

  // 1. Configuração do Sistema
  await prisma.systemSetting.create({
    data: {
      id: 'config_padrao',
      storeName: 'Web-Gescom Comercial & PDV',
      razaoSocial: 'Web-Gescom Tecnologia e Gestao LTDA',
      cnpj: '12.345.678/0001-90',
      inscricaoEstadual: 'ISENTO',
      inscricaoMunicipal: '',
      phone: '(11) 98765-4321',
      email: 'contato@webgescom.com.br',
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      numero: '100',
      complemento: 'Sala 101',
      bairro: 'Sé',
      cidade: 'São Paulo',
      uf: 'SP',
      address: 'Praça da Sé, 100 (Sala 101) - Sé, São Paulo/SP - CEP 01001-000',
      receiptFooter: 'Obrigado pela preferência! Volte sempre.',
      defaultCommissionRate: 5.0,
    },
  });

  // 2. Usuários
  const adminPass = await bcrypt.hash('admin123', 10);
  const gerentePass = await bcrypt.hash('gerente123', 10);
  const caixaPass = await bcrypt.hash('caixa123', 10);
  const vendedorPass = await bcrypt.hash('vendedor123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Administrador do Sistema',
      username: 'admin',
      passwordHash: adminPass,
      role: 'ADMIN',
      commissionRate: 0.0,
    },
  });

  const gerente = await prisma.user.create({
    data: {
      name: 'Gerente Geral',
      username: 'gerente',
      passwordHash: gerentePass,
      role: 'GERENTE',
      commissionRate: 0.0,
    },
  });

  const caixa = await prisma.user.create({
    data: {
      name: 'Operador de Caixa 01',
      username: 'caixa1',
      passwordHash: caixaPass,
      role: 'CAIXA',
      commissionRate: 0.0,
    },
  });

  const vendedor1 = await prisma.user.create({
    data: {
      name: 'Carlos Vendedor',
      username: 'vendedor1',
      passwordHash: vendedorPass,
      role: 'VENDEDOR',
      commissionRate: 5.0, // 5% de comissão
    },
  });

  const vendedor2 = await prisma.user.create({
    data: {
      name: 'Mariana Silva',
      username: 'vendedor2',
      passwordHash: vendedorPass,
      role: 'VENDEDOR',
      commissionRate: 4.0, // 4% de comissão
    },
  });

  // 3. Categorias
  const catBebidas = await prisma.category.create({ data: { name: 'Bebidas' } });
  const catAlimentos = await prisma.category.create({ data: { name: 'Alimentos' } });
  const catInformatica = await prisma.category.create({ data: { name: 'Informática & Acessórios' } });
  const catLimpeza = await prisma.category.create({ data: { name: 'Limpeza & Higiene' } });

  // 4. Fornecedores
  const fornAmbev = await prisma.supplier.create({
    data: {
      name: 'Distribuidora Central Ltda',
      cnpj: '22.333.444/0001-55',
      phone: '(11) 3333-4444',
      email: 'contato@distcentral.com.br',
      contactName: 'Roberto Alves',
    },
  });

  const fornTech = await prisma.supplier.create({
    data: {
      name: 'Tech Distribuidora Express',
      cnpj: '55.666.777/0001-88',
      phone: '(11) 4444-5555',
      email: 'vendas@techdist.com.br',
      contactName: 'Juliana Costa',
    },
  });

  // 5. Clientes
  const cliConsumidor = await prisma.customer.create({
    data: {
      name: 'Consumidor Final (Balcão)',
      cpfCnpj: '000.000.000-00',
      creditLimit: 0,
      notes: 'Cliente padrão de vendas à vista',
    },
  });

  const cliFidelidade = await prisma.customer.create({
    data: {
      name: 'João Pedro da Silva',
      cpfCnpj: '123.456.789-00',
      phone: '(11) 99887-7665',
      address: 'Rua das Flores, 123',
      creditLimit: 1500.0, // Limite para Crediário/A Prazo
      notes: 'Cliente com limite de crediário liberado',
    },
  });

  // 6. Produtos
  const produtos = [
    {
      code: 'PROD-001',
      barcode: '7891000100101',
      name: 'Refrigerante Coca-Cola 2L',
      unit: 'UN',
      categoryId: catBebidas.id,
      supplierId: fornAmbev.id,
      costPrice: 6.50,
      salePrice: 10.90,
      stockQuantity: 48,
      minStock: 12,
    },
    {
      code: 'PROD-002',
      barcode: '7891000100102',
      name: 'Água Mineral sem Gás 500ml',
      unit: 'UN',
      categoryId: catBebidas.id,
      supplierId: fornAmbev.id,
      costPrice: 1.20,
      salePrice: 3.50,
      stockQuantity: 120,
      minStock: 24,
    },
    {
      code: 'PROD-003',
      barcode: '7891000100103',
      name: 'Mouse Óptico USB Gamer 3200DPI',
      unit: 'UN',
      categoryId: catInformatica.id,
      supplierId: fornTech.id,
      costPrice: 28.00,
      salePrice: 59.90,
      stockQuantity: 15,
      minStock: 5,
    },
    {
      code: 'PROD-004',
      barcode: '7891000100104',
      name: 'Teclado Multimídia ABNT2 USB',
      unit: 'UN',
      categoryId: catInformatica.id,
      supplierId: fornTech.id,
      costPrice: 35.00,
      salePrice: 75.00,
      stockQuantity: 10,
      minStock: 3,
    },
    {
      code: 'PROD-005',
      barcode: '7891000100105',
      name: 'Detergente Neutro 500ml',
      unit: 'UN',
      categoryId: catLimpeza.id,
      supplierId: fornAmbev.id,
      costPrice: 1.80,
      salePrice: 3.20,
      stockQuantity: 60,
      minStock: 15,
    },
    {
      code: 'PROD-006',
      barcode: '7891000100106',
      name: 'Arroz Tipo 1 - Pacote 5Kg',
      unit: 'UN',
      categoryId: catAlimentos.id,
      supplierId: fornAmbev.id,
      costPrice: 21.00,
      salePrice: 29.90,
      stockQuantity: 30,
      minStock: 10,
    },
  ];

  for (const prod of produtos) {
    const created = await prisma.product.create({ data: prod });
    // Registra movimento inicial de estoque
    await prisma.stockMovement.create({
      data: {
        productId: created.id,
        type: 'ENTRADA',
        quantity: prod.stockQuantity,
        previousStock: 0,
        newStock: prod.stockQuantity,
        reason: 'Estoque inicial de implantação',
        userId: admin.id,
      },
    });
  }

  // 7. Contas a Pagar de Exemplo
  await prisma.accountPayable.create({
    data: {
      description: 'Aluguel do Ponto Comercial',
      amount: 1800.0,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Daqui a 10 dias
      status: 'PENDENTE',
      category: 'Despesa Fixa',
      notes: 'Vence todo dia 05',
    },
  });

  await prisma.accountPayable.create({
    data: {
      description: 'Conta de Energia Elétrica',
      amount: 435.50,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      status: 'PENDENTE',
      category: 'Despesa Fixa',
    },
  });

  await prisma.accountPayable.create({
    data: {
      description: 'Fatura de Fornecedor - Compra de Bebidas',
      supplierId: fornAmbev.id,
      amount: 1250.0,
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Venceu há 2 dias (Atrasada)
      status: 'ATRASADO',
      category: 'Compra de Mercadoria',
    },
  });

  console.log('Seed concluído com sucesso!');
  console.log('--- Credenciais Padrão ---');
  console.log('Admin:   admin / admin123');
  console.log('Gerente: gerente / gerente123');
  console.log('Caixa:   caixa1 / caixa123');
  console.log('Vendedor: vendedor1 / vendedor123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

