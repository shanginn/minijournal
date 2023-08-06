<style>
    textarea {
        overflow-y: auto;

        &::-webkit-scrollbar {
            display: none;
        }

        & {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
    }
</style>

<script lang="ts">
    import {onMount} from 'svelte';
    import cookie from "cookie";
    import {MessageType} from "../../shared/types";

    let socket: WebSocket;
    let userId: string;

    let value: string = '';
    let previousValue: string = '';

    const focus = (textarea: HTMLTextAreaElement) => {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        textarea.scrollTop = textarea.scrollHeight;
    }

    onMount(() => {
        socket = new WebSocket('ws://localhost:3333');

        socket.onopen = (data) => {
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
">
  <textarea
          bind:value={value}
          on:input={handleInput}
          on:beforeinput={focusTextarea}
          class="
            h-full w-full
            resize-none
            px-5 pt-5 pb-96

            border-none outline-none
            text-xl
            overflow-y-auto
          "
          spellcheck="false"
          placeholder="Append-only textarea"
  ></textarea>
</main>