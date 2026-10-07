export class ErroHttp extends Error {
  status;

  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}
