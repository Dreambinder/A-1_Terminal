const output = document.getElementById("terminal-output");
const input = document.getElementById("terminal-input");
const promptEl = document.getElementById("prompt");

let fsData = null;
let currentPath = [];
let historyStack = [];

function write(text = "") {
  output.textContent += text + "\n";
  output.scrollTop = output.scrollHeight;
}

function setPrompt() {
  const path = currentPath.length ? "/" + currentPath.join("/") : "/";
  promptEl.textContent = `A1:${path}>`;
}

function getNode(pathArray) {
  let node = fsData;
  for (const part of pathArray) {
    if (!node.children || !node.children[part]) {
      return null;
    }
    node = node.children[part];
  }
  return node;
}

function listDir() {
  const node = getNode(currentPath);
  if (!node || node.type !== "directory") {
    write("Current location is invalid.");
    return;
  }

  const names = Object.keys(node.children || {});
  if (!names.length) {
    write("[empty]");
    return;
  }

  names.forEach(name => {
    const child = node.children[name];
    write(child.type === "directory" ? `[DIR] ${name}` : `      ${name}`);
  });
}

function printTree(node = fsData, prefix = "") {
  if (!node.children) return;
  const names = Object.keys(node.children);
  names.forEach((name, index) => {
    const isLast = index === names.length - 1;
    const connector = isLast ? "└── " : "├── ";
    write(prefix + connector + name);
    const child = node.children[name];
    if (child.type === "directory") {
      printTree(child, prefix + (isLast ? "    " : "│   "));
    }
  });
}

function openFile(name) {
  const node = getNode(currentPath);
  if (!node || node.type !== "directory") {
    write("Cannot open file here.");
    return;
  }

  const file = node.children?.[name];
  if (!file) {
    write(`File not found: ${name}`);
    return;
  }

  if (file.type !== "file") {
    write(`${name} is a directory.`);
    return;
  }

  write("");
  write(file.content);
  write("");
}

function changeDir(name) {
  if (!name) {
    write("Usage: cd <directory>");
    return;
  }

  if (name === "..") {
    if (currentPath.length > 0) {
      currentPath.pop();
      setPrompt();
    }
    return;
  }

  const node = getNode(currentPath);
  const target = node?.children?.[name];

  if (!target) {
    write(`Directory not found: ${name}`);
    return;
  }

  if (target.type !== "directory") {
    write(`${name} is not a directory.`);
    return;
  }

  currentPath.push(name);
  setPrompt();
}

function back() {
  if (currentPath.length > 0) {
    currentPath.pop();
    setPrompt();
  } else {
    write("Already at root.");
  }
}

function showHelp() {
  write("Available commands:");
  write("HELP          Show this help");
  write("DIR           List current directory");
  write("TREE          Show full tree");
  write("CD <name>     Enter directory");
  write("CD ..         Go up one level");
  write("OPEN <file>   Read a file");
  write("BACK          Go up one level");
  write("PWD           Show current path");
  write("CLS           Clear screen");
}

function pwd() {
  write("/" + currentPath.join("/"));
}

function clearScreen() {
  output.textContent = "";
}

function runCommand(rawInput) {
  const line = rawInput.trim();
  if (!line) return;

  write(`${promptEl.textContent} ${line}`);

  const [command, ...args] = line.split(" ");
  const cmd = command.toLowerCase();

  switch (cmd) {
    case "help":
      showHelp();
      break;
    case "dir":
    case "ls":
      listDir();
      break;
    case "tree":
      printTree();
      break;
    case "cd":
      changeDir(args.join(" "));
      break;
    case "open":
    case "cat":
    case "read":
      openFile(args.join(" "));
      break;
    case "back":
      back();
      break;
    case "pwd":
      pwd();
      break;
    case "cls":
    case "clear":
      clearScreen();
      break;
    default:
      write(`Unknown command: ${command}`);
      write("Type HELP for available commands.");
  }

  historyStack.push(line);
}

async function init() {
  const response = await fetch("data.json");
  fsData = await response.json();

  write("RELAY POINT A-1");
  write("THREAT ASSESSMENT DOSSIER");
  write("Classification: INTERNAL // AURIC CLEARANCE");
  write("Type HELP for available commands.");
  write("");

  setPrompt();
  input.focus();
}

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    runCommand(input.value);
    input.value = "";
  }
});

document.addEventListener("click", () => input.focus());

init();