// The preload script runs before. It has access to web APIs
// as well as Electron's renderer process modules and some
// polyfilled Node.js functions.
// 
// https://www.electronjs.org/docs/latest/tutorial/sandbox

window.require = require;

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
    },
    startRecording: (deviceId) => {
        navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: deviceId,
                sampleRate: 48000,
                channels: 2,
                echoCancellation: true
            }
        }).then(stream => {
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorder.start();

            const chunks = [];

            mediaRecorder.addEventListener('dataavailable', event => {
                chunks.push(event.data);
            });

            mediaRecorder.addEventListener('stop', () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                ipcRenderer.send('recording-stop', url);
            });

            ipcRenderer.send('recording-start');

            setTimeout(() => {
                mediaRecorder.stop(); // stop recording after 2 min
            }, 120000);
        });
    },
    stopRecording: () => {
        ipcRenderer.send('recording-stop');
        mediaRecorder.stop()
    },
    getMicrophoneDevices: async () => {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const microphones = devices.filter(device => device.kind === 'audioinput');
        return microphones.map(microphone => ({ id: microphone.deviceId, label: microphone.label }));
    },
    testMicrophoneAccess: async (deviceId) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: deviceId } });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    }
});
