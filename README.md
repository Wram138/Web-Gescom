# Web-Gescom - Sistema de PDV & Gestão Comercial

Sistema completo de Ponto de Venda (PDV), Controle de Estoque, Comissões de Vendedores, Vendas, Clientes & Revenda e Financeiro (Contas a Pagar e Contas a Receber).

---

## 👥 Módulo de Clientes & Programa de Revenda

O sistema agora possui controle diferenciado para **Clientes Comuns** e **Clientes Revenda**:

### 1. Cadastro de Clientes
- **Cliente Simples (Comum)**:
  - Campos mínimos obrigatórios: apenas **Nome** e **Telefone**.
  - Os demais dados (CPF, CEP, Endereço, E-mail) são opcionais.
- **Cliente Revenda**:
  - Obrigatoriedade de **todos os dados cadastrais**:
    - **Nome Completo**
    - **Telefone** com identificador de **WhatsApp**
    - **CPF** com validação rigorosa dos dois dígitos verificadores (Receita Federal)
    - **Endereço Completo**: CEP com busca e preenchimento automático via ViaCEP (Rua, Bairro, Cidade, Estado e Número).

### 2. Promoção Automática para Revenda (1ª Compra > R$ 300,00)
- Qualquer cliente comum pode se qualificar para Revenda caso a sua **primeira compra supere R$ 300,00**.
- O PDV avisa o operador e marca o cliente como pré-qualificado para que o Gerente confirme o benefício.

### 3. Desconto de Revenda (Até 30%)
- O cliente revenda pode ter um desconto de **até 30%**.
- Inicialmente aprovado/confirmado por um **Gerente** ou **Administrador**.
- No PDV, ao selecionar um cliente Revenda ativo, é exibido um botão de 1 clique para aplicar o desconto de revenda autorizado.

### 4. Regra de Validade de 90 Dias (Renovação Automática)
- O desconto de revenda permanece válido por **90 dias**.
- **A cada compra efetuada pelo cliente no PDV, o prazo de validade é automaticamente renovado por mais 90 dias** a partir da data da compra.
- Caso o cliente fique mais de 90 dias sem realizar compras, o benefício expira automaticamente, exigindo nova reativação pelo Gerente.

---

## 🎨 Ícone Oficial & Executável Nativo

O executável **`Web-Gescom.exe`** foi compilado com o ícone oficial em alta resolução localizado em `Icon/pdv.ico` (gerado a partir de `Icon/pdv.png`).

---

## 🌐 Configuração de Rede: Servidor vs. Cliente

Ao abrir o `Web-Gescom.exe` pela primeira vez, uma tela de configuração simples é exibida para definir a função do computador na loja:

- **Computador SERVIDOR PRINCIPAL (Caixa Central)**:
  - Inicia o banco de dados e o servidor comercial escutando em toda a rede local (`0.0.0.0:3000`).
  - O executável exibe o IP deste computador (ex: `192.168.1.100`) para que você informe aos outros computadores e celulares da loja.
- **Computador TERMINAL CLIENTE (Outro Caixa / Balcão)**:
  - Não precisa rodar servidor de banco nem nada pesado.
  - Pede apenas o **IP do Servidor** e possui botão para **"Testar Conexão"**.
  - Abre a janela do PDV conectada diretamente ao servidor principal da loja, sincronizando estoque e vendas em tempo real.

---

## 🔒 Identificação Obrigatória de Operador (Tela de Login)

- **Sempre que o programa for aberto**, uma tela de login/identificação em tela cheia é exigida antes de qualquer operação.
- A sessão é isolada por aba/janela (`sessionStorage`), garantindo que se o programa for fechado e reaberto, **sempre pedirá a senha do operador**.
- **Botão Bloquear**: No cabeçalho superior do sistema, há um botão vermelho **"Bloquear"** para o operador travar o caixa imediatamente ao se ausentar.

### 🔑 Usuários e Senhas Padrão

