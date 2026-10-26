import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const versionJsonPath = path.join(process.cwd(), 'src', 'lib', 'version.json');
const versionIniPath = path.join(process.cwd(), 'version.ini');
const packageJsonPath = path.join(process.cwd(), 'package.json');

export async function GET() {
  try {
    if (fs.existsSync(versionJsonPath)) {
      const data = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
      return NextResponse.json(data);
    }
    return NextResponse.json({ version: '1.0.0', build: 1, updatedAt: new Date().toISOString(), history: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, bumpType } = body;

    let versionData = {
      version: '1.0.0',
      build: 1,
      updatedAt: new Date().toISOString(),
      history: [] as any[],
    };

    if (fs.existsSync(versionJsonPath)) {
      versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
    }

    // Incrementa build
    versionData.build = (versionData.build || 0) + 1;
    versionData.updatedAt = new Date().toISOString();

    // Bump semver se pedido
    if (bumpType) {
      let [maj, min, pat] = versionData.version.split('.').map(Number);
      if (bumpType === 'major') {
        maj++;
        min = 0;
        pat = 0;
      } else if (bumpType === 'minor') {
        min++;
        pat = 0;
      } else if (bumpType === 'patch') {
        pat++;
      }
      versionData.version = `${maj}.${min}.${pat}`;
    }

    if (title) {
      const today = new Date().toISOString().split('T')[0];
      versionData.history.unshift({
        version: versionData.version,
        build: versionData.build,
        date: today,
        title,
        description: description || 'Alteração registrada no sistema.',
      });
    }

    fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2), 'utf8');

    // Sincroniza version.ini
    const iniContent = `[Version]\nVersion=${versionData.version}\nBuild=${versionData.build}\nUpdatedAt=${versionData.updatedAt}\n`;
    fs.writeFileSync(versionIniPath, iniContent, 'utf8');

    // Sincroniza package.json
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        pkg.version = versionData.version;
        fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2), 'utf8');
      } catch {}
    }

    return NextResponse.json(versionData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

