import { spawn, type ChildProcess } from 'node:child_process';
import { readSync, writeSync } from 'node:fs';
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

/**
 * Length-prefixed JSON over the helper's stdio, read synchronously so tsoa's synchronous resolver stays synchronous.
 * The child is unref'd so it never holds the event loop open; it is killed on `close()` or when this process exits.
 */
export function openChannel(helperPath: string): Channel {
  const child = spawn(helperPath, [], { stdio: ['pipe', 'pipe', 'inherit'] });
  liveHelpers.add(child);
  const output = pipeHandle(child.stdout);
  const input = pipeHandle(child.stdin);
  output.setBlocking?.(true);
  input.setBlocking?.(true);
  child.stdout.pause();
  (child.stdout as unknown as { unref(): void }).unref();
  (child.stdin as unknown as { unref(): void }).unref();
  child.unref();

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
        n = readSync(output.fd, buffer, end, buffer.length - end, null);
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
          written += writeSync(input.fd, message, written);
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
      child.stdout.destroy();
      child.stdin.destroy();
      child.kill();
    },
  };
}
