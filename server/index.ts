import {v4 as uuid} from 'uuid';
import cookie from 'cookie';
import {Database, Statement} from "bun:sqlite";
import {Message, MessageType, Word} from "../shared/types.ts";

const db = new Database(":memory:");//, {create: true});

db.run(`
    CREATE TABLE IF NOT EXISTS words (
        userId TEXT NOT NULL,
        word TEXT NOT NULL,
        timestamp INTEGER NOT NULL
    );
`);

class WordProcessor {
    private readonly db: Database;
    private readonly userId: string;
    private memory: Map<string, string> = new Map();

    constructor(userId: string, db: Database) {
        this.userId = userId;
        this.db = db;
    }

    processChar(char: string, timestamp: number) {
        const word = this.memory.get(this.userId) || '';
        const newWord = word + char;

        this.memory.set(this.userId, newWord);

        if (newWord.length >= 3) {
            this.addWord(newWord, timestamp);
            this.memory.set(this.userId, '');
        }
    }

    addWord(word: string, timestamp: number) {
        const query = this.db.query(`
            INSERT INTO words (userId, word, timestamp)
            VALUES ($userId, $word, $timestamp)
        `);

        query.run({
            $userId: this.userId,
            $word: word,
            $timestamp: timestamp
        });
    }

    getWords() {
        const query: Statement<Word> = this.db.query(`
            SELECT word, timestamp, userId
            FROM words
            WHERE userId = $userId
            ORDER BY timestamp ASC
        `);

        return query.all({
            $userId: this.userId
        });
    }
}

let processors: Map<string, WordProcessor> = new Map();

const server = Bun.serve<{ userId: string }>({
    port: 3333,
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
            const words = processors.get(userId)?.getWords() || [];

            const text = words.map(({word}) => word).join('');

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
            console.log(`Received ${message}`);
            const {userId} = ws.data;

            const {char, timestamp} = JSON.parse(message.toString());
            processors.get(userId)?.processChar(char, timestamp);

            const echoMessage: Message = {
                type: MessageType.Echo,
                data: {char, timestamp}
            }

            ws.send(JSON.stringify(echoMessage));
        },
    },
});

console.log(`Listening on ${server.hostname}:${server.port}`);