<script lang="ts">
    import {onMount} from 'svelte';
    import cookie from "cookie";
    import {MessageType} from "../../shared/types";

    let socket: WebSocket;
    let userId: string;

    let value: string = '';
    let previousValue: string = '';

    onMount(() => {
        socket = new WebSocket('ws://localhost:3333');

        socket.onopen = (data) => {
            userId = cookie.parse(document.cookie)['userId'];
            console.log(`WebSocket Client Connected. User ID: ${userId}`);
        };

        socket.onmessage = (message) => {
            const {type, data} = JSON.parse(message.data);
            console.log(type, data)

            if (type === MessageType.Words) {
                const textarea = document.querySelector('textarea');

                textarea.value = previousValue = value = data.text;
                textarea.scrollTop = textarea.scrollHeight;
                textarea.focus()
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
        console.log(lastInput)

        lastInput.split('').forEach((char) => {
            const timestamp = new Date().toISOString();
            socket.send(JSON.stringify({
                char,
                timestamp
            }));
        });

        previousValue = target.value;
    }
</script>

<main class="
    h-screen
    px-2
    sm:px-4
    md:px-8
    lg:px-16
    xl:px-32
    2xl:px-64
">
  <textarea
          bind:value={value}
          on:input={handleInput}
          class="
            h-full w-full
            resize-none
            bg-gray-100
            p-5
            border-none outline-none
          "
          spellcheck="false"
          placeholder="Append-only textarea"
  ></textarea>
</main>