| Perfil | Usuário | Senha | Descrição |
|---|---|---|---|
| **Administrador** | `admin` | `admin123` | Acesso total a todas as funções e configurações |
| **Gerente** | `gerente` | `gerente123` | Controle financeiro, estoques e aprovação de revendas |
| **Operador de Caixa** | `caixa1` | `caixa123` | Frente de caixa, turnos e recebimentos |
| **Vendedor 1** | `vendedor1` | `vendedor123` | Carlos Vendedor (5% de comissão) |
| **Vendedor 2** | `vendedor2` | `vendedor123` | Mariana Silva (4% de comissão) |

---

## 🔄 Troca Rápida de Operador com Senha Obrigatória
- Ao clicar no botão **"Trocar Operador"** no topo da tela, uma janela modal surge.
- É necessário **selecionar o usuário de destino e digitar a senha dele**.
- Um operador não consegue assumir o caixa ou o terminal de outro funcionário sem saber a senha correspondente.

---

## 🛡️ Gestão de Permissões de Acesso por Perfil (RBAC)
- O usuário **Admin** possui acesso irrestrito e conta com um botão exclusivo **"⚙️ Configurar Acessos dos Perfis"** no menu **Usuários**.
- Permite habilitar ou desabilitar cada módulo para cada cargo (`GERENTE`, `CAIXA`, `VENDEDOR`):
  - Dashboard
  - Frente de Caixa (PDV)
  - Produtos & Estoque
  - Clientes & Revenda
  - Histórico de Vendas
  - Controle de Caixa (Turnos)
  - Comissões
  - Contas a Pagar
  - Contas a Receber
  - Gestão de Usuários
- Se um módulo for desmarcado para o perfil, ele **não é exibido no menu lateral** do operador e suas rotas são bloqueadas.

---

## 📱 Terminal Mobile de Bolso para Vendedores (Android / iPhone) - Opção C

Os vendedores de salão podem usar seus próprios celulares (ou tablets) para agilizar o atendimento aos clientes na loja física:

### 1. Como Conectar o Smartphone
1. Conecte o celular na mesma rede **Wi-Fi da loja**.
2. Abra o navegador do celular (Google Chrome, Safari, etc.).
3. Acesse o endereço do servidor:
   ```
   http://<IP_DO_SERVIDOR>:3000/mobile
   ```
   *(Você pode ver o IP do servidor clicando com o botão direito no ícone do PDV ao lado do relógio do Windows ou no botão "Conectar Celular" dentro do PDV).*
4. **Dica:** O vendedor pode tocar nos três pontinhos do navegador e selecionar **"Adicionar à Tela de Início"** para o terminal abrir em tela cheia como se fosse um app nativo.

### 2. O que o Vendedor Faz no Celular:
- **Identificação do Vendedor**: Escolhe seu nome com PIN/senha rápida.
- **Consulta de Estoque em Tempo Real**: Busca produtos por nome, código ou leitor de código de barras pela câmera do celular, consultando quantidade em estoque e preço de venda.
- **Carrinho Mobile e Lançamento de Comanda**: Adiciona os itens escolhidos pelo cliente, informa o nome do cliente ou mesa, observações e clica em **"Enviar Pré-Venda ao Caixa"**.
- Recebe o número da comanda (ex: `#1`).

### 3. Faturamento no Caixa Principal (PDV):
1. O cliente se dirige ao caixa para pagar.
2. O operador de caixa clica no botão **"📥 Puxar Comanda"** no PDV.
3. A lista de comandas pendentes aparece com itens, valores e o nome do vendedor responsável.
4. Clica em **"Carregar no Caixa"**: os itens, o vendedor (para crédito de comissão) e o cliente são automaticamente transferidos para a tela do caixa.
5. Ao confirmar o pagamento e imprimir o cupom, a comanda é **marcada automaticamente como FATURADA**.

---

## 💾 Rotina de Backup do Banco de Dados

- **Backup pelo Executável**: Clique com o botão direito no ícone do Web-Gescom ao lado do relógio do Windows e selecione **"💾 Fazer Backup do Banco de Dados"**.
- **Backup por Script**: Execute o arquivo `Fazer-Backup.bat` na pasta do programa.
- Os backups são cópias instantâneas do arquivo `prisma/gescom.db` com carimbo de data e hora em `Backups/gescom_backup_YYYY-MM-DD_HH-mm-ss.db`.
- Para restaurar em outro computador, basta copiar a pasta `Web-Gescom` e iniciar `Web-Gescom.exe`.

