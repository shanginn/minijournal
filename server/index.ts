import {v4 as uuid} from 'uuid';
import cookie from 'cookie';
import {Database, Statement} from "bun:sqlite";
import {Message, MessageType, Word, Letter} from "../shared/types.ts";

const appPort = Bun.env.APP_PORT || "3333";

const db = new Database("db.sqlite", {create: true});

db.run(`
    CREATE TABLE IF NOT EXISTS letters (
        userId TEXT NOT NULL,
        letter TEXT NOT NULL,
        timestamp INTEGER NOT NULL
    );
`);

class WordProcessor {
    private readonly db: Database;
    private readonly userId: string;
    private memory: Map<string, Letter[]> = new Map();

    constructor(userId: string, db: Database) {
        this.userId = userId;
        this.db = db;
    }

    processLetter(letter: Letter) {
        const letters = this.memory.get(this.userId) || [];
        letters.push(letter);

        this.memory.set(this.userId, letters);

        if (letters.length >= 10) {
            this.saveLetters(letters);
            this.memory.set(this.userId, []);
        }
    }

    saveLetters(letters: Letter[]) {
        const insertQuery = this.db.prepare(
            `INSERT INTO letters (userId, letter, timestamp) VALUES ($userId, $letter, $timestamp)`
        )

        const insert = this.db.transaction(
            (letters: Letter[]) => {
                for (const letter of letters) {
                    insertQuery.run({
                        $userId: this.userId,
                        $letter: letter.letter,
                        $timestamp: letter.timestamp
                    });
                }

                return letters.length;
            }
        )

        insert.immediate(letters);
    }

    getLetters() {
        const query: Statement<Letter> = this.db.query(`
            SELECT letter, timestamp
            FROM letters
            WHERE userId = $userId
            ORDER BY timestamp ASC
        `);

        return query.all({
            $userId: this.userId
        });
    }

    flush(timestamp: number) {
        const remainingLetters = this.memory.get(this.userId) || null;
        if (remainingLetters) {
            this.saveLetters(remainingLetters);
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
            processors.set(userId, new WordProcessor(userId, db));
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
            const letters = processors.get(userId)?.getLetters() || [];

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