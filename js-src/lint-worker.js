import { LatexPegParser } from '@unified-latex/unified-latex-util-pegjs';

function lint(source) {
  const tree = LatexPegParser.parse(source);
  const diagnostics = [];

  function report(node, message) {
    diagnostics.push({ message, start: node.position.start, end: node.position.end });
  }

  function inspect(nodes) {
    const environments = [];
    const math = [];
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      if (node.type === 'string' && (node.content === '{' || node.content === '}')) {
        report(node, node.content === '{' ? 'Geschweifte Klammer nicht geschlossen.' : 'Unerwartete schließende geschweifte Klammer.');
      } else if (node.type === 'string' && node.content === '$') {
        report(node, 'Mathematikbegrenzung nicht geschlossen.');
      } else if (node.type === 'macro' && (node.content === 'begin' || node.content === 'end')) {
        const group = nodes[index + 1];
        const name = group?.type === 'group'
          ? source.slice(group.position.start.offset + 1, group.position.end.offset - 1).trim()
          : '';
        if (/^[A-Za-z@][A-Za-z0-9@*_-]*$/.test(name)) {
          if (node.content === 'begin') environments.push({ node, name });
          else if (environments.length && environments[environments.length - 1].name === name) environments.pop();
          else report(node, `Unerwartetes Ende der Umgebung „${name}“.`);
          index += 1;
        }
      } else if (node.type === 'macro' && ['(', ')', '[', ']'].includes(node.content)) {
        if (node.content === '(' || node.content === '[') math.push(node);
        else if (math.length && (math[math.length - 1].content === '(' ? ')' : ']') === node.content) math.pop();
        else report(node, 'Unerwartete schließende Mathematikbegrenzung.');
      }
      if (Array.isArray(node.content)) inspect(node.content);
    }
    for (const { node, name } of environments) report(node, `Umgebung „${name}“ nicht geschlossen.`);
    for (const node of math) report(node, 'Mathematikbegrenzung nicht geschlossen.');
  }

  inspect(tree.content);
  return diagnostics.sort((a, b) => a.start.offset - b.start.offset);
}

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ id: data.id, diagnostics: lint(data.content) });
  } catch (error) {
    self.postMessage({ id: data.id, error: `LaTeX-Prüfung fehlgeschlagen: ${error.message}` });
  }
};