---

## 🏷️ Contador de Versão & Histórico de Alterações

O sistema possui um mecanismo completo de versionamento e contagem de revisões/builds:

### 1. Onde Visualizar no Sistema
- **Menu Lateral (Sidebar)**: No rodapé do menu há uma etiqueta dinâmica (ex: `v1.0.0 (Build #9)`). Ao clicar nela, abre-se a janela **Histórico de Atualizações**.
- **Cabeçalho (Header)**: Ao lado do status do caixa, há um badge discreto com a versão e build atuais.
- **Tela de Login**: No rodapé da identificação de operador, exibindo a versão para a equipe.
- **Terminal Mobile**: No rodapé do celular dos vendedores (`/mobile`).
- **Executável Windows (`Web-Gescom.exe`)**: No menu da bandeja do Windows (System Tray ao lado do relógio) e no texto descritivo.

### 2. Registro de Novas Alterações
- **Pela Interface (Administrador)**:
  - Abra o modal clicando na versão no Sidebar ou Header.
  - Como Administrador, clique em **"+ Registrar Alteração (+1 Build)"**.
  - Digite o título e a descrição da modificação realizada e clique em salvar. O número de build será incrementado imediatamente!
- **Por Linha de Comando / Scripts**:
  - Incrementar build automaticamente com registro:
    ```bash
    node scripts/bump-version.js "Título da Alteração" "Detalhes do que foi feito"
    ```
  - Incrementar build simples:
    ```bash
    npm run bump
    ```
  - Subir versão SemVer (Patch, Minor ou Major):
    ```bash
    npm run bump:patch   # Ex: 1.0.0 -> 1.0.1
    npm run bump:minor   # Ex: 1.0.0 -> 1.1.0
    npm run bump:major   # Ex: 1.0.0 -> 2.0.0
    ```
- **Automático no Build**: Cada vez que `npm run build` é executado, o script `prebuild` incrementa automaticamente o contador de build!

---

## 🛡️ Sistema de Licenciamento VPS & Bloqueio por Inadimplência

O Web-Gescom possui integração nativa com o **Serv-Gescom** (servidor independente hospedado em sua VPS Linux):

### 1. Como Funciona a Validação
- O sistema local consulta a sua VPS na inicialização e periodicamente em segundo plano.
- A validação é feita através da **Razão Social** e do **CNPJ do Emitente**.
- As respostas da VPS são assinadas com criptografia **HMAC-SHA256**, impedindo qualquer tentativa de falsificação de servidor na rede local.

### 2. Regra de Tolerância Offline de 5 Dias
- Se o cliente ficar temporariamente sem internet ou a VPS estiver indisponível, o sistema **continua operando normalmente por até 5 dias (120 horas)**.
- Se ultrapassar 5 dias sem contato bem-sucedido com a VPS, o sistema e o banco de dados são **automaticamente bloqueados**.
- Conta com proteção anti-fraude: se o operador atrasar o relógio do Windows para burlar os 5 dias, o sistema detecta a inconsistência e bloqueia imediatamente.

### 3. Bloqueio Remoto por Inadimplência (Falta de Pagamento)
- No painel da VPS (`Serv-Gescom`), basta clicar em **"🔴 Suspender"** ao lado do cliente inadimplente.
- Na próxima verificação, o sistema local do cliente é **bloqueado imediatamente** com tela cheia, impedindo qualquer venda ou uso do PDV.
- Assim que o cliente quitar o pagamento e você clicar em **"🟢 Liberar"** na VPS, basta o cliente clicar em *"Verificar Licença com Servidor VPS"* e o sistema é liberado na hora!

### 4. Onde Configurar no Web-Gescom
- No menu lateral, acesse **"Empresa & Licença"** (`/empresa`).
- Preencha a Razão Social, CNPJ e informe a URL da sua VPS (ex: `https://licenca.suavps.com` ou `http://IP-DA-VPS:4000`).
- Clique em **"Sincronizar com VPS Agora"** para validar.



