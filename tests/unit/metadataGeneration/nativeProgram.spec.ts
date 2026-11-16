import type { Channel } from '@tsoa/cli/metadataGeneration/native/channel';
import { createProgramOverChannel } from '@tsoa/cli/metadataGeneration/native/program';
import type { Query, Response } from '@tsoa/cli/metadataGeneration/native/protocol';
import { expect } from 'chai';
import 'mocha';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const fileName = '/virtual/controller.ts';
const text = 'export const answer = 42;\n';

type Answers = Partial<Record<Query['op'], (query: Query) => Response>>;

/** A channel that answers from a table; ops missing from the table fail as an unknown op would. */
function fakeChannel(answers: Answers) {
  const table: Answers = {
    open: () => ({ ok: true, result: { protocol: 8, files: [{ id: 1, fileName, isDeclarationFile: false, isDefaultLibrary: false }], undefinedType: 1 } }),
    fileText: () => ({ ok: true, result: text }),
    close: () => ({ ok: true, result: null }),
    ...answers,
  };
  const channel = {
    closed: 0,
    request: (query: Query) => table[query.op]?.(query) ?? { ok: false, error: `fake channel has no answer for ${query.op}` },
    close: () => {
      channel.closed++;
    },
  };
  return channel satisfies Channel;
}

const exited = () => {
  throw new Error('tsoa compiler helper exited');
};

const firstStatement = (program: ReturnType<typeof createProgramOverChannel>) => program.getSourceFiles()[0].statements[0];

describe('native program over a channel', () => {
  it('refuses a helper that speaks another protocol, and closes the channel', () => {
    const channel = fakeChannel({ open: () => ({ ok: true, result: { protocol: 7, files: [], undefinedType: 1 } }) });
    expect(() => createProgramOverChannel(channel, [fileName], {})).to.throw('tsoa compiler helper speaks protocol 7, this tsoa needs 8');
    expect(channel.closed).to.equal(1);
  });

  it('reports a helper that exits mid-session', () => {
    const channel = fakeChannel({ prefetchFile: exited });
    const program = createProgramOverChannel(channel, [fileName], {});
    expect(() => program.getTypeChecker().getTypeAtLocation(firstStatement(program))).to.throw('tsoa compiler helper exited');
  });

  it('names the file the helper failed to prefetch', () => {
    const channel = fakeChannel({ prefetchFile: () => ({ ok: false, error: 'out of memory' }) });
    const program = createProgramOverChannel(channel, [fileName], {});
    expect(() => program.getTypeChecker().getSymbolAtLocation(firstStatement(program))).to.throw(`tsoa compiler helper failed on ${fileName}: out of memory`);
  });

  it('parses the files the helper opened and answers from it', () => {
    const channel = fakeChannel({
      prefetchFile: () => ({ ok: true, result: { symbolAt: [], typeFrom: [], declared: [], typeOfSymbol: [] } }),
      typeAtLocation: () => ({ ok: true, result: 7 }),
      typeToString: () => ({ ok: true, result: '42' }),
    });
    const program = createProgramOverChannel(channel, [fileName], {});
    const checker = program.getTypeChecker();
    expect(program.getSourceFiles().map(file => file.text)).to.deep.equal([text]);
    expect(checker.typeToString(checker.getTypeAtLocation(firstStatement(program)))).to.equal('42');
  });

  const closeAnswers: Array<[string, () => Response]> = [
    ['answers', () => ({ ok: true, result: null })],
    ['fails', () => ({ ok: false, error: 'busy' })],
    ['has exited', exited],
  ];
  for (const [outcome, close] of closeAnswers) {
    it(`closes the channel once when the helper's close ${outcome}`, () => {
      const channel = fakeChannel({ close });
      const program = createProgramOverChannel(channel, [fileName], {});
      expect(() => program.close()).not.to.throw();
      expect(channel.closed).to.equal(1);
    });
  }
});

const sourceRoot = join(__dirname, '../../../packages/cli/src');
const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  });

describe('native checker', () => {
  it('implements every checker method metadata generation calls', () => {
    const called = new Set<string>();
    for (const file of ['metadataGeneration', 'utils'].flatMap(directory => sourceFiles(join(sourceRoot, directory)))) {
      for (const match of readFileSync(file, 'utf8').matchAll(/(?:\bchecker|\btypeChecker|\bTypeChecker\(\))\.(\w+)\(/g)) called.add(match[1]);
    }
    const nativeChecker = createProgramOverChannel(fakeChannel({}), [fileName], {}).getTypeChecker();
    expect(called).to.include('getTypeAtLocation');
    expect([...called].filter(name => !(name in nativeChecker))).to.deep.equal([]);
  });
});
