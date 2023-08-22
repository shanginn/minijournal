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
        <div class="
            absolute
            top-0 left-0
            w-full h-full
            flex
            items-center justify-center
            bg-gray-300 dark:bg-slate-950
            bg-opacity-90
            z-50
        ">
            <div role="status">
                <svg aria-hidden="true"
                     class="inline w-10 h-10 mr-2 text-gray-200 animate-spin dark:text-gray-900 fill-red-600"
                     viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                          fill="currentColor"/>
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                          fill="currentFill"/>
                </svg>
                <span class="sr-only">Loading...</span>
            </div>
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