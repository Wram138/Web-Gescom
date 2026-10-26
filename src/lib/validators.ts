/**
 * Validadores e utilitários para documentos brasileiros e regras de clientes
 */

/**
 * Validação rigorosa de CPF conforme algoritmo oficial da Receita Federal
 */
export function validateCPF(cpfRaw: string): { valid: boolean; formatted: string; error?: string } {
  if (!cpfRaw) return { valid: false, formatted: '', error: 'CPF é obrigatório para revenda' };

  const clean = cpfRaw.replace(/\D/g, '');

  if (clean.length !== 11) {
    return { valid: false, formatted: clean, error: 'CPF deve conter exatamente 11 dígitos' };
  }

  // Elimina CPFs com todos os dígitos iguais conhecidos (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(clean)) {
    return { valid: false, formatted: clean, error: 'CPF com dígitos repetidos inválido' };
  }

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) {
    return { valid: false, formatted: clean, error: 'Dígito verificador do CPF inválido' };
  }

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10))) {
    return { valid: false, formatted: clean, error: 'Dígito verificador do CPF inválido' };
  }

  const formatted = clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return { valid: true, formatted };
}

/**
 * Validação e formatação de CEP (8 dígitos)
 */
export function validateCEP(cepRaw: string): { valid: boolean; clean: string; formatted: string; error?: string } {
  if (!cepRaw) return { valid: false, clean: '', formatted: '', error: 'CEP é obrigatório' };
  const clean = cepRaw.replace(/\D/g, '');

  if (clean.length !== 8) {
    return { valid: false, clean, formatted: clean, error: 'CEP deve conter 8 números' };
  }

  const formatted = clean.replace(/(\d{5})(\d{3})/, '$1-$2');
  return { valid: true, clean, formatted };
}

/**
 * Consulta de endereço via ViaCEP
 */
export async function fetchAddressByCEP(cep: string): Promise<{
  success: boolean;
  data?: {
    street: string;
    neighborhood: string;
    city: string;
    state: string;
  };
  error?: string;
}> {
  const { valid, clean } = validateCEP(cep);
  if (!valid) return { success: false, error: 'CEP inválido' };

  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Falha ao consultar CEP');
    const json = await res.json();
    if (json.erro) {
      return { success: false, error: 'CEP não encontrado na base dos Correios' };
    }
    return {
      success: true,
      data: {
        street: json.logradouro || '',
        neighborhood: json.bairro || '',
        city: json.localidade || '',
        state: json.uf || '',
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro de conexão com o ViaCEP' };
  }
}

/**
 * Formatação e validação de telefone brasileiro
 */
export function formatPhone(phoneRaw: string): string {
  const clean = phoneRaw.replace(/\D/g, '');
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phoneRaw;
}

/**
 * Verifica se a validade do desconto de revenda (90 dias) está ativa ou expirada
 */
export function checkRevendaValidity(customer: any): {
  isRevendaActive: boolean;
  daysRemaining: number;
  status: 'ATIVO' | 'EXPIRADO' | 'PENDENTE_APROVACAO' | 'NAO_REVENDA';
  message: string;
} {
  if (!customer?.isRevenda) {
    return {
      isRevendaActive: false,
      daysRemaining: 0,
      status: 'NAO_REVENDA',
      message: 'Cliente comum (não cadastrado como revenda)',
    };
  }

  if (customer.revendaStatus === 'PENDENTE_APROVACAO') {
    return {
      isRevendaActive: false,
      daysRemaining: 0,
      status: 'PENDENTE_APROVACAO',
      message: 'Aguardando aprovação de desconto por Gerente ou Administrador',
    };
  }

  if (!customer.revendaValidadeAte) {
    return {
      isRevendaActive: false,
      daysRemaining: 0,
      status: 'EXPIRADO',
      message: 'Sem data de validade definida (Expirado)',
    };
  }

  const now = new Date().getTime();
  const validUntil = new Date(customer.revendaValidadeAte).getTime();
  const diffTime = validUntil - now;
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return {
      isRevendaActive: false,
      daysRemaining: 0,
      status: 'EXPIRADO',
      message: 'Benefício expirado (+90 dias sem compras)',
    };
  }

  return {
    isRevendaActive: true,
    daysRemaining,
    status: 'ATIVO',
    message: `Revenda Ativo (${customer.revendaDesconto}% OFF - ${daysRemaining} dias restantes)`,
  };
}

