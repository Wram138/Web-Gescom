using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

namespace WebGescomLauncher
{
    static class Program
    {
        private static NotifyIcon trayIcon;
        private static ContextMenuStrip trayMenu;
        private static Process serverProcess;
        private static string appUrl = "http://localhost:3000";
        private static string baseDir;
        private static string configFile;
        private static string mode = "SERVER"; // SERVER ou CLIENT
        private static string serverHost = "localhost";
        private static int port = 3000;
        private static string appVersion = "1.0.0";
        private static int appBuild = 7;

        private static void LoadVersionInfo()
        {
            try
            {
                string verFile = Path.Combine(baseDir, "version.ini");
                if (File.Exists(verFile))
                {
                    foreach (string line in File.ReadAllLines(verFile))
                    {
                        string trimmed = line.Trim();
                        if (trimmed.StartsWith("Version=", StringComparison.OrdinalIgnoreCase))
                            appVersion = trimmed.Substring(8).Trim();
                        else if (trimmed.StartsWith("Build=", StringComparison.OrdinalIgnoreCase))
                            int.TryParse(trimmed.Substring(6).Trim(), out appBuild);
                    }
                }
            }
            catch { }
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            baseDir = AppDomain.CurrentDomain.BaseDirectory;
            configFile = Path.Combine(baseDir, "gescom_config.ini");
            LoadVersionInfo();

            // Carrega configuração ou exibe tela inicial de escolha se for a primeira execução
            if (!File.Exists(configFile))
            {
                if (!ShowConfigDialog(true))
                {
                    return; // Usuário cancelou a configuração inicial
                }
            }
            else
            {
                LoadConfig();
            }

            // Define URL da aplicação
            if (mode == "CLIENT")
            {
                appUrl = string.Format("http://{0}:{1}", serverHost, port);
            }
            else
            {
                appUrl = string.Format("http://localhost:{0}", port);
            }

            // Previne múltiplas instâncias
            bool isNewInstance;
            using (Mutex mutex = new Mutex(true, "WebGescom_SingleInstance_Mutex", out isNewInstance))
            {
                if (!isNewInstance)
                {
                    OpenAppWindow();
                    return;
                }

                InitializeTray();

                if (mode == "SERVER")
                {
                    StartServerInBackground();
                    new Thread(() =>
                    {
                        WaitForServerAndOpen();
                    }).Start();
                }
                else
                {
                    // Modo Cliente: apenas abre diretamente o endereço do servidor
                    OpenAppWindow();
                    trayIcon.ShowBalloonTip(3000, "Web-Gescom (Terminal Cliente)", "Conectado ao servidor: " + appUrl, ToolTipIcon.Info);
                }

                Application.Run();
            }
        }

        private static void LoadConfig()
        {
            try
            {
                if (File.Exists(configFile))
                {
                    string[] lines = File.ReadAllLines(configFile);
                    foreach (string line in lines)
                    {
                        string trimmed = line.Trim();
                        if (trimmed.StartsWith("Type=", StringComparison.OrdinalIgnoreCase))
                        {
                            mode = trimmed.Substring(5).Trim().ToUpper();
                        }
                        else if (trimmed.StartsWith("ServerIP=", StringComparison.OrdinalIgnoreCase))
                        {
                            serverHost = trimmed.Substring(9).Trim();
                        }
                        else if (trimmed.StartsWith("Port=", StringComparison.OrdinalIgnoreCase))
                        {
                            int p;
                            if (int.TryParse(trimmed.Substring(5).Trim(), out p)) port = p;
                        }
                    }
                }
            }
            catch { }
        }

