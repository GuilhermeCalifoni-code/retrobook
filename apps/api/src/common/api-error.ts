/**
 * Erro de dominio com codigo HTTP. Tudo que chega ao error middleware sem ser
 * um ApiError vira 500 generico — nunca vazamos stack trace para o cliente.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = 'error',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, 'bad_request', details);
  }

  static unauthorized(message = 'Voce precisa entrar para continuar.') {
    return new ApiError(401, message, 'unauthorized');
  }

  static forbidden(message = 'Voce nao tem permissao para isso.') {
    return new ApiError(403, message, 'forbidden');
  }

  static notFound(message = 'Nao encontramos o que voce procura.') {
    return new ApiError(404, message, 'not_found');
  }

  static conflict(message: string, code = 'conflict') {
    return new ApiError(409, message, code);
  }

  /** Usado quando o limite do plano atual bloqueia a acao (secao 32). */
  static planLimit(message: string, details?: unknown) {
    return new ApiError(402, message, 'plan_limit', details);
  }

  static tooManyRequests(message = 'Muitas tentativas. Tente novamente em instantes.') {
    return new ApiError(429, message, 'rate_limited');
  }
}
