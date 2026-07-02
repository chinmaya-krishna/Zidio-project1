export interface SignupData { name: string; email: string; password: string }
export interface LoginData { email: string; password: string }

export declare const signup: (data: SignupData) => Promise<any>;
export declare const login: (data: LoginData) => Promise<any>;
export declare const logout: () => Promise<any>;
export declare const getMe: () => Promise<any>;

export {};
