import { expect } from 'chai';
import 'mocha';
import { normalisePath } from '../../../../src/utils/pathUtils';

describe('Paths normalisation', () => {
  it('should remove all redundant symbols at the beginning and at the end', () => {
    const path = 'pathSection1/pathSection2';
    expect(normalisePath(`/${path}/`)).to.equal(path);
    expect(normalisePath(`///${path}///`)).to.equal(path);
    expect(normalisePath(` ${path} `)).to.equal(path);
    expect(normalisePath(` / ${path} / `)).to.equal(path);
    expect(normalisePath(` /\\${path}\\/ `)).to.equal(path);
    expect(
      normalisePath(` /
                                  /\\${path}\\/ /
                                  / `),
    ).to.equal(path);

    expect(
      normalisePath(` /
                                  /\\\\/ /
                                  / `),
    ).to.equal('');
  });

  it('should replace all redundant symbols in the middle of the path with single "/"', () => {
    const section1 = 'pathSection1';
    const section2 = 'pathSection2';
    const section3 = 'pathSection3';
    const normalisedPath = `${section1}/${section2}`;
    expect(normalisePath(`${section1}//${section2}`)).to.equal(normalisedPath);
    expect(normalisePath(`${section1}\\${section2}`)).to.equal(normalisedPath);
    expect(normalisePath(`${section1} ${section2}`)).to.equal(normalisedPath);
    expect(normalisePath(`${section1} ${section2} ${section3}`)).to.equal(`${normalisedPath}/${section3}`);
    expect(normalisePath(`${section1} \\/${section2}/\\ ${section3}`)).to.equal(`${normalisedPath}/${section3}`);
    expect(normalisePath(`${section1} \\/${section2}/a\\ ${section3}`)).to.equal(`${normalisedPath}/a/${section3}`);
    expect(normalisePath(`${section1} \\/${section2}/\\b ${section3}`)).to.equal(`${normalisedPath}/b/${section3}`);
  });

  it('should add prefixes and suffixes when needed', () => {
    const path = 'pathSection';
    expect(normalisePath(path, '/')).to.equal(`/${path}`);
    expect(normalisePath(path, undefined, '/')).to.equal(`${path}/`);
    expect(normalisePath(path, '/', '/')).to.equal(`/${path}/`);
  });

  it('should handle bad parameters', () => {
    expect(normalisePath(undefined as any)).to.equal('');
    expect(normalisePath(null as any)).to.equal('');
    expect(normalisePath(1 as any)).to.equal('1');
    expect(normalisePath({} as any)).to.equal('[object/Object]');
    expect(normalisePath('')).to.equal('');

    expect(normalisePath('path', null as any, null as any)).to.equal('path');
    expect(normalisePath('path', undefined as any, undefined as any)).to.equal('path');
    expect(normalisePath('path', 1 as any, 2 as any)).to.equal('1path2');
    expect(normalisePath('path', {} as any, {} as any)).to.equal('[object/Object]path[object/Object]');
  });

  it('should handle empty path', () => {
    expect(normalisePath('', 'prefix', 'suffix')).to.equal('');
    expect(normalisePath('', 'prefix', 'suffix', false)).to.equal('prefixsuffix');
  });
});
