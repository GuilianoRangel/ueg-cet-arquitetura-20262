import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class RecoveryService {
  private tokens: Map<string, { email: string; expires: number }> = new Map();

  generateToken(email: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 1000 * 60 * 60; // 1 hora
    this.tokens.set(token, { email, expires });
    //TODO remover depois de configurar o e-mali
    console.log('Token de recuperação gerado:', token);
    console.log('Email:', email);
    console.log('Expires:', expires);
    return token;
  }

  validateToken(token: string): string | null {
    const data = this.tokens.get(token);
    if (!data) return null;
    if (Date.now() > data.expires) {
      this.tokens.delete(token);
      return null;
    }
    return data.email;
  }

  deleteToken(token: string) {
    this.tokens.delete(token);
  }
}
