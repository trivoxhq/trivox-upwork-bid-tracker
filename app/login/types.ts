export type LoginResponse = {
  success?: boolean;
  message?: string;
  user?: {
    email: string;
    name: string;
    role: string;
  };
};
