import {v4 as uuid} from 'uuid';
import cookie from 'cookie';
import {Message, MessageType, Word, Letter} from "./types";

import postgres from 'postgres';

const appPort = Bun.env.APP_PORT || "3333";

// console.log({
//     host: Bun.env.POSTGRES_HOST,
//     port: parseInt(Bun.env.POSTGRES_PORT || "5432"),
//     database: Bun.env.POSTGRES_DB,
//     username: Bun.env.POSTGRES_USER,
//     password: Bun.env.POSTGRES_PASSWORD,
// });

const sql = postgres({
    host: Bun.env.POSTGRES_HOST,
    port: parseInt(Bun.env.POSTGRES_PORT || "5432"),
    database: Bun.env.POSTGRES_DB,
    username: Bun.env.POSTGRES_USER,
    password: Bun.env.POSTGRES_PASSWORD,
});

// await sql`
//     CREATE TABLE IF NOT EXISTS letters (
//         userId TEXT NOT NULL,
//         letter TEXT NOT NULL,
//         timestamp TIMESTAMP NOT NULL
//     );
// `;

class WordProcessor {
    private readonly sql;
    private readonly userId: string;
    private memory: Map<string, Letter[]> = new Map();

    constructor(userId: string, sql: postgres.Sql) {
        this.userId = userId;
        this.sql = sql;
    }

    async processLetter(letter: Letter) {
        const letters = this.memory.get(this.userId) || [];
        letters.push(letter);

        this.memory.set(this.userId, letters);

        if (letters.length >= 10) {
            await this.saveLetters(letters);
            this.memory.set(this.userId, []);
        }
    }

    async saveLetters(letters: Letter[]) {
        for (const letter of letters) {
            await this.sql`
                INSERT INTO letters (userId, letter, timestamp)
                VALUES (${this.userId}, ${letter.letter}, ${letter.timestamp})
            `;
        }
    }

    async getLetters() {
        const query = await this.sql`
            SELECT letter, timestamp
            FROM letters
            WHERE userId = ${this.userId}
            ORDER BY timestamp ASC
        `;

        return query;
    }

    async flush(timestamp: number) {
        const remainingLetters = this.memory.get(this.userId) || null;
        if (remainingLetters) {
            await this.saveLetters(remainingLetters);
            this.memory.set(this.userId, []);
        }
    }
}

let processors: Map<string, WordProcessor> = new Map();

const server = Bun.serve<{ userId: string }>({
    port: appPort,
    fetch(req, server) {
        const cookies = cookie.parse(req.headers.get("Cookie") || '');
        const userId = cookies["userId"] || uuid().toString();

        if (!processors.has(userId)) {
            processors.set(userId, new WordProcessor(userId, sql));
        }


        const upgraded = server.upgrade(req, {
            data: {
                userId,
            },
            headers: {
                "Set-Cookie": cookie.serialize("userId", userId)
            },
        });

        if (upgraded) {
            return undefined;
        }
    },
    websocket: {
        async open(ws) {
            const {userId} = ws.data;

            // Get the words for the user
            const letters = await processors.get(userId)?.getLetters() || [];

            const text = letters.map((letter) => letter.letter).join('');

            // Send the words back to the client
            const message: Message = {
                type: MessageType.Words,
                data: {
                    text
                }
            };

            ws.send(JSON.stringify(message));
        },
        async message(ws, message) {
            const {userId} = ws.data;

            const {char, timestamp} = JSON.parse(message.toString());
            processors.get(userId)?.processLetter({letter: char, timestamp});
        },
        async close(ws) {
            const {userId} = ws.data;
            processors.get(userId)?.flush(Date.now());
        },
    },
});

console.log(`Listening on ${server.hostname}:${server.port}`);