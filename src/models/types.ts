export interface User {
    userId: string;
    username: string;
    email: string;
    sub: string;
    roles: string[];
}

export interface QueueItem {
    resolve: (value?: any) => void;
    reject: (value?: any) => void;
}

