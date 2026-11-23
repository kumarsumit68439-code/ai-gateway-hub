import Link from 'next/link';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bot hosting guide | AI Gateway' };

export default function BotDocs() {
  const host = headers().get('host') || 'YOUR-DOMAIN';
  const base = 'https://' + host;

  const node = `const BASE = '${base}/api/bot/v1';
const H = { Authorization: 'Bot ' + process.env.BOT_TOKEN, 'Content-Type': 'application/json' };
const PREFIX = '!';

async function api(path, opts) {
  const r = await fetch(BASE + path, { headers: H, ...opts });
  return r.json();
}

const say = (channel, content) =>
  api('/channels/' + channel + '/messages', { method: 'POST', body: JSON.stringify({ content }) });

async function onMessage(e) {
  if (e.author.bot || !e.content.startsWith(PREFIX)) return;
  const [cmd, ...args] = e.content.slice(PREFIX.length).split(' ');
  if (cmd === 'ping') await say(e.channel_id, 'Pong!');
  if (cmd === 'echo') await say(e.channel_id, args.join(' ') || 'Nothing to echo');
}

async function main() {
  let after;
  for (;;) {
    try {
      const q = (after !== undefined ? 'after=' + after + '&' : '') + 'timeout=25';
      const j = await api('/events?' + q);
      if (j.last_id !== undefined) after = j.last_id;
      for (const e of j.events || []) await onMessage(e);
    } catch (err) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}
main();`;

  const py = `import os, time, requests

BASE = "${base}/api/bot/v1"
H = {"Authorization": "Bot " + os.environ["BOT_TOKEN"]}
PREFIX = "!"

def say(channel, content):
    requests.post(f"{BASE}/channels/{channel}/messages", headers=H, json={"content": content}, timeout=15)

def on_message(e):
    if e["author"]["bot"] or not e["content"].startswith(PREFIX):
        return
    cmd, *args = e["content"][len(PREFIX):].split(" ")
    if cmd == "ping":
        say(e["channel_id"], "Pong!")

after = None
while True:
    try:
        params = {"timeout": 25}
        if after is not None:
            params["after"] = after
        j = requests.get(f"{BASE}/events", headers=H, params=params, timeout=40).json()
        after = j.get("last_id", after)
        for e in j.get("events", []):
            on_message(e)
    except Exception:
        time.sleep(3)`;

  const music = `# find the voice channel of the user who typed the command
curl "${base}/api/bot/v1/voice-states?server_id=SERVER_ID" -H "Authorization: Bot $BOT_TOKEN"

# join, play, stop, leave
curl -X POST ${base}/api/bot/v1/channels/VOICE_CHANNEL_ID/voice \\
  -H "Authorization: Bot $BOT_TOKEN" -H "Content-Type: application/json" \\
  -d '{"action":"play","url":"https://example.com/song.mp3","title":"My song"}'`;

  const docker = `# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY bot.js .
CMD ["node", "bot.js"]

# build and run (restarts on crash and on reboot)
docker build -t my-bot .
docker run -d --restart unless-stopped --name my-bot -e BOT_TOKEN=YOUR_TOKEN my-bot`;

  const pyDocker = `# Dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir requests
COPY bot.py .
CMD ["python", "bot.py"]`;

  const vps = `# pm2 (Node.js)
npm i -g pm2
BOT_TOKEN=YOUR_TOKEN pm2 start bot.js --name my-bot
pm2 save && pm2 startup

# systemd (any language) /etc/systemd/system/my-bot.service
[Unit]
Description=My bot
After=network-online.target

[Service]
WorkingDirectory=/opt/my-bot
Environment=BOT_TOKEN=YOUR_TOKEN
ExecStart=/usr/bin/node bot.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target

# then
sudo systemctl enable --now my-bot`;

  return (
    <div className="wrap">
      <h1>Bot hosting guide</h1>
      <p className="mute">Create a bot on the <Link href="/bots">Bots</Link> page, copy its token, invite it to a server, then host it.</p>

      <h2>1. Create and invite</h2>
      <div className="card">
        <ol style={{ margin: 0 }}>
          <li>Open <Link href="/bots">Bots</Link>, create a bot and copy the <b>token</b> and <b>client ID</b>.</li>
          <li>Set its name, avatar and banner (URL or upload) on the bot page.</li>
          <li>Open the invite link <code>{base}/invite/bot/CLIENT_ID</code> and add the bot to a server you own.</li>
          <li>Choose how to host it: <b>Hosted by Jilowa</b> or <b>Self-hosted</b>.</li>
        </ol>
      </div>

      <h2>2. Hosted by Jilowa</h2>
      <p className="mute">Nothing to run. The bot is always online and answers prefix commands in your server.</p>
      <div className="card">
        <table>
          <thead><tr><th>Command</th><th>What it does</th></tr></thead>
          <tbody>
            <tr><td><code>!help</code></td><td>List commands</td></tr>
            <tr><td><code>!ping</code></td><td>Check the bot responds</td></tr>
            <tr><td><code>!ai question</code></td><td>AI chat answer</td></tr>
            <tr><td><code>!say text</code>, <code>!roll</code>, <code>!serverinfo</code></td><td>Utilities</td></tr>
            <tr><td><code>!join</code>, <code>!leave</code></td><td>Join or leave your voice channel</td></tr>
            <tr><td><code>!play url</code>, <code>!stop</code>, <code>!nowplaying</code></td><td>Music from a direct audio link or YouTube link</td></tr>
            <tr><td>Your own commands</td><td>Add them on the bot page</td></tr>
          </tbody>
        </table>
        <p className="mute" style={{ marginBottom: 0 }}>The prefix is the one you set for the bot. Music plays for people in the voice channel.</p>
      </div>

      <h2>3. Self-hosted</h2>
      <p className="mute">Your code runs anywhere and talks to the API with the bot token. Events arrive by HTTPS long-polling, so the same code works on a VPS, in Docker or on a serverless platform.</p>
      <b>Node.js (bot.js, Node 18+)</b><pre><code>{node}</code></pre>
      <b>Python (bot.py)</b><pre><code>{py}</code></pre>
      <b>Voice and music</b><pre><code>{music}</code></pre>

      <h2>4. Docker</h2>
      <pre><code>{docker}</code></pre>
      <b>Python image</b><pre><code>{pyDocker}</code></pre>

      <h2>5. VPS</h2>
      <pre><code>{vps}</code></pre>

      <h2>API reference</h2>
      <p className="mute">Send <code>Authorization: Bot YOUR_TOKEN</code> with every request.</p>
      <div className="card">
        <table>
          <thead><tr><th>Method</th><th>Path</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>GET</td><td><code>/api/bot/v1/me</code></td><td>Your bot profile, also a token check</td></tr>
            <tr><td>GET</td><td><code>/api/bot/v1/servers</code></td><td>Servers and channels your bot is in</td></tr>
            <tr><td>GET</td><td><code>/api/bot/v1/events</code></td><td>New messages (long-poll, use <code>after</code> and <code>timeout</code>)</td></tr>
            <tr><td>GET</td><td><code>/api/bot/v1/channels/:id/messages</code></td><td>Recent messages</td></tr>
            <tr><td>POST</td><td><code>/api/bot/v1/channels/:id/messages</code></td><td>Send a message <code>{'{"content":"hi"}'}</code></td></tr>
            <tr><td>GET</td><td><code>/api/bot/v1/voice-states?server_id=</code></td><td>Who is in which voice channel</td></tr>
            <tr><td>POST</td><td><code>/api/bot/v1/channels/:id/voice</code></td><td>Actions: join, leave, play, stop</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Errors</h2>
      <div className="card">
        <table>
          <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
          <tbody>
            <tr><td>401</td><td>Invalid token (reset it on the bot page)</td></tr>
            <tr><td>404</td><td>Channel not found or the bot is not in that server</td></tr>
            <tr><td>429</td><td>Sending too fast</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
