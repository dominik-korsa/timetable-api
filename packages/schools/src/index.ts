import { run } from "./client.js";

run([
    93, 94, 97, 45, 96, 4, 89, 34, 65, 14, 17, 15, 27, 54, 75, 83, 64, 29, 21, 24, 26, 47, 74, 46, 91, 92, 51, 50, 85, 86, 3, 19, 20, 16, 100
])
    .then(() => { process.exit(); })
    .catch(console.error);
