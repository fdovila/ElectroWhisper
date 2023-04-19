/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 * 
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { contextBridge, ipcRenderer } = require("electron");

// Expose certain modules to the renderer process
contextBridge.exposeInMainWorld(
    "api", {
    send: (channel, data) => {
        // Send data to main process
        ipcRenderer.send(channel, data);
    },
    receive: (channel, func) => {
        // Receive data from main process
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
}
);