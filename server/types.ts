export type Message = {
    type: MessageType;
    data: any;
};

export enum MessageType {
    Words = 'words',
    Echo = 'echo',
}

export type Word = {
    word: string;
    timestamp: number;
    userId: string;
}

export type Letter = {
    letter: string;
    timestamp: number;
}

