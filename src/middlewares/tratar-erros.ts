// Precisa ter os 4 parâmetros, senão o Express não o reconhece como tratador de erros
export function tratarErros(erro, req, res, next) {
  // Erros que nós mesmos lançamos (ErroHttp)
  if (erro.status) {
    return res.status(erro.status).json({ erro: erro.message });
  }

  // Valor único repetido no banco (ex.: e-mail já cadastrado)
  if (erro.code === 'P2002') {
    return res.status(409).json({ erro: 'Registro já existe' });
  }

  console.error(erro);
  res.status(500).json({ erro: 'Erro interno do servidor' });
}
