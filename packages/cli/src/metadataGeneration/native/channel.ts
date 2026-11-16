import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { accessSync, closeSync, constants, openSync, readSync, writeSync } from 'node:fs';
import type { Readable, Writable } from 'node:stream';
import type { Query, Response } from './protocol';

export interface Channel {
  request(query: Query): Response;
  close(): void;
}

/** Node keeps a pipe's file descriptor on its private libuv handle; reading it is the only way to block on a child's stdio. */
interface PipeHandle {
  fd: number;
  setBlocking?(blocking: boolean): void;
}

function pipeHandle(stream: Readable | Writable): PipeHandle {
  return (stream as unknown as { _handle: PipeHandle })._handle;
}

const liveHelpers = new Set<ChildProcess>();
process.on('exit', () => liveHelpers.forEach(child => child.kill()));

interface Connection {
  child: ChildProcess;
  readFd: number;
  writeFd: number;
  close(): void;
}

/** POSIX: the child's stdio pipes, read and written through their file descriptors. */
function connectOverStdio(helperPath: string): Connection {
  const child = spawn(helperPath, [], { stdio: ['pipe', 'pipe', 'inherit'] });
  liveHelpers.add(child);
  // A helper that fails to start (or to be killed) emits `error` after the synchronous request that saw it fail has
  // already thrown; listening keeps Node from printing it as unhandled.
  child.on('error', () => liveHelpers.delete(child));
  const output = pipeHandle(child.stdout);
  const input = pipeHandle(child.stdin);
  output.setBlocking?.(true);
  input.setBlocking?.(true);
  child.stdout.pause();
  (child.stdout as unknown as { unref(): void }).unref();
  (child.stdin as unknown as { unref(): void }).unref();
  child.unref();
  return {
    child,
    readFd: output.fd,
    writeFd: input.fd,
    close() {
      child.stdout.destroy();
      child.stdin.destroy();
    },
  };
}

/**
 * Windows: libuv pipe handles expose no file descriptor, so the helper serves a named pipe given as `--pipe` and this
 * process opens it with `openSync`, as TypeScript 7's own API client does. Untested on Windows.
 */
function connectOverNamedPipe(helperPath: string): Connection {
  const pipePath = `\\\\.\\pipe\\tsoa-facts-${process.pid}-${randomBytes(16).toString('hex')}`;
  const child = spawn(helperPath, ['--pipe', pipePath], { stdio: ['ignore', 'ignore', 'inherit'] });
  liveHelpers.add(child);
  child.on('error', () => liveHelpers.delete(child));
  child.unref();
  const pause = new Int32Array(new SharedArrayBuffer(4));
  for (let attempt = 0; attempt < 500; attempt++) {
    try {
      const fd = openSync(pipePath, 'r+');
      return { child, readFd: fd, writeFd: fd, close: () => closeSync(fd) };
    } catch {
      if (child.exitCode !== null) break;
      Atomics.wait(pause, 0, 0, 10);
    }
  }
  liveHelpers.delete(child);
  child.kill();
  throw new Error(`tsoa compiler helper did not open its pipe ${pipePath}`);
}

/**
 * Length-prefixed JSON over the helper's stdio (a named pipe on Windows), read synchronously so tsoa's synchronous
 * resolver stays synchronous. The child is unref'd so it never holds the event loop open; it is killed on `close()` or
 * when this process exits.
 */
export function openChannel(helperPath: string): Channel {
  try {
    accessSync(helperPath, constants.X_OK);
  } catch {
    throw new Error(`tsoa compiler helper not found or not executable: ${helperPath}`);
  }
  const connection = process.platform === 'win32' ? connectOverNamedPipe(helperPath) : connectOverStdio(helperPath);
  const { child, readFd, writeFd } = connection;

  let buffer = Buffer.alloc(1 << 20);
  let start = 0;
  let end = 0;
  const fill = (need: number) => {
    while (end - start < need) {
      if (start > 0 && end === buffer.length) {
        buffer.copy(buffer, 0, start, end);
        end -= start;
        start = 0;
      }
      if (end - start + (buffer.length - end) < need) {
        const bigger = Buffer.alloc(Math.max(buffer.length * 2, need + 16));
        buffer.copy(bigger, 0, start, end);
        end -= start;
        start = 0;
        buffer = bigger;
      }
      let n: number;
      try {
        n = readSync(readFd, buffer, end, buffer.length - end, null);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EAGAIN') continue;
        throw error;
      }
      if (n === 0) throw new Error('tsoa compiler helper exited');
      end += n;
    }
  };

  return {
    request(query) {
      const body = Buffer.from(JSON.stringify(query), 'utf8');
      const header = Buffer.alloc(4);
      header.writeUInt32LE(body.length);
      const message = Buffer.concat([header, body]);
      let written = 0;
      while (written < message.length) {
        try {
          written += writeSync(writeFd, message, written);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'EAGAIN') throw error;
        }
      }
      fill(4);
      const length = buffer.readUInt32LE(start);
      fill(4 + length);
      const text = buffer.toString('utf8', start + 4, start + 4 + length);
      start += 4 + length;
      if (start === end) start = end = 0;
      return JSON.parse(text) as Response;
    },
    close() {
      liveHelpers.delete(child);
      connection.close();
      child.kill();
    },
  };
}
