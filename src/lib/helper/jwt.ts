import jwt from 'jsonwebtoken';

export function signUser(user: JwtPayload, JWT_SECRET: string): string {
  return jwt.sign(user, JWT_SECRET, {
    expiresIn: '15d',
  });
}


interface JwtPayload {
    id: number;
    login: string;
    isAdministrator?: boolean;
    iat?: number;
    exp?: number;
  }
  
  export function verifyUser(token: string, JWT_SECRET: string): JwtPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (typeof decoded === 'object' && decoded !== null && 'id' in decoded && 'login' in decoded) {
        return decoded as JwtPayload;
      }
      return null;
    } catch {
      return null;
    }
  }
