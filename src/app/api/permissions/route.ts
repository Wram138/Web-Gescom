import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const ALL_MODULES = [
  { id: 'dashboard', label: 'Dashboard & Indicadores', path: '/' },
  { id: 'pdv', label: 'Frente de Caixa (PDV)', path: '/pdv' },
  { id: 'produtos', label: 'Estoque & Produtos', path: '/produtos' },
  { id: 'clientes', label: 'Clientes & Revenda', path: '/clientes' },
  { id: 'vendas', label: 'Vendas & Histórico', path: '/vendas' },
  { id: 'caixa', label: 'Turno de Caixa', path: '/caixa' },
  { id: 'comissoes', label: 'Comissões de Vendedores', path: '/comissoes' },
  { id: 'contas_pagar', label: 'Contas a Pagar', path: '/contas-pagar' },
  { id: 'contas_receber', label: 'Contas a Receber', path: '/contas-receber' },
  { id: 'usuarios', label: 'Usuários & Permissões', path: '/usuarios' },
];

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ALL_MODULES.map((m) => m.id),
  GERENTE: ['dashboard', 'pdv', 'produtos', 'clientes', 'vendas', 'caixa', 'comissoes', 'contas_pagar', 'contas_receber'],
  CAIXA: ['pdv', 'clientes', 'vendas', 'caixa'],
  VENDEDOR: ['pdv', 'produtos', 'clientes', 'comissoes'],
};

export async function GET() {
  try {
    const existing = await prisma.rolePermission.findMany();

    const permMap: Record<string, string[]> = { ...DEFAULT_PERMISSIONS };

    if (existing.length === 0) {
      // Cria no banco caso seja a primeira consulta
      for (const [role, modules] of Object.entries(DEFAULT_PERMISSIONS)) {
        await prisma.rolePermission.create({
          data: {
            role,
            modules: JSON.stringify(modules),
          },
        });
      }
    } else {
      existing.forEach((p) => {
        try {
          permMap[p.role] = JSON.parse(p.modules);
        } catch {
          permMap[p.role] = DEFAULT_PERMISSIONS[p.role] || [];
        }
      });
    }

    // Garante que ADMIN sempre tenha todos os módulos
    permMap.ADMIN = ALL_MODULES.map((m) => m.id);

    return NextResponse.json({
      permissions: permMap,
      allModules: ALL_MODULES,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { role, modules, requestUserRole } = body;

    // Apenas ADMIN pode editar permissões
    if (requestUserRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administradores podem alterar permissões de perfis' }, { status: 403 });
    }

    if (!role || !Array.isArray(modules)) {
      return NextResponse.json({ error: 'Perfil e lista de módulos são obrigatórios' }, { status: 400 });
    }

    if (role === 'ADMIN') {
      return NextResponse.json({ error: 'As permissões do Administrador não podem ser restringidas' }, { status: 400 });
    }

    const updated = await prisma.rolePermission.upsert({
      where: { role },
      create: {
        role,
        modules: JSON.stringify(modules),
      },
      update: {
        modules: JSON.stringify(modules),
      },
    });

    return NextResponse.json({
      success: true,
      role: updated.role,
      modules: JSON.parse(updated.modules),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
