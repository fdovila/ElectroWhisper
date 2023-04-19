const { exec } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const childProcess = require('child_process');
const whisper_path = "C:\\tools\\whisperbin\\"

async function runWhisperCommand(args) {
    const command = `${whisper_path}\\ggml-large.bin ${args.join(' ')}`;
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}


    async function ValidateInputs(inputs) {
        let validInputs = true;
        if (!inputs.outputFormat) {
            alert("Please select an output format");
            validInputs = false;
        } else if (!isSupportedOutputFormat(inputs.outputFormat)) {
            alert("The selected output format is not supported by the Whisper CPP program");
            validInputs = false;
        }
        return validInputs;
    }

function isSupportedOutputFormat(outputFormat) {
    const supportedFormats = ['txt', 'json', 'csv', 'html', 'xml', 'srt', 'vtt'];
    return supportedFormats.includes(outputFormat);
}

async function transcribeAudio(username, filepath, count) {
    const args = [
        '-i', filepath,
        '-o', 'txt',
        '-o', 'json',
        '-o', 'csv',
        '-o', 'html',
        '-o', 'xml',
        '-o', 'srt',
        '-o', 'vtt',
        '-u', username,
        '-c', count
    ];
    const options = {
        stdio: 'inherit',
        shell: true
    };
    await spawn('whisper', args, options);
    ValidateInputs(inputs).then(validInputs => {
        if (validInputs) {
            transcribeAudio(username, filepath, count);
        } else {
            console.log('Invalid inputs');
        }
    });
}

async function saveTranscription(txt, count, username, filepath) {
    const fileName = `log_${count}.txt`;
    const fileFullPath = `${filepath}/${fileName}`;

    if (count > 1) {
        const prevFileName = `log_${count - 1}.txt`;
        const prevFileFullPath = `${filepath}/${prevFileName}`;
        const hashPrevFile = await hashFile(prevFileFullPath, username);
        txt = `Continuation of ${hashPrevFile}\n` + txt;
    }

    fs.writeFile(fileFullPath, txt, 'utf8', (err) => {
        if (err) {
            console.error(err);
        } else {
            console.log(`Transcription saved in ${fileName}`);
        }
    });
}

async function DisplayTranscription(transcription) {
    const response = await fetch(transcription);
    const data = await response.json();
    document.getElementById("transcription-results").innerHTML = data.transcription;
}

function hashFile(file, username) {
    return new Promise((resolve, reject) => {
        const hasher = crypto.createHash('sha256');
        fs.readFile(file, (err, data) => {
            if (err) {
                reject(err);
            } else {
                hasher.update(username + data);
                resolve(hasher.digest('hex'));
            }
        });
    });
}

function spawn(command, args, options) {
    return new Promise((resolve, reject) => {
        const spawnedProcess = childProcess.spawn(command, args, options);
        spawnedProcess.on('error', reject);
        spawnedProcess.on('exit', (code, signal) => resolve({ code, signal }));
        return spawnedProcess;
    });
}

async function UpdateConfiguration(config) {
    const configFile = `${__dirname}/config.json`;
    await fs.writeFile(configFile, JSON.stringify(config), (err) => {
        if (err) {
            console.error(err);
        }
    });
}

// Attach event listeners and trigger the transcription process as needed. Call Spawn
document.addEventListener('DOMContentLoaded', () => {
    const startTranscriptionBtn = document.getElementById('start-transcription');
    const usernameInput = document.getElementById('username');
    const filepathInput = document.getElementById('filepath');
    const countInput = document.getElementById('count');

    startTranscriptionBtn.addEventListener('click', async () => {
        const username = usernameInput.value;
        const filepath = filepathInput.value;
        const count = parseInt(countInput.value);

        if (isNaN(count) || count < 1) {
            alert('Invalid count value');
            return;
        }

        const inputs = {
            outputFormat: 'txt'
        };

        // update inputs object with user inputs
        inputs.outputFormat = document.querySelector('input[name="output-format"]:checked').value;

        // call ValidateInputs after user inputs are set
        const validInputs = await ValidateInputs(inputs);

        if (validInputs) {
            try {
                await transcribeAudio(username, filepath, count);
                const transcriptionFile = `${filepath}/log_${count}.txt`;
                await DisplayTranscription(transcriptionFile);
                await saveTranscription(transcriptionFile, count, username, filepath);
            } catch (err) {
                console.error(err);
                document.getElementById("transcription-results").innerHTML = "An error occurred. Please try again.";
            }
        } else {
            console.log('Invalid inputs');
        }
    });
});