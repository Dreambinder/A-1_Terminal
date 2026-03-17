const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));

const fsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "public", "data.json"), "utf8")
);

const session = {
  currentPath: [],
  history: [
    "RELAY POINT A-1",
    "THREAT ASSESSMENT DOSSIER",
    "Classification: INTERNAL // AURIC CLEARANCE",
    "Type HELP for available commands.",
    ""
  ]
};

function getNode(pathArray) {
  let node = fsData;
  for (const part of pathArray) {
    if (!node.children || !node.children[part]) return null;
    node = node.children[part];
  }
  return node;
}

function getPrompt() {
  const path = session.currentPath.length
    ? "/" + session.currentPath.join("/")
    : "/";
  return `A1:${path}>`;
}

function pushLine(text = "") {
  session.history.push(text);
}

function listDir() {
  const node = getNode(session.currentPath);
  if (!node || node.type !== "directory") {
    pushLine("Current location is invalid.");
    return;
  }

  const names = Object.keys(node.children || {});
  if (!names.length) {
    pushLine("[empty]");
    return;
  }

  for (const name of names) {
    const child = node.children[name];
    pushLine(child.type === "directory" ? `[DIR] ${name}` : `      ${name}`);
  }
}

function buildTreeLines(node = fsData, prefix = "") {
  const lines = [];
  if (!node.children) return lines;

  const names = Object.keys(node.children);
  names.forEach((name, index) => {
    const isLast = index === names.length - 1;
    const connector = isLast ? "└── " : "├── ";
    lines.push(prefix + connector + name);

    const child = node.children[name];
    if (child.type === "directory") {
      lines.push(
        ...buildTreeLines(child, prefix + (isLast ? "    " : "│   "))
      );
    }
  });

  return lines;
}

function openFile(name) {
  const node = getNode(session.currentPath);
  if (!node || node.type !== "directory") {
    pushLine("Cannot open file here.");
    return;
  }

  const file = node.children?.[name];
  if (!file) {
    pushLine(`File not found: ${name}`);
    return;
  }

  if (file.type !== "file") {
    pushLine(`${name} is a directory.`);
    return;
  }

  pushLine("");
  for (const line of file.content.split("\n")) {
    pushLine(line);
  }
  pushLine("");
}

function changeDir(name) {
  if (!name) {
    pushLine("Usage: cd <directory>");
    return;
  }

  if (name === "..") {
    if (session.currentPath.length > 0) {
      session.currentPath.pop();
    }
    return;
  }

  const node = getNode(session.currentPath);
  const target = node?.children?.[name];

  if (!target) {
    pushLine(`Directory not found: ${name}`);
    return;
  }

  if (target.type !== "directory") {
    pushLine(`${name} is not a directory.`);
    return;
  }

  session.currentPath.push(name);
}

function showHelp() {
  pushLine("Available commands:");
  pushLine("HELP          Show this help");
  pushLine("DIR           List current directory");
  pushLine("TREE          Show full tree");
  pushLine("CD <name>     Enter directory");
  pushLine("CD ..         Go up one level");
  pushLine("OPEN <file>   Read a file");
  pushLine("BACK          Go up one level");
  pushLine("PWD           Show current path");
  pushLine("CLS           Clear screen");
}

function pwd() {
  pushLine("/" + session.currentPath.join("/"));
}

function clearScreen() {
  session.history = [];
}

function runCommand(rawInput) {
  const line = rawInput.trim();
  if (!line) return;

  pushLine(`${getPrompt()} ${line}`);

  const [command, ...args] = line.split(" ");
  const cmd = command.toLowerCase();
  const arg = args.join(" ");

  switch (cmd) {
    case "help":
      showHelp();
      break;
    case "dir":
    case "ls":
      listDir();
      break;
    case "tree":
      for (const line of buildTreeLines()) {
        pushLine(line);
      }
      break;
    case "cd":
      changeDir(arg);
      break;
    case "open":
    case "cat":
    case "read":
      openFile(arg);
      break;
    case "back":
      changeDir("..");
      break;
    case "pwd":
      pwd();
      break;
    case "cls":
    case "clear":
      clearScreen();
      break;
    default:
      pushLine(`Unknown command: ${command}`);
      pushLine("Type HELP for available commands.");
  }
}

function emitState() {
  io.emit("terminal:update", {
    history: session.history,
    prompt: getPrompt()
  });
}

io.on("connection", (socket) => {
  socket.emit("terminal:update", {
    history: session.history,
    prompt: getPrompt()
  });

  socket.on("terminal:command", (input) => {
    runCommand(input);
    emitState();
  });
});

server.listen(PORT, () => {
  console.log(`Relay terminal running on http://0.0.0.0:${PORT}`);
});