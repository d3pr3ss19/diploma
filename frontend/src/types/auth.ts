export type UserRole = 'ADMIN' | 'OPERATOR' | 'SUBSCRIBER';

export type LoginRequest = {
  email: string;
  password: string;
  role: UserRole;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
};
