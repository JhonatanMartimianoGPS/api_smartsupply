export function validar(schema) {
  return (req, res, next) => {
    const resultado = schema.safeParse(req.body ?? {});

    if (!resultado.success) {
      return res.status(400).json({
        erro: 'Dados inválidos',
        detalhes: resultado.error.issues.map((i) => ({
          campo: i.path.join('.'),
          mensagem: i.message,
        })),
      });
    }

    req.body = resultado.data; // body já limpo e validado
    next();
  };
}
