import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        commissionRate: true,
        monthlyGoal: true,
        active: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, username, password, role, commissionRate, monthlyGoal, active } = data;

    if (!name || !username || !password) {
      return NextResponse.json({ error: 'Nome, usuário e senha são obrigatórios' }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return NextResponse.json({ error: 'Nome de usuário já está em uso' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        username,
        passwordHash,
        role: role || 'VENDEDOR',
        commissionRate: Number(commissionRate) || 0.0,
        monthlyGoal: Number(monthlyGoal) || 0.0,
        active: active !== undefined ? active : true,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        commissionRate: true,
        monthlyGoal: true,
        active: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const { id, name, username, password, role, commissionRate, monthlyGoal, active } = data;

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 });
    }

    const updateData: any = {
      name,
      username,
      role,
      commissionRate: Number(commissionRate) || 0.0,
      monthlyGoal: monthlyGoal !== undefined ? Number(monthlyGoal) : 0.0,
      active,
    };

    if (password && password.trim().length > 0) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        commissionRate: true,
        monthlyGoal: true,
        active: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

