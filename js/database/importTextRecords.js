function decodeText(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes);
  try {
    return new TextDecoder('utf-8', {fatal:true}).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export function importTextRecords(db, bytes) {
  const text = decodeText(bytes);
  const lines = text.matchAll(/[^\r\n]*(?:\r\n|[\r\n]|$)/g);
  let lineNumber = 0;
  let hasHeader = false;
  let imported = 0;
  let skipped = 0;
  const rejectedLines = [];
  const cpfPattern = /^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2}|[-*xX]{3}\.[-*xX]{3}\.[-*xX]{3,6})$/;
  const rowPattern = /^(.+?)\s+(\S+)\s+((?:\d{2}|--)[/-](?:\d{2}|--)[/-](?:\d{4}|----))$/;
  let insert;
  try {
    for (const [raw] of lines) {
      lineNumber++;
      const line = raw.trim();
      if (!line) continue;
      if (!hasHeader) {
        if (!/^NOME\s+CPF\s+NASCIMENTO$/i.test(line))
          throw Error('Unrecognized format. Choose a SQLite 3 database or a text file with the NOME CPF NASCIMENTO header.');
        hasHeader = true;
        db.run('CREATE TABLE pessoas (numero TEXT, nome TEXT NOT NULL, cpf TEXT NOT NULL, nascimento TEXT NOT NULL); BEGIN;');
        insert = db.prepare('INSERT INTO pessoas VALUES (?, ?, ?, ?)');
        continue;
      }
      const row = line.match(rowPattern);
      if (!row || !cpfPattern.test(row[2])) {
        skipped++;
        if (rejectedLines.length < 8) rejectedLines.push(lineNumber);
        continue;
      }
      const prefix = row[1].match(/^(\d+)\s+(.+)$/);
      insert.run([prefix ? prefix[1] : null, prefix ? prefix[2] : row[1], row[2], row[3]]);
      imported++;
    }
  } finally {
    insert?.free();
  }
  if (!hasHeader) throw Error('The file is empty or has no NOME CPF NASCIMENTO header.');
  if (!imported && skipped) {
    throw Error('Found the header but no valid records. Check line ' + rejectedLines[0] + ': optional row number, name, CPF, and date in DD/MM/YYYY format.');
  }
  db.run('COMMIT;');
  return {imported, skipped, rejectedLines};
}

