const output = document.getElementById("terminal-output");
const input = document.getElementById("terminal-input");
const promptEl = document.getElementById("prompt");

const socket = io();

function render(history, prompt) {
  output.textContent = history.join("\n");
  promptEl.textContent = prompt;
  output.scrollTop = output.scrollHeight;
}

socket.on("terminal:update", (state) => {
  render(state.history, state.prompt);
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const value = input.value.trim();
    if (value) {
      socket.emit("terminal:command", value);
    }
    input.value = "";
  }
});

document.addEventListener("click", () => input.focus());
input.focus();