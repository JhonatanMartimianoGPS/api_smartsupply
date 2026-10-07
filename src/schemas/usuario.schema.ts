import { z } from 'zod';

export const criarUsuarioSchema = z.object({
  nome: z.string('Nome é obrigatório').min(2, 'Nome muito curto'),
  email: z.email('E-mail inválido'),
});

// Mesmos campos, mas todos opcionais (para atualização)
export const atualizarUsuarioSchema = criarUsuarioSchema.partial();
