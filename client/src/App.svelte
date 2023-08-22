<style>
    textarea {
        overflow-y: auto;
    }

    textarea::-webkit-scrollbar {
        display: none;
    }

    textarea {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    .backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.3);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .loader {
        border: 6px solid #f3f3f3;
        border-top: 6px solid #3498db;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
</style>

<script lang="ts">
    import {onMount} from 'svelte';
    import cookie from "cookie";
    import {MessageType} from "../types";
    import {WS_URL} from "./env";

    let socket: WebSocket;
    let userId: string;
    let isConnected = false;

    let value: string = '';
    let previousValue: string = '';

    const focus = (textarea: HTMLTextAreaElement) => {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        textarea.scrollTop = textarea.scrollHeight;
    }

    onMount(() => {
        socket = new WebSocket(WS_URL);

        socket.onopen = (data) => {
            isConnected = true;
            userId = cookie.parse(document.cookie)['userId'];
            console.log(`WebSocket Client Connected. User ID: ${userId}`);
        };

        socket.onmessage = (message) => {
            const {type, data} = JSON.parse(message.data);

            if (type === MessageType.Words) {
                const textarea = document.querySelector('textarea');

                textarea.value = previousValue = value = data.text;
                focus(textarea);
            }
        };

        socket.onclose = () => {
            isConnected = false;
            console.log('WebSocket Client Disconnected');
        };
    });

    function handleInput(event: Event) {
        const target = event.target as HTMLTextAreaElement;

        if (!target.value.startsWith(previousValue)) {
            target.value = previousValue;

            return;
        }

        const lastInput = target.value.slice(previousValue.length);

        lastInput.split('').forEach((char) => {
            const timestamp = new Date().toISOString();
            socket.send(JSON.stringify({
                char,
                timestamp
            }));
        });

        previousValue = target.value;
        focus(target);
    }

    const focusTextarea = (event: InputEvent) => {
        const target = event.target as HTMLTextAreaElement;
        focus(target);
    }
</script>

<main class="
    h-screen
    overflow-hidden
    px-2
    sm:px-4
    md:px-16
    lg:px-32
    xl:px-64
    2xl:px-64
    bg-amber-100
    dark:bg-slate-950
">
    {#if !isConnected}
        <div class="backdrop">
            <div class="loader"></div>
        </div>
    {/if}
    <textarea
            bind:value={value}
            on:input={handleInput}
            on:beforeinput={focusTextarea}
            class="
            h-full w-full
            resize-none
            px-5 pt-5 pb-96

            bg-amber-100
            text-neutral-950

            dark:bg-slate-950
            dark:text-sky-50

            border-none outline-none
            text-xl
            overflow-y-auto
          "
            spellcheck="false"
            placeholder="Это ваш личный дневник из которого нельзя удалять и редактировать записи"
    ></textarea>
</main>