        private static void SaveConfig(string newMode, string newHost, int newPort)
        {
            try
            {
                mode = newMode;
                serverHost = newHost;
                port = newPort;
                string content = string.Format("[Config]\nType={0}\nServerIP={1}\nPort={2}\n", mode, serverHost, port);
                File.WriteAllText(configFile, content);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao salvar configuração: " + ex.Message, "Web-Gescom", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static bool ShowConfigDialog(bool isFirstRun)
        {
            using (Form form = new Form())
            {
                form.Text = isFirstRun ? "Web-Gescom - Configuração Inicial de Rede" : "Configuração de Rede (Servidor / Cliente)";
                form.Width = 480;
                form.Height = 360;
                form.FormBorderStyle = FormBorderStyle.FixedDialog;
                form.StartPosition = FormStartPosition.CenterScreen;
                form.MaximizeBox = false;
                form.MinimizeBox = false;

                string iconPath = Path.Combine(baseDir, @"Icon\pdv.ico");
                if (File.Exists(iconPath))
                {
                    try { form.Icon = new Icon(iconPath); } catch { }
                }

                Label lblIntro = new Label()
                {
                    Text = "Selecione como este computador funcionará no estabelecimento:",
                    Top = 15,
                    Left = 20,
                    Width = 420,
                    Height = 25,
                    Font = new Font(form.Font.FontFamily, 9.5f, FontStyle.Bold)
                };
                form.Controls.Add(lblIntro);

                RadioButton rbServer = new RadioButton()
                {
                    Text = "Computador SERVIDOR PRINCIPAL (Caixa 01)",
                    Top = 50,
                    Left = 25,
                    Width = 410,
                    Font = new Font(form.Font.FontFamily, 9f, FontStyle.Bold),
                    Checked = (mode == "SERVER")
                };
                Label lblServerInfo = new Label()
                {
                    Text = "Armazena o banco de dados e permite que outros PCs se conectem.\nIP deste computador: " + GetLocalIPAddress(),
                    Top = 75,
                    Left = 45,
                    Width = 390,
                    Height = 35,
                    ForeColor = Color.DarkSlateGray
                };
                form.Controls.Add(rbServer);
                form.Controls.Add(lblServerInfo);

                RadioButton rbClient = new RadioButton()
                {
                    Text = "Computador TERMINAL CLIENTE (Outro Caixa ou Balcão)",
                    Top = 125,
                    Left = 25,
                    Width = 410,
                    Font = new Font(form.Font.FontFamily, 9f, FontStyle.Bold),
                    Checked = (mode == "CLIENT")
                };
                Label lblClientInfo = new Label()
                {
                    Text = "Conecta pela rede Wi-Fi/cabo ao Servidor Principal da loja.",
                    Top = 150,
                    Left = 45,
                    Width = 390,
                    Height = 20,
                    ForeColor = Color.DarkSlateGray
                };

                Label lblHost = new Label() { Text = "IP do Servidor:", Top = 180, Left = 45, Width = 100 };
                TextBox txtHost = new TextBox()
                {
                    Top = 177,
                    Left = 145,
                    Width = 150,
                    Text = (serverHost != "localhost" ? serverHost : GetLocalIPAddress())
                };

                Button btnTest = new Button()
                {
                    Text = "Testar Conexão",
                    Top = 175,
                    Left = 305,
                    Width = 110,
                    Height = 25
                };
                btnTest.Click += (s, e) =>
                {
                    string target = string.Format("http://{0}:{1}/api/dashboard", txtHost.Text.Trim(), port);
                    try
                    {
                        HttpWebRequest req = (HttpWebRequest)WebRequest.Create(target);
                        req.Timeout = 2000;
                        using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                        {
                            if (resp.StatusCode == HttpStatusCode.OK)
                            {
                                MessageBox.Show("Sucesso! Conexão com o Servidor Web-Gescom estabelecida.", "Conexão OK", MessageBoxButtons.OK, MessageBoxIcon.Information);
                                return;
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show("Não foi possível conectar ao servidor em " + txtHost.Text + ":\n\n" + ex.Message, "Falha de Conexão", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    }
                };

                form.Controls.Add(rbClient);
                form.Controls.Add(lblClientInfo);
                form.Controls.Add(lblHost);
                form.Controls.Add(txtHost);
                form.Controls.Add(btnTest);

                // Alterna estado dos campos de cliente
                Action updateEnabled = () =>
                {
                    txtHost.Enabled = rbClient.Checked;
                    btnTest.Enabled = rbClient.Checked;
                };
                rbServer.CheckedChanged += (s, e) => updateEnabled();
                rbClient.CheckedChanged += (s, e) => updateEnabled();
                updateEnabled();

                Button btnSave = new Button()
                {
                    Text = "Salvar e Continuar",
                    Top = 265,
                    Left = 240,
                    Width = 140,
                    Height = 35,
                    Font = new Font(form.Font.FontFamily, 9f, FontStyle.Bold),
                    DialogResult = DialogResult.OK
                };
                Button btnCancel = new Button()
                {
                    Text = "Cancelar",
                    Top = 265,
                    Left = 390,
                    Width = 60,
                    Height = 35,
                    DialogResult = DialogResult.Cancel
                };

                form.Controls.Add(btnSave);
                form.Controls.Add(btnCancel);
                form.AcceptButton = btnSave;
                form.CancelButton = btnCancel;

                if (form.ShowDialog() == DialogResult.OK)
                {
                    string selectedMode = rbServer.Checked ? "SERVER" : "CLIENT";
                    string selectedHost = rbServer.Checked ? "localhost" : txtHost.Text.Trim();
                    SaveConfig(selectedMode, selectedHost, 3000);
                    return true;
                }

                return false;
            }
        }

        private static void InitializeTray()
        {
            trayMenu = new ContextMenuStrip();

            var itemOpen = new ToolStripMenuItem("🚀 Abrir Frente de Caixa (PDV)", null, (s, e) => OpenAppWindow());
            itemOpen.Font = new Font(itemOpen.Font, FontStyle.Bold);
            trayMenu.Items.Add(itemOpen);

            trayMenu.Items.Add(new ToolStripMenuItem("🌐 Abrir no Navegador", null, (s, e) => OpenInBrowser()));
            trayMenu.Items.Add(new ToolStripMenuItem("⚙️ Configurar Modo (Servidor / Cliente)", null, (s, e) =>
            {
                if (ShowConfigDialog(false))
                {
                    MessageBox.Show("Configuração atualizada! Reinicie o aplicativo se trocou entre Servidor e Cliente.", "Web-Gescom", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            }));
            trayMenu.Items.Add(new ToolStripMenuItem("📱 Ver IP da Rede Local", null, (s, e) => ShowLocalIP()));

            if (mode == "SERVER")
            {
                trayMenu.Items.Add(new ToolStripMenuItem("💾 Fazer Backup do Banco de Dados", null, (s, e) => BackupDatabase()));
            }

            trayMenu.Items.Add(new ToolStripMenuItem(string.Format("ℹ️ Versão v{0} (Build #{1})", appVersion, appBuild), null, (s, e) => OpenAppWindow()));
            trayMenu.Items.Add(new ToolStripSeparator());
            trayMenu.Items.Add(new ToolStripMenuItem("❌ Encerrar Web-Gescom", null, (s, e) => ExitApplication()));

            trayIcon = new NotifyIcon();
            string trayText = string.Format("Web-Gescom v{0} (#{1}) - {2}", appVersion, appBuild, (mode == "SERVER" ? "Servidor" : "Cliente"));
            trayIcon.Text = trayText.Length > 63 ? trayText.Substring(0, 63) : trayText;

            // Carrega ícone pdv.ico se existir
            string iconPath = Path.Combine(baseDir, @"Icon\pdv.ico");
            if (File.Exists(iconPath))
            {
                try
                {
                    trayIcon.Icon = new Icon(iconPath);
                }
                catch
                {
                    trayIcon.Icon = SystemIcons.Application;
                }
            }
            else
            {
                trayIcon.Icon = SystemIcons.Application;
            }

            trayIcon.ContextMenuStrip = trayMenu;
            trayIcon.Visible = true;
            trayIcon.DoubleClick += (s, e) => OpenAppWindow();
        }

        private static void StartServerInBackground()
        {
            try
            {
                if (IsServerResponding()) return;

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.WorkingDirectory = baseDir;
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.WindowStyle = ProcessWindowStyle.Hidden;

                string bundledNode = Path.Combine(baseDir, @"runtime\node.exe");
                if (!File.Exists(bundledNode)) bundledNode = Path.Combine(baseDir, "node.exe");

                string serverJs = Path.Combine(baseDir, "server.js");
                if (!File.Exists(serverJs)) serverJs = Path.Combine(baseDir, @".next\standalone\server.js");

                if (File.Exists(serverJs))
                {
                    psi.FileName = File.Exists(bundledNode) ? bundledNode : "node.exe";
                    psi.Arguments = string.Format("\"{0}\"", serverJs);
                }
                else
                {
                    psi.FileName = "cmd.exe";
                    psi.Arguments = "/c npm run start";
                }

                psi.EnvironmentVariables["PORT"] = port.ToString();
                psi.EnvironmentVariables["HOSTNAME"] = "0.0.0.0";
                if (File.Exists(bundledNode))
                {
                    string runtimeDir = Path.GetDirectoryName(bundledNode);
                    psi.EnvironmentVariables["PATH"] = runtimeDir + ";" + Environment.GetEnvironmentVariable("PATH");
                }

                serverProcess = new Process();
                serverProcess.StartInfo = psi;
                serverProcess.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao iniciar o servidor: " + ex.Message, "Web-Gescom", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static bool IsServerResponding()
        {
            try
            {
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(appUrl);
                request.Timeout = 1200;
                request.Method = "HEAD";
                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                {
                    return response.StatusCode == HttpStatusCode.OK || response.StatusCode == HttpStatusCode.Found;
                }
            }
            catch
            {
                return false;
            }
        }

        private static void WaitForServerAndOpen()
        {
            int attempts = 0;
            while (attempts < 60)
            {
                Thread.Sleep(1000);
                attempts++;
                if (IsServerResponding())
                {
                    OpenAppWindow();
                    trayIcon.ShowBalloonTip(3000, "Web-Gescom Ativo", "Servidor em execução na bandeja do sistema.", ToolTipIcon.Info);
                    return;
                }
            }
            OpenAppWindow();
        }

        private static void OpenAppWindow()
        {
            try
            {
                string edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe");
                if (!File.Exists(edgePath))
                {
                    edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe");
                }

                if (File.Exists(edgePath))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = edgePath,
                        Arguments = "--app=" + appUrl,
                        UseShellExecute = true
                    });
                    return;
                }

                OpenInBrowser();
            }
            catch
            {
                OpenInBrowser();
            }
        }

        private static void OpenInBrowser()
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = appUrl,
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                MessageBox.Show("Não foi possível abrir o navegador: " + ex.Message, "Web-Gescom", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private static string GetLocalIPAddress()
        {
            try
            {
                var host = Dns.GetHostEntry(Dns.GetHostName());
                foreach (var ip in host.AddressList)
                {
                    if (ip.AddressFamily == AddressFamily.InterNetwork && !ip.ToString().StartsWith("127."))
                    {
                        return ip.ToString();
                    }
                }
            }
            catch { }
            return "127.0.0.1";
        }

        private static void ShowLocalIP()
        {
            string localIP = GetLocalIPAddress();
            string msg = string.Format(
                "IP deste computador na rede local:\n{0}\n\n" +
                "1. Outros computadores da loja (Cliente):\n" +
                "   Configure no launcher apontando para: {0}\n\n" +
                "2. Smartphones dos Vendedores (Android / iPhone):\n" +
                "   Abra no navegador do celular conectado no mesmo Wi-Fi:\n" +
                "   http://{0}:3000/mobile\n\n" +
                "Certifique-se de que todos estão conectados na mesma rede.",
                localIP
            );

            MessageBox.Show(msg, "Rede Local & Acesso Mobile - Web-Gescom", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        private static void BackupDatabase()
        {
            try
            {
                string dbPath = Path.Combine(baseDir, @"prisma\gescom.db");
                if (!File.Exists(dbPath))
                {
                    MessageBox.Show("Banco de dados não encontrado em: " + dbPath, "Aviso", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                string backupDir = Path.Combine(baseDir, "Backups");
                if (!Directory.Exists(backupDir))
                {
                    Directory.CreateDirectory(backupDir);
                }

                string timeStamp = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss");
                string destFile = Path.Combine(backupDir, "gescom_backup_" + timeStamp + ".db");

                File.Copy(dbPath, destFile, true);

                MessageBox.Show("Backup realizado com sucesso!\n\nArquivo salvo em:\n" + destFile, "Backup Concluído", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao realizar backup: " + ex.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static void ExitApplication()
        {
            var res = MessageBox.Show("Deseja realmente encerrar o Web-Gescom?", "Encerrar Sistema", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
            if (res == DialogResult.Yes)
            {
                try
                {
                    if (serverProcess != null && !serverProcess.HasExited)
                    {
                        serverProcess.Kill();
                    }
                }
                catch { }

                if (trayIcon != null) trayIcon.Visible = false;
                Application.Exit();
                Environment.Exit(0);
            }
        }
    }
}
