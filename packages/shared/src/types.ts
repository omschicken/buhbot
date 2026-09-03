export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  kycStatus: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  walletId: string;
  userId: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'bonus';
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

export interface Bonus {
  id: string;
  userId: string;
  type: 'welcome' | 'deposit' | 'free-spin' | 'cashback';
  amount: number;
  currency: string;
  wagering: number;
  status: 'active' | 'used' | 'expired';
  expiresAt: Date;
  createdAt: Date;
}

export interface KycDocument {
  id: string;
  userId: string;
  type: 'passport' | 'id-card' | 'drivers-license' | 'utility-bill';
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: Date;
  reviewedAt?: Date;
}

export interface Affiliate {
  id: string;
  userId: string;
  referralCode: string;
  commissionRate: number;
  totalReferrals: number;
  totalEarnings: number;
  createdAt: Date;
}

export interface GameSession {
  id: string;
  userId: string;
  gameId: string;
  providerId: string;
  startedAt: Date;
  endedAt?: Date;
  totalBet: number;
  totalWin: number;
  currency: string;
}

export interface ResponsibleGamblingLimit {
  id: string;
  userId: string;
  type: 'deposit' | 'loss' | 'session' | 'wager';
  period: 'daily' | 'weekly' | 'monthly';
  limit: number;
  current: number;
  resetAt: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
