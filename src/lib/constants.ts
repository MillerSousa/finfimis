export const CATEGORIES = [
  { value: 'moradia', label: 'Moradia', icon: '🏠' },
  { value: 'saude', label: 'Saúde', icon: '💊' },
  { value: 'alimentacao', label: 'Alimentação', icon: '🍔' },
  { value: 'transporte', label: 'Transporte', icon: '🚗' },
  { value: 'assinatura', label: 'Assinatura', icon: '📱' },
  { value: 'educacao', label: 'Educação', icon: '📚' },
  { value: 'lazer', label: 'Lazer', icon: '🎮' },
  { value: 'trabalho', label: 'Trabalho', icon: '💼' },
  { value: 'outros', label: 'Outros', icon: '📦' },
] as const;

export const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX', color: 'bg-emerald-500' },
  { value: 'credito', label: 'Crédito', color: 'bg-primary' },
  { value: 'debito', label: 'Débito', color: 'bg-orange-500' },
  { value: 'dinheiro', label: 'Dinheiro', color: 'bg-green-700' },
  { value: 'boleto', label: 'Boleto', color: 'bg-pink' },
] as const;

export const PJ_INCOME_CATEGORIES = [
  'Venda de produto', 'Serviço prestado', 'Anúncio/Marketing', 'Consultoria', 'Outros'
] as const;

export const PJ_EXPENSE_CATEGORIES = [
  { value: 'anuncio', label: '📣 Anúncio/Tráfego' },
  { value: 'fornecedor', label: '🛒 Fornecedor' },
  { value: 'software', label: '💻 Software/Ferramenta' },
  { value: 'produto', label: '📦 Produto' },
  { value: 'logistica', label: '🚚 Logística' },
  { value: 'colaborador', label: '👥 Colaborador' },
  { value: 'contador', label: '📊 Contador/Taxas' },
  { value: 'outros', label: '📦 Outros' },
] as const;

export const PIX_KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random', label: 'Chave aleatória' },
] as const;

export const PROFILE_COLORS = [
  '#3B82F6', '#EC4899', '#10B981', '#F97316', '#8B5CF6', '#EF4444', '#EAB308', '#6B7280'
] as const;

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
] as const;

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function getCategoryIcon(category: string | null): string {
  return CATEGORIES.find(c => c.value === category)?.icon ?? '📦';
}

export function getCategoryLabel(category: string | null): string {
  return CATEGORIES.find(c => c.value === category)?.label ?? 'Outros';
}

export function getPaymentMethodInfo(method: string | null) {
  return PAYMENT_METHODS.find(p => p.value === method) ?? PAYMENT_METHODS[0];
}
