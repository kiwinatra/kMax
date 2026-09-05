// src/features/templates/types.ts

export interface Template {
    id: string;
    command: string;      // например: "/work"
    text: string;         // текст ответа
    description?: string; // описание (опционально)
    createdAt: number;
}

export interface TemplatesSettings {
    templates: Template[];
    enabled: boolean;
}