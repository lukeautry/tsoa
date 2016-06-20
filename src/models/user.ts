export interface User {
    id: number;
    email: string;
}

export interface UserCreateRequest {
    email: string;
}

export interface UserUpdateRequest {
    email: string;
}
