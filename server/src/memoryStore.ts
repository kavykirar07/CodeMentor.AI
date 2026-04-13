import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// ─── In-memory stores (used when MongoDB is unavailable) ───
interface MemUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}

interface MemSubmission {
  id: string;
  userId: string;
  code: string;
  language: string;
  analysis: {
    conceptualGap: string;
    analogy: string;
    leadingQuestion: string;
    summary: string;
  };
  hints: { level: number; content: string; unlockedAt: Date }[];
  errorCategories: string[];
  createdAt: Date;
}

const users: MemUser[] = [];
const submissions: MemSubmission[] = [];

// ─── User operations ───

export async function memFindUserByEmail(email: string): Promise<MemUser | null> {
  return users.find((u) => u.email === email.toLowerCase()) || null;
}

export async function memFindUserById(id: string): Promise<MemUser | null> {
  return users.find((u) => u.id === id) || null;
}

export async function memCreateUser(email: string, password: string, name: string): Promise<MemUser> {
  const passwordHash = await bcrypt.hash(password, 12);
  const user: MemUser = {
    id: uuidv4(),
    email: email.toLowerCase(),
    passwordHash,
    name,
    createdAt: new Date(),
  };
  users.push(user);
  return user;
}

export async function memVerifyPassword(user: MemUser, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

// ─── Submission operations ───

export function memCreateSubmission(data: Omit<MemSubmission, 'id' | 'hints' | 'createdAt'>): MemSubmission {
  const sub: MemSubmission = {
    ...data,
    id: uuidv4(),
    hints: [],
    createdAt: new Date(),
  };
  submissions.push(sub);
  return sub;
}

export function memFindSubmission(id: string, userId: string): MemSubmission | null {
  return submissions.find((s) => s.id === id && s.userId === userId) || null;
}

export function memGetUserSubmissions(userId: string): MemSubmission[] {
  return submissions
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
