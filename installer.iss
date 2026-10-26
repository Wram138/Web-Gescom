; Script Inno Setup para Web-Gescom - PDV & Gestao Comercial
; Alecrim Tecnologia

#define MyAppName "Web-Gescom"
#define MyAppFullName "Web-Gescom - PDV & Gestao Comercial"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Alecrim Tecnologia"
#define MyAppURL "https://valida.alecrim.tec.br"
#define MyAppExeName "Web-Gescom.exe"

[Setup]
AppId={{D865BC61-60F8-4A94-9CE6-35B6D51846A3}
AppName={#MyAppFullName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName=C:\Web-Gescom
DisableDirPage=no
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=c:\DEV\Web-Gescom\dist-installer
OutputBaseFilename=Instalador-Web-Gescom-v1.0
SetupIconFile=c:\DEV\Web-Gescom\Icon\pdv.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\Icon\pdv.ico

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; Todos os arquivos standalone da aplicacao empacotados
Source: "c:\DEV\Web-Gescom\dist-package\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; Banco de dados inicial limpo (copiado apenas na primeira instalacao - protege dados existentes em atualizacoes)
Source: "c:\DEV\Web-Gescom\prisma\clean_template.db"; DestDir: "{app}\prisma"; DestName: "gescom.db"; Flags: onlyifdoesntexist

[Icons]
Name: "{autoprograms}\{#MyAppName}\{#MyAppFullName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\Icon\pdv.ico"
Name: "{autoprograms}\{#MyAppName}\Fazer Backup do Banco"; Filename: "{app}\Fazer-Backup.bat"; IconFilename: "{app}\Icon\pdv.ico"
Name: "{autoprograms}\{#MyAppName}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"; IconFilename: "{app}\Icon\pdv.ico"
Name: "{autodesktop}\{#MyAppFullName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\Icon\pdv.ico"; Tasks: desktopicon

[Run]
; Libera automaticamente a porta 3000 no Windows Firewall para rede local e celulares
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""Web-Gescom PDV"" dir=in action=allow protocol=TCP localport=3000"; Flags: runhidden; StatusMsg: "Configurando comunicacao de rede local..."

; Iniciar o sistema apos conclusao
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent
