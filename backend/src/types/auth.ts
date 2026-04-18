export type Role = "owner" | "sales" | "admin";

export interface JwtPayload {
  sub: string;
  role: Role;
}

/** Public user shape returned to clients (matches frontend `User`). */
export interface AuthUser {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export {};
