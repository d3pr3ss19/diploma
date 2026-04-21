export type UserRole = 'ADMIN' | 'OPERATOR' | 'SUBSCRIBER';

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    fullName?: string | null;
    role: UserRole;
  };
};

export type RefreshRequest = {
  refreshToken: string;
};

export type RefreshResponse = {
  accessToken: string;
};

export type LogoutRequest = {
  refreshToken: string;
};
