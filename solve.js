// csv-reader-speed-01 entry: a fast drop-in for make.fun's csv-reader 1.0.0.
//
// run(input) answers {columns, rows, errors} for one case's input {text, header}, exactly as the reference
// reader does, following the same written broken-row policy:
//   - a U+FEFF at the very start is dropped;
//   - a record ends at LF or CRLF; a line left with no characters is no record;
//   - outside quotes a CR not followed by LF is dropped (stray_cr);
//   - a field opening with a quote runs to the next undoubled quote ("" is one quote; CRLF and lone CR inside
//     read as LF); what follows the closing quote up to the next comma or line break is appended as it stands
//     (quote_junk when the field ends); a quote that never closes is a literal character and the text after it
//     is read again as unquoted (unterminated_quote);
//   - a quote inside an unquoted field is a literal character; fields stay strings;
//   - columns is the first record when header is true, else null; rows are padded ("", short_row) or cut
//     (long_row) to the first record's width;
//   - each error is {code, line, row} (short_row adds fields, long_row adds extra), in the order met, line the
//     1-based line the record starts on, row its index in rows (null for the header).
//
// Where the reference builds every field a character at a time, this reader scans with charCodeAt and cuts
// clean runs out of the text with slice, joining segments only when a field actually holds something broken
// (a stray CR, a doubled quote, a CR inside quotes). Pure: nothing is kept from one call to the next.

const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

/** csv-reader 1.0.0's answer for one case's input {text, header}: {columns, rows, errors}. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = 0; // the next character to read
  let line = 1; // the line that character is on
  if (n > 0 && text.charCodeAt(0) === 0xfeff) pos = 1;

  // The record being read: the line it starts on and the index in rows it takes (null: the header).
  let recordLine = 1;
  let recordRow = null;

  // One reused field result: the field's value, how it ended, and how many characters were kept.
  const res = { value: '', ended: END, added: 0 };

  // Reads unquoted characters from pos onto `initial` up to the next comma or line break: a CR not followed
  // by LF is dropped (stray_cr). Clean runs are sliced straight out of the text.
  function readUnquoted(initial) {
    let start = pos;
    let parts = null;
    let added = 0;
    for (;;) {
      if (pos >= n) {
        res.value = finish(initial, parts, start, pos);
        res.ended = END;
        res.added = added + (pos - start);
        return res;
      }
      const c = text.charCodeAt(pos);
      if (c === 44) {
        // ','
        res.value = finish(initial, parts, start, pos);
        res.ended = COMMA;
        res.added = added + (pos - start);
        pos += 1;
        return res;
      }
      if (c === 10) {
        // LF
        res.value = finish(initial, parts, start, pos);
        res.ended = LINE_BREAK;
        res.added = added + (pos - start);
        pos += 1;
        line += 1;
        return res;
      }
      if (c === 13) {
        // CR
        if (text.charCodeAt(pos + 1) === 10) {
          res.value = finish(initial, parts, start, pos);
          res.ended = LINE_BREAK;
          res.added = added + (pos - start);
          pos += 2;
          line += 1;
          return res;
        }
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        if (parts === null) parts = [];
        parts.push(text.slice(start, pos));
        added += pos - start;
        pos += 1;
        start = pos;
        continue;
      }
      pos += 1;
    }
  }

  // Joins the segments of an unquoted field (or cuts the one clean run) behind its initial characters.
  function finish(initial, parts, start, end) {
    if (parts === null) {
      return initial === '' ? text.slice(start, end) : initial + text.slice(start, end);
    }
    parts.push(text.slice(start, end));
    return initial === '' ? parts.join('') : initial + parts.join('');
  }

  // Reads a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let k = pos + 1;
    let segStart = k;
    let parts = null;
    let closed = false;
    while (k < n) {
      const c = text.charCodeAt(k);
      if (c === 34) {
        // '"'
        if (text.charCodeAt(k + 1) === 34) {
          if (parts === null) parts = [];
          parts.push(text.slice(segStart, k), '"');
          k += 2;
          segStart = k;
          continue;
        }
        closed = true;
        break;
      }
      if (c === 13) {
        // CRLF and a lone CR inside quotes are each one LF.
        if (parts === null) parts = [];
        parts.push(text.slice(segStart, k), '\n');
        line += 1;
        k += text.charCodeAt(k + 1) === 10 ? 2 : 1;
        segStart = k;
        continue;
      }
      if (c === 10) line += 1;
      k += 1;
    }
    if (!closed) {
      // The quote never closes: it is a literal character, and the text after it is read again as unquoted.
      pos = open + 1;
      line = openLine;
      errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
      return readUnquoted('"');
    }
    let value;
    if (parts === null) {
      value = text.slice(open + 1, k);
    } else {
      parts.push(text.slice(segStart, k));
      value = parts.join('');
    }
    pos = k + 1;
    if (pos >= n) {
      res.value = value;
      res.ended = END;
      res.added = 0;
      return res;
    }
    const c = text.charCodeAt(pos);
    if (c === 44) {
      pos += 1;
      res.value = value;
      res.ended = COMMA;
      res.added = 0;
      return res;
    }
    if (c === 10) {
      pos += 1;
      line += 1;
      res.value = value;
      res.ended = LINE_BREAK;
      res.added = 0;
      return res;
    }
    if (c === 13 && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line += 1;
      res.value = value;
      res.ended = LINE_BREAK;
      res.added = 0;
      return res;
    }
    // What follows the closing quote is appended as it stands, up to the next comma or line break.
    readUnquoted(value);
    if (res.added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
    return res;
  }

  for (;;) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let lastQuoted = false;
    for (;;) {
      if (text.charCodeAt(pos) === 34) {
        lastQuoted = true;
        readQuoted();
      } else {
        lastQuoted = false;
        readUnquoted('');
      }
      fields.push(res.value);
      if (res.ended !== COMMA) break;
    }

    // A line that held only stray CRs is left with no characters: no record (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !lastQuoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      const extra = fields.slice(width);
      fields.length = width;
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
