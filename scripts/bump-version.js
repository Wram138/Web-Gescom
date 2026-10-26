const fs = require('fs');
const path = require('path');

const versionJsonPath = path.join(__dirname, '..', 'src', 'lib', 'version.json');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const versionIniPath = path.join(__dirname, '..', 'version.ini');

function bump() {
  let versionData = {
    version: '1.0.0',
    build: 1,
    updatedAt: new Date().toISOString(),
    history: []
  };

  if (fs.existsSync(versionJsonPath)) {
    try {
      versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
    } catch (e) {
      console.warn('Erro ao ler version.json, usando padrão:', e.message);
    }
  }

  // Argumentos da linha de comando
  const args = process.argv.slice(2);
  const bumpType = args.find(a => ['--patch', '--minor', '--major'].includes(a));
  const textArgs = args.filter(a => !a.startsWith('--'));

  const title = textArgs[0] || null;
  const description = textArgs[1] || '';

  // Incrementa número do build
  versionData.build = (versionData.build || 0) + 1;
  versionData.updatedAt = new Date().toISOString();

  // Bump de SemVer se solicitado
  if (bumpType) {
    let [maj, min, pat] = versionData.version.split('.').map(Number);
    if (bumpType === '--major') {
      maj++;
      min = 0;
      pat = 0;
    } else if (bumpType === '--minor') {
      min++;
      pat = 0;
    } else if (bumpType === '--patch') {
      pat++;
    }
    versionData.version = `${maj}.${min}.${pat}`;
  }

  // Se passou título/descrição, adiciona ao histórico
  if (title) {
    const today = new Date().toISOString().split('T')[0];
    versionData.history.unshift({
      version: versionData.version,
      build: versionData.build,
      date: today,
      title: title,
      description: description || 'Alteração registrada no sistema.'
    });
  }

  // Atualiza version.json
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2), 'utf8');

  // Atualiza package.json
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      pkg.version = versionData.version;
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2), 'utf8');
    } catch (e) {}
  }

  // Grava version.ini para leitura rápida pelo .EXE e scripts do Windows
  const iniContent = `[Version]\nVersion=${versionData.version}\nBuild=${versionData.build}\nUpdatedAt=${versionData.updatedAt}\n`;
  fs.writeFileSync(versionIniPath, iniContent, 'utf8');

  console.log(`🚀 Versão atualizada: v${versionData.version} (Build #${versionData.build})`);
  if (title) {
    console.log(`📝 Registro: "${title}"`);
  }
}

bump();

