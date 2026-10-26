import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const [traditionalSuppliers, personSuppliers] = await Promise.all([
      prisma.supplier.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
      prisma.customer.findMany({
        where: { active: true, isSupplier: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Mapeia pessoas cadastradas como fornecedor para o mesmo formato
    const mappedPersonSuppliers = personSuppliers.map((p) => ({
      id: p.id,
      name: p.name,
      cnpj: p.cpfCnpj,
      phone: p.phone,
      email: p.email,
      contactName: p.name,
      address: p.address,
      isPerson: true,
      active: p.active,
    }));

    return NextResponse.json([...mappedPersonSuppliers, ...traditionalSuppliers]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, cnpj, phone, email, contactName, address } = data;
    if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });

    const supplier = await prisma.supplier.create({
      data: { name, cnpj, phone, email, contactName, address },
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

