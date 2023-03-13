import './style.css';
import { WebContainer } from '@webcontainer/api';
// import { files } from './files';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';

/** @type {import('@webcontainer/api').WebContainer}  */
let webcontainerInstance;
const files = {}

const loadFile = (name) => {
  const xhr = new XMLHttpRequest()
  const okStatus = document.location.protocol === 'file:' ? 0 : 200
  xhr.open('GET', name, false)
  xhr.overrideMimeType('text/html;charset=utf-8')// 默认为utf-8
  xhr.send(null)
  return xhr.status === okStatus ? xhr.responseText : null
}

window.addEventListener('load', async () => {
  files['slides.md'] = { file: {
    contents: loadFile('/slidev/slides.md')
  }}
  files['package.json'] = { file: {
    contents: loadFile('/slidev/package.json')
  }}
  textareaEl.value = files['slides.md'].file.contents;
  textareaEl.addEventListener('input', (e) => {
    writeIndexJS(e.currentTarget.value);
  });

  const terminal = new Terminal({
    convertEol: true,
  });
  terminal.open(terminalEl);

  // Call only once
  webcontainerInstance = await WebContainer.boot();
  await webcontainerInstance.mount(files);

  const exitCode = await installDependencies(terminal);
  if (exitCode !== 0) {
    throw new Error('Installation failed');
  }

  startDevServer(terminal);
});

async function installDependencies(terminal) {
  // Install dependencies
  const installProcess = await webcontainerInstance.spawn('npm', ['install']);
  installProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );
  // Wait for install command to exit
  return installProcess.exit;
}

async function startDevServer(terminal) {
  // Run `npm run start` to start the Express app
  const serverProcess = await webcontainerInstance.spawn('npm', ['run', 'dev']);

  serverProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        terminal.write(data);
      },
    })
  );

  // Wait for `server-ready` event
  webcontainerInstance.on('server-ready', (port, url) => {
    iframeEl.src = url;
  });
}

/**
 * @param {string} content
 */

async function writeIndexJS(content) {
  await webcontainerInstance.fs.writeFile('/slides.md', content);
}

document.querySelector('#app').innerHTML = `
  <div class="container">
    <div class="editor">
      <textarea>I am a textarea</textarea>
    </div>
    <div class="preview">
      <iframe src="loading.html"></iframe>
    </div>
    <div class="terminal"></div>
  </div>
`;

/** @type {HTMLIFrameElement | null} */
const iframeEl = document.querySelector('iframe');

/** @type {HTMLTextAreaElement | null} */
const textareaEl = document.querySelector('textarea');

const terminalEl = document.querySelector('.terminal');
