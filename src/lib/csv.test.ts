import { describe, expect, test } from 'bun:test';
import { csvCell, toCsv } from './csv';

describe('safe CSV export', () => {
  test('quotes commas, quotes and line breaks', () => {
    expect(csvCell('A, "B"\nC')).toBe('"A, ""B""\nC"');
  });

  test('neutralizes spreadsheet formula prefixes', () => {
    expect(csvCell('=2+2')).toBe('"\'=2+2"');
    expect(csvCell('+SUM(A1:A2)')).toBe('"\'+SUM(A1:A2)"');
    expect(csvCell('-10+20')).toBe('"\'-10+20"');
    expect(csvCell('@cmd')).toBe('"\'@cmd"');
    expect(csvCell('\t=HYPERLINK("https://example.com")')).toBe('"\'\t=HYPERLINK(""https://example.com"")"');
  });

  test('emits UTF-8 BOM and CRLF rows', () => {
    expect(toCsv([['Name', 'Email'], ['Jane', 'jane@example.com']]))
      .toBe('\uFEFF"Name","Email"\r\n"Jane","jane@example.com"\r\n');
  });
});
