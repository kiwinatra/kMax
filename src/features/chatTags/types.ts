// src/features/chatTags/types.ts

export interface ChatTag {
    id: string;
    chatName: string;      // Имя чата (для поиска)
    tagName: string;       // Название тега
    color: string;         // Цвет тега (HEX)
    createdAt: number;     // Время создания
}

export interface ChatTagSettings {
    tags: ChatTag[];
    enabled: boolean;
}